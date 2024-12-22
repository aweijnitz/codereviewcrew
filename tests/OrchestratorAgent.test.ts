import OrchestratorAgent from '../src/agents/OrchestratorAgent';
import {jest} from "globals";

describe('OrchestratorAgent', () => {
    let agent: OrchestratorAgent;

    beforeEach(() => {
        agent = new OrchestratorAgent('TestAgent');
    });

    test('should set and get name correctly', () => {
        expect(agent.getName()).toBe('TestAgent');
        agent.setName('NewName');
        expect(agent.getName()).toBe('NewName');
    });

});