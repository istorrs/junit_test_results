// Global Console Capture - Runs on every page
// Stores console logs in sessionStorage so they can be viewed in debug console

(function () {
    const MAX_LOGS = 1000;
    const STORAGE_KEY = 'junit-console-logs';

    // Initialize or load existing logs
    let logs = [];
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            logs = JSON.parse(stored);
        }
    } catch {
        // Ignore errors
    }

    // Function to add log
    function addLog(type, args) {
        const timestamp = new Date();
        const message = args
            .map(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    // Special handling for Error objects
                    if (arg instanceof Error) {
                        return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
                    }
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            })
            .join(' ');

        const logEntry = {
            type,
            message,
            timestamp: timestamp.toISOString(),
            page: window.location.pathname,
            id: Date.now() + Math.random()
        };

        logs.push(logEntry);

        // Keep only last MAX_LOGS
        if (logs.length > MAX_LOGS) {
            logs.shift();
        }

        // Save to storage
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        } catch {
            // Storage full, remove old logs
            logs = logs.slice(-500);
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
            } catch {
                // Still failing, give up
            }
        }

        // Trigger custom event for real-time updates
        window.dispatchEvent(
            new CustomEvent('junit-console-log', {
                detail: logEntry
            })
        );
    }

    // Save original console methods
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Override console.log
    console.log = function (...args) {
        originalLog.apply(console, args);
        addLog('log', args);
    };

    // Override console.info
    console.info = function (...args) {
        originalInfo.apply(console, args);
        addLog('info', args);
    };

    // Override console.warn
    console.warn = function (...args) {
        originalWarn.apply(console, args);
        addLog('warn', args);
    };

    // Override console.error
    console.error = function (...args) {
        originalError.apply(console, args);
        addLog('error', args);
    };

    // Intercept window errors
    window.addEventListener('error', e => {
        addLog('error', [
            `Uncaught Error: ${e.message}`,
            `at ${e.filename}:${e.lineno}:${e.colno}`
        ]);
    });

    // Intercept unhandled promise rejections
    window.addEventListener('unhandledrejection', e => {
        addLog('error', [`Unhandled Promise Rejection: ${e.reason}`]);
    });

    // Expose API for debug console
    window.JUnitConsoleCapture = {
        getLogs: function () {
            return logs.slice(); // Return copy
        },
        clearLogs: function () {
            logs = [];
            try {
                sessionStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignore
            }
        }
    };

    // Log that capture is active
    console.info('Console capture initialized');
})();
