import {config} from "@dotenvx/dotenvx"; config();
import process from "process";
import {clearAllTables, closeDB} from "../db/schema.js";
import {obliterateAllQueues} from "../taskmanagement/queueManagement.js";
import getLogger from "./getLogger.js";

const logger = getLogger('gracefulShutdown');

function clearAllEphemeralData() {
    if (process.env.CLEAR_DATA_ON_EXIT === 'true') {
        logger.warn(`Process exiting, clearing all database tables from ${process.env.DB_FILE_NAME}`);
        clearAllTables();
        logger.warn('Process exiting, removing all queued jobs and queues');
        obliterateAllQueues().catch(logger.error);
    } else
        closeDB(); // Close database connection
}

export function mountShutdownHooks() {
    logger.debug('Mounting shutdown hooks.');

    process.on('exit', () => {
        clearAllEphemeralData();
        logger.info('SYSTEM EXIT')
    });

    process.on('SIGINT', () => {
        logger.warn('SIGINT received.');
        clearAllEphemeralData();
        process.exit(0); // Exit gracefully
    });

    process.on('SIGTERM', () => {
        logger.warn('SIGTERM signal received.');
        clearAllEphemeralData();
        process.exit(0); // Exit gracefully
    });

    process.on('SIGHUP', () => {
        logger.warn('SIGHUP signal received.');
        clearAllEphemeralData();
        process.exit(0); // Exit gracefully
    });
}

