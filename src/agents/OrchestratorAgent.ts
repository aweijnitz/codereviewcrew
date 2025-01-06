import path from "path";
import fs from "fs";
import {config} from "@dotenvx/dotenvx";

config();
import {analyzeFolder} from "../tools/staticCodeAnalysis.js";
import getLogger from "../utils/getLogger.js";
import toCodeComplexityPrompt from "../utils/toCodeComplexityPrompt.js";
import ReviewTask from "../taskmanagement/ReviewTask.js";
import isProgrammingLanguage from "../utils/isProgrammingLanguage.js";

import {
    enqueueTaskForComplexityAssessment
} from "../taskmanagement/queueManagement.js";
import  { updateLLMStats } from "../taskmanagement/llmStats.js"
import {
    getTotalJobsCount,
    allJobsCompleted,
    getCompletedJobsCount,
     resetJobCounters
} from "../taskmanagement/jobCounters.js";
import {createReviewTaskTable, persistReviewTask} from "../db/persistence.js";
import {ReportCreator} from "./ReportCreator.js";

const logger = getLogger('OrchestratorAgent.');


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
 * - Collect the results of the code reviews and complexity assessments to produce a final report (starts when all other  jobs are completed)
 */
export default class OrchestratorAgent {
    private static takenNames: Set<string> = new Set();
    private _name: string;
    private _folderPathAbsolute: string = '';
    private _skipAnalysis: boolean = false;
    private _skipReport: boolean = false;

    /**
     * Create a new OrchestratorAgent with the given name and root folder path.
     * Name must be unique. It acts as a basic tenant id, and job owner.
     *
     * @param name                                      Name that identifies this batch. Must be unique.
     * @param rootFolderPathAbsolute       Full path to the folder with files to review
     * @param skipAnalysis                          Optional: skips the per-file review (default false)
     * @param skipReport                            Optional: skips the report generation stage (default false)
     */
    constructor(name: string, rootFolderPathAbsolute: string = '', skipAnalysis: boolean = false, skipReport: boolean = false) {
        logger.debug(`Creating new OrchestratorAgent with name: ${name}. Number of agents: ${OrchestratorAgent.takenNames.size} `);
        if (OrchestratorAgent.takenNames.has(name)) {
            throw new Error(`Agent name "${name}" is already taken.`);
        }
        this._name = name;
        this._folderPathAbsolute = rootFolderPathAbsolute;
        this._skipAnalysis = skipAnalysis;
        this._skipReport = skipReport;
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
        let finalReport = '';
        try {
            if (!this._skipAnalysis) {
                await resetJobCounters(this.name); // reset state

                // STEP 0: Perform static code analysis
                logger.info("Scanning folder: " + this._folderPathAbsolute);
                //scc static code analysis. Produces file lists, binned by programming language.
                const analysisResult = await analyzeFolder(this._folderPathAbsolute);

                // For each language bin, iterate over the files and create review tasks to be worked on by the agents
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
                logger.info(`Waiting for tasks to be picked up by the agents...`);
                const agentName = this.name;
                while (!(await allJobsCompleted(agentName))) {
                    await new Promise(async resolve => {
                        logger.info(`Waiting for tasks to complete.... Total tasks: ${await getTotalJobsCount(agentName)}. Completed count: ${await getCompletedJobsCount(agentName)}`);
                        return setTimeout(resolve, 15000)
                    });
                }
                logger.info(`All tasks COMPLETE. Total tasks: ${await getTotalJobsCount(this.name)}. Completed count: ${await getCompletedJobsCount(this.name)}`);
            } // end !skip analysis
            if (!this._skipReport) {
                // Generate final report
                logger.info(`${this.name} Generating final report...`)
                const reporterAgent = new ReportCreator(this.name + '_ReportCreator', this.name);
                finalReport = await reporterAgent.run();
                await updateLLMStats(this.name, reporterAgent.llmStats);
            }

        } catch (error) {
            logger.error(`Agent ${this.name} failed.`, error)
            throw new Error(`Agent ${this._name} failed to run: ${error}`);
        }

        logger.info(`${this.name} DONE. Returning final report`)
        return finalReport;
    } // end run
}