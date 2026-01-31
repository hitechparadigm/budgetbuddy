---
inclusion: always
---

# Product Steering – BudgetBuddy

## Vision

BudgetBuddy is a comprehensive family budgeting application inspired by EveryDollar by Dave Ramsey, featuring AI-powered budget generation, multi-platform support (web, iOS, Android), family account sharing, and a freemium business model.

## Target Users

**Individual Users**: Single person, simple budgeting, AI suggestions
**Family Accounts**: Primary + spouse/partner, role-based permissions, shared finances
**Premium Users**: Ad-free, advanced reporting, weekly tips, data export

## Core Value Proposition

**Must Work Flawlessly**:

1. Budget Setup: AI-powered generation, zero-based budgeting, category customization
2. Transaction Tracking: Quick entry, automatic updates, real-time progress
3. Family Collaboration: Secure sharing, role-based permissions, real-time sync
4. Data Reliability: No data loss, offline capability (mobile), automatic sync

## Non-Functional Requirements

**Performance**: API p95 < 500ms, page load < 2s, transaction entry < 200ms
**Availability**: 99.9% core APIs, graceful degradation, offline mobile (7+ days)
**Security**: PII encrypted, Cognito auth, JWT (1hr access/30d refresh), RBAC, GDPR-ready
**Scalability**: Year 1: 10K users, Year 2: 100K, Year 3: 1M | Cost: Dev < $50/mo, Prod (10K) < $500/mo
**Reliability**: 11-nines durability (DynamoDB), point-in-time recovery, RPO < 1hr, RTO < 4hr

## Out of Scope for MVP

Not included (future phases):

1. Bank Integration (Plaid) - Phase 2
2. Investment Tracking - Phase 3
3. Bill Pay - Phase 4
4. Multi-Currency - Phase 2
5. Advanced Analytics - Phase 2
6. Social Features - Phase 4

## Business Model

**Free Tier**: Core budgeting, transaction tracking, basic reports, ads
**Premium ($9.99/mo)**: Ad-free, weekly tips, advanced reporting, data export, priority support

**Year 1 Target**: 10K users, 5% premium (500), $5.5K/mo revenue
**Break-even**: 1,000 premium users (Month 6-12)

## Success Metrics

**Engagement**: DAU 30%, MAU 70%, 5+ min sessions
**Business**: CPA < $5, Day-30 retention 40%, 5-10% premium conversion, < 5% monthly churn
**Technical**: API p95 < 500ms, < 0.1% errors, > 99.9% availability, > 80% test coverage

## Critical User Journeys

**1. Onboarding**: Register → verify → location detect → family size → AI budget → customize → first transaction (< 5 min, 80% completion)
**2. Daily Transaction**: Open → navigate → enter details → save → see update (< 30 sec, 95% success, works offline)
**3. Monthly Review**: View summary → review categories → adjust budget → export (60% review, 40% adjust)

## Quality Attributes & Constraints

**Usability**: Intuitive UI, cross-platform consistency, WCAG 2.1 AA, mobile-first
**Maintainability**: Modular architecture, comprehensive docs, automated testing, CI/CD
**Technical**: AWS serverless, React/React Native, Node.js backend
**Business**: Bootstrap funding, solo dev, 6-month MVP, break-even month 12

## Risk Management

**Technical**: Data loss (Low/High - DynamoDB backups), Security breach (Low/Critical - AWS best practices), Performance (Medium/Medium - auto-scaling)
**Business**: Low adoption (Medium/High - marketing/feedback), High churn (Medium/High - engagement), Competition (High/Medium - unique features)

## Summary

**Core Value**: Simple, AI-powered budgeting for families
**Differentiator**: Location-based AI + family collaboration
**Success**: 10K users, 5% premium conversion, Year 1
**Must Work**: Budget setup, transaction tracking, family collaboration, data reliability
**Stack**: React + React Native + Lambda + DynamoDB + CDK
