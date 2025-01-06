import * as fs from "fs";
import {listFiles} from "./tools/listFiles.js";
import CodeReviewer from "./agents/CodeReviewer.js";
import * as console from "console";
import * as path from "path";

const rootPath = './src'
const files = listFiles(rootPath);
const file = fs.readFileSync(rootPath  + '/'  + files[0], 'utf-8');
const codeReviewer = new CodeReviewer('CodeReviewer');
codeReviewer.setCode(rootPath  + '/'  + files[0], file.toString());
const response = await codeReviewer.run();
console.log(response);

