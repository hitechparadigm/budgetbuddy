# Auth Onboarding Lambda Function

Handles user onboarding completion for BudgetBuddy, including profile updates and initial budget creation.

## Purpose

This Lambda function processes the final step of user onboarding:

1. Marks the user profile as onboarded
2. Creates an initial budget for the current month
3. Sets up expense categories based on user selections

## Endpoints

- **POST /auth/onboarding** - Complete user onboarding

## Request Format

```json
{
  "city": "New York",
  "country": "United States",
  "familySize": 2,
  "currentMonth": "2026-01",
  "selectedCategories": [
    {
      "name": "Groceries",
      "icon": "🛒",
      "adjustedAmount": 500
    },
    {
      "name": "Rent",
      "icon": "🏠",
      "adjustedAmount": 2000
    }
  ]
}
```

## Response Format

### Success (200)

```json
{
  "message": "Onboarding completed successfully",
  "budgetCreated": true,
  "budgetId": "budget_1234567890_abc123",
  "month": "2026-01",
  "totalExpenses": 2500,
  "categoriesCreated": 2,
  "debugInfo": {
    "userId": "user-id",
    "familyId": "family_user-id",
    "partitionKey": "FAMILY#family_user-id",
    "sortKey": "BUDGET#2026-01",
    "resolutionSource": "jwt"
  }
}
```

### Error (400)

```json
{
  "error": "Validation Error",
  "message": "Validation failed",
  "errors": [
    "City is required and must be a string",
    "Family size must be between 1 and 20"
  ]
}
```

### Error (401)

```json
{
  "error": "Unauthorized",
  "message": "Authorization header is required"
}
```

### Error (500)

```json
{
  "error": "Internal Server Error",
  "message": "Failed to complete onboarding",
  "details": "Error details here"
}
```

## Environment Variables

- `TABLE_NAME` - DynamoDB table name
- `AWS_REGION` - AWS region (default: us-east-1)

## Dependencies

- `@aws-sdk/client-cognito-identity-provider` - Cognito operations
- `@aws-sdk/client-dynamodb` - DynamoDB operations
- Shared utilities layer (`/opt/nodejs/shared/`) - CORS, validation, token parsing, error handling

## Architecture

### Import Order (CRITICAL)

All imports are at the top of the file to prevent ReferenceError bugs:

1. AWS SDK imports
2. Shared utilities from Lambda Layer
3. Local utilities (dynamo-helpers, family-id-resolver)
4. Environment variables

This prevents the recurring bug where imports were placed near usage but referenced earlier in the code.

### Family ID Resolution

Uses centralized `FamilyIdResolver` to ensure consistent family ID resolution:

1. Try JWT token familyId first
2. Fallback to DynamoDB user profile lookup
3. Final fallback: `family_${userId}` pattern

This prevents partition key mismatches that cause "No budgets exist" errors.

### Budget Creation

Creates initial budget with:

- Partition key: `FAMILY#${familyId}`
- Sort key: `BUDGET#${currentMonth}`
- Expense categories from user selections
- Zero income and savings (user adds later)
- Verification step to confirm budget was created

## Testing

Run unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Deployment

This function is deployed as part of the CDK infrastructure stack:

```bash
cd infrastructure
npm run deploy
```

## Monitoring

CloudWatch logs are available under:

- Log group: `/aws/lambda/budgetbuddy-auth-onboarding`
- Metrics: Invocations, Errors, Duration, Throttles

## Error Handling

- Validation errors return 400 with detailed error messages
- Authentication errors return 401
- Budget creation failures return 500 with debug information
- All errors are logged to CloudWatch with structured logging

## Security

- Requires valid JWT token in Authorization header
- Validates all input fields before processing
- Uses IAM roles with minimal permissions
- No sensitive data in logs (tokens are not logged)

## Performance

- Cold start: ~500ms
- Warm invocation: ~100ms
- Memory: 512 MB
- Timeout: 30 seconds

## Related Functions

- `auth-register` - User registration
- `auth-login` - User login
- `budget` - Budget management

## Known Issues

None - this function was created to fix the recurring import ordering bug in the monolithic auth Lambda.

## Changelog

### v1.0.0 (2026-01-13)

- Initial release
- Extracted from monolithic auth Lambda
- Fixed import ordering bug
- Added comprehensive validation
- Added budget verification step
