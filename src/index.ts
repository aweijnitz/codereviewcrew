import * as fs from "fs";
import * as path from "path";

import CodeReviewer from "./agents/CodeReviewer.js";
import {analyzeFolder} from "./tools/staticCodeAnalysis.js";
import promiseWithConcurrencyLimit from "./utils/promiseWithConcurrencyLimit.js";
import getLogger from "./utils/getLogger.js";

const MAX_CONCURRENCY = 3;
const logger = getLogger('index');

const rootPath = './src'
const folderPathAbsolute = path.normalize(path.resolve(rootPath));
logger.info('Scanning folder: ' + folderPathAbsolute);
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
    logger.debug(result)
} catch (error) {
    logger.error("Failed to analyze folder:", error);
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


