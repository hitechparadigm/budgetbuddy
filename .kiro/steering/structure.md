---
inclusion: always
---

# Structure Steering – BudgetBuddy

## Repository Layout

```
budgetbuddy/
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       ├── deploy-dev.yml     # Dev deployment
│       └── pr-check.yml       # PR validation
├── .husky/                     # Git hooks
│   ├── pre-commit             # Security, linting, types, docs
│   └── pre-push               # Security re-validation
├── .kiro/                      # Kiro configuration
│   ├── hooks/                 # Kiro hooks
│   ├── specs/                 # Feature specs
│   └── steering/              # Steering files (this file)
├── backend/                    # Backend Lambda functions
│   ├── functions/             # Lambda function code
│   └── layers/                # Lambda layers (shared code)
├── docs/                       # Documentation
│   ├── api-endpoints.md       # API documentation
│   ├── development-status.md  # Current status
│   └── README.md              # Docs index
├── infrastructure/             # AWS CDK infrastructure
│   ├── bin/                   # CDK app entry point
│   ├── lib/                   # CDK stacks
│   └── cdk.json               # CDK configuration
├── packages/                   # Frontend packages
│   ├── api-client/            # Shared API client
│   ├── mobile/                # React Native mobile app
│   ├── shared/                # Shared utilities
│   └── web-app/               # React web app
├── scripts/                    # Utility scripts
│   ├── validate-for-commit.js # Pre-commit validation
│   └── safe-commit-push.js    # Safe commit workflow
├── tests/                      # Integration tests
│   └── security/              # Security tests
├── CHANGELOG.md                # Version history
├── DEVELOPMENT_LOG.md          # Daily development log
├── README.md                   # Project overview
└── package.json                # Root package.json
```

## Naming Conventions

### Files and Directories

**Backend (Lambda Functions):**

- **Function Directory**: `backend/functions/<function-name>/`
- **Handler File**: `index.js` (entry point)
- **Test File**: `<name>.test.js` (e.g., `auth.test.js`)
- **Package File**: `package.json` (function dependencies)
- **README**: `README.md` (function documentation)

**Infrastructure (CDK):**

- **Stack File**: `<stack-name>-stack.ts` (e.g., `auth-stack.ts`)
- **Stack README**: `README-<stack>.md` (e.g., `README-auth.md`)
- **Construct File**: `<construct-name>.ts` (if custom constructs)

**Frontend (React):**

- **Component File**: `<ComponentName>.tsx` (PascalCase)
- **Page File**: `<PageName>Page.tsx` (e.g., `BudgetPage.tsx`)
- **Service File**: `<service-name>.ts` (kebab-case, e.g., `api-client.ts`)
- **Utility File**: `<utility-name>.ts` (kebab-case, e.g., `date-helpers.ts`)
- **Test File**: `<name>.test.ts` or `<name>.test.tsx`

**Scripts:**

- **Script File**: `<script-name>.js` (kebab-case, e.g., `validate-for-commit.js`)
- **PowerShell Script**: `<script-name>.ps1` (kebab-case)
- **Bash Script**: `<script-name>.sh` (kebab-case)

**Documentation:**

- **Markdown File**: `<DOCUMENT-NAME>.md` (UPPER_SNAKE_CASE for root, kebab-case for docs/)
- **Architecture Decision**: `ADR-<number>-<title>.md` (e.g., `ADR-001-serverless-architecture.md`)

### Code Naming

**JavaScript/TypeScript:**

- **Variables**: `camelCase` (e.g., `userId`, `budgetData`)
- **Functions**: `camelCase` (e.g., `getUserById`, `createBudget`)
- **Classes**: `PascalCase` (e.g., `UserService`, `BudgetRepository`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `API_BASE_URL`)
- **Interfaces**: `PascalCase` with `I` prefix (e.g., `IUser`, `IBudget`)
- **Types**: `PascalCase` (e.g., `User`, `Budget`)
- **Enums**: `PascalCase` (e.g., `UserRole`, `BudgetStatus`)

**React Components:**

- **Component**: `PascalCase` (e.g., `BudgetList`, `TransactionForm`)
- **Props Interface**: `<ComponentName>Props` (e.g., `BudgetListProps`)
- **Hooks**: `use<HookName>` (e.g., `useAuth`, `useBudget`)
- **Context**: `<Name>Context` (e.g., `AuthContext`, `ThemeContext`)

**AWS Resources:**

- **Lambda Function**: `budgetbuddy-<function-name>` (e.g., `budgetbuddy-auth`)
- **DynamoDB Table**: `budgetbuddy-<env>-<table-name>` (e.g., `budgetbuddy-dev-main`)
- **S3 Bucket**: `budgetbuddy-<env>-<purpose>` (e.g., `budgetbuddy-dev-uploads`)
- **IAM Role**: `budgetbuddy-<env>-<function>-role` (e.g., `budgetbuddy-dev-auth-role`)

## Module Boundaries

### Backend (Lambda Functions)

**Function Structure:**

```
backend/functions/<function-name>/
├── index.js              # Handler (entry point)
├── service.js            # Business logic
├── repository.js         # Data access
├── validators.js         # Input validation
├── errors.js             # Custom errors
├── *.test.js             # Tests
├── package.json          # Dependencies
└── README.md             # Documentation
```

**Layers:**

- **Purpose**: Share code across Lambda functions
- **Location**: `backend/layers/<layer-name>/nodejs/`
- **Examples**: `common` (DynamoDB helpers), `shared` (CORS, validation)

**Separation of Concerns:**

- **Handler**: HTTP request/response, error handling
- **Service**: Business logic, orchestration
- **Repository**: Database operations, queries
- **Validators**: Input validation, schema checking

### Frontend (React)

**Web App Structure:**

```
packages/web-app/src/
├── components/           # Reusable components
│   ├── auth/            # Auth-related components
│   ├── budget/          # Budget-related components
│   ├── layout/          # Layout components
│   └── transactions/    # Transaction components
├── contexts/            # React contexts
│   ├── AuthContext.tsx  # Auth state
│   └── ThemeContext.tsx # Theme state
├── pages/               # Page components
│   ├── AuthPage.tsx     # Login/register
│   ├── BudgetPage.tsx   # Budget management
│   └── SettingsPage.tsx # Settings
├── services/            # API clients
│   ├── api.ts           # API client
│   └── auth.ts          # Auth service
├── utils/               # Utilities
│   ├── date-helpers.ts  # Date utilities
│   └── validation.ts    # Validation helpers
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

**Mobile App Structure:**

```
packages/mobile/src/
├── components/          # Reusable components
│   ├── ui/             # UI primitives
│   └── ...             # Feature components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── navigation/         # Navigation config
├── screens/            # Screen components
│   ├── auth/          # Auth screens
│   └── ...            # Feature screens
├── services/          # API clients, offline storage
├── types/             # TypeScript types
└── App.tsx            # Root component
```

**Shared Package:**

```
packages/shared/src/
├── constants/          # Shared constants
├── types/              # Shared TypeScript types
├── utils/              # Shared utilities
└── validation/         # Shared validation schemas
```

### Infrastructure (CDK)

**Stack Structure:**

```
infrastructure/lib/
├── auth-stack.ts           # Cognito, auth Lambda
├── database-stack.ts       # DynamoDB tables
├── api-stack.ts            # API Gateway, Lambda integrations
├── hosting-stack.ts        # S3, CloudFront
├── monitoring-stack.ts     # CloudWatch, alarms
└── README-<stack>.md       # Stack documentation
```

**Stack Dependencies:**

```
DatabaseStack (base)
  ↓
AuthStack (depends on DatabaseStack)
  ↓
ApiStack (depends on AuthStack, DatabaseStack)
  ↓
HostingStack (depends on ApiStack)
  ↓
MonitoringStack (depends on all)
```

## How to Add a New Feature End-to-End

### 1. Create Spec

**Location**: `.kiro/specs/<feature-name>/`

**Files**:

- `requirements.md` - User stories, acceptance criteria
- `design.md` - Architecture, data models, API design
- `tasks.md` - Implementation tasks with definition of done

### 2. Backend (Lambda Function)

**Steps**:

1. Create function directory: `backend/functions/<function-name>/`
2. Create handler: `index.js` with exports.handler
3. Create service: `service.js` with business logic
4. Create repository: `repository.js` with data access
5. Create tests: `*.test.js` with Jest
6. Create README: `README.md` with function docs
7. Add dependencies: `package.json`

**Example**:

```javascript
// backend/functions/budget/index.js
const { getBudget } = require("./service");
const { getCorsHeaders } = require("/opt/nodejs/shared/cors");

exports.handler = async (event) => {
  try {
    const { budgetId } = event.pathParameters;
    const budget = await getBudget(budgetId);

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify(budget),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### 3. Infrastructure (CDK Stack)

**Steps**:

1. Create or update stack: `infrastructure/lib/<stack>-stack.ts`
2. Define Lambda function with CDK
3. Define IAM role with least privilege
4. Attach Lambda layers (common, shared)
5. Add API Gateway integration
6. Add CloudWatch alarms
7. Create stack README: `README-<stack>.md`

**Example**:

```typescript
// infrastructure/lib/budget-stack.ts
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

export class BudgetStack extends cdk.Stack {
  public readonly budgetFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: BudgetStackProps) {
    super(scope, id, props);

    // Create Lambda function
    this.budgetFunction = new lambda.Function(this, "BudgetFunction", {
      functionName: "budgetbuddy-budget",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/functions/budget"),
      layers: [props.commonLayer, props.sharedLayer],
      environment: {
        TABLE_NAME: props.table.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Grant DynamoDB permissions
    props.table.grantReadWriteData(this.budgetFunction);
  }
}
```

### 4. Frontend (React Component)

**Steps**:

1. Create component: `packages/web-app/src/components/<feature>/<Component>.tsx`
2. Create service: `packages/web-app/src/services/<feature>.ts`
3. Create types: `packages/shared/src/types/<feature>.ts`
4. Create tests: `<Component>.test.tsx`
5. Add to page: `packages/web-app/src/pages/<Page>.tsx`

**Example**:

```typescript
// packages/web-app/src/components/budget/BudgetList.tsx
import React from 'react';
import { useBudgets } from '../../hooks/useBudgets';

export const BudgetList: React.FC = () => {
  const { budgets, isLoading, error } = useBudgets();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {budgets.map(budget => (
        <div key={budget.id}>{budget.name}</div>
      ))}
    </div>
  );
};
```

### 5. Tests

**Unit Tests**:

- **Location**: Same directory as code
- **Naming**: `<name>.test.js` or `<name>.test.tsx`
- **Framework**: Jest
- **Coverage**: > 80%

**Integration Tests**:

- **Location**: `tests/` directory
- **Naming**: `<feature>-integration.test.js`
- **Framework**: Jest
- **Scope**: API endpoints, database operations

**Property-Based Tests**:

- **Location**: Same directory as code or `tests/`
- **Naming**: `<name>.pbt.test.js`
- **Framework**: fast-check
- **Scope**: Invariants, edge cases

### 6. Documentation

**Update**:

1. **README.md** - Add feature to recent achievements
2. **CHANGELOG.md** - Add version entry with feature details
3. **DEVELOPMENT_LOG.md** - Add session entry with implementation details
4. **docs/development-status.md** - Update status and progress
5. **docs/api-endpoints.md** - Add API documentation (if new endpoint)

### 7. Validation and Deployment

**Validation**:

```bash
# Run validation
node scripts/validate-for-commit.js

# If pass, commit
node scripts/safe-commit-push.js "feat: add <feature>"
```

**Deployment**:

- Push to `develop` branch → Auto-deploy to dev
- Create PR to `main` → Review and merge → Auto-deploy to staging
- Manual approval → Deploy to prod

## Definition of Done

### For Code

- [ ] Code written and follows style guide
- [ ] Unit tests written and passing (> 80% coverage)
- [ ] Integration tests written and passing (if applicable)
- [ ] Property-based tests written and passing (if applicable)
- [ ] Linting passes (ESLint)
- [ ] Type checking passes (TypeScript)
- [ ] Security check passes (npm audit)
- [ ] Code reviewed (if not autonomous mode)

### For Infrastructure

- [ ] CDK stack created or updated
- [ ] IAM roles follow least privilege
- [ ] CloudWatch alarms configured
- [ ] Stack README created or updated
- [ ] CDK synth passes
- [ ] CDK deploy passes (dev environment)

### For Documentation

- [ ] README.md updated (if major feature)
- [ ] CHANGELOG.md updated (version entry)
- [ ] DEVELOPMENT_LOG.md updated (session entry)
- [ ] docs/development-status.md updated (status)
- [ ] API documentation updated (if new endpoint)
- [ ] Function README created (if new Lambda)

### For Deployment

- [ ] Validation passes (`validate-for-commit.js`)
- [ ] Committed using safe workflow (`safe-commit-push.js`)
- [ ] CI/CD pipeline passes
- [ ] Health checks pass
- [ ] Monitoring and alarms working

## Architectural Boundaries

### Domain Logic vs Infrastructure

**Domain Logic** (Business Rules):

- **Location**: `service.js` files
- **Examples**: Budget calculations, validation rules, business workflows
- **Dependencies**: None (pure functions where possible)
- **Testing**: Unit tests

**Infrastructure** (Technical Concerns):

- **Location**: `index.js` (handlers), `repository.js` (data access)
- **Examples**: HTTP handling, database queries, AWS SDK calls
- **Dependencies**: AWS SDK, external libraries
- **Testing**: Integration tests

### Public APIs vs Internal Implementation

**Public APIs**:

- **Definition**: Lambda handlers, API Gateway endpoints
- **Stability**: Backward compatible, versioned
- **Documentation**: API documentation, OpenAPI spec (future)
- **Changes**: Require spec update, version bump

**Internal Implementation**:

- **Definition**: Service functions, repository methods
- **Stability**: Can change freely
- **Documentation**: Code comments, JSDoc
- **Changes**: No spec update required

## Folder Structure Rules

### Backend

**One Lambda per Endpoint Group**:

- **auth**: Authentication endpoints (register, login, profile)
- **budget**: Budget CRUD operations
- **transactions**: Transaction CRUD operations
- **export**: Data export (CSV, PDF)

**Shared Code in Layers**:

- **common**: DynamoDB helpers, utilities
- **shared**: CORS, validation, error formatting

### Frontend

**Component Organization**:

- **By Feature**: Group related components (e.g., `components/budget/`)
- **By Type**: Separate UI primitives (e.g., `components/ui/`)
- **By Domain**: Separate business logic (e.g., `services/`, `contexts/`)

**Shared Code**:

- **packages/shared**: Code shared between web and mobile
- **packages/api-client**: API client shared between platforms

### Infrastructure

**Stack Organization**:

- **By Service**: One stack per AWS service group (auth, database, api)
- **By Environment**: Environment-specific configuration via CDK context
- **By Dependency**: Explicit stack dependencies

## Summary

**Key Principles**:

- Clear separation of concerns (handler → service → repository)
- Consistent naming conventions (kebab-case files, camelCase code)
- Modular architecture (small, focused modules)
- Comprehensive testing (unit, integration, property-based)
- Complete documentation (code, API, architecture)

**Adding a Feature**:

1. Create spec (requirements, design, tasks)
2. Implement backend (Lambda, service, repository, tests)
3. Define infrastructure (CDK stack, IAM, alarms)
4. Implement frontend (component, service, tests)
5. Update documentation (README, CHANGELOG, DEVELOPMENT_LOG, status)
6. Validate and deploy (validation script, safe commit, CI/CD)

**Definition of Done**:

- Code + tests + docs + infra + validation + deployment
