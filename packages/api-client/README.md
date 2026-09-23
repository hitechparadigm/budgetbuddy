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
- **Transaction API** (`src/transactions.ts`): Transaction management, filtering — the only service module currently wired up in `src/index.ts`

`auth.ts`, `budget.ts`, and `family.ts` are referenced as commented-out exports in `src/index.ts`
but do not exist in `src/` — they were either never implemented or removed. Auth, budget, and
budget-collaboration API calls are currently made directly from `packages/web-app/src/services/`
(e.g. `budgetService.ts`) rather than through this package. There is no `family` service module
to deprecate here; the backend `family` Lambda itself returns 410 Gone and budget collaboration
goes through `/budgets/*`.

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

Use the transaction service:

```typescript
import { transactionService } from '@budget-buddy/api-client';

const transactions = await transactionService.list({ budgetId, month });
```

## Features

- **Automatic Authentication**: JWT tokens automatically included in requests
- **Retry Logic**: Failed requests automatically retried with exponential backoff
- **Type Safety**: All requests and responses are fully typed
- **Error Handling**: Consistent error format across all API calls
- **Caching**: SWR integration for efficient data fetching