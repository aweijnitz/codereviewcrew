import * as fs from 'fs';
import * as path from 'path';

/**
 * List all files in a folder and its subfolders. [] if the folder does not exist.
 * @param rootFolder
 */
export function listFiles(rootFolder: string): string[] {
    const result: string[] = [];
    if(typeof rootFolder !== 'string') return []; // skip nonsensical input
    if (!fs.existsSync(rootFolder)) return []; // No point in checking folders that don't exist
    function readDirRecursive(folder: string) {
        const files = fs.readdirSync(folder);
        for (const file of files) {
            const fullPath = path.join(folder, file);
            const relativePath = path.relative(rootFolder, fullPath);
            if (fs.statSync(fullPath).isDirectory()) {
                readDirRecursive(fullPath);
            } else {
                result.push(relativePath);
            }
        }
    }

    readDirRecursive(rootFolder);
    return result.sort(); // sorting makes the result more human-readable
}

