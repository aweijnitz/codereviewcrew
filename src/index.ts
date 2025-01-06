import * as fs from "fs";

import CodeReviewer from "./agents/CodeReviewer.js";
import * as console from "console";
import * as path from "path";
import CodeComplexityRater from "./agents/CodeComplexityRater.js";
import {analyzeFolder} from "./tools/staticCodeAnalysis.js";
import promiseWithConcurrencyLimit from "./utils/promiseWithConcurrencyLimit.js";

const MAX_CONCURRENCY = 3;
const rootPath = './src'
const folderPathAbsolute = path.normalize(path.resolve(rootPath));
console.log('Scanning folder: ' + folderPathAbsolute);

try {
    const analysisResult = await analyzeFolder(folderPathAbsolute);
    const files = analysisResult.pop().Files;
    const reviews: Promise<string>[] = [];
    let agentNr = 0;
    for (const file of files) {
        const filePath = path.normalize(path.resolve(folderPathAbsolute + '/' + file.Location));
        const codeReviewer = new CodeReviewer('CodeReviewer-' + agentNr++);
        codeReviewer.setCode(file.Location, fs.readFileSync(filePath, 'utf-8').toString());
        reviews.push(codeReviewer.run());
    }
    const result = await promiseWithConcurrencyLimit(reviews, MAX_CONCURRENCY);
    console.log(result);
} catch (error) {
    console.error("Failed to analyze folder:", error);
}

/*

const comlexityRater = new CodeComplexityRater('CodeComplexityRater');
comlexityRater.setCode(rootPath + '/' + files[0], file.toString());
const complexity = await comlexityRater.run();
console.log('Complexity: ' + complexity);


if (number(complexity) < 4) {
    const codeReviewer = new CodeReviewer('CodeReviewer');
    codeReviewer.setCode(rootPath + '/' + files[0], file.toString());
    const response = await codeReviewer.run();
    console.log(response);
} else {
    console.log('Code is good!');
}

 */


