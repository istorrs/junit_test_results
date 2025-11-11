// Data Management Page Logic
class DataManagement {
    constructor() {
        this.db = new JUnitAPIClient();
        this.currentPage = 1;
        this.perPage = 25;
        this.totalRuns = 0;
        this.allRuns = [];
        this.filteredRuns = [];
        this.searchTerm = '';
        this.sortBy = 'date-desc';
        this.deleteRunId = null;
        this.init();
    }

    async init() {
        await this.loadUploads();
        this.setupEventListeners();

        // Listen for project filter changes
        window.addEventListener('projectFilterChanged', async () => {
            await this.loadUploads();
        });
    }

    setupEventListeners() {
        // Upload zone
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('file-input');

        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => fileInput.click());

            uploadZone.addEventListener('dragover', e => {
                e.preventDefault();
                uploadZone.classList.add('drag-over');
            });

            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('drag-over');
            });

            uploadZone.addEventListener('drop', e => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xml'));
                if (files.length > 0) {
                    this.uploadFiles(files);
                }
            });

            fileInput.addEventListener('change', e => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    this.uploadFiles(files);
                }
                fileInput.value = '';
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-uploads');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadUploads());
        }

        // Search
        const searchInput = document.getElementById('search-uploads');
        if (searchInput) {
            searchInput.addEventListener('input', e => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndRenderUploads();
            });
        }

        // Sort
        const sortSelect = document.getElementById('sort-uploads');
        if (sortSelect) {
            sortSelect.addEventListener('change', e => {
                this.sortBy = e.target.value;
                this.filterAndRenderUploads();
            });
        }

        // Per page
        const perPageSelect = document.getElementById('per-page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', e => {
                this.perPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.filterAndRenderUploads();
            });
        }

        // Delete modal
        const cancelDelete = document.getElementById('cancel-delete');
        const confirmDelete = document.getElementById('confirm-delete');

        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => this.hideDeleteModal());
        }

        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.confirmDelete());
        }
    }

    async loadUploads() {
        try {
            // Get selected project from navigation
            const selectedProject = window.navigationManager?.getSelectedProject();
            const filters = { limit: window.limitsConfig.get('dataManagementRuns') };

            // Filter by project if one is selected
            if (selectedProject && selectedProject !== 'all') {
                filters.job_name = selectedProject;
            }

            this.allRuns = await this.db.getTestRuns(filters);
            this.totalRuns = this.allRuns.length;
            this.filterAndRenderUploads();
        } catch (error) {
            logError('Failed to load uploads', error);
            this.showNotification('Failed to load test runs', 'error');
        }
    }

    getRunDisplayName(run) {
        // Display format: "JOB_NAME #BUILD_NUMBER" or just run name
        if (run.ci_metadata?.job_name && run.ci_metadata?.build_number) {
            return `${run.ci_metadata.job_name} #${run.ci_metadata.build_number}`;
        }
        return run.name;
    }

    filterAndRenderUploads() {
        // Filter
        this.filteredRuns = this.allRuns.filter(run => {
            if (!this.searchTerm) {
                return true;
            }
            const displayName = this.getRunDisplayName(run);
            return displayName.toLowerCase().includes(this.searchTerm);
        });

        // Sort
        this.filteredRuns.sort((a, b) => {
            switch (this.sortBy) {
                case 'date-desc':
                    return new Date(b.timestamp) - new Date(a.timestamp);
                case 'date-asc':
                    return new Date(a.timestamp) - new Date(b.timestamp);
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'tests-desc':
                    return b.total_tests - a.total_tests;
                default:
                    return 0;
            }
        });

        this.renderUploads();
        this.renderPagination();
    }

    renderUploads() {
        const container = document.getElementById('uploads-list');
        if (!container) {
            return;
        }

        const start = (this.currentPage - 1) * this.perPage;
        const end = start + this.perPage;
        const pageRuns = this.filteredRuns.slice(start, end);

        if (pageRuns.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">No test runs found</h3>
                    <p class="mt-1 text-sm text-gray-500">Upload some JUnit XML files to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pageRuns
            .map(
                run => `
            <div class="data-card rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-3">
                            <h3 class="text-lg font-semibold text-gray-900 truncate">
                                ${this.escapeHtml(this.getRunDisplayName(run))}
                            </h3>
                            ${this.getStatusBadge(run)}
                        </div>
                        <p class="text-sm text-gray-500 mt-1">
                            <span class="code-font">${new Date(run.timestamp || run.created_at).toLocaleString()}</span>
                        </p>

                        <div class="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                                <p class="text-xs text-gray-500">Total Tests</p>
                                <p class="text-lg font-semibold text-gray-900">${run.total_tests || 0}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Passed</p>
                                <p class="text-lg font-semibold text-green-600">${(run.total_tests || 0) - (run.total_failures || 0) - (run.total_errors || 0) - (run.total_skipped || 0)}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Failed</p>
                                <p class="text-lg font-semibold text-red-600">${run.total_failures || 0}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Errors</p>
                                <p class="text-lg font-semibold text-orange-600">${run.total_errors || 0}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Duration</p>
                                <p class="text-lg font-semibold text-blue-600 code-font">${(run.time || 0).toFixed(2)}s</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col space-y-2 ml-4">
                        <a
                            href="details.html?run=${run.id}"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                        >
                            View Details
                        </a>
                        <button
                            onclick="dataManagement.showDeleteModal('${run.id}', '${this.escapeHtml(this.getRunDisplayName(run))}', '${run.timestamp || run.created_at}')"
                            class="delete-button px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `
            )
            .join('');
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredRuns.length / this.perPage);
        const start = (this.currentPage - 1) * this.perPage + 1;
        const end = Math.min(this.currentPage * this.perPage, this.filteredRuns.length);

        document.getElementById('showing-start').textContent =
            this.filteredRuns.length > 0 ? start : 0;
        document.getElementById('showing-end').textContent = end;
        document.getElementById('total-runs').textContent = this.filteredRuns.length;

        const buttonsContainer = document.getElementById('pagination-buttons');
        if (!buttonsContainer) {
            return;
        }

        if (totalPages <= 1) {
            buttonsContainer.innerHTML = '';
            return;
        }

        let buttons = '';

        // Previous button
        buttons += `
            <button
                onclick="dataManagement.goToPage(${this.currentPage - 1})"
                ${this.currentPage === 1 ? 'disabled' : ''}
                class="px-3 py-1 rounded-lg border border-gray-300 ${this.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}"
            >
                Previous
            </button>
        `;

        // Page numbers
        const maxButtons = 5;
        const startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(totalPages, startPage + maxButtons - 1);

        for (let i = startPage; i <= endPage; i++) {
            buttons += `
                <button
                    onclick="dataManagement.goToPage(${i})"
                    class="px-3 py-1 rounded-lg border ${i === this.currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}"
                >
                    ${i}
                </button>
            `;
        }

        // Next button
        buttons += `
            <button
                onclick="dataManagement.goToPage(${this.currentPage + 1})"
                ${this.currentPage === totalPages ? 'disabled' : ''}
                class="px-3 py-1 rounded-lg border border-gray-300 ${this.currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}"
            >
                Next
            </button>
        `;

        buttonsContainer.innerHTML = buttons;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredRuns.length / this.perPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderUploads();
            this.renderPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    async uploadFiles(files) {
        const progressContainer = document.getElementById('upload-progress');
        const progressList = document.getElementById('upload-progress-list');

        if (!progressContainer || !progressList) {
            return;
        }

        progressContainer.classList.remove('hidden');
        progressList.innerHTML = '';

        const uploadPromises = files.map(async file => {
            const progressId = `progress-${Date.now()}-${Math.random()}`;
            const progressHtml = `
                <div id="${progressId}" class="flex items-center space-x-3">
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">${this.escapeHtml(file.name)}</p>
                        <div class="mt-1 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="text-sm text-gray-500">Uploading...</div>
                </div>
            `;
            progressList.insertAdjacentHTML('beforeend', progressHtml);

            try {
                const content = await this.readFile(file);
                await this.db.parseAndStoreJUnitXML(content, file.name);

                const progressEl = document.getElementById(progressId);
                if (progressEl) {
                    progressEl.querySelector('.bg-blue-600').style.width = '100%';
                    progressEl.querySelector('.text-gray-500').textContent = 'Complete';
                    progressEl.querySelector('.text-gray-500').classList.add('text-green-600');
                }

                return { success: true, file: file.name };
            } catch (error) {
                const progressEl = document.getElementById(progressId);
                if (progressEl) {
                    progressEl.querySelector('.text-gray-500').textContent = 'Failed';
                    progressEl.querySelector('.text-gray-500').classList.add('text-red-600');
                }
                return { success: false, file: file.name, error };
            }
        });

        const results = await Promise.all(uploadPromises);

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        if (successCount > 0) {
            this.showNotification(
                `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`,
                'success'
            );
            await this.loadUploads();
        }

        if (failCount > 0) {
            this.showNotification(
                `Failed to upload ${failCount} file${failCount > 1 ? 's' : ''}`,
                'error'
            );
        }

        setTimeout(() => {
            progressContainer.classList.add('hidden');
        }, 3000);
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    showDeleteModal(runId, runName, runDate) {
        this.deleteRunId = runId;
        const modal = document.getElementById('delete-modal');
        const nameEl = document.getElementById('delete-run-name');
        const dateEl = document.getElementById('delete-run-date');

        if (modal && nameEl && dateEl) {
            nameEl.textContent = runName;
            dateEl.textContent = new Date(runDate).toLocaleString();
            modal.classList.remove('hidden');
        }
    }

    hideDeleteModal() {
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.deleteRunId = null;
    }

    async confirmDelete() {
        if (!this.deleteRunId) {
            console.warn('confirmDelete called but no deleteRunId set');
            return;
        }

        console.log('Starting delete for run ID:', this.deleteRunId);

        // Disable the buttons while deleting
        const confirmBtn = document.getElementById('confirm-delete');
        const cancelBtn = document.getElementById('cancel-delete');

        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';
        }
        if (cancelBtn) {
            cancelBtn.disabled = true;
        }

        try {
            console.log('Calling API to delete test run...');
            const result = await this.db.deleteTestRun(this.deleteRunId);
            console.log('Delete API response:', result);

            this.showNotification('Test run deleted successfully', 'success');
            this.hideDeleteModal();

            console.log('Reloading uploads list...');
            await this.loadUploads();
            console.log('Upload list reloaded');
        } catch (error) {
            logError('Failed to delete test run', error);

            this.showNotification(`Failed to delete test run: ${error.message}`, 'error');

            // Re-enable buttons on error
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Delete';
            }
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }

            // Don't hide modal on error so user can try again
        }
    }

    getStatusBadge(run) {
        const total = run.total_tests || 0;
        const failures = (run.total_failures || 0) + (run.total_errors || 0);
        const passed = total - failures - (run.total_skipped || 0);
        const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        let badgeClass = 'bg-green-100 text-green-800';
        if (successRate < 80) {
            badgeClass = 'bg-red-100 text-red-800';
        } else if (successRate < 100) {
            badgeClass = 'bg-yellow-100 text-yellow-800';
        }

        return `
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                ${successRate}% Pass
            </span>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const statusContainer = document.getElementById('upload-status');
        if (!statusContainer) {
            return;
        }

        const bgColor =
            type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

        statusContainer.innerHTML = `
            <div class="${bgColor} text-white px-6 py-4 rounded-lg shadow-lg">
                ${this.escapeHtml(message)}
            </div>
        `;
        statusContainer.classList.remove('hidden');

        setTimeout(() => {
            statusContainer.classList.add('hidden');
        }, 5000);
    }
}

// Initialize data management page
document.addEventListener('DOMContentLoaded', () => {
    window.dataManagement = new DataManagement();
});
