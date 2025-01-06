import getLogger from "../utils/getLogger.js";

const logger = getLogger('OrchestratorAgent');

export default class OrchestratorAgent {
    private _name: string;

    constructor(name: string) {
        this._name = name;
    }

    public setName(name: string): void {
        this._name = name;
    }
    public getName(): string { return this._name }
    public async run(): Promise<string> {
        logger.info(`Agent ${this._name} is running...`);
        return 'DONE';
    }
}