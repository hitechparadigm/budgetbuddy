---
inclusion: auto
---

# Work Log

## Current Status

**Version**: 1.9.132
**Date**: 2026-06-17
**Phase**: Feature Enhancement
**Progress**: 95% Core | 100% Competitive Features | 80% Security
**Current Session**: 148

## What's Live and Working

### Core Infrastructure
- ✅ All 10 CDK stacks deployed: database, auth, auth-onboarding, api, api-features, api-features-extended, api-budgets, hosting, notification, monitoring
- ✅ Main API: `q0zoob6728.execute-api.us-east-1.amazonaws.com`
- ✅ Budgets API: `jcl39tq8x0.execute-api.us-east-1.amazonaws.com`
- ✅ Features API: `0poeu07vth.execute-api.us-east-1.amazonaws.com`
- ✅ Health endpoints all return 200

### Features Complete
- ✅ Budget-centric data model (BUDGET# architecture) — fully migrated
- ✅ Onboarding — creates budget, members, period, default Cash account
- ✅ BudgetAccessResolver — all Lambdas use it; FamilyIdResolver deleted
- ✅ Budget collaboration — invite/accept/leave/remove, RBAC roles, viewer expiry
- ✅ Smart AcceptInvitationPage — preview endpoint, inviter first name, smart auth tab, email pre-fill
- ✅ Income frequency support (biweekly/weekly/semi-monthly/one-time)
- ✅ Transactions, Accounts, Goals — all migrated to BUDGET# keys
- ✅ Notifications Lambda — all routes fixed (502 resolved)
- ✅ Learn Lambda — /learn/lessons route fixed
- ✅ Debt payoff Lambda — all bugs fixed
- ✅ Comparison Lambda — BUDGET# migration complete
- ✅ Tips Lambda — BUDGET# migration complete
- ✅ Credit score Lambda — BUDGET# migration, BudgetAccessResolver
- ✅ Export Lambda — BUDGET# migration
- ✅ Budget alerts — BUDGET# migration, DynamoDB stream
- ✅ AI budget generation (Bedrock Claude 3.5) — BUDGET# migration
- ✅ Plaid bank integration — built and in scope
- ✅ Email invitations (SES) — verified end-to-end
- ✅ Accessibility and UX heuristic fixes (Session 147) — 24 findings resolved
- ✅ Dark mode — BudgetPage, SettingsPage, GoalsPage (Session 148)
- ✅ Currency locale bug in CalendarView — CAD now shows "$46" not "CA$46" (Session 148)
- ✅ Family budget transparency enforcement at category level (Session 148)
- ✅ Dark mode — CSS design tokens, light/dark mode
- ✅ Goal contributions linked to budget savings category `spentAmount` (Session 148)
- ✅ E2E test infrastructure (Playwright)
- ✅ Live API test: 103 passed, 1 expected failure (credit-score/refresh without Plaid)

## Known Open Items

### ADR-001 Known Gaps (Phase 2)
- ~~[ ] Family budget transparency (category level)~~ ✅ Fixed Session 148
- ~~[ ] Goals not reflected in budget~~ ✅ Fixed Session 148
- ~~[ ] Dark mode missing on BudgetPage/SettingsPage/GoalsPage~~ ✅ Fixed Session 148
- [ ] `canUseFeature()` not called yet — Phase 1 intentional, Phase 2 will gate `reports.advanced` and `budget.export`

### Infrastructure
- [ ] `api-family-stack` still deployed (returns 410) — destroy after confirming no traffic
- [ ] SES still in sandbox — production access not yet requested; only verified addresses receive emails

### Security
- [ ] 80% security posture — 20% remaining
- [ ] Security scanning incomplete

## Deprecated / Removed
- ❌ `FamilyIdResolver` — deleted
- ❌ `FAMILY#` partition keys — replaced by `BUDGET#`
- ❌ `/family/*` API — returns 410, use `/budgets/*`
- ❌ `FamilySettings.tsx` — replaced by `BudgetMembersPage` at `/budget/members`
- ❌ `familyService.ts` — archived, replaced by `budgetService.ts`
- ❌ `api-family-stack.ts` → renamed `api-budgets-stack.ts`
- ❌ `custom:familyId` JWT claim — no longer written or read
