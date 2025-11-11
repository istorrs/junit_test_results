// JUnit Dashboard Debug and Error Handling
class JUnitDashboardDebugger {
    constructor() {
        this.errors = [];
        this.setupErrorHandling();
        this.runDiagnostics();
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', event => {
            this.logError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', event => {
            this.logError('Unhandled Promise Rejection', {
                reason: event.reason
            });
        });

        // Console error override
        const originalConsoleError = console.error;
        console.error = (...args) => {
            this.logError('Console Error', { args });
            originalConsoleError.apply(console, args);
        };
    }

    logError(type, details) {
        // Properly serialize error objects
        let serializedDetails = details;
        if (details instanceof Error) {
            serializedDetails = {
                message: details.message,
                name: details.name,
                stack: details.stack,
                ...details // Capture any additional properties
            };
        }

        const error = {
            type,
            details: serializedDetails,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errors.push(error);
        console.log('Dashboard Error Logged:', error);

        // Show error to user if in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.showErrorToUser(error);
        }
    }

    showErrorToUser(error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee2e2;
            border: 1px solid #ef4444;
            border-radius: 8px;
            padding: 16px;
            max-width: 400px;
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
        `;

        errorDiv.innerHTML = `
            <div style="font-weight: bold; color: #dc2626; margin-bottom: 8px;">
                🚨 Dashboard Error
            </div>
            <div style="color: #7f1d1d; margin-bottom: 8px;">
                ${error.type}: ${error.details.message || JSON.stringify(error.details)}
            </div>
            <div style="color: #7f1d1d; font-size: 10px;">
                ${error.timestamp}
            </div>
            <button onclick="this.parentElement.remove()" style="
                float: right;
                background: #dc2626;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                cursor: pointer;
                font-size: 10px;
            ">×</button>
        `;

        document.body.appendChild(errorDiv);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    async runDiagnostics() {
        console.log('🏥 Running Dashboard Diagnostics...');

        const results = {
            timestamp: new Date().toISOString(),
            browser: this.getBrowserInfo(),
            compatibility: await this.checkCompatibility(),
            database: await this.checkDatabase(),
            libraries: this.checkLibraries(),
            errors: this.errors
        };

        console.log('Diagnostics Results:', results);

        // Store results globally for access
        window.dashboardDiagnostics = results;

        return results;
    }

    getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenResolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`
        };
    }

    async checkCompatibility() {
        const checks = {
            crypto: 'crypto' in window && 'subtle' in window.crypto,
            domParser: 'DOMParser' in window,
            fetch: 'fetch' in window,
            promises: 'Promise' in window,
            arrowFunctions: this.testArrowFunctions(),
            templateLiterals: this.testTemplateLiterals(),
            destructuring: this.testDestructuring(),
            asyncAwait: this.testAsyncAwait()
        };

        return {
            checks,
            overall: Object.values(checks).every(check => check === true)
        };
    }

    testArrowFunctions() {
        try {
            eval('() => {}');
            return true;
        } catch {
            return false;
        }
    }

    testTemplateLiterals() {
        try {
            eval('`test`');
            return true;
        } catch {
            return false;
        }
    }

    testDestructuring() {
        try {
            eval('const [a] = [1];');
            return true;
        } catch {
            return false;
        }
    }

    testAsyncAwait() {
        try {
            eval('async function test() { await 1; }');
            return true;
        } catch {
            return false;
        }
    }

    async checkDatabase() {
        try {
            if (!window.dashboard || !window.dashboard.db) {
                return {
                    available: false,
                    error: 'Database not initialized'
                };
            }

            const db = window.dashboard.db;

            // Test basic operations
            const testRuns = await db.getTestRuns(1);
            const stats = await db.getTestStatistics();

            return {
                available: true,
                initialized: true,
                testRunsCount: testRuns.length,
                statsAvailable: Object.keys(stats).length > 0,
                apiConnected: true
            };
        } catch (error) {
            return {
                available: false,
                error: error.message,
                stack: error.stack
            };
        }
    }

    checkLibraries() {
        const libraries = {
            anime: 'anime' in window,
            echarts: 'echarts' in window,
            typed: 'Typed' in window,
            splitting: 'Splitting' in window,
            tailwind: 'tailwind' in window || document.querySelector('[data-tailwind]') !== null
        };

        return {
            libraries,
            loaded: Object.values(libraries).filter(lib => lib).length,
            total: Object.keys(libraries).length
        };
    }

    generateReport() {
        const report = {
            errors: this.errors.length,
            diagnostics: window.dashboardDiagnostics || null,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        console.log('📊 Dashboard Debug Report:', report);
        return report;
    }

    downloadReport() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-debug-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }
}

// Initialize debugger
window.dashboardDebugger = new JUnitDashboardDebugger();

// Export global logError function for use in other scripts
window.logError = function(type, details) {
    if (window.dashboardDebugger) {
        window.dashboardDebugger.logError(type, details);
    } else {
        console.error('Dashboard debugger not initialized:', type, details);
    }
};

// Add debug button to page
document.addEventListener('DOMContentLoaded', () => {
    const debugButton = document.createElement('button');
    debugButton.textContent = '🐛 Debug';
    debugButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        cursor: pointer;
        z-index: 9999;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    debugButton.addEventListener('click', () => {
        window.dashboardDebugger.downloadReport();
    });

    document.body.appendChild(debugButton);
});
