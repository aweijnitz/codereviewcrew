import {Ollama} from "ollama";
import formatDuration from "../utils/formatDuration.js";
import getLogger from "../utils/getLogger.js";
import {CodeReviewResult} from "../interfaces";

const logger = getLogger('CodeReviewer');

export default class CodeReviewer {
    private OLLAMA_HOST = 'http://127.0.0.1:11434'; // TODO: Read from .env
    //private MODEL_NAME = 'nemotron-mini'; // TODO: Read from .env
    private MODEL_NAME = 'qwen2.5-coder:7b'; // TODO: Read from config. Also see https://ollama.com/library/qwen2.5-coder

    private _name: string;
    private _fileName: string = '';
    private _code: string = '';
    private _ollama: Ollama;

    private _prompt: string = `
    You are a code reviewer. You will be provided with source code. Your job is to review the code to find bugs, identify areas for improvement, 
    and ensure that the code is testable, readable and maintainable. Put extra importance on robustness and edge cases. 
    You provide feedback as a numbered bullet list of actionable items in terse and simple-to-read English. 
    You are not responsible for fixing the code, only for identifying issues. Reply in Markdown format.  
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
        this._fileName = fileName;
    }

    public async run(): Promise<CodeReviewResult> {
        logger.info(`Agent ${this._name} running. Analyzing file ${this._fileName}`);

        if (!this._code || this._code.trim() === '')
            return Promise.reject(new Error('No code to analyze (empty string)'));
        if (!this._fileName || this._fileName.trim() === '')
            return Promise.reject(new Error('No file name provided'));
        try {
            const response = await this._ollama.generate({
                model: this.MODEL_NAME,
                options: {
                    temperature: 0.25
                },
                system: this._prompt,
                prompt: this._code

            })
            logger.info(`Agent ${this._name} done! File: ${this._fileName}. Duration: ${formatDuration(response.total_duration)}`);
            const result = `# ${this._fileName}\n\n${response.response}`;
            return {
                fileName: this._fileName,
                review: result
            };
        } catch (error) {
            throw error;
        }
    }
}