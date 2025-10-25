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

### User Login
```http
POST /auth
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### User Registration
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "age": 30,
  "location": {
    "country": "US",
    "state": "CA",
    "city": "San Francisco",
    "zipCode": "94102"
  }
}
```