import {Agent} from 'undici'
import {Ollama} from "ollama";
import process from "process";
import {config} from "@dotenvx/dotenvx";

config();

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'OLLAMA_API_URL_NOT_SET';


const noTimeoutFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const someInit = init || {}
    return fetch(input, {
        ...someInit,
        dispatcher: new Agent({
            headersTimeout: 2700000
        })
    } as RequestInit)
}

export function createOllamaConnection() {
    return new Ollama({host: OLLAMA_API_URL, fetch: noTimeoutFetch}); // This is a more or less a workaround to handle very slow responses on localhost Ollama server
}
