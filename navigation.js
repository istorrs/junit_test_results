// Shared Navigation Component
class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.mobileMenuActive = false;
        this.selectedProject = localStorage.getItem('selectedProject') || 'all';
        this.projects = [];
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
            return 'dashboard';
        }
        if (path.includes('details.html')) {
            return 'details';
        }
        if (path.includes('flaky-tests.html')) {
            return 'flaky';
        }
        if (path.includes('performance-analysis.html')) {
            return 'performance';
        }
        if (path.includes('compare-runs.html')) {
            return 'compare';
        }
        if (path.includes('test-case-history.html')) {
            return 'history';
        }
        if (path.includes('reports.html')) {
            return 'reports';
        }
        if (path.includes('data-management.html')) {
            return 'data';
        }
        if (path.includes('debug-trace.html') || path.includes('debug-console.html')) {
            return 'debug';
        }
        return 'dashboard';
    }

    async init() {
        this.renderNavigation();
        await this.loadProjects();
        this.setupEventListeners();
    }

    async loadProjects() {
        try {
            const apiClient = new JUnitAPIClient();
            const response = await apiClient.request('/runs/projects');
            this.projects = response.data.projects || [];
            this.populateProjectFilter();
        } catch (error) {
            console.error('Failed to load projects:', error);
            // Don't show error - projects filter is optional
        }
    }

    populateProjectFilter() {
        const projectFilter = document.getElementById('project-filter');
        if (!projectFilter) return;

        // Clear and rebuild options
        projectFilter.innerHTML = '<option value="all">All Projects</option>';

        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            if (project === this.selectedProject) {
                option.selected = true;
            }
            projectFilter.appendChild(option);
        });
    }

    handleProjectChange(event) {
        this.selectedProject = event.target.value;

        // Save to localStorage
        if (this.selectedProject === 'all') {
            localStorage.removeItem('selectedProject');
        } else {
            localStorage.setItem('selectedProject', this.selectedProject);
        }

        // Trigger custom event for pages to listen to
        window.dispatchEvent(new CustomEvent('projectFilterChanged', {
            detail: { project: this.selectedProject }
        }));

        // Show notification
        const projectName = this.selectedProject === 'all' ? 'All Projects' : this.selectedProject;
        this.showNotification(`Filtered to: ${projectName}`);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 p-3 rounded-lg shadow-lg z-50 bg-blue-500 text-white text-sm';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    getSelectedProject() {
        return this.selectedProject;
    }

    renderNavigation() {
        const navContainer = document.querySelector('nav');
        if (!navContainer) {
            return;
        }

        navContainer.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <!-- Logo -->
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <h1 class="text-xl font-bold text-gray-900">JUnit Dashboard</h1>
                        </div>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden md:flex items-center space-x-6 desktop-nav">
                        <a href="index.html" class="nav-link ${this.currentPage === 'dashboard' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Dashboard
                        </a>
                        <a href="details.html" class="nav-link ${this.currentPage === 'details' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Details
                        </a>
                        <a href="flaky-tests.html" class="nav-link ${this.currentPage === 'flaky' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Flaky Tests
                        </a>
                        <a href="performance-analysis.html" class="nav-link ${this.currentPage === 'performance' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Performance
                        </a>
                        <a href="compare-runs.html" class="nav-link ${this.currentPage === 'compare' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Compare Runs
                        </a>
                        <a href="reports.html" class="nav-link ${this.currentPage === 'reports' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Reports
                        </a>
                        <a href="data-management.html" class="nav-link ${this.currentPage === 'data' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Data Management
                        </a>
                        <a href="debug-console.html" class="nav-link ${this.currentPage === 'debug' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium text-sm opacity-60 hover:opacity-100" title="Debug Console">
                            🔧
                        </a>

                        <!-- Project Filter -->
                        <div class="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                            </svg>
                            <select id="project-filter" class="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 pr-8">
                                <option value="all">All Projects</option>
                            </select>
                        </div>

                        <!-- Search Button -->
                        <button onclick="window.globalSearch?.open()" class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium flex items-center" title="Global Search">
                            <svg class="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            <span class="hidden lg:inline">Search</span> <kbd class="ml-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hidden lg:inline">Ctrl+/</kbd>
                        </button>

                        <!-- Theme Toggle -->
                        <button data-theme-toggle class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Toggle theme">
                            <span data-theme-icon>
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            </span>
                        </button>
                    </div>

                    <!-- Mobile Menu Button -->
                    <div class="md:hidden flex items-center space-x-2">
                        <!-- Theme Toggle (Mobile) -->
                        <button data-theme-toggle class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Toggle theme">
                            <span data-theme-icon>
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            </span>
                        </button>

                        <!-- Hamburger Menu -->
                        <button id="mobile-menu-button" class="hamburger">
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>
                </div>

                <!-- Mobile Menu -->
                <div id="mobile-menu" class="mobile-menu">
                    <a href="index.html" class="${this.currentPage === 'dashboard' ? 'active' : ''}">Dashboard</a>
                    <a href="details.html" class="${this.currentPage === 'details' ? 'active' : ''}">Details</a>
                    <a href="flaky-tests.html" class="${this.currentPage === 'flaky' ? 'active' : ''}">Flaky Tests</a>
                    <a href="performance-analysis.html" class="${this.currentPage === 'performance' ? 'active' : ''}">Performance</a>
                    <a href="compare-runs.html" class="${this.currentPage === 'compare' ? 'active' : ''}">Compare Runs</a>
                    <a href="reports.html" class="${this.currentPage === 'reports' ? 'active' : ''}">Reports</a>
                    <a href="data-management.html" class="${this.currentPage === 'data' ? 'active' : ''}">Data Management</a>
                    <a href="debug-console.html" class="${this.currentPage === 'debug' ? 'active' : ''}">🔧 Debug Console</a>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Project filter
        const projectFilter = document.getElementById('project-filter');
        if (projectFilter) {
            projectFilter.addEventListener('change', this.handleProjectChange.bind(this));
        }

        // Mobile menu toggle
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            // Close menu when clicking a link
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMobileMenu();
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', e => {
                if (
                    this.mobileMenuActive &&
                    !mobileMenu.contains(e.target) &&
                    !mobileMenuButton.contains(e.target)
                ) {
                    this.closeMobileMenu();
                }
            });
        }

        // Theme toggle buttons
        const themeToggles = document.querySelectorAll('[data-theme-toggle]');
        themeToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                if (window.themeManager) {
                    window.themeManager.toggleTheme();
                }
            });
        });
    }

    toggleMobileMenu() {
        this.mobileMenuActive = !this.mobileMenuActive;
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuButton = document.getElementById('mobile-menu-button');

        if (mobileMenu && mobileMenuButton) {
            if (this.mobileMenuActive) {
                mobileMenu.classList.add('active');
                mobileMenuButton.classList.add('active');
            } else {
                mobileMenu.classList.remove('active');
                mobileMenuButton.classList.remove('active');
            }
        }
    }

    closeMobileMenu() {
        this.mobileMenuActive = false;
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuButton = document.getElementById('mobile-menu-button');

        if (mobileMenu && mobileMenuButton) {
            mobileMenu.classList.remove('active');
            mobileMenuButton.classList.remove('active');
        }
    }
}

// Initialize navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});
