import path from "path";
import fs from "fs";
import {analyzeFolder} from "../tools/staticCodeAnalysis.js";
import getLogger from "../utils/getLogger.js";
import CodeComplexityRater from "./CodeComplexityRater.js";
import CodeReviewer from "./CodeReviewer.js";
import toCodeComplexityPrompt from "../utils/toCodeComplexityPrompt.js";
import {JobState} from "../interfaces.js";
import toCodeReviewPrompt from "../utils/toCodeReviewPrompt.js";
import {FileJob} from "../utils/FileJob.js";


const logger = getLogger('OrchestratorAgent');

interface LanguageBin {
    Name: string;
    Files: Array<{Location: string, Filename:string,Language:string, Size:number, Complexity:number,Lines:number,Code:number,Comments:number}>;
}

/**
 * OrchestratorAgent is a class that orchestrates the execution of other agents
 * with the goal of producing a thorough code review of a given codebase.
 *
 * The OrchestratorAgent is responsible for:
 * - Scanning a folder for files and run a static code analysis on them
 * - For each file, use CodeComplexityRater agents to evaluate the complexity of the code
 * - For files that are deemed complex, use CodeReviewer agents to review the code and suggest improvements
 * - Collect the results of the code reviews and complexity assessments to produce a final report
 */
export default class OrchestratorAgent {
    private _name: string;
    private _folderPathAbsolute: string = '';

    constructor(name: string) {
        this._name = name;
    }

    public get name(): string {
        return this._name;
    }

    public set folderPathAbsolute(folderPath: string) {
        this._folderPathAbsolute = folderPath;
    }

    public get folderPathAbsolute(): string {
        return this._folderPathAbsolute;
    }

    /**
     * Run the OrchestratorAgent to produce a final report of the code review
     */
    public async run(): Promise<string> {
        logger.info(`Agent ${this._name} is running...`);
        const state: Array<FileJob> = [];
        try {
            logger.info("Scanning folder: " + this._folderPathAbsolute);
            const analysisResult = await analyzeFolder(this._folderPathAbsolute); //scc static code analysis

            const reviewJobs: Promise<void>[] = [];
            let agentNr = 0;
            analysisResult.forEach((languageBin: LanguageBin, index: number) => {

                logger.debug(`Processing language bin ${index}: ${languageBin.Name}`);
                for (const file of languageBin.Files) {
                    const filePath = path.normalize(path.resolve(this._folderPathAbsolute + '/' + file.Location));
                    logger.debug("Processing file: " + filePath);
                    const code = fs.readFileSync(filePath, 'utf-8').toString();
                    const complexityRater = new CodeComplexityRater('ComplexityRater-' + agentNr++);
                    complexityRater.setCode(file.Location, toCodeComplexityPrompt(file, code));

                    const fileJob = new FileJob(file.Location, JobState.WAITING_TO_RUN);
                    state.push(fileJob);

                    reviewJobs.push((async () => {
                        fileJob.state = JobState.IN_COMPLEXITY_ASSESSMENT;
                        const complexityResult = await complexityRater.run();
                        fileJob.complexity = complexityResult;
                        logger.debug(`Complexity assessment for ${file.Location}: ${complexityResult.complexity} - ${complexityResult.note}`);
                        if (complexityResult.complexity <= 3) {
                            fileJob.state = JobState.IN_CODE_REVIEW;
                            const codeReviewer = new CodeReviewer('CodeReviewer-' + agentNr++);
                            codeReviewer.setCode(file.Location, toCodeReviewPrompt(file, code));
                            const reviewResult = await codeReviewer.run();
                            fileJob.review = reviewResult;
                            fileJob.state = JobState.COMPLETED_CODE_REVIEW;
                        } else {
                            fileJob.state = JobState.COMPLETED_COMPLEXITY_ASSESSMENT;
                        }
                        fileJob.state = JobState.COMPLETED;
                    })());
                }
            });


            await Promise.all(reviewJobs);
        } catch (error) {
            throw new Error(`Agent ${this._name} failed to run: ${error}`);
        }

        return 'DONE';
    }
}