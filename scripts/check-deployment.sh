#!/bin/bash

# BudgetBuddy Deployment Health Check Script
# This script validates that all AWS resources are deployed correctly
# and tests basic functionality of the application.

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

# Check if stack exists
check_stack_exists() {
    local stack_name=$1
    if aws cloudformation describe-stacks --stack-name "$stack_name" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Get stack output
get_stack_output() {
    local stack_name=$1
    local output_key=$2
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null || echo ""
}

# Test API endpoint
test_api_endpoint() {
    local url=$1
    local endpoint=$2
    local expected_status=${3:-200}

    print_status "Testing $endpoint..."

    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url$endpoint" || echo "000")

    if [ "$response" = "$expected_status" ]; then
        print_success "$endpoint responded with status $response"
        return 0
    else
        print_error "$endpoint responded with status $response (expected $expected_status)"
        return 1
    fi
}

# Main health check function
main() {
    local environment=${1:-dev}

    echo "=== BudgetBuddy Deployment Health Check ==="
    echo "Environment: $environment"
    echo ""

    local errors=0

    # Check all stacks exist
    print_status "Checking CloudFormation stacks..."

    local stacks=(
        "budgetbuddy-$environment-database"
        "budgetbuddy-$environment-auth"
        "budgetbuddy-$environment-api"
        "budgetbuddy-$environment-hosting"
        "budgetbuddy-$environment-monitoring"
    )

    for stack in "${stacks[@]}"; do
        if check_stack_exists "$stack"; then
            print_success "Stack exists: $stack"
        else
            print_error "Stack missing: $stack"
            ((errors++))
        fi
    done

    echo ""

    # Get deployment outputs
    print_status "Retrieving deployment outputs..."

    local api_url=$(get_stack_output "budgetbuddy-$environment-api" "ApiUrl")
    local user_pool_id=$(get_stack_output "budgetbuddy-$environment-auth" "UserPoolId")
    local user_pool_client_id=$(get_stack_output "budgetbuddy-$environment-auth" "UserPoolClientId")
    local table_name=$(get_stack_output "budgetbuddy-$environment-database" "TableName")
    local web_domain=$(get_stack_output "budgetbuddy-$environment-hosting" "WebDistributionDomainName")
    local admin_domain=$(get_stack_output "budgetbuddy-$environment-hosting" "AdminDistributionDomainName")

    echo "API URL: $api_url"
    echo "User Pool ID: $user_pool_id"
    echo "User Pool Client ID: $user_pool_client_id"
    echo "DynamoDB Table: $table_name"
    echo "Web Domain: $web_domain"
    echo "Admin Domain: $admin_domain"
    echo ""

    # Test API endpoints if API URL is available
    if [ -n "$api_url" ]; then
        print_status "Testing API endpoints..."

        # Test health endpoint
        if test_api_endpoint "$api_url" "/health"; then
            print_success "Health endpoint working"
        else
            print_error "Health endpoint failed"
            ((errors++))
        fi

        # Test auth endpoints
        if test_api_endpoint "$api_url" "/auth/health"; then
            print_success "Auth service working"
        else
            print_error "Auth service failed"
            ((errors++))
        fi

        # Test budget endpoints
        if test_api_endpoint "$api_url" "/budget/health"; then
            print_success "Budget service working"
        else
            print_error "Budget service failed"
            ((errors++))
        fi

        # Test other service endpoints
        local services=("transactions" "ai" "family" "email" "admin")
        for service in "${services[@]}"; do
            if test_api_endpoint "$api_url" "/$service/health"; then
                print_success "$service service working"
            else
                print_error "$service service failed"
                ((errors++))
            fi
        done

        # Test payment endpoint (uses plural form - /payments/health)
        if test_api_endpoint "$api_url" "/payments/health"; then
            print_success "payment service working"
        else
            print_error "payment service failed"
            ((errors++))
        fi
    else
        print_error "API URL not found - cannot test endpoints"
        ((errors++))
    fi

    echo ""

    # Test web distributions if domains are available
    if [ -n "$web_domain" ]; then
        print_status "Testing web distribution..."
        if test_api_endpoint "https://$web_domain" "/" 200; then
            print_success "Web distribution accessible"
        else
            print_warning "Web distribution not accessible (may not have content yet)"
        fi
    fi

    if [ -n "$admin_domain" ]; then
        print_status "Testing admin distribution..."
        if test_api_endpoint "https://$admin_domain" "/" 200; then
            print_success "Admin distribution accessible"
        else
            print_warning "Admin distribution not accessible (may not have content yet)"
        fi
    fi

    echo ""
    echo "=== HEALTH CHECK SUMMARY ==="

    if [ $errors -eq 0 ]; then
        print_success "All checks passed! Deployment is healthy."
        echo ""
        echo "Next steps:"
        echo "1. Deploy frontend applications to S3 buckets"
        echo "2. Configure frontend with API URLs"
        echo "3. Test user registration and authentication"
        echo "4. Set up monitoring alerts"
        return 0
    else
        print_error "Health check failed with $errors errors."
        echo ""
        echo "Troubleshooting:"
        echo "1. Check CloudFormation stack events for deployment errors"
        echo "2. Review Lambda function logs in CloudWatch"
        echo "3. Verify IAM permissions are correct"
        echo "4. Check API Gateway configuration"
        return 1
    fi
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [environment]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (dev, staging, prod). Default: dev"
    echo ""
    echo "Examples:"
    echo "  $0              # Check dev environment"
    echo "  $0 dev          # Check dev environment"
    echo "  $0 staging      # Check staging environment"
    echo "  $0 prod         # Check production environment"
    exit 0
fi

# Run main function
main $1
