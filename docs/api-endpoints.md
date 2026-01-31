# API Endpoints Documentation

**Base URL**: `https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1`
**Last Updated**: 2026-01-05
**API Version**: 1.1 (Security Enhanced)

## Authentication

All endpoints except health checks require JWT authentication via `Authorization: Bearer <token>` header.

### 🔒 Security Enhancements (v1.1)

**Comprehensive Security Validation**: All API endpoints now include enhanced security measures:

- **Automated Secret Detection**: Repository scanned for exposed JWT tokens, AWS credentials, and hardcoded passwords
- **Environment Variable Enforcement**: All sensitive configuration uses environment variables
- **CORS Security**: Proper CORS configuration with specific origins (no wildcard with credentials)
- **Token Validation**: Enhanced JWT token validation with proper error handling
- **Security Headers**: All responses include appropriate security headers
- **Rate Limiting**: Enhanced rate limiting to prevent abuse

**Security Monitoring**:

- Pre-deployment security scans block deployments if vulnerabilities detected
- Pull request security validation prevents vulnerable code merges
- Comprehensive security documentation and incident response procedures

### Mobile Authentication Support

The API now supports mobile authentication through AWS Cognito with the following enhancements:

- **Cross-Platform Token Storage**: Secure token storage using Expo SecureStore (mobile) and localStorage (web)
- **Automatic Token Refresh**: Background token refresh to maintain session continuity
- **Email Verification**: Complete email confirmation flow for mobile registration
- **Password Reset**: Mobile-optimized password reset functionality
- **Session Management**: Configurable session timeouts and inactivity detection

### Auth Endpoints

#### POST /auth/register

Register a new user account.

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "your-secure-password-here",
  "firstName": "John",
  "lastName": "Doe",
  "currency": "USD",
  "locale": "en-US"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "currency": "USD",
    "locale": "en-US"
  }
}
```

**Currency Field**:

- **Type**: String (ISO 4217 currency code)
- **Required**: No (defaults to "USD")
- **Supported Values**: USD, EUR, GBP, CAD, AUD, JPY
- **Description**: User's preferred currency for budgets and transactions

#### POST /auth/login

Authenticate user and get JWT tokens.

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "your-password-here"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

## Budget Management

### GET /budget/health

Health check for budget service.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "budget",
    "version": "1.0.0"
  }
}
```

### GET /budget

Get all budgets for the authenticated user's family.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "budgetId": "budget_123",
        "month": "2025-11",
        "currency": "USD",
        "totalIncome": 5000,
        "totalExpenses": 4000,
        "remainingBalance": 1000,
        "groups": {
          "income": [...],
          "expenses": [...]
        }
      }
    ]
  }
}
```

### POST /budget

Create a new budget.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "month": "2025-11",
  "currency": "USD",
  "groups": {
    "income": [
      {
        "name": "Salary",
        "categories": [
          {
            "name": "Primary Job",
            "plannedAmount": 5000
          }
        ]
      }
    ],
    "expenses": [
      {
        "name": "Housing",
        "categories": [
          {
            "name": "Rent",
            "plannedAmount": 1500
          }
        ]
      }
    ]
  }
}
```

**Currency Field**:

- **Type**: String (ISO 4217 currency code)
- **Required**: No (defaults to user's profile currency)
- **Supported Values**: USD, EUR, GBP, CAD, AUD, JPY
- **Description**: Currency for all amounts in this budget
- **Note**: Once set, the budget currency cannot be changed

## Transaction Management

### GET /transactions/health

Health check for transaction service.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "transactions",
    "version": "1.0.0"
  }
}
```

### GET /transactions

Get all transactions with optional filtering.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `categoryId` (optional): Filter by category ID
- `type` (optional): Filter by type (`income` or `expense`)
- `limit` (optional): Limit number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example**: `GET /transactions?type=expense&startDate=2025-11-01&limit=10`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "transactionId": "txn_123",
        "familyId": "family_456",
        "userId": "user_789",
        "amount": 50.0,
        "currency": "USD",
        "type": "expense",
        "categoryId": "cat_groceries_001",
        "description": "Weekly grocery shopping",
        "merchant": "Whole Foods",
        "transactionDate": "2025-11-01",
        "budgetMonth": "2025-11",
        "createdAt": "2025-11-01T10:00:00Z",
        "updatedAt": "2025-11-01T10:00:00Z"
      }
    ],
    "count": 1,
    "pagination": {
      "limit": 50,
      "offset": 0
    }
  }
}
```

### POST /transactions

Create a new transaction.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "amount": 50.0,
  "currency": "USD",
  "type": "expense",
  "categoryId": "cat_groceries_001",
  "description": "Weekly grocery shopping",
  "merchant": "Whole Foods",
  "date": "2025-11-01"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transactionId": "txn_123",
    "familyId": "family_456",
    "amount": 50.0,
    "currency": "USD",
    "type": "expense",
    "categoryId": "cat_groceries_001",
    "description": "Weekly grocery shopping",
    "merchant": "Whole Foods",
    "transactionDate": "2025-11-01",
    "budgetMonth": "2025-11",
    "createdAt": "2025-11-01T10:00:00Z"
  }
}
```

**Currency Field**:

- **Type**: String (ISO 4217 currency code)
- **Required**: No (defaults to budget's currency)
- **Supported Values**: USD, EUR, GBP, CAD, AUD, JPY
- **Description**: Currency for the transaction amount
- **Note**: Should match the budget's currency for proper tracking

### GET /transactions/{transactionId}

Get a specific transaction by ID.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "transaction": {
      "transactionId": "txn_123",
      "familyId": "family_456",
      "amount": 50.0,
      "type": "expense",
      "categoryId": "cat_groceries_001",
      "description": "Weekly grocery shopping",
      "merchant": "Whole Foods",
      "transactionDate": "2025-11-01"
    }
  }
}
```

### PUT /transactions/{transactionId}

Update an existing transaction.

**Headers**: `Authorization: Bearer <token>`

**Request Body** (all fields optional):

```json
{
  "amount": 75.0,
  "description": "Updated: Weekly grocery shopping with extras",
  "merchant": "Whole Foods Market"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Transaction updated successfully",
  "data": {
    "transaction": {
      "transactionId": "txn_123",
      "amount": 75.0,
      "description": "Updated: Weekly grocery shopping with extras",
      "updatedAt": "2025-11-01T11:00:00Z"
    }
  }
}
```

### DELETE /transactions/{transactionId}

Delete a transaction (soft delete for audit trail).

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Transaction deleted successfully",
  "data": {
    "transactionId": "txn_123",
    "deletedAt": "2025-11-01T12:00:00Z"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request

```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Amount must be positive",
  "timestamp": "2025-11-01T10:00:00Z"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Invalid or missing authorization token",
  "timestamp": "2025-11-01T10:00:00Z"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Resource not found",
  "message": "Transaction not found with ID txn_123",
  "timestamp": "2025-11-01T10:00:00Z"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An error occurred processing your request",
  "timestamp": "2025-11-01T10:00:00Z"
}
```

## Rate Limits

- **Authentication endpoints**: 10 requests per minute per IP
- **CRUD operations**: 100 requests per minute per user
- **Health checks**: No rate limit

## Testing

### Health Check (No Auth Required)

```bash
curl https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/transactions/health
```

### With Authentication

```bash
# Get access token first via login
TOKEN="your_jwt_token_here"

# Create transaction
curl -X POST https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "type": "expense",
    "categoryId": "cat_groceries_001",
    "description": "Test transaction",
    "date": "2025-11-01"
  }'

# Get transactions
curl -X GET https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/transactions \
  -H "Authorization: Bearer $TOKEN"
```

## SDK Usage

### JavaScript/TypeScript

```typescript
import { transactionApi } from "./services/api";

// Create transaction
const transaction = await transactionApi.createTransaction({
  amount: 50.0,
  type: "expense",
  categoryId: "cat_groceries_001",
  description: "Weekly groceries",
  date: "2025-11-01",
});

// Get transactions
const transactions = await transactionApi.getTransactions({
  type: "expense",
  startDate: "2025-11-01",
});
```

## Changelog

### 2026-01-05 (v1.1 - Security Enhanced)

- 🔒 **CRITICAL SECURITY UPDATE**: Resolved GitGuardian alert for exposed secrets
- ✅ Removed all exposed JWT tokens and credentials from repository
- ✅ Implemented comprehensive security validation system
- ✅ Enhanced CI/CD with automated security scanning
- ✅ Added security documentation and incident response procedures
- ✅ Updated CORS configuration for proper credential handling
- ✅ Added environment variable enforcement for sensitive data

### 2025-11-01

- ✅ Added complete transaction CRUD endpoints
- ✅ Enhanced error handling with field-specific validation
- ✅ Added comprehensive filtering and pagination
- ✅ Integrated budget recalculation on transaction changes

### Previous versions

- Budget CRUD endpoints
- Authentication system
- Health check endpoints

## Multi-Currency Support

### Overview

BudgetBuddy supports 6 major currencies for international users. Currency is set at the user profile level and applies to all budgets and transactions.

## Push Notifications

### Overview

BudgetBuddy supports push notifications for budget alerts and daily reminders. Users can manage notification preferences and view notification history.

### POST /notifications/register-device

Register a device for push notifications.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "deviceId": "device_123",
    "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "ios",
    "enabled": true,
    "registeredAt": "2026-01-31T10:00:00Z"
  }
}
```

### DELETE /notifications/device/{deviceId}

Remove a registered device.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Device removed successfully"
}
```

### GET /notifications/preferences

Get notification preferences for the authenticated user.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "budgetAlertsEnabled": true,
    "dailyRemindersEnabled": true,
    "reminderTime": "09:00",
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00"
  }
}
```

### PUT /notifications/preferences

Update notification preferences.

**Headers**: `Authorization: Bearer <token>`

**Request Body** (all fields optional):

```json
{
  "budgetAlertsEnabled": true,
  "dailyRemindersEnabled": false,
  "reminderTime": "10:00",
  "quietHoursStart": "23:00",
  "quietHoursEnd": "07:00"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "budgetAlertsEnabled": true,
    "dailyRemindersEnabled": false,
    "reminderTime": "10:00",
    "quietHoursStart": "23:00",
    "quietHoursEnd": "07:00",
    "updatedAt": "2026-01-31T10:00:00Z"
  }
}
```

### GET /notifications/history

Get notification history with pagination.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `limit` (optional): Number of notifications to return (default: 50, max: 100)
- `lastEvaluatedKey` (optional): Pagination token from previous response

**Example**: `GET /notifications/history?limit=20`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notificationId": "notif_123",
        "type": "budget_alert",
        "title": "Budget Alert: Groceries",
        "body": "You've reached 80% of your Groceries budget",
        "severity": "medium",
        "read": false,
        "sentAt": "2026-01-31T09:00:00Z",
        "data": {
          "budgetId": "budget_456",
          "categoryId": "cat_groceries_001",
          "threshold": 80
        }
      }
    ],
    "lastEvaluatedKey": "notif_123#2026-01-31T09:00:00Z"
  }
}
```

### PUT /notifications/{notificationId}/read

Mark a notification as read.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### GET /notifications/health

Health check for notification service.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "notifications",
    "version": "1.0.0"
  }
}
```

### Notification Types

**Budget Alerts**:

- Triggered when spending reaches 80%, 90%, or 100% of budget
- Sent to all family members
- Deduplicated (no duplicate alerts within 24 hours)

**Daily Reminders**:

- Sent at user-configured time (±15 minute window)
- Only sent if no transactions logged in 3+ days
- Respects quiet hours settings

### Notification Preferences

**Budget Alerts Enabled**:

- Type: Boolean
- Default: true
- Description: Enable/disable budget threshold alerts

**Daily Reminders Enabled**:

- Type: Boolean
- Default: true
- Description: Enable/disable daily expense tracking reminders

**Reminder Time**:

- Type: String (HH:mm format, 24-hour)
- Default: "09:00"
- Description: Time to send daily reminders

**Quiet Hours**:

- Type: String (HH:mm format, 24-hour)
- Default: Start "22:00", End "08:00"
- Description: No notifications sent during quiet hours
- Note: Supports overnight ranges (e.g., 22:00 to 08:00)

### Device Management

**Device Limit**: Maximum 10 devices per user

**Device TTL**: Devices automatically removed after 90 days of inactivity

**Platform Support**:

- iOS (via Expo Push Notifications)
- Android (via Expo Push Notifications)

### Testing

**Register Device**:

```bash
TOKEN="your_jwt_token_here"

curl -X POST https://api.budgetbuddy.com/v1/notifications/register-device \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "ios"
  }'
```

**Update Preferences**:

```bash
curl -X PUT https://api.budgetbuddy.com/v1/notifications/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetAlertsEnabled": true,
    "reminderTime": "10:00"
  }'
```

**Get Notification History**:

```bash
curl -X GET https://api.budgetbuddy.com/v1/notifications/history?limit=20 \
  -H "Authorization: Bearer $TOKEN"
```

## Multi-Currency Support

### Overview

BudgetBuddy supports 6 major currencies for international users. Currency is set at the user profile level and applies to all budgets and transactions.

### Supported Currencies

| Code | Name              | Symbol | Decimal Places | Example Format |
| ---- | ----------------- | ------ | -------------- | -------------- |
| USD  | US Dollar         | $      | 2              | $1,234.56      |
| EUR  | Euro              | €      | 2              | €1.234,56      |
| GBP  | British Pound     | £      | 2              | £1,234.56      |
| CAD  | Canadian Dollar   | C$     | 2              | C$1,234.56     |
| AUD  | Australian Dollar | A$     | 2              | A$1,234.56     |
| JPY  | Japanese Yen      | ¥      | 0              | ¥1,235         |

### Currency Selection

**During Registration/Onboarding**:

- Users can select their preferred currency
- Defaults to USD if not specified
- Currency is saved to user profile

**In Settings**:

- Users can change their currency preference
- Existing budgets and transactions retain their original currency
- New budgets and transactions use the updated currency

### Currency Fields

**User Profile**:

```json
{
  "userId": "user_123",
  "email": "user@example.com",
  "currency": "USD",
  "locale": "en-US"
}
```

**Budget**:

```json
{
  "budgetId": "budget_123",
  "month": "2026-02",
  "currency": "USD",
  "totalIncome": 5000,
  "totalExpenses": 3000
}
```

**Transaction**:

```json
{
  "transactionId": "txn_123",
  "amount": 150.0,
  "currency": "USD",
  "type": "expense",
  "categoryId": "cat_groceries_001"
}
```

### Currency Formatting

All currency amounts are formatted according to the currency's locale:

- **Decimal Places**: 2 for most currencies, 0 for JPY
- **Thousands Separator**: Comma (,) for USD/GBP/CAD/AUD, period (.) for EUR
- **Decimal Separator**: Period (.) for USD/GBP/CAD/AUD, comma (,) for EUR
- **Symbol Position**: Before amount for most currencies, after for EUR

### Currency Validation

**Valid Currency Codes**:

- Must be one of: USD, EUR, GBP, CAD, AUD, JPY
- Case-insensitive (converted to uppercase)
- Invalid codes return 400 Bad Request

**Example Error**:

```json
{
  "success": false,
  "error": "Invalid currency",
  "message": "Currency code 'XYZ' is not supported. Supported currencies: USD, EUR, GBP, CAD, AUD, JPY"
}
```

### Currency Change Behavior

**When User Changes Currency**:

1. User profile currency is updated
2. Existing budgets keep their original currency
3. Existing transactions keep their original currency
4. New budgets use the new currency
5. New transactions use the budget's currency

**Important Notes**:

- Currency conversion is NOT performed automatically
- Users are warned before changing currency
- Mixed currencies in a single budget are not supported

### Migration

**Existing Users**:

- All existing users default to USD
- All existing budgets default to USD
- All existing transactions default to USD
- Users can change currency in settings

### API Examples

**Create User with Currency**:

```bash
curl -X POST https://api.budgetbuddy.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure-password",
    "currency": "EUR",
    "locale": "de-DE"
  }'
```

**Create Budget with Currency**:

```bash
curl -X POST https://api.budgetbuddy.com/v1/budget \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "month": "2026-02",
    "currency": "GBP",
    "groups": { ... }
  }'
```

**Create Transaction with Currency**:

```bash
curl -X POST https://api.budgetbuddy.com/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "JPY",
    "type": "expense",
    "categoryId": "cat_001",
    "date": "2026-02-01"
  }'
```

### Future Enhancements

**Phase 2 (Planned)**:

- Currency conversion with real-time exchange rates
- Multi-currency budgets (mixing currencies)
- Historical exchange rate tracking
- Additional currencies (50+ total)
- Cryptocurrency support (BTC, ETH, etc.)
