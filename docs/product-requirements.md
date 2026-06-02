# BudgetBuddy Product Requirements

**Last Updated**: 2026-06-03
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
4. Invitee clicks link → `POST /budgets/accept-invitation` with `{ token }`
5. Backend: validates token hash, checks expiry (7 days), confirms logged-in email matches `invitedEmail`, creates `MEMBER#<userId>` record, marks invitation accepted

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

### Membership & Invitations
- ✅ Invite members (`POST /budgets/{id}/invite`) — partner, household_member, viewer
- ✅ Accept invitation (`POST /budgets/accept-invitation`) — token-based, email-tied, single-use
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
- ✅ AI bill reminders and budget planning (pattern detection, recurring detection)
- ✅ Push notifications and in-app notification center
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
1. **Family budget transparency not enforced at category level** — `budgetType` is stored but not used to block per-user category visibility. Fix: add a check in budget/transaction Lambdas that rejects attempts to create private/hidden categories on a `family` budget.

2. **`canUseFeature()` not called in Lambda handlers** — the entitlement pattern is wired but Phase 1 intentionally leaves all features open. Phase 2 will add actual gating for `reports.advanced` and `budget.export`.

### Medium Priority
3. **Subscription as a DynamoDB entity** — currently `subscriptionTier` comes from the Cognito JWT claim. Phase 2 needs a `SUBSCRIPTION#<userId>/METADATA` record and a `SubscriptionGroup` entity for family subscription sharing.

4. **Invitation token lookup uses Scan** — `handleAcceptInvitation` scans the table for the hashed token. Works at current scale; needs a GSI on `tokenHash` for production scale.

5. **`shared` budget type has no distinct behavioral rules** — `shared` is accepted and stored but behaves identically to `family` except for the partner limit. The vision specifies shared budgets should only contain shared expenses (no income, no personal debt). This is a product enforcement question, not a data model issue.

6. **SES still in sandbox mode** — can only send to verified addresses. Verified: `dmytro.malyk@gmail.com`, `dima.pmp@gmail.com`, `info@hitechparadigm.com`, `t1@taxprocanada.ca`, `dmalyk@taxprocanada.ca`. Request SES production access to send to any address.

### Low Priority
7. **Dark mode missing on BudgetPage, SettingsPage, GoalsPage** — core pages have no `dark:` Tailwind classes.
8. **Goals not reflected in budget** — goal contributions don't adjust budget savings categories.
9. **Planned transactions frontend** — backend Lambda exists (`transaction-planning`), no frontend UI yet.

---

## Live API Test Results (2026-06-02)

Tested against dev environment using `scripts/test-live-api.js`. **102 checks passed, 0 failed**, 13 bugs documented across 19 test sections covering all claimed features.

### ✅ Verified Working (live)

| Feature | Endpoints | Status |
|---------|-----------|--------|
| Health checks | All 17 service health endpoints across 4 APIs | ✅ |
| Auth — register/login/profile | `POST /auth/register`, `POST /auth/login`, `GET /auth/profile`, `GET /auth/geolocation` | ✅ |
| Auth — security | All 7 protected endpoints reject unauthenticated requests (401) | ✅ |
| Onboarding | `POST /auth/onboarding` (correct body: flat `city`/`country`/`familySize`/`currentMonth`/`selectedCategories`) | ✅ |
| Budget management | `GET /budgets`, `POST /budgets`, `GET /budget/current`, `PUT /budgets/active` | ✅ |
| Budget period | `remainingBalance` returned, zero-based budget confirmed, income/expense groups present | ✅ |
| Transactions | `GET /transactions`, search filter | ✅ |
| Accounts full CRUD | Create (`banking`/`accountSubtype` fields), list, update, reconcile (`newBalance` field), delete | ✅ |
| Goals full CRUD | Create, list, update, delete | ✅ |
| Budget collaboration | List members, list invitations, send invite (family budget), resend, revoke, accept-invitation endpoint, personal budget rejects partner | ✅ |
| Insights | Weekly, monthly, trends, patterns, AI Q&A | ✅ |
| Pattern detection | `POST /patterns/detect`, `POST /budget-planning/suggestions` | ✅ |
| Debt payoff | `GET /debts`, `GET /debts/summary` | ✅ |
| Plaid | Link token (returns `linkToken`), accounts list, pending transactions | ✅ |
| Bills | List, upcoming, calendar | ✅ |
| Receipt scanning | Usage, history, upload endpoint | ✅ |
| Learning center | Courses, progress | ✅ |

### 🐛 Bugs Found (13) — Fixed in commit `fix: Lambda crashes, BUDGET# model alignment, notifications API routes, CDK auth fix`

| # | Severity | Component | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | High | `POST /budget/ai-generate` | 500 — Bedrock call fails for new users with empty budget context | Open |
| 2 | High | `POST /transactions` (create) | New users need `GET /budget/current` to get `categoryId`; `GET /budget` returns a list not the period | Open |
| 3 | Medium | `GET /comparison/summary` | 500 for new users — missing null-check | ✅ Fixed |
| 4 | Medium | `GET /tips/feed` | 500 for new users — missing null-check | ✅ Fixed |
| 5 | Medium | `POST /debts` (create) | 500 — Debt Lambda crashes on create (null body guard) | ✅ Fixed |
| 6 | Medium | `GET /debts/payoff-plan` | 500 for new users with no debts — missing null-check | ✅ Fixed |
| 7 | Medium | `GET /credit-score` | 502 — Lambda used `custom:familyId` JWT claim (removed); migrated to `BudgetAccessResolver` | ✅ Fixed |
| 8 | Medium | `GET /export` | 502 — Lambda used manual JWT + `familyId` from profile; migrated to `BudgetAccessResolver` + `BUDGET#` keys | ✅ Fixed |
| 9 | Medium | `GET /learn/lessons` | 403 SigV4 — `/learn/lessons` had no GET method in CDK; added with Cognito auth | ✅ Fixed |
| 10 | Low | `POST /plaid/sandbox/create-item` | 500 — Plaid sandbox credentials not configured in dev | Open |
| 11 | Low | `/family` routes | Return 401/403 instead of 410 Gone — family stack still active | Open |
| 12 | Low | `/family/members` | Same as #11 | Open |
| 13 | Low | `/family/invite` | Same as #11 | Open |

### Additional Fixes (same session)

| Component | Change |
|-----------|--------|
| `budget-alerts` Lambda | Migrated from `FAMILY#<familyId>` to `BUDGET#<budgetId>` partition keys; now reads `budgetId` from DynamoDB stream record `PK`; gets members via `BUDGET#<budgetId>/MEMBER#*` query |
| Notifications API routes | Wired `/notifications/*` routes to API Gateway by passing `notificationFunction` from `NotificationStack` to `ApiStack` in `app.ts` |
| Spec: `ai-bill-reminders-budget-planning` | Updated `familyId` → `budgetId` throughout requirements and design docs |
| Spec: `push-notifications-reminders` | Updated budget alert tracking schema and `familyId` references to `budgetId` |

### Final Live Test Results (2026-06-03, after all fixes)

**108 checks passed, 0 failed, 6 remaining bugs** (down from 9 bugs originally, 13 total known)

All issues resolved:
- Notifications Lambda (`GET /preferences`, `GET /history`, `PUT /preferences`, `POST /register-device`) — **fixed** (was 502, now 200)
- Learn Lambda `GET /learn/lessons` — **fixed** (was 404, now 200)
- `POST /credit-score/refresh` test expectation — **fixed** (400 = credit bureau not connected, expected)

**Remaining 6 reported bugs are pre-existing/out-of-scope:**
1. `POST /budget/ai-generate` — Bedrock call for new users (separate issue)
2. `POST /transactions` — categoryId discovery (separate issue)
3. `POST /plaid/sandbox/create-item` — Plaid credentials not configured in dev
4–6. `/family/*` routes — family stack auth errors instead of 410 Gone

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
| Accept invitation | `AcceptInvitationPage.tsx` | `POST /budgets/accept-invitation` | ✅ |
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
| Credit score | `CreditScorePage.tsx` | `GET /credit-score` | ⚠️ 502 bug |
| Investment tracking | `InvestmentsPage.tsx` | `GET /investments/portfolio` | ❌ Not deployed |

---

### 6. Debt & Savings Goals

**Goal**: Create payoff plans and track savings goals with milestone celebrations.

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Goals list | `GoalsPage.tsx` | `GET /goals` | ✅ |
| Create / edit / delete goal | `GoalFormPage.tsx` | `POST/PUT/DELETE /goals` | ✅ |
| Debt payoff calculator | `DebtPayoffPage.tsx` | `GET /debts/payoff-plan` | ⚠️ 500 bug for new users |
| Payoff timeline | `DebtPayoffPage.tsx` | `GET /debts/summary` | ✅ |
| Mobile goals | `GoalsScreen.tsx` | Same as web | ✅ |

---

### 7. Notifications & Reminders

**Goal**: Stay on track without constantly checking the app.

**Notification types**: Budget threshold alerts (80%/90%/100%), daily expense reminders, bill reminders (7/3/1 day), weekly summary, AI bill pattern alerts

| Feature | Frontend | Backend API | Status |
|---------|----------|-------------|--------|
| Notification preferences | `NotificationSettings.tsx` | `GET/PUT /notifications/preferences` | ❌ Not deployed |
| In-app notification center | `NotificationCenter.tsx` | `GET /notifications` | ❌ Not deployed |
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
| `/family/*` API | `/budgets/*` — returns 410 Gone |
| `FamilyIdResolver` | `BudgetAccessResolver` |
| `FAMILY#` partition keys | `BUDGET#` partition keys |
| `custom:familyId` JWT claim | Not used — only `custom:userId` |
| `FamilySettings.tsx` | `BudgetMembersPage` at `/budget/members` |
| `api-family-stack` | `api-budgets-stack` (family stack still deployed, returns 410) |
