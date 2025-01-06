import {Ollama} from "ollama";
import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';

import getLogger from "../utils/getLogger.js";
import formatDuration from "../utils/formatDuration.js";
import {ComplexityResult, JobState} from "../interfaces.js";
import ReviewTask from "../taskmanagement/ReviewTask.js";
import * as process from "process";
import {config} from "@dotenvx/dotenvx"; config();
const logger = getLogger('CodeComplexityRater');

/**
 * Agent that rates the complexity of a given source code string.
 */
export default class CodeComplexityRater {

    private OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'OLLAMA_API_URL_NOT_SET';
    private COMPLEXITY_MODEL_NAME = process.env.COMPLEXITY_MODEL_NAME || 'COMPLEXITY_MODEL_NAME_NOT_SET';

    private _name: string;
    private _ollama: Ollama;

    private _prompt: string = `
You are an expert code reviewer. Your task is to evaluate the provided source code based on its complexity, maintainability, and readability. 
Follow these guidelines:
Complexity Rating:
Assign a complexity rating on a scale from 1 to 5:
1: The code is very simple, easy to maintain, and easy to read.
5: The code is very complex, hard to maintain, and hard to read.
Scores between 2 and 4 represent varying degrees of complexity, with higher scores indicating greater complexity.
A score above 3 suggests that the code should be considered for refactoring.
Human-Readable Note:
Provide a concise, one-sentence summary of the code's overall quality and characteristics.
Ensure that the complexity rating is always a whole number within the range of 1 to 5. Your evaluation should help developers understand the current state of the code and identify areas for improvement if necessary. 
    `

    constructor(name: string) {
        this._name = name;
        this._ollama = new Ollama({host: this.OLLAMA_API_URL});
    }

    get name(): string {
        return this._name;
    }


    public async run(task?: ReviewTask): Promise<ReviewTask> {

        if(!task)
            return Promise.reject(new Error('No task provided'));

        logger.info(`Agent ${this._name} running. Analyzing file ${task.fileName}...`);

        // The schema that describes the response we want the Ollama API to generate
        const complexitySchema = z.object({
            note: z.string().describe('A one-sentence summary note about the complexity of the code. Example "Needs refactoring.", or "Easy to read."'),
            complexity: z.number().int().describe('Rating the code on a scale from 1 to 5, where 1 is the worst and 5 is the best.')
        });
        const jsonSchema = zodToJsonSchema(complexitySchema);

        if (!task)
            return Promise.reject(new Error('No task provided'));
        if (task.state === JobState.NOT_INITIALIZED) {
            logger.error(`Task not initialized! Unexpected task state: ${task.toString()}`)
            return Promise.reject(new Error(`Unexpected task state: ${task.toString()}`));
        }

        try {
            logger.debug(`Agent ${this._name} calling Ollama API to analyze file ${task.fileName}...`)
            const response = await this._ollama.generate({
                model: this.COMPLEXITY_MODEL_NAME,
                format: jsonSchema,
                options: {
                    temperature: 0.15
                },
                system: this._prompt,
                prompt: task.code
            });

            logger.info(`Agent ${this._name} done! File: ${task.fileName}, Duration: ${formatDuration(response.total_duration)}, Prompt tokens: ${response.prompt_eval_count}, Response tokens: ${response.eval_count}`);
            const result = complexitySchema.parse(JSON.parse(response.response));

            // Simpler models sometimes get it wrong. Clamp value.
            if(result.complexity > 5) {
                logger.warn(`Agent ${this._name} found a complexity of ${result.complexity} for file ${task.fileName}. This is higher than the maximum allowed complexity of 5. Please consider tuning the prompt using this file.`);
                result.complexity = 5;
            } else if (result.complexity < 1) {
                logger.warn(`Agent ${this._name} found a complexity of ${result.complexity} for file ${task.fileName}. This is lower than the maximum allowed complexity of 1. Please consider tuning the prompt using this file.`);
                result.complexity = 1;
            }

            task.complexity = {
                note: result.note,
                complexity: result.complexity
            };
            task.state = JobState.COMPLETED_COMPLEXITY_ASSESSMENT
            return task;

        } catch (error) {
            throw error;
        }
    }
}


