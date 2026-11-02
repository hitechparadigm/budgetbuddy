# Notifications Lambda Function

## Overview

The Notifications Lambda function manages in-app notifications for budget alerts, family activities, and system messages. It provides a comprehensive notification system that supports multiple notification types, user preferences, and read/unread tracking.

## Features

- Create and manage in-app notifications
- Mark notifications as read/unread
- Filter notifications by type and status
- User notification preferences
- Notification history tracking
- Support for multiple notification types

## API Endpoints

### Public Endpoints

#### GET /notifications/health

Health check endpoint (no authentication required).

**Response:**

```json
{
  "status": "healthy",
  "service": "notifications"
}
```

### Authenticated Endpoints

All endpoints below require a valid JWT token in the Authorization header.

#### GET /notifications

Get notifications for the authenticated user.

**Query Parameters:**

- `limit` (optional): Number of notifications to return (default: 50, max: 100)
- `unreadOnly` (optional): Filter to unread notifications only (true/false, default: false)
- `type` (optional): Filter by notification type (budget_alert, family_activity, system_message, etc.)

**Response:**

```json
{
  "notifications": [
    {
      "notificationId": "notif_1234567890_abc123",
      "userId": "user-123",
      "type": "budget_alert",
      "title": "Budget Alert: Groceries",
      "message": "You've spent 90% of your Groceries budget for this month",
      "metadata": {
        "categoryId": "cat-123",
        "categoryName": "Groceries",
        "percentSpent": 90
      },
      "isRead": false,
      "createdAt": "2026-02-05T10:30:00Z"
    }
  ],
  "count": 1
}
```

#### GET /notifications/{notificationId}

Get a single notification by ID.

**Response:**

```json
{
  "notificationId": "notif_1234567890_abc123",
  "userId": "user-123",
  "type": "budget_alert",
  "title": "Budget Alert: Groceries",
  "message": "You've spent 90% of your Groceries budget for this month",
  "metadata": {},
  "isRead": false,
  "createdAt": "2026-02-05T10:30:00Z"
}
```

#### PUT /notifications/{notificationId}/read

Mark a notification as read.

**Response:**

```json
{
  "notificationId": "notif_1234567890_abc123",
  "userId": "user-123",
  "type": "budget_alert",
  "title": "Budget Alert: Groceries",
  "message": "You've spent 90% of your Groceries budget for this month",
  "metadata": {},
  "isRead": true,
  "readAt": "2026-02-05T11:00:00Z",
  "createdAt": "2026-02-05T10:30:00Z"
}
```

#### PUT /notifications/read-all

Mark all notifications as read for the authenticated user.

**Response:**

```json
{
  "updated": 5
}
```

#### DELETE /notifications/{notificationId}

Delete a notification.

**Response:** 204 No Content

#### GET /notifications/settings

Get notification preferences for the authenticated user.

**Response:**

```json
{
  "budgetAlerts": true,
  "familyActivity": true,
  "systemMessages": true,
  "emailNotifications": false
}
```

#### PUT /notifications/settings

Update notification preferences.

**Request Body:**

```json
{
  "budgetAlerts": true,
  "familyActivity": false,
  "systemMessages": true,
  "emailNotifications": true
}
```

**Response:**

```json
{
  "budgetAlerts": true,
  "familyActivity": false,
  "systemMessages": true,
  "emailNotifications": true
}
```

### Internal Endpoints

#### POST /notifications/create

Create a notification (internal use only, called by other Lambda functions).

**Request Body:**

```json
{
  "userId": "user-123",
  "type": "budget_alert",
  "title": "Budget Alert: Groceries",
  "message": "You've spent 90% of your Groceries budget for this month",
  "metadata": {
    "categoryId": "cat-123",
    "categoryName": "Groceries",
    "percentSpent": 90
  }
}
```

**Response:**

```json
{
  "notificationId": "notif_1234567890_abc123",
  "userId": "user-123",
  "type": "budget_alert",
  "title": "Budget Alert: Groceries",
  "message": "You've spent 90% of your Groceries budget for this month",
  "metadata": {
    "categoryId": "cat-123",
    "categoryName": "Groceries",
    "percentSpent": 90
  },
  "isRead": false,
  "createdAt": "2026-02-05T10:30:00Z"
}
```

## Data Model

### Notification Object

```typescript
interface Notification {
  notificationId: string; // Primary key: "notif_{timestamp}_{random}"
  userId: string; // User who receives the notification
  type: NotificationType; // Type of notification
  title: string; // Notification title (short)
  message: string; // Notification message (detailed)
  metadata: object; // Additional context (category, amount, etc.)
  isRead: boolean; // Read status
  readAt?: string; // ISO timestamp when marked as read
  createdAt: string; // ISO timestamp when created
}

type NotificationType =
  | "budget_alert" // Budget threshold alerts (80%, 90%, 100%)
  | "family_activity" // Family member actions (transaction added, budget changed)
  | "system_message" // System announcements, updates
  | "bill_reminder" // Upcoming bill due dates
  | "savings_goal" // Savings goal milestones
  | "debt_payoff" // Debt payoff progress
  | "subscription_renewal" // Subscription renewal reminders
  | "spending_insight" // Weekly spending insights
  | "achievement" // Badges and achievements
  | "credit_score_change"; // Credit score updates
```

### Notification Settings Object

```typescript
interface NotificationSettings {
  userId: string; // Primary key
  settingType: "notifications"; // Sort key
  settings: {
    budgetAlerts: boolean;
    familyActivity: boolean;
    systemMessages: boolean;
    emailNotifications: boolean;
  };
  updatedAt: string; // ISO timestamp
}
```

## DynamoDB Items

Notifications and devices live in the single table `budgetbuddy-main` (there are no separate
notification or settings tables):

| Item | PK | SK |
|---|---|---|
| Registered device | `USER#<userId>` | `DEVICE#<deviceToken>` |
| Notification | `USER#<userId>` | `NOTIFICATION#<id>` |

Full key layout: [docs/architecture.md](../../../docs/architecture.md#5-data-model).

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default `budgetbuddy-main`)
- `EXPO_ACCESS_TOKEN`: Expo push access token

## IAM Permissions

The notification stack grants the function read/write access to `budgetbuddy-main`
(`grantReadWriteData`), scoped to that table.

## Usage Examples

### Creating a Notification from Another Service

```javascript
// AWS SDK v3 (SDK v2 `aws-sdk` is not available on Node.js 20)
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const lambda = new LambdaClient({});

const params = {
  FunctionName: "budgetbuddy-dev-notifications",
  InvocationType: "Event", // Async invocation
  Payload: JSON.stringify({
    httpMethod: "POST",
    path: "/notifications/create",
    body: JSON.stringify({
      userId: "user-123",
      type: "budget_alert",
      title: "Budget Alert: Groceries",
      message: "You've spent 90% of your Groceries budget",
      metadata: {
        categoryId: "cat-123",
        categoryName: "Groceries",
        percentSpent: 90,
      },
    }),
  }),
};

await lambda.send(new InvokeCommand(params));
```

### Frontend Integration

```typescript
// Get unread notifications
const response = await fetch("/notifications?unreadOnly=true", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
const { notifications, count } = await response.json();

// Mark notification as read
await fetch(`/notifications/${notificationId}/read`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

// Update notification settings
await fetch("/notifications/settings", {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    budgetAlerts: true,
    familyActivity: false,
    systemMessages: true,
    emailNotifications: true,
  }),
});
```

## Testing

Run unit tests:

```bash
cd backend/functions/notifications
npm test
```

## Deployment

The function (`budgetbuddy-<env>-notifications`) is part of the notification stack
(`infrastructure/lib/notification-stack.ts`); the Main API routes `/notifications` to it. It deploys
with all stacks through GitHub Actions; see [docs/deployment-guide.md](../../../docs/deployment-guide.md).

## Future Enhancements

1. **Push Notifications**: Integrate with SNS/Firebase for mobile push notifications
2. **Email Notifications**: Send email digests for important notifications
3. **Notification Batching**: Group similar notifications to reduce noise
4. **Smart Notifications**: Use AI to determine optimal notification timing
5. **Notification Templates**: Reusable templates for common notification types
6. **Notification Scheduling**: Schedule notifications for future delivery
7. **Notification Analytics**: Track open rates, engagement metrics
