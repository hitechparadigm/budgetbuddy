# BudgetBuddy API Endpoints Documentation

## Base URL
```
https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/
```

## 🏥 Health Check Endpoints

### General Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2025-10-24T22:30:00.000Z",
  "version": "1.0.0"
}
```

### Service-Specific Health Checks
```http
GET /auth/health          # Authentication service
GET /budget/health        # Budget management service
GET /transactions/health  # Transaction service
GET /ai/health           # AI budget generation service
GET /family/health       # Family management service
GET /payment/health      # Payment processing service
GET /email/health        # Email notification service
GET /admin/health        # Admin dashboard service
```

## 🔐 Authentication Endpoints

### User Login ✅ IMPLEMENTED
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Rules:**
- `email`: Required, valid email format
- `password`: Required, non-empty string

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "user_1761510594531_q6h0yt714",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "single",
    "subscriptionTier": "free"
  },
  "expiresIn": 3600
}
```

**Error Responses:**

**400 Bad Request** - Validation Error:
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "errors": [
    "Email must be a valid email address",
    "Password is required and must be a string"
  ]
}
```

**401 Unauthorized** - Authentication Failed:
```json
{
  "error": "Authentication Failed",
  "message": "Invalid email or password"
}
```

**500 Internal Server Error** - Server Error:
```json
{
  "error": "Login Failed",
  "message": "An error occurred during authentication",
  "details": "Specific error message"
}
```

**Example Usage:**
```bash
curl -X POST https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.johnson@budgetbuddy.com",
    "password": "SecurePassword123!"
  }'
```

### User Registration ✅ IMPLEMENTED
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules:**
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters
- `firstName`: Required, non-empty string
- `lastName`: Required, non-empty string

**Success Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "userId": "user_1761510594531_q6h0yt714",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "accountType": "single",
  "subscriptionTier": "free",
  "nextSteps": [
    "Complete onboarding questionnaire",
    "Generate AI budget or create DIY budget"
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `409 Conflict`: User already exists
- `500 Internal Server Error`: Server error

## Token Management

### JWT Token Structure
The login endpoint returns three types of tokens:

- **Access Token**: Short-lived (1 hour) for API authentication
- **Refresh Token**: Long-lived (30 days) for token renewal
- **ID Token**: Contains user profile information

### Using Tokens
Include the access token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Client Usage
The `@budget-buddy/api-client` package handles token management automatically:

```typescript
import { apiClient } from '@budget-buddy/api-client';

// Login (stores tokens automatically)
const loginResult = await apiClient.login({
  email: 'user@example.com',
  password: 'password123'
});

// Subsequent requests include auth headers automatically
const userData = await apiClient.getUserProfile();

// Check authentication status
if (apiClient.isAuthenticated()) {
  // User is logged in
}

// Logout (clears tokens)
await apiClient.logout();
```

## Planned Endpoints (Not Yet Implemented)

### POST /auth/forgot-password
**Status**: ❌ Not Implemented

**Description**: Initiate password reset flow.

**Planned Request:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
**Status**: ❌ Not Implemented

**Description**: Complete password reset with verification code.

**Planned Request:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "NewSecurePassword123!"
}
```

### POST /auth/refresh
**Status**: ❌ Not Implemented

**Description**: Refresh JWT access token using refresh token.

**Planned Request:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /auth/profile
**Status**: ❌ Not Implemented

**Description**: Get authenticated user profile information.

**Planned Response:**
```json
{
  "user": {
    "userId": "user_1761510594531_q6h0yt714",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "single",
    "subscriptionTier": "free",
    "onboardingCompleted": false
  }
}
```

## Testing Examples

### Complete Authentication Flow Test
```bash
# 1. Register a new user
curl -X POST https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@budgetbuddy.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Login with the registered user
curl -X POST https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@budgetbuddy.com",
    "password": "TestPassword123!"
  }'

# 3. Use the returned access token for authenticated requests
# (Future endpoints will require Authorization header)
```

---
*Last Updated: October 28, 2025*
*Budget System: Complete ✅ | API Issues: Resolved ✅*
