# BudgetBuddy 2-Week MVP Sprint Plan

**Created**: 2026-05-30
**Target**: Production-ready Web MVP by 2026-06-13
**Focus**: Web app production deployment with real auth, landing page, and polish

---

## Sprint Goal

Ship a production-ready web application where users can:

1. Register/login (email + Google)
2. Complete AI-powered onboarding
3. Create and manage budgets
4. Track transactions
5. Manage bills and goals
6. Collaborate with family members

---

## Task Breakdown

### Week 1: Production Readiness (Days 1-5)

#### Day 1 — Task 1: API URL Environment Variable + Remove Mock Auth

- [ ] Replace hardcoded API URL in `packages/web-app/src/services/api.ts` with environment variable
- [ ] Create `.env.development` and `.env.production` files
- [ ] Update Vite config to expose env vars
- [ ] Remove `initMockAuth()` call from `App.tsx` for production builds
- [ ] Fix Google OAuth URL (currently uses relative `/api/auth/google`, should use API Gateway)
- [ ] Verify all 17 service files use the centralized API base URL

#### Day 1 — Task 2: Error Boundary + 404 Page

- [ ] Create `ErrorBoundary.tsx` component wrapping the app
- [ ] Create `NotFoundPage.tsx` for unmatched routes
- [ ] Add global error handling for unhandled promise rejections
- [ ] Add toast/notification system for API errors

#### Day 2 — Task 3: Landing Page

- [ ] Create `LandingPage.tsx` with hero section, features, CTA, footer
- [ ] Route unauthenticated users to landing page instead of `/budget`
- [ ] Add responsive design (mobile-first)
- [ ] Include sign-up and login CTAs
- [ ] Add feature highlights (AI budgeting, family sharing, multi-platform)

#### Day 2 — Task 4: Token Refresh + Auth Hardening

- [ ] Implement token refresh logic in `apiClient`
- [ ] Handle 401 responses → attempt refresh → redirect to login if expired
- [ ] Add token expiry check before API calls
- [ ] Ensure logout clears all stored tokens
- [ ] Add CSRF protection headers

#### Day 3 — Task 5: Production CDK Context + Deploy Workflow

- [ ] Add `prod` context to `cdk.json` with production-specific values
- [ ] Create `deploy-prod.yml` GitHub Actions workflow with manual approval gate
- [ ] Ensure all stacks use environment-specific naming
- [ ] Configure separate Cognito User Pool for production
- [ ] Set up production API Gateway stage

#### Day 3 — Task 6: Custom Domain + SSL

- [ ] Create Route53 hosted zone (or use existing)
- [ ] Request ACM certificate for domain
- [ ] Configure CloudFront with custom domain alias
- [ ] Update Cognito callback URLs for production domain
- [ ] Update CORS settings on API Gateway for production domain

#### Day 4 — Task 7: Staging Deployment + Smoke Tests

- [ ] Deploy all stacks to staging environment
- [ ] Run smoke tests: register → onboard → budget → transaction
- [ ] Verify Google OAuth flow end-to-end
- [ ] Verify family invitation email flow
- [ ] Fix any environment-specific issues

#### Day 5 — Task 8: Production Deployment

- [ ] Deploy to production via manual workflow trigger
- [ ] Verify all critical user paths
- [ ] Set up CloudWatch alarms → SNS → email notifications
- [ ] Verify cost tracking tags are applied
- [ ] Document production URLs and access

---

### Week 2: Polish + Confidence (Days 6-10)

#### Day 6 — Task 9: E2E Tests Against Staging

- [ ] Run existing Playwright E2E tests against staging URL
- [ ] Fix any test failures
- [ ] Add happy-path coverage for: login, budget creation, transaction entry
- [ ] Verify onboarding flow E2E

#### Day 7 — Task 10: Loading States + Empty States Audit

- [ ] Audit all pages for loading state (skeleton/spinner)
- [ ] Add empty state illustrations/messages for zero-data pages
- [ ] Ensure consistent loading patterns across all pages
- [ ] Add optimistic UI updates where missing

#### Day 8 — Task 11: Mobile Navigation Restructure

- [ ] Add drawer or "More" tab to expose: Bills, Goals, Insights, Subscriptions, etc.
- [ ] Wire deep linking for push notification targets
- [ ] Verify all 16 screens are reachable from navigation
- [ ] Test on iOS and Android simulators

#### Day 9 — Task 12: Performance Audit

- [ ] Measure API p95 latency (target: <500ms)
- [ ] Measure page load time (target: <2s)
- [ ] Identify and optimize slow endpoints
- [ ] Add code splitting for non-critical routes
- [ ] Verify bundle size is reasonable (<500KB gzipped)

#### Day 10 — Task 13: Final Production Deploy + Monitoring

- [ ] Deploy any Week 2 fixes to production
- [ ] Monitor CloudWatch for 24h
- [ ] Verify error rates are acceptable (<1% 5xx)
- [ ] Document known issues and post-MVP backlog
- [ ] Update README with production URLs and status

---

## Deferred to Post-MVP

| Feature                              | Target Week |
| ------------------------------------ | ----------- |
| Investment tracking UI polish        | Week 3      |
| Credit score monitoring              | Week 3      |
| Debt payoff calculator               | Week 3      |
| Mobile app store submission          | Week 3-4    |
| Stripe payment integration (premium) | Week 4      |
| Plaid production approval            | Week 4-5    |
| Peer comparison                      | Week 5      |
| Receipt scanning production          | Week 5      |

---

## Success Criteria

- [ ] Users can register and login at production URL
- [ ] AI onboarding generates personalized budget
- [ ] Users can add/edit/delete transactions
- [ ] Budget progress updates in real-time
- [ ] Family invitation flow works end-to-end
- [ ] Google Sign-In works in production
- [ ] Page load <2s, API p95 <500ms
- [ ] Zero critical errors in first 24h of production
- [ ] CloudWatch alarms configured and tested

---

## Architecture Decisions for Sprint

1. **Web-first MVP** — Mobile deferred to Week 3-4
2. **Free tier only** — No payment integration for launch
3. **Plaid sandbox** — Bank sync available but clearly marked as "demo"
4. **Single region** — us-east-1 only for MVP
5. **Dev + Staging + Prod** — Three environments via CDK context

---

_This plan is the source of truth for the 2-week MVP sprint. Update task checkboxes as work completes._
