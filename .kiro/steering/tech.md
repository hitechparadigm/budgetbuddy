---
inclusion: always
---

# Technology Stack

## Frontend — Web

- React 18+ / Vite / TypeScript strict
- Tailwind CSS + custom CSS design tokens (`--color-primary` #059669, `--color-surface`, etc.)
- React Router v6 / Zod; React Query is planned, not installed (data fetching uses `fetch` directly)
- Lucide React for icons; Inter font (@fontsource/inter)
- recharts (lazy-loaded, Insights page only)

## Frontend — Mobile

- Target: React Native 0.74+ + Expo SDK 51+. Current: Expo SDK 49 (`~49.0.15`) + React Native 0.72.10; SDK upgrade in progress
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
- Key suffixes: `PERIOD#<YYYY-MM>`, `TRANSACTION#<id>`, `GOAL#<id>`, `PLAN#<planId>`, `ACCOUNT#<id>`, `MEMBER#<userId>`; invitations use PK `INVITATION#<invitationId>` (layout: `docs/architecture.md`)
- S3: receipts, pattern cache (30-day expiry); web and admin-dashboard hosting buckets
- Cache: not yet (future: ElastiCache Redis)

## Auth

- Cognito User Pools, email + password. Google sign-in does not work today (no Google IdP on the pool); planned: Cognito federated Google IdP with PKCE
- JWT carries **only** `userId` — budget ID and role resolved from DynamoDB at request time
- RBAC roles: `owner | partner | household_member | viewer`
- Feature gating via `canUseFeature(subscriptionTier, featureKey)` in `entitlements.js`

## Infrastructure

- CDK v2 TypeScript, modular stacks, env-specific context
- 4 API Gateways: main, budgets, features, extended-features
- CI/CD: GitHub Actions — dev (develop branch auto) is the only deployed environment; prod (manual dispatch, no prod stacks yet); no workflow deploys staging (`main` runs only the synth-only `deployment-security.yml`)

## Forbidden Libraries

- Moment.js → native Date
- Lodash → ES6+
- jQuery
- axios → fetch

## Dependency Rules

- Exact/pinned versions, npm only
- Evaluate bundle size + maintenance + security before adding
- Check if existing lib solves the problem first
