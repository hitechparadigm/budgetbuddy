# @budget-buddy/infrastructure

**Purpose**: AWS CDK (Cloud Development Kit) code that defines and deploys all AWS infrastructure for BudgetBuddy using Infrastructure as Code principles.

## What's in this package

### CDK Stacks (`lib/`)

Listed in deploy order (`stack-manifest.json`). Full contents per stack, routes and triggers:
[docs/architecture.md](../docs/architecture.md#8-infrastructure-as-code).

- **database-stack.ts**: DynamoDB single-table design with 4 GSIs, stream, AWS Backup plan
- **auth-stack.ts**: Cognito User Pool (email + password; no Google IdP configured), app client, shared Lambda layer
- **auth-onboarding-stack.ts**: Standalone Lambda for user onboarding (independently deployable)
- **notification-stack.ts**: notifications, budget-alerts, daily-reminders and bill-scheduler Lambdas, stream mapping, EventBridge schedules, its own alert topic and 12 alarms
- **api-stack.ts**: Main API and Lambdas (auth, budget, transaction, ai, payment, email, export, restore, bills, goals, accounts)
- **api-features-stack.ts**: Features API (plaid, reconciliation, admin, comparison, tips, learn, subscriptions, debt-payoff, credit-score, email, investments)
- **api-features-extended-stack.ts**: Extended API (insights, receipt, pattern-detection, budget-planning, transaction-planning, rules, net-worth) and the receipts and pattern-cache buckets
- **api-budgets-stack.ts**: Budget collaboration, members, and invitations (replaced the destroyed `api-family-stack`)
- **hosting-stack.ts**: S3 + CloudFront for the web app and admin dashboard
- **monitoring-stack.ts**: CloudWatch dashboard, alert topic and alarms

`admin-stack.ts` and `auth-register-stack.ts` exist in `lib/` but are not currently instantiated
in `bin/app.ts` - they are not part of the deployed stack set.

### Architectural Refactoring (Complete)

The authentication system's onboarding flow was split out of the monolithic auth Lambda into a
standalone stack:

- **auth-onboarding-stack.ts**: Standalone onboarding Lambda (~300 lines), independently deployable

Further splitting of the remaining auth endpoints (register, login, google, profile,
geolocation) into separate stacks is not currently planned.

See `lib/README-auth-onboarding.md` for detailed documentation on this architecture.

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

Deploy only through GitHub Actions (`deploy-dev.yml` on push to `develop`); see
[docs/deployment-guide.md](../docs/deployment-guide.md). The `deploy`, `deploy:dev` and `destroy`
scripts exist but are not the supported path.

View changes before deployment:

```bash
npm run diff
```

Generate CloudFormation templates:

```bash
npm run synth
```

### Environment Configuration

The `environment` context (default `dev`) sets the stack names: `budgetbuddy-<env>-<slug>`, for
example `budgetbuddy-dev-database`. Only dev is deployed.

## Cost Optimization Features

- On-demand DynamoDB billing
- Serverless Lambda functions
- CloudFront caching
- Appropriate log retention periods
- Resource tagging for cost allocation
