// Theme Management System
class ThemeManager {
    constructor() {
        this.theme = this.getInitialTheme();
        this.init();
    }

    getInitialTheme() {
        // Check localStorage first
        const saved = localStorage.getItem('junit-theme');
        if (saved && (saved === 'dark' || saved === 'light')) {
            return saved;
        }

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    init() {
        // Apply initial theme
        this.applyTheme(this.theme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem('junit-theme')) {
                    this.setTheme(e.matches ? 'dark' : 'light', false);
                }
            });
        }
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Update any theme toggle buttons
        this.updateThemeToggles();
    }

    setTheme(theme, savePreference = true) {
        this.theme = theme;
        this.applyTheme(theme);

        if (savePreference) {
            localStorage.setItem('junit-theme', theme);
        }
    }

    toggleTheme() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    updateThemeToggles() {
        const toggles = document.querySelectorAll('[data-theme-toggle]');
        toggles.forEach(toggle => {
            const icon = toggle.querySelector('[data-theme-icon]');
            if (icon) {
                if (this.theme === 'dark') {
                    icon.innerHTML = `
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    `;
                    toggle.setAttribute('title', 'Switch to light mode');
                } else {
                    icon.innerHTML = `
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    `;
                    toggle.setAttribute('title', 'Switch to dark mode');
                }
            }
        });
    }

    getCurrentTheme() {
        return this.theme;
    }
}

// Initialize theme manager
window.themeManager = new ThemeManager();
