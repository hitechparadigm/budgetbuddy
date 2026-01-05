#!/bin/bash

# Pre-commit Security Hook for BudgetBuddy
# This script runs before each commit to check for security issues

echo "🔒 Running pre-commit security checks..."

# Quick security scan for common issues
ISSUES_FOUND=0

# Check for JWT tokens in staged files
if git diff --cached --name-only | xargs grep -l "eyJ[A-Za-z0-9+/=]\{100,\}" 2>/dev/null | \
    grep -v "mockAuth.ts" | grep -v "\.test\." 2>/dev/null; then
    echo "❌ Real JWT tokens found in staged files!"
    ISSUES_FOUND=1
fi

# Check for log files being committed
if git diff --cached --name-only | grep -E "\.(log|txt)$" | \
    grep -E "(auth-logs|debug-)" 2>/dev/null; then
    echo "❌ Sensitive log files in staged changes!"
    ISSUES_FOUND=1
fi

# Check for hardcoded passwords in staged files
if git diff --cached --name-only | xargs grep -l "password.*['\"][A-Za-z0-9!@#$%^&*]\{8,\}['\"]" 2>/dev/null | \
    grep -v "validation" | grep -v "\.test\." 2>/dev/null; then
    echo "❌ Hardcoded passwords found in staged files!"
    ISSUES_FOUND=1
fi

if [ $ISSUES_FOUND -eq 1 ]; then
    echo ""
    echo "🚫 Commit blocked due to security issues."
    echo "Please fix the issues above and try again."
    echo "See SECURITY.md for guidelines."
    exit 1
fi

echo "✅ Pre-commit security checks passed"
exit 0
