# Notification Service Lambda

## Overview

The Notification Service Lambda handles push notification delivery, device management, notification preferences, and notification history for BudgetBuddy. It serves as the central hub for all notification-related operations.

## Purpose

- Register and manage device tokens for push notifications
- Store and retrieve notification preferences
- Send push notifications via Expo Push Notification API
- Maintain notification history with read/unread status
- Support multiple devices per user

## Handler Function

**Entry Point**: `exports.handler`

**Trigger**: API Gateway HTTP requests

**Supported Methods**:

- POST `/notifications/register-device` - Register device for push notifications
- DELETE `/notifications/device/{deviceId}` - Remove device registration
- GET `/notifications/preferences` - Get notification preferences
- PUT `/notifications/preferences` - Update notification preferences
- GET `/notifications/history` - Get notification history
- PUT `/notifications/{notificationId}/read` - Mark notification as read
- POST `/notifications/send` - Send push notification (internal use)

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: `budgetbuddy-main`)
- `EXPO_ACCESS_TOKEN`: Expo push notification access token
- `SNS_TOPIC_ARN`: AWS SNS topic ARN (optional)

## IAM Permissions Required

- **DynamoDB**:
  - `dynamodb:GetItem` - Get notification preferences
  - `dynamodb:PutItem` - Store devices, preferences, notifications
  - `dynamodb:DeleteItem` - Remove device registrations
  - `dynamodb:Query` - Get user devices and notification history
  - `dynamodb:UpdateItem` - Mark notifications as read

- **SNS** (optional):
  - `sns:Subscribe` - Subscribe device to SNS topic
  - `sns:Unsubscribe` - Unsubscribe device from SNS topic

- **Secrets Manager** (future):
  - `secretsmanager:GetSecretValue` - Get Expo access token

## API Endpoints

### Register Device

**POST** `/notifications/register-device`

**Request Body**:

```json
{
  "userId": "user-123",
  "deviceToken": "ExponentPushToken[xxxxxx]",
  "platform": "ios"
}
```

**Response**:

```json
{
  "success": true,
  "deviceToken": "ExponentPushToken[xxxxxx]"
}
```

**Errors**:

- 400: Missing required fields
- 500: Internal server error

### Remove Device

**DELETE** `/notifications/device/{deviceId}`

**Request Body**:

```json
{
  "userId": "user-123",
  "deviceToken": "ExponentPushToken[xxxxxx]"
}
```

**Response**:

```json
{
  "success": true
}
```

### Get Preferences

**GET** `/notifications/preferences?userId=user-123`

**Response**:

```json
{
  "budgetAlerts": true,
  "dailyReminders": true,
  "reminderTime": "19:00",
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00"
}
```

**Default Preferences**:

- Budget alerts: Enabled
- Daily reminders: Enabled
- Reminder time: 7:00 PM
- Quiet hours: 10:00 PM - 8:00 AM

### Update Preferences

**PUT** `/notifications/preferences`

**Request Body**:

```json
{
  "userId": "user-123",
  "preferences": {
    "budgetAlerts": false,
    "dailyReminders": true,
    "reminderTime": "20:00",
    "quietHoursStart": "23:00",
    "quietHoursEnd": "07:00"
  }
}
```

**Response**:

```json
{
  "success": true,
  "preferences": { ... }
}
```

### Send Notification (Internal)

**POST** `/notifications/send`

**Request Body**:

```json
{
  "userId": "user-123",
  "notification": {
    "title": "Budget Alert",
    "body": "You've spent 80% of your Groceries budget",
    "data": {
      "type": "budget_alert",
      "budgetId": "budget-456",
      "categoryId": "cat-789"
    }
  }
}
```

**Response**:

```json
{
  "success": true,
  "deviceCount": 2
}
```

## Data Models

### Device Registration

```javascript
{
  PK: "USER#<userId>",
  SK: "DEVICE#<deviceToken>",
  deviceToken: string,
  platform: "ios" | "android",
  registeredAt: string (ISO 8601),
  enabled: boolean,
  TTL: number (90 days from lastUsedAt)
}
```

### Notification Preferences

```javascript
{
  PK: "USER#<userId>",
  SK: "NOTIFICATION_PREFERENCES",
  budgetAlerts: boolean,
  dailyReminders: boolean,
  reminderTime: string (HH:mm),
  quietHoursStart: string (HH:mm),
  quietHoursEnd: string (HH:mm),
  updatedAt: string (ISO 8601)
}
```

### Notification History

```javascript
{
  PK: "USER#<userId>",
  SK: "NOTIFICATION#<timestamp>",
  title: string,
  body: string,
  data: object,
  sentAt: string (ISO 8601),
  read: boolean,
  TTL: number (90 days from sentAt)
}
```

## Functions

### `registerDeviceToken(userId, deviceToken, platform)`

Registers a device token for push notifications.

**Parameters**:

- `userId`: User ID
- `deviceToken`: Expo push token
- `platform`: "ios" or "android"

**Returns**: `{ success: true, deviceToken }`

**Throws**: Error if registration fails

### `unregisterDeviceToken(userId, deviceToken)`

Removes a device token registration.

**Parameters**:

- `userId`: User ID
- `deviceToken`: Expo push token

**Returns**: `{ success: true }`

**Throws**: Error if deletion fails

### `getUserDeviceTokens(userId)`

Gets all enabled device tokens for a user.

**Parameters**:

- `userId`: User ID

**Returns**: Array of `{ token, platform }` objects

**Throws**: Error if query fails

### `sendExpoPushNotification(tokens, title, body, data)`

Sends push notifications via Expo Push Notification API.

**Parameters**:

- `tokens`: Array of Expo push tokens
- `title`: Notification title
- `body`: Notification body
- `data`: Additional data object

**Returns**: Expo API response

**Throws**: Error if API call fails

### `sendNotification(userId, notification)`

Sends a notification to all user devices and stores in history.

**Parameters**:

- `userId`: User ID
- `notification`: `{ title, body, data }` object

**Returns**: `{ success: true, deviceCount }`

**Throws**: Error if sending fails

### `getNotificationPreferences(userId)`

Gets notification preferences for a user.

**Parameters**:

- `userId`: User ID

**Returns**: Preferences object or default preferences

**Throws**: Error if query fails

### `updateNotificationPreferences(userId, preferences)`

Updates notification preferences for a user.

**Parameters**:

- `userId`: User ID
- `preferences`: Preferences object

**Returns**: `{ success: true, preferences }`

**Throws**: Error if update fails

## Testing

### Unit Tests

Run unit tests:

```bash
npm test
```

### Manual Testing

Test device registration:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-notifications \
  --payload '{"httpMethod":"POST","path":"/notifications/register-device","body":"{\"userId\":\"test-user\",\"deviceToken\":\"ExponentPushToken[test]\",\"platform\":\"ios\"}"}' \
  response.json \
  --profile hitechparadigm
```

Test get preferences:

```bash
aws lambda invoke \
  --function-name budgetbuddy-dev-notifications \
  --payload '{"httpMethod":"GET","path":"/notifications/preferences","queryStringParameters":{"userId":"test-user"}}' \
  response.json \
  --profile hitechparadigm
```

### View Logs

```bash
aws logs tail /aws/lambda/budgetbuddy-dev-notifications --follow --profile hitechparadigm
```

## Error Handling

All errors are caught and returned with appropriate HTTP status codes:

- **400 Bad Request**: Missing required fields or invalid input
- **404 Not Found**: Endpoint not found
- **500 Internal Server Error**: Unexpected errors

Error response format:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Logging

All requests and errors are logged to CloudWatch Logs with structured JSON format:

```javascript
console.log("Notification request:", JSON.stringify(event, null, 2));
console.error("Error sending notification:", error);
```

## Security

- All endpoints require JWT authentication (enforced by API Gateway)
- Device tokens are validated before registration
- User can only access their own devices and preferences
- Notification history is user-scoped
- CORS headers configured for allowed origins

## Performance

- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Provisioned Concurrency**: 2 (for low latency)
- **Average Duration**: 200ms
- **Cold Start**: ~500ms

## Cost

- **Per Invocation**: ~$0.000001
- **Per Month** (10K users, 100K invocations): ~$0.50
- **Expo Push Notifications**: Free tier (1M/month)

## Deployment

Deployed via CDK as part of Notification Stack:

```bash
cd infrastructure
cdk deploy budgetbuddy-dev-notification --profile hitechparadigm
```

## Dependencies

- `aws-sdk`: AWS SDK for JavaScript
- Expo Push Notification API (external)

## Future Enhancements

- [ ] Add notification history pagination
- [ ] Add mark as read endpoint
- [ ] Add batch notification sending
- [ ] Add notification templates
- [ ] Add notification scheduling
- [ ] Add notification analytics
- [ ] Add push notification receipts tracking
- [ ] Add device token validation with Expo API
- [ ] Add notification priority levels
- [ ] Add notification grouping

## Troubleshooting

### No Notifications Received

1. Check device is registered: Query DynamoDB for `USER#<userId>` with SK `DEVICE#*`
2. Verify Expo push token format: Should start with `ExponentPushToken[`
3. Check notification preferences: Ensure alerts/reminders are enabled
4. Check CloudWatch logs for errors
5. Verify Expo access token is correct

### Device Registration Fails

1. Check Expo push token format
2. Verify DynamoDB permissions
3. Check CloudWatch logs for errors
4. Ensure TABLE_NAME environment variable is set

### Preferences Not Saving

1. Check request body format
2. Verify DynamoDB permissions
3. Check CloudWatch logs for errors
4. Ensure userId is provided

## References

- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
