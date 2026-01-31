# Budget Alerts Service Lambda

## Overview

The Budget Alerts Service Lambda monitors budget spending and sends alerts when spending reaches threshold levels (80%, 90%, 100%). It processes real-time transaction events via DynamoDB Streams and performs scheduled checks to catch any missed alerts.

## Purpose

- Monitor budget spending in real-time
- Detect when spending reaches threshold levels
- Send alerts to all family members
- Prevent duplicate alerts
- Perform scheduled checks for missed alerts

## Handler Function

**Entry Point**: `exports.handler`

**Triggers**:

1. **DynamoDB Streams**: Real-time transaction events (INSERT/MODIFY)
2. **EventBridge**: Scheduled checks every 6 hours
3. **Manual**: Direct Lambda invocation

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: `budgetbuddy-main`)
- `NOTIFICATION_FUNCTION`: Notification Service Lambda function name (default: `budgetbuddy-notifications`)

## IAM Permissions Required

- **DynamoDB**:
  - `dynamodb:GetItem` - Get budget data
  - `dynamodb:PutItem` - Mark alerts as sent
  - `dynamodb:Scan` - Scan for active budgets
  - `dynamodb:GetRecords` - Read from DynamoDB Streams
  - `dynamodb:GetShardIterator` - Get stream shard iterator
  - `dynamodb:DescribeStream` - Describe stream
  - `dynamodb:ListStreams` - List streams

- **Lambda**:
  - `lambda:InvokeFunction` - Invoke Notification Service

## Alert Thresholds

- **80%**: Low severity alert ("💡 Budget Alert")
- **90%**: Medium severity alert ("⚠️ Budget Warning")
- **100%**: High severity alert ("🚨 Budget Exceeded!")

## Functions

### `getBudget(familyId, month)`

Gets budget data for a family and month.

**Parameters**:

- `familyId`: Family ID
- `month`: Budget month (YYYY-MM format)

**Returns**: Budget object or null

**Throws**: Error if query fails

### `getFamilyUsers(familyId)`

Gets all users in a family.

**Parameters**:

- `familyId`: Family ID

**Returns**: Array of user objects

**Throws**: Error if scan fails

### `wasAlertSent(familyId, month, categoryName, threshold)`

Checks if an alert was already sent for a category and threshold.

**Parameters**:

- `familyId`: Family ID
- `month`: Budget month
- `categoryName`: Category name
- `threshold`: Alert threshold (0.8, 0.9, 1.0)

**Returns**: Boolean (true if alert was sent)

**Throws**: Error if query fails

### `markAlertSent(familyId, month, categoryName, threshold)`

Marks an alert as sent to prevent duplicates.

**Parameters**:

- `familyId`: Family ID
- `month`: Budget month
- `categoryName`: Category name
- `threshold`: Alert threshold

**Returns**: void

**Throws**: Error if put fails

**TTL**: 90 days from sentAt

### `sendNotification(userId, notification)`

Sends notification to a user via Notification Service Lambda.

**Parameters**:

- `userId`: User ID
- `notification`: Notification object `{ title, body, data }`

**Returns**: void

**Throws**: Error if Lambda invocation fails

**Invocation Type**: Event (async)

### `checkCategoryAlerts(familyId, month, category)`

Checks a category for threshold violations and returns unsent alerts.

**Parameters**:

- `familyId`: Family ID
- `month`: Budget month
- `category`: Category object with plannedAmount and spentAmount

**Returns**: Array of alert objects

**Logic**:

1. Calculate percent spent (spent / planned)
2. Check each threshold (80%, 90%, 100%)
3. Skip if alert already sent
4. Return array of unsent alerts

### `generateAlertNotification(category, alert, month)`

Generates notification object for an alert.

**Parameters**:

- `category`: Category object
- `alert`: Alert object with threshold and percentSpent
- `month`: Budget month

**Returns**: Notification object with title, body, data

**Notification Format**:

```javascript
{
  title: "🚨 Budget Exceeded!",
  body: "You've spent 105% of your Groceries budget for 2024-01",
  data: {
    type: "budget_alert",
    category: "Groceries",
    month: "2024-01",
    threshold: 1.0,
    percentSpent: 1.05,
    planned: 500,
    spent: 525,
    severity: "high"
  }
}
```

### `processBudgetAlerts(budget)`

Processes a budget and sends alerts for all categories that exceed thresholds.

**Parameters**:

- `budget`: Budget object

**Returns**: `{ success: true, familyId, month }` or `{ success: false, error }`

**Logic**:

1. Extract all categories from all groups
2. Check each category for alerts
3. Get family users
4. Send alerts to all family members
5. Mark alerts as sent

### `checkAllBudgets()`

Scans all budgets for current month and checks for alerts.

**Returns**: Array of results

**Logic**:

1. Get current month (YYYY-MM)
2. Scan for all budgets in current month
3. Process each budget for alerts
4. Return results

**Use Case**: Scheduled checks to catch missed alerts

## Event Handling

### DynamoDB Stream Event

**Trigger**: Transaction INSERT or MODIFY

**Event Structure**:

```javascript
{
  Records: [
    {
      eventSource: "aws:dynamodb",
      eventName: "INSERT",
      dynamodb: {
        NewImage: {
          PK: { S: "FAMILY#family-123" },
          SK: { S: "TRANSACTION#txn-456" },
          familyId: { S: "family-123" },
          budgetMonth: { S: "2024-01" },
          // ... other fields
        },
      },
    },
  ];
}
```

**Processing**:

1. Unmarshal DynamoDB record
2. Check if SK starts with "TRANSACTION#"
3. Get budget for familyId and budgetMonth
4. Process budget for alerts

### EventBridge Scheduled Event

**Trigger**: Every 6 hours

**Event Structure**:

```javascript
{
  source: "aws.events",
  // ... other fields
}
```

**Processing**:

1. Call `checkAllBudgets()`
2. Process all budgets for current month
3. Return results

### Manual Invocation

**Trigger**: Direct Lambda invocation

**Processing**:

1. Call `checkAllBudgets()`
2. Process all budgets for current month
3. Return results

## Data Models

### Alert Record

```javascript
{
  PK: "FAMILY#<familyId>",
  SK: "ALERT#<month>-<categoryName>-<threshold>",
  month: string,
  categoryName: string,
  threshold: number,
  sentAt: string (ISO 8601),
  expiresAt: number (Unix timestamp, 90 days TTL)
}
```

## Testing

### Unit Tests

Run unit tests:

```bash
npm test
```

### Manual Testing

Test with DynamoDB Stream event:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-budget-alerts \
  --payload file://test-stream-event.json \
  response.json \
  --profile hitechparadigm
```

Test scheduled check:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-budget-alerts \
  --payload '{"source":"aws.events"}' \
  response.json \
  --profile hitechparadigm
```

### View Logs

```bash
aws logs tail /aws/lambda/budgetbuddy-dev-budget-alerts --follow --profile hitechparadigm
```

## Error Handling

All errors are caught and logged:

```javascript
console.error("Error processing budget alerts:", error);
return { success: false, error: error.message };
```

**Error Response**:

```json
{
  "statusCode": 500,
  "body": {
    "error": "Budget alerts failed",
    "details": "Error message"
  }
}
```

## Logging

All operations are logged to CloudWatch Logs:

```javascript
console.log("Checking budget alerts for family", familyId, "month", month);
console.log("Found", alerts.length, "alerts for category", category.name);
console.log("Notification sent to user", userId);
```

## Performance

- **Memory**: 512 MB
- **Timeout**: 60 seconds
- **Reserved Concurrency**: 10 (prevents throttling)
- **Average Duration**: 500ms per budget
- **Cold Start**: ~1 second

## Cost

- **Per Invocation**: ~$0.000002
- **Per Month** (10K users, 50K transactions): ~$1.00
- **DynamoDB Streams**: Included in DynamoDB pricing

## Alert Deduplication

Alerts are deduplicated using a composite key:

- `ALERT#<month>-<categoryName>-<threshold>`

**Example**: `ALERT#2024-01-Groceries-0.8`

**TTL**: 90 days (alerts expire after 90 days)

**Logic**:

1. Check if alert record exists
2. If exists, skip sending alert
3. If not exists, send alert and create record

## Scheduled Checks

**Purpose**: Catch missed alerts due to:

- DynamoDB Streams processing delays
- Lambda function errors
- Network issues

**Frequency**: Every 6 hours

**Logic**:

1. Scan all budgets for current month
2. Check each budget for threshold violations
3. Send alerts if not already sent

## Deployment

Deployed via CDK as part of Notification Stack:

```bash
cd infrastructure
cdk deploy budgetbuddy-dev-notification --profile hitechparadigm
```

## Dependencies

- `aws-sdk`: AWS SDK for JavaScript

## Future Enhancements

- [ ] Add alert history tracking
- [ ] Add alert preferences per category
- [ ] Add custom alert thresholds
- [ ] Add alert snoozing
- [ ] Add alert escalation (repeated alerts)
- [ ] Add weekly/monthly summary alerts
- [ ] Add spending trend alerts
- [ ] Add budget rollover alerts
- [ ] Add multi-month budget alerts
- [ ] Add alert analytics

## Troubleshooting

### Alerts Not Sending

1. Check DynamoDB Streams is enabled
2. Verify event source mapping is active
3. Check Lambda function logs for errors
4. Verify Notification Service is working
5. Check alert deduplication records

### Duplicate Alerts

1. Check alert records in DynamoDB
2. Verify TTL is set correctly
3. Check for clock skew issues
4. Verify alert key format

### Missed Alerts

1. Check scheduled rule is enabled
2. Verify EventBridge permissions
3. Check Lambda function logs
4. Run manual invocation to test

### High Lambda Costs

1. Check for infinite loops
2. Verify batch processing limits
3. Review CloudWatch metrics
4. Optimize DynamoDB queries
5. Consider reserved concurrency

## References

- [DynamoDB Streams Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)
- [EventBridge Scheduled Rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
