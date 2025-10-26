#!/bin/bash

# Setup Git Hooks for BudgetBuddy Documentation
echo "🔧 Setting up Git hooks for documentation automation..."

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-push hook
cp .githooks/pre-push .git/hooks/pre-push

# Make hooks executable
chmod +x .git/hooks/pre-push
chmod +x .githooks/pre-push

echo "✅ Git hooks installed successfully!"
echo ""
echo "📋 What this does:"
echo "  - Checks documentation before every git push"
echo "  - Shows interactive checklist for documentation updates"
echo "  - Prevents pushes without documentation updates"
echo ""
echo "🚀 To test the hook:"
echo "  git push origin develop"
echo ""
echo "⚙️ To bypass the hook (emergency only):"
echo "  git push --no-verify origin develop"
