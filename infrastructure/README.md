# @budget-buddy/infrastructure

**Purpose**: AWS CDK (Cloud Development Kit) code that defines and deploys all AWS infrastructure for BudgetBuddy using Infrastructure as Code principles.

## What's in this package

### CDK Stacks (`lib/`)

- **database-stack.ts**: DynamoDB table with single-table design and GSI indexes
- **auth-stack.ts**: Cognito User Pools for authentication and shared Lambda layers
- **auth-onboarding-stack.ts**: ✨ NEW - Standalone Lambda for user onboarding (architectural refactoring)
- **api-stack.ts**: API Gateway and Lambda functions
- **hosting-stack.ts**: S3 buckets and CloudFront for web hosting
- **monitoring-stack.ts**: CloudWatch dashboards and alarms

### Architectural Refactoring (In Progress)

The authentication system is being refactored from a monolithic 1484-line Lambda function into separate, focused microservices:

**Phase 1**: ✅ Complete - Shared utilities layer
**Phase 2**: 🔄 In Progress - Separate Lambda functions (1 of 6 complete)

- ✅ **auth-onboarding-stack.ts**: Standalone onboarding Lambda (~300 lines)
- ⏳ auth-register, auth-login, auth-google, auth-profile, auth-geolocation (planned)

**Benefits**: 80% code reduction, independent deployment, faster cold starts, impossible import bugs

See `lib/README-auth-onboarding.md` for detailed documentation on the new architecture.

### Application Entry Point (`bin/app.ts`)

- Initializes CDK app and creates all stacks
- Manages stack dependencies and deployment order
- Applies consistent tagging for cost tracking

## Package.json Explanation

- **Dependencies**:
  - `aws-cdk-lib`: AWS CDK v2 library with all constructs
  - `constructs`: Base construct library
- **DevDependencies**:
  - `aws-cdk`: CDK CLI tool
  - `typescript`: TypeScript compiler
  - `jest`: Testing framework for infrastructure tests
- **Scripts**:
  - `build`: Compiles TypeScript CDK code
  - `watch`: Watches for changes during development
  - `test`: Runs infrastructure unit tests
  - `cdk`: Direct access to CDK CLI commands
  - `deploy`: Deploys all stacks to AWS
  - `destroy`: Removes all AWS resources
  - `diff`: Shows changes before deployment
  - `synth`: Generates CloudFormation templates

## CDK Configuration (`cdk.json`)

Configures CDK behavior:

- **app**: Entry point for CDK application
- **watch**: File watching configuration for development
- **context**: Feature flags and CDK behavior settings

## Usage

### Prerequisites

- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

### Deployment Commands

Deploy all infrastructure:

```bash
yarn deploy
```

Deploy specific stack:

```bash
yarn cdk deploy BudgetBuddy-dev-Database
```

View changes before deployment:

```bash
yarn diff
```

Generate CloudFormation templates:

```bash
yarn synth
```

### Environment Configuration

Set environment context:

```bash
yarn cdk deploy --context environment=prod
```

This creates stacks with names like `BudgetBuddy-prod-Database` instead of `BudgetBuddy-dev-Database`.

## Cost Optimization Features

- On-demand DynamoDB billing
- Serverless Lambda functions
- CloudFront caching
- Appropriate log retention periods
- Resource tagging for cost allocation
