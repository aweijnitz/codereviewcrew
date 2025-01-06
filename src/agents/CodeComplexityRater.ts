import {Ollama} from "ollama";
import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';

import getLogger from "../utils/getLogger.js";
import formatDuration from "../utils/formatDuration.js";
import {ComplexityResult, JobState} from "../interfaces.js";
import ReviewTask from "../taskmanagement/ReviewTask";
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
    You are a code reviewer. You will be provided with source code. Your job is to rate the code with regards to complexity, 
    maintainability and readability. As a result, you should provide a human-readable note and a complexity rating.
    For the complexity rating, you rate the code on a scale from 1 to 5, where 5 is the worst and 1 is the best (a low score is better).
    A score of 1 means that the code is very simple, easy to maintain and easy to read.
    A score of 5 means that the code is very complex, hard to maintain and hard to read.
    Any score in between is a mix of the two. A score above 3 indicates that the code should be refactored.
    Make sure the rating is always a number in the interval of 1 and 5. The note should be a one-sentence summary of the code.  
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
        if (task.state === JobState.NOT_INITIALIZED)
            return Promise.reject(new Error(`Unexpected task state: ${task.toString()}`));

        try {
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


