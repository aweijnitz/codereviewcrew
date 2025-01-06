export interface CodeMetaData {
    Language: string;
    Filename: string;
    Size: number;
    Complexity: number;
    Lines: number;
    Code: number;
    Comments: number;
}

export interface ComplexityResult {
    complexity: number;
    note: string;
}

export interface CodeReviewResult {
    review: string;
}


export interface ReviewTaskData {
    id: string;
    owner: string;
    fileName: string;
    code: string;
    state: JobState;
    complexity: ComplexityResult;
    review: CodeReviewResult;
}

export enum JobState {
    NOT_INITIALIZED,
    WAITING_TO_RUN,
    IN_COMPLEXITY_ASSESSMENT,
    COMPLETED_COMPLEXITY_ASSESSMENT,
    IN_CODE_REVIEW,
    COMPLETED_CODE_REVIEW,
    COMPLETED
}

