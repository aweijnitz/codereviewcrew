import {config} from "@dotenvx/dotenvx";
import {GenerateResponse, Ollama} from "ollama";
import process from "process";

import {getAllCodeReviews, getTaskCountByComplexity, getTopProblematicFilesByComplexity} from "../db/persistence.js";
import getLogger from "../utils/getLogger.js";
import {generateMarkdownForComplexityCounts, generateMarkdownForProblematicFiles} from "../utils/reportHelpers.js";
import formatDuration from "../utils/formatDuration.js";
import {AgentStats, LLMStats} from "../interfaces.js";

config();
const logger = getLogger('ReportCreator');

export class ReportCreator implements AgentStats {
    private OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'OLLAMA_API_URL_NOT_SET';
    private REPORT_MODEL_NAME = process.env.REPORT_MODEL_NAME || 'REPORT_MODEL_NAME_NOT_SET';

    private readonly _name: string;
    private _orchestratorName: string;
    private _ollama: Ollama;
    private _llmStats: LLMStats = {
        promptTokens: 0,
        responseTokens: 0,
        totalDurationNanos: 0
    }

    private static _prompt =`
    You are an AI language model tasked with generating a high-level summary for engineering and 
    IT managers based on the provided data. The data includes all code reviews and the distribution of review tasks grouped by complexity. 
    Your goal is to create a concise report (500 to 700 words) that highlights key insights, trends, and any areas of concern. 
    If the analysis indicates that everything is satisfactory, simply state that and omit any recommended next steps. Otherwise, include a list of 
    actionable recommendations to address identified issues. Follow this structure.
Structure:
* Introduction:
Briefly introduce the purpose of the report.
Mention the scope of the data analyzed (code reviews and complexity distribution).
* Summary of Findings:
Provide an overview of the code review quality and common themes.
Highlight any significant patterns or anomalies in the complexity distribution.
Discuss the balance between task complexity and review outcomes.
* Key Insights:
Identify strengths and areas of excellence in the current processes.
Point out any recurring issues or bottlenecks observed in the reviews.
Analyze the correlation between task complexity and review feedback.
* Conclusion:
Summarize the overall health of the code review process.
State whether the current practices are effective or if improvements are needed.
* Recommended Next Steps (if applicable):
List specific actions to enhance code quality and review efficiency, but don't include actual source code in the report.
Suggest strategies for addressing any identified weaknesses, without including actual source code in the report.
Recommend tools or practices to streamline the review process.
Guidelines:
Use clear and professional language suitable for managerial audiences.
Ensure the summary is informative yet concise, staying within the word limit.
Focus on actionable insights and practical recommendations. Don't include actual source code in the report.
Reply in Markdown format.
    `;

    constructor(name: string, orchestratorName: string) {
        this._name = name;
        this._orchestratorName = orchestratorName;
        this._ollama = new Ollama({host: this.OLLAMA_API_URL});
    }

    get name(): string {
        return this._name;
    }

    get llmStats(): LLMStats {
        return this._llmStats;
    }

    set orchestratorName(name) {
        this._orchestratorName = name
    }

    get orchestratorName(): string {
        return this._orchestratorName;
    }

    public async run() {
        logger.debug(`${this.name} running. Creating final report.`);
        let result : string ='# CODE REVIEW REPORT\n\n';
        try {
            let fileReviewsPrompt = 'Please create a summary from the following individual reviews. The file name is in each headline, prefixed with "###". The text begins with a summary of how the files are distributed by complexity.\n';

            fileReviewsPrompt += `\n## Number of files grouped by complexity (1 is good, 5 is bad. 3 is ok, but needs review)\n\n`;
            const complexityBuckets = generateMarkdownForComplexityCounts(getTaskCountByComplexity(this.orchestratorName));
            fileReviewsPrompt += complexityBuckets;

            fileReviewsPrompt += `\n## Code reviews per file\n\n`;
            getAllCodeReviews(this.orchestratorName).forEach(review => fileReviewsPrompt += (review + '\n'));

            logger.debug(`Agent ${this._name} calling Ollama API to generate final report.`)
            const response = await this._ollama.generate({
                model: this.REPORT_MODEL_NAME,
                options: {
                    temperature: 0.2,
                    top_p: 0.65, // A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text.
                    num_ctx: 131072 // // LLama3.2 maximum. Too much will choke Ollama on memory. Check the ollama server log for warnings
                },
                system: ReportCreator._prompt,
                prompt: fileReviewsPrompt

            })
            this.updateStats(response);
            logger.info(`Agent ${this._name} report done! Duration: ${formatDuration(response.total_duration)}, Prompt tokens: ${response.prompt_eval_count}, Response tokens: ${response.eval_count}`);

            result += response.response;

            result += `\n${complexityBuckets}\n`;

            const problematicFiles = getTopProblematicFilesByComplexity(this.orchestratorName);
            const markdownSnippet = generateMarkdownForProblematicFiles(problematicFiles);
            result += `\n\n${markdownSnippet}\n`
        } catch (error) {
            logger.error(`Agent ${this.name} failed.`, error)
            throw new Error(`Agent ${this._name} failed to run: ${error}`);
        }

        logger.info(`Report for ${this._name} generated successfully.`);
        return result;
    }

    private updateStats(response: GenerateResponse) {
        this._llmStats.promptTokens += response.prompt_eval_count;
        this._llmStats.responseTokens += response.eval_count;
        this._llmStats.totalDurationNanos += response.total_duration;
    }
}
