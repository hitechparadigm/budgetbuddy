---
inclusion: always
---

# Technology Steering – BudgetBuddy

## Technology Stack

### Frontend Stack

**Web Application:**

- **Framework**: React 18+ with Vite
- **Language**: TypeScript (strict mode)
- **State Management**: React Context + React Query
- **UI Library**: Tailwind CSS
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Fetch API with custom wrapper

**Mobile Application:**

- **Framework**: React Native + Expo
- **Language**: TypeScript (strict mode)
- **Navigation**: React Navigation v6
- **State Management**: React Context + React Query
- **UI Components**: Custom component library
- **Offline Storage**: SQLite + AsyncStorage
- **Secure Storage**: Expo SecureStore

### Backend Stack

**API Layer:**

- **Runtime**: Node.js 20.x
- **Framework**: AWS Lambda (serverless)
- **API Gateway**: AWS API Gateway (REST API)
- **Language**: JavaScript (ES2022)
- **Validation**: Manual validation (consider Zod)
- **Error Handling**: Centralized error formatter

**Architecture Pattern:**

- **Style**: Serverless microservices
- **Pattern**: Handler → Service → Repository
- **Layers**: Lambda layers for shared code
- **Separation**: One Lambda per endpoint group

### Data Layer

**Primary Database:**

- **Service**: Amazon DynamoDB
- **Design**: Single-table design
- **Partition Key**: `PK` (e.g., `USER#<userId>`, `FAMILY#<familyId>`)
- **Sort Key**: `SK` (e.g., `BUDGET#<budgetId>`, `TRANSACTION#<transactionId>`)
- **GSIs**: As needed for access patterns
- **Backup**: Point-in-time recovery enabled

**Caching:**

- **Not implemented yet**
- **Future**: ElastiCache (Redis) for hot data
- **Use cases**: User sessions, frequently accessed budgets

**File Storage:**

- **Service**: Amazon S3
- **Use cases**: User uploads, exports, backups
- **Encryption**: SSE-S3 (server-side encryption)
- **Lifecycle**: Automatic deletion after 30 days

### Authentication & Authorization

**Identity Provider:**

- **Service**: AWS Cognito User Pools
- **Auth Flow**: USER_PASSWORD_AUTH + REFRESH_TOKEN_AUTH
- **Token Type**: JWT (access + refresh tokens)
- **Token Expiration**: Access 1 hour, Refresh 30 days
- **MFA**: Not implemented (future)

**OAuth Integration:**

- **Provider**: Google Sign-In
- **Flow**: OAuth 2.0 with PKCE
- **Credentials**: AWS Secrets Manager
- **Platforms**: Web, iOS, Android (separate client IDs)

**Authorization:**

- **Model**: Role-based access control (RBAC)
- **Roles**: Primary, Spouse, Viewer
- **Enforcement**: Lambda authorizer + application logic
- **Data Isolation**: Family-level (via familyId)

### AI & Machine Learning

**AI Service:**

- **Provider**: AWS Bedrock
- **Model**: Claude 3.5 Sonnet
- **Use Cases**: Budget generation, category suggestions
- **Cost**: Pay-per-use (~$0.01 per request)

**Data:**

- **City Expense Data**: 348 cities across 9 countries
- **Storage**: Static JSON files in codebase
- **Update Frequency**: Quarterly

### Infrastructure as Code

**IaC Tool:**

- **Framework**: AWS CDK (TypeScript)
- **Version**: CDK v2.100+
- **Stacks**: Modular (auth, database, api, hosting, monitoring)
- **Environments**: dev, staging, prod
- **Deployment**: GitHub Actions CI/CD

**Rules:**

- All AWS resources MUST be defined in CDK
- No click-ops (manual AWS console changes)
- Environment-specific configuration via context
- Stack dependencies explicitly defined

### Observability

**Logging:**

- **Service**: CloudWatch Logs
- **Format**: Structured JSON
- **Retention**: 7 days (dev), 30 days (prod)
- **Correlation**: Request ID in all logs
- **Levels**: ERROR, WARN, INFO, DEBUG

**Metrics:**

- **Service**: CloudWatch Metrics
- **Custom Metrics**: API latency, error rates, user actions
- **Dashboards**: Per-service dashboards
- **Alarms**: Critical thresholds (error rate, latency)

**Tracing:**

- **Service**: AWS X-Ray
- **Enabled**: All Lambda functions
- **Sampling**: 10% in prod, 100% in dev
- **Use Cases**: Performance debugging, dependency mapping

**Monitoring:**

- **Health Checks**: `/health` endpoints on all services
- **Uptime Monitoring**: CloudWatch Synthetics (future)
- **Alerting**: SNS → Email/Slack

### Security Baselines

**Secrets Management:**

- **Service**: AWS Secrets Manager + SSM Parameter Store
- **Secrets**: API keys, OAuth credentials, database passwords
- **Rotation**: Automatic (where supported)
- **Access**: IAM-based, least privilege

**No Secrets in Code:**

- **Rule**: NEVER hardcode secrets, keys, or passwords
- **Validation**: Pre-commit hook scans for secrets
- **Storage**: Environment variables from Secrets Manager
- **Rotation**: Automated where possible

**Network Security:**

- **API Gateway**: Public endpoints with throttling
- **Lambda**: No VPC (serverless, no network access needed)
- **DynamoDB**: IAM-based access control
- **S3**: Bucket policies + IAM

**Data Protection:**

- **Encryption at Rest**: All services (DynamoDB, S3, Secrets Manager)
- **Encryption in Transit**: TLS 1.2+ for all endpoints
- **PII Handling**: Encrypted, access logged
- **Data Retention**: 7 years (compliance)

**IAM Best Practices:**

- **Least Privilege**: Minimal permissions per role
- **Service Roles**: One role per Lambda function
- **No Wildcards**: Explicit resource ARNs
- **Regular Audits**: IAM Access Analyzer

**Authentication:**

- **Password Policy**: Min 8 chars, complexity requirements
- **Session Management**: JWT with short expiration
- **Token Storage**: Secure (SecureStore on mobile, httpOnly cookies on web)
- **Logout**: Token invalidation

### Testing Tooling

**Unit Testing:**

- **Framework**: Jest
- **Coverage Target**: > 80%
- **Mocking**: Jest mocks for AWS SDK
- **Run**: `npm test` or `npm run test:unit`

**Integration Testing:**

- **Framework**: Jest
- **Scope**: API endpoints, database operations
- **Environment**: Isolated test environment
- **Run**: `npm run test:integration`

**Property-Based Testing:**

- **Framework**: fast-check
- **Use Cases**: Invariants, edge cases, data validation
- **Coverage**: Critical business logic
- **Run**: `npm run test:pbt`

**End-to-End Testing:**

- **Framework**: Playwright (future)
- **Scope**: User journeys (onboarding, budget creation)
- **Environment**: Staging
- **Run**: `npm run test:e2e`

**Security Testing:**

- **npm audit**: Weekly, blocks on high/critical
- **Dependency scanning**: Dependabot
- **SAST**: ESLint security rules
- **DAST**: Manual penetration testing (future)

### CI/CD Pipeline

**Platform:**

- **Service**: GitHub Actions
- **Triggers**: Push to develop/main, pull requests
- **Environments**: dev, staging, prod

**Workflow:**

1. **Pre-deployment Validation**
   - Security check (npm audit)
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Unit tests
   - Documentation validation

2. **Build**
   - CDK synth
   - Frontend build (Vite)
   - Lambda packaging

3. **Deploy**
   - CDK deploy (all stacks)
   - CloudFront invalidation
   - Database migrations (if needed)

4. **Post-deployment Health Checks**
   - API health endpoints
   - Smoke tests
   - Rollback on failure

**Branch Protection:**

- **main**: Requires PR, 1 approval, all checks pass
- **develop**: Requires all checks pass
- **feature/\***: No restrictions

**Deployment Strategy:**

- **dev**: Auto-deploy on push to develop
- **staging**: Auto-deploy on push to main
- **prod**: Manual approval required

### Code Quality Standards

**Linting:**

- **Tool**: ESLint 9+ (flat config)
- **Rules**: Airbnb base + custom rules
- **Auto-fix**: `npm run lint`
- **CI**: Blocks on errors, warns on warnings

**Type Checking:**

- **Tool**: TypeScript (strict mode)
- **Target**: ES2022
- **Module**: ESNext
- **CI**: Blocks on errors

**Code Style:**

- **Formatter**: Prettier (future)
- **Line Length**: 100 characters
- **Indentation**: 2 spaces
- **Quotes**: Single quotes

**Naming Conventions:**

- **Files**: kebab-case (e.g., `user-service.js`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `IUser`)

### Dependency Management

**Package Manager:**

- **Tool**: npm (not yarn or pnpm)
- **Lock File**: package-lock.json (committed)
- **Workspaces**: Monorepo with npm workspaces

**Dependency Rules:**

- **Audit**: Weekly `npm audit` (blocks on high/critical)
- **Updates**: Monthly dependency updates
- **Overrides**: Use `overrides` for security fixes
- **Peer Dependencies**: Explicitly installed

**Allowed Libraries:**

- **Frontend**: React, React Router, React Query, Tailwind, Zod
- **Backend**: AWS SDK, fast-check, Jest
- **Infrastructure**: AWS CDK, constructs

**Forbidden Libraries:**

- **Moment.js**: Use native Date or date-fns
- **Lodash**: Use native ES6+ methods
- **jQuery**: Use native DOM APIs or React

**Adding New Libraries:**

1. Check if existing library can be used
2. Evaluate bundle size, maintenance, security
3. Add to `tech.md` (this file)
4. Document rationale in PR

### Performance Optimization

**Frontend:**

- **Code Splitting**: Route-based lazy loading
- **Bundle Size**: < 500KB initial load
- **Caching**: Service worker (future)
- **Images**: Lazy loading, WebP format

**Backend:**

- **Cold Starts**: Lambda layers, provisioned concurrency (if needed)
- **Database**: Single-table design, efficient queries
- **Caching**: In-memory caching, ElastiCache (future)
- **Async Processing**: SQS for background jobs (future)

**API:**

- **Pagination**: Limit 50 items per page
- **Compression**: Gzip enabled
- **Throttling**: API Gateway rate limiting
- **Caching**: CloudFront for static assets

### Cost Optimization

**Serverless First:**

- **Lambda**: Pay per invocation
- **DynamoDB**: On-demand pricing (dev), provisioned (prod)
- **API Gateway**: Pay per request
- **S3**: Lifecycle policies for old data

**Right-Sizing:**

- **Lambda Memory**: 512MB default, tune per function
- **DynamoDB**: On-demand for unpredictable workloads
- **CloudWatch Logs**: 7-day retention (dev), 30-day (prod)

**Monitoring:**

- **Cost Explorer**: Weekly cost reviews
- **Budgets**: Alerts at 80% of monthly budget
- **Tagging**: All resources tagged with environment, service

### Development Workflow

**Local Development:**

- **Frontend**: `npm run dev` (Vite dev server)
- **Backend**: Local Lambda testing with SAM (future)
- **Database**: DynamoDB Local (future)

**Testing:**

- **Unit**: `npm test`
- **Integration**: `npm run test:integration`
- **E2E**: `npm run test:e2e`
- **Coverage**: `npm run test:coverage`

**Validation:**

- **Pre-commit**: `node scripts/validate-for-commit.js`
- **Safe Commit**: `node scripts/safe-commit-push.js "message"`

**Deployment:**

- **Dev**: Push to develop branch (auto-deploy)
- **Staging**: Push to main branch (auto-deploy)
- **Prod**: Manual approval in GitHub Actions

### Documentation Standards

**Code Documentation:**

- **JSDoc**: For public APIs and complex functions
- **README**: Per Lambda function, per CDK stack
- **Inline Comments**: Only for non-obvious logic

**Architecture Documentation:**

- **Diagrams**: Text-based (Mermaid or PlantUML)
- **ADRs**: Architecture Decision Records in `docs/`
- **Runbooks**: Operational procedures in `docs/`

**API Documentation:**

- **Format**: OpenAPI 3.0 (future)
- **Location**: `docs/api-endpoints.md`
- **Examples**: Request/response samples

### Versioning

**Semantic Versioning:**

- **Format**: MAJOR.MINOR.PATCH (e.g., 1.4.0)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

**Git Workflow:**

- **Branches**: main, develop, feature/_, bugfix/_
- **Commits**: Conventional commits (feat, fix, docs, etc.)
- **Tags**: Version tags on main branch

### Environment Configuration

**Environments:**

- **dev**: Development (auto-deploy from develop)
- **staging**: Pre-production (auto-deploy from main)
- **prod**: Production (manual approval)

**Configuration:**

- **CDK Context**: Environment-specific values
- **Secrets Manager**: Environment-specific secrets
- **Environment Variables**: Injected at deploy time

**Differences:**

- **dev**: Verbose logging, no alarms, on-demand DynamoDB
- **staging**: Production-like, alarms enabled
- **prod**: Minimal logging, all alarms, provisioned DynamoDB

## Technology Decisions

### Why Serverless?

**Pros:**

- No server management
- Auto-scaling
- Pay-per-use pricing
- High availability built-in

**Cons:**

- Cold starts (mitigated with layers)
- Vendor lock-in (AWS)
- Debugging complexity (mitigated with X-Ray)

**Decision**: Serverless is ideal for MVP with unpredictable traffic.

### Why DynamoDB?

**Pros:**

- Serverless (no management)
- Auto-scaling
- High performance (single-digit ms latency)
- Built-in backup and recovery

**Cons:**

- NoSQL (requires data modeling)
- Limited query flexibility
- Cost at scale

**Decision**: DynamoDB fits serverless architecture and access patterns.

### Why React Native?

**Pros:**

- Code sharing with web (React)
- Single codebase for iOS and Android
- Large ecosystem
- Expo simplifies development

**Cons:**

- Performance vs native
- Platform-specific bugs
- Larger app size

**Decision**: React Native enables fast mobile development with code reuse.

### Why CDK over Terraform?

**Pros:**

- TypeScript (same language as app)
- AWS-native (better support)
- Constructs library (reusable patterns)
- Type safety

**Cons:**

- AWS-only (vendor lock-in)
- Steeper learning curve
- CloudFormation limitations

**Decision**: CDK provides type safety and AWS-native experience.

## Summary

**Stack**: React + React Native + Node.js Lambda + DynamoDB + CDK
**Architecture**: Serverless microservices
**Testing**: Jest + fast-check + property-based testing
**CI/CD**: GitHub Actions with automated deployment
**Security**: AWS best practices, secrets in Secrets Manager, encryption everywhere
**Observability**: CloudWatch Logs + Metrics + X-Ray

**Key Principles**:

- Serverless first
- Infrastructure as code (CDK)
- Test-driven development
- Security by default
- Cost-conscious design
