import {config} from "@dotenvx/dotenvx"; config();
import process from "process";
import IORedis from "ioredis";
import {Job, Worker} from "bullmq";

import OrchestratorAgent from "../agents/OrchestratorAgent.js";
import {AgentWorkerResult, ReviewTaskData} from "../interfaces.js";
import {COMPLEXITY_SUFFIX, REPORT_SUFFIX, REVIEW_SUFFIX, toQueueName, updateLLMStats} from "./queueManagement.js";
import CodeComplexityRater from "../agents/CodeComplexityRater.js";
import ReviewTask from "./ReviewTask.js";
import CodeReviewer from "../agents/CodeReviewer.js";
import {persistReviewTask} from "../db/schema.js";
import getLogger from "../utils/getLogger.js";

/**
 * Setup agents to run based on jobs in the corresponding queues.
 *
 * @param orchestratorAgent
 */
export async function configureAgentWorkers(orchestratorAgent: OrchestratorAgent) {
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

    // Manage code complexity assessment tasks
    //
    const workerComplexity = new Worker<ReviewTaskData, AgentWorkerResult>(
        toQueueName(orchestratorAgent.name, COMPLEXITY_SUFFIX),
        async job => {
            const workerName = 'BullMQWorker-complexity-jobId: ' + job.id;
            const workerAgent = new CodeComplexityRater(`CodeComplexityRater-jobId:${job.id}`);
            const task = ReviewTask.fromJSON(job.data)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            const result = await workerAgent.run(task)
            await updateLLMStats(orchestratorAgent.name, workerAgent.llmStats);
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

    // Manage code review tasks
    //
    const workerReview = new Worker<ReviewTaskData, AgentWorkerResult>(
        toQueueName(orchestratorAgent.name, REVIEW_SUFFIX),
        async job => {
            const workerName = 'BullMQWorker-reviewer-jobId: ' + job.id
            const workerAgent = new CodeReviewer(`CodeReviewer-jobId:${job.id}`);
            const task = ReviewTask.fromJSON(job.data)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            const result = await workerAgent.run(task)
            await updateLLMStats(orchestratorAgent.name, workerAgent.llmStats);
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

    // Manage persistence of completed tasks
    //
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