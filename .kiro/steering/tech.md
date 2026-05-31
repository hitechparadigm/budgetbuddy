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
- **Layers**: Common (DynamoDB helpers), Shared (CORS, validation)

## Data

- **DB**: DynamoDB single-table (PK: `USER#`/`FAMILY#`, SK: entity-specific)
- **Storage**: S3 (uploads, exports, 30-day lifecycle)
- **Cache**: Not yet (future: ElastiCache Redis)

## Auth

- Cognito User Pools + Google OAuth 2.0 (PKCE)
- RBAC: Primary, Spouse, Viewer roles
- Data isolation via familyId

## Infrastructure

- CDK v2 (TypeScript), modular stacks, env-specific context
- CI/CD: GitHub Actions (dev auto-deploy on develop, staging on main, prod manual)

## Forbidden

- Moment.js (use native Date), Lodash (use ES6+), jQuery, axios (use fetch)

## Adding Dependencies

- Check if existing lib works first
- Evaluate bundle size, maintenance, security
- Use exact/pinned versions, npm only
