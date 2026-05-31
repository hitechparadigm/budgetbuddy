---
inclusion: always
---

# Technology Stack

## Frontend

- **Web**: React 18+ / Vite / TypeScript strict / Tailwind / React Router v6 / React Query / Zod
- **Mobile**: React Native + Expo / TypeScript / React Navigation v6 / SQLite + AsyncStorage

## Backend

- **Runtime**: Node.js 20.x on AWS Lambda (serverless)
- **API**: AWS API Gateway (REST) with Cognito authorizer
- **Pattern**: Handler -> Service -> Repository (one Lambda per endpoint group)
- **Layers**: Common (DynamoDB helpers, `BudgetAccessResolver`, `entitlements.js`), Shared (CORS, validation)

## Data

- **DB**: DynamoDB single-table (PK: `USER#`/`BUDGET#`, SK: entity-specific; budget periods keyed as `PERIOD#<month>`)
- **Storage**: S3 (uploads, exports, 30-day lifecycle)
- **Cache**: Not yet (future: ElastiCache Redis)

## Auth

- Cognito User Pools + Google OAuth 2.0 (PKCE)
- JWT carries only `userId`; active budget and role resolved from DynamoDB at request time via `BudgetAccessResolver`
- RBAC roles: `owner | partner | household_member | viewer`
- Feature gating via `canUseFeature()` in `backend/layers/common/nodejs/entitlements.js`

## Infrastructure

- CDK v2 (TypeScript), modular stacks, env-specific context
- Budgets API stack: `api-budgets-stack.ts` (replaced `api-family-stack.ts`)
- CI/CD: GitHub Actions (dev auto-deploy on develop, staging on main, prod manual)

## Forbidden

- Moment.js (use native Date), Lodash (use ES6+), jQuery, axios (use fetch)

## Adding Dependencies

- Check if existing lib works first
- Evaluate bundle size, maintenance, security
- Use exact/pinned versions, npm only
