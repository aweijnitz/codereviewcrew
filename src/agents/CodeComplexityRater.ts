import {Ollama} from "ollama";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import getLogger from "../utils/getLogger.js";
import formatDuration from "../utils/formatDuration.js";
import {ComplexityResult} from "../interfaces.js";


const logger = getLogger('CodeComplexityRater');

export default class CodeComplexityRater {
    private OLLAMA_HOST = process.env['OLLAMA_HOST'] || 'http://127.0.0.1:11434';
    private MODEL_NAME = 'nemotron-mini'; // TODO: Read from config. Also see https://ollama.com/library/qwen2.5-coder
    //private MODEL_NAME = 'qwen2.5-coder:7b'; // TODO: Read from config. Also see https://ollama.com/library/qwen2.5-coder


    private _name: string;
    private _fileName: string = '';
    private _code: string = '';
    private _ollama: Ollama;

    private _prompt: string = `
    You are a code reviewer. You will be provided with source code. Your job is to rate the code with regards to complexity, 
    maintanability and readability. As a result, you should provide a human-readable note and a complexity rating.
    For the complexity rating, you rate the code on a scale from 1 to 5, where 5 is the worst and 1 is the best (a low score is better).
    A score of 1 means that the code is very simple, easy to maintain and easy to read.
    A score of 5 means that the code is very complex, hard to maintain and hard to read.
    Any score in between is a mix of the two. A score above 3 indicates that the code should be refactored.
    Make sure the rating is always a number in the interval of 1 and 5. The note should be a one-sentence summary of the code.  
    `

    constructor(name: string) {
        this._name = name;
        this._ollama = new Ollama({host: this.OLLAMA_HOST})
    }

    public setName(name: string): void {
        this._name = name;
    }

    public getName(): string {
        return this._name
    }

    public setCode(fileName: string, code: string): void {
        this._code = code;
        this._fileName = fileName
    }

    public async run(): Promise<ComplexityResult> {
        logger.info(`Agent ${this._name} running. Analyzing file ${this._fileName}`);

        const complexitySchema = z.object({
            note: z.string().describe('A one-sentence summary note about the complexity of the code. Example "Needs refactoring.", or "Easy to read."'),
            complexity: z.number().int().describe('Rating the code on a scale from 1 to 5, where 1 is the worst and 5 is the best.')
        });

        const jsonSchema = zodToJsonSchema(complexitySchema);

        if (!this._code || this._code.trim() === '')
            return Promise.reject(new Error('No code to analyze (empty string)'));
        if (!this._fileName || this._fileName.trim() === '')
            return Promise.reject(new Error('No file name provided'));

        try {
            const response = await this._ollama.generate({
                model: this.MODEL_NAME,
                format: jsonSchema,
                options: {
                    temperature: 0.15
                },
                system: this._prompt,
                prompt: this._code,
            });

            logger.info(`Agent ${this._name} done! File: ${this._fileName}, Duration: ${formatDuration(response.total_duration)}, Prompt tokens: ${response.prompt_eval_count}, Response tokens: ${response.eval_count}`);
            const result = complexitySchema.parse(JSON.parse(response.response));
            return {
                note: result.note,
                complexity: result.complexity,
                fileName: this._fileName
            }

        } catch (error) {
            throw error;
        }
    }
}


