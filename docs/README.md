# BudgetBuddy Documentation

**Last Updated**: 2026-09-23

Every document below is either actively maintained or a stable reference. There is no
`docs/archive/` subdirectory - one-off session and incident summaries have been retired. Before
creating a new document here, check this index for an existing document covering the same
subject and extend it instead (see `.kiro/steering/structure.md`, "Documentation Placement").

## Architecture & Infrastructure
- **[AWS Stack Architecture](./aws-stack-architecture.md)** - Stack list, dependencies, DynamoDB schema, Lambda access pattern, resource naming/tagging standards, deployment commands

## Configuration & Setup
- **[Configuration Guide](./configuration-guide.md)** - Environment variables and frontend configuration
- **[Deployment Guide](./deployment-guide.md)** - AWS prerequisites and CDK deployment steps
- **[LocalStack Guide](./localstack-guide.md)** - Local AWS service emulation for faster Lambda iteration
- **[SES Email Setup](./ses-email-setup.md)** - Verifying sender identities while SES is in sandbox mode

## API Reference
- **[API Endpoints](./api-endpoints.md)** - Complete REST API documentation with auth token usage

## User Guides
- **[Budget Collaboration & Notifications](./user-guide-budget-collaboration.md)** - Roles, invitations, member management, push notifications, and multi-currency support

## Product & Design
- **[Product Requirements](./product-requirements.md)** - Living document of what is built, in progress, and planned
- **[Mobile UX Design](./mobile-ux-design.md)** - Competitive analysis and design system for the mobile app

## Development Process
- **[Development Status](./development-status.md)** - Current session progress and next priorities
- **[Development Best Practices](./DEVELOPMENT_BEST_PRACTICES.md)** - Architecture patterns and lessons learned

## Outside `/docs`
- **[Repository README](../README.md)** - Project overview, quick start, recent achievements
- **[Architecture Decision Records](../ARCHITECTURE_DECISIONS.md)** - ADR-001 and future ADRs
- **[Security Guidelines](../SECURITY.md)** - Secret management, incident response
- **[.kiro/README.md](../.kiro/README.md)** - Development system configuration overview
- **[.kiro/SYSTEM_GUIDE.md](../.kiro/SYSTEM_GUIDE.md)** - Architecture summary, workflow, deprecated items
- **[.kiro/specs/README.md](../.kiro/specs/README.md)** - Spec index (status, category, description)
- **[.github/workflows/README.md](../.github/workflows/README.md)** - CI/CD workflow reference
- **[.github/BRANCH_PROTECTION.md](../.github/BRANCH_PROTECTION.md)** - Required status checks and secrets
- **[backend/README.md](../backend/README.md)** - Lambda functions package overview
- **[infrastructure/README.md](../infrastructure/README.md)** - CDK stacks package overview
- **[packages/shared/README.md](../packages/shared/README.md)** - Shared types/utilities package overview
- **[packages/api-client/README.md](../packages/api-client/README.md)** - HTTP client library overview

Individual Lambda function READMEs live at `backend/functions/<name>/README.md` per steering
(`structure.md`: "README per Lambda function and CDK stack") and are not listed individually here.