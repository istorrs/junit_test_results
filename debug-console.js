// Debug Console Logic
class DebugConsole {
    constructor() {
        this.logs = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.paused = false;
        this.counts = {
            log: 0,
            info: 0,
            warn: 0,
            error: 0
        };

        this.init();
    }

    init() {
        this.interceptConsole();
        this.setupEventListeners();
        this.updateDisplay();

        // Add initial log
        console.info('Debug console initialized and ready');
    }

    interceptConsole() {
        const self = this;

        // Save original console methods
        const originalLog = console.log;
        const originalInfo = console.info;
        const originalWarn = console.warn;
        const originalError = console.error;

        // Override console.log
        console.log = function (...args) {
            originalLog.apply(console, args);
            self.addLog('log', args);
        };

        // Override console.info
        console.info = function (...args) {
            originalInfo.apply(console, args);
            self.addLog('info', args);
        };

        // Override console.warn
        console.warn = function (...args) {
            originalWarn.apply(console, args);
            self.addLog('warn', args);
        };

        // Override console.error
        console.error = function (...args) {
            originalError.apply(console, args);
            self.addLog('error', args);
        };

        // Intercept window errors
        window.addEventListener('error', e => {
            self.addLog('error', [
                `Uncaught Error: ${e.message}`,
                `at ${e.filename}:${e.lineno}:${e.colno}`
            ]);
        });

        // Intercept unhandled promise rejections
        window.addEventListener('unhandledrejection', e => {
            self.addLog('error', [`Unhandled Promise Rejection: ${e.reason}`]);
        });
    }

    addLog(type, args) {
        if (this.paused) {
            return;
        }

        const timestamp = new Date();
        const message = args
            .map(arg => {
                if (typeof arg === 'object') {
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
            timestamp,
            id: Date.now() + Math.random()
        };

        this.logs.push(logEntry);
        this.counts[type]++;

        // Keep only last 1000 logs
        if (this.logs.length > 1000) {
            const removed = this.logs.shift();
            this.counts[removed.type]--;
        }

        this.updateDisplay();
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.updateDisplay();
            });
        });

        // Clear logs
        document.getElementById('clear-logs').addEventListener('click', () => {
            this.logs = [];
            this.counts = { log: 0, info: 0, warn: 0, error: 0 };
            this.updateDisplay();
        });

        // Pause logs
        const pauseBtn = document.getElementById('pause-logs');
        pauseBtn.addEventListener('click', () => {
            this.paused = !this.paused;
            pauseBtn.textContent = this.paused ? 'Resume' : 'Pause';
            pauseBtn.classList.toggle('bg-yellow-600');
            pauseBtn.classList.toggle('bg-green-600');
            document.getElementById('pause-indicator').classList.toggle('hidden', !this.paused);
        });

        // Search
        document.getElementById('search-logs').addEventListener('input', e => {
            this.searchTerm = e.target.value.toLowerCase();
            this.updateDisplay();
        });
    }

    updateDisplay() {
        // Update counts
        document.getElementById('total-logs').textContent = this.logs.length;
        document.getElementById('count-log').textContent = this.counts.log;
        document.getElementById('count-info').textContent = this.counts.info;
        document.getElementById('count-warn').textContent = this.counts.warn;
        document.getElementById('count-error').textContent = this.counts.error;

        // Filter logs
        let filteredLogs = this.logs;

        if (this.currentFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.type === this.currentFilter);
        }

        if (this.searchTerm) {
            filteredLogs = filteredLogs.filter(
                log =>
                    log.message.toLowerCase().includes(this.searchTerm) ||
                    log.type.toLowerCase().includes(this.searchTerm)
            );
        }

        // Update log count display
        document.getElementById('log-count-display').textContent =
            `${filteredLogs.length} ${filteredLogs.length === 1 ? 'entry' : 'entries'}`;

        // Render logs
        const container = document.getElementById('log-container');
        if (filteredLogs.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-sm">No logs to display</div>';
            return;
        }

        // Show last 500 logs for performance
        const logsToShow = filteredLogs.slice(-500);

        container.innerHTML = logsToShow
            .map(
                log => `
            <div class="log-entry ${log.type} mb-1 rounded">
                <div class="flex items-start space-x-2">
                    <span class="text-gray-500 text-xs whitespace-nowrap">
                        ${this.formatTime(log.timestamp)}
                    </span>
                    <span class="font-semibold uppercase text-xs ${this.getTypeColor(log.type)}">
                        [${log.type}]
                    </span>
                    <pre class="flex-1 whitespace-pre-wrap break-words text-sm">${this.escapeHtml(log.message)}</pre>
                </div>
            </div>
        `
            )
            .join('');

        // Auto-scroll to bottom
        if (!this.paused) {
            container.scrollTop = container.scrollHeight;
        }
    }

    formatTime(timestamp) {
        const hours = String(timestamp.getHours()).padStart(2, '0');
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        const seconds = String(timestamp.getSeconds()).padStart(2, '0');
        const ms = String(timestamp.getMilliseconds()).padStart(3, '0');
        return `${hours}:${minutes}:${seconds}.${ms}`;
    }

    getTypeColor(type) {
        const colors = {
            log: 'text-blue-400',
            info: 'text-green-400',
            warn: 'text-yellow-400',
            error: 'text-red-400'
        };
        return colors[type] || 'text-gray-400';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize debug console
document.addEventListener('DOMContentLoaded', () => {
    window.debugConsole = new DebugConsole();
});
