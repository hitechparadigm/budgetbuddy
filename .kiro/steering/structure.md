---
inclusion: always
---

# Structure Steering – BudgetBuddy

## Repository Layout

**Key Directories**:

- `.github/workflows/` - CI/CD (deploy-dev.yml, pr-check.yml)
- `.husky/` - Git hooks (pre-commit, pre-push)
- `.kiro/` - Kiro config (hooks/, specs/, steering/)
- `backend/` - Lambda functions + layers
- `docs/` - Documentation
- `infrastructure/` - AWS CDK stacks
- `packages/` - Frontend (api-client, mobile, shared, web-app)
- `scripts/` - Utility scripts
- `tests/` - Integration tests

## Naming Conventions

**Files**: kebab-case (user-service.js, auth-stack.ts, BudgetPage.tsx)
**Code**: camelCase (functions/variables), PascalCase (classes/components), UPPER_SNAKE_CASE (constants)
**React**: PascalCase components, use<Name> hooks, <Name>Context contexts
**AWS**: budgetbuddy-<function>, budgetbuddy-<env>-<table>

## Module Boundaries

**Backend Pattern**: Handler (HTTP) → Service (business logic) → Repository (data access)
**Lambda Structure**: index.js, service.js, repository.js, validators.js, errors.js, \*.test.js, package.json, README.md
**Layers**: common (DynamoDB helpers), shared (CORS, validation)

**Frontend Structure**:

- Web: components/, contexts/, pages/, services/, utils/
- Mobile: components/, contexts/, hooks/, navigation/, screens/, services/, types/
- Shared: constants/, types/, utils/, validation/

**Infrastructure**: One stack per service group (auth, database, api, hosting, monitoring)

## How to Add a Feature

1. **Create Spec**: `.kiro/specs/<feature>/` with requirements.md, design.md, tasks.md
2. **Backend**: Create function dir, implement handler/service/repository, write tests, add README
3. **Infrastructure**: Create/update CDK stack, define Lambda/IAM/alarms, create stack README
4. **Frontend**: Create component/service/types, write tests, integrate into page
5. **Tests**: Unit (> 80%), integration, property-based
6. **Documentation**: Update README.md, CHANGELOG.md, DEVELOPMENT_LOG.md, docs/development-status.md, docs/api-endpoints.md
7. **Deploy**: Validate → safe-commit → push to develop → auto-deploy dev → PR to main → staging → manual prod

## Definition of Done

**Code**: Written, tests passing (> 80%), linting/type-checking pass, security check pass
**Infrastructure**: CDK stack created, IAM least privilege, alarms configured, README updated, synth/deploy pass
**Documentation**: See `.kiro/steering/00-global.md` for mandatory documentation requirements
**Deployment**: Validation pass, safe-commit used, CI/CD pass, health checks pass

## Architectural Boundaries

**Domain Logic** (service.js): Business rules, pure functions, unit tested
**Infrastructure** (index.js, repository.js): HTTP handling, DB queries, AWS SDK, integration tested

**Public APIs**: Lambda handlers, API Gateway endpoints - backward compatible, versioned, documented
**Internal**: Service/repository methods - can change freely, code comments only

## Folder Structure Rules

**Backend**: One Lambda per endpoint group (auth, budget, transactions, export) | Shared code in layers (common, shared)
**Frontend**: By feature (components/budget/), by type (components/ui/), by domain (services/, contexts/)
**Infrastructure**: By service (auth, database, api), by environment (CDK context), explicit dependencies

## Summary

**Principles**: Handler → service → repository separation, consistent naming, modular architecture, comprehensive testing
**Adding Feature**: Spec → backend → infrastructure → frontend → tests → docs → validate → deploy
**Definition of Done**: Code + tests + docs + infra + validation + deployment
