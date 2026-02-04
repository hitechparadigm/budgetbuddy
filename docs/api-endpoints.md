# API Endpoints Documentation

**Base URL**: `https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1`
**Last Updated**: 2026-02-02
**API Version**: 1.2 (Competitive Features)

## Authentication

All endpoints except health checks require JWT authentication via `Authorization: Bearer <token>` header.

### Token Types

**Important**: BudgetBuddy uses AWS Cognito for authentication. The API Gateway Cognito authorizer requires **ID tokens**, not access tokens.

| Token Type    | Storage Key                 | Usage                               |
| ------------- | --------------------------- | ----------------------------------- |
| ID Token      | `budgetbuddy_id_token`      | API requests (Authorization header) |
| Access Token  | `budgetbuddy_access_token`  | Cognito user operations             |
| Refresh Token | `budgetbuddy_refresh_token` | Token refresh                       |

**Frontend Implementation**:

```javascript
// Correct: Use ID token for API calls
const idToken = localStorage.getItem("budgetbuddy_id_token");
const response = await fetch("/api/endpoint", {
  headers: {
    Authorization: `Bearer ${idToken}`,
  },
});

// Incorrect: Access token will result in 401 Unauthorized
// const accessToken = localStorage.getItem('budgetbuddy_access_token');
```

### Response Format

All API responses follow a standardized format:

**Success Response**:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly error message"
}
```

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
        "totalRollover": 150,
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
            "plannedAmount": 1500,
            "rolloverEnabled": true,
            "rolloverAmount": 100,
            "rolloverCap": 500
          }
        ]
      }
    ]
  }
}
```

**Category Rollover Fields** (optional):

- **rolloverEnabled**: Boolean - Whether unused budget rolls over to next month (default: false)
- **rolloverAmount**: Number - Current rollover amount from previous months (default: 0)
- **rolloverCap**: Number - Maximum rollover amount allowed (optional, no cap if not set)

**Currency Field**:

- **Type**: String (ISO 4217 currency code)
- **Required**: No (defaults to user's profile currency)
- **Supported Values**: USD, EUR, GBP, CAD, AUD, JPY
- **Description**: Currency for all amounts in this budget
- **Note**: Once set, the budget currency cannot be changed

### PUT /budget/categories/{categoryId}/rollover

Enable or disable rollover for a specific budget category.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "month": "2026-02",
  "groupType": "expenses",
  "rolloverEnabled": true,
  "rolloverCap": 200
}
```

**Parameters**:

- **month**: String (YYYY-MM) - The budget month to update
- **groupType**: String - One of: "income", "savings", "expenses"
- **rolloverEnabled**: Boolean - Enable or disable rollover
- **rolloverCap**: Number (optional) - Maximum rollover amount

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "categoryId": "cat_groceries",
    "rolloverEnabled": true,
    "rolloverCap": 200,
    "totalRollover": 150
  },
  "message": "Category rollover settings updated successfully"
}
```

**Validates**: Requirement 40.7 - Enable/disable rollover per category

### PUT /budget/categories/{categoryId}/rollover/reset

Reset the rollover amount to 0 for a specific category (start fresh).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "month": "2026-02",
  "groupType": "expenses"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "categoryId": "cat_groceries",
    "previousRollover": 175,
    "newRollover": 0,
    "totalRollover": 0
  },
  "message": "Category rollover reset successfully"
}
```

**Validates**: Requirement 40.7 - Reset rollover (start fresh)

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

## Family Collaboration

### Overview

BudgetBuddy supports family account sharing with role-based permissions. Families can have up to 2 members (primary + spouse/partner). The primary user manages invitations and member roles.

### Roles and Permissions

| Role    | Invite | Update Roles | Remove Members | View Members | Leave Family |
| ------- | ------ | ------------ | -------------- | ------------ | ------------ |
| Primary | ✅     | ✅           | ✅             | ✅           | ❌           |
| Spouse  | ❌     | ❌           | ❌             | ✅           | ✅           |
| Viewer  | ❌     | ❌           | ❌             | ✅           | ✅           |

### GET /family/health

Health check for family service.

**Response**: `200 OK`

```json
{
  "status": "healthy",
  "service": "family"
}
```

### POST /family/invite

Send an invitation to join the family.

**Headers**: `Authorization: Bearer <token>`

**Permissions**: Primary user only

**Request Body**:

```json
{
  "email": "partner@example.com",
  "role": "spouse"
}
```

**Response**: `201 Created`

```json
{
  "invitationId": "inv_123",
  "email": "partner@example.com",
  "role": "spouse",
  "status": "pending",
  "expiresAt": "2026-02-07T10:00:00Z",
  "token": "abc123..."
}
```

**Error Responses**:

- `400 Bad Request`: Invalid email or role
- `403 Forbidden`: Only primary user can send invitations
- `409 Conflict`: Family is full (max 2 members) or pending invitation exists

**Role Values**:

- `spouse`: Full access to budgets and transactions (read/write)
- `viewer`: Read-only access to budgets and transactions

### POST /family/accept-invitation

Accept a family invitation.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "token": "abc123..."
}
```

**Response**: `200 OK`

```json
{
  "familyId": "family_456",
  "role": "spouse",
  "family": {
    "primaryUserId": "user_123",
    "memberCount": 2,
    "subscriptionTier": "free"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Token is required or invitation has expired
- `404 Not Found`: Invitation not found or already used
- `409 Conflict`: Family is full

### GET /family/members

Get all family members.

**Headers**: `Authorization: Bearer <token>`

**Permissions**: All family members

**Response**: `200 OK`

```json
{
  "familyId": "family_456",
  "members": [
    {
      "userId": "user_123",
      "email": "primary@example.com",
      "name": "John Doe",
      "role": "primary",
      "joinedAt": "2026-01-01T00:00:00Z"
    },
    {
      "userId": "user_456",
      "email": "partner@example.com",
      "name": "Jane Doe",
      "role": "spouse",
      "joinedAt": "2026-01-31T12:00:00Z"
    }
  ]
}
```

### PUT /family/members/{userId}

Update a family member's role.

**Headers**: `Authorization: Bearer <token>`

**Permissions**: Primary user only

**Request Body**:

```json
{
  "role": "viewer"
}
```

**Response**: `200 OK`

```json
{
  "userId": "user_456",
  "role": "viewer",
  "updatedAt": "2026-01-31T14:00:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid role or cannot change own role
- `403 Forbidden`: Only primary user can change roles
- `404 Not Found`: Member not found

### DELETE /family/members/{userId}

Remove a family member.

**Headers**: `Authorization: Bearer <token>`

**Permissions**: Primary user only

**Response**: `200 OK`

```json
{
  "message": "Member removed successfully",
  "userId": "user_456"
}
```

**Error Responses**:

- `400 Bad Request`: Cannot remove yourself
- `403 Forbidden`: Only primary user can remove members
- `404 Not Found`: Member not found

### POST /family/leave

Leave the current family and create a new one.

**Headers**: `Authorization: Bearer <token>`

**Permissions**: Spouse and Viewer only (Primary cannot leave)

**Response**: `200 OK`

```json
{
  "message": "Left family successfully",
  "newFamilyId": "family_789"
}
```

**Error Responses**:

- `403 Forbidden`: Primary user cannot leave family

### Invitation Flow

1. **Primary sends invitation**: `POST /family/invite` with email and role
2. **Invitation email sent**: Contains link with secure token (valid 7 days)
3. **Recipient accepts**: `POST /family/accept-invitation` with token
4. **User joins family**: Gets assigned role, can access shared budgets

### Family Limits

- **Maximum members**: 2 (primary + 1 spouse/viewer)
- **Invitation expiry**: 7 days
- **Pending invitations**: 1 per email per family

### Data Sharing

When a user joins a family:

- They can view all family budgets
- They can view all family transactions
- Spouse role can create/edit budgets and transactions
- Viewer role can only view (read-only)

### Testing

**Send Invitation**:

```bash
TOKEN="your_jwt_token_here"

curl -X POST https://api.budgetbuddy.com/v1/family/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "partner@example.com",
    "role": "spouse"
  }'
```

**Accept Invitation**:

```bash
curl -X POST https://api.budgetbuddy.com/v1/family/accept-invitation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invitation_token_here"
  }'
```

**Get Family Members**:

```bash
curl -X GET https://api.budgetbuddy.com/v1/family/members \
  -H "Authorization: Bearer $TOKEN"
```

**Update Member Role**:

```bash
curl -X PUT https://api.budgetbuddy.com/v1/family/members/user_456 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "viewer"
  }'
```

**Remove Member**:

```bash
curl -X DELETE https://api.budgetbuddy.com/v1/family/members/user_456 \
  -H "Authorization: Bearer $TOKEN"
```

**Leave Family**:

```bash
curl -X POST https://api.budgetbuddy.com/v1/family/leave \
  -H "Authorization: Bearer $TOKEN"
```

---

## Competitive Features (v1.2)

### Bills Management

#### GET /bills

Get all bills for the authenticated user's family.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "bills": [
      {
        "billId": "bill_123",
        "name": "Electric Bill",
        "amount": 150.0,
        "dueDate": "2026-02-15",
        "frequency": "monthly",
        "category": "Utilities",
        "isPaid": false,
        "reminderDays": [7, 3, 0]
      }
    ]
  }
}
```

#### POST /bills

Create a new bill.

**Request Body**:

```json
{
  "name": "Electric Bill",
  "amount": 150.0,
  "dueDate": "2026-02-15",
  "frequency": "monthly",
  "category": "Utilities",
  "reminderDays": [7, 3, 0]
}
```

#### PUT /bills/{billId}/paid

Mark a bill as paid.

**Request Body**:

```json
{
  "createTransaction": true,
  "paidDate": "2026-02-14"
}
```

### Goals Management

#### GET /goals

Get all savings goals.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "goals": [
      {
        "goalId": "goal_123",
        "name": "Vacation Fund",
        "targetAmount": 3000,
        "currentAmount": 2400,
        "targetDate": "2026-06-01",
        "icon": "🏖️",
        "priority": 1
      }
    ]
  }
}
```

#### POST /goals/{goalId}/contribute

Add a contribution to a goal.

**Request Body**:

```json
{
  "amount": 100.0,
  "note": "Monthly contribution"
}
```

#### PUT /goals/reorder

Reorder goals by priority.

**Request Body**:

```json
{
  "goalIds": ["goal_456", "goal_123", "goal_789"]
}
```

### Subscriptions

#### GET /subscriptions

Get all tracked subscriptions.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "subscriptionId": "sub_123",
        "name": "Netflix",
        "amount": 15.99,
        "frequency": "monthly",
        "nextBillingDate": "2026-02-15",
        "status": "keep",
        "detectedFrom": "transactions"
      }
    ],
    "totalMonthly": 89.97
  }
}
```

#### POST /subscriptions/detect

Detect subscriptions from transaction history.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "detected": 5,
    "subscriptions": [...]
  }
}
```

### Debt Payoff

#### GET /debts

Get all debts.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "debts": [
      {
        "debtId": "debt_123",
        "name": "Credit Card",
        "balance": 5432.0,
        "interestRate": 19.99,
        "minimumPayment": 150.0,
        "type": "credit_card"
      }
    ]
  }
}
```

#### POST /debts/calculate

Calculate payoff timeline.

**Request Body**:

```json
{
  "strategy": "avalanche",
  "extraPayment": 200.0
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "strategy": "avalanche",
    "payoffDate": "2027-03-15",
    "totalInterest": 892.45,
    "interestSaved": 234.50,
    "timeline": [...]
  }
}
```

### Net Worth

#### GET /net-worth

Get current net worth.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "netWorth": 125000,
    "assets": {
      "total": 175000,
      "items": [...]
    },
    "liabilities": {
      "total": 50000,
      "items": [...]
    },
    "history": [...]
  }
}
```

#### POST /net-worth/assets

Add an asset.

**Request Body**:

```json
{
  "name": "Savings Account",
  "type": "cash",
  "value": 10000,
  "institution": "Chase Bank"
}
```

### Peer Comparison

#### GET /comparison/summary

Get spending comparison with similar households.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "available": true,
    "groupCriteria": {
      "region": "US",
      "familySize": 2,
      "incomeRange": "75k-100k"
    },
    "groupSize": 156,
    "comparison": {
      "Housing": {
        "userAmount": 1500,
        "groupAverage": 1650,
        "percentile": 42,
        "status": "below-average"
      }
    }
  }
}
```

#### GET /comparison/preferences

Get user's comparison preferences.

#### PUT /comparison/preferences

Update comparison preferences.

**Request Body**:

```json
{
  "optedOut": false,
  "shareData": true,
  "showInInsights": true
}
```

### Educational Content

#### GET /learn/courses

Get available courses.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "budgeting-101",
        "title": "Budgeting 101",
        "description": "Learn the fundamentals of budgeting",
        "difficulty": "beginner",
        "estimatedMinutes": 30,
        "lessonsCount": 4
      }
    ]
  }
}
```

#### GET /learn/courses/{courseId}

Get course details with lessons.

#### POST /learn/lessons/{lessonId}/complete

Mark a lesson as complete.

#### POST /learn/quiz/{quizId}/submit

Submit quiz answers.

**Request Body**:

```json
{
  "answers": [1, 1, 2]
}
```

#### GET /learn/progress

Get user's learning progress.

#### GET /learn/badges

Get earned badges.

### Receipt Scanning

#### POST /receipt/upload

Get presigned URL for receipt upload.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "receiptId": "receipt_123",
    "expiresIn": 300
  }
}
```

#### POST /receipt/process

Process uploaded receipt with OCR.

**Request Body**:

```json
{
  "receiptId": "receipt_123"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "merchant": "Walmart",
    "date": "2026-02-01",
    "total": 45.67,
    "suggestedCategory": "Groceries",
    "confidence": 0.92,
    "items": [...]
  }
}
```

### Admin Endpoints

#### GET /admin/dashboard

Get admin dashboard metrics.

**Headers**: `Authorization: Bearer <admin_token>`

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "totalUsers": 12450,
    "activeUsers": 8234,
    "premiumUsers": 623,
    "revenue": 45230,
    "alerts": 3
  }
}
```

#### GET /admin/users

Search and list users.

**Query Parameters**:

- `search`: Search by email or name
- `status`: Filter by status (active, disabled)
- `plan`: Filter by plan (free, premium)
- `page`: Page number
- `limit`: Items per page

#### PUT /admin/users/{userId}

Update user status or details.

**Request Body**:

```json
{
  "status": "disabled",
  "reason": "Terms violation"
}
```

---

## Health Check Endpoints

All services expose health check endpoints:

- `GET /auth/health`
- `GET /budget/health`
- `GET /transactions/health`
- `GET /family/health`
- `GET /bills/health`
- `GET /goals/health`
- `GET /subscriptions/health`
- `GET /debts/health`
- `GET /net-worth/health`
- `GET /comparison/health`
- `GET /learn/health`
- `GET /receipt/health`
- `GET /admin/health`
- `GET /insights/health`
- `GET /tips/health`
- `GET /plaid/health`

**Response**: `200 OK`

```json
{
  "status": "healthy",
  "service": "<service-name>",
  "version": "1.0.0"
}
```

---

## AI-Powered Features (v1.3)

### Pattern Detection

AI-powered recurring bill detection from transaction history.

**Base URL**: Extended API Gateway

#### POST /patterns/detect

Analyze transactions and detect recurring payment patterns.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "analysisMonths": 6,
  "minConfidence": 50,
  "useAI": true
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "patternId": "pattern_123",
        "merchantName": "Netflix",
        "suggestedBillName": "Netflix Subscription",
        "averageAmount": 15.99,
        "frequency": "monthly",
        "confidenceScore": 95,
        "nextExpectedDate": "2026-03-01",
        "explanation": "Detected monthly payment of $15.99 to Netflix. Found 6 occurrences."
      }
    ],
    "transactionsAnalyzed": 150,
    "patternsDetected": 5
  },
  "message": "Pattern detection completed"
}
```

#### POST /patterns/manual

Create a manual pattern from a transaction.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "transaction": {
    "transactionId": "txn_123",
    "merchant": "Gym Membership",
    "amount": 50.0,
    "date": "2026-02-01",
    "categoryId": "fitness"
  },
  "frequency": "monthly"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "pattern": {
      "patternId": "pattern_456",
      "merchantName": "Gym Membership",
      "suggestedBillName": "Gym Membership Subscription",
      "averageAmount": 50.0,
      "frequency": "monthly",
      "confidenceScore": 100,
      "status": "approved",
      "isManual": true
    }
  },
  "message": "Manual pattern created successfully"
}
```

#### GET /patterns

Get all detected patterns for the family.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `status` (optional): Filter by status (pending, approved, rejected, ignored)

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "patterns": [...],
    "count": 10
  },
  "message": "Patterns retrieved successfully"
}
```

#### PUT /patterns/{patternId}

Update a pattern (approve, reject, edit).

**Headers**: `Authorization: Bearer <token>`

**Request Body** (approve):

```json
{
  "action": "approve",
  "billId": "bill_123"
}
```

**Request Body** (edit):

```json
{
  "suggestedBillName": "Updated Name",
  "averageAmount": 20.0,
  "frequency": "bi-weekly"
}
```

**Response**: `200 OK`

#### DELETE /patterns/{patternId}

Delete (ignore) a pattern.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

---

### Budget Planning

AI-powered budget suggestions based on recurring bills and spending history.

#### POST /budget-planning/suggestions

Generate budget suggestions for a target month.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "targetMonth": "2026-03",
  "includeRecurringBills": true,
  "includeHistoricalAverage": true
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "suggestionId": "suggestion_123",
    "targetMonth": "2026-03",
    "suggestions": [
      {
        "categoryId": "utilities",
        "categoryName": "Utilities",
        "suggestedAmount": 250.0,
        "confidenceScore": 85,
        "breakdown": [
          { "item": "Electric Bill", "amount": 150.0, "type": "recurring" },
          { "item": "Water Bill", "amount": 50.0, "type": "recurring" },
          { "item": "Historical average", "amount": 50.0, "type": "average" }
        ],
        "explanation": "Based on 2 recurring bills and 3 months of spending history."
      }
    ],
    "totalSuggested": 3500.0
  },
  "message": "Budget suggestions generated"
}
```

#### GET /budget-planning/suggestions

Get existing budget suggestions.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `status` (optional): Filter by status (pending, applied, rejected)
- `targetMonth` (optional): Filter by target month (YYYY-MM)

**Response**: `200 OK`

#### POST /budget-planning/apply

Apply budget suggestions to a budget.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "suggestionId": "suggestion_123",
  "selectedCategories": ["utilities", "food"]
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "suggestionId": "suggestion_123",
    "targetMonth": "2026-03",
    "appliedCategories": ["utilities", "food"],
    "totalApplied": 2
  },
  "message": "Budget suggestions applied"
}
```

---

### AI Notification Types

New notification types for AI-powered features:

| Type                          | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `PATTERN_DETECTED`            | New recurring pattern found with high confidence |
| `PATTERN_AMOUNT_CHANGED`      | Recurring bill amount changed by >20%            |
| `PATTERN_MISSING`             | Expected recurring transaction not found         |
| `BUDGET_SUGGESTION_AVAILABLE` | AI budget suggestions ready for review           |

**Notification Payload Example**:

```json
{
  "type": "PATTERN_DETECTED",
  "title": "New Recurring Bill Detected",
  "body": "We detected a recurring payment to Netflix (monthly) for approximately $15.99.",
  "data": {
    "patternId": "pattern_123",
    "actionUrl": "/bills/review-patterns",
    "actions": [
      { "label": "Review", "action": "review" },
      { "label": "Dismiss", "action": "dismiss" }
    ]
  }
}
```
