const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logDir = process.env.LOG_DIR || './logs';

/**
 * GET /api/v1/logs - Fetch recent log entries
 *
 * Query parameters:
 * - level: Filter by log level (info, error, warn, debug) - default: all
 * - limit: Maximum number of log entries to return - default: 100, max: 1000
 * - minutes: Fetch logs from the last N minutes - default: 60
 * - since: ISO timestamp to fetch logs after this time
 */
router.get('/', async (req, res, next) => {
    try {
        const level = req.query.level || 'all';
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const minutes = parseInt(req.query.minutes) || 60;
        const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - minutes * 60 * 1000);

        // Determine which log files to read
        const logLevels = level === 'all'
            ? ['error', 'warn', 'info', 'debug']
            : [level];

        const logs = [];

        // Read logs from each file
        for (const logLevel of logLevels) {
            const logFile = path.join(logDir, `${logLevel}.log`);

            if (!fs.existsSync(logFile)) {
                continue;
            }

            const fileContent = fs.readFileSync(logFile, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    const logTime = new Date(logEntry.timestamp);

                    if (logTime >= since) {
                        logs.push(logEntry);
                    }
                } catch (parseError) {
                    // Skip malformed log entries
                    continue;
                }
            }
        }

        // Sort by timestamp (newest first) and limit
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const limitedLogs = logs.slice(0, limit);

        res.json({
            success: true,
            data: {
                logs: limitedLogs,
                count: limitedLogs.length,
                filters: {
                    level: level,
                    since: since.toISOString(),
                    limit: limit
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/logs/errors - Fetch only error logs (convenience endpoint)
 */
router.get('/errors', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 1000);
        const minutes = parseInt(req.query.minutes) || 10;
        const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - minutes * 60 * 1000);

        const logFile = path.join(logDir, 'error.log');
        const errors = [];

        if (fs.existsSync(logFile)) {
            const fileContent = fs.readFileSync(logFile, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    const logTime = new Date(logEntry.timestamp);

                    if (logTime >= since) {
                        errors.push(logEntry);
                    }
                } catch (parseError) {
                    continue;
                }
            }
        }

        // Sort by timestamp (newest first) and limit
        errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const limitedErrors = errors.slice(0, limit);

        res.json({
            success: true,
            data: {
                errors: limitedErrors,
                count: limitedErrors.length,
                since: since.toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/logs/tail - Tail the most recent log entries (like tail -f)
 *
 * Query parameters:
 * - level: Log level to tail (default: all)
 * - lines: Number of lines to return (default: 50, max: 500)
 */
router.get('/tail', async (req, res, next) => {
    try {
        const level = req.query.level || 'all';
        const lines = Math.min(parseInt(req.query.lines) || 50, 500);

        const logLevels = level === 'all'
            ? ['error', 'warn', 'info', 'debug']
            : [level];

        const logs = [];

        for (const logLevel of logLevels) {
            const logFile = path.join(logDir, `${logLevel}.log`);

            if (!fs.existsSync(logFile)) {
                continue;
            }

            const fileContent = fs.readFileSync(logFile, 'utf-8');
            const fileLines = fileContent.split('\n').filter(line => line.trim());

            // Get last N lines from this file
            const recentLines = fileLines.slice(-lines);

            for (const line of recentLines) {
                try {
                    const logEntry = JSON.parse(line);
                    logs.push(logEntry);
                } catch (parseError) {
                    continue;
                }
            }
        }

        // Sort by timestamp (newest first) and limit
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const limitedLogs = logs.slice(0, lines);

        res.json({
            success: true,
            data: {
                logs: limitedLogs,
                count: limitedLogs.length
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
