// client/eslint.config.js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
  // ── Base JS ─────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript recommended rules (only for .ts/.tsx) ─────
  ...ts.configs.recommended.map(config => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // ── Shared parser / globals / custom rules ───────────────
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        __GIT_BRANCH__: 'readonly',
        __GIT_COMMIT__: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': ts.plugin,
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // ── Vue base config ─────────────────────────────────────
  ...vue.configs['flat/recommended'],

  // ── Vue + TypeScript (use vue-eslint-parser) ─────────────
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
    },
  },

  // ── Prettier (must be last) ─────────────────────────────
  prettierRecommended,

  // ── Global ignores (including the config itself) ───────
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '**/*.d.ts',
      'eslint.config.js',   // ← prevents ESLint from fixing itself
    ],
  },
];
