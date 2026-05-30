# BudgetBuddy MVP Sprint Plan — Revised

**Updated**: 2026-05-30
**Target**: Production deployment by 2026-06-06 (1 week)
**Strategy**: Feature-complete app, infrastructure is the only blocker

---

## Why We Can Ship Fast

BudgetBuddy is already feature-complete. Every requirement (R1–R48) has frontend and backend
implementations. The app is not waiting on features — it's waiting on production infrastructure.

### Unique Differentiators to Lead With

These are features competitors either don't have or charge significantly more for:

| Feature                           | BudgetBuddy | EveryDollar | YNAB      | Mint (dead) |
| --------------------------------- | ----------- | ----------- | --------- | ----------- |
| Family sharing with RBAC          | ✅ Free     | $17.99/mo   | $14.99/mo | ❌          |
| AI budget generation (348 cities) | ✅          | ❌          | ❌        | ❌          |
| Zero-based budgeting              | ✅          | ✅          | ✅        | ❌          |
| Debt payoff calculator            | ✅          | ✅ Premium  | ✅        | ❌          |
| Investment tracking               | ✅          | ❌          | ❌        | ✅          |
| Receipt scanning                  | ✅          | ❌          | ❌        | ❌          |
| Credit score monitoring           | ✅          | ❌          | ❌        | ✅          |
| Web + iOS + Android               | ✅          | ✅          | ✅        | ❌          |

**Lead with family sharing** — it's the strongest differentiator at the free tier.

---

## What's Already Done ✅

### Production Readiness (Completed 2026-05-30)

- [x] **Task 1**: API URL env vars, mock auth removed, all 12 services centralized
- [x] **Task 2**: ErrorBoundary, NotFoundPage, global error handling
- [x] **Task 3**: Landing page with hero, features, family sharing CTA, footer
- [x] **Task 4**: Token refresh, 401 handling, auth hardening

### Feature Completeness (All Requirements R1–R48)

- [x] Auth: Email + Google OAuth + 2FA
- [x] Budget: Zero-based, month navigation, rollover, AI generation
- [x] Transactions: CRUD, filters, templates, receipt scanning, batch entry
- [x] Family: Invite, RBAC (Primary/Spouse/Viewer), real-time sync
- [x] Goals: Savings goals, debt payoff, net worth tracking
- [x] Bills & Subscriptions: Reminders, recurring, calendar view
- [x] Insights: Spending trends, peer comparison, AI tips
- [x] Investments: Portfolio tracking, performance history
- [x] Credit Score: Monitoring, history, improvement tips
- [x] Notifications: In-app + push, preferences
- [x] Admin: Dashboard, user management, audit logs
- [x] Accessibility: WCAG 2.1 AA, focus traps, skip links, dark mode

---

## Remaining Work — 1 Week to Production

### Day 1 (Today) — CDK Production Context

**Goal**: Production infrastructure defined in code, ready to deploy.

- [x] Create `deploy-prod.yml` GitHub Actions workflow
  - Manual trigger with `workflow_dispatch` + confirmation input
  - Requires `production` environment approval
  - Deploys stacks in dependency order
- [x] Make hosting stack environment-aware (env-specific S3 bucket names)
- [x] Add `CloudFrontDistributionId` and `CloudFrontUrl` outputs to hosting stack
- [x] Update dev workflow to use env-specific bucket names
- [x] Fix npm audit threshold to `high` (aws-sdk v2 moderate vulns unfixable)
- [x] Create `scripts/smoke-test.sh` for post-deploy health checks
- [x] Fix Windows security scan to exclude `cdk.out` (was causing pre-commit timeouts)

**Files**: `.github/workflows/deploy-prod.yml`, `infrastructure/lib/hosting-stack.ts`, `scripts/smoke-test.sh`

---

### Day 2 — Custom Domain + SSL

**Goal**: Production URL ready, SSL certificate issued.

- [ ] Register or configure domain (e.g. `budgetbuddy.app`) — **DEFERRED: using CloudFront URL for now**
- [ ] Create Route53 hosted zone
- [ ] Request ACM certificate (us-east-1 for CloudFront)
- [ ] Configure CloudFront distribution with custom domain alias
- [ ] Update Cognito callback URLs for production domain
- [ ] Update CORS settings on API Gateway for production domain

**Files**: CDK hosting stack, `.env.production`

---

### Day 3 — Staging Deploy + Smoke Tests

**Goal**: Full stack running in staging, critical paths verified.

- [x] Smoke test script created (`scripts/smoke-test.sh`)
- [x] Dev environment verified: API health endpoints 200, web app accessible
- [ ] Deploy all CDK stacks to staging (`cdk deploy --all --context environment=staging`)
- [ ] Smoke test checklist:
  - [ ] Register new user (email)
  - [ ] Google OAuth sign-in
  - [ ] Complete AI onboarding (select city, family size)
  - [ ] Budget created with AI suggestions
  - [ ] Add income transaction
  - [ ] Add expense transaction
  - [ ] Invite family member (email received)
  - [ ] Family member accepts invitation
  - [ ] Family member views shared budget
  - [ ] Add a goal, contribute to it
  - [ ] Add a bill, mark it paid
- [ ] Fix any environment-specific issues found

---

### Day 4 — Production Deploy

**Goal**: Live at production URL.

- [ ] Trigger `deploy-prod.yml` workflow manually
- [ ] Verify all stacks deploy successfully
- [ ] Run smoke test checklist against production URL
- [ ] Set up CloudWatch alarms:
  - [ ] API 5xx error rate > 1% → SNS → email
  - [ ] Lambda duration p95 > 3s → SNS → email
  - [ ] DynamoDB throttling → SNS → email
  - [ ] Cognito auth failures spike → SNS → email
- [ ] Verify cost tracking tags applied to all resources
- [ ] Set AWS Budget alert at $50/month

---

### Day 5 — Launch Prep

**Goal**: Ready for real users.

- [ ] Update README with production URL and status
- [ ] Create 3–5 test accounts for beta users
- [ ] Write brief onboarding email for first users
- [ ] Verify family invitation email renders correctly (not spam)
- [ ] Test on mobile browsers (iOS Safari, Android Chrome)
- [ ] Verify dark mode works in production build
- [ ] Document known limitations for beta users

---

## MVP Success Criteria

| Criteria             | Target                    | How to Verify     |
| -------------------- | ------------------------- | ----------------- |
| Register + login     | Works                     | Manual smoke test |
| AI onboarding        | Generates budget          | Manual smoke test |
| Add transaction      | Updates budget            | Manual smoke test |
| Family invite        | Email received + accepted | Manual smoke test |
| Google OAuth         | Works in production       | Manual smoke test |
| Page load            | < 2s                      | Chrome DevTools   |
| API p95              | < 500ms                   | CloudWatch        |
| Error rate           | < 1% 5xx                  | CloudWatch        |
| Zero critical errors | 24h post-launch           | CloudWatch        |

---

## What to Lead With at Launch

The landing page should emphasize these in order:

1. **Family budgeting together** — invite your partner, share the budget, RBAC roles
2. **AI sets up your budget in 60 seconds** — location + family size → personalized budget
3. **Zero-based budgeting** — every dollar has a job
4. **Free** — family sharing is free (competitors charge $14–18/mo)

---

## Post-MVP Backlog (Week 2+)

These are working features that need polish before broad promotion:

| Feature                   | Status               | What's Needed                           |
| ------------------------- | -------------------- | --------------------------------------- |
| Plaid bank sync           | Sandbox only         | Production Plaid approval (4–6 weeks)   |
| Mobile app (iOS/Android)  | Built, not submitted | App Store / Play Store submission       |
| Stripe premium ($9.99/mo) | Not integrated       | Payment integration                     |
| Receipt scanning          | Working              | Production Bedrock quota increase       |
| Peer comparison           | Working              | Needs real user data to be meaningful   |
| Investment tracking       | Working              | Polish + real price data source         |
| Credit score              | Mock data            | Real credit bureau integration          |
| E2E test suite            | Infrastructure ready | Write tests against staging             |
| Performance audit         | Not done             | Measure and optimize after real traffic |

---

## Architecture Decisions (Unchanged)

1. **Web-first MVP** — Mobile app store submission deferred to Week 2–3
2. **Free tier only** — No Stripe integration for launch
3. **Plaid sandbox** — Bank sync available but marked "demo mode"
4. **Single region** — us-east-1 only
5. **Three environments** — dev (auto), staging (auto on main), prod (manual approval)

---

## Risk Register

| Risk                           | Likelihood | Impact | Mitigation                               |
| ------------------------------ | ---------- | ------ | ---------------------------------------- |
| Cognito prod setup issues      | Medium     | High   | Test in staging first, same CDK config   |
| Domain DNS propagation delay   | Low        | Medium | Start Day 2 early, use TTL 60s           |
| Plaid sandbox → prod rejection | High       | Low    | Already marked as demo, no blocker       |
| Cold start Lambda latency      | Medium     | Medium | Provisioned concurrency on budget Lambda |
| Family email in spam           | Medium     | High   | SPF/DKIM via SES, test with real emails  |

---

_Updated 2026-05-30. Previous plan had 13 tasks over 2 weeks — revised to 5 days since Tasks 1–4 are complete and the app is feature-complete. Infrastructure is the only remaining blocker._
