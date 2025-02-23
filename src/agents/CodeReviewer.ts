import {GenerateResponse, Ollama} from "ollama";
import formatDuration from "../utils/formatDuration.js";
import getLogger from "../utils/getLogger.js";
import ReviewTask from "../taskmanagement/ReviewTask.js";
import {AgentStats, JobState, LLMStats} from "../interfaces.js";
import * as process from "process";
import {config} from "@dotenvx/dotenvx"; config();
const logger = getLogger('CodeReviewer');

export default class CodeReviewer implements AgentStats {

    private OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'OLLAMA_API_URL_NOT_SET';
    private REVIEW_MODEL_NAME = process.env.REVIEW_MODEL_NAME || 'REVIEW_MODEL_NAME_NOT_SET'

    private readonly _name: string;
    private _ollama: Ollama;
    private _llmStats: LLMStats = {
        promptTokens: 0,
        responseTokens: 0,
        totalDurationNanos: 0
    }

    private _prompt: string = `
    You are a code reviewer. You will be provided with source code. Your job is to review the code to find bugs, identify areas for improvement, 
    and ensure that the code is testable, readable and maintainable. Put extra importance on robustness and edge cases. 
    You provide feedback as a numbered bullet list of actionable items in terse and simple-to-read English. 
    You are not responsible for fixing the code, only for identifying issues. Reply in Markdown format.  
    `

    constructor(name: string) {
        this._name = name;
        this._ollama = new Ollama({host: this.OLLAMA_API_URL})
    }


    get name(): string {
        return this._name
    }

    get llmStats(): LLMStats {
        return this._llmStats;
    }

    public async run(task: ReviewTask): Promise<ReviewTask> {

        if(!task)
            return Promise.reject(new Error('No task provided'));

        logger.info(`Agent ${this._name} running. Analyzing file ${task.fileName}`);

        if (!task)
            return Promise.reject(new Error('No task provided'));
        if (task.state === JobState.NOT_INITIALIZED) {
            logger.error(`Task not initialized! Unexpected task state: ${task.toString()}`)
            return Promise.reject(new Error(`Unexpected task state: ${task.toString()}`));
        }

        try {
            logger.debug(`Agent ${this._name} calling Ollama API to analyze file ${task.fileName}...`)
            const response = await this._ollama.generate({
                model: this.REVIEW_MODEL_NAME,
                options: {
                    temperature: 0.25,
                    num_ctx: 4*1024, // token context window (default is 2048). Too much will choke Ollama on memory
                },
                system: this._prompt,
                prompt: task.code

            })
            this.updateStats(response);
            logger.info(`Agent ${this._name} done! File: ${task.fileName}, Duration: ${formatDuration(response.total_duration)}, Prompt tokens: ${response.prompt_eval_count}, Response tokens: ${response.eval_count}`);

            const result = `### ${task.fileName}\n\n${response.response}`;
            task.review = {
                review: result
            };
            task.state = JobState.COMPLETED_CODE_REVIEW;
            return task;
        } catch (error) {
            throw error;
        }
    }

    private updateStats(response: GenerateResponse) {
        this._llmStats.promptTokens += response.prompt_eval_count;
        this._llmStats.responseTokens += response.eval_count;
        this._llmStats.totalDurationNanos += response.total_duration;
    }
}