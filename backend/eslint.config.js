module.exports = [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                // Node.js globals
                __dirname: 'readonly',
                __filename: 'readonly',
                Buffer: 'readonly',
                console: 'readonly',
                exports: 'writable',
                global: 'readonly',
                module: 'readonly',
                process: 'readonly',
                require: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                setImmediate: 'readonly',
                clearImmediate: 'readonly'
            }
        },
        rules: {
            // Possible errors
            'no-console': 'off', // We use console for logging
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'error',

            // Best practices
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'error',

            // Style
            'indent': ['error', 4, { SwitchCase: 1 }],
            'quotes': ['error', 'single', { avoidEscape: true }],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'never']
        },
        ignores: ['node_modules/**', 'dist/**', 'coverage/**']
    }
];
