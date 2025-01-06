import {config} from "@dotenvx/dotenvx";

config();
import process from "process";
import fs from "fs";
import * as path from "path";
import {
    clearLLMStats,
    drainAndDelete, readLLMStats,
} from "./taskmanagement/queueManagement.js";
import getLogger from "./utils/getLogger.js";
import OrchestratorAgent from "./agents/OrchestratorAgent.js";
import {mountShutdownHooks} from "./utils/gracefulShutdown.js";
import formatDuration from "./utils/formatDuration.js";
import {configureAgentWorkers} from "./taskmanagement/workerManagement.js";

const logger = getLogger('main');

/**
 * Perform a code review on the source code files present in the folder and all its subfolders.
 *
 * @param rootPath         - The folder to start from
 */
async function main(orchestratorAgentName: string, rootPath: string): Promise<string> {

    const skipAnalysis: boolean = process.env.DEV_SKIP_REVIEW === 'true' || false;
    const skipReport: boolean = process.env.DEV_SKIP_REPORT_GEN === 'true' || false
    await clearLLMStats(orchestratorAgentName);

    const agent = new OrchestratorAgent(orchestratorAgentName, folderPathAbsolute, skipAnalysis, skipReport);
    if (!skipAnalysis)
        await configureAgentWorkers(agent);

    // Run the Orchestrator
    try {
        return agent.run();
    } catch (error) {
        logger.error(`Error running OrchestratorAgent ${orchestratorAgentName}`, error);
        return `Error running OrchestratorAgent ${orchestratorAgentName}`;
    }
}

async function cleanUp(owner:string) {
    return drainAndDelete(owner);
}

const rootPath = process.argv[2];
let saveFile = process.argv[3];
if (!rootPath) {
    console.error('Errror: No folder provided!');
    console.error('Usage: node build/src/main.js <rootPath> [report_file.md]');
    console.error('Example: node build/src/main.js ./src/db report-db-review.md');
    process.exit(1);
}
if(!saveFile) saveFile = 'stdout';
const folderPathAbsolute = path.normalize(path.resolve(rootPath));
const orchestratorAgentName = `OrchestratorAgent-${folderPathAbsolute}`;
mountShutdownHooks();
const startTime = process.hrtime.bigint()

const finalReport = await main(orchestratorAgentName, rootPath);

const endTime = process.hrtime.bigint();
const durationNanos = Number(endTime - startTime);
const llmStats = await readLLMStats(orchestratorAgentName);
logger.info(`STATS: Report generation duration: ${formatDuration(durationNanos)}. Total tokens consumed ${llmStats.promptTokens + llmStats.responseTokens}. LLM API time: ${formatDuration(llmStats.totalDurationNanos)}`)
if (saveFile === 'stdout') {
    console.log(finalReport)
} else {
    logger.info(`Saving report to file "${saveFile}"`);
    fs.writeFileSync(saveFile, `${finalReport}`, 'utf8');
}
await cleanUp(orchestratorAgentName);
process.exit(0);

