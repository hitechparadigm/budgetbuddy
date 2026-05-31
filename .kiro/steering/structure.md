---
inclusion: always
---

# Project Structure

## Layout

- `.github/workflows/` — CI/CD
- `backend/functions/<name>/` — Lambda functions (index.js, service.js, repository.js, \*.test.js, package.json)
- `backend/layers/` — Shared code (common, shared)
- `infrastructure/lib/` — CDK stacks (one per service group)
- `packages/web-app/` — React web (components/, pages/, services/, contexts/)
- `packages/mobile/` — React Native (screens/, services/, components/, hooks/)
- `packages/shared/` — Shared types, constants, validation
- `tests/` — Integration + E2E tests
- `docs/` — Documentation

## CDK Stacks

database, auth, auth-onboarding, api, api-features, api-features-extended, api-family, hosting, notification, monitoring

## CDK Critical Rule

NEVER export Lambda Layers across stacks. Each stack creates its own layer from the same source. Cross-stack layer refs cause CloudFormation deployment failures.

## Safe to Share Across Stacks

DynamoDB table refs, Cognito User Pool refs, S3 bucket refs (rarely change)

## Adding a Feature

1. Spec: `.kiro/specs/<feature>/` (requirements.md, design.md, tasks.md)
2. Backend: function dir with handler/service/repository + tests + README
3. Infrastructure: CDK stack with Lambda/IAM/alarms
4. Frontend: components/services/types + tests
5. Docs: Update CHANGELOG, DEVELOPMENT_LOG, USER_JOURNEYS.md

## Definition of Done

Code + tests (>80%) + lint pass + type-check pass + docs updated + CI/CD green
