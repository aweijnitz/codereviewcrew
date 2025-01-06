import * as fs from "fs";
import * as path from "path";

import CodeReviewer from "./agents/CodeReviewer.js";
import CodeComplexityRater from "./agents/CodeComplexityRater.js";
import {analyzeFolder} from "./tools/staticCodeAnalysis.js";
import promiseWithConcurrencyLimit from "./utils/promiseWithConcurrencyLimit.js";
import getLogger from "./utils/getLogger.js";
import toCodeReviewPrompt from "./utils/toCodeReviewPrompt.js";
import toCodeComplexityPrompt from "./utils/toCodeComplexityPrompt.js";

const MAX_CONCURRENCY = 3;
const logger = getLogger('main');

const rootPath = './src'
const folderPathAbsolute = path.normalize(path.resolve(rootPath));

const reviewCodeAndComplexity = async (filePath: string) => {
    logger.info('Scanning folder: ' + folderPathAbsolute);
    let reviewResults = [];
    let complexityAssessments = [];

    try {
        const analysisResult = await analyzeFolder(folderPathAbsolute);
        const baseMetrics = 'Project Combined Base Metrics: Number of files: ' + analysisResult[0].Files.length + ', Lines of code: ' + analysisResult[0].Lines + ', Size: ' + (Math.round(analysisResult[0].Bytes / 1024)) + 'kB, Overall code complexity: ' + analysisResult[0].Complexity;
        const files = analysisResult.pop().Files;
        const reviews: Promise<string>[] = [];
        const complexityJobs: Promise<string>[] = [];
        let agentNr = 0;
        for (const file of files) {
            const filePath = path.normalize(path.resolve(folderPathAbsolute + '/' + file.Location));
            const codeReviewer = new CodeReviewer('CodeReviewer-' + agentNr);
            const code = fs.readFileSync(filePath, 'utf-8').toString();
            codeReviewer.setCode(file.Location, toCodeReviewPrompt(file, code));
            reviews.push(codeReviewer.run());

            const complexityRater = new CodeComplexityRater('ComplexityRater-' + agentNr++);
            complexityRater.setCode(file.Location, toCodeComplexityPrompt(file, code));
            //complexityJobs.push(complexityRater.run());
        }
        reviewResults = await promiseWithConcurrencyLimit(reviews, MAX_CONCURRENCY);
        complexityAssessments = await promiseWithConcurrencyLimit(complexityJobs, MAX_CONCURRENCY);
        logger.info(baseMetrics);
        logger.debug(reviews)
    } catch (error) {
        logger.error(error, "Failed to analyze folder:", folderPathAbsolute);
    }

    return {
        reviewResults,
        complexityAssessments
    };
}

const reviews = await  reviewCodeAndComplexity(folderPathAbsolute)
logger.info(reviews);



