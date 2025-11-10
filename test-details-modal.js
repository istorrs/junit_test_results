// Test Details Modal Component
class TestDetailsModal {
    constructor() {
        this.modal = null;
        this.currentTestCase = null;
        this.activeTab = 'overview';
        this.testHistory = [];
        this.createModal();
    }

    createModal() {
        // Create modal HTML with tabs
        const modalHTML = `
            <div id="test-details-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-screen overflow-y-auto">
                        <!-- Modal Header -->
                        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Test Case Details</h2>
                            <button id="close-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <!-- Tab Navigation -->
                        <div class="border-b border-gray-200 dark:border-gray-700">
                            <nav class="flex -mb-px px-6">
                                <button id="tab-overview" class="modal-tab active px-4 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600 dark:text-blue-400">
                                    Overview
                                </button>
                                <button id="tab-failure" class="modal-tab px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300">
                                    Failure Details
                                </button>
                                <button id="tab-history" class="modal-tab px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300">
                                    History
                                </button>
                                <button id="tab-metadata" class="modal-tab px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300">
                                    Metadata
                                </button>
                            </nav>
                        </div>

                        <!-- Modal Content -->
                        <div id="modal-content" class="p-6">
                            <!-- Content will be populated dynamically -->
                        </div>

                        <!-- Modal Footer -->
                        <div class="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                            <button id="view-full-history" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                                View Full History →
                            </button>
                            <button id="close-modal-footer" class="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get modal elements
        this.modal = document.getElementById('test-details-modal');

        // Setup event listeners
        document.getElementById('close-modal').addEventListener('click', this.close.bind(this));
        document.getElementById('close-modal-footer').addEventListener('click', this.close.bind(this));

        // Tab listeners
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.id.replace('tab-', '')));
        });

        // View full history button
        document.getElementById('view-full-history').addEventListener('click', () => {
            if (this.currentTestCase) {
                window.location.href = `test-case-history.html?name=${encodeURIComponent(this.currentTestCase.name)}&class=${encodeURIComponent(this.currentTestCase.classname)}`;
            }
        });

        // Close on backdrop click
        this.modal.addEventListener('click', event => {
            if (event.target === this.modal) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    async show(testCaseId, database) {
        try {
            this.currentTestCase = await this.getTestCaseDetails(testCaseId, database);
            if (!this.currentTestCase) {
                throw new Error('Test case not found');
            }

            // Load test history
            await this.loadTestHistory(database);

            this.activeTab = 'overview';
            this.populateModal();
            this.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } catch (error) {
            logError('Error showing test details', error);
            alert('Error loading test details: ' + error.message);
        }
    }

    async loadTestHistory(database) {
        try {
            const response = await database.request(
                `/cases?name=${encodeURIComponent(this.currentTestCase.name)}&classname=${encodeURIComponent(this.currentTestCase.classname)}&limit=10`
            );
            this.testHistory = response.data.cases || [];
        } catch (error) {
            logError('Error loading test history', error);
            this.testHistory = [];
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active', 'border-blue-600', 'text-blue-600', 'dark:text-blue-400');
            tab.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        });

        const activeTab = document.getElementById(`tab-${tabName}`);
        activeTab.classList.add('active', 'border-blue-600', 'text-blue-600', 'dark:text-blue-400');
        activeTab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');

        // Render content for active tab
        this.renderTabContent();
    }

    renderTabContent() {
        const content = document.getElementById('modal-content');

        switch (this.activeTab) {
            case 'overview':
                content.innerHTML = this.renderOverviewTab();
                break;
            case 'failure':
                content.innerHTML = this.renderFailureTab();
                break;
            case 'history':
                content.innerHTML = this.renderHistoryTab();
                break;
            case 'metadata':
                content.innerHTML = this.renderMetadataTab();
                break;
        }
    }

    close() {
        this.modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.currentTestCase = null;
    }

    async getTestCaseDetails(testCaseId, database) {
        try {
            console.log('Getting test case details for ID:', testCaseId);
            // Use the API client to get test case details
            const testCase = await database.getTestCase(testCaseId);
            console.log('API response:', testCase);

            if (!testCase || !testCase.case) {
                logError('Test case not found or invalid response', { testCase });
                return null;
            }

            // The API returns the test case in the 'case' property
            const caseData = testCase.case;

            // Add detailed results (if available in the response) - wrap result in array for compatibility
            caseData.detailedResults = testCase.result ? [testCase.result] : [];

            return caseData;
        } catch (error) {
            logError('Error fetching test case details', error);
            throw error;
        }
    }

    populateModal() {
        this.renderTabContent();
    }

    renderOverviewTab() {
        const testCase = this.currentTestCase;

        return `
            <!-- Test Case Header -->
            <div class="mb-6">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${testCase.name}</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 code-font">${testCase.classname}</p>
                        <div class="flex items-center space-x-2">
                            <span class="px-3 py-1 text-sm font-medium rounded-full ${this.getStatusColorClass(testCase.status)}">
                                ${testCase.status.toUpperCase()}
                            </span>
                            ${testCase.is_flaky ? '<span class="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">⚠️ FLAKY</span>' : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-bold text-gray-900 dark:text-white">${testCase.time.toFixed(3)}s</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Execution Time</div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div class="text-sm text-gray-600 dark:text-gray-400">Assertions</div>
                        <div class="text-lg font-semibold text-gray-900 dark:text-white">${testCase.assertions}</div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div class="text-sm text-gray-600 dark:text-gray-400">File</div>
                        <div class="text-sm font-medium text-gray-900 dark:text-white truncate">${testCase.file || 'N/A'}</div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div class="text-sm text-gray-600 dark:text-gray-400">Line</div>
                        <div class="text-lg font-semibold text-gray-900 dark:text-white">${testCase.line || 'N/A'}</div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div class="text-sm text-gray-600 dark:text-gray-400">Date</div>
                        <div class="text-sm font-medium text-gray-900 dark:text-white">${new Date(testCase.timestamp).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>

            ${this.renderSystemOutput(testCase)}

            ${testCase.status === 'failed' || testCase.status === 'error' ? `
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <p class="text-sm text-red-800 dark:text-red-200">
                        ⚠️ This test failed. Click on the "Failure Details" tab for more information.
                    </p>
                </div>
            ` : ''}
        `;
    }

    renderFailureTab() {
        const testCase = this.currentTestCase;

        if (testCase.status !== 'failed' && testCase.status !== 'error') {
            return `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">✅</div>
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Failures</h3>
                    <p class="text-gray-600 dark:text-gray-400">This test passed successfully</p>
                </div>
            `;
        }

        const detailedResult = testCase.detailedResults && testCase.detailedResults[0];
        const message = detailedResult?.failure_message || detailedResult?.error_message || testCase.failure_message;
        const type = detailedResult?.failure_type || detailedResult?.error_type;
        const stackTrace = detailedResult?.stack_trace || testCase.stack_trace;

        return `
            <div class="space-y-6">
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div class="mb-3">
                        <span class="text-sm font-medium text-red-800 dark:text-red-200">Error Type:</span>
                        <span class="text-sm text-red-700 dark:text-red-300 ml-2">${type || 'Unknown'}</span>
                    </div>
                    ${message ? `
                        <div class="mb-3">
                            <span class="text-sm font-medium text-red-800 dark:text-red-200 block mb-2">Message:</span>
                            <div class="p-3 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                                ${this.escapeHtml(message)}
                            </div>
                        </div>
                    ` : ''}
                    ${stackTrace ? `
                        <div>
                            <span class="text-sm font-medium text-red-800 dark:text-red-200 block mb-2">Stack Trace:</span>
                            <div class="p-4 bg-gray-900 text-gray-100 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                                ${this.escapeHtml(stackTrace)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderHistoryTab() {
        if (this.testHistory.length === 0) {
            return `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">📊</div>
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No History Available</h3>
                    <p class="text-gray-600 dark:text-gray-400">No historical data found for this test</p>
                </div>
            `;
        }

        const passed = this.testHistory.filter(t => t.status === 'passed').length;
        const failed = this.testHistory.filter(t => t.status === 'failed' || t.status === 'error').length;
        const successRate = ((passed / this.testHistory.length) * 100).toFixed(1);

        return `
            <div class="space-y-6">
                <!-- Mini Summary -->
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                        <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Last 10 Runs</div>
                        <div class="text-2xl font-bold text-gray-900 dark:text-white">${this.testHistory.length}</div>
                    </div>
                    <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                        <div class="text-sm text-green-600 dark:text-green-400 mb-1">Passed</div>
                        <div class="text-2xl font-bold text-green-600 dark:text-green-400">${passed}</div>
                    </div>
                    <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                        <div class="text-sm text-red-600 dark:text-red-400 mb-1">Failed</div>
                        <div class="text-2xl font-bold text-red-600 dark:text-red-400">${failed}</div>
                    </div>
                </div>

                <!-- Status Timeline -->
                <div>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Results (Last 10 Runs)</h4>
                    <div class="flex space-x-1 mb-2">
                        ${this.testHistory.map(t => {
                            const statusIcon = t.status === 'passed' ? '✅' : t.status === 'failed' ? '❌' : t.status === 'error' ? '⚠️' : '⊝';
                            const color = t.status === 'passed' ? 'bg-green-500' : t.status === 'failed' ? 'bg-red-500' : t.status === 'error' ? 'bg-orange-500' : 'bg-gray-400';
                            return `<div class="${color} h-8 flex-1 rounded flex items-center justify-center text-white text-sm" title="${new Date(t.created_at).toLocaleString()} - ${t.status}">${statusIcon}</div>`;
                        }).join('')}
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Oldest</span>
                        <span>Newest</span>
                    </div>
                </div>

                <!-- Success Rate -->
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-medium text-blue-800 dark:text-blue-200">Success Rate (Last 10 Runs)</span>
                        <span class="text-2xl font-bold ${parseFloat(successRate) >= 80 ? 'text-green-600 dark:text-green-400' : parseFloat(successRate) >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}">${successRate}%</span>
                    </div>
                </div>

                <!-- Execution History Table -->
                <div>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Execution Details</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Duration</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                ${this.testHistory.map(t => `
                                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td class="px-3 py-2 text-gray-900 dark:text-white">${new Date(t.created_at).toLocaleString()}</td>
                                        <td class="px-3 py-2">
                                            <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColorClass(t.status)}">
                                                ${t.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td class="px-3 py-2 text-right text-gray-900 dark:text-white">${t.time.toFixed(3)}s</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderMetadataTab() {
        const testCase = this.currentTestCase;

        return `
            <div class="space-y-6">
                <!-- Test Information -->
                <div>
                    <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-3">Test Information</h4>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Full Name:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white code-font">${testCase.name}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Class:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white code-font">${testCase.classname}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">File:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">${testCase.file || 'Not specified'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Line:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">${testCase.line || 'Not specified'}</span>
                        </div>
                    </div>
                </div>

                <!-- Execution Details -->
                <div>
                    <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-3">Execution Details</h4>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                            <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColorClass(testCase.status)}">
                                ${testCase.status.toUpperCase()}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Duration:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">${testCase.time.toFixed(3)}s</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Assertions:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">${testCase.assertions}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Timestamp:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">${new Date(testCase.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <!-- Flaky Status -->
                <div>
                    <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-3">Reliability</h4>
                    <div class="${testCase.is_flaky ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'} border rounded-lg p-4">
                        <p class="text-sm ${testCase.is_flaky ? 'text-yellow-800 dark:text-yellow-200' : 'text-green-800 dark:text-green-200'}">
                            ${testCase.is_flaky
                                ? '⚠️ This test has been identified as flaky due to inconsistent pass/fail patterns.'
                                : '✓ This test appears to be stable based on historical results.'
                            }
                        </p>
                        ${testCase.flaky_detected_at ? `
                            <p class="text-xs ${testCase.is_flaky ? 'text-yellow-600 dark:text-yellow-300' : 'text-green-600 dark:text-green-300'} mt-2">
                                Flaky behavior detected: ${new Date(testCase.flaky_detected_at).toLocaleDateString()}
                            </p>
                        ` : ''}
                    </div>
                </div>

                <!-- Run Information -->
                ${testCase.run_id ? `
                    <div>
                        <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-3">Test Run</h4>
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600 dark:text-gray-400">Run ID:</span>
                                <a href="details.html?run_id=${testCase.run_id}"
                                   class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                    View Full Run →
                                </a>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderFailureDetails(testCase) {
        if (testCase.status !== 'failed' && testCase.status !== 'error') {
            return '';
        }

        const detailedResult = testCase.detailedResults && testCase.detailedResults[0];
        if (!detailedResult) {
            return '';
        }

        const message = detailedResult.failure_message || detailedResult.error_message;
        const type = detailedResult.failure_type || detailedResult.error_type;
        const stackTrace = detailedResult.stack_trace;

        return `
            <div class="mb-6">
                <h4 class="text-md font-semibold text-gray-900 mb-3">Failure Details</h4>
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="mb-3">
                        <span class="text-sm font-medium text-red-800">Error Type:</span>
                        <span class="text-sm text-red-700">${type || 'Unknown'}</span>
                    </div>
                    ${
                        message
                            ? `
                        <div class="mb-3">
                            <span class="text-sm font-medium text-red-800">Message:</span>
                            <div class="mt-2 p-3 bg-white border border-red-200 rounded text-sm text-red-700">
                                ${this.escapeHtml(message)}
                            </div>
                        </div>
                    `
                            : ''
                    }
                    ${
                        stackTrace
                            ? `
                        <div>
                            <span class="text-sm font-medium text-red-800">Stack Trace:</span>
                            <div class="mt-2 p-4 bg-gray-900 text-gray-100 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                                ${this.escapeHtml(stackTrace)}
                            </div>
                        </div>
                    `
                            : ''
                    }
                </div>
            </div>
        `;
    }

    renderSystemOutput(testCase) {
        if (!testCase.system_out && !testCase.system_err) {
            return '';
        }

        return `
            <div class="mb-6">
                <h4 class="text-md font-semibold text-gray-900 mb-3">System Output</h4>
                ${
                    testCase.system_out
                        ? `
                    <div class="mb-4">
                        <h5 class="text-sm font-medium text-gray-700 mb-2">Standard Output</h5>
                        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                            ${this.escapeHtml(testCase.system_out)}
                        </div>
                    </div>
                `
                        : ''
                }
                ${
                    testCase.system_err
                        ? `
                    <div>
                        <h5 class="text-sm font-medium text-gray-700 mb-2">Standard Error</h5>
                        <div class="bg-red-900 text-red-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                            ${this.escapeHtml(testCase.system_err)}
                        </div>
                    </div>
                `
                        : ''
                }
            </div>
        `;
    }

    renderTestHistory(testCase) {
        return `
            <div class="mb-6">
                <h4 class="text-md font-semibold text-gray-900 mb-3">Test History</h4>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-sm text-blue-800">
                        ${
                            testCase.is_flaky
                                ? 'This test has been identified as flaky due to inconsistent pass/fail patterns.'
                                : 'This test appears to be stable based on historical results.'
                        }
                    </p>
                    ${
                        testCase.flaky_detected_at
                            ? `
                        <p class="text-xs text-blue-600 mt-2">
                            Flaky behavior detected: ${new Date(testCase.flaky_detected_at).toLocaleDateString()}
                        </p>
                    `
                            : ''
                    }
                </div>
            </div>
        `;
    }

    getStatusColorClass(status) {
        const colors = {
            passed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            error: 'bg-orange-100 text-orange-800',
            skipped: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize modal
window.testDetailsModal = new TestDetailsModal();
