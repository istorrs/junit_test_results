// Global Search Component
class GlobalSearch {
    constructor() {
        this.modal = null;
        this.searchInput = null;
        this.resultsContainer = null;
        this.db = null;
        this.searchTimeout = null;
        this.allTests = [];
        this.selectedIndex = 0;
        this.createSearchModal();
        this.setupKeyboardShortcut();
    }

    createSearchModal() {
        const modalHTML = `
            <div id="global-search-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div class="flex items-start justify-center min-h-screen pt-20 px-4">
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full">
                        <!-- Search Input -->
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                                <input
                                    id="global-search-input"
                                    type="text"
                                    placeholder="Search tests by name or class..."
                                    class="flex-1 outline-none text-lg bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                                    autocomplete="off"
                                />
                                <kbd class="ml-3 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                    ESC
                                </kbd>
                            </div>
                        </div>

                        <!-- Search Results -->
                        <div id="search-results" class="max-h-96 overflow-y-auto">
                            <!-- Results will be populated here -->
                        </div>

                        <!-- Search Footer -->
                        <div class="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
                            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <div class="flex items-center space-x-4">
                                    <span class="flex items-center">
                                        <kbd class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded mr-1">↑↓</kbd>
                                        Navigate
                                    </span>
                                    <span class="flex items-center">
                                        <kbd class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded mr-1">Enter</kbd>
                                        Select
                                    </span>
                                </div>
                                <span id="search-results-count">0 results</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        this.modal = document.getElementById('global-search-modal');
        this.searchInput = document.getElementById('global-search-input');
        this.resultsContainer = document.getElementById('search-results');

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Search input listener
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.performSearch(), 300);
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.moveSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.moveSelection(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.selectResult();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        });
    }

    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+/ or Cmd+/ to open search
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.open();
            }
            // Escape to close
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    async open() {
        if (!this.db && window.testResultsDB) {
            this.db = window.testResultsDB;
        }

        this.modal.classList.remove('hidden');
        this.searchInput.focus();
        this.searchInput.value = '';
        this.selectedIndex = 0;

        // Load initial results
        await this.loadRecentTests();
    }

    close() {
        this.modal.classList.add('hidden');
        this.searchInput.value = '';
        this.resultsContainer.innerHTML = '';
    }

    async loadRecentTests() {
        try {
            const response = await this.db.fetchWithAuth('/cases?limit=20');
            this.displayResults(response.data.cases || [], 'Recent Tests');
        } catch (error) {
            console.error('Error loading recent tests:', error);
            this.displayEmptyState();
        }
    }

    async performSearch() {
        const query = this.searchInput.value.trim();

        if (!query) {
            await this.loadRecentTests();
            return;
        }

        try {
            const response = await this.db.fetchWithAuth(`/cases?search=${encodeURIComponent(query)}&limit=50`);
            const results = response.data.cases || [];

            // Client-side filtering for better matching
            const filtered = results.filter(test =>
                test.name.toLowerCase().includes(query.toLowerCase()) ||
                test.classname.toLowerCase().includes(query.toLowerCase())
            );

            this.displayResults(filtered, `Search Results for "${query}"`);
        } catch (error) {
            console.error('Error searching tests:', error);
            this.displayEmptyState('Error performing search');
        }
    }

    displayResults(results, title) {
        this.selectedIndex = 0;

        if (results.length === 0) {
            this.displayEmptyState(`No tests found`);
            return;
        }

        document.getElementById('search-results-count').textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;

        const html = results.map((test, index) => `
            <div
                class="search-result-item px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 ${index === 0 ? 'bg-gray-50 dark:bg-gray-700' : ''}"
                data-index="${index}"
                data-test-name="${test.name}"
                data-test-class="${test.classname}"
            >
                <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-900 dark:text-white truncate">${this.highlightMatch(test.name, this.searchInput.value)}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400 code-font truncate">${this.highlightMatch(test.classname, this.searchInput.value)}</div>
                    </div>
                    <div class="ml-4 flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColorClass(test.status)}">
                            ${test.status.toUpperCase()}
                        </span>
                        ${test.is_flaky ? '<span class="text-yellow-500" title="Flaky">⚠️</span>' : ''}
                        <span class="text-xs text-gray-500 dark:text-gray-400">${test.time.toFixed(2)}s</span>
                    </div>
                </div>
            </div>
        `).join('');

        this.resultsContainer.innerHTML = html;

        // Add click handlers
        document.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectedIndex = index;
                this.selectResult();
            });
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });
        });
    }

    displayEmptyState(message = 'No results found') {
        document.getElementById('search-results-count').textContent = '0 results';
        this.resultsContainer.innerHTML = `
            <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="mt-4 text-gray-500 dark:text-gray-400">${message}</p>
            </div>
        `;
    }

    moveSelection(direction) {
        const items = document.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        this.selectedIndex += direction;

        if (this.selectedIndex < 0) {
            this.selectedIndex = items.length - 1;
        } else if (this.selectedIndex >= items.length) {
            this.selectedIndex = 0;
        }

        this.updateSelection();

        // Scroll into view
        items[this.selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    updateSelection() {
        const items = document.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('bg-gray-50', 'dark:bg-gray-700');
            } else {
                item.classList.remove('bg-gray-50', 'dark:bg-gray-700');
            }
        });
    }

    selectResult() {
        const items = document.querySelectorAll('.search-result-item');
        if (items.length === 0 || !items[this.selectedIndex]) return;

        const selectedItem = items[this.selectedIndex];
        const testName = selectedItem.getAttribute('data-test-name');
        const testClass = selectedItem.getAttribute('data-test-class');

        // Navigate to test history page
        window.location.href = `test-case-history.html?name=${encodeURIComponent(testName)}&classname=${encodeURIComponent(testClass)}`;
        this.close();
    }

    highlightMatch(text, query) {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>');
    }

    getStatusColorClass(status) {
        const colors = {
            passed: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
            failed: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
            error: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
            skipped: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        };
        return colors[status] || colors.skipped;
    }
}

// Initialize global search
document.addEventListener('DOMContentLoaded', () => {
    window.globalSearch = new GlobalSearch();
});
