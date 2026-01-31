# Daily Reminders Service Lambda

## Overview

The Daily Reminders Service Lambda sends daily expense tracking reminders to users who haven't logged transactions in 3+ days. It runs on a scheduled basis (every 15 minutes) and checks if users need reminders based on their preferences, reminder time, and quiet hours settings.

## Purpose

- Send daily reminders to users who haven't logged transactions
- Respect user preferences (enabled/disabled, reminder time, quiet hours)
- Process users in batches to avoid timeouts
- Track reminder delivery status

## Handler Function

**Entry Point**: `exports.handler`

**Trigger**: EventBridge scheduled rule (every 15 minutes)

**Processing**:

1. Get all active users
2. Check each user's preferences
3. Verify reminder time matches (±15 min window)
4. Check if in quiet hours
5. Get last transaction date
6. Send reminder if 3+ days since last transaction
7. Process in batches of 10 users

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: `budgetbuddy-main`)
- `NOTIFICATION_FUNCTION`: Notification Service Lambda function name (default: `budgetbuddy-notifications`)

## IAM Permissions Required

- **DynamoDB**:
  - `dynamodb:Scan` - Get all users
  - `dynamodb:GetItem` - Get notification preferences
  - `dynamodb:Query` - Get last transaction date

- **Lambda**:
  - `lambda:InvokeFunction` - Invoke Notification Service

## Functions

### `getAllUsers()`

Gets all active users from DynamoDB.

**Returns**: Array of user objects

**Logic**:

- Scans table for all records with PK starting with "USER#" and SK = "PROFILE"
- Handles pagination with ExclusiveStartKey
- Returns all users

**Throws**: Error if scan fails

### `getNotificationPreferences(userId)`

Gets notification preferences for a user.

**Parameters**:

- `userId`: User ID

**Returns**: Preferences object or default preferences

**Default Preferences**:

```javascript
{
  dailyReminders: true,
  reminderTime: "19:00",
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00"
}
```

**Throws**: Error if query fails

### `getLastTransactionDate(familyId)`

Gets the date of the most recent transaction for a family.

**Parameters**:

- `familyId`: Family ID

**Returns**: Transaction date string or null

**Logic**:

- Queries transactions for family
- Sorts descending (newest first)
- Returns date of first transaction
- Returns null if no transactions

**Throws**: Error if query fails

### `isInQuietHours(preferences)`

Checks if current time is within user's quiet hours.

**Parameters**:

- `preferences`: Preferences object with quietHoursStart and quietHoursEnd

**Returns**: Boolean (true if in quiet hours)

**Logic**:

- Converts times to minutes since midnight
- Handles quiet hours that span midnight (e.g., 10 PM - 8 AM)
- Returns true if current time is within quiet hours

**Example**:

```javascript
// Quiet hours: 22:00 - 08:00
// Current time: 23:30
// Result: true (in quiet hours)

// Quiet hours: 22:00 - 08:00
// Current time: 07:30
// Result: true (in quiet hours, spans midnight)

// Quiet hours: 22:00 - 08:00
// Current time: 14:00
// Result: false (not in quiet hours)
```

### `isReminderTime(preferences)`

Checks if current time matches user's reminder time (±15 min window).

**Parameters**:

- `preferences`: Preferences object with reminderTime

**Returns**: Boolean (true if within reminder window)

**Logic**:

- Converts times to minutes since midnight
- Calculates time difference
- Returns true if difference ≤ 15 minutes

**Example**:

```javascript
// Reminder time: 19:00
// Current time: 19:10
// Result: true (within 15 min window)

// Reminder time: 19:00
// Current time: 18:50
// Result: true (within 15 min window)

// Reminder time: 19:00
// Current time: 19:20
// Result: false (outside 15 min window)
```

### `sendDailyReminder(user)`

Sends daily reminder to a user if conditions are met.

**Parameters**:

- `user`: User object with userId and familyId

**Returns**: Result object `{ userId, sent, reason?, daysSinceLastTransaction?, error? }`

**Logic**:

1. Get notification preferences
2. Check if daily reminders enabled
3. Check if in quiet hours
4. Check if reminder time matches
5. Get last transaction date
6. Calculate days since last transaction
7. Send reminder if 3+ days
8. Return result

**Skip Reasons**:

- `disabled`: Daily reminders disabled in preferences
- `quiet_hours`: Current time is in quiet hours
- `not_time`: Current time doesn't match reminder time
- `recent_transactions`: User has transactions within last 3 days

**Notification Format**:

```javascript
{
  title: "💰 Track Your Expenses",
  body: "It's been 5 days since your last transaction. Don't forget to log your expenses!",
  data: {
    type: "daily_reminder",
    daysSinceLastTransaction: 5
  }
}
```

## Event Handling

### EventBridge Scheduled Event

**Trigger**: Every 15 minutes

**Event Structure**:

```javascript
{
  "version": "0",
  "id": "...",
  "detail-type": "Scheduled Event",
  "source": "aws.events",
  "account": "...",
  "time": "...",
  "region": "...",
  "resources": ["..."],
  "detail": {}
}
```

**Processing**:

1. Get all users
2. Process in batches of 10
3. Send reminders to eligible users
4. Return results

## Batch Processing

**Batch Size**: 10 users per batch

**Logic**:

```javascript
const BATCH_SIZE = 10;
for (let i = 0; i < users.length; i += BATCH_SIZE) {
  const batch = users.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(
    batch.map((user) => sendDailyReminder(user)),
  );
}
```

**Benefits**:

- Prevents Lambda timeout (5 min limit)
- Parallel processing within batch
- Progress logging per batch

## Response Format

**Success Response**:

```json
{
  "statusCode": 200,
  "body": {
    "message": "Daily reminders completed",
    "totalUsers": 100,
    "remindersSent": 15,
    "skipped": 80,
    "errors": 5,
    "duration": 12500,
    "details": [
      { "userId": "user-1", "sent": true, "daysSinceLastTransaction": 5 },
      { "userId": "user-2", "sent": false, "reason": "recent_transactions" }
    ]
  }
}
```

**Error Response**:

```json
{
  "statusCode": 500,
  "body": {
    "error": "Daily reminders failed",
    "details": "Error message",
    "totalUsers": 100,
    "remindersSent": 10,
    "skipped": 85,
    "errors": 5
  }
}
```

## Testing

### Manual Testing

Test with EventBridge event:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-daily-reminders \
  --payload '{"source":"aws.events"}' \
  response.json \
  --profile hitechparadigm
```

Test with empty event:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-daily-reminders \
  --payload '{}' \
  response.json \
  --profile hitechparadigm
```

### View Logs

```bash
aws logs tail /aws/lambda/budgetbuddy-dev-daily-reminders --follow --profile hitechparadigm
```

## Logging

All operations are logged with emojis for easy scanning:

```javascript
console.log("🔔 Starting daily reminders job...");
console.log(`Found ${users.length} users`);
console.log(`✅ Daily reminder sent to user ${userId}`);
console.log("✅ Daily reminders job complete!");
console.error("❌ Daily reminders job failed:", error);
```

**Log Output Example**:

```
🔔 Starting daily reminders job...
Found 100 users
Processed batch 1/10
Processed batch 2/10
...
✅ Daily reminder sent to user user-123
✅ Daily reminders job complete!
   Total users: 100
   Reminders sent: 15
   Skipped: 80
   Errors: 5
   Duration: 12500ms
```

## Performance

- **Memory**: 1024 MB (for batch processing)
- **Timeout**: 300 seconds (5 minutes)
- **Average Duration**: 10-30 seconds (depends on user count)
- **Cold Start**: ~1 second
- **Batch Size**: 10 users per batch
- **Max Users**: ~1000 users per invocation

## Cost

- **Per Invocation**: ~$0.000005
- **Per Day** (96 invocations): ~$0.50
- **Per Month**: ~$15.00
- **Per Reminder Sent**: ~$0.0001

## Reminder Logic

### When Reminders Are Sent

1. **Daily reminders enabled** in preferences
2. **Not in quiet hours** (e.g., 10 PM - 8 AM)
3. **Reminder time matches** current time (±15 min)
4. **3+ days** since last transaction

### When Reminders Are Skipped

1. Daily reminders disabled
2. In quiet hours
3. Not reminder time
4. Recent transactions (< 3 days)

### Reminder Frequency

- **EventBridge**: Runs every 15 minutes
- **User Check**: Only sends if reminder time matches
- **Effective Frequency**: Once per day per user (at their reminder time)

## Quiet Hours Handling

**Purpose**: Prevent notifications during sleep hours

**Default**: 10 PM - 8 AM

**Logic**:

- Converts times to minutes since midnight
- Handles overnight quiet hours (e.g., 22:00 - 08:00)
- Checks if current time is within range

**Example**:

```javascript
// Quiet hours: 22:00 - 08:00
// 23:30 → In quiet hours (skip)
// 07:30 → In quiet hours (skip)
// 14:00 → Not in quiet hours (check other conditions)
```

## Reminder Time Window

**Purpose**: Allow flexibility in reminder delivery

**Window**: ±15 minutes from configured time

**Logic**:

- Calculates time difference in minutes
- Sends reminder if difference ≤ 15 minutes

**Example**:

```javascript
// Reminder time: 19:00
// 18:45 - 19:15 → Send reminder
// 19:20 → Skip (outside window)
```

## Deployment

Deployed via CDK as part of Notification Stack:

```bash
cd infrastructure
cdk deploy budgetbuddy-dev-notification --profile hitechparadigm
```

## Dependencies

- `aws-sdk`: AWS SDK for JavaScript

## Future Enhancements

- [ ] Add reminder history tracking
- [ ] Add reminder snoozing
- [ ] Add custom reminder messages
- [ ] Add reminder frequency options (daily, weekly)
- [ ] Add reminder escalation (repeated reminders)
- [ ] Add spending summary in reminders
- [ ] Add goal progress in reminders
- [ ] Add streak tracking (consecutive days)
- [ ] Add reminder analytics
- [ ] Add A/B testing for reminder messages

## Troubleshooting

### Reminders Not Sending

1. Check EventBridge rule is enabled
2. Verify Lambda function permissions
3. Check user preferences (reminders enabled?)
4. Verify reminder time matches current time
5. Check quiet hours settings
6. Check last transaction date calculation

### Too Many Reminders

1. Check reminder time window (should be ±15 min)
2. Verify EventBridge schedule (should be every 15 min)
3. Check for duplicate EventBridge rules
4. Verify reminder deduplication logic

### Lambda Timeouts

1. Check batch size (should be 10)
2. Verify user count (max ~1000 per invocation)
3. Check DynamoDB query performance
4. Increase Lambda timeout if needed
5. Increase Lambda memory if needed

### High Lambda Costs

1. Check EventBridge schedule (should be every 15 min, not more frequent)
2. Verify batch processing is working
3. Check for infinite loops
4. Review CloudWatch metrics
5. Optimize DynamoDB queries

## References

- [EventBridge Scheduled Rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
