#!/bin/bash

# Deployment Monitoring Script for BudgetBuddy
# This script helps monitor the status of GitHub Actions deployments

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

ENVIRONMENT=${1:-dev}

echo "=== BudgetBuddy Deployment Status Monitor ==="
echo "Environment: $ENVIRONMENT"
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity --profile hitechparadigm &> /dev/null; then
    print_error "AWS credentials not configured for hitechparadigm profile"
    exit 1
fi

print_status "Checking CloudFormation stacks..."

# List of expected stacks
stacks=(
    "budgetbuddy-$ENVIRONMENT-database"
    "budgetbuddy-$ENVIRONMENT-auth"
    "budgetbuddy-$ENVIRONMENT-api"
    "budgetbuddy-$ENVIRONMENT-hosting"
    "budgetbuddy-$ENVIRONMENT-monitoring"
)

all_stacks_exist=true

for stack in "${stacks[@]}"; do
    print_status "Checking stack: $stack"
    
    if aws cloudformation describe-stacks --stack-name "$stack" --profile hitechparadigm &>/dev/null; then
        status=$(aws cloudformation describe-stacks --stack-name "$stack" --profile hitechparadigm --query 'Stacks[0].StackStatus' --output text)
        
        case $status in
            "CREATE_COMPLETE"|"UPDATE_COMPLETE")
                print_success "  Status: $status ✅"
                ;;
            "CREATE_IN_PROGRESS"|"UPDATE_IN_PROGRESS")
                print_warning "  Status: $status ⏳"
                ;;
            "CREATE_FAILED"|"UPDATE_FAILED"|"ROLLBACK_COMPLETE"|"ROLLBACK_FAILED")
                print_error "  Status: $status ❌"
                all_stacks_exist=false
                ;;
            *)
                print_warning "  Status: $status ⚠️"
                ;;
        esac
    else
        print_error "  Stack not found ❌"
        all_stacks_exist=false
    fi
done

echo ""

if [ "$all_stacks_exist" = true ]; then
    print_status "Getting deployment outputs..."
    
    # Get API URL
    api_url=$(aws cloudformation describe-stacks \
        --stack-name "budgetbuddy-$ENVIRONMENT-api" \
        --profile hitechparadigm \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
        --output text 2>/dev/null || echo "Not available")
    
    # Get User Pool ID
    user_pool_id=$(aws cloudformation describe-stacks \
        --stack-name "budgetbuddy-$ENVIRONMENT-auth" \
        --profile hitechparadigm \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
        --output text 2>/dev/null || echo "Not available")
    
    # Get Web Distribution Domain
    web_domain=$(aws cloudformation describe-stacks \
        --stack-name "budgetbuddy-$ENVIRONMENT-hosting" \
        --profile hitechparadigm \
        --query 'Stacks[0].Outputs[?OutputKey==`WebDistributionDomainName`].OutputValue' \
        --output text 2>/dev/null || echo "Not available")
    
    echo "=== DEPLOYMENT OUTPUTS ==="
    echo "API URL: $api_url"
    echo "User Pool ID: $user_pool_id"
    echo "Web Domain: https://$web_domain"
    echo ""
    
    # Test API endpoints if available
    if [ "$api_url" != "Not available" ]; then
        print_status "Testing API endpoints..."
        
        if curl -f -s "$api_url/health" > /dev/null; then
            print_success "Health endpoint: ✅ Responding"
        else
            print_error "Health endpoint: ❌ Not responding"
        fi
        
        if curl -f -s "$api_url/auth/health" > /dev/null; then
            print_success "Auth endpoint: ✅ Responding"
        else
            print_error "Auth endpoint: ❌ Not responding"
        fi
        
        if curl -f -s "$api_url/budget/health" > /dev/null; then
            print_success "Budget endpoint: ✅ Responding"
        else
            print_error "Budget endpoint: ❌ Not responding"
        fi
    fi
    
    echo ""
    print_success "🎉 Deployment monitoring complete!"
    echo ""
    echo "Next steps:"
    echo "1. Test the API endpoints manually"
    echo "2. Check CloudWatch logs for any issues"
    echo "3. Proceed with frontend development"
    
else
    print_error "❌ Some stacks are missing or failed"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check GitHub Actions workflow logs"
    echo "2. Review CloudFormation events in AWS console"
    echo "3. Verify AWS permissions"
    echo "4. Re-run deployment if needed"
fi

echo ""
echo "GitHub Actions: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
echo "AWS Console: https://console.aws.amazon.com/cloudformation/home?region=us-east-1"