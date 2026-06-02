# Design Document: Push Notifications and Daily Reminders

## Overview

This document provides the technical design for implementing push notifications and daily reminders in BudgetBuddy. The system enables users to receive timely budget alerts and expense tracking reminders across web and mobile platforms using AWS SNS, Expo Push Notifications, EventBridge, and DynamoDB Streams.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)              Mobile App (React Native + Expo)  │
│  - Settings UI                - Settings Screen                 │
│  - Notification History       - Push Notification Handler       │
│  - Device Registration        - Device Token Registration       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (REST)                          │
├─────────────────────────────────────────────────────────────────┤
│  POST /notifications/register-device                            │
│  DELETE /notifications/device/{deviceId}                        │
│  GET /notifications/preferences                                 │
│  PUT /notifications/preferences                                 │
│  GET /notifications/history                                     │
│  PUT /notifications/{notificationId}/read                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Lambda Functions                            │
├─────────────────────────────────────────────────────────────────┤
│  Notification Service    Budget Alerts Service                  │
│  - Device management     - Stream processing                    │
│  - Preferences CRUD      - Threshold detection                  │
│  - History management    - Alert generation                     │
│  - Push delivery         - Scheduled checks                     │
│                                                                  │
│  Daily Reminders Service                                        │
│  - User scanning                                                │
│  - Reminder scheduling                                          │
│  - Batch processing                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Event Sources                               │
├─────────────────────────────────────────────────────────────────┤
│  DynamoDB Streams        EventBridge Rules                      │
│  - Transaction events    - Daily reminders (every 15 min)       │
│  - Budget updates        - Budget checks (every 6 hours)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  DynamoDB Tables                                                │
│  - Main table (devices, preferences, notifications)             │
│  - GSI: DevicesByUser                                           │
│  - GSI: NotificationsByUser                                     │
│                                                                  │
│  Expo Push Notification API                                     │
│  - Push token validation                                        │
│  - Message delivery                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### Device Registration

**DynamoDB Schema:**

```typescript
{
  PK: "USER#<userId>",
  SK: "DEVICE#<deviceId>",
  deviceToken: string,           // Expo push token
  platform: "ios" | "android",
  enabled: boolean,
  registeredAt: string,          // ISO 8601
  lastUsedAt: string,            // ISO 8601
  TTL: number                    // 90 days from lastUsedAt
}
```

### Notification Preferences

**DynamoDB Schema:**

```typescript
{
  PK: "USER#<userId>",
  SK: "PREFERENCES#NOTIFICATIONS",
  budgetAlertsEnabled: boolean,
  dailyRemindersEnabled: boolean,
  reminderTime: string,          // HH:mm format (24-hour)
  quietHoursStart: string,       // HH:mm format
  quietHoursEnd: string,         // HH:mm format
  updatedAt: string              // ISO 8601
}
```

### Notification History

**DynamoDB Schema:**

```typescript
{
  PK: "USER#<userId>",
  SK: "NOTIFICATION#<timestamp>#<notificationId>",
  type: "budget_alert" | "daily_reminder",
  title: string,
  body: string,
  data: object,                  // Additional metadata
  severity: "low" | "medium" | "high",
  read: boolean,
  sentAt: string,                // ISO 8601
  TTL: number                    // 90 days from sentAt
}
```

### Budget Alert Tracking

**DynamoDB Schema:**

```typescript
{
  PK: "BUDGET#<budgetId>",
  SK: "ALERT#<budgetId>#<categoryId>#<threshold>",
  threshold: 80 | 90 | 100,
  sentAt: string,                // ISO 8601
  TTL: number                    // 90 days from sentAt
}
```

## API Design

### Device Registration

**POST /notifications/register-device**

Request:

```typescript
{
  deviceToken: string,           // Expo push token
  platform: "ios" | "android"
}
```

Response:

```typescript
{
  deviceId: string,
  message: "Device registered successfully"
}
```

**DELETE /notifications/device/{deviceId}**

Response:

```typescript
{
  message: "Device removed successfully";
}
```

### Notification Preferences

**GET /notifications/preferences**

Response:

```typescript
{
  budgetAlertsEnabled: boolean,
  dailyRemindersEnabled: boolean,
  reminderTime: string,
  quietHoursStart: string,
  quietHoursEnd: string
}
```

**PUT /notifications/preferences**

Request:

```typescript
{
  budgetAlertsEnabled?: boolean,
  dailyRemindersEnabled?: boolean,
  reminderTime?: string,
  quietHoursStart?: string,
  quietHoursEnd?: string
}
```

Response:

```typescript
{
  message: "Preferences updated successfully",
  preferences: { /* updated preferences */ }
}
```

### Notification History

**GET /notifications/history**

Query Parameters:

- `limit`: number (default: 50, max: 100)
- `lastEvaluatedKey`: string (for pagination)

Response:

```typescript
{
  notifications: Array<{
    notificationId: string,
    type: string,
    title: string,
    body: string,
    severity: string,
    read: boolean,
    sentAt: string
  }>,
  lastEvaluatedKey?: string
}
```

**PUT /notifications/{notificationId}/read**

Response:

```typescript
{
  message: "Notification marked as read";
}
```

## Lambda Function Designs

### 1. Notification Service Lambda

**Purpose**: Handle device registration, preferences, history, and push delivery

**Handler Structure:**

```javascript
exports.handler = async (event) => {
  const { httpMethod, path, pathParameters } = event;

  switch (httpMethod) {
    case "POST":
      if (path === "/notifications/register-device") {
        return registerDevice(event);
      }
      break;
    case "DELETE":
      if (path.startsWith("/notifications/device/")) {
        return removeDevice(event);
      }
      break;
    case "GET":
      if (path === "/notifications/preferences") {
        return getPreferences(event);
      }
      if (path === "/notifications/history") {
        return getHistory(event);
      }
      break;
    case "PUT":
      if (path === "/notifications/preferences") {
        return updatePreferences(event);
      }
      if (path.includes("/read")) {
        return markAsRead(event);
      }
      break;
  }
};
```

**Key Functions:**

1. `registerDevice(event)`: Validate and store device token
2. `removeDevice(event)`: Delete device registration
3. `getPreferences(event)`: Retrieve user notification preferences
4. `updatePreferences(event)`: Update notification preferences
5. `getHistory(event)`: Retrieve notification history with pagination
6. `markAsRead(event)`: Mark notification as read
7. `sendPushNotification(userId, notification)`: Send push to all user devices

**Dependencies:**

- AWS SDK (DynamoDB)
- Expo Push Notification SDK
- Shared utilities (CORS, token parsing, validation)

**IAM Permissions:**

- DynamoDB: GetItem, PutItem, UpdateItem, DeleteItem, Query
- Secrets Manager: GetSecretValue (for Expo credentials)

### 2. Budget Alerts Service Lambda

**Purpose**: Monitor budget spending and trigger alerts at thresholds

**Trigger Sources:**

1. DynamoDB Streams (real-time transaction events)
2. EventBridge scheduled rule (every 6 hours for missed alerts)

**Handler Structure:**

```javascript
exports.handler = async (event) => {
  // Check if triggered by DynamoDB Stream or EventBridge
  if (event.Records && event.Records[0].eventSource === "aws:dynamodb") {
    return handleStreamEvent(event);
  } else {
    return handleScheduledCheck(event);
  }
};

async function handleStreamEvent(event) {
  for (const record of event.Records) {
    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const newImage = AWS.DynamoDB.Converter.unmarshall(
        record.dynamodb.NewImage,
      );

      // Only process transaction records
      if (newImage.SK.startsWith("TRANSACTION#")) {
        await checkBudgetThresholds(newImage);
      }
    }
  }
}

async function checkBudgetThresholds(transaction) {
  // 1. Extract budgetId from transaction PK: 'BUDGET#<budgetId>'
  // 2. Get budget period for transaction's month
  // 3. Calculate spending percentage
  // 4. Check if threshold crossed (80%, 90%, 100%)
  // 5. Check if alert already sent (PK: BUDGET#<budgetId>, SK: ALERT#<key>)
  // 6. Send alert if needed
  // 7. Mark alert as sent
}
```

**Key Functions:**

1. `handleStreamEvent(event)`: Process DynamoDB stream records (transaction SK starts with `TXN#`)
2. `handleScheduledCheck(event)`: Scan budgets for missed alerts
3. `checkBudgetThresholds(transaction)`: Extract `budgetId` from `PK` (`BUDGET#<budgetId>`), calculate thresholds
4. `sendBudgetAlert(budgetId, budget, category, threshold)`: Send alert to all budget members
5. `hasAlertBeenSent(budgetId, categoryId, threshold)`: Check `PK: BUDGET#<budgetId>, SK: ALERT#<key>`
6. `markAlertAsSent(budgetId, categoryId, threshold)`: Write alert record under `BUDGET#<budgetId>`

**Dependencies:**

- AWS SDK (DynamoDB)
- Notification Service (for push delivery)
- Shared utilities

**IAM Permissions:**

- DynamoDB: GetItem, Query, PutItem, Scan
- DynamoDB Streams: GetRecords, GetShardIterator, DescribeStream
- Lambda: InvokeFunction (to call Notification Service)

### 3. Daily Reminders Service Lambda

**Purpose**: Send daily reminders to users who haven't logged transactions

**Trigger Source:**

- EventBridge scheduled rule (every 15 minutes)

**Handler Structure:**

```javascript
exports.handler = async (event) => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Get users whose reminder time matches current time (±15 min window)
  const users = await getUsersForReminder(currentHour, currentMinute);

  // Process in batches of 10 to avoid timeout
  for (let i = 0; i < users.length; i += 10) {
    const batch = users.slice(i, i + 10);
    await Promise.all(batch.map((user) => processUserReminder(user)));
  }
};

async function processUserReminder(user) {
  // 1. Check if reminders enabled
  // 2. Check if in quiet hours
  // 3. Get last transaction date
  // 4. If 3+ days since last transaction, send reminder
  // 5. Log reminder delivery
}
```

**Key Functions:**

1. `getUsersForReminder(hour, minute)`: Query users by reminder time
2. `processUserReminder(user)`: Check and send reminder for user
3. `isInQuietHours(currentTime, quietStart, quietEnd)`: Check quiet hours
4. `getLastTransactionDate(userId)`: Get user's last transaction
5. `sendDailyReminder(userId, daysSinceLastTransaction)`: Send reminder
6. `logReminderDelivery(userId, status)`: Log delivery status

**Dependencies:**

- AWS SDK (DynamoDB)
- Notification Service (for push delivery)
- Shared utilities

**IAM Permissions:**

- DynamoDB: Query, Scan, GetItem
- Lambda: InvokeFunction (to call Notification Service)

## EventBridge Configuration

### Daily Reminders Rule

**Schedule Expression:** `rate(15 minutes)`

**Target:** Daily Reminders Service Lambda

**Retry Policy:**

- Maximum retry attempts: 2
- Maximum event age: 1 hour

### Budget Alert Checks Rule

**Schedule Expression:** `rate(6 hours)`

**Target:** Budget Alerts Service Lambda

**Retry Policy:**

- Maximum retry attempts: 2
- Maximum event age: 2 hours

## DynamoDB Streams Configuration

### Main Table Stream

**Stream View Type:** NEW_AND_OLD_IMAGES

**Event Source Mapping:**

- Function: Budget Alerts Service Lambda
- Batch size: 10
- Starting position: LATEST
- Maximum retry attempts: 2
- Bisect batch on function error: true
- Filter pattern: Only TRANSACTION records

## Expo Push Notification Integration

### Token Validation

```javascript
function isValidExpoPushToken(token) {
  // Expo push tokens start with ExponentPushToken[
  return /^ExponentPushToken\[[\w-]+\]$/.test(token);
}
```

### Sending Notifications

```javascript
async function sendExpoPushNotification(deviceToken, notification) {
  const message = {
    to: deviceToken,
    sound: "default",
    title: notification.title,
    body: notification.body,
    data: notification.data,
    priority: notification.severity === "high" ? "high" : "default",
    badge: 1,
  };

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  return response.json();
}
```

## UI Component Designs

### Web: Notification Settings Component

**Location:** `packages/web-app/src/components/NotificationSettings.tsx`

**Component Structure:**

```typescript
interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => Promise<void>;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  onSave
}) => {
  return (
    <div className="notification-settings">
      <h3>Notification Preferences</h3>

      <div className="setting-group">
        <label>
          <input type="checkbox" checked={budgetAlertsEnabled} />
          Budget Alerts
        </label>
        <p>Receive alerts when spending reaches 80%, 90%, or 100% of budget</p>
      </div>

      <div className="setting-group">
        <label>
          <input type="checkbox" checked={dailyRemindersEnabled} />
          Daily Reminders
        </label>
        <p>Receive daily reminders to log expenses</p>
      </div>

      <div className="setting-group">
        <label>Reminder Time</label>
        <input type="time" value={reminderTime} />
      </div>

      <div className="setting-group">
        <label>Quiet Hours</label>
        <div className="time-range">
          <input type="time" value={quietHoursStart} />
          <span>to</span>
          <input type="time" value={quietHoursEnd} />
        </div>
      </div>

      <button onClick={handleSave}>Save Preferences</button>
    </div>
  );
};
```

### Mobile: Notification Settings Screen

**Location:** `packages/mobile/src/components/NotificationSettings.tsx`

**Component Structure:**

```typescript
export const NotificationSettings: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Budget Alerts</Text>
          <Switch value={budgetAlertsEnabled} onValueChange={setBudgetAlertsEnabled} />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Daily Reminders</Text>
          <Switch value={dailyRemindersEnabled} onValueChange={setDailyRemindersEnabled} />
        </View>

        <TouchableOpacity onPress={showReminderTimePicker}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Reminder Time</Text>
            <Text style={styles.settingValue}>{reminderTime}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={showQuietHoursPicker}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Quiet Hours</Text>
            <Text style={styles.settingValue}>
              {quietHoursStart} - {quietHoursEnd}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
```

### Mobile: Push Notification Handler

**Location:** `packages/mobile/src/services/notification.ts`

**Service Structure:**

```typescript
export class NotificationService {
  async registerDevice(): Promise<void> {
    // 1. Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Notification permissions not granted");
    }

    // 2. Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync();

    // 3. Register with backend
    await api.post("/notifications/register-device", {
      deviceToken: token.data,
      platform: Platform.OS,
    });
  }

  async setupNotificationHandlers(): Promise<void> {
    // Handle notifications when app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification);
    });

    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      this.handleNotificationTap(data);
    });
  }

  private handleNotificationTap(data: any): void {
    // Navigate based on notification type
    if (data.type === "budget_alert") {
      navigation.navigate("Budget", { budgetId: data.budgetId });
    } else if (data.type === "daily_reminder") {
      navigation.navigate("Transactions");
    }
  }
}
```

## Infrastructure as Code (CDK)

### Notification Stack

**Location:** `infrastructure/lib/notification-stack.ts`

**Stack Structure:**

```typescript
export class NotificationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NotificationStackProps) {
    super(scope, id, props);

    // 1. Create Notification Service Lambda
    const notificationFunction = new lambda.Function(
      this,
      "NotificationFunction",
      {
        functionName: "budgetbuddy-notifications",
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/functions/notifications"),
        layers: [props.commonLayer, props.sharedLayer],
        environment: {
          TABLE_NAME: props.table.tableName,
          EXPO_ACCESS_TOKEN: props.expoAccessToken,
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
      },
    );

    // 2. Create Budget Alerts Service Lambda
    const budgetAlertsFunction = new lambda.Function(
      this,
      "BudgetAlertsFunction",
      {
        functionName: "budgetbuddy-budget-alerts",
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/functions/budget-alerts"),
        layers: [props.commonLayer, props.sharedLayer],
        environment: {
          TABLE_NAME: props.table.tableName,
          NOTIFICATION_FUNCTION_ARN: notificationFunction.functionArn,
        },
        timeout: cdk.Duration.seconds(60),
        memorySize: 512,
      },
    );

    // 3. Create Daily Reminders Service Lambda
    const dailyRemindersFunction = new lambda.Function(
      this,
      "DailyRemindersFunction",
      {
        functionName: "budgetbuddy-daily-reminders",
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/functions/daily-reminders"),
        layers: [props.commonLayer, props.sharedLayer],
        environment: {
          TABLE_NAME: props.table.tableName,
          NOTIFICATION_FUNCTION_ARN: notificationFunction.functionArn,
        },
        timeout: cdk.Duration.seconds(300), // 5 minutes for batch processing
        memorySize: 1024,
      },
    );

    // 4. Grant DynamoDB permissions
    props.table.grantReadWriteData(notificationFunction);
    props.table.grantReadData(budgetAlertsFunction);
    props.table.grantReadData(dailyRemindersFunction);

    // 5. Grant Lambda invoke permissions
    notificationFunction.grantInvoke(budgetAlertsFunction);
    notificationFunction.grantInvoke(dailyRemindersFunction);

    // 6. Create DynamoDB Stream event source mapping
    budgetAlertsFunction.addEventSourceMapping("StreamMapping", {
      eventSourceArn: props.table.tableStreamArn,
      batchSize: 10,
      startingPosition: lambda.StartingPosition.LATEST,
      retryAttempts: 2,
      bisectBatchOnError: true,
      filters: [
        lambda.FilterCriteria.filter({
          eventName: lambda.FilterRule.isEqual("INSERT"),
          dynamodb: {
            NewImage: {
              SK: { S: lambda.FilterRule.beginsWith("TRANSACTION#") },
            },
          },
        }),
      ],
    });

    // 7. Create EventBridge rules
    const dailyRemindersRule = new events.Rule(this, "DailyRemindersRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      targets: [new targets.LambdaFunction(dailyRemindersFunction)],
    });

    const budgetAlertsRule = new events.Rule(this, "BudgetAlertsRule", {
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      targets: [new targets.LambdaFunction(budgetAlertsFunction)],
    });

    // 8. Create CloudWatch alarms
    this.createAlarms(
      notificationFunction,
      budgetAlertsFunction,
      dailyRemindersFunction,
    );

    // 9. Create CloudWatch dashboard
    this.createDashboard(
      notificationFunction,
      budgetAlertsFunction,
      dailyRemindersFunction,
    );
  }

  private createAlarms(...functions: lambda.Function[]): void {
    functions.forEach((fn) => {
      new cloudwatch.Alarm(this, `${fn.functionName}-ErrorAlarm`, {
        metric: fn.metricErrors(),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });

      new cloudwatch.Alarm(this, `${fn.functionName}-ThrottleAlarm`, {
        metric: fn.metricThrottles(),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
    });
  }
}
```

## Security Considerations

### 1. Device Token Security

- Store device tokens encrypted at rest in DynamoDB
- Validate Expo push token format before registration
- Implement device limit per user (max 10 devices)
- Auto-expire unused devices after 90 days (TTL)

### 2. Notification Content Security

- Never include sensitive data in notification body
- Use notification data field for navigation metadata only
- Validate all notification content before sending
- Sanitize user input in notification messages

### 3. API Security

- All endpoints require JWT authentication
- Validate user owns device before deletion
- Validate user owns notification before marking as read
- Rate limit notification API endpoints (100 req/min per user)

### 4. Expo Access Token Security

- Store Expo access token in AWS Secrets Manager
- Rotate token every 90 days
- Use IAM role for Lambda to access Secrets Manager
- Never log or expose access token

### 5. Quiet Hours Enforcement

- Validate quiet hours on server side
- Respect user preferences even if client sends request
- Log skipped notifications for audit trail

## Performance Considerations

### 1. Lambda Optimization

**Notification Service:**

- Memory: 512 MB
- Timeout: 30 seconds
- Provisioned concurrency: 2 (for low latency)

**Budget Alerts Service:**

- Memory: 512 MB
- Timeout: 60 seconds
- Reserved concurrency: 10 (to prevent throttling)

**Daily Reminders Service:**

- Memory: 1024 MB
- Timeout: 300 seconds (5 minutes)
- Batch processing: 10 users per batch

### 2. DynamoDB Optimization

**Access Patterns:**

1. Get devices by user → Query on PK
2. Get preferences by user → Query on PK
3. Get notifications by user → Query on PK with SK begins_with
4. Check alert sent → Query on PK with SK exact match

**GSI: DevicesByUser**

- PK: userId
- SK: deviceId
- Purpose: Fast device lookup for push delivery

**GSI: NotificationsByUser**

- PK: userId
- SK: sentAt (for sorting)
- Purpose: Fast notification history retrieval

### 3. Expo Push Notification Optimization

- Batch notifications (up to 100 per request)
- Use compression for large payloads
- Implement exponential backoff for retries
- Cache Expo access token in Lambda environment

### 4. EventBridge Optimization

- Daily reminders: Every 15 minutes (96 invocations/day)
- Budget alerts: Every 6 hours (4 invocations/day)
- Use Lambda concurrency limits to prevent cost spikes

## Monitoring and Observability

### CloudWatch Metrics

**Custom Metrics:**

1. `NotificationsSent` - Count of notifications sent
2. `NotificationsFailed` - Count of failed notifications
3. `DevicesRegistered` - Count of active devices
4. `AlertsTriggered` - Count of budget alerts triggered
5. `RemindersSent` - Count of daily reminders sent

**Lambda Metrics:**

1. Invocations
2. Errors
3. Duration (p50, p95, p99)
4. Throttles
5. Concurrent executions

### CloudWatch Alarms

**Critical Alarms:**

1. Error rate > 5% for 5 minutes
2. Throttles > 0 for 5 minutes
3. Duration p99 > 1 second for 5 minutes

**Warning Alarms:**

1. Error rate > 1% for 10 minutes
2. Duration p95 > 500ms for 10 minutes

### CloudWatch Logs

**Log Format:**

```json
{
  "timestamp": "2024-01-31T12:00:00Z",
  "level": "INFO",
  "requestId": "abc-123",
  "userId": "user-456",
  "action": "send_notification",
  "notificationType": "budget_alert",
  "deviceCount": 2,
  "success": true,
  "duration": 150
}
```

**Log Retention:**

- Dev: 7 days
- Prod: 30 days

### X-Ray Tracing

- Enable X-Ray for all Lambda functions
- Trace notification delivery end-to-end
- Identify performance bottlenecks
- Monitor external API calls (Expo)

## Testing Strategy

### Unit Tests

**Notification Service:**

1. Device registration validation
2. Preferences validation (time format, ranges)
3. Notification history pagination
4. Expo token format validation
5. Quiet hours calculation

**Budget Alerts Service:**

1. Threshold calculation (80%, 90%, 100%)
2. Alert deduplication logic
3. Family member notification logic
4. Stream event parsing
5. Alert history tracking

**Daily Reminders Service:**

1. Reminder time matching (±15 min window)
2. Quiet hours checking
3. Last transaction date calculation
4. Batch processing logic
5. User filtering by preferences

### Integration Tests

**End-to-End Flows:**

1. Device registration → Notification delivery
2. Transaction creation → Budget alert triggered
3. Daily reminder scheduled → Notification sent
4. Preferences update → Behavior change verified

**API Tests:**

1. Register device with valid token
2. Register device with invalid token (should fail)
3. Update preferences with valid data
4. Update preferences with invalid data (should fail)
5. Get notification history with pagination
6. Mark notification as read

### Property-Based Tests

**Properties to Test:**

1. **Time Window Matching**: For any reminder time T and current time C, if |T - C| ≤ 15 minutes, user should be included
2. **Quiet Hours**: For any notification time N and quiet hours [S, E], if S ≤ N ≤ E, notification should be skipped
3. **Threshold Detection**: For any spending S and budget B, if S/B ≥ threshold, alert should be triggered
4. **Alert Deduplication**: For any alert A sent at time T, no duplicate alert should be sent within 24 hours
5. **Batch Processing**: For any user list U of size N, processing in batches of B should process all N users exactly once

**Test Framework:** fast-check

**Example Property Test:**

```javascript
const fc = require("fast-check");

test("Reminder time matching property", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 23 }), // reminderHour
      fc.integer({ min: 0, max: 59 }), // reminderMinute
      fc.integer({ min: 0, max: 23 }), // currentHour
      fc.integer({ min: 0, max: 59 }), // currentMinute
      (reminderHour, reminderMinute, currentHour, currentMinute) => {
        const reminderTime = reminderHour * 60 + reminderMinute;
        const currentTime = currentHour * 60 + currentMinute;
        const diff = Math.abs(reminderTime - currentTime);

        const shouldMatch = diff <= 15 || diff >= 24 * 60 - 15;
        const actualMatch = isWithinReminderWindow(
          { hour: reminderHour, minute: reminderMinute },
          { hour: currentHour, minute: currentMinute },
        );

        return shouldMatch === actualMatch;
      },
    ),
  );
});
```

### Load Tests

**Scenarios:**

1. 1000 concurrent device registrations
2. 10,000 notifications sent in 1 minute
3. 100,000 users scanned for daily reminders
4. 1000 budget alerts triggered simultaneously

**Tools:** Artillery or k6

**Success Criteria:**

- p95 latency < 500ms
- p99 latency < 1000ms
- Error rate < 0.1%
- No throttling

## Deployment Strategy

### Phase 1: Infrastructure Setup (Week 1)

1. Deploy Notification Stack (CDK)
2. Create DynamoDB table with streams
3. Create EventBridge rules
4. Deploy Lambda functions
5. Configure CloudWatch alarms

### Phase 2: Backend Integration (Week 1)

1. Implement Notification Service Lambda
2. Implement Budget Alerts Service Lambda
3. Implement Daily Reminders Service Lambda
4. Add API Gateway routes
5. Test with Postman/curl

### Phase 3: Web Integration (Week 2)

1. Create NotificationSettings component
2. Add to Settings page
3. Implement device registration (web push)
4. Test notification delivery
5. Add notification history view

### Phase 4: Mobile Integration (Week 2)

1. Create NotificationSettings screen
2. Add to Settings tab
3. Implement device registration (Expo)
4. Test notification delivery
5. Add notification tap handling

### Phase 5: Testing and Rollout (Week 3)

1. Run full test suite
2. Deploy to staging environment
3. Beta test with 10 users
4. Monitor for 1 week
5. Deploy to production
6. Gradual rollout (10% → 50% → 100%)

## Rollback Plan

### Immediate Rollback (< 5 minutes)

1. Disable EventBridge rules (stop scheduled invocations)
2. Remove DynamoDB Stream event source mapping
3. Update API Gateway to return 503 for notification endpoints
4. Monitor error rates

### Full Rollback (< 30 minutes)

1. Revert CDK stack to previous version
2. Delete notification Lambda functions
3. Remove API Gateway routes
4. Restore previous frontend version
5. Notify users of temporary service disruption

### Rollback Triggers

- Error rate > 10% for 10 minutes
- Notification delivery failure rate > 50%
- Lambda throttling > 100 events/minute
- User complaints > 10 in 1 hour

## Cost Estimation

### Lambda Costs

**Notification Service:**

- Invocations: 100,000/month
- Duration: 200ms average
- Memory: 512 MB
- Cost: ~$0.50/month

**Budget Alerts Service:**

- Stream invocations: 50,000/month
- Scheduled invocations: 120/month
- Duration: 500ms average
- Memory: 512 MB
- Cost: ~$1.00/month

**Daily Reminders Service:**

- Invocations: 2,880/month (96/day)
- Duration: 5 seconds average
- Memory: 1024 MB
- Cost: ~$2.00/month

### DynamoDB Costs

- Storage: 1 GB (devices, preferences, notifications)
- Read capacity: 100 RCU
- Write capacity: 50 WCU
- Streams: Included
- Cost: ~$5.00/month

### EventBridge Costs

- Rules: 2
- Invocations: 3,000/month
- Cost: ~$0.10/month

### Expo Push Notifications

- Free tier: 1,000,000 notifications/month
- Cost: $0.00/month (within free tier)

### Total Monthly Cost

- Dev: ~$10/month
- Prod (10K users): ~$50/month
- Prod (100K users): ~$200/month

## Success Metrics

### Technical Metrics

- Notification delivery success rate > 99%
- Average delivery latency < 500ms
- Lambda error rate < 0.1%
- Zero security incidents

### User Metrics

- Device registration rate > 80% (mobile users)
- Notification opt-in rate > 60%
- Notification engagement rate > 40%
- User satisfaction score > 4.0/5.0

### Business Metrics

- Reduced user churn by 10%
- Increased daily active users by 15%
- Improved budget adherence by 20%
- Premium conversion rate increase by 5%

## Detailed Architecture Diagrams

### Lambda Function Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Notification Service Lambda                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐     │
│  │ Device           │    │ Preferences      │    │ History          │     │
│  │ Management       │    │ Management       │    │ Management       │     │
│  ├──────────────────┤    ├──────────────────┤    ├──────────────────┤     │
│  │ • Register       │    │ • Get            │    │ • Get history    │     │
│  │ • Remove         │    │ • Update         │    │ • Mark as read   │     │
│  │ • Validate token │    │ • Validate times │    │ • Pagination     │     │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Push Notification Delivery                       │    │
│  ├────────────────────────────────────────────────────────────────────┤    │
│  │ 1. Get all user devices from DynamoDB                              │    │
│  │ 2. Filter enabled devices                                          │    │
│  │ 3. Batch devices (max 100 per request)                             │    │
│  │ 4. Send to Expo Push API                                           │    │
│  │ 5. Handle delivery failures gracefully                             │    │
│  │ 6. Store notification in history                                   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       Budget Alerts Service Lambda                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    DynamoDB Stream Handler                          │    │
│  ├────────────────────────────────────────────────────────────────────┤    │
│  │ 1. Receive transaction event from stream                           │    │
│  │ 2. Parse transaction data                                          │    │
│  │ 3. Get budget for transaction                                      │    │
│  │ 4. Calculate category spending percentage                          │    │
│  │ 5. Check if threshold crossed (80%, 90%, 100%)                     │    │
│  │ 6. Check if alert already sent (24-hour deduplication)             │    │
│  │ 7. Send alert to all family members                                │    │
│  │ 8. Mark alert as sent                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Scheduled Check Handler                          │    │
│  ├────────────────────────────────────────────────────────────────────┤    │
│  │ 1. Scan all active budgets                                         │    │
│  │ 2. Calculate spending percentages                                  │    │
│  │ 3. Check for missed alerts                                         │    │
│  │ 4. Send alerts if needed                                           │    │
│  │ 5. Mark alerts as sent                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      Daily Reminders Service Lambda                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Reminder Scheduler                               │    │
│  ├────────────────────────────────────────────────────────────────────┤    │
│  │ 1. Get current time (hour and minute)                              │    │
│  │ 2. Calculate ±15 minute window                                     │    │
│  │ 3. Query users with matching reminder time                         │    │
│  │ 4. Process users in batches of 10                                  │    │
│  │ 5. For each user:                                                  │    │
│  │    a. Check if reminders enabled                                   │    │
│  │    b. Check if in quiet hours                                      │    │
│  │    c. Get last transaction date                                    │    │
│  │    d. If 3+ days since last transaction, send reminder             │    │
│  │ 6. Log reminder delivery status                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event Source Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Event Sources                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  DynamoDB Streams     │       │  EventBridge Rules    │
        ├───────────────────────┤       ├───────────────────────┤
        │ • Transaction INSERT  │       │ • Daily Reminders     │
        │ • Transaction MODIFY  │       │   (every 15 min)      │
        │ • Budget UPDATE       │       │ • Budget Checks       │
        │                       │       │   (every 6 hours)     │
        └───────────────────────┘       └───────────────────────┘
                    │                               │
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  Budget Alerts        │       │  Daily Reminders      │
        │  Service Lambda       │       │  Service Lambda       │
        │                       │       │                       │
        │  • Batch size: 10     │       │  • Batch size: 10     │
        │  • Retry: 2 attempts  │       │  • Retry: 2 attempts  │
        │  • Filter: TRANSACTION│       │  • Timeout: 5 min     │
        └───────────────────────┘       └───────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Notification Service │
                        │  Lambda               │
                        │                       │
                        │  • Send push          │
                        │  • Store history      │
                        │  • Handle failures    │
                        └───────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Expo Push API        │
                        │                       │
                        │  • Validate tokens    │
                        │  • Deliver messages   │
                        │  • Return receipts    │
                        └───────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  User Devices         │
                        │                       │
                        │  • iOS                │
                        │  • Android            │
                        └───────────────────────┘
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Budget Alert Data Flow                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. User creates transaction
        │
        ▼
2. Transaction stored in DynamoDB
        │
        ▼
3. DynamoDB Stream emits event
        │
        ▼
4. Budget Alerts Lambda receives event
        │
        ├─► Get budget for transaction
        │   (Query: PK=FAMILY#<familyId>, SK=BUDGET#<budgetId>)
        │
        ├─► Calculate category spending
        │   (Query: PK=FAMILY#<familyId>, SK begins_with TRANSACTION#)
        │
        ├─► Check threshold (80%, 90%, 100%)
        │   spending / budget >= threshold?
        │
        ├─► Check alert history
        │   (Query: PK=FAMILY#<familyId>, SK=ALERT#<budgetId>#<categoryId>#<threshold>)
        │   Alert sent in last 24 hours?
        │
        ├─► If threshold crossed and no recent alert:
        │   │
        │   ├─► Get all family members
        │   │   (Query: PK=FAMILY#<familyId>, SK begins_with USER#)
        │   │
        │   ├─► For each family member:
        │   │   │
        │   │   ├─► Call Notification Service Lambda
        │   │   │   (Invoke with userId, notification data)
        │   │   │
        │   │   └─► Notification Service:
        │   │       │
        │   │       ├─► Get user devices
        │   │       │   (Query: PK=USER#<userId>, SK begins_with DEVICE#)
        │   │       │
        │   │       ├─► Send to Expo Push API
        │   │       │   (POST https://exp.host/--/api/v2/push/send)
        │   │       │
        │   │       └─► Store in notification history
        │   │           (Put: PK=USER#<userId>, SK=NOTIFICATION#<timestamp>#<id>)
        │   │
        │   └─► Mark alert as sent
        │       (Put: PK=FAMILY#<familyId>, SK=ALERT#<budgetId>#<categoryId>#<threshold>)
        │
        └─► End


┌─────────────────────────────────────────────────────────────────────────────┐
│                       Daily Reminder Data Flow                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. EventBridge triggers Lambda (every 15 minutes)
        │
        ▼
2. Daily Reminders Lambda executes
        │
        ├─► Get current time (hour, minute)
        │
        ├─► Calculate time window (±15 minutes)
        │
        ├─► Query users with matching reminder time
        │   (Scan with filter: reminderTime in [currentTime - 15, currentTime + 15])
        │
        ├─► For each user (batch of 10):
        │   │
        │   ├─► Get user preferences
        │   │   (Query: PK=USER#<userId>, SK=PREFERENCES#NOTIFICATIONS)
        │   │
        │   ├─► Check if reminders enabled
        │   │   preferences.dailyRemindersEnabled === true?
        │   │
        │   ├─► Check if in quiet hours
        │   │   currentTime between quietHoursStart and quietHoursEnd?
        │   │
        │   ├─► Get last transaction date
        │   │   (Query: PK=USER#<userId>, SK begins_with TRANSACTION#, Limit=1, ScanIndexForward=false)
        │   │
        │   ├─► Calculate days since last transaction
        │   │   daysSince = (currentDate - lastTransactionDate) / 86400000
        │   │
        │   ├─► If daysSince >= 3 and not in quiet hours:
        │   │   │
        │   │   ├─► Call Notification Service Lambda
        │   │   │   (Invoke with userId, reminder notification)
        │   │   │
        │   │   └─► Notification Service:
        │   │       │
        │   │       ├─► Get user devices
        │   │       │   (Query: PK=USER#<userId>, SK begins_with DEVICE#)
        │   │       │
        │   │       ├─► Send to Expo Push API
        │   │       │   (POST https://exp.host/--/api/v2/push/send)
        │   │       │
        │   │       └─► Store in notification history
        │   │           (Put: PK=USER#<userId>, SK=NOTIFICATION#<timestamp>#<id>)
        │   │
        │   └─► Log reminder delivery
        │       (CloudWatch Logs)
        │
        └─► End
```

### DynamoDB Access Patterns Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DynamoDB Access Patterns                                │
└─────────────────────────────────────────────────────────────────────────────┘

Main Table:
  PK: USER#<userId> | FAMILY#<familyId>
  SK: DEVICE#<deviceId> | PREFERENCES#NOTIFICATIONS | NOTIFICATION#<timestamp>#<id> | ALERT#<budgetId>#<categoryId>#<threshold>

Access Pattern 1: Get all devices for a user
  Query:
    PK = USER#<userId>
    SK begins_with DEVICE#
  Use Case: Send push notification to all user devices
  Performance: O(1) - Single partition, efficient

Access Pattern 2: Get user notification preferences
  Query:
    PK = USER#<userId>
    SK = PREFERENCES#NOTIFICATIONS
  Use Case: Check if notifications enabled, get reminder time
  Performance: O(1) - Single item lookup

Access Pattern 3: Get notification history for a user
  Query:
    PK = USER#<userId>
    SK begins_with NOTIFICATION#
    Limit = 50
    ScanIndexForward = false (newest first)
  Use Case: Display notification history in UI
  Performance: O(1) - Single partition, paginated

Access Pattern 4: Check if alert already sent
  Query:
    PK = FAMILY#<familyId>
    SK = ALERT#<budgetId>#<categoryId>#<threshold>
  Use Case: Prevent duplicate alerts within 24 hours
  Performance: O(1) - Single item lookup

Access Pattern 5: Get users by reminder time (for daily reminders)
  Scan:
    FilterExpression: reminderTime between :start and :end
  Use Case: Find users to send reminders to
  Performance: O(n) - Full table scan (acceptable for scheduled job)
  Optimization: Consider GSI on reminderTime if user base grows large

Access Pattern 6: Get last transaction for user
  Query:
    PK = USER#<userId>
    SK begins_with TRANSACTION#
    Limit = 1
    ScanIndexForward = false (newest first)
  Use Case: Check days since last transaction for reminders
  Performance: O(1) - Single partition, single item

Access Pattern 7: Get all family members
  Query:
    PK = FAMILY#<familyId>
    SK begins_with USER#
  Use Case: Send budget alert to all family members
  Performance: O(1) - Single partition, efficient
```

### CloudWatch Monitoring Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BudgetBuddy Notifications Dashboard                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │  Lambda Invocations            │  │  Lambda Errors                 │   │
│  ├────────────────────────────────┤  ├────────────────────────────────┤   │
│  │  • Notification Service        │  │  • Error Rate (%)              │   │
│  │  • Budget Alerts Service       │  │  • Error Count                 │   │
│  │  • Daily Reminders Service     │  │  • By Function                 │   │
│  │  • Last 24 hours               │  │  • Last 24 hours               │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │  Lambda Duration (ms)          │  │  Lambda Throttles              │   │
│  ├────────────────────────────────┤  ├────────────────────────────────┤   │
│  │  • p50, p95, p99               │  │  • Throttle Count              │   │
│  │  • By Function                 │  │  • By Function                 │   │
│  │  • Last 24 hours               │  │  • Last 24 hours               │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │  Custom Metrics                │  │  DynamoDB Stream Metrics       │   │
│  ├────────────────────────────────┤  ├────────────────────────────────┤   │
│  │  • Notifications Sent          │  │  • Records Processed           │   │
│  │  • Notifications Failed        │  │  • Iterator Age                │   │
│  │  • Devices Registered          │  │  • Batch Size                  │   │
│  │  • Alerts Triggered            │  │  • Last 24 hours               │   │
│  │  • Reminders Sent              │  │                                │   │
│  │  • Last 24 hours               │  │                                │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │  EventBridge Metrics           │  │  Expo API Metrics              │   │
│  ├────────────────────────────────┤  ├────────────────────────────────┤   │
│  │  • Rule Invocations            │  │  • API Calls                   │   │
│  │  • Failed Invocations          │  │  • Success Rate                │   │
│  │  • By Rule                     │  │  • Error Rate                  │   │
│  │  • Last 24 hours               │  │  • Last 24 hours               │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Deployment Pipeline                                  │
└─────────────────────────────────────────────────────────────────────────────┘

GitHub Repository
        │
        ├─► Push to develop branch
        │   │
        │   ▼
        │   GitHub Actions CI/CD
        │   │
        │   ├─► Run validation
        │   │   • Security check (npm audit)
        │   │   • Linting (ESLint)
        │   │   • Type checking (TypeScript)
        │   │   • Unit tests (Jest)
        │   │   • Property-based tests (fast-check)
        │   │
        │   ├─► Build
        │   │   • CDK synth
        │   │   • Lambda packaging
        │   │   • Frontend build
        │   │
        │   ├─► Deploy to dev environment
        │   │   • CDK deploy (all stacks)
        │   │   • Lambda functions
        │   │   • API Gateway
        │   │   • EventBridge rules
        │   │   • DynamoDB Stream mappings
        │   │
        │   └─► Post-deployment health checks
        │       • API health endpoints
        │       • Smoke tests
        │       • Rollback on failure
        │
        └─► Merge to main branch
            │
            ▼
            GitHub Actions CI/CD
            │
            ├─► Run validation (same as above)
            │
            ├─► Build (same as above)
            │
            ├─► Deploy to staging environment
            │   • CDK deploy (all stacks)
            │   • Monitor for 1 week
            │
            └─► Manual approval for production
                │
                ▼
                Deploy to production
                • Gradual rollout (10% → 50% → 100%)
                • Monitor metrics
                • Rollback on issues
```
