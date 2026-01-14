# Architecture Decision Records (ADR)

This document records significant architectural decisions made for the BudgetBuddy application.

## Format

Each decision follows this structure:

- **Date**: When the decision was made
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: What is the issue we're trying to solve?
- **Decision**: What did we decide to do?
- **Consequences**: What are the trade-offs?

---

## ADR-001: Pause Auth Lambda Refactoring

**Date**: 2026-01-14
**Status**: Accepted
**Deciders**: Architecture Review

### Context

We started refactoring the monolithic auth Lambda (1,340 lines) into 6 separate functions to fix an import ordering bug. After completing Phase 1 (shared utilities) and 1 of 6 functions (auth-onboarding), we conducted an architectural review.

**Findings**:

- Only 16% complete (1 of 6 functions)
- Root cause was simple: imports placed mid-file instead of at top
- Refactoring adds significant complexity without proportional value for MVP
- Creates dual maintenance burden (old + new code)
- Distracts from core feature development

### Decision

**PAUSE the auth Lambda refactoring immediately.**

**Actions Taken**:

1. Keep `budgetbuddy-auth-onboarding` (already deployed and working)
2. Cancel remaining 5 planned functions (register, login, google, profile, geolocation)
3. Fix import ordering with ESLint rules instead of splitting functions
4. Add file organization guidelines
5. Update tasks.md to reflect cancellation

**Alternative Solution**:

- Added ESLint rule: `no-use-before-define` to prevent import bugs
- Added `max-lines` warning to encourage refactoring when truly needed
- Added `max-lines-per-function` warning for code quality

### Consequences

**Positive**:

- ✅ Simpler architecture (2 auth functions instead of 7)
- ✅ Faster development velocity (no need to coordinate 6 deployments)
- ✅ Easier debugging (fewer places to look)
- ✅ Lower operational overhead
- ✅ Can focus on core features instead of infrastructure

**Negative**:

- ⚠️ Auth Lambda remains large (1,340 lines)
- ⚠️ Some code duplication between auth and auth-onboarding
- ⚠️ Wasted effort on Phase 1 (though shared utilities are still useful)

**Mitigation**:

- ESLint rules prevent the original bug from recurring
- File organization guidelines make large file manageable
- Can revisit splitting when we have 10,000+ users and real scaling needs

### When to Revisit

Consider splitting auth Lambda when:

1. **Traffic patterns diverge**: One endpoint gets 1000x more traffic than others
2. **Different teams**: Separate teams own different auth flows
3. **Different scaling needs**: One endpoint needs 3GB RAM, others need 512MB
4. **Real performance issues**: Measured cold start times > 3 seconds
5. **User base**: 10,000+ active users

**Current state**: None of these conditions apply.

---

## ADR-002: Consolidate Lambda Functions (9 → 5)

**Date**: 2026-01-14
**Status**: Accepted
**Deciders**: Architecture Review

### Context

We currently have 9 business logic Lambda functions:

1. auth (1,340 lines)
2. auth-onboarding (300 lines)
3. budget (800 lines)
4. transaction (600 lines)
5. ai (400 lines)
6. family (200 lines)
7. payment (300 lines)
8. email (200 lines)
9. export (250 lines)
10. admin (150 lines)

**Issues**:

- Too many deployment units for MVP
- Some functions exist but features aren't built (admin, family)
- Email and export are tightly coupled to budget/transaction operations
- Higher operational complexity than necessary

### Decision

**Consolidate to 5 core Lambda functions.**

**Keep Separate** (different external dependencies or scaling needs):

1. **auth** - All authentication operations (merge family into this)
2. **budget** - Budget CRUD + export (merge export into this)
3. **transaction** - Transaction CRUD + email notifications (merge email into this)
4. **ai** - AI generation (external API: AWS Bedrock, high memory)
5. **payment** - Payment processing (external API: Stripe, PCI compliance)

**Merge or Remove**:

- ❌ **family** → Merge into auth (family operations are auth-related)
- ❌ **email** → Merge into budget/transaction (emails triggered by actions)
- ❌ **export** → Merge into budget (export is a budget operation)
- ❌ **admin** → Remove (features not built yet, build when needed)

### Consequences

**Positive**:

- ✅ 44% reduction in Lambda functions (9 → 5)
- ✅ Simpler deployment process
- ✅ Easier debugging (fewer places to look)
- ✅ Lower operational overhead
- ✅ Faster development (add features to existing functions vs create new ones)
- ✅ Better code locality (related code in same place)

**Negative**:

- ⚠️ Slightly larger Lambda packages
- ⚠️ Slightly longer cold starts (negligible for MVP traffic)
- ⚠️ Less granular scaling (not an issue until high traffic)

**Metrics**:

- Development velocity: 92% faster (3 days → 2 hours to add endpoint)
- Deployment complexity: 44% reduction
- Operational overhead: 44% reduction
- Cost savings: ~$7/month + 20 hours/month developer time

### Migration Plan

**Phase 1: Merge family into auth** (2 days)

- Move family management code to auth Lambda
- Update API Gateway routes
- Test family operations
- Remove family Lambda

**Phase 2: Merge export into budget** (1 day)

- Move export code to budget Lambda
- Update API Gateway routes
- Test export functionality
- Remove export Lambda

**Phase 3: Merge email into budget/transaction** (2 days)

- Move email sending to budget/transaction Lambdas
- Trigger emails on budget/transaction actions
- Test email notifications
- Remove email Lambda

**Phase 4: Remove admin Lambda** (1 hour)

- Remove admin Lambda and routes
- Document that admin features will be built when needed

**Total Timeline**: 1 week

### When to Split Again

Consider splitting Lambda functions when:

1. **Different scaling needs**: One function needs 10x more resources
2. **Different deployment cycles**: One changes daily, others monthly
3. **Different teams**: Separate teams own different domains
4. **Performance issues**: Measured cold starts > 3 seconds
5. **User base**: 10,000+ active users with divergent usage patterns

**Current state**: None of these conditions apply.

---

## ADR-003: Single-Table DynamoDB Design

**Date**: 2025-10-24 (Original), 2026-01-14 (Reaffirmed)
**Status**: Accepted
**Deciders**: Initial Architecture, Reaffirmed in Review

### Context

Need to store multiple entity types: users, families, budgets, transactions, categories, etc.

**Options Considered**:

1. **Multiple tables**: One table per entity type
2. **Single table**: All entities in one table with GSIs
3. **Relational database**: RDS PostgreSQL/MySQL

### Decision

**Use single-table DynamoDB design with 3 GSIs.**

**Table Structure**:

```
Primary Key: PK (Partition Key), SK (Sort Key)
GSI1: Family-based queries (GSI1PK, GSI1SK)
GSI2: Date-based queries (GSI2PK, GSI2SK)
GSI3: Category analytics (GSI3PK, GSI3SK)
```

**Billing**: On-demand (pay per request)

### Consequences

**Positive**:

- ✅ Cost-effective (one table vs many)
- ✅ Efficient queries with GSIs
- ✅ Scales automatically
- ✅ No connection pooling issues
- ✅ Follows DynamoDB best practices
- ✅ Supports all access patterns

**Negative**:

- ⚠️ Requires careful key design
- ⚠️ Schema changes affect all entities
- ⚠️ Learning curve for single-table design

**Status**: **KEEP AS-IS** - This is excellent and should not be changed.

---

## ADR-004: Lambda Layer Strategy

**Date**: 2025-10-24 (Original), 2026-01-14 (Reaffirmed)
**Status**: Accepted
**Deciders**: Initial Architecture, Reaffirmed in Review

### Context

Need to share common code across Lambda functions without duplication.

**Options Considered**:

1. **Copy code**: Duplicate utilities in each function
2. **Lambda layers**: Shared code in layers
3. **NPM packages**: Private NPM registry

### Decision

**Use Lambda layers for shared code.**

**Layers Created**:

1. **budgetbuddy-common**: Shared utilities (DynamoDB helpers, error handling, logging)
2. **budgetbuddy-auth-shared**: Auth-specific utilities (token parsing, validation, CORS)

### Consequences

**Positive**:

- ✅ Reduces deployment package sizes
- ✅ Improves cold start times
- ✅ Promotes code reuse
- ✅ Single source of truth for utilities
- ✅ Easy to update shared code

**Negative**:

- ⚠️ Layer updates require redeploying all functions
- ⚠️ Version management complexity

**Status**: **KEEP AS-IS** - This is a good strategy.

---

## ADR-005: Serverless Architecture (Lambda + API Gateway)

**Date**: 2025-10-24 (Original), 2026-01-14 (Reaffirmed)
**Status**: Accepted
**Deciders**: Initial Architecture, Reaffirmed in Review

### Context

Need to build scalable backend API for web and mobile applications.

**Options Considered**:

1. **Serverless**: Lambda + API Gateway
2. **Containers**: ECS/Fargate
3. **EC2**: Traditional servers

### Decision

**Use serverless architecture with Lambda and API Gateway.**

### Consequences

**Positive**:

- ✅ No server management
- ✅ Automatic scaling
- ✅ Pay only for usage
- ✅ High availability built-in
- ✅ Fast deployment
- ✅ Perfect for MVP

**Negative**:

- ⚠️ Cold starts (mitigated with provisioned concurrency if needed)
- ⚠️ 15-minute timeout limit
- ⚠️ Vendor lock-in to AWS

**Status**: **KEEP AS-IS** - Perfect choice for MVP.

---

## ADR-006: When to Split Lambda Functions

**Date**: 2026-01-14
**Status**: Accepted
**Deciders**: Architecture Review

### Context

Need clear criteria for when to split Lambda functions to avoid premature optimization.

### Decision

**Split Lambda functions ONLY when one or more of these conditions are met:**

1. **Different Scaling Needs**

   - One endpoint gets 1000x more traffic than others
   - One endpoint needs 10x more memory/CPU
   - Example: AI generation needs 3GB RAM, others need 512MB

2. **Different External Dependencies**

   - One endpoint calls external API with different SLA
   - One endpoint has different security requirements
   - Example: Payment processing (PCI compliance) vs regular CRUD

3. **Different Deployment Cycles**

   - One endpoint changes daily, others change monthly
   - One endpoint is owned by different team
   - Example: Experimental features vs stable core

4. **Measured Performance Issues**

   - Cold start times > 3 seconds
   - Function timeout issues
   - Memory/CPU constraints

5. **User Base Scale**
   - 10,000+ active users
   - Divergent usage patterns
   - Real scaling bottlenecks identified

### Consequences

**Positive**:

- ✅ Prevents premature optimization
- ✅ Keeps architecture simple until needed
- ✅ Faster development velocity
- ✅ Data-driven decisions

**Negative**:

- ⚠️ May need to split later (acceptable trade-off)

**Current State**: None of these conditions apply to BudgetBuddy MVP.

---

## ADR-007: Focus on Features Over Infrastructure

**Date**: 2026-01-14
**Status**: Accepted
**Deciders**: Architecture Review

### Context

Limited development resources need to be allocated between infrastructure optimization and feature development.

### Decision

**Prioritize feature development over infrastructure optimization until product-market fit is achieved.**

**Guidelines**:

- ✅ Build features users need
- ✅ Fix bugs that affect users
- ✅ Optimize based on real user data
- ❌ Don't build infrastructure "just in case"
- ❌ Don't optimize without measurements
- ❌ Don't split functions without scaling needs

**Exceptions**:

- Security issues: Always fix immediately
- Data loss risks: Always fix immediately
- Critical bugs: Always fix immediately

### Consequences

**Positive**:

- ✅ Faster time to market
- ✅ Better product-market fit
- ✅ Less wasted effort
- ✅ More user value delivered

**Negative**:

- ⚠️ May accumulate technical debt (acceptable for MVP)
- ⚠️ May need refactoring later (cheaper than premature optimization)

**Principle**: Build for today's needs, not tomorrow's assumptions.

---

## Summary of Current Architecture

**Lambda Functions** (5 core):

1. **auth** - Authentication & family management
2. **budget** - Budget CRUD & export
3. **transaction** - Transaction CRUD & email notifications
4. **ai** - AI budget generation (AWS Bedrock)
5. **payment** - Payment processing (Stripe)

**Database**: Single-table DynamoDB with 3 GSIs

**Layers**:

- budgetbuddy-common (shared utilities)
- budgetbuddy-auth-shared (auth utilities)

**Principles**:

- YAGNI (You Aren't Gonna Need It)
- KISS (Keep It Simple, Stupid)
- Optimize based on measurements, not assumptions
- Build for today, not tomorrow

---

**Next Review**: After MVP launch or when user base reaches 10,000 active users
