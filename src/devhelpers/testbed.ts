import {config} from "@dotenvx/dotenvx";
import * as process from "process";
import {clearAllTables, createReviewTaskTable, deleteReviewTaskTables, persistReviewTask} from "../db/schema.js";
import ReviewTask from "../taskmanagement/ReviewTask.js";
import {JobState} from "../interfaces.js";

config();

console.log(process.env.DB_FILE_NAME)

const owner = 'myOwner1';

createReviewTaskTable(owner);

const reviewTask0 = new ReviewTask(owner, 'file-0.ts', 'code', JobState.WAITING_TO_RUN);
const reviewTask1 = new ReviewTask(owner, 'file-1.ts', 'code', JobState.WAITING_TO_RUN);

persistReviewTask(reviewTask0);
persistReviewTask(reviewTask1);
deleteReviewTaskTables(owner)
clearAllTables();

