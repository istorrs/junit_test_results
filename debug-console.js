// Debug Console Logic - Displays logs captured by console-capture.js
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
        // Load existing logs from global capture
        this.loadExistingLogs();

        // Listen for new logs
        this.listenForNewLogs();

        // Setup UI
        this.setupEventListeners();
        this.updateDisplay();

        console.info('Debug console ready - showing captured logs');
    }

    loadExistingLogs() {
        if (window.JUnitConsoleCapture) {
            const existingLogs = window.JUnitConsoleCapture.getLogs();
            console.log(`Loading ${existingLogs.length} existing console logs`);

            existingLogs.forEach(log => {
                this.logs.push({
                    type: log.type,
                    message: log.message,
                    timestamp: new Date(log.timestamp),
                    page: log.page,
                    id: log.id
                });
                this.counts[log.type]++;
            });
        }
    }

    listenForNewLogs() {
        window.addEventListener('junit-console-log', e => {
            if (this.paused) {
                return;
            }

            const log = e.detail;
            this.logs.push({
                type: log.type,
                message: log.message,
                timestamp: new Date(log.timestamp),
                page: log.page,
                id: log.id
            });
            this.counts[log.type]++;

            // Keep only last 1000 logs in memory
            if (this.logs.length > 1000) {
                const removed = this.logs.shift();
                this.counts[removed.type]--;
            }

            this.updateDisplay();
        });
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
            if (window.JUnitConsoleCapture) {
                window.JUnitConsoleCapture.clearLogs();
            }
            this.logs = [];
            this.counts = { log: 0, info: 0, warn: 0, error: 0 };
            this.updateDisplay();
            console.info('Console logs cleared');
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
                    log.type.toLowerCase().includes(this.searchTerm) ||
                    (log.page && log.page.toLowerCase().includes(this.searchTerm))
            );
        }

        // Update log count display
        document.getElementById('log-count-display').textContent =
            `${filteredLogs.length} ${filteredLogs.length === 1 ? 'entry' : 'entries'}`;

        // Render logs
        const container = document.getElementById('log-container');
        if (filteredLogs.length === 0) {
            container.innerHTML =
                '<div class="text-gray-400 text-sm">No logs to display. Logs are captured from all pages.</div>';
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
                    ${log.page ? `<span class="text-gray-500 text-xs">${this.escapeHtml(log.page)}</span>` : ''}
                    <pre class="flex-1 whitespace-pre-wrap break-words text-sm">${this.escapeHtml(log.message)}</pre>
                </div>
            </div>
        `
            )
            .join('');

        // Auto-scroll to bottom if not paused
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
