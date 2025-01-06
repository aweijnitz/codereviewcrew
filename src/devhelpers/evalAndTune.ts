import fs from "fs";
import CodeComplexityRater from "../agents/CodeComplexityRater.js";
import CodeReviewer from "../agents/CodeReviewer.js";
import ReviewTask from "../taskmanagement/ReviewTask.js";
import {JobState} from "../interfaces.js";

const runRater = true;
const runReviewer = false;
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