// Shared Navigation Component
class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.mobileMenuActive = false;
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

    init() {
        this.renderNavigation();
        this.setupEventListeners();
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
                        <a href="reports.html" class="nav-link ${this.currentPage === 'reports' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Reports
                        </a>
                        <a href="data-management.html" class="nav-link ${this.currentPage === 'data' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium">
                            Data Management
                        </a>
                        <a href="debug-console.html" class="nav-link ${this.currentPage === 'debug' ? 'active text-gray-900' : 'text-gray-600 hover:text-gray-900'} font-medium text-sm opacity-60 hover:opacity-100" title="Debug Console">
                            🔧
                        </a>

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
                    <a href="reports.html" class="${this.currentPage === 'reports' ? 'active' : ''}">Reports</a>
                    <a href="data-management.html" class="${this.currentPage === 'data' ? 'active' : ''}">Data Management</a>
                    <a href="debug-console.html" class="${this.currentPage === 'debug' ? 'active' : ''}">🔧 Debug Console</a>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
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
