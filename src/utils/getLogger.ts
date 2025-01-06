import pino from 'pino';

const rootLogger = pino({
    level: process.env['LOG_ELEVEL'] || 'info',
    name: 'CodeReviewTeam'
});
const loggers: { [key: string]: pino.Logger } = {};


/**
 * Get a logger instance with the module name
 * @param name
 */
export default function getLogger(name: string) {
    if (!loggers[name])
        loggers[name] = rootLogger.child({module: name});

    return loggers[name];
}