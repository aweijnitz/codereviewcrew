import OrchestratorAgent from "./OrchestratorAgent";
import {Ollama} from "ollama";
import * as console from "console";


export default class CodeReviewer {
    private OLLAMA_HOST = 'http://127.0.0.1:11434'; // TODO: Read from .env
    private MODEL_NAME = 'nemotron-mini'; // TODO: Read from .env

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
        this._fileName = fileName
    }

    public async run(): Promise<string> {
        const response = await this._ollama.generate({
            model: this.MODEL_NAME,
            system: this._prompt,
            prompt: this._code

        })
        console.log(`Agent ${this._name} running. Analyzing file ${this._fileName}`);
        console.log(`Agent ${this._name} done! File: ${this._fileName}. Duration: ${response.total_duration}`);
        return response.response;
    }
}