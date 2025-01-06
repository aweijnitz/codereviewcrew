import * as fs from "fs";
import {listFiles} from "./tools/listFiles.js";
import CodeReviewer from "./agents/CodeReviewer.js";
import * as console from "console";
import * as path from "path";
import CodeComplexityRater from "./agents/CodeComplexityRater.js";
import {number} from "mathjs";

const rootPath = './src'
const files = listFiles(rootPath);
const file = fs.readFileSync(rootPath  + '/'  + files[0], 'utf-8');
const comlexityRater = new CodeComplexityRater('CodeComplexityRater');
comlexityRater.setCode(rootPath  + '/'  + files[0], file.toString());
const complexity = await comlexityRater.run();
console.log('Complexity: ' + complexity);

if(number(complexity) < 4) {
    const codeReviewer = new CodeReviewer('CodeReviewer');
    codeReviewer.setCode(rootPath + '/' + files[0], file.toString());
    const response = await codeReviewer.run();
    console.log(response);
} else {
    console.log('Code is good!');
}

