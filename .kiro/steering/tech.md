---
inclusion: always
---

# Technology Stack

## Frontend — Web

- React 18+ / Vite / TypeScript strict
- Tailwind CSS + custom CSS design tokens (`--color-primary` #059669, `--color-surface`, etc.)
- React Router v6 / React Query / Zod
- Lucide React for icons; Inter font (@fontsource/inter)
- recharts (lazy-loaded, Insights page only)

## Frontend — Mobile

- React Native 0.74+ + Expo SDK 51+
- TypeScript strict / React Navigation v6
- SQLite (expo-sqlite) + AsyncStorage for offline storage
- Expo SecureStore for token storage (hardware-backed)
- Expo Notifications for push

## Backend

- Node.js 20.x on AWS Lambda (serverless)
- API Gateway REST with Cognito authorizer
- Pattern: `index.js` (handler + routing) → `service.js` (business logic) → `repository.js` (DynamoDB)
- One Lambda per endpoint group
- Layers: **Common** (`BudgetAccessResolver`, DynamoDB helpers, `entitlements.js`, `generateId`) + **Shared** (CORS, validation, error helpers)

## Data

- DynamoDB single-table (`budgetbuddy-main`) — PK: `USER#` or `BUDGET#`; SK: entity-specific
- Key suffixes: `PERIOD#<YYYY-MM>`, `TXN#<id>`, `GOAL#<id>`, `PLANNED_TXN#<id>`, `ACCOUNT#<id>`, `MEMBER#<userId>`, `INVITATION#<id>`
- S3: uploads, exports, pattern cache (30-day lifecycle rules)
- Cache: not yet (future: ElastiCache Redis)

## Auth

- Cognito User Pools + Google OAuth 2.0 (PKCE)
- JWT carries **only** `userId` — budget ID and role resolved from DynamoDB at request time
- RBAC roles: `owner | partner | household_member | viewer`
- Feature gating via `canUseFeature(subscriptionTier, featureKey)` in `entitlements.js`

## Infrastructure

- CDK v2 TypeScript, modular stacks, env-specific context
- 4 API Gateways: main, budgets, features, extended-features
- CI/CD: GitHub Actions — dev (develop branch auto), staging (main auto), prod (manual dispatch)

## Forbidden Libraries

- Moment.js → native Date
- Lodash → ES6+
- jQuery
- axios → fetch

## Dependency Rules

- Exact/pinned versions, npm only
- Evaluate bundle size + maintenance + security before adding
- Check if existing lib solves the problem first
