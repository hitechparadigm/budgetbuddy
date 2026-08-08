# BudgetBuddy Product Requirements

**Last Updated**: 2026-08-08 (Session 157 — Budget rollover fix, Forgot Password Cognito flow, Receipt scanning API URL fix)
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
- ✅ Investment tracking — `backend/functions/investments/` deployed to `api-features-stack`; holdings CRUD, portfolio summary, performance history
- ✅ **Investment market news** — Alpha Vantage `NEWS_SENTIMENT` API; articles with sentiment (Bullish/Bearish/Neutral), source, related tickers
- ✅ **Investment market signals** — Alpha Vantage `TOP_GAINERS_LOSERS` API; top gainers, losers, most active with price/change%
- ✅ Subscriptions: list, AI detection from transactions (`POST /subscriptions/detect`), add/edit/delete, monthly/yearly cost tracking, renewal reminders, review status (Keep/Review/Cancel)
- ✅ Notifications: device registration, preferences (GET/PUT), notification history, push delivery via Expo
- ✅ Net worth tracking (manual + investment accounts) — `backend/functions/net-worth/` deployed to extended stack

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
- ✅ **Onboarding 5-step flow** — Step 1: budget type; Steps 2-5 in `OnboardingFlow`: Location → Currency → Household → **Subscriptions** → Categories; Subscriptions step asks "Do you have streaming services?" with amount input and quick-select presets; budget type descriptions shown inline; navigates to `/overview` after completion
- ✅ **AI generation animation** — 5-step progress animation during Bedrock call
- ✅ **Welcome tooltip chain** — `WelcomeTooltipChain.tsx` shows on first login to `/overview`; 3-step spotlight tour (Financial Health Bar → AI Insight → Add Transaction); localStorage gated
- ✅ **Premium gates** — `PremiumGate` + `PremiumBadge` components; 3 gates: Insights memory, Export buttons, Budget Health Score
- ✅ **Daily rotating AI insight pool** — 30+ insight templates in `OverviewPage.tsx`; day-of-year cycling; falls back to pool if API call fails
- ✅ **Monthly SES kickoff email** — `sendMonthlyKickoffEmail()` in `daily-reminders/index.js`; triggered on `isFirstDayOfMonth` check; includes pre-filled category count from previous month

### Session 152 — Comprehensive Responsive UI/UX Audit + Fixes (2026-06-21)
**Invitation Resend Bug (Critical):**
- ✅ **`handleResendInvitation` fixed** — was blocking resend if original invitation expired; removed expired check on resend since resend's purpose is to refresh an expired invite
- ✅ **`expiresAt` now reset to 7 days from now on resend** — old code kept the original expiry, causing "Invalid Invitation" on click
- ✅ **Both `token` + `tokenHash` fields written** — scan-based `handleAcceptInvitation` and `handleInvitationPreview` filter on `tokenHash`; create/resend now writes both fields for compatibility
- ✅ **`AcceptInvitationPage.tsx` design tokens** — replaced all hardcoded `bg-blue-600`, `text-gray-*` with `var(--color-primary)`, `var(--color-foreground)` etc.

**Responsive UI/UX Audit Findings + Fixes:**
- ✅ **Budget page mobile header decluttered** — Export CSV, Export PDF, Reset, Today, Keyboard shortcuts buttons now `hidden sm:` (hidden on <640px); only month navigation arrows remain visible on mobile
- ✅ **Touch targets 44px minimum (WCAG 2.5.5)** — `Button` component `sm` size: added `min-h-[44px]`; hamburger: `48×48px` (was 40×40); Learn More banner link: `min-h-[44px]`; month navigation arrows: `min-w/h-[44px]`
- ✅ **AppLayout mobile header design tokens** — was `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`; now uses `bg-[var(--color-surface)] border-[var(--color-border)]`
- ✅ **Budget group total row gap** — "PlannedReceived" labels running together fixed by using `gap-6` instead of `md:space-x-4` with no mobile gap
- ✅ **Month navigation arrows design tokens** — was `text-gray-600 border-gray-300 hover:bg-gray-100`; now uses CSS vars

**Automated Audit Results (375px viewport, 13 pages):**
- Zero horizontal overflow on all 13 pages
- Zero page-level errors on any route
- Dark mode CSS vars correctly resolving (`--color-background: #111827`, `--color-surface: #1f2937`)

**AWS Config Disabled:**
- ✅ AWS Config recorder deleted — was recording ALL 915 resources (including 555 API Gateway methods) since April 2022 with 0 rules configured; delivery channel pointing to deleted S3 bucket; estimated 30-40% of cloud bill. Recording stopped and recorder + delivery channel deleted from us-east-1.

**Bug Fixes:**
- ✅ **Budget right sidebar UX** — replaced cramped category details panel (text-only) with progress bars, over-budget `+X%` pill badges, design-token colors throughout; `+ Add Item` uses brand green; transaction tabs use `var(--color-primary)`
- ✅ **Bills category dropdown empty** — `GET /budget/current` requires `?month=YYYY-MM`; BillFormPage was calling it without the param → 400 → silent fail → empty dropdown. Fixed + added `categoriesLoading` state + disabled select while loading
- ✅ **Budget 401 silent fail** — when JWT expired mid-session, `loadBudget()` (raw `fetch`, not `apiClient`) would get 401 and silently show empty budget. Now: attempt silent token refresh via `apiClient.tryRefreshTokens()` → retry; if refresh fails → **Session expired banner** with "Sign in again" button preserving `returnTo` URL (Session 153 improved from redirect to graceful banner)
- ✅ **Net Worth assets save 500** — `createAsset` and `createLiability` called `generateId("asset")` but `generateId` is an object; fixed to `generateId.custom("asset")` / `generateId.custom("liab")`
- ✅ **Net Worth liabilities save 500** — same fix

**Bills & Subscriptions workflow clarification + improvements:**
- ✅ **Bills redesign** — design tokens throughout (no more hardcoded blue/gray-50); `+ Link to budget category` inline prompt on bills without a category; "→ Budget: [Category]" shown when linked; logged transaction badge when paid; inline edit/delete buttons
- ✅ **Bills form redesign** — category loading fixed; `?type=subscription` mode shows subscription-specific copy and routes back to Subscriptions on save; toggle switch for recurring instead of checkbox
- ✅ **Subscriptions redesign** — design tokens; `window.confirm` replaced with controlled delete modal; `+ Add manually` button routes to Bills form in subscription mode; `StatCard` uses `card` CSS class
- ✅ **Subscription "Add manually" bridge** — Subscriptions page now has `+ Add manually` button → `/bills/new?type=subscription` → form shows "Adding a subscription manually" copy → saves and returns to Subscriptions

**Investments:**
- ✅ **Alpha Vantage API key** — stored in Secrets Manager at `budgetbuddy/alphavantage/api-key`
- ✅ **Investments Lambda deployed** — added to `api-features-stack.ts`; 10 routes including `/investments/news` and `/investments/signals`
- ✅ **`investmentsApi.ts` base URL fixed** — was calling main API (`q0zoob6728`); investments is on features API (`0poeu07vth`)
- ✅ **Market news section** — `InvestmentsPage.tsx` now shows Alpha Vantage news feed with sentiment badges, article thumbnails, source attribution, click-through to full article
- ✅ **Market signals section** — Top gainers, losers, most active with price and change%; refresh button
- ✅ **Mobile app banner** — sticky bottom banner at `<768px` in AppLayout
- ✅ **Budget transaction slide-over** — floating "Transactions" button at `<md` breakpoints opens slide-over panel with last 20 transactions; closes on backdrop click
- ✅ **Transaction filter session persistence** — `sessionStorage` via `useTransactionFilters` hook
- ✅ **Lucide icon `aria-labels`** — Sidebar icon-only buttons have `aria-label` and `title` in collapsed mode
- ✅ **Budget row screen reader labels** — `aria-label="{Category}: $X planned, $Y spent, $Z remaining"` in `BudgetGroups.tsx`
- ✅ **WCAG 2.1 AA color contrast** — `#059669` on white = 4.68:1 (AA pass)
- ✅ **Performance — lazy loading** — 20 secondary pages lazy-loaded with `React.lazy`/`Suspense`; vendor chunks split (react, lucide, AI generation page); initial bundle **113KB gzip** (was 242KB, −53%); recharts 107KB deferred to Insights only
- ✅ **Vite code-splitting config** — `vite.config.ts` with `manualChunks` for `vendor-react`, `vendor-lucide`, `page-ai-budget`
- ✅ **`ErrorBoundary` auto-reload on chunk-load errors** — detects "Failed to fetch dynamically imported module"; shows "reloading…" spinner, reloads once (60s cooldown); `vite:preloadError` handler in `main.tsx` for pre-React interception

### Session 153 — Auth UX, Add-Transaction Redesign, Dark Mode Systematic Fix (2026-06-21)

**Auth Session Expiry (Critical UX Fix):**
- ✅ **Session-expired banner** — when JWT expires mid-session and token refresh fails, `BudgetPage` now shows a full-screen "Session expired" banner with a "Sign in again" button that preserves the current month in `returnTo`; no more silent blank budget or hard-redirect that lost navigation state
- ✅ **`saveBudgetToBackend` 401 handling** — adds the same token refresh + retry + expired banner pattern to the save path, so an expired token mid-edit doesn't silently discard changes
- ✅ **Month timezone bug fixed** — `changeMonth()` was using `new Date().toISOString().slice(0,7)` (UTC) for the new month string; now uses local timezone formatting (`${date.getFullYear()}-${padded month}`) which was causing wrong month to load for users in UTC− timezones

**Add Transaction Modal Redesign:**
- ✅ **Sheet-style modal on mobile** — slides up from bottom on `<sm`, centered card on desktop (was full-center on all sizes)
- ✅ **Income / Expense type toggle inside modal** — was only settable from the FAB, now a toggle at the top of the modal so users can switch type without closing and reopening; switching to expense clears any income-specific category
- ✅ **Amount field first and large** — amount input now uses `text-xl font-semibold` and appears first (most critical entry for a transaction)
- ✅ **Description + Date side-by-side** — reduces vertical height of the modal by ~1 field height on mobile
- ✅ **Button color reflects type** — green submit button for income, emerald (`var(--color-primary)`) for expense
- ✅ **All modal fields use CSS design tokens** — `border-[var(--color-border)]`, `bg-[var(--color-background)]`, `text-[var(--color-foreground)]` throughout; no hardcoded `bg-white` / `text-gray-*`

**Per-Category Quick-Add Transaction:**
- ✅ **`+` button on every category row** — hovering a category row now shows three icons: green `+` (add transaction to this category), pencil (edit planned amount), trash (delete); clicking `+` opens the add transaction modal pre-populated with that category and the correct income/expense type
- ✅ **Always visible on mobile** — action icons use `md:opacity-0 group-hover/item:opacity-100` so they're always shown on touch devices (can't hover on mobile)

**Budget Item Modal Redesign:**
- ✅ **Sheet-style on mobile** — same pattern as transaction modal (`rounded-t-2xl sm:rounded-xl`, slides from bottom)
- ✅ **`max-h-[90vh] overflow-y-auto`** — long income-frequency forms no longer overflow the screen on small viewports
- ✅ **All fields use CSS design tokens** — no more `bg-white`, `text-gray-*`, `border-gray-300`, `focus:ring-blue-500`

**Bill Category Selection Fix:**
- ✅ **Fallback option for saved category** — when editing a bill whose `categoryId` is not in the current month's budget categories (category deleted, or different month), a `(saved)` option is appended so the saved link isn't silently lost; user can keep it or reassign
- ✅ **Categories not loading in Add Bill form** — `BillFormPage` was iterating `groups.expenses` items as group objects and calling `.categories` on them (undefined); fixed to read category items directly from `groups.income`, `groups.savings`, `groups.expenses`

**Dark Mode — Systematic Fix (81 files):**
- ✅ **27 page files** — `InsightsPage`, `NetWorthPage`, `InvestmentsPage`, `LearnPage`, `BudgetMembersPage`, `LandingPage`, `PrivacyPolicyPage`, `CreditScorePage`, `HelpCenterPage`, `AboutPage`, and 17 more — hardcoded `bg-white`, `bg-gray-50`, `bg-gray-100`, `text-gray-900/800/700/600/500/400`, `border-gray-200/300` replaced with CSS token vars
- ✅ **54 component files** — same systematic replacement across `components/` subtree
- ✅ **Reset modal, Budget item modal, Transaction modal** — all three modals in `BudgetPage.tsx` updated; `bg-white` → `bg-[var(--color-surface)]`, cancel buttons → `bg-[var(--color-muted)]`, text → `text-[var(--color-foreground)]`
- ✅ **Group headers and category rows** — `text-gray-900` → `text-[var(--color-foreground)]`, `text-gray-500` → `text-[var(--color-muted-foreground)]`; group total row `bg-muted` Tailwind alias → explicit `bg-[var(--color-muted)]`

### Session 154 — Category Loading Fix + Subscriptions Onboarding Step (2026-06-21)

**Category Loading Bug Fixes:**

**Root cause**: `budget/current` returns `groups` as `{ income: [...], savings: [...], expenses: [...] }` — a plain object where each key holds a flat array of category objects directly. Two components assumed it was either an array of group objects (with a nested `categories` property) or fell back to `[]` when `Array.isArray` returned false.

- ✅ **`QuickAddTransactionModal` categories fixed** — was calling `Array.isArray(budget.groups)` → false → fell back to `[]` → "No expense categories found"; now reads `g.income`, `g.savings`, `g.expenses` directly when format is an object, with fallback for already-transformed array format
- ✅ **`BillFormPage` categories fixed** — was pushing object-format items into `groups[]` then calling `group.categories` on each (undefined); now reads category items directly from `groups.expenses` and `groups.savings` flat arrays
- ✅ Both fixes handle both response formats (backend object format and frontend-transformed array format) for robustness

**"Add Subscription" already used BillFormPage** — confirmed from screenshot: `/bills/new?type=subscription` already routes to `BillFormPage` with subscription-specific copy. No routing change needed.

**Subscriptions as an AI-generated Budget Category:**
- ✅ **"Subscriptions 📺" added to `categorySuggestionService.ts`** — always included in AI-suggested budgets regardless of city; uses realistic fixed defaults ($85 solo, $110 for 2-3 people, $130 for 4+) since streaming costs are not location-dependent; "Entertainment" description updated to "Movies, events, hobbies (not streaming)" to prevent double-counting
- ✅ **Dedicated "Streaming & Subscriptions" step added to onboarding** — new Step 4 (of 5) inserted between "Household size" and "Categories":
  - Yes/No selector: "Do you have streaming services or subscriptions?"
  - If Yes: amount input pre-filled with $85 + quick-select presets (Basic $18, Standard $28, Full suite $85, Family bundle $120) + hint listing common service prices
  - If No: Subscriptions category is excluded from the generated budget entirely
  - User's chosen amount overrides the default and carries forward into the category selection step
- ✅ **Onboarding step count updated** — 4 steps → 5 steps; `OnboardingPage` step progress dots updated (4 → 5), Continue button updated to "Step 2 of 5"; `OnboardingFlow` progress bar labels updated to: Location → Currency → Household → Subscriptions → Categories
- ✅ **`handleSubscriptionsNext` function** — resolves city suggestions, applies subscription amount override, filters out Subscriptions if user opted out, advances to Categories step
- ✅ **Back navigation updated** — Categories step "Back" now returns to Subscriptions step (was Family Size)

---

### Session 155 — CloudFront Stale Chunk-Load Fix + ErrorBoundary Auto-Reload (2026-06-21)

**Root cause**: `hosting-stack.ts` had `errorResponses[404].ttl: Duration.minutes(5)`. After a deploy invalidates old Vite chunk hashes (e.g. `AccountsPage-aa75f312.js` no longer exists), CloudFront cached the `404 → index.html` redirect for 5 minutes. Subsequent requests for newly-named chunks also received the cached `index.html` response with `Content-Type: text/html`, which the browser rejects for JS module scripts — causing "Failed to fetch dynamically imported module" and the crash screen.

**Infrastructure fix (`hosting-stack.ts`):**
- ✅ **404/403 error response TTL set to 0** — was `Duration.minutes(5)`; now `Duration.seconds(0)` so 404s are never cached and every chunk request is evaluated fresh
- ✅ **New `/assets/*` cache behavior** — Vite content-hashed chunks (e.g. `AccountsPage-d2d8db62.js`) are now cached for 365 days (immutable); correct files load fast on repeat visits; missing/old hashes 404 cleanly without caching
- ✅ **`index.html` (default behavior) now uses no-cache policy** — was `CACHING_OPTIMIZED`; after every deploy users immediately get the latest entry-point with the correct chunk hashes, not a cached stale one
- ✅ **New `ImmutableAssets` and `NoCache` CloudFront cache policies** created as named CDK resources

**Frontend safety net (`ErrorBoundary.tsx`, `main.tsx`):**
- ✅ **`ErrorBoundary` detects chunk-load errors** — `isChunkLoadError()` checks for "Failed to fetch dynamically imported module" and similar patterns; shows "New version available — reloading…" spinner instead of crash screen, then auto-reloads once (60s cooldown via `sessionStorage` to prevent infinite loops)
- ✅ **`vite:preloadError` handler in `main.tsx`** — fires before React mounts; catches chunk-load errors at the Vite level and reloads silently, sharing the same `bb_chunk_reload_at` sessionStorage cooldown key
- ✅ **ErrorBoundary buttons updated to CSS tokens** — was hardcoded `bg-emerald-600`, `bg-gray-200 dark:bg-gray-700`; now uses `bg-[var(--color-primary)]`, `bg-[var(--color-muted)]`

---

### Session 156 — Production Readiness Audit (2026-06-21)

Comprehensive Playwright-driven audit of the live dev environment (`https://d1ueeugn9zcx7n.cloudfront.net`), testing all 15+ pages at desktop (1280×800) and mobile (375×812) viewports, all forms, modals, navigation flows, and data interactions.

**Auth Forms — Accessibility & UX fixes:**
- ✅ **`autocomplete` attributes added** — `LoginForm`: email=`"email"`, password=`"current-password"`; `RegisterForm`: firstName=`"given-name"`, lastName=`"family-name"`, email=`"email"`, password=`"new-password"` — eliminates browser warnings, required for password managers and accessibility
- ✅ **Submit buttons use design tokens** — was hardcoded `bg-blue-600 hover:bg-blue-700`; now `bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]` across both forms; disabled state uses `bg-[var(--color-muted)]`
- ✅ **Forgot Password UX** — full Cognito reset flow (Session 157): `POST /auth/forgot-password` sends code, `POST /auth/confirm-forgot-password` sets new password; 3-step inline UI in `LoginForm.tsx`
- ✅ **Dark mode label fix** — LoginForm labels had `dark:text-gray-300` hardcoded; replaced with `text-[var(--color-foreground)]`
- ✅ **AuthPage dark mode** — removed `dark:bg-gray-900` hardcoded class; uses `bg-[var(--color-background)]`
- ✅ **Copyright year** — updated `© 2025` → `© 2026`

**GoalFormPage — Accessibility & Design Token fixes:**
- ✅ **`htmlFor`/`id` added to all form fields** — Goal Name (`id="goal-name"`), Target Amount (`id="goal-target"`), Starting Amount (`id="goal-current"`), Target Date (`id="goal-date"`) — clicking labels now correctly focuses inputs
- ✅ **All inputs use design tokens** — added `bg-[var(--color-background)] text-[var(--color-foreground)]`; focus rings changed from `focus:ring-blue-500` to `focus:ring-[var(--color-primary)]`
- ✅ **Submit button** — was `bg-blue-600 hover:bg-blue-700`; now `bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]`; disabled uses `bg-[var(--color-muted)]`
- ✅ **Cancel button** — hover was `hover:bg-[var(--color-background)]`; now `hover:bg-[var(--color-muted)]`

**DebtFormPage — Accessibility & Design Token fixes:**
- ✅ **`htmlFor="debt-name"` + `id="debt-name"`** on debt name label/input
- ✅ **`htmlFor="debt-type"` + `id="debt-type"`** on debt type label/select
- ✅ **All inputs/selects use design tokens** — `bg-[var(--color-background)] text-[var(--color-foreground)]` added throughout
- ✅ **Focus rings** — all `focus:ring-blue-500 focus:border-transparent` → `focus:ring-[var(--color-primary)] focus:border-transparent`
- ✅ **Submit button** — was `bg-blue-600 hover:bg-blue-700`; now `bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]`

**Audit Findings — All Passing:**
- ✅ All 15 nav routes load correctly (Overview, Budget, Accounts, Goals, Insights, Bills, Subscriptions, Debt Payoff, Credit Score, Investments, Net Worth, Settings, Members, Pricing, Help)
- ✅ Month navigation (prev/next/today) works without data loss
- ✅ Add Transaction modal: opens from FAB, per-category row `+` button, Overview — 5 categories load, amount/date/description fields work, submit saves and closes
- ✅ Add Bill: all 6 fields work, budget category dropdown loads categories from current budget, recurring toggle + 5 frequency options work, cancel navigates back
- ✅ Quick Add Transaction from Overview: categories load correctly (5 options), submit saves
- ✅ Subscriptions → "Add manually" → correctly routes to `/bills/new?type=subscription`
- ✅ Auth flows: sign in/out/re-login all work; protected routes redirect to `/auth` when logged out
- ✅ Zero horizontal overflow on all 12 pages at 375px mobile viewport
- ✅ Mobile hamburger menu visible and functional
- ✅ 404 page shown correctly for non-existent routes
- ✅ Settings tabs (Profile/Budget/Notifications/Banks/Privacy/Help) all work
- ✅ Budget Members + Invite form (email input + role select) functional
- ✅ Investments, NetWorth, Insights, Debt Payoff, Credit Score all load with data
- ✅ Credit Score demo disclaimer prominently visible
- ✅ Keyboard shortcuts on Budget page functional (test env focus limitations noted)

**Remaining fixes after audit (2 additional commits):**
- ✅ **Design token sweep — 37 more files** — replaced all remaining `bg-blue-600`, `focus:ring-blue-500`, `bg-green-600 hover:bg-green-700`, `disabled:bg-gray-400` with CSS design token vars across pages and components (TipsFeedPage, SubscriptionsPage, SubscriptionFormPage, SettingsPage, NetWorthPage, LearnPage, and 31 more)
- ✅ **NetWorthPage "Add Liability" + "Save Liability" buttons** — were `bg-red-600 hover:bg-red-700`; now `bg-[var(--color-destructive)] hover:opacity-90`
- ✅ **RegisterForm Terms/Privacy links** — were `href="#"` placeholders; now properly link to `/terms` and `/privacy`
- ✅ **CI/CD `npm install` → `npm ci`** — replaced in all 5 workflow files; `npm ci` is deterministic, faster, and eliminates `EEXIST` cache race conditions on GitHub Actions runners that were causing intermittent deployment failures

---

### Session 157 — Budget Rollover Fix + Forgot Password + Receipt Scanning (2026-08-08)

**Budget Rollover Bug (Critical):**
- ✅ **Root cause identified and fixed** — `createBudgetWithRecurringItems`, `normalizeGroupsWithRollover`, `calculateTotalRollover`, `updateCategoryRollover`, and `resetCategoryRollover` in `budget/index.js` all iterated `groups.income/savings/expenses` as if they were arrays of group-wrapper objects `{ categories: [...] }`, but the actual storage format is a **flat array of category objects directly**. `group.categories` was always `undefined`, silently dropping all categories on rollover.
- ✅ **Fixed all 5 functions** to iterate flat arrays directly — `groups[groupType].map(category => ...)` instead of `groups[groupType].map(group => group.categories.map(...))`
- ✅ **Transactions cleared on rollover** — new month categories now have `transactions: []` and `spentAmount: 0`
- ✅ **Verified live** — September 2026 created from August: `Groceries $500`, `Transport $200`, `Housing $1500` correctly rolled over from prior month

**Forgot Password — Full Cognito Flow:**
- ✅ **Backend** — two new endpoints added to `auth/index.js`:
  - `POST /auth/forgot-password` — calls Cognito `ForgotPasswordCommand`; sends 6-digit code to user's email; always returns 200 to prevent email enumeration
  - `POST /auth/confirm-forgot-password` — calls Cognito `ConfirmForgotPasswordCommand`; validates code, sets new password; specific errors for expired code, wrong code, weak password
- ✅ **Frontend** — `LoginForm.tsx` replaced stub message with 3-step inline flow:
  - Step 1 (`email`): email input → sends code
  - Step 2 (`code`): 6-digit code + new password inputs → resets
  - Step 3 (`done`): success message with "Back to Sign In"
  - Error handling for all Cognito error codes; "Resend code" button on step 2
- ✅ **Imports** added: `ForgotPasswordCommand`, `ConfirmForgotPasswordCommand` from `@aws-sdk/client-cognito-identity-provider`

**Receipt Scanning — API URL Fix:**
- ✅ **`ReceiptUpload.tsx` was calling wrong API** — used `VITE_API_BASE_URL` (main API `q0zoob6728`) but receipt endpoints (`/receipt/upload`, `/receipt/process`) live on the Extended Features API (`hkjzroedjf`)
- ✅ **Fixed** to use `config.extendedFeaturesApiUrl` from `environment.ts`
- ✅ **Receipt scanning was already fully built** — Lambda + Textract + S3 presigned URL + CDK stack in `api-features-extended-stack.ts`; this was the only broken wire

**npm audit fix:**
- ✅ `@babel/core`, `brace-expansion`, `js-yaml` high severity CVEs resolved via `npm audit fix`; 2 moderate `aws-sdk@v2`/`uuid` remain (require breaking change, acceptable for dev)

---

## Known Gaps (⚠️ Planned)
1. ~~**Family budget transparency not enforced at category level**~~ ✅ **Fixed (Session 148)** — `createBudget` and `updateBudget` now reject any request containing categories with `hidden: true`, `isPrivate: true`, or `visibility: 'private'` when `budgetType === 'family'`. Returns HTTP 400.

2. **`canUseFeature()` not called in Lambda handlers** — the entitlement pattern is wired but Phase 1 intentionally leaves all features open. Phase 2 will add actual gating for `reports.advanced` and `budget.export`.

### Medium Priority
3. **Subscription as a DynamoDB entity** — currently `subscriptionTier` comes from the Cognito JWT claim. Phase 2 needs a `SUBSCRIPTION#<userId>/METADATA` record and a `SubscriptionGroup` entity for family subscription sharing.

4. **Invitation token lookup uses Scan** — `handleAcceptInvitation` scans the table for the hashed token. Works at current scale; needs a GSI on `tokenHash` for production scale.

5. **`shared` budget type has no distinct behavioral rules** — `shared` is accepted and stored but behaves identically to `family` except for the partner limit. The vision specifies shared budgets should only contain shared expenses (no income, no personal debt). This is a product enforcement question, not a data model issue.

6. **SES still in sandbox mode** — can only send to verified addresses. Verified: `dmytro.malyk@gmail.com`, `dima.pmp@gmail.com`, `info@hitechparadigm.com`, `t1@taxprocanada.ca`, `dmalyk@taxprocanada.ca`. Request SES production access to send to any address.

### Low Priority
7. ~~**Dark mode missing on BudgetPage, SettingsPage, GoalsPage**~~ ✅ **Fixed (Session 148)** — all three pages migrated to CSS design token classes. ~~**Dark mode remaining hardcoded colors across 81 files**~~ ✅ **Fixed (Session 153)** — systematic replacement of all hardcoded `bg-white/gray-*`, `text-gray-*`, `border-gray-*` with CSS token vars across all 27 page files and 54 component files.
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

## Live API Test Results (2026-06-19 — Session 150 New Endpoints)

New endpoints added during web app polish, verified live:

| Endpoint | API | Status |
|----------|-----|--------|
| `GET /budget/health-score` | Main API (`q0zoob6728`) | ✅ Returns score, components, interpretation, delta |
| `GET /budget/cash-flow` | Main API (`q0zoob6728`) | ✅ Returns balance forecast + 30-day timeline |
| `GET /rules` | Extended API (`hkjzroedjf`) | ✅ Returns rules array |
| `POST /rules` | Extended API (`hkjzroedjf`) | ✅ Wired from PendingTransactions prompt |
| `GET /net-worth/allocation` | Extended API (`hkjzroedjf`) | ✅ 200 OK |

**Playwright browser test results** — see "Playwright Frontend Test Results" section below.

## Playwright Frontend Test Results (2026-06-19 — Session 150 Post-Polish Verification)

Full re-test of the live dev environment at `https://d1ueeugn9zcx7n.cloudfront.net` after completing all 18 web app polish criteria.

### ✅ All Pages Verified — 0 Console Errors

| Page | Route | Status | Key Verification |
|------|-------|--------|-----------------|
| Landing page | `/` | ✅ | New headline "Your budget, built in 60 seconds." confirmed |
| Auth → Overview redirect | `/auth` → `/overview` | ✅ | Login now redirects to `/overview` (was `/budget`) |
| Overview dashboard | `/overview` | ✅ | 11 cards, real data loaded (44% income spent, $5,000 income), 0 skeletons |
| Overview — Budget Health Score | `/overview` | ✅ | SVG ring renders, API returns score=50, interpretation="Fair", delta=0 |
| Overview — Cash Flow Forecast | `/overview` | ✅ | End-of-month balance card, 12-day timeline returned |
| Overview — AI insight | `/overview` | ✅ | "You spent $0.00..." insight rendered from weekly API |
| Overview — Welcome tooltip | `/overview` | ✅ | 3-step dialog renders on first visit, dismisses on "Skip tour" |
| Budget page | `/budget` | ✅ | Income/Savings/Expenses groups, 0 errors |
| Budget — mobile slide-over | `/budget` (375px) | ✅ | Floating "Transactions" button present at 375px |
| Budget — mobile banner | `/budget` (375px) | ✅ | "Get the BudgetBuddy app" sticky banner present |
| Goals page | `/goals` | ✅ | SVG progress rings (10 circles = 5 goals × track+ring), 0 errors |
| Insights page | `/insights` | ✅ | "Ask Your AI Coach" heading; recharts: 4 wrappers, 2 line series |
| Debt Payoff page | `/debts` | ✅ | Extra payment range slider present, 0 errors |
| Pricing page | `/pricing` | ✅ | Free/Premium comparison, MOST POPULAR badge, FAQ section |
| Settings | `/settings` | ✅ | 6 tabs, Auto-Categorization Rules section present |
| Onboarding | `/onboarding` | ✅ | 4-step indicator, "Who are you budgeting for?" heading, inline descriptions |
| Net Worth | `/net-worth` | ✅ | 0 errors on direct navigation |
| Credit Score | `/credit-score` | ✅ | 0 errors on direct navigation |
| **11 routes batch test** | all | ✅ | 0 `[role="alert"]` errors across all routes |

### ✅ New API Endpoints Verified Live

| Endpoint | Result |
|----------|--------|
| `GET /budget/health-score?month=2026-06` | `{ success: true, data: { score: 50, interpretation: "Fair", delta: 0, components: { savingsRate: 0, adherence: 100, goalProgress: 50 } } }` |
| `GET /budget/cash-flow?month=2026-06` | `{ success: true, data: { estimatedEndBalance: 0, daysRemaining: 11, timeline: [...12 days] } }` |
| `GET /rules` (extended API) | `{ success: true, data: { rules: [] } }` — no rules created yet, schema correct |
| `GET /net-worth/allocation` | `{ success: true }` — 200 OK |

### ✅ Responsive Tests (375px viewport)

| Feature | Status |
|---------|--------|
| Mobile banner `<768px` | ✅ |
| Floating "Transactions" button (budget slide-over) | ✅ |
| Mobile header hamburger | ✅ |

### Known Non-Issues (not bugs)

| Item | Reason |
|------|--------|
| Google OAuth 403 errors | Dev CloudFront URL not in Google's allowed origins — expected in dev environment |
| Old-chunk CORS errors | Stale Playwright browser cache from previous test session — 0 errors on fresh navigation |

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

### 🐛 Remaining Known Bugs (2 low priority, rest fixed)

| # | Severity | Component | Description |
|---|----------|-----------|-------------|
| 1 | Low | `POST /plaid/sandbox/create-item` | 500 — Plaid sandbox credentials not configured in dev environment |
| 2 | Low | `POST /transactions` create | Test skips: `categoryId` must be fetched from `GET /budget/current`, not `GET /budget` (which returns a list) |
| 3 | ✅ Fixed (2026-06-21) | `POST /net-worth/assets` + `/liabilities` | Was 500 — `generateId("asset")` → `generateId.custom("asset")` |
| 4 | ✅ Fixed (2026-06-21) | Bills category dropdown | `GET /budget/current` required `?month=YYYY-MM`; was returning 400 silently → empty dropdown |
| 5 | ✅ Fixed (2026-06-21) | Budget page silent 401 | JWT expiry caused silent empty page. Now: token refresh attempt → redirect to `/auth?returnTo=` if refresh fails |
| 6 | ✅ Fixed (2026-06-21) | Invitation resend "Invalid Invitation" | `handleResendInvitation` kept old `expiresAt`; resend now resets to 7 days from now + writes both `token`/`tokenHash` fields |
| 7 | ✅ Fixed (2026-08-08) | Budget month rollover | `createBudgetWithRecurringItems` iterated flat category arrays as nested group objects → `group.categories` was always `undefined` → all categories dropped on rollover. Fixed 5 functions. |
| 8 | ✅ Fixed (2026-08-08) | Forgot Password | Was a stub message. Now full Cognito `ForgotPassword`/`ConfirmForgotPassword` flow with 3-step inline UI. |
| 9 | ✅ Fixed (2026-08-08) | Receipt Scanning | `ReceiptUpload.tsx` called main API; receipt endpoints are on Extended Features API. Fixed to `config.extendedFeaturesApiUrl`. |

### Not Deployed (frontend components exist, no backend Lambda)

| Feature | Status |
|---------|--------|
| Investment tracking (`/investments/*`) | ✅ **Now deployed** — added to `api-features-stack`, endpoints live on features API (`0poeu07vth`) |

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
| Budget type selection | `OnboardingPage.tsx` — 5-step total, inline descriptions, no disclosure modal | `POST /auth/onboarding` | ✅ |
| Location + currency + household | `OnboardingFlow.tsx` Steps 2-4 | `GET /auth/geolocation` | ✅ |
| Subscriptions step | `OnboardingFlow.tsx` Step 4 — Yes/No + amount input, quick presets; carries into Subscriptions category | — | ✅ |
| AI budget generation | `AIBudgetGenerationPage.tsx` — 5-step progress animation | `POST /budget/ai-generate` (real Bedrock call) | ✅ |
| Welcome tour | `WelcomeTooltipChain.tsx` — 3-step spotlight on `/overview` | — | ✅ |

**Completed since Session 149**: AI generation mock replaced with real Bedrock call; onboarding redesigned with 5-step flow (was 4); Subscriptions step added; navigates to `/overview` (was `/budget`); welcome tooltip chain added

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
| Quick Add Transaction | `QuickAddTransactionModal.tsx` — loads categories from budget API, handles object-format groups response; available from Overview and all pages | `GET /budget/current` | ✅ |
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
| Transaction list + search | `TransactionList.tsx`, `TransactionFilters.tsx` | `GET /transactions` | ✅ |
| Month navigation | Month nav arrows in `BudgetPage.tsx` — timezone-safe local date formatting | — | ✅ |
| Session expiry UX | Session-expired banner in `BudgetPage.tsx` — shown instead of silent blank/redirect when token refresh fails | — | ✅ |
| Budget month rollover | `createBudgetWithRecurringItems` in `budget/index.js` — copies all non-one-time categories from previous month; resets spentAmount/transactions; recalculates biweekly/weekly amounts for new month | `GET /budget/current` (auto-triggers) | ✅ |
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

### 3b. Bills & Subscriptions Workflow

**Goal**: Track recurring bills and subscriptions, link them to budget categories, mark paid automatically updates budget.

**How it works:**
- Bills and subscriptions are the same entity (recurring bills). Subscriptions are detected via AI scan; bills are added manually.
- When a bill is linked to a budget category and marked paid → a transaction is auto-created in that category → budget `spentAmount` updates.
- "Add subscription manually" → Bills form with `?type=subscription` param → saves as recurring bill → returns to Subscriptions page.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Bills list — design tokens, budget link visible | `BillsPage.tsx` (redesigned) | `GET /bills` | ✅ |
| Add/edit bill with category | `BillFormPage.tsx` (redesigned) — fallback option shows saved category even if not in current budget; categories now load correctly from object-format groups response | `POST/PUT /bills` | ✅ |
| Bill category → budget transaction on payment | `BillsPage.tsx` | `POST /bills/{id}/pay` | ✅ |
| Add subscription manually | `SubscriptionsPage.tsx` → `/bills/new?type=subscription` | `POST /bills` | ✅ |
| AI subscription detection | `SubscriptionsPage.tsx` | `POST /subscriptions/detect` | ✅ |
| Delete subscription confirmation modal | `SubscriptionsPage.tsx` | `DELETE /subscriptions/{id}` | ✅ |

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
| Receipt scanning | `ReceiptUpload.tsx` — drag/drop or file picker, presigned S3 upload, Textract OCR, pre-fills transaction modal; uses `config.extendedFeaturesApiUrl` (fixed Session 157) | `POST /receipt/upload`, `POST /receipt/process` | ✅ |
| Credit score | `CreditScorePage.tsx` | `GET /credit-score` | ✅ |
| Investment tracking | `InvestmentsPage.tsx` | `GET /investments/portfolio` | ✅ Deployed to features API |
| Investment market news | `InvestmentsPage.tsx` — news feed with sentiment | `GET /investments/news` (Alpha Vantage) | ✅ |
| Investment market signals | `InvestmentsPage.tsx` — gainers/losers/active | `GET /investments/signals` (Alpha Vantage) | ✅ |

---

### 6. Debt & Savings Goals

**Goal**: Create payoff plans and track savings goals with milestone celebrations.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Goals card grid | `GoalsPage.tsx` — SVG progress rings, drag-and-drop reorder, "Add Funds" on card | `GET /goals` | ✅ |
| Create / edit / delete goal | `GoalFormPage.tsx` — `htmlFor`/`id` on all fields, design token inputs + button | `POST/PUT/DELETE /goals` | ✅ |
| Debt payoff calculator | `DebtPayoffPage.tsx` — strategy selector, extra payment slider | `GET /debts/payoff-plan` | ✅ |
| Debt payoff timeline | `DebtPayoffPage.tsx` — horizontal timeline, color-coded by type, payment modal | `GET /debts/summary` | ✅ |
| Add / edit debt | `DebtFormPage.tsx` — `htmlFor`/`id` on name+type, design token focus rings + inputs + submit button | `POST/PUT /debts` | ✅ |
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
| Dark mode | `ThemeContext.tsx` — full systematic token coverage across all 81 page + component files (Session 153) | — | ✅ |
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
