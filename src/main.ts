import * as fs from "fs";
import * as path from "path";
import getLogger from "./utils/getLogger.js";
import OrchestratorAgent from "./agents/OrchestratorAgent.js";

const logger = getLogger('main');

const rootPath = './src'
const folderPathAbsolute = path.normalize(path.resolve(rootPath));

const main = async (rootFolder:string) => {
    const agent = new OrchestratorAgent('OrchestratorAgent');
    agent.folderPathAbsolute = rootFolder;
    return  await agent.run();
}

main(folderPathAbsolute).then(report => logger.info(report));




