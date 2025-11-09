import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                alert: 'readonly',
                fetch: 'readonly',
                FormData: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                FileReader: 'readonly',
                IntersectionObserver: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                clearTimeout: 'readonly',
                // Libraries
                echarts: 'readonly',
                anime: 'readonly',
                Typed: 'readonly',
                Splitting: 'readonly',
                Prism: 'readonly',
                JUNIT_API_URL: 'readonly',
                // Our globals
                JUnitDatabase: 'writable',
                JUnitAPIClient: 'writable',
                InsightsPanel: 'writable',
                dashboard: 'writable',
                detailsPage: 'writable',
                historyPage: 'writable',
                flakyTestsPage: 'writable',
                reportsPage: 'writable',
                testDetailsModal: 'writable',
                dashboardDebugger: 'writable',
                navigator: 'readonly',
                screen: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }
            ],
            'no-console': 'off', // Allow console for debugging
            'no-undef': 'error',
            'no-redeclare': 'error',
            'no-constant-condition': 'error',
            'no-unreachable': 'error',
            'no-duplicate-case': 'error',
            'no-empty': 'warn',
            'no-extra-semi': 'error',
            curly: ['error', 'all'],
            eqeqeq: ['error', 'always'],
            'prefer-const': 'error',
            'no-var': 'error'
        }
    }
];
