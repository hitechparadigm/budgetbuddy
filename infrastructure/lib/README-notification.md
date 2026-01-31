# Notification Stack

## Overview

The Notification Stack provides push notification and daily reminder functionality for BudgetBuddy. It includes three Lambda functions, EventBridge scheduled rules, DynamoDB Streams integration, and comprehensive monitoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Notification Stack                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Notification Service Lambda                     │  │
│  │  - Device registration/removal                            │  │
│  │  - Notification preferences CRUD                          │  │
│  │  - Notification history management                        │  │
│  │  - Push notification delivery via Expo                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │                                   │
│  ┌──────────────────────────┴───────────────────────────────┐  │
│  │                                                            │  │
│  │  Budget Alerts Service        Daily Reminders Service     │  │
│  │  - Stream processing          - User scanning             │  │
│  │  - Threshold detection        - Reminder scheduling       │  │
│  │  - Alert generation           - Batch processing          │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │                                   │
│  ┌──────────────────────────┴───────────────────────────────┐  │
│  │                                                            │  │
│  │  DynamoDB Streams         EventBridge Rules               │  │
│  │  - Transaction events     - Every 15 minutes (reminders)  │  │
│  │  - Real-time triggers     - Every 6 hours (alerts)        │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Lambda Functions

### 1. Notification Service

**Purpose**: Central notification service for device management, preferences, and push delivery

**Configuration**:

- Runtime: Node.js 20.x
- Memory: 512 MB
- Timeout: 30 seconds
- Provisioned Concurrency: 2 (for low latency)

**Environment Variables**:

- `TABLE_NAME`: DynamoDB table name
- `EXPO_ACCESS_TOKEN`: Expo push notification access token

**IAM Permissions**:

- DynamoDB: Read/Write access to main table
- Secrets Manager: Read access for Expo credentials

**API Endpoints** (via API Gateway):

- POST `/notifications/register-device` - Register device for push notifications
- DELETE `/notifications/device/{deviceId}` - Remove device registration
- GET `/notifications/preferences` - Get notification preferences
- PUT `/notifications/preferences` - Update notification preferences
- GET `/notifications/history` - Get notification history
- PUT `/notifications/{notificationId}/read` - Mark notification as read

### 2. Budget Alerts Service

**Purpose**: Monitor budget spending and trigger alerts at threshold levels

**Configuration**:

- Runtime: Node.js 20.x
- Memory: 512 MB
- Timeout: 60 seconds
- Reserved Concurrency: 10 (to prevent throttling)

**Environment Variables**:

- `TABLE_NAME`: DynamoDB table name
- `NOTIFICATION_FUNCTION_ARN`: ARN of Notification Service Lambda

**IAM Permissions**:

- DynamoDB: Read access to main table
- DynamoDB Streams: Read access to table stream
- Lambda: Invoke permission for Notification Service

**Triggers**:

1. **DynamoDB Streams**: Real-time processing of transaction events
   - Batch size: 10
   - Starting position: LATEST
   - Retry attempts: 2
   - Filter: Only TRANSACTION records

2. **EventBridge Rule**: Scheduled checks every 6 hours
   - Catches missed alerts
   - Scans all budgets for threshold violations

**Alert Thresholds**:

- 80% of budget spent: Low severity alert
- 90% of budget spent: Medium severity alert
- 100% of budget spent: High severity alert

### 3. Daily Reminders Service

**Purpose**: Send daily reminders to users who haven't logged transactions

**Configuration**:

- Runtime: Node.js 20.x
- Memory: 1024 MB
- Timeout: 300 seconds (5 minutes for batch processing)

**Environment Variables**:

- `TABLE_NAME`: DynamoDB table name
- `NOTIFICATION_FUNCTION_ARN`: ARN of Notification Service Lambda

**IAM Permissions**:

- DynamoDB: Read access to main table
- Lambda: Invoke permission for Notification Service

**Triggers**:

- **EventBridge Rule**: Every 15 minutes
  - Checks users whose reminder time matches current time (±15 min window)
  - Respects quiet hours settings
  - Sends reminder if 3+ days since last transaction

**Batch Processing**:

- Processes users in batches of 10
- Handles up to 100 users per invocation
- Parallel processing with Promise.all

## EventBridge Rules

### Daily Reminders Rule

**Schedule**: Every 15 minutes (`rate(15 minutes)`)

**Target**: Daily Reminders Service Lambda

**Retry Policy**:

- Maximum retry attempts: 2
- Maximum event age: 1 hour

### Budget Alerts Rule

**Schedule**: Every 6 hours (`rate(6 hours)`)

**Target**: Budget Alerts Service Lambda

**Retry Policy**:

- Maximum retry attempts: 2
- Maximum event age: 2 hours

## DynamoDB Streams

**Stream View Type**: NEW_AND_OLD_IMAGES

**Event Source Mapping**:

- Function: Budget Alerts Service Lambda
- Batch size: 10
- Starting position: LATEST
- Maximum retry attempts: 2
- Bisect batch on function error: true
- Filter pattern: Only TRANSACTION records

## Monitoring

### CloudWatch Alarms

**Error Rate Alarms**:

- Threshold: 5 errors in 5 minutes
- Evaluation periods: 2
- Action: SNS notification

**Throttle Alarms**:

- Threshold: 1 throttle in 5 minutes
- Evaluation periods: 1
- Action: SNS notification

**Duration Alarms**:

- Threshold: p99 > 1 second
- Evaluation periods: 2
- Action: SNS notification

### CloudWatch Dashboard

**Widgets**:

- Invocations per Lambda function
- Errors per Lambda function
- Duration (average) per Lambda function
- DynamoDB Stream metrics
- EventBridge rule metrics

## Deployment

### Prerequisites

1. DynamoDB table with streams enabled
2. Common and Shared Lambda layers deployed
3. Expo access token stored in Secrets Manager

### Deploy Command

```bash
# Set AWS profile
$env:AWS_PROFILE="hitechparadigm"

# Deploy stack
cd infrastructure
cdk deploy budgetbuddy-dev-notification --profile hitechparadigm
```

### Verify Deployment

```bash
# Check Lambda functions
aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'budgetbuddy-dev-notification')]" --profile hitechparadigm

# Check EventBridge rules
aws events list-rules --name-prefix "budgetbuddy-dev" --profile hitechparadigm

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-name-prefix "budgetbuddy-dev-notification" --profile hitechparadigm
```

## Testing

### Manual Testing

**Test Notification Service**:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-notifications \
  --payload '{"httpMethod":"GET","path":"/notifications/preferences"}' \
  response.json \
  --profile hitechparadigm
```

**Test Budget Alerts Service**:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-budget-alerts \
  --payload '{}' \
  response.json \
  --profile hitechparadigm
```

**Test Daily Reminders Service**:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-daily-reminders \
  --payload '{}' \
  response.json \
  --profile hitechparadigm
```

### View Logs

```bash
# Notification Service logs
aws logs tail /aws/lambda/budgetbuddy-dev-notifications --follow --profile hitechparadigm

# Budget Alerts Service logs
aws logs tail /aws/lambda/budgetbuddy-dev-budget-alerts --follow --profile hitechparadigm

# Daily Reminders Service logs
aws logs tail /aws/lambda/budgetbuddy-dev-daily-reminders --follow --profile hitechparadigm
```

## Cost Estimation

### Development Environment

- Lambda invocations: ~3,000/month
- Lambda duration: ~10,000 GB-seconds/month
- DynamoDB Streams: Included
- EventBridge: ~3,000 invocations/month
- CloudWatch: Logs + Alarms
- **Total**: ~$10/month

### Production (10K users)

- Lambda invocations: ~100,000/month
- Lambda duration: ~50,000 GB-seconds/month
- DynamoDB Streams: Included
- EventBridge: ~3,000 invocations/month
- CloudWatch: Logs + Alarms
- Expo Push Notifications: Free tier (1M/month)
- **Total**: ~$50/month

### Production (100K users)

- Lambda invocations: ~1,000,000/month
- Lambda duration: ~500,000 GB-seconds/month
- DynamoDB Streams: Included
- EventBridge: ~3,000 invocations/month
- CloudWatch: Logs + Alarms
- Expo Push Notifications: Free tier (1M/month)
- **Total**: ~$200/month

## Troubleshooting

### No Notifications Received

1. Check device registration in DynamoDB
2. Verify Expo push token is valid
3. Check notification preferences (enabled?)
4. Check CloudWatch logs for errors
5. Verify Expo access token is correct

### Budget Alerts Not Triggering

1. Check DynamoDB Streams is enabled
2. Verify event source mapping is active
3. Check transaction records have correct format
4. Check CloudWatch logs for stream processing errors
5. Verify threshold calculations are correct

### Daily Reminders Not Sending

1. Check EventBridge rule is enabled
2. Verify reminder time matches current time (±15 min)
3. Check quiet hours settings
4. Check last transaction date calculation
5. Verify user preferences (reminders enabled?)

### High Lambda Costs

1. Check for infinite loops or recursive calls
2. Verify batch processing limits (max 100 users)
3. Check Lambda memory settings (right-size)
4. Review CloudWatch metrics for optimization opportunities
5. Consider provisioned concurrency vs on-demand

## Security

### Secrets Management

- Expo access token stored in AWS Secrets Manager
- Lambda IAM role has read-only access to secrets
- Token rotation every 90 days

### Data Protection

- All notification data encrypted at rest in DynamoDB
- Device tokens encrypted with AWS KMS
- Notification history has 90-day TTL

### API Security

- All endpoints require JWT authentication
- Rate limiting: 100 requests/minute per user
- Input validation on all endpoints
- CORS configured for allowed origins only

## Maintenance

### Regular Tasks

- **Weekly**: Review CloudWatch alarms and metrics
- **Monthly**: Review Lambda costs and optimize
- **Quarterly**: Rotate Expo access token
- **Annually**: Review and update notification templates

### Scaling Considerations

- Increase Lambda reserved concurrency if throttling occurs
- Add provisioned concurrency for Notification Service if latency increases
- Monitor DynamoDB Streams lag and adjust batch size if needed
- Consider SQS queue for high-volume notification delivery

## References

- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Streams Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)
- [EventBridge Scheduled Rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
