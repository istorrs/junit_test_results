# Git Hooks

This directory contains git hooks for the project.

## Pre-commit Hook

The pre-commit hook prevents committing TypeScript code with compilation errors.

### Installation

To install the pre-commit hook, run:

```bash
cp hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Or use this one-liner:

```bash
cp hooks/pre-commit .git/hooks/ && chmod +x .git/hooks/pre-commit
```

### What it does

- **TypeScript Type Checking**: When you commit changes to the `client/` directory, the hook automatically runs TypeScript type checking
- **Prevents broken commits**: If TypeScript compilation errors are detected, the commit is blocked
- **Graceful handling**: If `node_modules` is not installed, it warns but allows the commit

### Requirements

For the TypeScript check to work:
- Navigate to the `client/` directory
- Run `npm install` to install dependencies

### Testing the hook

After installation, try committing a TypeScript file with errors to verify the hook is working.

### Bypassing the hook (NOT recommended)

If you absolutely need to commit without running the hook:

```bash
git commit --no-verify -m "your message"
```

**Note**: This should only be used in exceptional circumstances.
