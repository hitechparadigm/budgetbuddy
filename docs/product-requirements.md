# BudgetBuddy Product Requirements

**Last Updated**: 2026-06-19 (Session 150 — Web App Polish complete: Goals card grid + SVG rings, recharts charts, pricing page, AI coach rename, welcome tooltips, error states, rule prompt, daily insight pool, debt timeline, onboarding 4-step, budget health score, monthly kickoff email, cash flow forecast, budget sidebar slide-over, responsive, accessibility, lazy-loading for Lighthouse ≥85)
**Status**: Living document — reflects what is built, what is in progress, and what is planned.

---

## Vision

AI-powered budgeting app for individuals, couples, families, roommates, and financial advisors.
Web + iOS + Android. Freemium model.

**Core principle**: Users own accounts. Budgets hold financial data. Memberships control access. Subscriptions control paid features.

---

## Budget Model

### Budget Types

| Type | Transparency | Use case |
|------|-------------|----------|
| `personal` | Private — owner only | Individual budgeting |
| `family` | Full — all members see everything, no hidden categories | Couples, households managing finances together |
| `shared` | Limited — only shared expenses | Roommates, in-laws, group trips |

**Family budget rule**: When `budgetType = family`, there are no hidden categories, no private transactions, no per-user visibility filters. Both partners see all income, expenses, debts, savings, and transactions. If a user wants personal spending money, it appears as a visible category (e.g. "Dmytro personal spending: $300/month").

**Personal budget rule**: Cannot have members. Owner can invite Viewers.

### Roles

| Role | Access | Use case |
|------|--------|----------|
| `owner` | Full admin — manage members, archive/delete budget | Budget creator |
| `partner` | Full edit — equal household visibility | Spouse / common-law partner |
| `household_member` | Can add/edit transactions and categories | Adult child, in-law, roommate in a family budget |
| `viewer` | Read-only, optionally time-limited | Financial advisor, accountant, adult child learning |

**Viewer access**: Always plan-specific. Can have `expiresAt` (auto-expires) and `accessLabel` (e.g. "Financial Advisor"). Checked on every API request.

### Multiple Budgets Per User

A user can belong to multiple budgets with different roles in each:
```
Dmytro:
  - Dmytro Personal Budget    → owner
  - Malyk Family Budget        → owner
  - House Shared Budget        → member
  - Client Review Budget       → viewer (expires 2026-08-31)
```

The user's `defaultBudgetId` on their profile determines which budget is active. Users can switch via `PUT /budgets/active`.

---

## Data Model (DynamoDB Single-Table)

```
USER#<userId>
  PROFILE          → { defaultBudgetId, onboardingCompleted, currency, location, subscriptionTier }

BUDGET#<budgetId>
  METADATA         → { budgetId, name, budgetType, ownerUserId, status, currency }
  MEMBER#<userId>  → { role, status, joinedAt, expiresAt, accessLabel, GSI1PK, GSI1SK }
  PERIOD#<YYYY-MM> → { income/savings/expense groups, totals, rolloverIn, rolloverOut }
  ACCOUNT#<id>     → { nickname, accountType, balance }
  TXN#<id>         → { amount, category, date, accountId }
  GOAL#<id>        → { name, targetAmount, currentAmount, targetDate }

INVITATION#<id>
  METADATA         → { budgetId, invitedEmail, role, tokenHash, status, expiresAt, viewerExpiresAt }
```

**GSI1**: `GSI1PK = USER#<userId>` / `GSI1SK = BUDGET#<budgetId>` — lists all budgets a user belongs to.

**GSI4**: `GSI4PK = INVITATION#<email>` — looks up pending invitations by email.

---

## Lambda Access Pattern

Every Lambda that touches budget data:

```javascript
const { userId } = getUserFromEvent(event);
const { budgetId, role, budgetType, budgetStatus, subscriptionTier } =
  await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, requestedBudgetId);
BudgetAccessResolver.assertPermission(role, action, budgetStatus);
// Read/write BUDGET#<budgetId>/... records
```

`BudgetAccessResolver.resolveAccess()` checks:
1. User profile exists → get `defaultBudgetId`
2. Membership exists and is not revoked/left
3. Viewer `expiresAt` has not passed
4. Budget METADATA exists and is not deleted

---

## Invitation Flow

1. Owner/partner calls `POST /budgets/{budgetId}/invite` with `{ email, role, viewerExpiresAt?, accessLabel? }`
2. Backend generates a 32-byte cryptographically secure token; stores SHA-256 hash in DynamoDB
3. Email sent to invitee with link: `https://app.budgetbuddy.com/budgets/accept?token=<plaintext>`
4. Invitee clicks link → `AcceptInvitationPage` fetches `GET /budgets/invitation-preview?token=xxx` (unauthenticated) to show inviter's first name, budget name, and role. Defaults auth tab to "Log In" if email has an existing account, or "Create Account" if new. Pre-fills invitee email.
5. Invitee authenticates → `POST /budgets/accept-invitation` with `{ token }`
6. Backend: validates token hash, checks expiry (7 days), confirms logged-in email matches `invitedEmail`, creates `MEMBER#<userId>` record, marks invitation accepted

**Security rules**: Token is single-use. Tied to one email. Tied to one budget. Tied to one role. Cannot be forwarded to a different email.

---

## Feature Gating

Use `canUseFeature(subscriptionTier, featureKey)` — never check `subscriptionTier` directly.

```javascript
const { canUseFeature } = require('/opt/nodejs/entitlements');
if (!canUseFeature(subscriptionTier, 'budget.export')) {
  throw { statusCode: 403, message: 'This feature requires a premium subscription.' };
}
```

### Feature Catalog (current)

| Feature key | Tier | Description |
|-------------|------|-------------|
| `budget.personal` | free | Personal budget |
| `budget.family` | free | Family budget |
| `budget.shared` | free | Shared budget |
| `budget.ai.generate` | free | AI budget generation |
| `member.invite` | free | Invite budget members |
| `viewer.invite` | free | Invite read-only viewers |
| `viewer.expiry` | free | Set viewer expiration dates |
| `reports.advanced` | premium | Advanced reports |
| `budget.export` | premium | Export budget data |

**Phase 1**: All features are free. The `canUseFeature()` pattern is wired but not enforced yet — this allows Phase 2 to gate features without touching Lambda business logic.

---

## Subscription Tiers (planned)

| Tier | Features |
|------|----------|
| `free` | 1 personal budget, basic AI generation, basic reports |
| `premium` | Multiple budgets, sharing, viewers, advanced reports, export |
| `family_premium` | Premium + covers 5–6 family members, each gets their own private budget |

**Key rule**: Subscription sharing ≠ budget sharing. A family member covered by your subscription gets premium features but does NOT automatically see your budget. Budget access requires an explicit invitation.

**Not yet implemented**: Subscription as a first-class DynamoDB entity. Currently `subscriptionTier` comes from the Cognito JWT claim `custom:subscriptionTier`.

---

## Implemented Features (✅ Built)

### Core Budget Management
- ✅ Create budget (`POST /budgets`) — supports `personal`, `family`, `shared` types
- ✅ List all budgets for a user (`GET /budgets`) — queries GSI1
- ✅ Switch active budget (`PUT /budgets/active`)
- ✅ Archive / restore / delete budget
- ✅ Monthly budget periods under `BUDGET#<id>/PERIOD#<YYYY-MM>`
- ✅ Zero-based budgeting: `remainingBalance = totalIncome - totalSavings - totalExpenses`
- ✅ Rollover logic (basic — surplus/deficit carries between periods)

### Onboarding
- ✅ AI-powered budget generation from location + household size (348 cities)
- ✅ Budget type selection (personal / family / shared) during onboarding
- ✅ Creates `BUDGET#<id>/METADATA`, `MEMBER#<userId>` (owner), `PERIOD#<month>`, `ACCOUNT#cash` on completion
- ✅ Writes `defaultBudgetId` to user profile
- ✅ `name` and `ownerUserId` written to METADATA on onboarding completion
- ✅ Reuses `budgetId` created during registration — guards on `onboardingCompleted` flag (fixed 2026-06-15)
- ✅ Default income placeholder category created during onboarding
- ✅ Income category frequency support (weekly, biweekly, monthly, annual)
- ✅ Biweekly income calculation uses actual occurrence dates (fixed 2026-06-15: was counting 3 occurrences for any month ≥29 days regardless of start date; now uses `calculateOccurrencesInMonth()` from shared utils)

### Membership & Invitations
- ✅ Invite members (`POST /budgets/{id}/invite`) — partner, household_member, viewer
- ✅ Accept invitation (`POST /budgets/accept-invitation`) — public endpoint, no auth required (invitee follows email link)
- ✅ Resend invitation (`POST /budgets/{id}/invitations/{id}/resend`)
- ✅ Revoke invitation (`DELETE /budgets/{id}/invitations/{id}`)
- ✅ View pending invitations (`GET /budgets/{id}/invitations`)
- ✅ View members (`GET /budgets/{id}/members`)
- ✅ Update member role (`PUT /budgets/{id}/members/{userId}`)
- ✅ Remove member (`DELETE /budgets/{id}/members/{userId}`)
- ✅ Leave budget (`POST /budgets/{id}/leave`)
- ✅ Extend viewer access (`PUT /budgets/{id}/members/{userId}/extend`)
- ✅ Viewer `expiresAt` enforced on every request via `BudgetAccessResolver`
- ✅ Viewer `accessLabel` (e.g. "Financial Advisor") stored and displayed
- ✅ Personal budgets cannot have members (enforced)
- ✅ Max 1 partner per family budget (enforced)
- ✅ Email delivery verified (SES sandbox — verified addresses only until production access granted)

### Transactions
- ✅ Create, read, update, delete transactions
- ✅ Transactions linked to budget categories and accounts
- ✅ Account selection on transaction entry
- ✅ Transaction search, filter, sort
- ✅ Batch entry mode

### Accounts
- ✅ Manual accounts (Cash, Checking, Savings, etc.)
- ✅ Plaid bank account linking
- ✅ Default Cash account created at onboarding
- ✅ Account reconciliation
- ✅ Account management at `/accounts`

### Auth
- ✅ Cognito User Pools + Google OAuth 2.0 (PKCE)
- ✅ JWT carries only `userId` — no budgetId, no role, no familyId
- ✅ `BudgetAccessResolver` resolves budget + role from DynamoDB on every request

### Financial Features
- ✅ Goals (savings goals + debt payoff with avalanche/snowball strategies)
- ✅ Financial insights (AI-powered, spending patterns, peer comparison)
- ✅ Receipt scanning (OCR via AWS Textract, web upload + mobile camera)
- ✅ Credit score monitoring
- ✅ Investment tracking (holdings, portfolio performance, net worth integration)
- ✅ Subscriptions: list, AI detection from transactions (`POST /subscriptions/detect`), add/edit/delete, monthly/yearly cost tracking, renewal reminders, review status (Keep/Review/Cancel)
- ✅ Notifications: device registration, preferences (GET/PUT), notification history, push delivery via Expo
- ✅ Net worth tracking (manual + investment accounts)

### Frontend
- ✅ `BudgetMembersPage` at `/budget/members` — full member management UI
- ✅ `BudgetSwitcher.tsx` — header switcher for multiple budgets
- ✅ Viewer expiry picker (30/60/90 days / no expiry) in invite form
- ✅ Access label input for viewers
- ✅ Member list shows role badges, viewer expiry, access label
- ✅ Extend / Revoke buttons for viewer members
- ✅ Settings page links to `/budget/members`

### Web App Polish (Phase 1 — Design Foundation)
- ✅ **Green brand color** — `--color-primary: #059669` (emerald-600, 4.68:1 WCAG AA), dark mode `#34d399`; blue primary removed
- ✅ **Inter font** — `@fontsource/inter@5.1.1` with tabular numerals (`font-feature-settings`) for financial figures
- ✅ **Lucide React icons** — `lucide-react@0.469.0`; emoji icons replaced in Sidebar, OnboardingPage
- ✅ **UI Primitives** — `Button`, `Card`, `Badge`, `Skeleton` (+ Text/Card/Row variants), `PageHeader`, `StatCard`, `EmptyState` at `components/ui/`
- ✅ **LandingPage Button migration** — all raw Tailwind CTAs replaced with `Button` component
- ✅ **Frontend TypeScript cleanup** — 72 pre-existing TS errors fixed; `type-check:web` now blocking in validate gate
- ✅ **Sidebar IA** — 5 primary items (Overview, Budget, Accounts, Goals, Insights) + collapsible Manage group (Bills, Subscriptions, Debt Payoff, Credit Score, Investments, Net Worth, Members)

### Web App Polish (Phase 2 — Information Architecture)
- ✅ **`OverviewPage`** at `/overview` — Financial Health Bar, Net Worth sparkline, Top 5 Categories, Upcoming Bills, Active Goals, AI Insight of Day, Quick Add; all sections independent + skeleton loading
- ✅ **`/overview` route** — default authenticated page
- ✅ **`/net-worth` route** — `NetWorthPage` now accessible from Sidebar Manage group
- ✅ **`PageHeader`** — applied to all 9 pages (Goals, Accounts, Insights, Bills, Subscriptions, DebtPayoff, CreditScore, Tips, BudgetMembers)

### Web App Polish (Phase 3 — Core Feature Polish)
- ✅ **Budget page Ready to Assign badge** — green/amber/red pill showing unassigned balance
- ✅ **Budget page skeleton loading** — 3-column layout skeleton replaces full-page spinner
- ✅ **Budget page inline category editing** — click planned amount → inline input, Enter/blur saves (P3-T4)
- ✅ **Budget page keyboard shortcuts** — T, B, ←/→, ?, Esc (P3-T3)
- ✅ **Over-budget row highlighting** — amber bg + red border on category rows (pre-existing, confirmed)
- ✅ **Skeleton screens** — GoalsPage, InsightsPage, DebtPayoffPage, AccountsPage
- ✅ **Insights AI chat bubbles** — chat thread UI (user right, AI left), 3-dot typing indicator, `sessionStorage` persistence (last 5 Q&A)
- ✅ **Empty states** — Goals, Bills, Debts, Budget transaction panels
- ✅ **Settings tab layout** — Profile, Budget, Notifications, Banks, Privacy, Help tabs
- ✅ **Goals card grid with SVG progress rings** — 3-col responsive grid; SVG circle ring shows %, "Add Funds" CTA on card; drag-and-drop reorder preserved
- ✅ **Insights recharts chart** — lazy-loaded `recharts` LineChart replaces custom SVG; proper axes, tooltips, legend; category filter to isolate single category 6-month trend
- ✅ **Debt payoff horizontal timeline** — dots color-coded by debt type (mortgage=blue, credit card=red, auto=gray, other=purple); replaced `window.prompt()` with proper payment modal
- ✅ **`ErrorState` component** — 3 variants: `network` (retry button), `auth` (redirect with `?returnTo=`), `partial` (inline section error)
- ✅ **Budget category row aria-labels** — `role="row"` with descriptive `aria-label="{Name}: $X planned, $Y spent, $Z remaining"` in `BudgetGroups.tsx`

### Web App Polish (Phase 4 — AI Strategy)
- ✅ **AI coach conversation context** — DynamoDB `AI_CONVERSATION#insights` (30 exchanges, 90d TTL); last 5 injected as Bedrock context
- ✅ **AI coach rename** — "Ask about spending" → "Ask Your AI Coach" in InsightsPage
- ✅ **Transaction rules engine** — `backend/functions/rules/` Lambda + CDK routes + Settings UI
- ✅ **"Create a rule?" prompt** — shown in `PendingTransactions.tsx` when user recategorizes a transaction; offers "Yes, always" (POSTs to `/rules`) or "Just this once"
- ✅ **Proactive spending nudges** — `generateSpendingNudges()` in `daily-reminders/index.js`; saves `NUDGE#` DynamoDB records; Overview page surfaces nudge messages
- ✅ **Budget Health Score** — Lambda `GET /budget/health-score`: `(savings_rate×0.4 + adherence×0.4 + goal_progress×0.2)`; SVG ring + breakdown on Overview page with month-over-month delta; CDK route in `api-stack.ts`
- ✅ **Cash Flow Forecast** — Lambda `GET /budget/cash-flow`: remaining income − projected daily spend × remaining days; end-of-month balance card on Overview; CDK route in `api-stack.ts`

### Web App Polish (Phase 5 — Onboarding & Conversion)
- ✅ **Landing page rewrite** — new headline "Your budget, built in 60 seconds", 3-step proof, pricing section
- ✅ **`/pricing` page** — `PricingPage.tsx` at `/pricing`; Free vs Premium comparison table with 17 feature rows; in-app upgrade prompts link here
- ✅ **Onboarding 4-step redesign** — step progress indicator (1→2→3→4); budget type descriptions shown inline (no separate disclosure modal); navigates to `/overview` after completion
- ✅ **AI generation animation** — 5-step progress animation during Bedrock call
- ✅ **Welcome tooltip chain** — `WelcomeTooltipChain.tsx` shows on first login to `/overview`; 3-step spotlight tour (Financial Health Bar → AI Insight → Add Transaction); localStorage gated
- ✅ **Premium gates** — `PremiumGate` + `PremiumBadge` components; 3 gates: Insights memory, Export buttons, Budget Health Score
- ✅ **Daily rotating AI insight pool** — 30+ insight templates in `OverviewPage.tsx`; day-of-year cycling; falls back to pool if API call fails
- ✅ **Monthly SES kickoff email** — `sendMonthlyKickoffEmail()` in `daily-reminders/index.js`; triggered on `isFirstDayOfMonth` check; includes pre-filled category count from previous month

### Web App Polish (Phase 6 — Quality & Polish)
- ✅ **Mobile app banner** — sticky bottom banner at `<768px` in AppLayout
- ✅ **Budget transaction slide-over** — floating "Transactions" button at `<md` breakpoints opens slide-over panel with last 20 transactions; closes on backdrop click
- ✅ **Transaction filter session persistence** — `sessionStorage` via `useTransactionFilters` hook
- ✅ **Lucide icon `aria-labels`** — Sidebar icon-only buttons have `aria-label` and `title` in collapsed mode
- ✅ **Budget row screen reader labels** — `aria-label="{Category}: $X planned, $Y spent, $Z remaining"` in `BudgetGroups.tsx`
- ✅ **WCAG 2.1 AA color contrast** — `#059669` on white = 4.68:1 (AA pass)
- ✅ **Performance — lazy loading** — 20 secondary pages lazy-loaded with `React.lazy`/`Suspense`; vendor chunks split (react, lucide, AI generation page); initial bundle **113KB gzip** (was 242KB, −53%); recharts 107KB deferred to Insights only
- ✅ **Vite code-splitting config** — `vite.config.ts` with `manualChunks` for `vendor-react`, `vendor-lucide`, `page-ai-budget`

---

## Known Gaps (⚠️ Planned)

### High Priority
1. ~~**Family budget transparency not enforced at category level**~~ ✅ **Fixed (Session 148)** — `createBudget` and `updateBudget` now reject any request containing categories with `hidden: true`, `isPrivate: true`, or `visibility: 'private'` when `budgetType === 'family'`. Returns HTTP 400.

2. **`canUseFeature()` not called in Lambda handlers** — the entitlement pattern is wired but Phase 1 intentionally leaves all features open. Phase 2 will add actual gating for `reports.advanced` and `budget.export`.

### Medium Priority
3. **Subscription as a DynamoDB entity** — currently `subscriptionTier` comes from the Cognito JWT claim. Phase 2 needs a `SUBSCRIPTION#<userId>/METADATA` record and a `SubscriptionGroup` entity for family subscription sharing.

4. **Invitation token lookup uses Scan** — `handleAcceptInvitation` scans the table for the hashed token. Works at current scale; needs a GSI on `tokenHash` for production scale.

5. **`shared` budget type has no distinct behavioral rules** — `shared` is accepted and stored but behaves identically to `family` except for the partner limit. The vision specifies shared budgets should only contain shared expenses (no income, no personal debt). This is a product enforcement question, not a data model issue.

6. **SES still in sandbox mode** — can only send to verified addresses. Verified: `dmytro.malyk@gmail.com`, `dima.pmp@gmail.com`, `info@hitechparadigm.com`, `t1@taxprocanada.ca`, `dmalyk@taxprocanada.ca`. Request SES production access to send to any address.

### Low Priority
7. ~~**Dark mode missing on BudgetPage, SettingsPage, GoalsPage**~~ ✅ **Fixed (Session 148)** — all three pages migrated to CSS design token classes.
8. ~~**Goals not reflected in budget**~~ ✅ **Fixed (Session 148)** — `contributeToGoal` now updates the linked savings category's `spentAmount` in the budget period.
9. **Planned transactions frontend** — backend Lambda exists (`transaction-planning`), no frontend UI yet.

---

## Web App Polish Plan — New Requirements (docs/web-app-polish-plan.md)

### Session 149–150 — Web App Polish Complete (all 18 criteria met)

All requirements from the Polish Plan are implemented:

- ✅ **REQ-NEW-01** — Overview/Dashboard page with all 7 sections
- ✅ **REQ-NEW-02** — "Ready to Assign" counter on Budget page
- ✅ **REQ-NEW-03** — Skeleton loading screens on all data-fetching pages
- ✅ **REQ-NEW-04** — Real Bedrock AI budget generation (no mock)
- ✅ **REQ-NEW-05** — Persistent AI conversation context (DynamoDB, 30 exchanges, 90d TTL)
- ✅ **REQ-NEW-06** — Transaction categorization rules engine (Lambda + CDK + Settings UI)
- ✅ **REQ-NEW-07** — Proactive spending nudges (EventBridge daily-reminders extension)
- ✅ **REQ-NEW-08** — Budget Health Score Lambda `(savings_rate×0.4 + adherence×0.4 + goal_progress×0.2)` + SVG ring on Overview
- ✅ **REQ-NEW-09** — Cash flow forecast — end-of-month balance on Overview + daily timeline via `GET /budget/cash-flow`
- ✅ **REQ-NEW-10** — Inline category amount editing on Budget page
- ✅ **REQ-NEW-11** — Keyboard shortcuts on Budget page (T, B, ←/→, ?, Esc)
- ✅ **REQ-NEW-12** — Contextual premium gates: Insights memory, Export, Budget Health Score
- ✅ **REQ-NEW-13** — `/pricing` page (`PricingPage.tsx`) with Free vs Premium comparison table
- ✅ **REQ-NEW-14** — Daily AI insight rotation — 30+ templates cycling by day-of-year on Overview
- ✅ **REQ-NEW-15** — Monthly budget kickoff SES email (EventBridge, 1st of month, pre-fills category count)
- ✅ **REQ-NEW-16** — Transaction rules management in Settings > Budget tab
- ✅ **REQ-NEW-17** — Cash flow forecast on Overview (simple version); full 30-day timeline data available via API
- ✅ **REQ-NEW-18** — Budget Health Score visible on Overview (history via Premium gate)

---

## Live API Test Results (2026-06-15)

Tested against dev environment using `scripts/test-live-api.js`. **111 checks passed, 0 failed** across 20 test sections. All previous skips resolved — transactions work end-to-end.

**Playwright browser test results** — see "Playwright Frontend Test Results" section below.

## Playwright Frontend Test Results (2026-06-15)

Tested against live dev environment at `https://d1ueeugn9zcx7n.cloudfront.net` using Playwright MCP.

### ✅ Pages Verified Working
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Landing page | `/` | ✅ | Loads correctly, CTAs work |
| Login / Register | `/auth` | ✅ | Email/pass login works, tabs switch correctly |
| Budget dashboard | `/budget` | ✅ | Categories load, transaction FAB works |
| Add Expense modal | `/budget` | ✅ | Category select, amount, description, submit all work |
| Transaction list | `/budget` (right panel) | ✅ | Transaction appears immediately after creation |
| Goals list | `/goals` | ✅ | Stats cards, empty state, + New Goal button |
| Create Goal | `/goals/new` | ✅ | Templates, form fields, Create Goal → list updates |
| Accounts | `/accounts` | ✅ | Manual/Connected tabs, net worth summary |
| Bills | `/bills` | ✅ | Stats, All/Unpaid/Overdue/Paid tabs, AI Scan button |
| Credit Score | `/credit-score` | ✅ | Loads with demo disclaimer, Connect Account CTA |
| Learning Center | `/learn` | ✅ | Loads (after token fix) |
| Settings | `/settings` | ✅ | Location, Currency sections visible |

### 🐛 Frontend Bugs Found & Fixed

| # | Component | Bug | Fix |
|---|-----------|-----|-----|
| 1 | `AuthContext.tsx`, `tokenUtils.ts` | `Buffer.from()` (Node.js only) crashes in browser → auth redirect loop | Replaced with `atob()` |
| 2 | `insightsApi.ts` | `/insights/*` called main API (`q0zoob6728`) — should be extended API (`hkjzroedjf`) | Changed to `config.extendedFeaturesApiUrl` |
| 3 | `patternDetectionApi.ts` | Same wrong API | Fixed to `extendedFeaturesApiUrl` |
| 4 | `budgetPlanningApi.ts` | Same wrong API | Fixed to `extendedFeaturesApiUrl` |
| 5 | `tipsApi.ts` | `/tips/*` called main API — should be features API (`0poeu07vth`) | Fixed to `config.featuresApiUrl` |
| 6 | `comparisonApi.ts` | Same wrong API | Fixed to `featuresApiUrl` |
| 7 | `NotificationSettings.tsx` | `/notifications/preferences` called features API — should be main API | Fixed to `config.apiBaseUrl` |
| 8 | `SettingsPage.tsx` | Called `GET /auth/mfa/status` which doesn't exist → CORS error on every settings load | Disabled the call |
| 9 | `learnApi.ts` | Used `access_token` for Authorization header — API Gateway requires `id_token` | Fixed to `budgetbuddy_id_token` |
| 10 | `BudgetMembersPage.tsx` | Infinite spinner when no `budget` prop passed (route `/budget/members`) | Added `getBudgets()` auto-fetch |
| 11 | `environment.ts` | Missing `extendedFeaturesApiUrl` constant | Added with `hkjzroedjf` URL |
| 12 | `subscriptions` pages | Used main API instead of features API | Fixed to `featuresApiUrl` |

### 🔍 Pages Tested (Playwright 2026-06-15 — Post-Fix)
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Financial Insights | `/insights` | ✅ | Charts load, Spending Patterns/Trends sections render |
| Insights — $NaN bug | `/insights` | ✅ Fixed | `formatCurrency(null)` now returns `$0.00` instead of `$NaN` |
| Tips Feed | `/tips` | ✅ | Loads with correct API (features gateway) |
| Budget Members | `/budget/members` | ✅ Fixed | Auto-fetches active budget, no longer infinite spinner |
| Summary tab | `/budget` | ✅ | Donut chart, category breakdown, planned/spent/remaining |
| Calendar tab | `/budget` | ✅ | Monthly calendar with transaction dots, click day shows transactions |
| Recurring budget items | `/budget` | ✅ | Weekly/Bi-weekly/Monthly/Annually frequency — "Amount per occurrence" |
| Subscriptions page | `/subscriptions` | ✅ | Stats, filter tabs, Detect Subscriptions + Add Subscription buttons |
| Subscriptions — AI detection | `/subscriptions` | ✅ | "Detect Subscriptions" calls backend, returns empty (not enough data) |
| Subscriptions — Add | `/subscriptions/new` | ✅ Fixed | Was 500 (`generateId("sub")` → `generateId.custom("sub")`) |
| Subscriptions — Merchant matching | `/subscriptions/new` | ✅ | Merchant name field used for transaction matching |
| Debt Payoff | `/debt-payoff` | ✅ Fixed | Now uses featuresApiUrl correctly |

### 🐛 Additional Bugs Found & Fixed (2026-06-15 continued)

| # | Component | Bug | Fix |
|---|-----------|-----|-----|
| 13 | `backend/functions/subscriptions/index.js` | `generateId("sub")` — not a function, it's an object | Changed to `generateId.custom("sub")` |
| 14 | `InsightsPage.tsx` | `formatCurrency(null/undefined)` → `$NaN` displayed in charts | Added null/NaN guard: returns `$0.00` |
| 15 | `InsightsPage.tsx` | `savingsRate.toFixed(1)` crashes on null | Added `?? 0` guard |
| 16 | `InsightsPage.tsx` | Divide-by-zero in pattern bars when `maxAmount = 0` | Already guarded: `maxAmount > 0 ? ... : 0` |
| 17 | `DebtFormPage.tsx` + `DebtPayoffPage.tsx` | Used main API, should use features API | Fixed to `config.featuresApiUrl` |
| 18 | `auth-onboarding/index.js` | MEMBER record missing `GSI1PK`/`GSI1SK` → `GET /budgets` returned empty list | Added GSI keys to member record |
| 19 | `budget-service.js` | Used old `FAMILY#`/`BUDGET#<month>` keys instead of `BUDGET#`/`PERIOD#<month>` | Updated to new schema |

### 🔍 Still Untested / Outstanding
| Feature | Status |
|---------|--------|
| Insights AI Q&A | Not fully tested — `Ask Your AI Coach` panel with new chat bubble UI |
| Investments page | Frontend exists, no backend Lambda deployed |
| Budget Members — full invite flow | Invite → email → accept via link — not end-to-end tested |
| Mobile app (React Native) | Zero E2E coverage |

### ✅ Verified Working (live)

| Feature | Endpoints | Status |
|---------|-----------|--------|
| Health checks | All 17 service health endpoints across 4 APIs | ✅ |
| Auth — register/login/profile | `POST /auth/register`, `POST /auth/login`, `GET /auth/profile`, `GET /auth/geolocation` | ✅ |
| Auth — security | All 7 protected endpoints reject unauthenticated requests (401) | ✅ |
| Onboarding | `POST /auth/onboarding` (flat body: `city`/`country`/`familySize`/`currentMonth`/`selectedCategories`) | ✅ |
| AI budget generation | `POST /budget/ai-generate` — uses Claude 3 Haiku with fallback template if Bedrock unavailable | ✅ |
| Budget management | `GET /budgets`, `POST /budgets`, `GET /budget/current`, `PUT /budgets/active` | ✅ |
| Budget period | `remainingBalance`, income/expense groups — use `GET /budget/current?month=YYYY-MM` | ✅ |
| Transactions | `GET /transactions`, search filter | ✅ |
| Accounts full CRUD | Create (`banking`/`accountSubtype` fields), list, update, reconcile (`newBalance` field), delete | ✅ |
| Goals full CRUD | Create, list, update, delete | ✅ |
| Budget collaboration | Members, invitations, send/resend/revoke, personal-budget partner rejection | ✅ |
| Accept invitation | `POST /budgets/accept-invitation` — **public endpoint** (no auth required, invitee follows link) | ✅ |
| Insights | Weekly, monthly, trends, patterns, AI Q&A | ✅ |
| Pattern detection + budget planning | `POST /patterns/detect`, `POST /budget-planning/suggestions` | ✅ |
| Debt payoff | Create debt, list, summary, payoff plan | ✅ |
| Credit score | `GET /credit-score`, `/credit-score/history` | ✅ |
| Plaid | Link token, accounts list, pending transactions | ✅ |
| Bills | List, upcoming, calendar | ✅ |
| Receipt scanning | Usage, history, upload | ✅ |
| Learning center | Lessons, courses, progress | ✅ |
| Notifications | `GET/PUT /notifications/preferences`, `GET /notifications/history`, `POST /notifications/register-device` | ✅ |
| Deprecated /family/* | Returns 410 Gone for all routes | ✅ |

### 🐛 Remaining Known Bugs (2 low priority)

| # | Severity | Component | Description |
|---|----------|-----------|-------------|
| 1 | Low | `POST /plaid/sandbox/create-item` | 500 — Plaid sandbox credentials not configured in dev environment |
| 2 | Low | `POST /transactions` create | Test skips: `categoryId` must be fetched from `GET /budget/current`, not `GET /budget` (which returns a list) |

### Not Deployed (frontend components exist, no backend Lambda)

| Feature | Status |
|---------|--------|
| Investment tracking (`/investments/*`) | ❌ No Lambda on any API gateway |

---

## User Journeys

### 1. New User Onboarding

**Goal**: Set up a budget with AI assistance in under 5 minutes.

**Steps**: Landing → Register (email or Google) → Location + currency → Household type + size → AI budget generation → First transaction tutorial

| Step | Frontend | Backend API | Status |
|------|----------|-------------|--------|
| Register | `AuthPage.tsx` | `POST /auth/register` | ✅ |
| Google Sign-In | `GoogleSignInButton.tsx` | `POST /auth/google` | ✅ |
| Budget type selection | `OnboardingPage.tsx` — 4-step, inline descriptions, no disclosure modal | `POST /auth/onboarding` | ✅ |
| Location + currency + household | `OnboardingFlow.tsx` | `GET /auth/geolocation` | ✅ |
| AI budget generation | `AIBudgetGenerationPage.tsx` — 5-step progress animation | `POST /budget/ai-generate` (real Bedrock call) | ✅ |
| Welcome tour | `WelcomeTooltipChain.tsx` — 3-step spotlight on `/overview` | — | ✅ |

**Completed since Session 149**: AI generation mock replaced with real Bedrock call; onboarding redesigned with 4-step progress indicator; navigates to `/overview` (was `/budget`); welcome tooltip chain added

---

### 0. Overview Dashboard

**Goal**: Answer "How am I doing right now?" without navigating to individual sections.

| Section | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Financial Health Bar | `OverviewPage.tsx` | `GET /budget/current` | ✅ |
| Net Worth Trend sparkline | `OverviewPage.tsx` | `GET /net-worth/history` | ✅ |
| Top Spending Categories | `OverviewPage.tsx` | `GET /budget/current` | ✅ |
| Upcoming Bills | `OverviewPage.tsx` | `GET /bills` | ✅ |
| Active Goals | `OverviewPage.tsx` | `GET /goals` | ✅ |
| AI Insight of the Day | `OverviewPage.tsx` — daily rotating pool (30+ templates) + API fallback | `GET /insights/weekly` | ✅ |
| Quick Add Transaction | `OverviewPage.tsx` | — (navigates to `/budget`) | ✅ |
| Budget Health Score ring | `BudgetHealthScore` component in `OverviewPage.tsx` | `GET /budget/health-score` | ✅ |
| Cash Flow Forecast | `CashFlowForecast` component in `OverviewPage.tsx` | `GET /budget/cash-flow` | ✅ |
| Welcome tooltip chain | `WelcomeTooltipChain.tsx` | — | ✅ |
| AI spending nudges | `AIInsightCard` in `OverviewPage.tsx` | DynamoDB `NUDGE#` records | ✅ |

---

### 2. Daily Budget Management

**Goal**: Add a transaction in under 30 seconds, see budget update instantly.

**Entry points**: Open app → current month budget; push notification deep link; widget tap

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Budget dashboard | `BudgetPage.tsx` | `GET /budget?month=YYYY-MM` | ✅ |
| Add/edit/delete transaction | `TransactionModal.tsx` | `POST/PUT/DELETE /transactions` | ✅ |
| Transaction list + search | `TransactionList.tsx`, `TransactionFilters.tsx` | `GET /transactions` | ✅ |
| Month navigation | `MonthNavigator.tsx` | — | ✅ |
| Planned transactions | ❌ Not started | `POST /transaction-planning` | 🔄 Backend only |

---

### 3. Bank Account Connection (Plaid)

**Goal**: Connect bank accounts so transactions import automatically.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Plaid Link | `PlaidLinkButton.tsx` | `POST /plaid/link-token` | ✅ |
| Connected accounts | `ConnectedAccounts.tsx` | `GET /plaid/accounts` | ✅ |
| Pending transactions | `PendingTransactions.tsx` | `GET /plaid/pending` | ✅ |
| Approve/reject | `PendingTransactions.tsx` | `POST /plaid/pending/approve` | ✅ |
| "Create a rule?" prompt | `PendingTransactions.tsx` — shown on recategorization | `POST /rules` | ✅ |
| Sync | `ConnectedAccounts.tsx` | `POST /plaid/sync` | ✅ |
| Unlink | `ConnectedAccounts.tsx` | `DELETE /plaid/accounts/{id}` | ✅ |

---

### 4. Budget Collaboration

**Goal**: Invite partner, household members, or a financial advisor with the right access level.

**Steps**: Choose budget type at onboarding → Invite from Budget Members page → Invitee receives email → Accepts via link → Joins budget → Budget switcher appears if multiple budgets

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Budget Members page | `BudgetMembersPage.tsx` | `GET /budgets/{id}/members` | ✅ |
| Send invitation | `BudgetMembersPage.tsx` | `POST /budgets/{id}/invite` | ✅ |
| Accept invitation | `AcceptInvitationPage.tsx` | `POST /budgets/accept-invitation` | ✅ (public endpoint — no auth required) |
| Invitation preview | `AcceptInvitationPage.tsx` | `GET /budgets/invitation-preview` | ✅ Smart page: shows inviter name, budget name, smart auth tab, pre-filled email |
| Smart auth tab on accept | `AcceptInvitationPage.tsx` | `GET /auth/check-email` (or preview API) | ✅ Shows "Create Account" for new users, "Log In" for existing users |
| Pending invitations | `BudgetMembersPage.tsx` | `GET /budgets/{id}/invitations` | ✅ |
| Resend / revoke | `BudgetMembersPage.tsx` | `POST/DELETE /budgets/{id}/invitations/{id}` | ✅ |
| Change role / remove | `BudgetMembersPage.tsx` | `PUT/DELETE /budgets/{id}/members/{userId}` | ✅ |
| Extend viewer access | `BudgetMembersPage.tsx` | `PUT /budgets/{id}/members/{userId}/extend` | ✅ |
| Budget switcher | `BudgetSwitcher.tsx` | `GET /budgets` + `PUT /budgets/active` | ✅ |
| Archive / delete budget | `BudgetMembersPage.tsx` | `PUT/DELETE /budgets/{id}` | ✅ |

---

### 5. Financial Insights

**Goal**: Understand spending patterns and get AI-powered recommendations.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Insights dashboard | `InsightsPage.tsx` | `GET /insights/summary` | ✅ |
| AI Q&A ("Ask Your AI Coach") | `InsightsPage.tsx` — chat bubble UI, session persistence | `POST /insights/ask` | ✅ |
| Spending trends chart | `InsightsTrendChart.tsx` — recharts, lazy-loaded, category filter | `GET /insights/trends` | ✅ |
| Spending patterns (day/merchant) | `InsightsPage.tsx` | `GET /insights/patterns` | ✅ |
| Peer comparison | `PeerComparisonWidget.tsx` | `GET /comparison/summary` | ✅ |
| Tips feed | `TipsFeedPage.tsx` | `GET /tips/feed` | ✅ |
| Receipt scanning | `ReceiptUpload.tsx`, `ReceiptScanner.tsx` | `POST /receipt/upload` | ✅ |
| Credit score | `CreditScorePage.tsx` | `GET /credit-score` | ✅ |
| Investment tracking | `InvestmentsPage.tsx` | `GET /investments/portfolio` | ❌ Not deployed |

---

### 6. Debt & Savings Goals

**Goal**: Create payoff plans and track savings goals with milestone celebrations.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Goals card grid | `GoalsPage.tsx` — SVG progress rings, drag-and-drop reorder, "Add Funds" on card | `GET /goals` | ✅ |
| Create / edit / delete goal | `GoalFormPage.tsx` | `POST/PUT/DELETE /goals` | ✅ |
| Debt payoff calculator | `DebtPayoffPage.tsx` — strategy selector, extra payment slider | `GET /debts/payoff-plan` | ✅ |
| Debt payoff timeline | `DebtPayoffPage.tsx` — horizontal timeline, color-coded by type, payment modal | `GET /debts/summary` | ✅ |
| Mobile goals | `GoalsScreen.tsx` | Same as web | ✅ |

---

### 7. Notifications & Reminders

**Goal**: Stay on track without constantly checking the app.

**Notification types**: Budget threshold alerts (80%/90%/100%), daily expense reminders, bill reminders (7/3/1 day), weekly summary, AI bill pattern alerts

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Notification preferences | `NotificationSettings.tsx` | `GET/PUT /notifications/preferences` | ✅ |
| In-app notification center | `NotificationCenter.tsx` | `GET /notifications/history` | ✅ |
| Push notifications | Mobile (Expo) | EventBridge + Lambda | ✅ |
| AI bill reminders | `BillsPage.tsx` | `GET /pattern-detection/bills` | ✅ |

---

### 8. Settings & Profile

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Profile settings | `SettingsPage.tsx` — tab layout: Profile/Budget/Notifications/Banks/Privacy/Help | `GET/PUT /auth/profile` | ✅ |
| Budget members | Links to `BudgetMembersPage.tsx` | — | ✅ |
| Notification settings | `NotificationSettings.tsx` | — | ✅ |
| Auto-categorization rules | `TransactionRulesSection` in `SettingsPage.tsx` | `GET/DELETE /rules` | ✅ |
| Delete account | `DeleteAccountModal.tsx` | `DELETE /auth/account` | ✅ |
| Dark mode | `ThemeContext.tsx` | — | ✅ |
| Pricing page | `PricingPage.tsx` at `/pricing` | — | ✅ |

---

### 9. AI Bill Reminders & Budget Planning

**Goal**: Automatically detect recurring bills and suggest budget adjustments.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Pattern detection | `BillsPage.tsx` | `GET /pattern-detection/patterns` | ✅ |
| Mark as recurring | `BudgetPage.tsx` | `POST /pattern-detection/mark-recurring` | ✅ |
| Budget suggestions | `BudgetSuggestionsModal.tsx` | `POST /budget-planning/suggestions` | ✅ |
| Pattern review | `PatternReviewModal.tsx` | `PUT /pattern-detection/patterns/{id}` | ✅ |

---

## Deprecated / Removed

| Item | Replacement |
|------|-------------|
| `/family/*` API | `/budgets/*` — returns **410 Gone** (verified live) |
| `FamilyIdResolver` | `BudgetAccessResolver` |
| `FAMILY#` partition keys | `BUDGET#` partition keys |
| `custom:familyId` JWT claim | Not used — only `custom:userId` |
| `FamilySettings.tsx` | `BudgetMembersPage` at `/budget/members` |
| `api-family-stack` | `api-budgets-stack` (family stack still deployed, returns 410) |
