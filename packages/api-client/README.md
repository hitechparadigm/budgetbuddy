# @budget-buddy/api-client

**Purpose**: HTTP client library for communicating with the BudgetBuddy API. Provides authentication, retry logic, and typed API methods.

## What's in this package

### Core Client (`src/client.ts`)
- **ApiClient class**: Main HTTP client with authentication and retry logic
- **Configuration**: Base URL, timeout, retry settings
- **Authentication**: JWT token management and automatic inclusion
- **Error Handling**: Automatic retries with exponential backoff
- **Request Methods**: GET, POST, PUT, DELETE with proper typing

### API Methods
- **Auth API** (`src/auth.ts`): Login, register, logout, password reset
- **Budget API** (`src/budget.ts`): Budget CRUD, categories, AI generation
- **Transaction API** (`src/transactions.ts`): Transaction management, filtering
- **Family API** (`src/family.ts`): Family accounts, invitations, member management

## Package.json Explanation

- **Dependencies**:
  - `@budget-buddy/shared`: Shared types and utilities
  - `aws-amplify`: AWS SDK integration for authentication
  - `swr`: Data fetching and caching library
- **Scripts**: Same as shared package (build, dev, lint, typecheck, test, clean)

## Usage

Initialize the client once in your app:

```typescript
import { initializeApiClient } from '@budget-buddy/api-client';

initializeApiClient({
  baseUrl: 'https://api.budgetbuddy.com',
  timeout: 10000,
  retries: 3
});
```

Use API methods:

```typescript
import { authApi, budgetApi } from '@budget-buddy/api-client';

// Login user
const response = await authApi.login({ email, password });

// Get current budget
const budget = await budgetApi.getCurrentBudget();
```

## Features

- **Automatic Authentication**: JWT tokens automatically included in requests
- **Retry Logic**: Failed requests automatically retried with exponential backoff
- **Type Safety**: All requests and responses are fully typed
- **Error Handling**: Consistent error format across all API calls
- **Caching**: SWR integration for efficient data fetching