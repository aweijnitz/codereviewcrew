import { ReviewTask } from '../src/taskmanagement/ReviewTask.js';
import { JobState } from '../src/interfaces';
describe('ReviewTask', () => {
    it('should initialize with the correct values', () => {
        const fileName = 'testFile.ts';
        const task = new ReviewTask(fileName, 'test code');
        expect(task.fileName).toBe(fileName);
        expect(task.code).toBe('test code');
        expect(task.state).toBe(JobState.WAITING_TO_RUN);
        expect(task.complexity).toEqual({ complexity: 0, note: '' });
        expect(task.review).toEqual({ review: '' });
    });
    it('should set and get complexity correctly', () => {
        const fileName = 'testFile.ts';
        const task = new ReviewTask(fileName, 'test code');
        const complexity = { complexity: 5, note: 'Some complexity' };
        task.complexity = complexity;
        expect(task.complexity).toBe(complexity);
    });
    it('should set and get review correctly', () => {
        const fileName = 'testFile.ts';
        const task = new ReviewTask(fileName, 'test code');
        const review = { review: 'Looks good' };
        task.review = review;
        expect(task.review).toBe(review);
    });
    it('should emit stateChange event when state is changed', (done) => {
        const fileName = 'testFile.ts';
        const task = new ReviewTask(fileName, 'test code');
        task.on('stateChange', (newState) => {
            expect(newState).toBe(JobState.IN_COMPLEXITY_ASSESSMENT);
            done();
        });
        task.state = JobState.IN_COMPLEXITY_ASSESSMENT;
    });
    it('should emit complexityAssessmentComplete event when complexity is set', (done) => {
        const fileName = 'testFile.ts';
        const task = new ReviewTask(fileName, 'test code');
        const complexity = { complexity: 5, note: 'High complexity' };
        task.on('complexityAssessmentComplete', (newComplexity) => {
            expect(newComplexity).toBe(complexity);
            done();
        });
        task.complexity = complexity;
    });
    it('should emit codeReviewComplete event when review is set', (done) => {
        const fileName = 'testFile.ts';
        const task = new ReviewTask(fileName, 'test code');
        const review = { review: 'Looks good' };
        task.on('codeReviewComplete', (newReview) => {
            expect(newReview).toBe(review);
            done();
        });
        task.review = review;
    });
    it('should return the correct string representation', () => {
        const fileName = 'testFile.ts';
        const task = new ReviewTask(fileName, 'test code');
        const expectedString = `Task: ${task.id}, File: ${fileName}, State: ${JobState.WAITING_TO_RUN}, Complexity: 0, Review: "", Code: test code...`;
        expect(task.toString()).toBe(expectedString);
    });
});
//# sourceMappingURL=ReviewTask.test.js.map