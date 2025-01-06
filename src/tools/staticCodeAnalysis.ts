import { exec } from "child_process";
import { promisify } from "util";
import * as console from "console";

const execAsync = promisify(exec);

/**
 * Strips the /pwd/ path prefix from the Location field in the scc output.
 * This is necessary because the scc command is run in a Docker container, which mounts the folder to be analyzed at /pwd.
 * @param data
 */
function stripPwdPathPrefix(data: any[]): any[] {
    return data.map(item => {
        item.Files = item.Files.map((file: any) => {
            file.Location = file.Location.replace('/pwd/', '');
            return file;
        });
        return item;
    });
}

/**
 * Analyzes a folder using the scc command and returns the parsed JSON result.
 * @param folderPath - The folder to analyze.
 * @returns A promise that resolves to the parsed JSON output.
 */
export async function analyzeFolder(folderPath: string): Promise<any> {
    try {
        // See https://github.com/boyter/scc?tab=readme-ov-file#complexity-estimates for more information on the scc command.
        const command = `docker run --rm -v "${folderPath}:/pwd" ghcr.io/lhoupert/scc:master scc --format json --by-file -s complexity /pwd`;
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            throw new Error(`Error executing scc: ${stderr}`);
        }
        return stripPwdPathPrefix(JSON.parse(stdout));
    } catch (error) {
        console.error("analyzeFolder: An error occurred:", error);
        throw error;
    }
}
