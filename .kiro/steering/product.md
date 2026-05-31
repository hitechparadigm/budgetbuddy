---
inclusion: always
---

# BudgetBuddy Product Context

## Vision

AI-powered budgeting app (EveryDollar-inspired). Web + iOS + Android. Freemium model. Supports solo users, couples, families, roommates, and financial advisors.

## Users

- **Individual**: personal plan, AI-powered budget generation, solo tracking
- **Couple / Family**: family plan, shared finances with partner and household members, role-based permissions
- **Roommates / Shared expenses**: shared plan, collaborative budget for non-family households
- **Viewers** (e.g. financial advisors): read-only access to any plan, optional expiry date
- **Premium ($9.99/mo)**: ad-free, advanced reporting, data export

## Core Values

1. **Budget Setup**: AI-powered generation using location + household size (348 cities)
2. **Transaction Tracking**: quick entry, real-time progress, <200ms
3. **Plan Collaboration**: personal, family, and shared plans — RBAC via four roles (owner, partner, household_member, viewer), real-time sync
4. **Data Reliability**: no data loss, offline mobile, automatic sync

## Performance Targets

- API p95 <500ms, page load <2s, 99.9% availability
- Year 1: 10K users, 5% premium conversion

## Bank Integration

Plaid is built and in scope. Bank account linking is a supported feature.

## Out of Scope (Future)

Investment tracking, bill pay, multi-currency advanced, social features
