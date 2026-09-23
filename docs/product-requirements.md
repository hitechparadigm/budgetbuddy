# BudgetBuddy Product Requirements

**Last Updated**: 2026-09-23 (Session 162 — CategoryIcon, AiCoachChip, GoalsPage Borrowed/Lent tabs, PlannedTransactions, transaction-planning CDK, spec/steering audit)
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
  GOAL#<id>        → { name, targetAmount, currentAmount, targetDate, subType? }
  INVITATION#<id>  → { budgetId, invitedEmail, role, tokenHash, status, expiresAt, viewerExpiresAt }
  PLANNED_TXN#<id> → { name, amount, dueDate, categoryId, categoryName, isPaid, paidAt?, createdAt }
```

**`GOAL#<id>` `subType`**: optional field — `'goal'` (default), `'borrowed'`, or `'lent'`. No migration needed; existing goals without `subType` treated as regular goals.

**`PLANNED_TXN#<id>`**: planned future transactions (income or expense). `isPaid: false` on creation; `POST .../mark-paid` sets `isPaid: true` + `paidAt`.

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
- ✅ AI-powered budget generation from location + household size (348 cities); **Subscriptions 📺 now always included** as a suggested category (fixed amount, not location-dependent; $85/$110/$130 by household size)
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
- ✅ Revoke invitation (`DELETE /budgets/{id}/invitations/{id}`)\
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
- ✅ Investment tracking — `backend/functions/investments/` deployed to `api-features-stack`; holdings CRUD, portfolio summary, performance history
- ✅ **Investment market news** — Alpha Vantage `NEWS_SENTIMENT` API; articles with sentiment (Bullish/Bearish/Neutral), source, related tickers
- ✅ **Investment market signals** — Alpha Vantage `TOP_GAINERS_LOSERS` API; top gainers, losers, most active with price/change%
- ✅ Subscriptions: list, AI detection from transactions (`POST /subscriptions/detect`), add/edit/delete, monthly/yearly cost tracking, renewal reminders, review status (Keep/Review/Cancel)
- ✅ Notifications: device registration, preferences (GET/PUT), notification history, push delivery via Expo
- ✅ Net worth tracking (manual + investment accounts) — `backend/functions/net-worth/` deployed to extended stack
- ✅ **Tools page** — `/tools` with client-side Debt Payoff Calculator (5-scenario comparison table + bar chart) and Compound Interest Calculator (up to 50yr growth chart, 5 compounding frequencies)
- ✅ **Planned transactions** — `backend/functions/transaction-planning/` + CDK in `api-features-extended-stack.ts`; full CRUD on `PLANNED_TXN#<id>` keys; mark-paid endpoint; RBAC enforced (owner/partner write, viewer read-only)

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
- ✅ **Sidebar IA** — 5 primary items (Overview, Budget, Accounts, Goals, Insights) + **Track** group (Debt Payoff, Investments, Net Worth, Credit Score) + **Manage** group (Bills, Subscriptions, Members, **Planned**) + **Tools** standalone + Settings (Session 161 redesign; Session 162 added CalendarClock + Planned item)

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
- ✅ **Budget category inline transaction list** — click category row → inline expand shows all transactions with edit/delete; chevron + count badge; sub-category grouping via `parentId`
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
- ✅ **`AiCoachChip`** — contextual floating chip on `BudgetPage.tsx`; label adapts to budget state (over-budget category, unallocated income, spending pace); opens InsightsPage AI coach on click (Session 162)

### Web App Polish (Phase 5 — Onboarding & Conversion)
- ✅ **Landing page rewrite** — new headline "Your budget, built in 60 seconds", 3-step proof, pricing section
- ✅ **`/pricing` page** — `PricingPage.tsx` at `/pricing`; Free vs Premium comparison table with 17 feature rows; in-app upgrade prompts link here
- ✅ **Onboarding 5-step flow** — Step 1: budget type; Steps 2-5 in `OnboardingFlow`: Location → Currency → Household → **Subscriptions** → Categories; Subscriptions step asks "Do you have streaming services?"; budget type descriptions shown inline; navigates to `/overview` after completion
- ✅ **AI generation animation** — 5-step progress animation during Bedrock call
- ✅ **Welcome tooltip chain** — `WelcomeTooltipChain.tsx` shows on first login to `/overview`; 3-step spotlight tour; localStorage gated
- ✅ **Premium gates** — `PremiumGate` + `PremiumBadge` components; 3 gates: Insights memory, Export buttons, Budget Health Score
- ✅ **Daily rotating AI insight pool** — 30+ insight templates in `OverviewPage.tsx`; day-of-year cycling; falls back to pool if API call fails
- ✅ **Monthly SES kickoff email** — `sendMonthlyKickoffEmail()` in `daily-reminders/index.js`; triggered on `isFirstDayOfMonth` check; includes pre-filled category count from previous month

### Session 162 — New Components & Features (2026-09-23)

- ✅ **`CategoryIcon` component** (`packages/web-app/src/components/CategoryIcon.tsx`) — CSS background tint + colored border badge; color derived from category name patterns (food/transport/housing/etc.); replaces plain emoji display throughout
- ✅ **`AiCoachChip` component** (`packages/web-app/src/components/AiCoachChip.tsx`) — floating pill button centered at bottom of BudgetPage; contextual label derived from budget state: over-budget category name, unallocated income amount, spending pace percentage, or default "Ask AI Coach"; amber styling when alert condition, neutral otherwise
- ✅ **GoalsPage — Borrowed/Lent tabs** (`packages/web-app/src/pages/GoalsPage.tsx`) — three-tab layout: Goals, Borrowed, Lent; filtered by `subType` field on GOAL# records; tab-specific empty states and CTA buttons
- ✅ **`BorrowLendFormPage`** (`packages/web-app/src/pages/BorrowLendFormPage.tsx`) — create borrowed/lent goal records at `/goals/borrow-lend/new?type=borrowed|lent`; fields: description, amount, counterparty name, optional due date; saves via existing goals API with `subType` field
- ✅ **`PlannedTransactionsPage`** (`packages/web-app/src/pages/PlannedTransactionsPage.tsx`) — full CRUD UI at `/planned-transactions`; list, create modal, edit modal, delete confirmation, mark-as-paid button with visual paid indicator; empty state
- ✅ **`plannedTransactionsApi.ts`** (`packages/web-app/src/services/plannedTransactionsApi.ts`) — API client for Extended Features API; `getPlannedTransactions()`, `createPlannedTransaction()`, `updatePlannedTransaction()`, `deletePlannedTransaction()`, `markAsPaid()`
- ✅ **Sidebar updated** — CalendarClock icon + "Planned" item added to `manageItems` array in `Sidebar.tsx`; routes to `/planned-transactions`
- ✅ **App.tsx routes** — added `/planned-transactions` and `/goals/borrow-lend/new` routes
- ✅ **transaction-planning Lambda migrated** (`backend/functions/transaction-planning/index.js`) — fully migrated from `FAMILY#`/`FamilyIdResolver` to `BudgetAccessResolver` + `BUDGET#` keys
- ✅ **CDK: transaction-planning added to extended stack** (`infrastructure/lib/api-features-extended-stack.ts`) — `TransactionPlanningHandler` Lambda with Bedrock IAM policy + all 6 routes (GET, POST, PUT, DELETE, mark-paid, health)
- ✅ **docs/mobile-ux-design.md** — comprehensive competitive analysis of Budge + Budgety apps; full mobile design system, navigation architecture, 8 screen specs, onboarding flow, empty states reference, MVP implementation priority tiers
- ✅ **Kiro specs added** — `.kiro/specs/planned-transactions/`, `.kiro/specs/goals-borrow-lend/`, `.kiro/specs/mobile-app/` with requirements.md, design.md, tasks.md; `web-app-polish` spec backfilled with requirements.md and design.md
- ✅ **Steering + hooks audit** — 00-global.md tightened (security non-negotiables at top), structure.md updated with new routes and mobile, tech.md slimmed; hooks reduced from firing on every prompt to targeted matchers only

### Session 152–161 — See Full History Above

*(Sessions 152–161 details preserved above in their respective sections)*

---

## Known Gaps (⚠️ Planned)

1. ~~**Family budget transparency not enforced at category level**~~ ✅ **Fixed (Session 148)**

2. **`canUseFeature()` not called in Lambda handlers** — the entitlement pattern is wired but Phase 1 intentionally leaves all features open. Phase 2 will add actual gating for `reports.advanced` and `budget.export`.

### Medium Priority

3. **Subscription as a DynamoDB entity** — currently `subscriptionTier` comes from the Cognito JWT claim. Phase 2 needs a `SUBSCRIPTION#<userId>/METADATA` record and a `SubscriptionGroup` entity for family subscription sharing.

4. **Invitation token lookup uses Scan** — `handleAcceptInvitation` scans the table for the hashed token. Works at current scale; needs a GSI on `tokenHash` for production scale.

5. **`shared` budget type has no distinct behavioral rules** — `shared` is accepted and stored but behaves identically to `family` except for the partner limit. The vision specifies shared budgets should only contain shared expenses (no income, no personal debt). This is a product enforcement question, not a data model issue.

6. **SES still in sandbox mode** — can only send to verified addresses. Verified: `dmytro.malyk@gmail.com`, `dima.pmp@gmail.com`, `info@hitechparadigm.com`, `t1@taxprocanada.ca`, `dmalyk@taxprocanada.ca`. Request SES production access to send to any address.

### Low Priority

7. ~~**Dark mode missing on BudgetPage, SettingsPage, GoalsPage**~~ ✅ **Fixed (Session 148)**
8. ~~**Goals not reflected in budget**~~ ✅ **Fixed (Session 148)**
9. ~~**Planned transactions frontend** — backend Lambda exists, no frontend UI yet~~ ✅ **Fixed (Session 162)** — `PlannedTransactionsPage` at `/planned-transactions`; CDK routes added to `api-features-extended-stack.ts`

### Mobile (New)

10. **React Native + Expo mobile app** — design complete (`docs/mobile-ux-design.md`), spec created (`.kiro/specs/mobile-app/`), implementation not yet started. Tier 1 priorities: Budget screen, Transaction entry, Goals screen, Onboarding.

---

## Web App Polish Plan — New Requirements (docs/web-app-polish-plan.md)

### Session 149–162 — Web App Polish Complete (all 18 criteria met)

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
- ✅ **REQ-NEW-19** — Planned Transactions page with full CRUD at `/planned-transactions` (Session 162)
- ✅ **REQ-NEW-20** — Goals Borrowed/Lent tabs with `subType` field (Session 162)
- ✅ **REQ-NEW-21** — CategoryIcon colored component + AiCoachChip contextual floating button (Session 162)

---

## Live API Test Results (2026-06-15)

Tested against dev environment using `scripts/test-live-api.js`. **111 checks passed, 0 failed** across 20 test sections. All previous skips resolved — transactions work end-to-end.

## Live API Test Results (2026-06-19 — Session 150 New Endpoints)

New endpoints added during web app polish, verified live:

| Endpoint | API | Status |
|----------|-----|--------|
| `GET /budget/health-score` | Main API (`q0zoob6728`) | ✅ Returns score, components, interpretation, delta |
| `GET /budget/cash-flow` | Main API (`q0zoob6728`) | ✅ Returns balance forecast + 30-day timeline |
| `GET /rules` | Extended API (`hkjzroedjf`) | ✅ Returns rules array |
| `POST /rules` | Extended API (`hkjzroedjf`) | ✅ Wired from PendingTransactions prompt |
| `GET /net-worth/allocation` | Extended API (`hkjzroedjf`) | ✅ 200 OK |

---

## User Journeys

### 1. New User Onboarding

**Goal**: Set up a budget with AI assistance in under 5 minutes.

**Steps**: Landing → Register (email or Google) → Location + currency → Household type + size → AI budget generation → First transaction tutorial

| Step | Frontend | Backend API | Status |
|------|----------|-------------|--------|
| Register | `AuthPage.tsx` / `RegisterForm.tsx` — autocomplete attrs, design token buttons, proper `htmlFor`/`id` structure | `POST /auth/register` | ✅ |
| Google Sign-In | `GoogleSignInButton.tsx` | `POST /auth/google` | ✅ |
| Sign In | `LoginForm.tsx` — autocomplete on email+password, design token submit button, full 3-step Forgot Password inline flow (email → code → new password) | `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/confirm-forgot-password` | ✅ |
| Accept invitation | `AcceptInvitationPage.tsx` — smart tab (Login vs Create Account), pre-fills email; fixed: JWT decoded manually on NONE-auth route, `acceptInvitationCore` bypasses stale React state | `POST /budgets/accept-invitation` | ✅ |
| Budget type selection | `OnboardingPage.tsx` — 5-step total, inline descriptions, no disclosure modal | `POST /auth/onboarding` | ✅ |
| Location + currency + household | `OnboardingFlow.tsx` Steps 2-4 | `GET /auth/geolocation` | ✅ |
| Subscriptions step | `OnboardingFlow.tsx` Step 4 — Yes/No + amount input, quick presets; carries into Subscriptions category | — | ✅ |
| AI budget generation | `AIBudgetGenerationPage.tsx` — 5-step progress animation | `POST /budget/ai-generate` (real Bedrock call) | ✅ |
| Welcome tour | `WelcomeTooltipChain.tsx` — 3-step spotlight on `/overview` | — | ✅ |

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
| Quick Add Transaction | `QuickAddTransactionModal.tsx` — loads categories from budget API | `GET /budget/current` | ✅ |
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
| Add/edit/delete transaction | Transaction modal in `BudgetPage.tsx` — sheet-style on mobile, income/expense toggle, amount-first layout | `POST/PUT/DELETE /transactions` | ✅ |
| Quick-add transaction per category | `+` button on each category row in `BudgetPage.tsx` — pre-populates modal with that category | — | ✅ |
| Inline transaction list | Click category row → expands inline transaction list with edit/delete per transaction; chevron + count badge | — | ✅ |
| Sub-category grouping | `parentId` on `BudgetCategory` — nest items under parent; parent shows aggregate totals | — | ✅ |
| AI Coach chip | `AiCoachChip.tsx` floating on `BudgetPage.tsx` — contextual label (over-budget, unallocated, pace); opens Insights AI coach | — | ✅ |
| Category icon colors | `CategoryIcon.tsx` — CSS tint badge; color from category name pattern | — | ✅ |
| Transaction list + search | `TransactionList.tsx`, `TransactionFilters.tsx` | `GET /transactions` | ✅ |
| Month navigation | Month nav arrows in `BudgetPage.tsx` — timezone-safe | — | ✅ |
| Session expiry UX | Session-expired banner — shown when token refresh fails | — | ✅ |
| Budget month rollover | `createBudgetWithRecurringItems` — copies categories, resets spentAmount; auto-repairs corrupted empty months | `GET /budget/current` (auto-triggers) | ✅ |
| Planned transactions | `PlannedTransactionsPage.tsx` at `/planned-transactions` — full CRUD, mark-paid | `GET/POST/PUT/DELETE /transaction-planning`, `POST .../mark-paid` | ✅ |

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

### 3b. Bills & Subscriptions Workflow

**Goal**: Track recurring bills and subscriptions, link them to budget categories, mark paid automatically updates budget.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Bills list — design tokens, budget link visible | `BillsPage.tsx` (redesigned) | `GET /bills` | ✅ |
| Add/edit bill with category | `BillFormPage.tsx` (redesigned) | `POST/PUT /bills` | ✅ |
| Bill category → budget transaction on payment | `BillsPage.tsx` | `POST /bills/{id}/pay` | ✅ |
| Add subscription manually | `SubscriptionsPage.tsx` → `/bills/new?type=subscription` | `POST /bills` | ✅ |
| AI subscription detection | `SubscriptionsPage.tsx` | `POST /subscriptions/detect` | ✅ |
| Delete subscription confirmation modal | `SubscriptionsPage.tsx` | `DELETE /subscriptions/{id}` | ✅ |

---

### 4. Budget Collaboration

**Goal**: Invite partner, household members, or a financial advisor with the right access level.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Budget Members page | `BudgetMembersPage.tsx` | `GET /budgets/{id}/members` | ✅ |
| Send invitation | `BudgetMembersPage.tsx` | `POST /budgets/{id}/invite` | ✅ |
| Accept invitation | `AcceptInvitationPage.tsx` | `POST /budgets/accept-invitation` | ✅ (public endpoint) |
| Invitation preview | `AcceptInvitationPage.tsx` | `GET /budgets/invitation-preview` | ✅ |
| Smart auth tab on accept | `AcceptInvitationPage.tsx` | `GET /auth/check-email` | ✅ |
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
| Receipt scanning | `ReceiptUpload.tsx` — presigned S3 upload, Textract OCR; uses `config.extendedFeaturesApiUrl` | `POST /receipt/upload`, `POST /receipt/process` | ✅ |
| Credit score | `CreditScorePage.tsx` | `GET /credit-score` | ✅ |
| Investment tracking | `InvestmentsPage.tsx` | `GET /investments/portfolio` | ✅ Deployed to features API |
| Investment market news | `InvestmentsPage.tsx` — news feed with sentiment | `GET /investments/news` (Alpha Vantage) | ✅ |
| Investment market signals | `InvestmentsPage.tsx` — gainers/losers/active | `GET /investments/signals` (Alpha Vantage) | ✅ |

---

### 6. Debt & Savings Goals

**Goal**: Create payoff plans and track savings goals with milestone celebrations.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Goals card grid | `GoalsPage.tsx` — SVG progress rings, drag-and-drop, "Add Funds" on card | `GET /goals` | ✅ |
| **Goals Borrowed/Lent tabs** | `GoalsPage.tsx` — three-tab layout (Goals/Borrowed/Lent); filtered by `subType` field | `GET /goals` (filtered client-side) | ✅ |
| **BorrowLendFormPage** | `BorrowLendFormPage.tsx` at `/goals/borrow-lend/new?type=borrowed\|lent` | `POST /goals` with `subType` | ✅ |
| Create / edit / delete goal | `GoalFormPage.tsx` — `htmlFor`/`id` on all fields, design token inputs | `POST/PUT/DELETE /goals` | ✅ |
| Debt payoff calculator | `DebtPayoffPage.tsx` — redesigned strategy UX: plain-English descriptions, "Saves most" badge | `GET /debts/payoff-plan` | ✅ |
| Debt payoff timeline | `DebtPayoffPage.tsx` — horizontal timeline, color-coded by type, payment modal | `GET /debts/summary` | ✅ |
| Add / edit debt | `DebtFormPage.tsx` — design token focus rings + inputs | `POST/PUT /debts` | ✅ |
| Tools — Debt Payoff Calculator | `ToolsPage.tsx` — 5 extra-payment scenarios, **public route** | — (no API) | ✅ |
| Tools — Compound Interest | `ToolsPage.tsx` — **public route** | — (no API) | ✅ |
| Mobile goals | `GoalsScreen.tsx` | Same as web | 🔲 Not started |

---

### 7. Notifications & Reminders

**Goal**: Stay on track without constantly checking the app.

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
| Dark mode | `ThemeContext.tsx` — full systematic token coverage across all 81 page + component files | — | ✅ |
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

### 10. Planned Transactions (New — Session 162)

**Goal**: Schedule future income and expenses against budget categories for forward-looking cash flow visibility.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| List planned transactions | `PlannedTransactionsPage.tsx` at `/planned-transactions` | `GET /transaction-planning` | ✅ |
| Create planned transaction | Create form modal in `PlannedTransactionsPage.tsx` | `POST /transaction-planning` | ✅ |
| Edit planned transaction | Edit modal in `PlannedTransactionsPage.tsx` | `PUT /transaction-planning/{id}` | ✅ |
| Delete planned transaction | Delete confirmation in `PlannedTransactionsPage.tsx` | `DELETE /transaction-planning/{id}` | ✅ |
| Mark as paid | Mark-paid button with visual indicator | `POST /transaction-planning/{id}/mark-paid` | ✅ |
| Sidebar navigation | CalendarClock + "Planned" in Manage group (`Sidebar.tsx`) | — | ✅ |

---

### 11. Mobile App (New — Spec Created Session 162)

**Goal**: Native iOS and Android app with offline support, matching web feature parity on Tier 1 features.

**Status**: Design complete (`docs/mobile-ux-design.md`), spec created (`.kiro/specs/mobile-app/`), implementation not yet started.

| Feature | Frontend | Status |
|---------|----------|--------|
| Authentication (email + Google PKCE) | `LoginScreen`, `RegisterScreen` | 🔲 Not started |
| Onboarding (budget type + AI generation) | `BudgetTypeScreen`, `AIGenerationScreen` | 🔲 Not started |
| Budget screen (groups, categories, FAB) | `BudgetScreen` | 🔲 Not started |
| Quick transaction entry (bottom sheet) | `AddTransactionSheet` | 🔲 Not started |
| Goals screen (Goals/Borrowed/Lent tabs) | `GoalsScreen` | 🔲 Not started |
| Offline SQLite sync | `db/` + sync hooks | 🔲 Not started |
| Push notifications | Expo Notifications | 🔲 Not started |

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
