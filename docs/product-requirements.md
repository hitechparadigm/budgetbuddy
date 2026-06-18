# BudgetBuddy Product Requirements

**Last Updated**: 2026-06-18 (Session 148 — dark mode on BudgetPage/SettingsPage/GoalsPage; CalendarView currency locale fix; family budget transparency enforcement; goal contributions linked to budget savings categories)
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
| Insights AI Q&A | Not fully tested — `Ask About Your Spending` panel expand |
| Investments page | Frontend exists, no backend Lambda deployed |
| Budget Members — full invite flow | Invite → email → accept via link — not end-to-end tested |
| Mobile app (React Native) | Zero E2E coverage |
| Currency display in Calendar | Fixed (Session 148) — `CalendarView` now uses currency-specific locale (`en-CA` for CAD) |

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
| Net worth (`/net-worth`) | ❌ No Lambda on any API gateway |

---

## User Journeys

### 1. New User Onboarding

**Goal**: Set up a budget with AI assistance in under 5 minutes.

**Steps**: Landing → Register (email or Google) → Location + currency → Household type + size → AI budget generation → First transaction tutorial

| Step | Frontend | Backend API | Status |
|------|----------|-------------|--------|
| Register | `AuthPage.tsx` | `POST /auth/register` | ✅ |
| Google Sign-In | `GoogleSignInButton.tsx` | `POST /auth/google` | ✅ |
| Location setup | `OnboardingFlow.tsx` | `GET /auth/geolocation` | ✅ |
| AI budget generation | `AIBudgetGenerationPage.tsx` | `POST /budget/ai-generate` | ✅ |
| Budget type selection | `OnboardingPage.tsx` | `POST /auth/onboarding` | ✅ |

**Missing**: `OnboardingProgress.tsx` (step indicator), `TutorialOverlay.tsx` (interactive guide)

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
| Sync | `ConnectedAccounts.tsx` | `POST /plaid/sync` | ✅ |
| Unlink | `ConnectedAccounts.tsx` | `DELETE /plaid/accounts/{id}` | ✅ |

**Missing**: `CategoryMappingModal.tsx` (assign categories before approval)

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
| AI Q&A | `InsightsPage.tsx` | `POST /insights/ask` | ✅ |
| Spending trends | `InsightsPage.tsx` | `GET /insights/trends` | ✅ |
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
| Goals list | `GoalsPage.tsx` | `GET /goals` | ✅ |
| Create / edit / delete goal | `GoalFormPage.tsx` | `POST/PUT/DELETE /goals` | ✅ |
| Debt payoff calculator | `DebtPayoffPage.tsx` | `GET /debts/payoff-plan` | ✅ |
| Payoff timeline | `DebtPayoffPage.tsx` | `GET /debts/summary` | ✅ |
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
| Profile settings | `SettingsPage.tsx` | `GET/PUT /auth/profile` | ✅ |
| Budget members | Links to `BudgetMembersPage.tsx` | — | ✅ |
| Notification settings | `NotificationSettings.tsx` | — | ✅ |
| Delete account | `DeleteAccountModal.tsx` | `DELETE /auth/account` | ✅ |
| Dark mode | `ThemeContext.tsx` | — | ✅ |

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
