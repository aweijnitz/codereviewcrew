import { generateMarkdownForProblematicFiles, generateMarkdownForComplexityCounts } from '../src/utils/reportHelpers';
import { ProblematicFile, ComplexityCount } from '../src/interfaces';

describe('generateMarkdownForProblematicFiles', () => {
    it('should return a header only for an empty array', () => {
        const result = generateMarkdownForProblematicFiles([]);
        expect(result).toBe(
            '### Problematic Files by Complexity\n\n' +
            '| File Name | Complexity |\n' +
            '|-----------|------------|\n'
        );
    });

    it('should handle a single file correctly', () => {
        const files: ProblematicFile[] = [{ fileName: 'fileA.ts', complexity: 4 }]  as ProblematicFile[];;
        const result = generateMarkdownForProblematicFiles(files);
        expect(result).toBe(
            '### Problematic Files by Complexity\n\n' +
            '| File Name | Complexity |\n' +
            '|-----------|------------|\n' +
            '| fileA.ts | 4 |\n'
        );
    });

    it('should sort multiple files alphabetically and format correctly', () => {
        const files: ProblematicFile[] = [
            { fileName: 'fileB.ts', complexity: 5 },
            { fileName: 'fileA.ts', complexity: 3 }
        ] as ProblematicFile[];
        const result = generateMarkdownForProblematicFiles(files);
        expect(result).toBe(
            '### Problematic Files by Complexity\n\n' +
            '| File Name | Complexity |\n' +
            '|-----------|------------|\n' +
            '| fileA.ts | 3 |\n' +
            '| fileB.ts | 5 |\n'
        );
    });

    it('should handle files with the same name correctly', () => {
        const files: ProblematicFile[] = [
            { fileName: 'fileA.ts', complexity: 4 },
            { fileName: 'fileA.ts', complexity: 5 }
        ];
        const result = generateMarkdownForProblematicFiles(files);
        expect(result).toBe(
            '### Problematic Files by Complexity\n\n' +
            '| File Name | Complexity |\n' +
            '|-----------|------------|\n' +
            '| fileA.ts | 4 |\n' +
            '| fileA.ts | 5 |\n'
        );
    });
});

describe('generateMarkdownForComplexityCounts', () => {
    it('should return a header only for an empty array', () => {
        const result = generateMarkdownForComplexityCounts([]);
        expect(result).toBe(
            '### Task Count by Complexity\n\n' +
            '| Complexity | Count |\n' +
            '|------------|-------|\n'
        );
    });

    it('should handle a single complexity count correctly', () => {
        const counts: ComplexityCount[] = [{ complexity: 2, count: 5 }];
        const result = generateMarkdownForComplexityCounts(counts);
        expect(result).toBe(
            '### Task Count by Complexity\n\n' +
            '| Complexity | Count |\n' +
            '|------------|-------|\n' +
            '| 2 | 5 |\n'
        );
    });

    it('should format multiple complexity counts correctly', () => {
        const counts: ComplexityCount[] = [
            { complexity: 1, count: 10 },
            { complexity: 3, count: 7 },
            { complexity: 2, count: 15 }
        ];
        const result = generateMarkdownForComplexityCounts(counts);
        expect(result).toBe(
            '### Task Count by Complexity\n\n' +
            '| Complexity | Count |\n' +
            '|------------|-------|\n' +
            '| 1 | 10 |\n' +
            '| 3 | 7 |\n' +
            '| 2 | 15 |\n'
        );
    });
});
