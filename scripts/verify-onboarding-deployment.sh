#!/bin/bash

# Verification script for auth-onboarding Lambda deployment
# This script checks if the new Lambda is deployed and properly integrated

echo "=========================================="
echo "Auth-Onboarding Deployment Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: CDK Stack Status
echo "1. Checking CDK Stack Status..."
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name budgetbuddy-dev-auth-onboarding --query "Stacks[0].StackStatus" --output text 2>&1)

if [[ $STACK_STATUS == *"does not exist"* ]] || [[ $STACK_STATUS == *"Unable to locate credentials"* ]]; then
    echo -e "${RED}❌ Stack NOT deployed${NC}"
    echo "   Action: Run 'cd infrastructure && npx cdk deploy budgetbuddy-dev-auth-onboarding'"
    STACK_DEPLOYED=false
else
    echo -e "${GREEN}✅ Stack Status: $STACK_STATUS${NC}"
    STACK_DEPLOYED=true
fi
echo ""

# Check 2: Lambda Function Exists
echo "2. Checking Lambda Function..."
LAMBDA_STATUS=$(aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.State" --output text 2>&1)

if [[ $LAMBDA_STATUS == *"ResourceNotFoundException"* ]] || [[ $LAMBDA_STATUS == *"Unable to locate credentials"* ]]; then
    echo -e "${RED}❌ Lambda function NOT found${NC}"
    echo "   Action: Deploy the auth-onboarding stack first"
    LAMBDA_EXISTS=false
else
    echo -e "${GREEN}✅ Lambda State: $LAMBDA_STATUS${NC}"
    LAMBDA_EXISTS=true

    # Get Lambda details
    LAMBDA_MEMORY=$(aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.MemorySize" --output text 2>/dev/null)
    LAMBDA_TIMEOUT=$(aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.Timeout" --output text 2>/dev/null)
    LAMBDA_RUNTIME=$(aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.Runtime" --output text 2>/dev/null)

    echo "   Memory: ${LAMBDA_MEMORY}MB"
    echo "   Timeout: ${LAMBDA_TIMEOUT}s"
    echo "   Runtime: ${LAMBDA_RUNTIME}"
fi
echo ""

# Check 3: Lambda Layers
if [ "$LAMBDA_EXISTS" = true ]; then
    echo "3. Checking Lambda Layers..."
    LAYERS=$(aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.Layers[*].Arn" --output text 2>/dev/null)

    if [ -z "$LAYERS" ]; then
        echo -e "${YELLOW}⚠️  No layers attached${NC}"
    else
        echo -e "${GREEN}✅ Layers attached:${NC}"
        echo "$LAYERS" | tr '\t' '\n' | while read layer; do
            echo "   - $layer"
        done
    fi
    echo ""
fi

# Check 4: CloudWatch Log Group
echo "4. Checking CloudWatch Log Group..."
LOG_GROUP=$(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/budgetbuddy-auth-onboarding" --query "logGroups[0].logGroupName" --output text 2>&1)

if [[ $LOG_GROUP == *"None"* ]] || [[ $LOG_GROUP == *"Unable to locate credentials"* ]]; then
    echo -e "${RED}❌ Log group NOT found${NC}"
else
    echo -e "${GREEN}✅ Log Group: $LOG_GROUP${NC}"

    # Get retention days
    RETENTION=$(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/budgetbuddy-auth-onboarding" --query "logGroups[0].retentionInDays" --output text 2>/dev/null)
    echo "   Retention: ${RETENTION} days"
fi
echo ""

# Check 5: Recent Invocations
if [ "$LAMBDA_EXISTS" = true ]; then
    echo "5. Checking Recent Invocations..."
    INVOCATIONS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Invocations \
        --dimensions Name=FunctionName,Value=budgetbuddy-auth-onboarding \
        --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 3600 \
        --statistics Sum \
        --query "Datapoints[0].Sum" \
        --output text 2>/dev/null)

    if [ "$INVOCATIONS" = "None" ] || [ -z "$INVOCATIONS" ]; then
        echo -e "${YELLOW}⚠️  No invocations in the last hour${NC}"
        echo "   This is expected if the Lambda was just deployed"
    else
        echo -e "${GREEN}✅ Invocations (last hour): $INVOCATIONS${NC}"
    fi
    echo ""
fi

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="

if [ "$STACK_DEPLOYED" = true ] && [ "$LAMBDA_EXISTS" = true ]; then
    echo -e "${GREEN}✅ Auth-Onboarding Lambda is DEPLOYED${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Redeploy API stack to update API Gateway integration:"
    echo "   cd infrastructure && npx cdk deploy budgetbuddy-dev-api"
    echo ""
    echo "2. Test onboarding flow with a new user account"
    echo ""
    echo "3. Monitor CloudWatch logs:"
    echo "   aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --follow"
else
    echo -e "${RED}❌ Auth-Onboarding Lambda is NOT deployed${NC}"
    echo ""
    echo "Required Actions:"
    echo "1. Deploy the auth-onboarding stack:"
    echo "   cd infrastructure && npx cdk deploy budgetbuddy-dev-auth-onboarding"
    echo ""
    echo "2. Deploy the API stack to update routing:"
    echo "   cd infrastructure && npx cdk deploy budgetbuddy-dev-api"
    echo ""
    echo "3. Run this script again to verify deployment"
fi

echo ""
echo "For detailed instructions, see: DEPLOYMENT_INSTRUCTIONS.md"
echo "=========================================="
