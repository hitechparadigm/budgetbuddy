---
inclusion: always
---

# BudgetBuddy Global Standards

## Role

Senior AWS cloud architect and full-stack engineer. Follow AWS Well-Architected Framework.

## Security Non-Negotiables (Enforce on Every Change)

- **No secrets in code** — use Secrets Manager / SSM Parameter Store
- **Least privilege IAM** — no wildcards; explicit resource ARNs only
- **Encryption everywhere** — at rest (DynamoDB/S3 managed keys) and in transit (TLS 1.2+)
- **JWT tokens**: 1hr access, 30d refresh; token carries **only** `userId` — no budgetId, no role
- **`dataTraceEnabled: false`** on all API Gateways — never log request/response bodies containing tokens
- **PII encrypted**, access logged via CloudWatch structured logs
- **`BudgetAccessResolver`** on every Lambda touching budget data — resolves budgetId + role from DynamoDB
- **`canUseFeature(subscriptionTier, featureKey)`** for feature gating — never check tier string directly
- **Input validation** on all API endpoints (body, path params, query params)
- **No wildcards in IAM** — scope all resource ARNs to the specific table/function/bucket

## Core Rules

- All AWS resources in CDK (no click-ops)
- Tests before code — >80% coverage target
- Structured JSON logging with request ID correlation
- JSDoc on public APIs and complex functions; inline comments only for non-obvious logic

## Code Style

- ESLint 9+ flat config, 2-space indent, single quotes, 100-char lines
- Files: kebab-case | Functions: camelCase | Classes: PascalCase | Constants: UPPER_SNAKE_CASE
- Small composable functions, single responsibility, clear interfaces
- **Forbidden**: Moment.js (→ native Date), Lodash (→ ES6+), jQuery, axios (→ fetch)
- **Dependencies**: pinned exact versions, npm only, evaluate security + bundle size before adding

## Commit & Deploy

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- **NEVER push directly** — always: `node scripts/safe-commit-push.js "type: description"`
- **NEVER push while CI/CD is running** — check first: `node scripts/check-cicd-status.js`
- All deployments via GitHub Actions only — never `cdk deploy` directly

## Multi-Agent Safety

**CRITICAL: Only ONE agent/session may push at a time.** CloudFormation cannot handle parallel deploys.

Before every push:
1. `node scripts/check-cicd-status.js` — if IN_PROGRESS or QUEUED: **STOP. Wait 2 min. Check again.**
2. Confirm no other Kiro session is actively making changes.

## Autonomous Execution

Work continuously until all tasks in scope are complete. No summaries or check-ins between tasks. Start the next task immediately after completing one.

**Stop only for TRUE blockers:**
- Architectural decisions requiring user confirmation
- Breaking API changes where correct behavior is genuinely ambiguous
- Validation/tests failing after 3 different approaches
- CI/CD failing after 2 fix attempts → document in DEVELOPMENT_LOG.md, then continue other tasks

## Documentation (Every Commit)

- `CHANGELOG.md` — version + categorized changes
- `DEVELOPMENT_LOG.md` — session work summary
- `README.md` + `docs/development-status.md` — major changes only

## AWS Services in Use

Lambda (Node.js 20.x), API Gateway (4 gateways), DynamoDB single-table (`budgetbuddy-main`), Cognito, S3, Bedrock (Claude 3.5 Sonnet), CloudWatch, SES, EventBridge, Secrets Manager, Plaid

All budget data under `BUDGET#<budgetId>` partition keys. `USER#<userId>/PROFILE` stores `defaultBudgetId`.
