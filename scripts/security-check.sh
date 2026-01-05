#!/bin/bash

# Security Validation Script for BudgetBuddy
# This script performs comprehensive security checks before deployment

set -e

echo "🔒 BudgetBuddy Security Validation"
echo "=================================="

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
echo "1. Checking for exposed secrets..."

# Check for real JWT tokens (exclude mock files)
if grep -r "eyJ[A-Za-z0-9+/=]\{100,\}" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=coverage \
    --exclude-dir=.github \
    --exclude="*.md" \
    --exclude="mockAuth.ts" \
    --exclude="*.test.js" \
    --exclude="*.test.ts" \
    --exclude="security-check*.sh" \
    --exclude="security-check*.ps1" \
    --exclude="app.js" 2>/dev/null | \
    grep -v "sourceMappingURL=data:application/json;base64"; then
    report_issue "Real JWT tokens found in repository"
else
    report_success "No real JWT tokens detected"
fi

# Check for AWS credentials
if grep -r "AKIA[0-9A-Z_]\{16,\}" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=coverage \
    --exclude="*.test.js" \
    --exclude="*.test.ts" \
    --exclude="security-check*.sh" \
    --exclude="security-check*.ps1" 2>/dev/null | \
    grep -v "AKIA_OBVIOUSLY_FAKE\|AKIA_FAKE\|AKIA.*TEST.*KEY"; then
    report_issue "AWS access keys found in repository"
else
    report_success "No AWS credentials detected"
fi

# Check for private keys
if grep -r "BEGIN.*PRIVATE KEY" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=coverage \
    --exclude-dir=.github \
    --exclude="*.md" \
    --exclude="security-check*.sh" \
    --exclude="security-check*.ps1" \
    --exclude="pre-commit-security.sh" \
    --exclude="*.test.js" \
    --exclude="*.test.ts" \
    --exclude="CredentialProtectionService.ts" \
    --exclude="CHANGELOG.md" 2>/dev/null | \
    grep -v "pattern.*BEGIN\|Pattern.*BEGIN\|description.*Private key\|# Private key\|// Private key\|content.includes.*BEGIN"; then
    report_issue "Private keys found in repository"
else
    report_success "No private keys detected"
fi

# Check for hardcoded passwords (excluding validation patterns)
if grep -r "password.*['\"][^'\"]*[A-Z][^'\"]*[0-9][^'\"]*[!@#$%^&*][^'\"]*['\"]" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=coverage \
    --exclude="*.md" \
    --exclude="validation.ts" \
    --exclude="*.test.js" \
    --exclude="*.test.ts" 2>/dev/null; then
    report_issue "Hardcoded passwords found"
else
    report_success "No hardcoded passwords detected"
fi

echo ""
echo "2. Checking for sensitive files..."

# Check for log files
if find . -name "*.log" -o -name "auth-logs.txt" -o -name "debug-*.txt" | \
    grep -v node_modules | grep -v .git | grep -v coverage 2>/dev/null; then
    report_issue "Log files found that should not be committed"
else
    report_success "No sensitive log files found"
fi

# Check for backup files
if find . -name "*.bak" -o -name "*.backup" -o -name "*~" | \
    grep -v node_modules | grep -v .git 2>/dev/null; then
    report_issue "Backup files found that should not be committed"
else
    report_success "No backup files found"
fi

# Check for configuration files with potential secrets
if find . -name "*.conf" -o -name "*.config" -o -name ".env*" | \
    grep -v node_modules | grep -v .git | \
    xargs grep -l "password\|secret\|key" 2>/dev/null; then
    report_warning "Configuration files contain potential secrets - verify they use environment variables"
else
    report_success "No hardcoded secrets in configuration files"
fi

echo ""
echo "3. Validating environment variable usage..."

# Check scripts use environment variables for passwords
if find scripts/ -name "*.js" -exec grep -l "password.*:" {} \; 2>/dev/null | \
    xargs grep "password.*:" | \
    grep -v "process.env" | \
    grep -v "CHANGE_ME_IN_ENV" 2>/dev/null; then
    report_issue "Scripts contain hardcoded passwords instead of environment variables"
else
    report_success "Scripts properly use environment variables"
fi

echo ""
echo "4. Validating mock token safety..."

# Check mock tokens are clearly marked
if [ -f "packages/web-app/src/utils/mockAuth.ts" ]; then
    if grep "eyJ[A-Za-z0-9+/=]\{50,\}" packages/web-app/src/utils/mockAuth.ts | \
        grep -v "MOCK\|TEST\|DEVELOPMENT" 2>/dev/null; then
        report_issue "Mock tokens should contain obvious mock identifiers"
    else
        report_success "Mock tokens are properly marked"
    fi
fi

echo ""
echo "5. Validating .gitignore security entries..."

# Required security entries in .gitignore
required_entries=("auth-logs.txt" "*.log" "logs/" "debug-*.txt")

for entry in "${required_entries[@]}"; do
    # Handle special regex characters in patterns
    if [[ "$entry" == "debug-*.txt" ]]; then
        if ! grep -q "debug-\*\.txt" .gitignore 2>/dev/null; then
            report_issue "Missing required .gitignore entry: $entry"
        fi
    else
        if ! grep -q "^$entry" .gitignore 2>/dev/null; then
            report_issue "Missing required .gitignore entry: $entry"
        fi
    fi
done

if [ $SECURITY_ISSUES -eq 0 ]; then
    report_success ".gitignore security entries are present"
fi

echo ""
echo "6. Checking production configuration..."

# Check for HTTP URLs in infrastructure (should use HTTPS)
if grep -r "http://" infrastructure/ --include="*.ts" | \
    grep -v "localhost\|127.0.0.1" 2>/dev/null; then
    report_issue "HTTP URLs found in infrastructure - use HTTPS only"
else
    report_success "Infrastructure uses HTTPS properly"
fi

# Check for mock auth usage in production code
mock_auth_files=$(grep -r "initMockAuth\|isMockAuthActive" packages/web-app/src \
    --exclude="mockAuth.ts" \
    --exclude="*.test.*" 2>/dev/null || true)

if [ -n "$mock_auth_files" ]; then
    # Check if the files have proper environment guards
    has_unguarded_usage=false

    while IFS= read -r line; do
        file=$(echo "$line" | cut -d: -f1)
        # Check if the file has environment guards
        if ! grep -q "import\.meta\.env\.DEV\|process\.env\.NODE_ENV.*development\|devToolController\.shouldShowDevTools" "$file" 2>/dev/null; then
            has_unguarded_usage=true
            echo "$line"
        fi
    done <<< "$mock_auth_files"

    if [ "$has_unguarded_usage" = true ]; then
        report_warning "Mock auth usage found without proper environment guards - ensure it's disabled in production"
    else
        report_success "Mock auth usage properly guarded with environment checks"
    fi
else
    report_success "No mock auth usage in production code"
fi

echo ""
echo "7. Validating dependency security..."

# Run npm audit if available
if command -v npm &> /dev/null; then
    echo "Running npm audit..."
    if npm audit --audit-level=moderate; then
        report_success "No moderate or high severity vulnerabilities found"
    else
        report_issue "npm audit found security vulnerabilities"
    fi
else
    report_warning "npm not available - skipping dependency audit"
fi

echo ""
echo "8. Comprehensive secret scanning..."

# Enhanced secret detection patterns
secret_patterns=(
    "password.*=.*['\"][^'\"]{8,}['\"]"
    "api[_-]?key.*=.*['\"][^'\"]{20,}['\"]"
    "secret.*=.*['\"][^'\"]{16,}['\"]"
    "token.*=.*['\"][^'\"]{20,}['\"]"
    "auth.*=.*['\"][^'\"]{16,}['\"]"
)

for pattern in "${secret_patterns[@]}"; do
    if grep -r -i "$pattern" . \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=coverage \
        --exclude="*.md" \
        --exclude="mockAuth.ts" \
        --exclude="*.test.js" \
        --exclude="*.test.ts" 2>/dev/null; then
        report_issue "Potential secrets found matching pattern: $pattern"
    fi
done

# Check for database connection strings
if grep -r "mongodb://\|mysql://\|postgres://\|redis://" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=coverage \
    --exclude="*.md" \
    --exclude="*.test.js" \
    --exclude="*.test.ts" \
    --exclude="security-check*.sh" \
    --exclude="security-check*.ps1" \
    --exclude="pre-commit-security.sh" 2>/dev/null | \
    grep -v "localhost\|127.0.0.1\|example.com\|testuser:testpass@testhost"; then
    report_issue "Database connection strings found - ensure they use environment variables"
else
    report_success "No hardcoded database connection strings found"
fi

echo ""
echo "=================================="
echo "Security Validation Summary"
echo "=================================="

if [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 All security checks passed! Repository is secure for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $SECURITY_ISSUES security issue(s). Please fix before deploying.${NC}"
    echo ""
    echo "For help with security issues, see SECURITY.md"
    exit 1
fi
