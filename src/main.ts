import {config} from "@dotenvx/dotenvx";
import * as path from "path";
import IORedis from "ioredis";
import {Worker} from "bullmq";

import {COMPLEXITY_SUFFIX, REPORT_SUFFIX, REVIEW_SUFFIX, toQueueName} from "./taskmanagement/queueManagement.js";
import getLogger from "./utils/getLogger.js";
import OrchestratorAgent from "./agents/OrchestratorAgent.js";
import {mountShutdownHooks} from "./utils/gracefulShutdown.js";
import CodeComplexityRater from "./agents/CodeComplexityRater.js";
import ReviewTask from "./taskmanagement/ReviewTask.js";
import CodeReviewer from "./agents/CodeReviewer.js";
import {JobState} from "./interfaces.js";
import {persistReviewTask} from "./db/schema.js";

config();


const logger = getLogger('main');

const rootPath = './src/'
const folderPathAbsolute = path.normalize(path.resolve(rootPath));
const orchestratorAgentName = `OrchestratorAgent-${folderPathAbsolute}`;

mountShutdownHooks();

const main = async (orchestratorAgentName: string, folderPathAbsolute: string) => {
    const agent = new OrchestratorAgent(orchestratorAgentName, folderPathAbsolute);

    // TODO: Setup workers for the queues (complexity, review, report generation)

    const connection = new IORedis({maxRetriesPerRequest: null});
    const workerOpts = {
        connection,
        concurrency: 1, // Amount of jobs that a single worker is allowed to work on in parallel.
        limiter: {
            max: 1,              // Max number of jobs to process in the time period specified in duration
            duration: 1000, // Time in milliseconds. During this time, a maximum of max jobs will be processed.
        },
        autorun: true
    };
    const workerComplexity = new Worker(
        toQueueName(agent.name, COMPLEXITY_SUFFIX),
        async job => {
            const workerName = 'BullMQWorker-complexity-jobId: ' + job.id;
            logger.debug(`${workerName} working on job:${job.id}`)
            const workerAgent = new CodeComplexityRater(`CodeComplexityRater-jobId:${job.id}`);
            const task = ReviewTask.fromJSON(job.data.task)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            const result = await workerAgent.run(task)
            logger.debug(`ComplexityAgent finished complexity analysis ${result.toString()}`)
            return {
                jobId: job.id,
                result: result.toJSON()
            };
        },
        workerOpts
    );
    const workerReview = new Worker(
        toQueueName(agent.name, REVIEW_SUFFIX),
        async job => {
            const workerName = 'BullMQWorker-reviewer-jobId: ' + job.id
            logger.debug(`${workerName} working on job:${job.id}`)
            const workerAgent = new CodeReviewer(`CodeReviewer-jobId:${job.id}`);
            const task = ReviewTask.fromJSON(job.data.task)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            const result = await workerAgent.run(task)
            logger.debug(`CodeReviewer finished complexity analysis ${result.toString()}`)
            return {
                jobId: job.id,
                result: result.toJSON()
            };
        },
        workerOpts
    );
    const workerReport = new Worker(
        toQueueName(agent.name, REPORT_SUFFIX),
        async job => {
            const workerName = 'BullMQWorker-report-jobId: ' + job.id
            logger.debug(`${workerName} working on job:${job.id}`)
            const task = ReviewTask.fromJSON(job.data.task)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            persistReviewTask(task);
            logger.debug(`report finished complexity analysis job ${job.id}. Task ${task.toString()}`)
            return {
                jobId: job.id,
                result: task.toJSON()
            };
        },
        workerOpts
    );


//    let p = workerComplexity.run();
//    await workerReview.run();
//    await workerReport.run();


    // Run the Orchestrator
    return agent.run();
}

await main(orchestratorAgentName, folderPathAbsolute).then(report => logger.info(report));
//await drainAndDelete(orchestratorAgentName);





