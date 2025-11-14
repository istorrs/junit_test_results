# Git Hooks

This directory contains git hooks that enforce code quality before commits.

## Installation

After cloning the repository, run:

```bash
./scripts/setup-hooks.sh
```

This will install the hooks into `.git/hooks/`. The hooks are **not** automatically installed because `.git/` is not tracked by git.

## Hooks

### pre-commit

Runs before each commit and enforces:

**Frontend (client/):**
- TypeScript type checking (`npm run type-check`)
- Auto-installs dependencies if missing

**Backend (backend/):**
- ESLint linting (`npm run lint`)
- Auto-installs dependencies if missing

If any check fails, the commit is **blocked** until you fix the errors.

### post-merge

Runs after `git pull` or `git merge` to automatically reinstall hooks if they've been updated.

## Automatic Dependency Installation

If `node_modules` is missing in either `client/` or `backend/`, the hook will:
1. Attempt to run `npm install` automatically
2. If installation succeeds, continue with the checks
3. If installation fails, **block the commit** and show an error

**The hook will NEVER skip checks due to missing dependencies** - it will either install them or fail the commit.

## Manual Hook Updates

If hooks are updated in the repository:

```bash
./scripts/setup-hooks.sh
```

This will copy the latest hook versions to `.git/hooks/`.

## Bypassing Hooks (Not Recommended)

To bypass hooks in an emergency (e.g., urgent hotfix):

```bash
git commit --no-verify
```

**Warning:** This should only be used in exceptional circumstances. The hooks exist to prevent broken code from being committed.

## Troubleshooting

### Hook not running

Check if the hook is installed:

```bash
ls -la .git/hooks/pre-commit
```

If missing, run `./scripts/setup-hooks.sh`

### Permission denied

Make hooks executable:

```bash
chmod +x .git/hooks/*
```

### Dependencies won't install

Ensure npm is installed and working:

```bash
npm --version
```

Then manually install dependencies:

```bash
cd client && npm install
cd ../backend && npm install
```
