import { EventEmitter } from 'events';
import { ReviewTaskData, CodeReviewResult, ComplexityResult, JobState } from '../interfaces.js';

export default class ReviewTask {
    private _id: string;
    private _owner: string; // The name of the agent that owns this task
    private _fileName: string;
    private _code: string;
    private _state: JobState;
    private _complexity: ComplexityResult = { complexity: 0, note: '' };
    private _review: CodeReviewResult = { review: '' };

    constructor(owner: string, fileName: string = '', code: string = '', state: JobState = JobState.NOT_INITIALIZED) {
        this._owner = owner;
        this._fileName = fileName;
        this._code = code;
        this._id = Math.random().toString(36).substring(2);
        this._state = state;
    }

    get owner(): string {
        return this._owner;
    }

    get id(): string {
        return this._id;
    }

    get fileName(): string {
        return this._fileName;
    }

    get code(): string {
        return this._code;
    }

    get state(): JobState {
        return this._state;
    }

    set state(value: JobState) {
        this._state = value;
    }

    get complexity(): ComplexityResult {
        return this._complexity;
    }

    set complexity(value: ComplexityResult) {
        if (value === null) {
            throw new Error('Complexity result cannot be null');
        }
        this._complexity = value;
    }

    get review(): CodeReviewResult {
        return this._review;
    }

    set review(value: CodeReviewResult) {
        if (value === null) {
            throw new Error('Review result cannot be null');
        }
        this._review = value;
    }

    public toString(): string {
        return `Task: ${this._id}, File: ${this._fileName}, State: ${this._state}, Complexity: ${JSON.stringify(this._complexity.complexity)}, Review: ${JSON.stringify(this._review.review)}, Code: ${this._code.substring(0, 32)}...`;
    }

    public toJSON(): ReviewTaskData {
        return {
            id: this._id,
            owner: this._owner,
            fileName: this._fileName,
            code: this._code,
            state: this._state,
            complexity: this._complexity,
            review: this._review
        };
    }

    public static fromJSON(data: ReviewTaskData): ReviewTask {
        const task = new ReviewTask(data.owner, data.fileName, data.code, data.state);
        task._id = data.id;
        task._complexity = data.complexity;
        task._review = data.review;
        return task;
    }
}