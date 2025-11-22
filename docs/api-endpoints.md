# API Endpoints Documentation

**Base URL**: `https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1`
**Last Updated**: 2025-11-21
**API Version**: 1.0

## Authentication

All endpoints except health checks require JWT authentication via `Authorization: Bearer <token>` header.

### Auth Endpoints

#### POST /auth/register
Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
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
    "lastName": "Doe"
  }
}
```

#### POST /auth/login
Authenticate user and get JWT tokens.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
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
        "amount": 50.00,
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
  "amount": 50.00,
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
    "amount": 50.00,
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
      "amount": 50.00,
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
  "amount": 75.00,
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
      "amount": 75.00,
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
import { transactionApi } from './services/api';

// Create transaction
const transaction = await transactionApi.createTransaction({
  amount: 50.00,
  type: 'expense',
  categoryId: 'cat_groceries_001',
  description: 'Weekly groceries',
  date: '2025-11-01'
});

// Get transactions
const transactions = await transactionApi.getTransactions({
  type: 'expense',
  startDate: '2025-11-01'
});
```

## Changelog

### 2025-11-01
- ✅ Added complete transaction CRUD endpoints
- ✅ Enhanced error handling with field-specific validation
- ✅ Added comprehensive filtering and pagination
- ✅ Integrated budget recalculation on transaction changes

### Previous versions
- Budget CRUD endpoints
- Authentication system
- Health check endpoints
