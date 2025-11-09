// Test Details Modal Component
class TestDetailsModal {
    constructor() {
        this.modal = null;
        this.currentTestCase = null;
        this.createModal();
    }

    createModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="test-details-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
                        <!-- Modal Header -->
                        <div class="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">Test Case Details</h2>
                            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Modal Content -->
                        <div id="modal-content" class="p-6">
                            <!-- Content will be populated dynamically -->
                        </div>
                        
                        <!-- Modal Footer -->
                        <div class="flex items-center justify-end p-6 border-t border-gray-200">
                            <button id="close-modal-footer" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200">
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
        
        // Close on backdrop click
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (event) => {
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
            
            this.populateModal();
            this.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
        } catch (error) {
            console.error('Error showing test details:', error);
            alert('Error loading test details: ' + error.message);
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
                console.error('Test case not found or invalid response:', testCase);
                return null;
            }

            // The API returns the test case in the 'case' property
            const caseData = testCase.case;

            // Add detailed results (if available in the response) - wrap result in array for compatibility
            caseData.detailedResults = testCase.result ? [testCase.result] : [];

            return caseData;
        } catch (error) {
            console.error('Error fetching test case details:', error);
            throw error;
        }
    }

    populateModal() {
        const content = document.getElementById('modal-content');
        const testCase = this.currentTestCase;
        
        content.innerHTML = `
            <!-- Test Case Header -->
            <div class="mb-6">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">${testCase.name}</h3>
                        <p class="text-sm text-gray-600 mb-2">${testCase.classname}</p>
                        <div class="flex items-center space-x-2">
                            <span class="px-3 py-1 text-sm font-medium rounded-full ${this.getStatusColorClass(testCase.status)}">
                                ${testCase.status.toUpperCase()}
                            </span>
                            ${testCase.is_flaky ? '<span class="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">FLAKY</span>' : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-gray-900">${testCase.time.toFixed(3)}s</div>
                        <div class="text-sm text-gray-600">Execution Time</div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-sm text-gray-600">Assertions</div>
                        <div class="text-lg font-semibold text-gray-900">${testCase.assertions}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-sm text-gray-600">File</div>
                        <div class="text-sm font-medium text-gray-900 truncate">${testCase.file || 'N/A'}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-sm text-gray-600">Line</div>
                        <div class="text-lg font-semibold text-gray-900">${testCase.line || 'N/A'}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-sm text-gray-600">First Seen</div>
                        <div class="text-sm font-medium text-gray-900">${new Date(testCase.timestamp).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
            
            ${this.renderFailureDetails(testCase)}
            ${this.renderSystemOutput(testCase)}
            ${this.renderTestHistory(testCase)}
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
                    ${message ? `
                        <div class="mb-3">
                            <span class="text-sm font-medium text-red-800">Message:</span>
                            <div class="mt-2 p-3 bg-white border border-red-200 rounded text-sm text-red-700">
                                ${this.escapeHtml(message)}
                            </div>
                        </div>
                    ` : ''}
                    ${stackTrace ? `
                        <div>
                            <span class="text-sm font-medium text-red-800">Stack Trace:</span>
                            <div class="mt-2 p-4 bg-gray-900 text-gray-100 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                                ${this.escapeHtml(stackTrace)}
                            </div>
                        </div>
                    ` : ''}
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
                ${testCase.system_out ? `
                    <div class="mb-4">
                        <h5 class="text-sm font-medium text-gray-700 mb-2">Standard Output</h5>
                        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                            ${this.escapeHtml(testCase.system_out)}
                        </div>
                    </div>
                ` : ''}
                ${testCase.system_err ? `
                    <div>
                        <h5 class="text-sm font-medium text-gray-700 mb-2">Standard Error</h5>
                        <div class="bg-red-900 text-red-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                            ${this.escapeHtml(testCase.system_err)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderTestHistory(testCase) {
        return `
            <div class="mb-6">
                <h4 class="text-md font-semibold text-gray-900 mb-3">Test History</h4>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-sm text-blue-800">
                        ${testCase.is_flaky ? 
                            'This test has been identified as flaky due to inconsistent pass/fail patterns.' : 
                            'This test appears to be stable based on historical results.'}
                    </p>
                    ${testCase.flaky_detected_at ? `
                        <p class="text-xs text-blue-600 mt-2">
                            Flaky behavior detected: ${new Date(testCase.flaky_detected_at).toLocaleDateString()}
                        </p>
                    ` : ''}
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