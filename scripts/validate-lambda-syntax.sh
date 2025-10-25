#!/bin/bash

# BudgetBuddy Lambda Function Syntax Validation Script
# This script validates JavaScript syntax in all Lambda functions to prevent 502 errors

set -e

echo "🔍 BudgetBuddy Lambda Function Syntax Validation"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
ERRORS=0
WARNINGS=0

echo ""
echo "📁 Checking Lambda function directory structure..."

# Check if Lambda functions directory exists
if [ ! -d "backend/functions" ]; then
    echo -e "${RED}❌ Error: backend/functions directory not found!${NC}"
    exit 1
fi

echo "✅ Lambda functions directory found"

echo ""
echo "🔍 Validating JavaScript syntax..."

# Validate each Lambda function
for func_dir in backend/functions/*/; do
    if [ -d "$func_dir" ]; then
        func_name=$(basename "$func_dir")
        index_file="${func_dir}index.js"

        echo -n "  📄 $func_name: "

        if [ -f "$index_file" ]; then
            # Check JavaScript syntax
            if node -c "$index_file" 2>/dev/null; then
                echo -e "${GREEN}✅ Valid${NC}"
            else
                echo -e "${RED}❌ Syntax Error${NC}"
                echo -e "${RED}     Error in: $index_file${NC}"
                node -c "$index_file" 2>&1 | sed 's/^/     /'
                ERRORS=$((ERRORS + 1))
            fi
        else
            echo -e "${YELLOW}⚠️  Missing index.js${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
done

echo ""
echo "🔍 Checking for common syntax error patterns..."

# Check for invalid optional chaining syntax
echo -n "  🔗 Optional chaining syntax: "
if grep -r "? \." backend/functions/*/index.js 2>/dev/null; then
    echo -e "${RED}❌ Found invalid syntax${NC}"
    echo -e "${RED}     Found '? .' instead of '?.' in:${NC}"
    grep -rn "? \." backend/functions/*/index.js | sed 's/^/     /'
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Valid${NC}"
fi

# Check for missing semicolons in critical places
echo -n "  📝 Critical semicolon check: "
if grep -r "exports\.handler.*{$" backend/functions/*/index.js 2>/dev/null; then
    echo -e "${GREEN}✅ Valid${NC}"
else
    echo -e "${YELLOW}⚠️  Check export syntax${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for proper async/await usage
echo -n "  ⏳ Async/await patterns: "
if grep -r "async.*=>" backend/functions/*/index.js 2>/dev/null | grep -v "await" >/dev/null; then
    echo -e "${YELLOW}⚠️  Async functions without await${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ Valid${NC}"
fi

echo ""
echo "📊 Validation Summary"
echo "===================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All Lambda functions passed validation!${NC}"
    echo "✅ No syntax errors found"
    echo "✅ No warnings found"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Validation completed with warnings${NC}"
    echo "✅ No syntax errors found"
    echo "⚠️  $WARNINGS warning(s) found"
    exit 0
else
    echo -e "${RED}❌ Validation failed${NC}"
    echo "❌ $ERRORS syntax error(s) found"
    echo "⚠️  $WARNINGS warning(s) found"
    echo ""
    echo "🔧 Common fixes:"
    echo "  • Replace '? .' with '?.' for optional chaining"
    echo "  • Check for missing semicolons"
    echo "  • Validate function syntax with: node -c filename.js"
    echo "  • Run ESLint: npm run lint"
    exit 1
fi
