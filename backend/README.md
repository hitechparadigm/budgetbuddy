# @budget-buddy/backend

**Purpose**: AWS Lambda functions that provide the serverless backend API for BudgetBuddy. Handles authentication, budget management, AI generation, and all business logic.

## What's in this package

### Lambda Functions (`functions/`)
- **auth/**: User authentication, registration, profile management
- **budget/**: Budget CRUD operations, category management, calculations
- **transactions/**: Transaction management with automatic budget updates
- **ai/**: AI-powered budget generation using AWS Bedrock
- **family/**: Family account creation, invitations, member management
- **payment/**: Stripe integration for subscription management
- **email/**: SES email sending for notifications and tips
- **admin/**: Admin dashboard operations and analytics

### Shared Layer (`layers/common/`)
- Common dependencies shared across all Lambda functions
- Reduces deployment package sizes and improves cold start times

## Package.json Explanation

- **Dependencies**:
  - `@budget-buddy/shared`: Shared types and utilities
  - `@aws-sdk/*`: AWS service clients (DynamoDB, Bedrock, SES)
  - `aws-lambda`: Lambda runtime types
  - `stripe`: Payment processing integration
  - `uuid`: Unique identifier generation
- **Scripts**:
  - `build`: Compiles TypeScript Lambda functions
  - `dev`: Watches for changes during development
  - `lint`: Code quality checks
  - `typecheck`: TypeScript validation
  - `test`: Unit tests for business logic
  - `clean`: Removes build artifacts

## Architecture

Each Lambda function:
1. Receives API Gateway events
2. Validates input using Zod schemas
3. Performs business logic operations
4. Interacts with DynamoDB using single-table design
5. Returns structured API responses

## Environment Variables

Functions expect these environment variables:
- `TABLE_NAME`: DynamoDB table name
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging verbosity
- `BEDROCK_MODEL_ID`: AI model identifier
- `STRIPE_SECRET_KEY`: Payment processing key

## Deployment

Functions are deployed via AWS CDK in the infrastructure package. Each function gets:
- Appropriate IAM permissions
- Environment variables
- CloudWatch logging
- API Gateway integration