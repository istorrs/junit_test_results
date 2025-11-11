// Centralized Limits Configuration
// Manages default limits and user preferences for all database queries and data displays

class LimitsConfig {
    constructor() {
        // Define all default limits used across the application
        this.defaults = {
            // Dashboard
            dashboardRecentRuns: 10,
            dashboardTestCases: 10000,
            dashboardTrends: 30,

            // Test Cases
            testCasesPerPage: 100,
            testCaseHistory: 100,
            testHistoryModal: 50,

            // Insights
            insightsNewFailures: 5,
            insightsFlakyTests: 5,
            insightsFlakyHistory: 10,
            insightsSlowTests: 20,
            insightsRecentRuns: 3,
            insightsUnhealthySuites: 3,

            // Test Case History Page
            historyRecentData: 30,
            historyComparisonWindow: 5,

            // Search
            searchTestCases: 50,
            searchTestRuns: 50,

            // Data Management
            dataManagementRuns: 1000,

            // Release Reports
            releaseReportsRuns: 100,
            releaseReportsTestCases: 2000,

            // Backend API defaults
            apiRunsDefault: 50,
            apiCasesDefault: 50,
            apiStatsDefault: 20
        };

        this.current = {};
        this.loadUserPreferences();
        this.setupEventListeners();
    }

    /**
     * Load user preferences from localStorage
     */
    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('userLimits');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults, only keeping valid keys
                this.current = {};
                for (const key in this.defaults) {
                    this.current[key] = parsed[key] !== undefined ? parsed[key] : this.defaults[key];
                }
            } else {
                this.current = { ...this.defaults };
            }
        } catch (error) {
            console.error('Failed to load user limits preferences:', error);
            this.current = { ...this.defaults };
        }
    }

    /**
     * Save current preferences to localStorage
     */
    save() {
        try {
            localStorage.setItem('userLimits', JSON.stringify(this.current));
            // Dispatch event so pages can react to limit changes
            window.dispatchEvent(new CustomEvent('limitsChanged', {
                detail: { limits: this.current }
            }));
        } catch (error) {
            console.error('Failed to save user limits preferences:', error);
        }
    }

    /**
     * Get a limit value
     * @param {string} key - The limit key
     * @returns {number} - The limit value
     */
    get(key) {
        return this.current[key] !== undefined ? this.current[key] : this.defaults[key];
    }

    /**
     * Set a limit value
     * @param {string} key - The limit key
     * @param {number} value - The new limit value
     */
    set(key, value) {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
            console.error(`Invalid limit value: ${value}`);
            return;
        }
        this.current[key] = numValue;
        this.save();
    }

    /**
     * Reset a specific limit to its default value
     * @param {string} key - The limit key
     */
    reset(key) {
        if (this.defaults[key] !== undefined) {
            this.current[key] = this.defaults[key];
            this.save();
        }
    }

    /**
     * Reset all limits to default values
     */
    resetAll() {
        this.current = { ...this.defaults };
        this.save();
    }

    /**
     * Get all current limits
     * @returns {Object} - All current limit values
     */
    getAll() {
        return { ...this.current };
    }

    /**
     * Get all default limits
     * @returns {Object} - All default limit values
     */
    getDefaults() {
        return { ...this.defaults };
    }

    /**
     * Check if a limit has been customized
     * @param {string} key - The limit key
     * @returns {boolean} - True if limit differs from default
     */
    isCustomized(key) {
        return this.current[key] !== this.defaults[key];
    }

    /**
     * Setup event listeners for cross-tab synchronization
     */
    setupEventListeners() {
        // Listen for storage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'userLimits' && e.newValue) {
                this.loadUserPreferences();
                window.dispatchEvent(new CustomEvent('limitsChanged', {
                    detail: { limits: this.current }
                }));
            }
        });
    }

    /**
     * Create a limit control UI element
     * @param {string} key - The limit key
     * @param {string} label - Display label for the control
     * @param {string} description - Optional description
     * @returns {HTMLElement} - The control element
     */
    createControl(key, label, description = '') {
        const container = document.createElement('div');
        container.className = 'flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded';

        const labelContainer = document.createElement('div');
        labelContainer.className = 'flex-1';

        const labelElement = document.createElement('label');
        labelElement.className = 'text-sm font-medium text-gray-700';
        labelElement.textContent = label;
        labelContainer.appendChild(labelElement);

        if (description) {
            const desc = document.createElement('div');
            desc.className = 'text-xs text-gray-500 mt-0.5';
            desc.textContent = description;
            labelContainer.appendChild(desc);
        }

        const inputContainer = document.createElement('div');
        inputContainer.className = 'flex items-center space-x-2';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.step = '1';
        input.value = this.get(key);
        input.className = 'w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

        const isCustom = this.isCustomized(key);
        if (isCustom) {
            input.classList.add('border-blue-500');
        }

        const resetBtn = document.createElement('button');
        resetBtn.className = 'text-xs text-gray-500 hover:text-blue-600 px-2 py-1';
        resetBtn.textContent = '↺';
        resetBtn.title = `Reset to default (${this.defaults[key]})`;
        resetBtn.style.display = isCustom ? 'block' : 'none';

        input.addEventListener('change', (e) => {
            this.set(key, e.target.value);
            const newIsCustom = this.isCustomized(key);
            if (newIsCustom) {
                input.classList.add('border-blue-500');
                resetBtn.style.display = 'block';
            } else {
                input.classList.remove('border-blue-500');
                resetBtn.style.display = 'none';
            }
        });

        resetBtn.addEventListener('click', () => {
            this.reset(key);
            input.value = this.get(key);
            input.classList.remove('border-blue-500');
            resetBtn.style.display = 'none';
        });

        inputContainer.appendChild(input);
        inputContainer.appendChild(resetBtn);

        container.appendChild(labelContainer);
        container.appendChild(inputContainer);

        return container;
    }

    /**
     * Create a settings panel for a specific page
     * @param {Array<Object>} controls - Array of {key, label, description} objects
     * @param {string} title - Panel title
     * @returns {HTMLElement} - The settings panel element
     */
    createSettingsPanel(controls, title = 'Display Limits') {
        const panel = document.createElement('div');
        panel.className = 'bg-white rounded-lg shadow-sm border border-gray-200 p-4';

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-3 pb-2 border-b border-gray-200';

        const titleElement = document.createElement('h3');
        titleElement.className = 'text-sm font-semibold text-gray-900';
        titleElement.textContent = title;

        const resetAllBtn = document.createElement('button');
        resetAllBtn.className = 'text-xs text-gray-600 hover:text-blue-600 underline';
        resetAllBtn.textContent = 'Reset All';
        resetAllBtn.addEventListener('click', () => {
            if (confirm('Reset all limits to default values?')) {
                this.resetAll();
                // Recreate the panel
                const newPanel = this.createSettingsPanel(controls, title);
                panel.replaceWith(newPanel);
            }
        });

        header.appendChild(titleElement);
        header.appendChild(resetAllBtn);
        panel.appendChild(header);

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'space-y-1';

        controls.forEach(({ key, label, description }) => {
            const control = this.createControl(key, label, description);
            controlsContainer.appendChild(control);
        });

        panel.appendChild(controlsContainer);

        return panel;
    }
}

// Initialize global limits configuration
window.limitsConfig = new LimitsConfig();

// Log initialization
console.log('[LimitsConfig] Initialized with limits:', window.limitsConfig.getAll());
