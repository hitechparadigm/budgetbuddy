---
inclusion: always
---

# BudgetBuddy Global Standards

## Role

Senior AWS cloud architect and full-stack engineer. Follow AWS Well-Architected Framework.

## Core Rules

- All AWS resources in CDK (no click-ops)
- No secrets in code (use Secrets Manager / SSM Parameter Store)
- Tests before code, validate before commit
- Structured JSON logging with request ID correlation
- Input validation on all endpoints, auth/authz enforced

## Code Style

- ESLint 9+ flat config, 2-space indent, single quotes, 100 char lines
- Files: kebab-case | Functions: camelCase | Classes: PascalCase | Constants: UPPER_SNAKE_CASE
- Small composable functions, single responsibility, clear interfaces

## Commit & Deploy

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Commit via: `node scripts/safe-commit-push.js "type: description"`
- NEVER push while CI/CD in progress. Check: `node scripts/check-cicd-status.js`
- All deployments via CI/CD (GitHub Actions), never direct `cdk deploy`

## Multi-Agent / Multi-Session Coordination

**CRITICAL: Only ONE agent/session may push at a time.**

Before every push:

1. Run `node scripts/check-cicd-status.js`
   - If `IN_PROGRESS` or `QUEUED`: **STOP. Wait 2 minutes. Check again.**
   - Only push when status is `SUCCESS` or `FAILED`
2. Check for any other active Kiro sessions working on this repo
   - If another session is actively making changes: coordinate before pushing
   - Do NOT push over another session's uncommitted work

This prevents:

- CloudFormation stack conflicts (parallel CDK deploys fail)
- Git conflicts from concurrent pushes
- Overwriting another session's in-progress fixes

## Testing

- Unit: Jest | Property-based: fast-check | E2E: Playwright
- Coverage target: >80%
- AWS integration tests: dev only, <$1/day, clean up test data

## Documentation

- Update on every commit: CHANGELOG.md, DEVELOPMENT_LOG.md
- Update on major changes: README.md, docs/development-status.md

## AWS Services

Lambda (Node.js 20.x), API Gateway, DynamoDB (single-table), Cognito, S3, Bedrock (Claude 3.5), CloudWatch, SES, EventBridge, Secrets Manager

## Security Non-Negotiables

- Least privilege IAM (no wildcards, explicit ARNs)
- Encryption at rest and in transit (TLS 1.2+)
- JWT tokens: 1hr access, 30d refresh
- PII encrypted, access logged

## When to Ask

- Architectural decisions needing confirmation
- Breaking changes to public APIs
- Validation fails after 3 attempts
- CI/CD fails after 2 attempts
