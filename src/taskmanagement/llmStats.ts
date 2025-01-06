import {LLMStats} from "../interfaces.js";
import {getRedisConnection} from "./queueManagement.js";

const LLM_STATS_KEY = 'llm_stats';

export async function clearLLMStats(prefix: string): Promise<void> {
    const redis = await getRedisConnection();
    const key = `${prefix}:${LLM_STATS_KEY}`;
    await redis.del(key);
}

export async function readLLMStats(prefix: string): Promise<LLMStats> {
    const redis = await getRedisConnection();
    const key = `${prefix}:${LLM_STATS_KEY}`;
    const result = await redis.hgetall(key);
    if (Object.keys(result).length > 0) {
        return {
            promptTokens: parseInt(result.promptTokens || '0', 10),
            responseTokens: parseInt(result.responseTokens || '0', 10),
            totalDurationNanos: parseInt(result.totalDurationNanos || '0', 10)
        };
    }
    return {
        promptTokens: 0,
        responseTokens: 0,
        totalDurationNanos: 0
    } as LLMStats;
}

export async function updateLLMStats(prefix: string, stats: LLMStats): Promise<void> {
    const redis = await getRedisConnection();
    const key = `${prefix}:${LLM_STATS_KEY}`;
    await redis.hincrby(key, 'promptTokens', stats.promptTokens);
    await redis.hincrby(key, 'responseTokens', stats.responseTokens);
    await redis.hincrby(key, 'totalDurationNanos', stats.totalDurationNanos);
}
