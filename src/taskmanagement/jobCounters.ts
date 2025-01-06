import IORedis from "ioredis";
import {getRedisConnection} from "./queueManagement.js";

export async function increaseTotalJobsCount(owner: string) {
    const redis = await getRedisConnection();
    return redis.incr(owner + '-total');
}

export async function getTotalJobsCount(owner: string) {
    const redis = await getRedisConnection();
    return redis.get(owner + '-total');
}

export async function increaseCompletedJobsCount(owner: string) {
    const redis = await getRedisConnection();
    return redis.incr(owner + '-completed');
}

export async function getCompletedJobsCount(owner: string) {
    const redis = await getRedisConnection();
    return redis.get(owner + '-completed');
}

export async function deleteJobCounters(owner: string) {
    const redis = await getRedisConnection();
    return redis.del(owner + '-total', owner + '-completed');
}

export async function resetJobCounters(owner: string) {
    const redis = await getRedisConnection();
    await redis.set(owner + '-completed', 0);
    return redis.set(owner + '-total', 0);
}

export async function allJobsCompleted(owner: string): Promise<boolean> {
    if (await getTotalJobsCount(owner) === await getCompletedJobsCount(owner))
        return true;
    else
        return false;
}

