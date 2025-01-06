import {ComplexityCount, ProblematicFile} from "../interfaces.js";

export function generateMarkdownForProblematicFiles(problematicFiles: ProblematicFile[]): string {
    problematicFiles.sort((a, b) => a.fileName.localeCompare(b.fileName));
    let markdownSnippet = '### Problematic Files by Complexity\n\n';
    markdownSnippet += '| File Name | Complexity |\n';
    markdownSnippet += '|-----------|------------|\n';

    problematicFiles.forEach(file => {
        markdownSnippet += `| ${file.fileName} | ${file.complexity} |\n`;
    });

    return markdownSnippet;
}

export function generateMarkdownForComplexityCounts(complexityCounts: ComplexityCount[]): string {

    // Construct Markdown table
    let markdownTable = '### Task Count by Complexity\n\n';
    markdownTable += '| Complexity | Count |\n';
    markdownTable += '|------------|-------|\n';

    complexityCounts.forEach(entry => {
        markdownTable += `| ${entry.complexity} | ${entry.count} |\n`;
    });

    return markdownTable;
}

