import {CodeMetaData} from "../interfaces.js";

export default function toCodeReviewPrompt(
    metaData: CodeMetaData,
    sourceCode: string,
): string {
  return `
  Here are some base facts about the code below.  
  Language: ${metaData.Language}, Filename: ${metaData.Filename}, 
  Size in bytes: ${metaData.Size}, 
  Static analysis code complexity: ${metaData.Complexity}, 
  Total number of lines: ${metaData.Lines}, Lines of code: ${metaData.Code}, Lines of comments: ${metaData.Comments},
  The code is delimited by the markers ---CODE---. 
  Please review the following code snippet:
  ---CODE--- ${sourceCode} ---CODE---`
}