import fs from "fs";
import CodeComplexityRater from "../agents/CodeComplexityRater.js";
import CodeReviewer from "../agents/CodeReviewer.js";

const runReviewer = true;
const runRater = false;
const fileName = '/Users/aweijnitz/IdeaProjects/Agentic-CodeReviweCrew/src/agents/CodeReviewer.ts';

if (runRater) {
    const testRater = new CodeComplexityRater('testRater-00');
    testRater.setCode(fileName, fs.readFileSync(fileName, 'utf-8').toString());
    testRater.run().then(result => {
        console.log(result)
    }).catch(error => {
        console.error(error)
    })
}

if(runReviewer) {
    const testReviewer = new CodeReviewer('testReviewer-00');
    testReviewer.setCode(fileName, fs.readFileSync(fileName, 'utf-8').toString());
    testReviewer.run().then(result => {
        console.log(result)
    }).catch(error => {
        console.error(error)
    })
}