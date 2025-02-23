import {config} from "@dotenvx/dotenvx";

config();
import process from "process";
import IORedis from "ioredis";
import {Job, Worker} from "bullmq";

import OrchestratorAgent from "../agents/OrchestratorAgent.js";
import {AgentWorkerResult, JobState, ReviewTaskData} from "../interfaces.js";
import {
    COMPLEXITY_SUFFIX, enqueueTaskForCodeReview, enqueueTaskForFinalReport,
    getCreateQueue,
    REPORT_SUFFIX,
    REVIEW_SUFFIX,
    toQueueName,

} from "./queueManagement.js";
import {updateLLMStats} from "./llmStats.js";
import CodeComplexityRater from "../agents/CodeComplexityRater.js";
import ReviewTask from "./ReviewTask.js";
import CodeReviewer from "../agents/CodeReviewer.js";
import {persistReviewTask} from "../db/persistence.js";
import getLogger from "../utils/getLogger.js";
import {increaseCompletedJobsCount} from "./jobCounters.js";

const logger = getLogger('workerManagement');

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
            let task = ReviewTask.fromJSON(job.data)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName} for ${orchestratorAgent.name}`);
            task = await workerAgent.run(task)
            await updateLLMStats(orchestratorAgent.name, workerAgent.llmStats);

            // State update and dispatch according to complexity score
            task.state = JobState.COMPLETED_COMPLEXITY_ASSESSMENT;
            if (task.complexity.complexity >= 3) {
                // 2.0 Review code of files deemed too complex
                await enqueueTaskForCodeReview(task);
            } else {
                // 2.1 Simple files get a pass and get sent to the report without review
                await enqueueTaskForFinalReport(task);
            }

            return {
                jobId: job.id,
                result: task.toJSON(),
                error: undefined
            } as AgentWorkerResult;
        },
        workerOpts
    );
    workerComplexity.on('failed', (job: Job | undefined, error: Error, prev: string) => {
        logger.warn(`FAIL. BullMQWorker-complexity-jobId:${job?.id}. Error: ${error.message}. Cause: ${error.cause}. OrchestratorAgent: ${orchestratorAgent.name}`)
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
            let task = ReviewTask.fromJSON(job.data)
            logger.debug(`Worker ${workerName} processing task: ${task.fileName}`);
            task = await workerAgent.run(task)
            await updateLLMStats(orchestratorAgent.name, workerAgent.llmStats);

            // Update state and dispatch
            task.state = JobState.COMPLETED_CODE_REVIEW;
            await enqueueTaskForFinalReport(task);

            return {
                jobId: job.id,
                result: task.toJSON(),
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

            // Update state and dispatch (persist task outcome)
            task.state = JobState.COMPLETED;
            // TODO: Use another agent to review the outcome of the review here and send it back for re-review if needed.
            await increaseCompletedJobsCount(orchestratorAgent.name);
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
