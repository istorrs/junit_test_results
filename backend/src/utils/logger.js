const fs = require('fs');
const path = require('path');

const logDir = process.env.LOG_DIR || './logs';

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const log = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...meta
    };

    // Console output
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);

    // File output
    const logFile = path.join(logDir, `${level}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

module.exports = {
    info: (message, meta) => log('info', message, meta),
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    debug: (message, meta) => log('debug', message, meta)
};
