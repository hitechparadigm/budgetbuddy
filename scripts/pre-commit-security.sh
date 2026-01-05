#!/bin/bash

# Pre-commit Security Validation Script
# This script runs comprehensive security checks before allowing commits

set -e

echo "🔒 Pre-commit Security Validation"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any security issues are found
SECURITY_ISSUES=0

# Function to report security issue
report_issue() {
    echo -e "${RED}❌ SECURITY ISSUE: $1${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
}

# Function to report warning
report_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Function to report success
report_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo ""
echo "1. Checking staged files for secrets..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    echo "No staged files to check"
else
    # Check staged files for secrets
    for file in $STAGED_FILES; do
        if [ -f "$file" ]; then
            # Check for JWT tokens (exclude mock files)
            if echo "$file" | grep -v "mockAuth.ts" | grep -v "\.test\." | grep -v "\.md$" > /dev/null; then
                if grep -q "eyJ[A-Za-z0-9+/=]\{100,\}" "$file" 2>/dev/null; then
                    report_issue "Potential real JWT token found in $file"
                fi
            fi

            # Check for AWS credentials
            if grep -q "AKIA[0-9A-Z]\{16\}" "$file" 2>/dev/null; then
                report_issue "AWS access key found in $file"
            fi

            # Check for private keys
            if grep -q "BEGIN.*PRIVATE KEY" "$file" 2>/dev/null; then
                report_issue "Private key found in $file"
            fi

            # Check for hardcoded passwords (excluding test files)
            if echo "$file" | grep -v "\.test\." | grep -v "\.md$" | grep -v "validation.ts" > /dev/null; then
                if grep -q "password.*['\"][^'\"]*[A-Z][^'\"]*[0-9][^'\"]*[!@#$%^&*][^'\"]*['\"]" "$file" 2>/dev/null; then
                    report_issue "Hardcoded password found in $file"
                fi
            fi

            # Check for database connection strings with credentials
            if grep -q "mongodb://.*:.*@\|mysql://.*:.*@\|postgres://.*:.*@" "$file" 2>/dev/null; then
                if ! grep -q "localhost\|127.0.0.1\|example.com" "$file" 2>/dev/null; then
                    report_issue "Database connection string with credentials found in $file"
                fi
            fi
        fi
    done
fi

echo ""
echo "2. Checking for sensitive files..."

# Check if any log files are being committed
for file in $STAGED_FILES; do
    case "$file" in
        *.log|auth-logs.txt|debug-*.txt)
            report_issue "Attempting to commit sensitive log file: $file"
            ;;
        *.bak|*.backup|*~)
            report_issue "Attempting to commit backup file: $file"
            ;;
    esac
done

echo ""
echo "3. Validating mock authentication safety..."

# Check if mockAuth.ts is being modified
if echo "$STAGED_FILES" | grep -q "mockAuth.ts"; then
    if [ -f "packages/web-app/src/utils/mockAuth.ts" ]; then
        # Ensure mock tokens are clearly marked
        if grep "eyJ[A-Za-z0-9+/=]\{50,\}" packages/web-app/src/utils/mockAuth.ts | grep -v "MOCK\|TEST\|DEVELOPMENT" > /dev/null 2>&1; then
            report_issue "Mock tokens in mockAuth.ts should contain obvious mock identifiers"
        else
            report_success "Mock tokens are properly marked"
        fi
    fi
fi

echo ""
echo "4. Checking environment variable usage..."

# Check staged JavaScript/TypeScript files for proper env var usage
for file in $STAGED_FILES; do
    if [[ "$file" == *.js || "$file" == *.ts ]] && [ -f "$file" ]; then
        # Skip test files and mock files
        if echo "$file" | grep -v "\.test\." | grep -v "mock" | grep -v "\.d\.ts$" > /dev/null; then
            # Check for hardcoded credentials that should use env vars
            if grep -q "password.*:" "$file" 2>/dev/null; then
                if ! grep -q "process.env\|CHANGE_ME_IN_ENV" "$file" 2>/dev/null; then
                    report_warning "File $file contains password references - ensure they use environment variables"
                fi
            fi
        fi
    fi
done

echo ""
echo "5. Running dependency audit..."

# Run npm audit for high/critical vulnerabilities
if command -v npm &> /dev/null; then
    if ! npm audit --audit-level=high --silent; then
        report_issue "npm audit found high or critical vulnerabilities"
    else
        report_success "No high/critical vulnerabilities found"
    fi
else
    report_warning "npm not available - skipping dependency audit"
fi

echo ""
echo "6. Validating security configuration files..."

# Check if .gitignore has required security entries
if echo "$STAGED_FILES" | grep -q "\.gitignore"; then
    required_entries=("auth-logs.txt" "*.log" "logs/" "debug-*.txt")

    for entry in "${required_entries[@]}"; do
        if ! grep -q "^$entry" .gitignore 2>/dev/null; then
            report_issue "Missing required .gitignore entry: $entry"
        fi
    done
fi

echo ""
echo "7. Checking for development tool safety..."

# Check if DevHelper or development tools are being modified
if echo "$STAGED_FILES" | grep -q "DevHelper\|dev.*Helper\|development.*tool"; then
    for file in $STAGED_FILES; do
        if [[ "$file" == *"DevHelper"* ]] && [ -f "$file" ]; then
            # Ensure DevHelper has production exclusion logic
            if ! grep -q "import.meta.env.DEV\|process.env.NODE_ENV.*production" "$file" 2>/dev/null; then
                report_warning "DevHelper file $file should have production exclusion logic"
            fi
        fi
    done
fi

echo ""
echo "================================="
echo "Pre-commit Security Summary"
echo "================================="

if [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 All pre-commit security checks passed! Commit allowed.${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $SECURITY_ISSUES security issue(s). Commit blocked.${NC}"
    echo ""
    echo "Please fix the security issues above before committing."
    echo "For help with security issues, see SECURITY.md"
    echo ""
    echo "To bypass these checks (NOT RECOMMENDED), use: git commit --no-verify"
    exit 1
fi
