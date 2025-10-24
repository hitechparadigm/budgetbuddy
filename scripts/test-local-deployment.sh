#!/bin/bash

# Local Deployment Test Script for BudgetBuddy
# This script tests the deployment process locally before pushing to GitHub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=== BudgetBuddy Local Deployment Test ==="
echo ""

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm: $NPM_VERSION"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    exit 1
fi
AWS_VERSION=$(aws --version)
print_success "AWS CLI: $AWS_VERSION"

# Check CDK
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed. Run: npm install -g aws-cdk"
    exit 1
fi
CDK_VERSION=$(cdk --version)
print_success "AWS CDK: $CDK_VERSION"

echo ""

# Check AWS credentials
print_status "Checking AWS credentials..."
if aws sts get-caller-identity --profile hitechparadigm &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --profile hitechparadigm --query Account --output text)
    REGION=$(aws configure get region --profile hitechparadigm || echo "us-east-1")
    print_success "AWS Profile: hitechparadigm"
    print_success "Account ID: $ACCOUNT_ID"
    print_success "Region: $REGION"
else
    print_error "AWS credentials not configured for hitechparadigm profile"
    print_error "Please run: aws configure --profile hitechparadigm"
    exit 1
fi

echo ""

# Install dependencies
print_status "Installing dependencies..."
npm ci
print_success "Root dependencies installed"

cd infrastructure
npm ci
print_success "Infrastructure dependencies installed"
cd ..

echo ""

# Run linting
print_status "Running code quality checks..."
if npm run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

# Check formatting
if npm run format:check; then
    print_success "Code formatting is correct"
else
    print_warning "Code formatting issues found. Run: npm run format"
fi

echo ""

# Build infrastructure
print_status "Building infrastructure..."
cd infrastructure
if npm run build; then
    print_success "Infrastructure build successful"
else
    print_error "Infrastructure build failed"
    exit 1
fi

# CDK synthesis test
print_status "Testing CDK synthesis..."
if AWS_PROFILE=hitechparadigm npx cdk synth --all --context environment=dev; then
    print_success "CDK synthesis successful"
else
    print_error "CDK synthesis failed"
    exit 1
fi

cd ..

echo ""

# Test deployment (dry run)
print_status "Testing deployment (dry run)..."
cd infrastructure
if AWS_PROFILE=hitechparadigm npx cdk diff --context environment=dev; then
    print_success "CDK diff completed successfully"
else
    print_warning "CDK diff completed with warnings"
fi

cd ..

echo ""
echo "=== LOCAL TEST SUMMARY ==="
print_success "✅ All prerequisites installed"
print_success "✅ AWS credentials configured"
print_success "✅ Dependencies installed"
print_success "✅ Code quality checks passed"
print_success "✅ Infrastructure builds successfully"
print_success "✅ CDK synthesis works"

echo ""
print_status "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Commit and push your changes to the develop branch"
echo "2. GitHub Actions will automatically deploy to development environment"
echo "3. Monitor the deployment in the Actions tab"
echo ""
echo "To deploy manually (if needed):"
echo "  cd infrastructure"
echo "  AWS_PROFILE=hitechparadigm npm run deploy:dev"