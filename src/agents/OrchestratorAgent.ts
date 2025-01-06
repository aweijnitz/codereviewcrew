import path from "path";
import fs from "fs";
import {QueueEvents, Job} from "bullmq";
import {config} from "@dotenvx/dotenvx";

config();
import {analyzeFolder} from "../tools/staticCodeAnalysis.js";
import getLogger from "../utils/getLogger.js";
import toCodeComplexityPrompt from "../utils/toCodeComplexityPrompt.js";
import ReviewTask from "../taskmanagement/ReviewTask.js";
import isProgrammingLanguage from "../utils/isProgrammingLanguage.js";

import {
    enqueueTaskForComplexityAssessment,
    enqueueTaskForCodeReview,
    enqueueTaskForFinalReport,
    getCreateQueue,
    COMPLEXITY_SUFFIX,
    REPORT_SUFFIX,
    REVIEW_SUFFIX,
    toQueueName,
    increaseCompletedJobsCount,
    getTotalJobsCount,
    allJobsCompleted,
    getCompletedJobsCount,
    deleteJobCounters
} from "../taskmanagement/queueManagement.js";
import {JobState} from "../interfaces.js";
import {createReviewTaskTable, persistReviewTask} from "../db/schema.js";


const logger = getLogger('OrchestratorAgent');


interface LanguageBin {
    Name: string;
    Files: Array<{
        Location: string,
        Filename: string,
        Language: string,
        Size: number,
        Complexity: number,
        Lines: number,
        Code: number,
        Comments: number
    }>;
}


/**
 * OrchestratorAgent is a class that orchestrates the execution of other agents
 * with the goal of producing a thorough code review of a given codebase.
 *
 * The OrchestratorAgent is responsible for:
 * - Scanning a folder for files and run a static code analysis on them
 *  - For each file, a ReviewTask is created and enqueued for complexity assessment
 * - For each ReviewTask, use CodeComplexityRater agents to evaluate the complexity of the code
 * - For ReviewTasks that are deemed complex, use CodeReviewer agents to review the code and suggest improvements
 * - Collect the results of the code reviews and complexity assessments to produce a final report (enqueued in the finalReport array. Job starts when all other queued jobs are completed)
 */
export default class OrchestratorAgent {
    private static takenNames: Set<string> = new Set();
    private _name: string;
    private _folderPathAbsolute: string = '';

    /**
     * Create a new OrchestratorAgent with the given name and root folder path.
     * Name must be unique. It acts as a basic tenant id, and job owner.
     *
     * @param name
     * @param rootFolderPathAbsolute
     */
    constructor(name: string, rootFolderPathAbsolute: string = '') {
        logger.debug(`Creating new OrchestratorAgent with name: ${name}. Number of agents: ${OrchestratorAgent.takenNames.size} `);
        if (OrchestratorAgent.takenNames.has(name)) {
            throw new Error(`Agent name "${name}" is already taken.`);
        }
        this._name = name;
        this._folderPathAbsolute = rootFolderPathAbsolute;
        OrchestratorAgent.takenNames.add(name);
        createReviewTaskTable(name);
    }

    public get name(): string {
        return this._name;
    }

    public get folderPathAbsolute(): string {
        return this._folderPathAbsolute;
    }

    /**
     * Run the OrchestratorAgent to analyze the codebase and produce a code review report.
     */
    public async run(): Promise<string> {
        logger.info(`Agent ${this._name} is running...`);
        const complexityQueueEvents = new QueueEvents(toQueueName(this.name, COMPLEXITY_SUFFIX));
        const codeReviewQueueEvents = new QueueEvents(toQueueName(this.name, REVIEW_SUFFIX));
        const reportQueueEvents = new QueueEvents(toQueueName(this.name, REPORT_SUFFIX));

        try {
            await deleteJobCounters(this.name); // reset job state

            // ___ Setup workflow logic
            // TODO: Move as much of this out as possible to per-job 'completed' event handlers for improved throughput
            //
            // 1. Dispatch tasks based on the complexity assessment
            complexityQueueEvents.on('completed', async ({jobId}) => {
                let job: Job<any, any, string> | undefined;
                const queueName = toQueueName(this.name, COMPLEXITY_SUFFIX);
                const queue = getCreateQueue(queueName);
                if (queue)
                    job = await Job.fromId(queue, jobId);
                else
                    throw new Error('Queue not found! ' + queueName)
                let task = ReviewTask.fromJSON(job?.returnvalue.result)
                task.state = JobState.COMPLETED_COMPLEXITY_ASSESSMENT;
                if (task.complexity.complexity >= 3) {
                    // 2.0 Review code of files deemed too complex
                    await enqueueTaskForCodeReview(task);
                } else {
                    // 2.1 Simple files get a pass and get sent to the report without review
                    await enqueueTaskForFinalReport(task);
                }
            });

            // 3. Add reviewed code to the report queue
            codeReviewQueueEvents.on('completed', async ({jobId}) => {
                let job: Job<any, any, string> | undefined;
                const queueName = toQueueName(this.name, REVIEW_SUFFIX);
                const queue = getCreateQueue(queueName);
                if (queue)
                    job = await Job.fromId(queue, jobId);
                else
                    throw new Error('Queue not found! ' + queueName)
                let task = ReviewTask.fromJSON(job?.returnvalue.result)
                task.state = JobState.COMPLETED_CODE_REVIEW;
                enqueueTaskForFinalReport(task);
            });

            // 4. Prep report (per task prep)
            reportQueueEvents.on('completed', async ({jobId}) => {
                let job: Job<any, any, string> | undefined;
                const queueName = toQueueName(this.name, REPORT_SUFFIX);
                const queue = getCreateQueue(queueName);
                if (queue)
                    job = await Job.fromId(queue, jobId);
                else
                    throw new Error('Queue not found! ' + queueName)
                let task = ReviewTask.fromJSON(job?.returnvalue.result)
                task.state = JobState.COMPLETED;
                // TODO: Use another agent to review the outcome of the review here and send it back for re-review if needed.
                await increaseCompletedJobsCount(this.name);
            });

            logger.info("Scanning folder: " + this._folderPathAbsolute);
            //scc static code analysis. Produces file lists, binned by programming language.
            const analysisResult = await analyzeFolder(this._folderPathAbsolute);

            // For each language bin, iterate over the files and create review tasks
            for (const languageBin of analysisResult) {
                const index = analysisResult.indexOf(languageBin);
                logger.debug(`Processing language bin ${index}: ${languageBin.Name}`);
                // Skip non-supported languages
                if (!isProgrammingLanguage(languageBin.Name)) {
                    logger.info('Skipping files for non-supported language: ' + languageBin.Name);
                    continue;
                }
                // Create review tasks for each file in the current language bin
                for (const file of languageBin.Files) {
                    const filePath = path.normalize(path.resolve(this._folderPathAbsolute + path.sep + file.Location));
                    logger.debug("Processing file: " + filePath);
                    const code = (await fs.promises.readFile(filePath, 'utf-8')).toString();
                    const task = new ReviewTask(this.name, file.Location, toCodeComplexityPrompt(file, code));
                    await enqueueTaskForComplexityAssessment(task);
                } // end for file loop
            } // end language bin loop

            // At this point, all jobs are enqueued for review. Now we wait for them to complete.
            logger.info(`All tasks enqueued. Total tasks: ${await getTotalJobsCount(this.name)}`);
            logger.info(`Waiting for tasks to complete...`);
            while (!(await allJobsCompleted(this.name))) {
                await new Promise(resolve => {
                    logger.info(`Waiting for tasks to complete...`);
                    return setTimeout(resolve, 2000)
                });
            }
            logger.info(`All tasks COMPLETE. Total tasks: ${await getTotalJobsCount(this.name)}. Completed count: ${await getCompletedJobsCount(this.name)}`);

        } catch (error) {
            throw new Error(`Agent ${this._name} failed to run: ${error}`);
        }

        return 'DONE';
    }
}