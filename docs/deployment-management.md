# BudgetBuddy Deployment Management Guide

## 🚀 Deployment Commands

### Get Stack Information
```bash
# List all stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Get specific stack details
aws cloudformation describe-stacks --stack-name budgetbuddy-dev-api

# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name budgetbuddy-dev-api \
  --query 'Stacks[0].Outputs'
```

### Deploy Updates
```bash
# Deploy all stacks
cd infrastructure
npm run deploy:dev

# Deploy specific stack
npx cdk deploy budgetbuddy-dev-api --context environment=dev

# Deploy with approval
npx cdk deploy --all --context environment=dev --require-approval never
```

### Monitor Deployment
```bash
# Check deployment status
bash scripts/monitor-deployment.sh dev

# View deployment logs
aws logs tail /aws/lambda/budgetbuddy-dev-auth --follow

# Check API Gateway logs
aws logs describe-log-groups --log-group-name-prefix /aws/apigateway/budgetbuddy
```

## 📊 Monitoring & Observability

### CloudWatch Dashboard
- **URL**: AWS Console → CloudWatch → Dashboards → `budgetbuddy-dev-application-metrics`
- **Metrics**: API requests, Lambda invocations, DynamoDB operations, error rates

### Key Metrics to Monitor
- API Gateway request count and latency
- Lambda function invocations and errors
- DynamoDB read/write capacity and throttles
- Cognito authentication success/failure rates
- Cost and billing metrics

### Alerts Configuration
```bash
# SNS Topic for alerts
ALERT_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT:budgetbuddy-dev-alerts

# Subscribe to alerts
aws sns subscribe \
  --topic-arn $ALERT_TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com
```