# Daily Reminders Service Lambda

## Overview

The Daily Reminders Service Lambda sends daily reminders to users who haven't logged transactions recently. It runs every 15 minutes, checks users whose reminder time matches the current time (±15 minute window), respects quiet hours, and sends reminders if 3+ days have passed since their last transaction.

**Last Updated**: January 31, 2026
**Version**: 1.0.0
**Status**: Production Ready

## Purpose

- Send daily reminders to users who haven't logged transactions
- Match reminder times within ±15 minute window
- Respect user quiet hours (no reminders during sleep)
- Process users in batches of 10 for efficiency
- Handle timezone conversions
- Track reminder delivery status

## Handler Function

**Entry Point**: `exports.handler`

**Trigger**: EventBridge Rule (every 15 minutes)

**Event Type**: Scheduled event from EventBridge

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: `budgetbuddy-main`)
- `NOTIFICATION_FUNCTION_ARN`: ARN of Notification Service Lambda

## IAM Permissions Required

- **DynamoDB**:
  - `dynamodb:Query` - Query users by reminder time, get transactions
  - `dynamodb:Scan` - Scan users for reminder matching (GSI)
  - `dynamodb:GetItem` - Get user preferences

- **Lambda**:
  - `lambda:InvokeFunction` - Invoke Notification Service

## Functions

### `handler(event)`

Main handler function triggered by EventBridge.

**Parameters**:

- `event`: EventBridge scheduled event

**Process**:

1. Get current time (hour and minute)
2. Find users with matching reminder times (±15 min)
3. Process users in batches of 10
4. Send reminders to eligible users
5. Log results

**Returns**: `{ processedCount, remindersSent }`

### `getUsersForReminder(currentHour, currentMinute)`

Gets users whose reminder time matches current time (±15 minute window).

**Parameters**:

- `currentHour`: Current hour (0-23)
- `currentMinute`: Current minute (0-59)

**Returns**: Array of user objects with preferences

**Logic**:

- Calculates ±15 minute window
- Queries users with matching reminder times
- Returns max 100 users per invocation

### `isInQuietHours(currentHour, currentMinute, quietStart, quietEnd)`

Checks if current time is within user's quiet hours.

**Parameters**:

- `currentHour`: Current hour
- `currentMinute`: Current minute
- `quietStart`: Quiet hours start time (HH:mm)
- `quietEnd`: Quiet hours end time (HH:mm)

**Returns**: `true` if in quiet hours, `false` otherwise

**Logic**:

- Handles overnight quiet hours (e.g., 22:00 - 08:00)
- Handles same-day quiet hours (e.g., 13:00 - 14:00)
- Minute-precision checking

### `getLastTransactionDate(userId)`

Gets the date of user's most recent transaction.

**Parameters**:

- `userId`: User ID

**Returns**: Date object or null if no transactions

**Query**: Queries transactions by userId, sorts by date DESC, limit 1

### `daysSinceLastTransaction(lastTransactionDate)`

Calculates days since last transaction.

**Parameters**:

- `lastTransactionDate`: Date of last transaction

**Returns**: Number of days (integer)

**Logic**: `Math.floor((now - lastTransactionDate) / (24 * 60 * 60 * 1000))`

### `processUserReminder(user)`

Processes reminder for a single user.

**Parameters**:

- `user`: User object with preferences

**Process**:

1. Check if reminders enabled
2. Check if in quiet hours
3. Get last transaction date
4. Check if 3+ days since last transaction
5. Send reminder if eligible
6. Log result

**Returns**: `{ sent: boolean, reason: string }`

### `processBatch(users)`

Processes users in batches of 10.

**Parameters**:

- `users`: Array of user objects

**Process**:

1. Split users into batches of 10
2. Process each batch in parallel using Promise.all
3. Handle errors per user without failing batch
4. Return results

**Returns**: Array of results

### `sendReminder(userId)`

Sends reminder notification to user.

**Parameters**:

- `userId`: User ID

**Notification**:

```javascript
{
  title: "📝 Daily Reminder",
  body: "Don't forget to log your transactions today!",
  data: {
    type: "daily_reminder",
    timestamp: new Date().toISOString()
  }
}
```

**Returns**: `{ success: true }`

## Reminder Logic

### Time Window Matching

Users are matched if their reminder time is within ±15 minutes of current time:

- Current time: 19:00
- Matches: 18:45 - 19:15
- Example: User with 19:05 reminder → matched at 19:00

### Quiet Hours

Reminders are skipped if current time is within quiet hours:

**Same-day quiet hours**:

- Start: 13:00, End: 14:00
- Blocked: 13:00 - 13:59
- Allowed: 12:59, 14:00

**Overnight quiet hours**:

- Start: 22:00, End: 08:00
- Blocked: 22:00 - 07:59
- Allowed: 21:59, 08:00

### Transaction Check

Reminders are sent only if 3+ days since last transaction:

- Last transaction: Jan 1
- Current date: Jan 4
- Days since: 3 → Send reminder

- Last transaction: Jan 1
- Current date: Jan 3
- Days since: 2 → Skip reminder

### Batch Processing

Users are processed in batches of 10 for efficiency:

- 100 users → 10 batches
- Each batch processed in parallel
- Errors handled per user
- Total time: ~1-2 seconds

## EventBridge Schedule

- **Frequency**: Every 15 minutes
- **Cron**: `rate(15 minutes)`
- **Retry Policy**: 2 attempts with 1-hour max age
- **Purpose**: Check for users whose reminder time matches current time

## Data Models

### User Preferences

```javascript
{
  PK: "USER#<userId>",
  SK: "NOTIFICATION_PREFERENCES",
  dailyReminders: boolean,
  reminderTime: string (HH:mm),
  quietHoursStart: string (HH:mm),
  quietHoursEnd: string (HH:mm)
}
```

### Transaction

```javascript
{
  PK: "FAMILY#<familyId>",
  SK: "TRANSACTION#<transactionId>",
  userId: string,
  date: string (YYYY-MM-DD),
  amount: number,
  // ... other fields
}
```

## Testing

### Unit Tests

```bash
cd backend/functions/daily-reminders
npm test
```

### Property-Based Tests

```bash
npm test batchProcessing.test.js
```

### Manual Testing

Test with scheduled event:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-daily-reminders \
  --payload '{"source":"aws.events"}' \
  response.json \
  --profile hitechparadigm
```

### View Logs

```bash
aws logs tail /aws/lambda/budgetbuddy-dev-daily-reminders --follow --profile hitechparadigm
```

## Error Handling

- User processing errors: Logged but don't block batch
- Notification failures: Logged with user ID
- Query errors: Retried with exponential backoff
- Invalid preferences: Skipped with warning

## Performance

- **Memory**: 1024 MB (for batch processing)
- **Timeout**: 300 seconds (5 minutes)
- **Average Duration**: 2-3 seconds per invocation
- **Cold Start**: ~800ms
- **Max Users**: 100 per invocation

## Cost

- **Per Invocation**: ~$0.000005
- **Per Day** (96 invocations): ~$0.0005
- **Per Month**: ~$0.015
- **Total** (10K users): ~$0.50/month

## Monitoring

### CloudWatch Alarms

- **Error Rate**: > 5 errors in 5 minutes
- **Throttles**: > 1 throttle in 5 minutes
- **Duration**: p99 > 1 second

### Custom Metrics

- `RemindersProcessed`: Count of users processed
- `RemindersSent`: Count of reminders sent
- `RemindersSkipped`: Count by reason (quiet hours, recent transaction, disabled)

## Deployment

Deployed via CDK as part of Notification Stack:

```bash
cd infrastructure
cdk deploy budgetbuddy-dev-notification --profile hitechparadigm
```

## Dependencies

- `aws-sdk`: AWS SDK for JavaScript
- Notification Service Lambda (invoked)

## Troubleshooting

### Reminders Not Sent

1. Check EventBridge rule is enabled
2. Verify user has reminders enabled in preferences
3. Check if in quiet hours
4. Verify last transaction date
5. Review CloudWatch logs for errors

### Wrong Time

1. Check Lambda timezone (UTC by default)
2. Verify user's reminder time format (HH:mm)
3. Check ±15 minute window logic
4. Review time matching logs

### Too Many/Few Reminders

1. Check batch size (should be 10)
2. Verify max users limit (100)
3. Review user query logic
4. Check for duplicate processing

### High Costs

1. Verify EventBridge frequency (15 minutes)
2. Check batch processing limits
3. Review memory allocation (1024 MB)
4. Optimize DynamoDB queries

## References

- [EventBridge Scheduled Rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Query Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html)
