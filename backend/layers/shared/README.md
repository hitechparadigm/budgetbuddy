# BudgetBuddy Auth Shared Utilities Layer

This Lambda Layer contains shared utilities for all authentication Lambda functions, preventing code duplication and ensuring consistency across endpoints.

## Contents

- **CORS utilities**: Standardized CORS header generation and preflight handling
- **Token parsing**: JWT, ID token, and Google token parsing utilities
- **Validation**: Input validation for all auth endpoints
- **Error handling**: Standardized error responses and custom error classes

## Usage

This layer is automatically attached to all authentication Lambda functions. Import utilities as needed:

```javascript
const {
  getCorsHeaders,
  handleCorsPreflightRequest,
} = require("/opt/nodejs/shared/cors");
const {
  parseAuthToken,
  parseIdToken,
} = require("/opt/nodejs/shared/token-parser");
const {
  validateEmail,
  validateOnboardingInput,
} = require("/opt/nodejs/shared/validators");
const {
  formatErrorResponse,
  ValidationError,
} = require("/opt/nodejs/shared/errors");
```

## Deployment

The layer is deployed as part of the CDK infrastructure stack:

```bash
cd infrastructure
npm run deploy
```

## Testing

Run unit tests for all utilities:

```bash
cd backend/layers/shared/nodejs/shared
npm test
```

## Benefits

- **Consistency**: All auth endpoints use the same validation and error handling
- **Maintainability**: Update once, deploy everywhere
- **Performance**: Shared code reduces Lambda package sizes
- **Quality**: Comprehensive unit tests ensure reliability
- **Prevention**: Eliminates import ordering bugs by centralizing utilities
