import ReviewTask from '../src/taskmanagement/ReviewTask';
import { JobState, ComplexityResult, CodeReviewResult } from '../src/interfaces.js';

describe('ReviewTask', () => {
    it('serializes to JSON correctly', () => {
        const task = new ReviewTask('owner', 'testFile.ts', 'test code', JobState.IN_COMPLEXITY_ASSESSMENT);
        const json = task.toJSON();

        expect(json).toEqual({
            id: task.id,
            fileName: 'testFile.ts',
            code: 'test code',
            state: JobState.IN_COMPLEXITY_ASSESSMENT,
            complexity: { complexity: 0, note: '' },
            review: { review: '' }
        });
    });

    it('constructs from JSON correctly', () => {
        const json = {
            id: 'testId',
            owner: 'owner',
            fileName: 'testFile.ts',
            code: 'test code',
            state: JobState.IN_COMPLEXITY_ASSESSMENT,
            complexity: { complexity: 5, note: 'High complexity' },
            review: { review: 'Looks good' }
        };
        const task = ReviewTask.fromJSON(json);

        expect(task.id).toBe('testId');
        expect(task.fileName).toBe('testFile.ts');
        expect(task.code).toBe('test code');
        expect(task.state).toBe(JobState.IN_COMPLEXITY_ASSESSMENT);
        expect(task.complexity).toEqual({ complexity: 5, note: 'High complexity' });
        expect(task.review).toEqual({ review: 'Looks good' });
    });

    it('throws error when setting null complexity', () => {
        const task = new ReviewTask('testFile.ts', 'test code');

        expect(() => {
            task.complexity = null as unknown as ComplexityResult;
        }).toThrow('Complexity result cannot be null');
    });

    it('throws error when setting null review', () => {
        const task = new ReviewTask('testFile.ts', 'test code');

        expect(() => {
            task.review = null as unknown as CodeReviewResult;
        }).toThrow('Review result cannot be null');
    });
});