#!/bin/bash

# BudgetBuddy AWS Infrastructure Destruction Script
# This script safely destroys all AWS resources for the BudgetBuddy application
# with proper confirmation and backup warnings.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Confirmation function
confirm_destruction() {
    ENVIRONMENT=${1:-dev}
    
    echo "=== DANGER: INFRASTRUCTURE DESTRUCTION ==="
    echo ""
    print_warning "You are about to DESTROY all BudgetBuddy infrastructure in environment: $ENVIRONMENT"
    print_warning "This action will DELETE:"
    echo "  - All DynamoDB tables and data"
    echo "  - All Lambda functions"
    echo "  - All S3 buckets and content"
    echo "  - All CloudFront distributions"
    echo "  - All Cognito user pools and users"
    echo "  - All CloudWatch logs and metrics"
    echo "  - All other AWS resources"
    echo ""
    print_error "THIS ACTION CANNOT BE UNDONE!"
    echo ""
    
    read -p "Are you absolutely sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_status "Destruction cancelled."
        exit 0
    fi
    
    echo ""
    read -p "Please type the environment name '$ENVIRONMENT' to confirm: " env_confirmation
    
    if [ "$env_confirmation" != "$ENVIRONMENT" ]; then
        print_error "Environment name mismatch. Destruction cancelled."
        exit 1
    fi
}

# Destroy infrastructure
destroy_infrastructure() {
    ENVIRONMENT=${1:-dev}
    
    print_status "Destroying BudgetBuddy infrastructure for environment: $ENVIRONMENT"
    
    cd infrastructure
    
    # Destroy all stacks in reverse dependency order
    print_status "Destroying monitoring stack..."
    cdk destroy budgetbuddy-$ENVIRONMENT-monitoring --force --context environment=$ENVIRONMENT || true
    
    print_status "Destroying hosting stack..."
    cdk destroy budgetbuddy-$ENVIRONMENT-hosting --force --context environment=$ENVIRONMENT || true
    
    print_status "Destroying API stack..."
    cdk destroy budgetbuddy-$ENVIRONMENT-api --force --context environment=$ENVIRONMENT || true
    
    print_status "Destroying auth stack..."
    cdk destroy budgetbuddy-$ENVIRONMENT-auth --force --context environment=$ENVIRONMENT || true
    
    print_status "Destroying database stack..."
    cdk destroy budgetbuddy-$ENVIRONMENT-database --force --context environment=$ENVIRONMENT || true
    
    cd ..
    
    print_success "Infrastructure destroyed successfully!"
}

# Main function
main() {
    echo "=== BudgetBuddy Infrastructure Destruction ==="
    echo ""
    
    ENVIRONMENT=${1:-dev}
    
    # Confirm destruction
    confirm_destruction $ENVIRONMENT
    
    # Destroy infrastructure
    destroy_infrastructure $ENVIRONMENT
    
    print_success "All resources have been destroyed for environment: $ENVIRONMENT"
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [environment]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (dev, staging, prod). Default: dev"
    echo ""
    echo "Examples:"
    echo "  $0              # Destroy dev environment"
    echo "  $0 dev          # Destroy dev environment"
    echo "  $0 staging      # Destroy staging environment"
    echo "  $0 prod         # Destroy production environment"
    exit 0
fi

# Run main function
main $1