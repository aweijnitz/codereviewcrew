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
    fileName: string;
    complexity: number;
    note: string;
}

export interface CodeReviewResult {
    fileName: string;
    review: string;
}