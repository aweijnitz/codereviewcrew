import OrchestratorAgent from "./OrchestratorAgent";
import {Ollama} from "ollama";
import * as console from "console";
import getLogger from "../utils/getLogger.js";

const logger = getLogger('CodeComplexityRater');

export default class CodeComplexityRater {
    private OLLAMA_HOST = 'http://127.0.0.1:11434'; // TODO: Read from .env
    private MODEL_NAME = 'nemotron-mini'; // TODO: Read from .env

    private _name: string;
    private _fileName: string = '';
    private _code: string = '';
    private _ollama: Ollama;

    private _prompt: string = `
    You are a code reviewer. You will be provided with source code. Your job is to rate the code with regards to complexity, 
    maintanability and readability. 
    You rate the code on a scale from 1 to 5, where 1 is the worst and 5 is the best.
    A score of 1 means that the code is very complex, hard to maintain and hard to read.
    A score of 5 means that the code is very simple, easy to maintain and easy to read.
    Any score in between is a mix of the two. A score below 3 indicates that the code should be refactored.
    Reply with a single number and nothing else.  
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

    public async run(): Promise<string> {
        logger.info(`Agent ${this._name} running. Analyzing file ${this._fileName}`);
        if (!this._code || this._code.trim() === '')
            return 'No code to analyze (empty string)';
        if (!this._fileName || this._fileName.trim() === '')
            return 'No file name provided';

        const response = await this._ollama.generate({
            model: this.MODEL_NAME,
            options: {
                temperature: 0.3
            },
            system: this._prompt,
            prompt: this._code,
        })
        logger.info(`Agent ${this._name} done! File: ${this._fileName}. Duration: ${response.total_duration}`);
        return response.response;
    }
}