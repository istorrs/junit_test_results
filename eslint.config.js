import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    // Backend (Node.js) configuration
    {
        files: ['backend/**/*.js', 'src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node
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
            'no-console': 'off',
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
    },
    // Frontend (Browser) configuration
    {
        files: ['*.js'],
        ignores: ['backend/**/*.js', 'src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
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
                db: 'writable',
                print: 'readonly'
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
