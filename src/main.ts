import {config} from "@dotenvx/dotenvx";
import * as path from "path";
import IORedis from "ioredis";
import {Job, Worker} from "bullmq";

import {
    COMPLEXITY_SUFFIX,
    drainAndDelete,
    REPORT_SUFFIX,
    REVIEW_SUFFIX,
    toQueueName
} from "./taskmanagement/queueManagement.js";
import getLogger from "./utils/getLogger.js";
import OrchestratorAgent from "./agents/OrchestratorAgent.js";
import {mountShutdownHooks} from "./utils/gracefulShutdown.js";
import CodeComplexityRater from "./agents/CodeComplexityRater.js";
import ReviewTask from "./taskmanagement/ReviewTask.js";
import CodeReviewer from "./agents/CodeReviewer.js";
import {AgentJobData, AgentWorkerResult, ReviewTaskData} from "./interfaces.js";
import {persistReviewTask} from "./db/schema.js";
import process from "process";
import {boolean} from "zod";
import fs from "fs";
import {worker} from "globals";

config();
const logger = getLogger('main');
mountShutdownHooks();

const configureAgentWorkers = async (orchestratorAgent: OrchestratorAgent) => {
    const logger = getLogger('agentWorkers');
    const concurrency: number = parseInt(String(process.env.AGENT_CONCURRENCY || 1))
    const limitMax: number = parseInt(String(process.env.AGENT_RATE_LIMIT || 1))

    const connection = new IORedis({maxRetriesPerRequest: null});
    const workerOpts = {
        connection,
        concurrency: concurrency, // Amount of jobs that a single worker is allowed to work on in parallel.
        limiter: {
            max: limitMax,              // Max number of jobs to process in the time period specified in duration
            duration: 1000, // Time in milliseconds. During this time, a maximum of limitMax jobs will be processed.
        },
        autorun: true
    };
    const workerComplexity = new Worker<ReviewTaskData, AgentWorkerResult>(
        toQueueName(orchestratorAgent.name, COMPLEXITY_SUFFIX),
        async job => {
            const workerName = 'BullMQWorker-complexity-jobId: ' + job.id;
            const workerAgent = new CodeComplexityRater(`CodeComplexityRater-jobId:${job.id}`);
            const task = ReviewTask.fromJSON(job.data)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            const result = await workerAgent.run(task)
            return {
                jobId: job.id,
                result: result.toJSON(),
                error: undefined
            } as AgentWorkerResult;
        },
        workerOpts
    );
    workerComplexity.on('failed', (job: Job | undefined, error: Error, prev: string) => {
        logger.warn(`FAIL. BullMQWorker-complexity-jobId:${job?.id}. Error: ${error.message}. Cause: ${error.cause}`)
        return {
            jobId: job?.id,
            error: Error,
            result: undefined
        };
    });
    workerComplexity.on('error', err => {
        // log the error
        logger.error(err)
    });


    const workerReview = new Worker<ReviewTaskData, AgentWorkerResult>(
        toQueueName(orchestratorAgent.name, REVIEW_SUFFIX),
        async job => {
            const workerName = 'BullMQWorker-reviewer-jobId: ' + job.id
            const workerAgent = new CodeReviewer(`CodeReviewer-jobId:${job.id}`);
            const task = ReviewTask.fromJSON(job.data)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            const result = await workerAgent.run(task)
            return {
                jobId: job.id,
                result: result.toJSON(),
                error: undefined
            } as AgentWorkerResult;
        },
        workerOpts
    );
    workerReview.on('failed', (job: Job | undefined, error: Error, prev: string) => {
        logger.warn(`FAIL. BullMQWorker-reviewer-jobId:${job?.id}. Error: ${error.message}. Cause: ${error.cause}`)
        return {
            jobId: job?.id,
            error: Error,
            result: undefined
        };
    });
    workerReview.on('error', err => {
        // log the error
        logger.error(err)
    });
    const workerReport = new Worker<ReviewTaskData, AgentWorkerResult>(
        toQueueName(orchestratorAgent.name, REPORT_SUFFIX),
        async job => {
            const workerName = 'BullMQWorker-report-jobId: ' + job.id
            const task = ReviewTask.fromJSON(job.data)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            persistReviewTask(task);
            logger.debug(`report finished complexity analysis job ${job.id}. Task ${task.toString()}`)
            return {
                jobId: job.id,
                result: task.toJSON(),
                error: undefined
            } as AgentWorkerResult;
        },
        workerOpts
    );
    workerReport.on('failed', (job: Job | undefined, error: Error, prev: string) => {
        logger.warn(`FAIL. BullMQWorker-report-jobId:${job?.id}. Error: ${error.message}. Cause: ${error.cause}`)
        return {
            jobId: job?.id,
            error: Error,
            result: undefined
        };
    });
    workerReview.on('error', err => {
        // log the error
        logger.error(err)
    });

    return 'Workers started';
}

/**
 * Perform a code review on the source code files present in the folder and all its subfolders.
 *
 * @param rootPath         - The folder to start from
 */
async function main(rootPath: string) : Promise<string> {

    const skipAnalysis: boolean = process.env.DEV_SKIP_REVIEW === 'true' || false;
    const skipReport: boolean = process.env.DEV_SKIP_REPORT_GEN === 'true'|| false
    const folderPathAbsolute = path.normalize(path.resolve(rootPath));
    const orchestratorAgentName = `OrchestratorAgent-${folderPathAbsolute}`;

    const agent = new OrchestratorAgent(orchestratorAgentName, folderPathAbsolute, skipAnalysis, skipReport);
    if (!skipAnalysis)
        await configureAgentWorkers(agent);

    // Run the Orchestrator
    try {
        return agent.run();
    } catch (error) {
        logger.error(`Error running OrchestratorAgent ${orchestratorAgentName}`, error);
        return `Error running OrchestratorAgent ${orchestratorAgentName}`;
    } finally {
        await drainAndDelete(orchestratorAgentName);
    }
}

const rootPath = './src/agents'
const saveFile = `code-review-${new Date().toISOString()}.md`;
const finalReport = await main(rootPath);
//logger.debug(finalReport);
logger.info(`Saving report to file "${saveFile}"`);
fs.writeFileSync(saveFile, `${finalReport}`, 'utf8');
process.exit(0);





