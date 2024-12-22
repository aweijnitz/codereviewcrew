import { Ollama } from 'ollama'
import OrchestratorAgent from "./agents/OrchestratorAgent.js";

const OLLAMA_HOST = 'http://127.0.0.1:11434';
const MODEL_NAME = 'smollm'; // TODO: Read from .env

const orchestrator = new OrchestratorAgent('Orchestrator')


const ollama = new Ollama({ host: OLLAMA_HOST })
const response = await ollama.chat({
    model: MODEL_NAME,
    messages: [{ role: 'user', content: 'Create a json with the property "greet", set to "hello".' }],
})

console.log('Hello', orchestrator.getName(), response.message.content)

