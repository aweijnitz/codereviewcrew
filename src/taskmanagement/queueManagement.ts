import * as crypto from 'crypto';
import {Job, Queue} from "bullmq";
import ReviewTask from "./ReviewTask";
import getLogger from "../utils/getLogger.js";
import {JobState, ReviewTaskData} from "../interfaces.js";
import IORedis from "ioredis";
import * as process from "process";
import {config} from "@dotenvx/dotenvx";
import {AgentJobData, AgentWorkerResult} from "../interfaces.js";

config();
const logger = getLogger('queueManagement');

export const COMPLEXITY_SUFFIX = '-complexities';
export const REVIEW_SUFFIX = '-code_reviews';
export const REPORT_SUFFIX = '-report'
export const activeQueues = new Map<string, Queue>();
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;

const redis = new IORedis(redisPort, process.env.REDIS_HOST || 'REDIS_HOST_NOT_SET', {maxRetriesPerRequest: 3});

const jobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000
    },
    removeOnComplete: {
        age: 3600, // keep up to 1 hour
        count: 1000, // keep up to 1000 jobs
    },
    removeOnFail: {
        age: 3600, // keep up to 1 hour
        count: 1000, // keep up to 1000 jobs
    }
};

/**
 * Returns unique queueName  based on the owner string and suffix
 *
 * @param owner
 * @param suffix
 */
export function toQueueName(owner: string, suffix: string): string {
    // Create an MD5 hash of the input string
    const hash = crypto.createHash('md5').update(owner).digest('hex').slice(-16)
    return `${hash}§${owner}$${suffix}`
}

export function getCreateQueue(queueName: string): Queue | undefined {
    if (activeQueues.has(queueName)) {
        return activeQueues.get(queueName)
    }
    const queue = new Queue(queueName);
    activeQueues.set(queueName, queue);
    return queue;
}

/**
 * Clean up. Drain and delete all queues associated with owner.
 * Can take a long time for queues with a lot of pending jobs.
 * @param owner
 * @param force - Do not wait for queue to drain
 */
export async function drainAndDelete(owner: string, force: boolean = false) {
    logger.debug(`Starting to clear all temporary queue data for ${owner}`)
    let queueName = toQueueName(owner, COMPLEXITY_SUFFIX);
    let queue = getCreateQueue(queueName);
    await queue?.obliterate({force});
    activeQueues.delete(queueName);

    queueName = toQueueName(owner, REVIEW_SUFFIX);
    queue = getCreateQueue(queueName);
    await queue?.obliterate({force});
    activeQueues.delete(queueName);

    queueName = toQueueName(owner, REPORT_SUFFIX);
    queue = getCreateQueue(queueName);
    await queue?.obliterate({force});
    activeQueues.delete(queueName);

    await deleteJobCounters(owner);
    logger.info(`All temporary queue data cleared for ${owner}`)
}

export async function increaseTotalJobsCount(owner: string) {
    return redis.incr(owner + '-total');
}

export async function getTotalJobsCount(owner: string) {
    return redis.get(owner + '-total');
}

export async function increaseCompletedJobsCount(owner: string) {
    return redis.incr(owner + '-completed');
}

export async function getCompletedJobsCount(owner: string) {
    return redis.get(owner + '-completed');
}

export async function deleteJobCounters(owner: string) {
    return redis.del(owner + '-total', owner + '-completed');
}

export async function allJobsCompleted(owner: string): Promise<boolean> {
    if (await getTotalJobsCount(owner) === await getCompletedJobsCount(owner))
        return true;
    else
        return false;
}


export async function enqueueTaskForComplexityAssessment(reviewTask: ReviewTask) {
    logger.debug(`Enqueuing task for complexity assessment: ${reviewTask.fileName}`);
    if (reviewTask.state === JobState.COMPLETED) {
        logger.warn(`Skipping completed task! id: ${reviewTask.id}, owner: ${reviewTask.owner}, fileName: ${reviewTask.fileName}`);
        return {
            enqueueStatus: 'skipped'
        }
    }
    const queueName = toQueueName(reviewTask.owner, COMPLEXITY_SUFFIX);
    const queue = getCreateQueue(queueName);
    reviewTask.state = JobState.IN_COMPLEXITY_ASSESSMENT;

    await queue?.add(
        'complexityAssessment',
        reviewTask.toJSON() as ReviewTaskData,
        jobOptions);
    await increaseTotalJobsCount(reviewTask.owner);
}

export async function enqueueTaskForCodeReview(reviewTask: ReviewTask) {
    logger.debug(`Enqueuing task for code review: ${reviewTask.fileName}`);
    if (reviewTask.state === JobState.COMPLETED) {
        logger.warn(`Skipping completed task! id: ${reviewTask.id}, owner: ${reviewTask.owner}, fileName: ${reviewTask.fileName}`);
        return {
            enqueueStatus: 'skipped'
        }
    }
    const queueName = toQueueName(reviewTask.owner, REVIEW_SUFFIX);
    const queue = getCreateQueue(queueName);
    reviewTask.state = JobState.IN_CODE_REVIEW;

    await queue?.add(
        'codeReview',
        reviewTask.toJSON() as ReviewTaskData,
        jobOptions);
}

export async function enqueueTaskForFinalReport(reviewTask: ReviewTask) {
    logger.debug(`Enqueuing task for code report: ${reviewTask.fileName}`);
    if (reviewTask.state === JobState.COMPLETED) {
        logger.warn(`Skipping completed task! id: ${reviewTask.id}, owner: ${reviewTask.owner}, fileName: ${reviewTask.fileName}`);
        return {
            enqueueStatus: 'skipped'
        }
    }

    const queueName = toQueueName(reviewTask.owner, REPORT_SUFFIX);
    const queue = getCreateQueue(queueName);
    reviewTask.state = JobState.COMPLETED_CODE_REVIEW
    await queue?.add(
        'report',
        reviewTask.toJSON() as ReviewTaskData,
        jobOptions);
}

/**
 * Clear all data from all queues. Delete the queues. Close the connection to Redis.
 * Used by the process shutdown hook to clear any remaining data.
 */
export async function obliterateAllQueues() {

    // Assuming you have a way to get all queue names
    const queueNames = await redis.keys('*');

    for (const queueName of queueNames) {
        logger.debug(`Obliterating queue ${queueName}`)
        const queue = new Queue(queueName, {connection: redis});
        await queue.obliterate({force: true});
        await queue.close();
    }

    await redis.quit();
}