import {config} from "@dotenvx/dotenvx"; config();
import Database from 'better-sqlite3';
import * as process from "process";
import getLogger from "../utils/getLogger.js";
import {ComplexityCount, ProblematicFile, ReviewTaskData} from "../interfaces.js";

const logger = getLogger('schema');
let db : Database.Database;

interface TableInfo {
    name: string;
}

interface TableNames {
    reviewTaskTableName: string
    complexityTableName: string
    reviewTableName: string
}

function toTableNames(owner: string): TableNames {
    const reviewTaskTableName = `agent_${basicSanitize(owner)}_ReviewTaskData`;
    const complexityTableName = `agent_${basicSanitize(owner)}_ComplexityResult`;
    const reviewTableName = `agent_${basicSanitize(owner)}_CodeReviewResult`;
    return {
        reviewTaskTableName,
        complexityTableName,
        reviewTableName
    };
}

export function getDB(): Database.Database {
    if(!db) {
        logger.debug(`Creating db in ${process.env.DB_FILE_NAME || 'DB_FILE_NAME_NOT_SET'}`);
        db = new Database(process.env.DB_FILE_NAME || 'DB_FILE_NAME_NOT_SET', {
            verbose: console.debug,
            fileMustExist: false
        });
    }
    return db;
}

/**
 * Create a tables to hold all reviews for an owner.
 * @param owner
 */
export function createReviewTaskTable(owner: string) {
    const db = getDB();

    const { reviewTaskTableName, complexityTableName, reviewTableName } = toTableNames(owner);

    const createReviewTaskTableSQL = `
        CREATE TABLE IF NOT EXISTS ${reviewTaskTableName} (
            id TEXT PRIMARY KEY,
            owner TEXT,
            fileName TEXT,
            code TEXT,
            state TEXT,
            complexityId INTEGER,
            reviewId INTEGER,
            FOREIGN KEY(complexityId) REFERENCES ${complexityTableName}(id),
            FOREIGN KEY(reviewId) REFERENCES ${reviewTableName}(id)
        );
    `;

    const createComplexityTableSQL = `
        CREATE TABLE IF NOT EXISTS ${complexityTableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complexity INTEGER,
            note TEXT
        );
    `;

    const createReviewTableSQL = `
        CREATE TABLE IF NOT EXISTS ${reviewTableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review TEXT
        );
    `;

    db.exec(createComplexityTableSQL);
    db.exec(createReviewTableSQL);
    db.exec(createReviewTaskTableSQL);
    logger.debug(`Tables created for owner: ${owner}. Name: ${createReviewTaskTableSQL}`);

}

/**
 * Clean up data. Deletes the data associated with owner.
 * @param owner
 */
export function deleteReviewTaskTables(owner: string) {
    const db = getDB();
    const { reviewTaskTableName, complexityTableName, reviewTableName } = toTableNames(owner);

    const dropReviewTaskTableSQL = `DROP TABLE IF EXISTS ${reviewTaskTableName};`;
    const dropComplexityTableSQL = `DROP TABLE IF EXISTS ${complexityTableName};`;
    const dropReviewTableSQL = `DROP TABLE IF EXISTS ${reviewTableName};`;

    db.exec(dropReviewTaskTableSQL);
    db.exec(dropComplexityTableSQL);
    db.exec(dropReviewTableSQL);

}

export function closeDB() {
    const db = getDB();
    return db.close();
}

/** Delete all data in the database. Close db connection.
 *
 */
export function clearAllTables() {
    const db = getDB();

    // Disable foreign key checks
    db.exec("PRAGMA foreign_keys = OFF;");

    const tables: TableInfo[] = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all() as TableInfo[];

    db.transaction(() => {
        // Drop tables without foreign key dependencies first
        for (const table of tables) {
            if (table.name.startsWith('agent_') && !table.name.includes('ComplexityResult') && !table.name.includes('CodeReviewResult')) {
                const dropTableSQL = `DROP TABLE IF EXISTS ${table.name};`;
                db.exec(dropTableSQL);
            }
        }

        // Then drop tables with foreign key dependencies
        for (const table of tables) {
            if (table.name.startsWith('agent_') && (table.name.includes('ComplexityResult') || table.name.includes('CodeReviewResult'))) {
                const dropTableSQL = `DROP TABLE IF EXISTS ${table.name};`;
                db.exec(dropTableSQL);
            }
        }
    })();

    // Re-enable foreign key checks
    db.exec("PRAGMA foreign_keys = ON;");

    db.close();
}


/**
 * Internal helper to make sure table names are valid SQL.
 * NOTE: NOT A SECURITY SANITATION.
 *
 * @param input
 */
function basicSanitize(input : string) : string {
    // Replace all occurrences of '-', '//', '\', and ' ' with '§'
    if(!input)
        return 'UNDFINED';
    return input.replace(/[-/\\\s]/g, '§');
}


export function persistReviewTask(reviewTask: ReviewTaskData) {
    const db = getDB();

    const { reviewTaskTableName, complexityTableName, reviewTableName } = toTableNames(reviewTask.owner);

    const insertComplexitySQL = `
        INSERT INTO ${complexityTableName} (complexity, note)
        VALUES (?, ?);
    `;
    const insertReviewSQL = `
        INSERT INTO ${reviewTableName} (review)
        VALUES (?);
    `;
    const insertReviewTaskSQL = `
        INSERT INTO ${reviewTaskTableName} (id, owner, fileName, code, state, complexityId, reviewId)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    const complexityStmt = db.prepare(insertComplexitySQL);
    const reviewStmt = db.prepare(insertReviewSQL);
    const reviewTaskStmt = db.prepare(insertReviewTaskSQL);

    const transaction = db.transaction(() => {
        const complexityResult = complexityStmt.run(
            reviewTask.complexity.complexity,
            reviewTask.complexity.note
        );
        const complexityId = complexityResult.lastInsertRowid;

        const reviewResult = reviewStmt.run(reviewTask.review.review);
        const reviewId = reviewResult.lastInsertRowid;

        reviewTaskStmt.run(
            reviewTask.id,
            reviewTask.owner,
            reviewTask.fileName,
            reviewTask.code,
            reviewTask.state,
            complexityId,
            reviewId
        );
    });

    transaction();
}


/**
 * Count all tasks and group by assigned complexity.
 * Returns results in descending complexity order.
 *
 * @param owner
 */
export function getTaskCountByComplexity(owner: string): ComplexityCount[] {
    logger.debug(`getTaskCountByComplexity(${owner}`);
    const db = getDB();
    const { reviewTaskTableName, complexityTableName } = toTableNames(owner);

    const sql = `
        SELECT c.complexity, COUNT(rt.id) as count
        FROM ${reviewTaskTableName} rt
        JOIN ${complexityTableName} c ON rt.complexityId = c.id
        GROUP BY c.complexity
        ORDER BY c.complexity DESC
    `;

    const stmt = db.prepare(sql);
    const results = stmt.all() as ComplexityCount[];

    return results;
}



interface ReviewRow {
    review: string;
}

/**
 * Load *all* reviews from database (potentially large set for big repos).
 *
 * @param owner
 */
export function getAllCodeReviews(owner: string): string[] {
    logger.debug(`getAllCodeReviews(${owner}`);
    const db = getDB();
    const { reviewTableName } = toTableNames(owner);

    const sql = `
        SELECT review
        FROM ${reviewTableName}
    `;

    const stmt = db.prepare(sql);
    const results = stmt.all()  as ReviewRow[];

    return results.map(row => row.review);
}

/**
 * Get the worst files from the review (anything above 3).
 * Returns results in descending complexity order.
 *
 * @param owner
 */
export function getTopProblematicFilesByComplexity(owner: string): ProblematicFile[] {
    const db = getDB();
    const { reviewTaskTableName, complexityTableName } = toTableNames(owner);

    const sql = `
        SELECT c.complexity, rt.fileName
        FROM ${reviewTaskTableName} rt
        JOIN ${complexityTableName} c ON rt.complexityId = c.id
        WHERE c.complexity > 3
        ORDER BY c.complexity DESC
    `;

    const stmt = db.prepare(sql);
    const results = stmt.all() as ProblematicFile[];

    return results;
}