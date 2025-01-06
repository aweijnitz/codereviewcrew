import fs from "fs";
import {config} from "@dotenvx/dotenvx"; config();
import CodeComplexityRater from "../agents/CodeComplexityRater.js";
import CodeReviewer from "../agents/CodeReviewer.js";
import ReviewTask from "../taskmanagement/ReviewTask.js";
import {JobState} from "../interfaces.js";
import {ReportCreator} from "../agents/ReportCreator.js";

const runRater = false;
const runReviewer = false;
const runReporter = true;
const fileName = '/Users/aweijnitz/IdeaProjects/Agentic-CodeReviweCrew/src/agents/CodeReviewer.ts';
const task = new ReviewTask('owner', fileName, fs.readFileSync(fileName, 'utf-8').toString(), JobState.WAITING_TO_RUN);

if (runRater) {
    const testRater = new CodeComplexityRater('testRater-00');
    testRater.run(task).then(result => {
        console.log(result)
    }).catch(error => {
        console.error(error)
    })
}

if (runReviewer) {
    const testReviewer = new CodeReviewer('testReviewer-00');
    testReviewer.run(task).then(result => {
        console.log(result)
    }).catch(error => {
        console.error(error)
    })
}

if(runReporter) {
    const name = 'reporterAgent-00'
    const orchestratorName = 'OrchestratorAgent-/Users/aweijnitz/IdeaProjects/Agentic-CodeReviweCrew/src';
    const reportCreator = new ReportCreator(name, orchestratorName);
    reportCreator.run().then(result => {
        console.log(result)
    }).catch(error => {
        console.error(error)
    })
}