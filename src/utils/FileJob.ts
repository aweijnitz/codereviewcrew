import {CodeReviewResult, ComplexityResult, JobState} from "../interfaces";

export class FileJob {
    fileName: string;
    complexity: ComplexityResult = {fileName: '', complexity: 0, note: ''};
    review: CodeReviewResult = {fileName: '', review: ''};
    state: JobState;

    constructor(fileName: string, state: JobState) {
        this.fileName = fileName;
        this.state = state;
    }
}