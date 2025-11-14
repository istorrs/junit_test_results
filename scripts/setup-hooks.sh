#!/bin/bash
#
# Setup script to install git hooks
# Run this after cloning the repository or when hooks are updated
#

echo "🔧 Setting up git hooks..."
echo ""

# Get the git root directory
GIT_ROOT=$(git rev-parse --show-toplevel)

if [ -z "$GIT_ROOT" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

cd "$GIT_ROOT" || exit 1

# Copy pre-commit hook
if [ -f "hooks/pre-commit" ]; then
    cp hooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ pre-commit hook installed"
else
    echo "⚠️  Warning: hooks/pre-commit not found"
fi

# Copy post-merge hook
if [ -f "hooks/post-merge" ]; then
    cp hooks/post-merge .git/hooks/post-merge
    chmod +x .git/hooks/post-merge
    echo "✅ post-merge hook installed"
else
    echo "⚠️  Warning: hooks/post-merge not found"
fi

echo ""
echo "✅ Git hooks setup complete!"
echo ""
echo "ℹ️  The hooks will now run automatically:"
echo "   - Before each commit: TypeScript type-check and ESLint"
echo "   - After each merge/pull: Hooks will be reinstalled"
echo ""
echo "ℹ️  If dependencies are missing, the hook will attempt to install them."
echo "   If installation fails, you must run 'npm install' manually."
echo ""
