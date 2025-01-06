import {CodeReviewResult, ComplexityResult, JobState} from "../interfaces";

export class ReviewTask {
    fileName: string;
    complexity: ComplexityResult = {fileName: '', complexity: 0, note: ''};
    review: CodeReviewResult = {fileName: '', review: ''};
    state: JobState = JobState.NOT_INITIALIZED

    constructor(fileName: string, state: JobState) {
        this.fileName = fileName;
        this.state = state;
    }
}