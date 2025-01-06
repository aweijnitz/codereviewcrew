import {config} from "@dotenvx/dotenvx"; config();
import * as path from "path";
import IORedis from "ioredis";
import {Worker} from "bullmq";

import {COMPLEXITY_SUFFIX, REPORT_SUFFIX, REVIEW_SUFFIX, toQueueName} from "./taskmanagement/queueManagement.js";
import getLogger from "./utils/getLogger.js";
import OrchestratorAgent from "./agents/OrchestratorAgent.js";


const logger = getLogger('main');

const rootPath = './src'
const folderPathAbsolute = path.normalize(path.resolve(rootPath));

const main = async (rootFolder: string) => {
    const agent = new OrchestratorAgent(`OrchestratorAgent-${folderPathAbsolute}`, folderPathAbsolute);

    // TODO: Setup workers for the queues (complexity, review, report generation)

    const connection = new IORedis({maxRetriesPerRequest: null});
    const workerOpts = {
        connection,
        concurrency: 1, // Amount of jobs that a single worker is allowed to work on in parallel.
        limiter: {
            max: 5,              // Max number of jobs to process in the time period specified in duration
            duration: 1000, // Time in milliseconds. During this time, a maximum of max jobs will be processed.
        }
    };
    const workerComplexity = new Worker(
        toQueueName(agent.name, COMPLEXITY_SUFFIX),
        async job => {
            logger.debug('ComplexityWorker: '+job.id)
            return {
                jobId: job.id,
                result: job.data
            };
        },
        workerOpts
    );
    const workerReview = new Worker(
        toQueueName(agent.name, REVIEW_SUFFIX),
        async job => {
            logger.debug('reviewWorker: '+job.id)
            return {
                jobId: job.id,
                result: job.data
            };
        },
        workerOpts
    );
    const workerReport = new Worker(
        toQueueName(agent.name, REPORT_SUFFIX),
        async job => {
            logger.debug('reportWorker: '+job.id)
            return {
                jobId: job.id,
                result: job.data
            };
        },
        workerOpts
    );

    // Run the Orchestrator
    return agent.run();
}

await main(folderPathAbsolute).then(report => logger.info(report));




