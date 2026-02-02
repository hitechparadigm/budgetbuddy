# BudgetBuddy User Journeys & Component Mapping

**Last Updated**: 2026-02-01
**Purpose**: Comprehensive mapping of user journeys to frontend/backend components
**Status**: Living Document - Update as features are implemented

## Table of Contents

1. [New User Onboarding Journey](#1-new-user-onboarding-journey)
2. [Daily Budget Management Journey](#2-daily-budget-management-journey)
3. [Bank Account Connection Journey](#3-bank-account-connection-journey)
4. [Family Collaboration Journey](#4-family-collaboration-journey)
5. [Financial Insights Journey](#5-financial-insights-journey)
6. [Debt & Savings Goals Journey](#6-debt--savings-goals-journey)
7. [Notifications & Reminders Journey](#7-notifications--reminders-journey)
8. [Settings & Preferences Journey](#8-settings--preferences-journey)
9. [Component Gap Analysis](#9-component-gap-analysis)
10. [UI/UX Best Practices Applied](#10-uiux-best-practices-applied)
11. [Requirements-to-Tasks Reconciliation](#11-requirements-to-tasks-reconciliation)
12. [UI/UX Implementation Checklist](#12-uiux-implementation-checklist)
13. [Implementation Priority Matrix](#13-implementation-priority-matrix)

---

## 1. New User Onboarding Journey

### User Story

_"As a new user, I want to quickly set up my budget with AI assistance so I can start tracking my finances immediately."_

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Landing & Registration                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  User arrives → Sees value proposition → Chooses sign-up method              │
│                                                                              │
│  Options: Email/Password | Google Sign-In                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Location & Currency Setup                                           │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Auto-detect location → Confirm country/city → Select currency               │
│                                                                              │
│  Currencies: USD | EUR | GBP | CAD | AUD | JPY                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Family Size & Profile                                               │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Select household type → Enter family size → Set income bracket              │
│                                                                              │
│  Types: Single | Couple | Family with Kids                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: AI Budget Generation                                                │
│  ─────────────────────────────────────────────────────────────────────────── │
│  AI analyzes location + family → Generates personalized budget               │
│  Shows cost-of-living estimates → User reviews & customizes                  │
│                                                                              │
│  348 cities supported with local expense data                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: First Transaction Tutorial                                          │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Interactive guide → Add first transaction → See budget update               │
│                                                                              │
│  Goal: Complete in < 5 minutes, 80% completion rate                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Step | Frontend Component               | Backend API                 | Status      |
| ---- | -------------------------------- | --------------------------- | ----------- |
| 1a   | `AuthPage.tsx`                   | `POST /auth/register`       | ✅ Complete |
| 1b   | `GoogleSignInButton.tsx`         | `POST /auth/google`         | ✅ Complete |
| 2a   | `OnboardingFlow.tsx`             | `GET /auth/detect-location` | ✅ Complete |
| 2b   | `CurrencySelector.tsx`           | `PUT /auth/profile`         | ✅ Complete |
| 3    | `OnboardingFlow.tsx`             | `PUT /auth/profile`         | ✅ Complete |
| 4    | `AIBudgetGenerationPage.tsx`     | `POST /ai/generate-budget`  | ✅ Complete |
| 5    | `BudgetPage.tsx` (tutorial mode) | N/A                         | ⚠️ Partial  |

### UI/UX Requirements

- **Progress indicator**: Show steps 1-5 with current position
- **Skip option**: Allow experienced users to skip tutorial
- **Back navigation**: Enable returning to previous steps
- **Auto-save**: Save progress at each step
- **Mobile-first**: Touch-friendly inputs, large buttons
- **Accessibility**: ARIA labels, keyboard navigation, 4.5:1 contrast

### Missing Components

| Component                | Priority | Description                 |
| ------------------------ | -------- | --------------------------- |
| `OnboardingProgress.tsx` | HIGH     | Visual step indicator       |
| `TutorialOverlay.tsx`    | MEDIUM   | Interactive first-use guide |
| `WelcomeModal.tsx`       | LOW      | Post-onboarding celebration |

---

## 2. Daily Budget Management Journey

### User Story

_"As a user, I want to quickly add transactions and see my budget status so I can stay on track with my spending."_

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ENTRY POINTS                                                                │
│  ─────────────────────────────────────────────────────────────────────────── │
│  • Open app → See current month budget                                       │
│  • Push notification → Deep link to specific category                        │
│  • Widget tap → Quick add transaction                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  MAIN DASHBOARD (3-Column Layout)                                            │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌──────────┐  ┌────────────────────────┐  ┌──────────────────┐             │
│  │ Sidebar  │  │   Budget Categories    │  │  Transactions/   │             │
│  │          │  │                        │  │  Summary Panel   │             │
│  │ • Budget │  │  Income    $X,XXX      │  │                  │             │
│  │ • Accounts│  │  Savings   $X,XXX     │  │  [Tab: Summary]  │             │
│  │ • Goals  │  │  Expenses  $X,XXX      │  │  [Tab: Txns]     │             │
│  │ • Insights│  │                        │  │                  │             │
│  │ • Settings│  │  ← Month Navigation → │  │  [Connect Bank]  │             │
│  └──────────┘  └────────────────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADD TRANSACTION (FAB → Modal)                                               │
│  ─────────────────────────────────────────────────────────────────────────── │
│  1. Tap FAB (+) → Choose Income/Expense                                      │
│  2. Select category → Enter amount → Add description                         │
│  3. Set date → Validate month match → Save                                   │
│                                                                              │
│  Goal: Complete in < 30 seconds                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  FEEDBACK & UPDATES                                                          │
│  ─────────────────────────────────────────────────────────────────────────── │
│  • Category spent amount updates instantly                                   │
│  • Progress bar animates                                                     │
│  • Overspent categories highlight red                                        │
│  • Success toast confirms save                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Feature            | Frontend Component        | Backend API                 | Status          |
| ------------------ | ------------------------- | --------------------------- | --------------- |
| Dashboard          | `BudgetPage.tsx`          | `GET /budget?month=YYYY-MM` | ✅ Complete     |
| Sidebar Nav        | `BudgetPage.tsx` (inline) | N/A                         | ✅ Complete     |
| Month Nav          | `MonthNavigator.tsx`      | N/A                         | ✅ Complete     |
| Category List      | `BudgetPage.tsx` (inline) | `GET /budget`               | ✅ Complete     |
| Add Transaction    | `TransactionForm.tsx`     | `POST /transactions`        | ✅ Complete     |
| Edit Transaction   | `TransactionForm.tsx`     | `PUT /transactions/{id}`    | ✅ Complete     |
| Delete Transaction | `TransactionList.tsx`     | `DELETE /transactions/{id}` | ✅ Complete     |
| Summary View       | `SummaryModal.tsx`        | `GET /budget`               | ✅ Complete     |
| Transaction List   | `TransactionList.tsx`     | `GET /transactions`         | ✅ Complete     |
| Search/Filter      | ❌ Missing                | `GET /transactions?search=` | ⚠️ Backend only |
| Quick Actions      | ❌ Missing                | N/A                         | ❌ Not started  |

### UI/UX Requirements

- **Instant feedback**: Optimistic UI updates before API confirms
- **Error recovery**: Rollback on API failure with retry option
- **Keyboard shortcuts**: `N` for new transaction, `E` for edit
- **Swipe gestures**: Swipe left to delete (mobile)
- **Pull to refresh**: Update budget data (mobile)
- **Skeleton loading**: Show placeholders while loading

### Missing Components

| Component                    | Priority | Description                   |
| ---------------------------- | -------- | ----------------------------- |
| `TransactionSearch.tsx`      | HIGH     | Search bar with filters       |
| `QuickAddWidget.tsx`         | HIGH     | Recent transactions quick-add |
| `CategoryDetailModal.tsx`    | MEDIUM   | Drill-down into category      |
| `BulkTransactionActions.tsx` | LOW      | Multi-select operations       |

---

## 3. Bank Account Connection Journey

### User Story

_"As a user, I want to connect my bank accounts so transactions are imported automatically without manual entry."_

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Navigate to Accounts                                                │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Sidebar → Accounts | Settings → Bank Accounts | "Connect Bank" card         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Accounts Page                                                       │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🏦 Connected Bank Accounts                                          │    │
│  │  ─────────────────────────────────────────────────────────────────── │    │
│  │  [🧪 Create Test Account]  [🔄 Sync All]                             │    │
│  │                                                                      │    │
│  │  No accounts connected yet                                           │    │
│  │  Click "Create Test Account" to add a sandbox bank for testing       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Connect Account (Plaid Link)                                        │
│  ─────────────────────────────────────────────────────────────────────────── │
│  • Sandbox: Click "Create Test Account" → Auto-creates Chase test account    │
│  • Production: Click "Connect Bank" → Plaid Link modal → Select bank         │
│    → Enter credentials → Select accounts → Authorize                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: View Connected Accounts                                             │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🏦 Chase Bank                                                       │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │  💳 Checking ••••1234        $5,432.10    Last sync: 2 min ago       │    │
│  │  💳 Credit Card ••••5678     -$1,234.56   Last sync: 2 min ago       │    │
│  │                                                    [Unlink]          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: Review Pending Transactions                                         │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  📥 Pending Transactions (12)                                        │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │  [Select All]  [✓ Approve (3)]  [✗ Reject (3)]                       │    │
│  │                                                                      │    │
│  │  ☑ Jan 28  Starbucks         Coffee        -$5.75                   │    │
│  │  ☑ Jan 28  Amazon            Shopping      -$45.99                  │    │
│  │  ☐ Jan 27  Costco            Groceries     -$156.32                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Feature                 | Frontend Component | Backend API                       | Status           |
| ----------------------- | ------------------ | --------------------------------- | ---------------- |
| Accounts Page           | `AccountsPage.tsx` | N/A                               | ✅ Complete      |
| Bank Accounts UI        | `BankAccounts.tsx` | Multiple                          | ✅ Complete      |
| Plaid API Service       | `plaidApi.ts`      | N/A                               | ✅ Complete      |
| Create Test Account     | `BankAccounts.tsx` | `POST /plaid/sandbox/create-item` | ✅ Complete      |
| List Accounts           | `BankAccounts.tsx` | `GET /plaid/accounts`             | ✅ Complete      |
| Sync Accounts           | `BankAccounts.tsx` | `POST /plaid/sync`                | ✅ Complete      |
| Pending Transactions    | `BankAccounts.tsx` | `GET /plaid/pending`              | ✅ Complete      |
| Approve Transactions    | `BankAccounts.tsx` | `POST /plaid/pending/approve`     | ✅ Complete      |
| Reject Transactions     | `BankAccounts.tsx` | `POST /plaid/pending/reject`      | ✅ Complete      |
| Unlink Account          | `BankAccounts.tsx` | `DELETE /plaid/accounts/{id}`     | ✅ Complete      |
| Plaid Link (Production) | ❌ Missing         | `POST /plaid/link-token`          | ⚠️ Backend ready |

### UI/UX Requirements

- **Security messaging**: Explain Plaid security, bank-level encryption
- **Progress feedback**: Show sync progress with spinner
- **Error handling**: Clear messages for connection failures
- **Batch operations**: Select multiple transactions to approve/reject
- **Category suggestions**: AI-suggested categories for pending transactions
- **Undo option**: Allow undoing approve/reject within 5 seconds

### Missing Components

| Component                   | Priority | Description                       |
| --------------------------- | -------- | --------------------------------- |
| `PlaidLinkButton.tsx`       | HIGH     | Production Plaid Link integration |
| `CategoryMappingModal.tsx`  | HIGH     | Assign categories before approval |
| `SyncProgressIndicator.tsx` | MEDIUM   | Visual sync progress              |
| `AccountBalanceChart.tsx`   | LOW      | Balance history visualization     |

---

## 4. Family Collaboration Journey

### User Story

_"As a primary account holder, I want to invite my partner to share our budget so we can manage finances together."_

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Access Family Settings                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Settings → Family Settings | Sidebar → Family icon                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Family Members View                                                 │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  👨‍👩‍👧 Family Members (1/2 editors)                                      │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │  👤 John Smith (you)          Primary        john@email.com         │    │
│  │                                                                      │    │
│  │  [+ Invite Partner]                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Send Invitation                                                     │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Invite Family Member                                                │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │  Email: [partner@email.com                    ]                      │    │
│  │                                                                      │    │
│  │  Role: ○ Spouse (can edit budget)                                    │    │
│  │        ○ Viewer (read-only access)                                   │    │
│  │                                                                      │    │
│  │  [Cancel]                              [Send Invitation]             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: Partner Receives Email                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Email contains:                                                             │
│  • Invitation message from John                                              │
│  • Role being granted (Spouse/Viewer)                                        │
│  • "Accept Invitation" button with secure token                              │
│  • Expiration notice (7 days)                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: Partner Accepts Invitation                                          │
│  ─────────────────────────────────────────────────────────────────────────── │
│  New User: Register form → Create account → Auto-join family                 │
│  Existing User: Login form → Authenticate → Auto-join family                 │
│                                                                              │
│  → Redirect to shared budget with success message                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Feature             | Frontend Component         | Backend API                       | Status      |
| ------------------- | -------------------------- | --------------------------------- | ----------- |
| Family Settings     | `FamilySettings.tsx`       | `GET /family`                     | ✅ Complete |
| Member List         | `FamilySettings.tsx`       | `GET /family/members`             | ✅ Complete |
| Send Invitation     | `FamilySettings.tsx`       | `POST /family/invite`             | ✅ Complete |
| Accept Invitation   | `AcceptInvitationPage.tsx` | `POST /family/accept`             | ✅ Complete |
| Remove Member       | `FamilySettings.tsx`       | `DELETE /family/members/{id}`     | ✅ Complete |
| Change Role         | `FamilySettings.tsx`       | `PUT /family/members/{id}`        | ✅ Complete |
| Leave Family        | `FamilySettings.tsx`       | `POST /family/leave`              | ✅ Complete |
| Pending Invitations | `FamilySettings.tsx`       | `GET /family/invitations`         | ✅ Complete |
| Revoke Invitation   | `FamilySettings.tsx`       | `DELETE /family/invitations/{id}` | ✅ Complete |

### UI/UX Requirements

- **Clear role explanation**: Tooltip explaining Spouse vs Viewer permissions
- **Confirmation dialogs**: Confirm before removing members or leaving
- **Real-time sync**: Show when partner makes changes (WebSocket future)
- **Activity indicators**: Show who made last change on transactions
- **Invitation status**: Show pending/accepted/expired status

### Missing Components

| Component                   | Priority | Description                       |
| --------------------------- | -------- | --------------------------------- |
| `FamilyActivityFeed.tsx`    | MEDIUM   | Show recent family member actions |
| `RealTimeSyncIndicator.tsx` | LOW      | Show when data is syncing         |
| `MemberAvatars.tsx`         | LOW      | Show who's viewing budget         |

---

## 5. Financial Insights Journey

### User Story

_"As a user, I want to understand my spending patterns so I can make better financial decisions."_

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ENTRY: Insights Tab                                                         │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Sidebar → Insights | Dashboard card → "View Insights"                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  INSIGHTS DASHBOARD                                                          │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  📊 Your Financial Insights                                          │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │                                                                      │    │
│  │  💡 Weekly Insight                                                   │    │
│  │  "You spent 40% more on dining this week compared to last week.     │    │
│  │   Consider meal prepping to save ~$50/week."                         │    │
│  │                                                                      │    │
│  │  📈 Spending Trends                    🏆 Achievements               │    │
│  │  [Chart: 6-month trend]               • Under budget 3 months       │    │
│  │                                        • Saved $500 this month       │    │
│  │                                                                      │    │
│  │  🔥 Top Categories This Month          📊 Peer Comparison            │    │
│  │  1. Housing      $1,500 (35%)         You spend less than 70%       │    │
│  │  2. Groceries    $600 (14%)           of similar users on dining    │    │
│  │  3. Transportation $400 (9%)                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Feature         | Frontend Component | Backend API               | Status           |
| --------------- | ------------------ | ------------------------- | ---------------- |
| Insights Page   | ✅ Complete        | `GET /insights/summary`   | ✅ Complete      |
| Weekly Insights | ✅ Complete        | `GET /insights/weekly`    | ✅ Complete      |
| Spending Trends | ✅ Complete        | `GET /insights/trends`    | ✅ Complete      |
| Peer Comparison | ❌ Missing         | `GET /comparison/summary` | ✅ Backend ready |
| Achievements    | ❌ Missing         | `GET /comparison/badges`  | ⚠️ Partial       |
| Tips Feed       | ✅ Complete        | `GET /tips/feed`          | ✅ Complete      |
| Daily Tip       | ✅ Complete        | `GET /tips/daily`         | ✅ Complete      |

### UI/UX Requirements

- **Positive framing**: Focus on wins, not failures
- **Actionable insights**: Every insight should have a suggested action
- **Visual charts**: Use charts over tables for trends
- **Gamification**: Badges, streaks, celebrations
- **Personalization**: Insights based on user's actual data

### Missing Components (HIGH PRIORITY)

| Component                  | Priority | Description                    |
| -------------------------- | -------- | ------------------------------ |
| `PeerComparisonWidget.tsx` | MEDIUM   | Anonymous benchmark comparison |
| `AchievementBadges.tsx`    | MEDIUM   | Gamification badges display    |

---

## 6. Debt & Savings Goals Journey

### User Story

_"As a user with debt, I want to create a payoff plan and track my savings goals so I can achieve financial freedom."_

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GOALS DASHBOARD                                                             │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🎯 Your Financial Goals                                             │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │                                                                      │    │
│  │  SAVINGS GOALS                                                       │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ 🏖️ Vacation Fund                                             │    │    │
│  │  │ ████████████░░░░░░░░  $2,400 / $3,000  (80%)                 │    │    │
│  │  │ $150/month needed • Target: June 2026                        │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ 🚨 Emergency Fund                                            │    │    │
│  │  │ ██████░░░░░░░░░░░░░░  $3,000 / $10,000  (30%)                │    │    │
│  │  │ $350/month needed • Target: Dec 2026                         │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  [+ Add Savings Goal]                                                │    │
│  │                                                                      │    │
│  │  DEBT PAYOFF                                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ 💳 Credit Card Debt                    Total: $5,432         │    │    │
│  │  │ Strategy: Avalanche (highest interest first)                 │    │    │
│  │  │ Payoff date: March 2027 • Interest saved: $892               │    │    │
│  │  │ ████████░░░░░░░░░░░░  $2,568 paid (47%)                      │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  [+ Add Debt]  [Change Strategy]                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Feature           | Frontend Component | Backend API                | Status         |
| ----------------- | ------------------ | -------------------------- | -------------- |
| Goals Page        | ❌ Missing         | `GET /goals`               | ❌ Not started |
| Savings Goal Card | ❌ Missing         | `GET /goals/{id}`          | ❌ Not started |
| Create Goal       | ❌ Missing         | `POST /goals`              | ❌ Not started |
| Update Goal       | ❌ Missing         | `PUT /goals/{id}`          | ❌ Not started |
| Goal Progress     | ❌ Missing         | `GET /goals/{id}/progress` | ❌ Not started |
| Debt List         | ❌ Missing         | `GET /debts`               | ❌ Not started |
| Add Debt          | ❌ Missing         | `POST /debts`              | ❌ Not started |
| Debt Calculator   | ❌ Missing         | `POST /debts/calculate`    | ❌ Not started |
| Payoff Timeline   | ❌ Missing         | `GET /debts/timeline`      | ❌ Not started |

### UI/UX Requirements

- **Visual progress**: Animated progress bars
- **Milestone celebrations**: Confetti at 25%, 50%, 75%, 100%
- **Drag-and-drop**: Reorder goal priorities
- **Calculator preview**: Show impact of extra payments
- **Motivational messaging**: Encourage users at each milestone

### Missing Components (MEDIUM PRIORITY)

| Component                  | Priority | Description                   |
| -------------------------- | -------- | ----------------------------- |
| `GoalsPage.tsx`            | MEDIUM   | Goals dashboard               |
| `SavingsGoalCard.tsx`      | MEDIUM   | Individual goal with progress |
| `CreateGoalModal.tsx`      | MEDIUM   | Goal creation form            |
| `DebtPayoffCalculator.tsx` | MEDIUM   | Snowball/Avalanche calculator |
| `PayoffTimeline.tsx`       | MEDIUM   | Visual debt payoff timeline   |
| `MilestoneAnimation.tsx`   | LOW      | Celebration animations        |

---

## 7. Notifications & Reminders Journey

### User Story

_"As a user, I want to receive timely notifications about my budget so I stay on track without constantly checking the app."_

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION TYPES                                                          │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  🔔 Budget Alerts                                                            │
│  ├─ 80% threshold: "Heads up! You've used 80% of your Dining budget"        │
│  ├─ 90% threshold: "Warning: Only 10% left in your Groceries budget"        │
│  └─ 100% threshold: "Alert: You've exceeded your Entertainment budget"      │
│                                                                              │
│  ⏰ Daily Reminders                                                          │
│  └─ "Don't forget to log today's expenses! You haven't added any in 3 days" │
│                                                                              │
│  📅 Bill Reminders                                                           │
│  ├─ 7 days before: "Rent due in 7 days ($1,500)"                            │
│  ├─ 3 days before: "Rent due in 3 days ($1,500)"                            │
│  └─ Due date: "Rent is due today ($1,500)"                                  │
│                                                                              │
│  📊 Weekly Summary                                                           │
│  └─ "Weekly Summary: You spent $450 this week, $50 under budget!"           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION SETTINGS                                                       │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🔔 Notification Preferences                                         │    │
│  │  ────────────────────────────────────────────────────────────────── │    │
│  │                                                                      │    │
│  │  Budget Alerts                              [ON]                     │    │
│  │  Get notified when approaching budget limits                         │    │
│  │                                                                      │    │
│  │  Daily Expense Reminders                    [ON]                     │    │
│  │  Reminder to log expenses                                            │    │
│  │                                                                      │    │
│  │  Reminder Time                              [7:00 PM ▼]              │    │
│  │                                                                      │    │
│  │  Quiet Hours                                                         │    │
│  │  Start: [10:00 PM ▼]    End: [8:00 AM ▼]                            │    │
│  │                                                                      │    │
│  │  Weekly Summary                             [ON]                     │    │
│  │  Receive weekly spending summary                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Feature                        | Frontend Component         | Backend API                          | Status           |
| ------------------------------ | -------------------------- | ------------------------------------ | ---------------- |
| Notification Settings (Web)    | `NotificationSettings.tsx` | `GET/PUT /notifications/preferences` | ✅ Complete      |
| Notification Settings (Mobile) | `NotificationSettings.tsx` | `GET/PUT /notifications/preferences` | ✅ Complete      |
| Device Registration            | Mobile only                | `POST /notifications/devices`        | ✅ Complete      |
| Budget Alerts                  | Backend only               | DynamoDB Streams trigger             | ✅ Complete      |
| Daily Reminders                | Backend only               | EventBridge scheduled                | ✅ Complete      |
| Notification History           | ❌ Missing                 | `GET /notifications/history`         | ✅ Backend ready |
| In-App Notifications           | ❌ Missing                 | N/A                                  | ❌ Not started   |

### UI/UX Requirements

- **Non-intrusive**: Respect quiet hours, don't over-notify
- **Actionable**: Each notification should link to relevant screen
- **Customizable**: Let users control each notification type
- **Grouped**: Batch similar notifications together
- **Dismissible**: Easy to dismiss or mark as read

### Missing Components

| Component                | Priority | Description                |
| ------------------------ | -------- | -------------------------- |
| `NotificationCenter.tsx` | HIGH     | In-app notification list   |
| `NotificationBadge.tsx`  | HIGH     | Unread count indicator     |
| `NotificationToast.tsx`  | MEDIUM   | In-app toast notifications |
| `BillReminderCard.tsx`   | MEDIUM   | Upcoming bills display     |

---

## 8. Settings & Preferences Journey

### User Story

_"As a user, I want to customize my app experience and manage my account settings."_

### Settings Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ SETTINGS                                                                 │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  👤 ACCOUNT                                                                  │
│  ├─ Profile (name, email, avatar)                    ✅ Complete             │
│  ├─ Password & Security                              ✅ Complete             │
│  ├─ Two-Factor Authentication                        ❌ Not started          │
│  └─ Delete Account                                   ⚠️ Partial              │
│                                                                              │
│  🌍 PREFERENCES                                                              │
│  ├─ Currency (USD, EUR, GBP, CAD, AUD, JPY)         ✅ Complete             │
│  ├─ Location (country, city, timezone)              ✅ Complete             │
│  ├─ Language                                         ❌ Not started          │
│  └─ Theme (Light/Dark/System)                        ⚠️ Partial              │
│                                                                              │
│  🔔 NOTIFICATIONS                                                            │
│  ├─ Budget Alerts                                    ✅ Complete             │
│  ├─ Daily Reminders                                  ✅ Complete             │
│  ├─ Quiet Hours                                      ✅ Complete             │
│  └─ Email Preferences                                ❌ Not started          │
│                                                                              │
│  👨‍👩‍👧 FAMILY                                                                   │
│  ├─ Family Members                                   ✅ Complete             │
│  ├─ Invite Partner                                   ✅ Complete             │
│  └─ Leave Family                                     ✅ Complete             │
│                                                                              │
│  🏦 CONNECTED ACCOUNTS                                                       │
│  ├─ Bank Accounts (Plaid)                           ✅ Complete             │
│  └─ Google Account                                   ✅ Complete             │
│                                                                              │
│  📤 DATA & PRIVACY                                                           │
│  ├─ Export Data (CSV, PDF, JSON)                    ✅ Complete             │
│  ├─ Backup & Restore                                 ✅ Complete             │
│  └─ Privacy Settings                                 ❌ Not started          │
│                                                                              │
│  ℹ️ ABOUT                                                                    │
│  ├─ Version Info                                     ⚠️ Partial              │
│  ├─ Terms of Service                                 ❌ Not started          │
│  ├─ Privacy Policy                                   ❌ Not started          │
│  └─ Help & Support                                   ❌ Not started          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Feature               | Frontend Component         | Backend API                            | Status          |
| --------------------- | -------------------------- | -------------------------------------- | --------------- |
| Settings Page         | `SettingsPage.tsx`         | Multiple                               | ✅ Complete     |
| Profile Settings      | `SettingsPage.tsx`         | `GET/PUT /auth/profile`                | ✅ Complete     |
| Currency Settings     | `CurrencySelector.tsx`     | `PUT /auth/profile`                    | ✅ Complete     |
| Notification Settings | `NotificationSettings.tsx` | `GET/PUT /notifications/preferences`   | ✅ Complete     |
| Family Settings       | `FamilySettings.tsx`       | `GET /family`                          | ✅ Complete     |
| Export Data           | `ExportModal.tsx`          | `POST /export/csv`, `POST /export/pdf` | ✅ Complete     |
| Backup/Restore        | `BackupModal.tsx`          | `POST /backup`, `POST /restore`        | ✅ Complete     |
| Theme Toggle          | `ThemeContext.tsx`         | N/A (local)                            | ⚠️ Partial      |
| Delete Account        | ❌ Missing                 | `DELETE /auth/account`                 | ⚠️ Backend only |

### Missing Components

| Component                | Priority | Description                       |
| ------------------------ | -------- | --------------------------------- |
| `TwoFactorSetup.tsx`     | MEDIUM   | 2FA configuration                 |
| `DeleteAccountModal.tsx` | MEDIUM   | Account deletion with data export |
| `LanguageSelector.tsx`   | LOW      | Multi-language support            |
| `PrivacySettings.tsx`    | LOW      | Data sharing preferences          |
| `HelpCenter.tsx`         | LOW      | FAQ and support links             |

---

## 9. Component Gap Analysis

### Summary by Priority

#### 🔴 HIGH PRIORITY (Missing Frontend for Existing Backend)

| Component                | Journey          | Backend Status | Effort  |
| ------------------------ | ---------------- | -------------- | ------- |
| `BankAccounts.tsx`       | Bank Connection  | ✅ Ready       | ✅ Done |
| `NotificationCenter.tsx` | Notifications    | ✅ Ready       | ✅ Done |
| `TransactionSearch`      | Daily Management | ⚠️ Partial     | ✅ Done |

#### 🟡 MEDIUM PRIORITY (New Features)

| Component                  | Journey            | Backend Status | Effort   |
| -------------------------- | ------------------ | -------------- | -------- |
| `GoalsPage.tsx`            | Debt & Savings     | ✅ Ready       | ✅ Done  |
| `GoalFormPage.tsx`         | Debt & Savings     | ✅ Ready       | ✅ Done  |
| `BillsPage.tsx`            | Notifications      | ✅ Ready       | ✅ Done  |
| `BillFormPage.tsx`         | Notifications      | ✅ Ready       | ✅ Done  |
| `BillsScreen.tsx` (Mobile) | Notifications      | ✅ Ready       | ✅ Done  |
| `DebtPayoffCalculator.tsx` | Debt & Savings     | ❌ Not started | 2-3 days |
| `PeerComparisonWidget.tsx` | Financial Insights | ✅ Ready       | ✅ Done  |
| `SubscriptionTracker.tsx`  | Subscriptions      | ❌ Not started | 2-3 days |

#### 🟢 LOW PRIORITY (Nice to Have)

| Component               | Journey          | Backend Status | Effort       |
| ----------------------- | ---------------- | -------------- | ------------ |
| `CalendarView.tsx`      | Daily Management | ❌ Not started | 2-3 days     |
| `ReceiptScanner.tsx`    | Daily Management | ❌ Not started | 3-4 days     |
| `InvestmentTracker.tsx` | Net Worth        | ❌ Not started | 3-4 days     |
| `CreditScoreWidget.tsx` | Financial Health | ❌ Not started | External API |

### Backend APIs Without Frontend

| API Endpoint              | Description              | Priority |
| ------------------------- | ------------------------ | -------- |
| `GET /comparison/summary` | Peer spending comparison | MEDIUM   |
| `GET /tips/feed`          | Financial tips feed      | MEDIUM   |
| `GET /tips/daily`         | Daily tip                | MEDIUM   |
| `GET /learn/courses`      | Educational content      | LOW      |
| `GET /learn/progress`     | Learning progress        | LOW      |
| `GET /admin/dashboard`    | Admin metrics            | LOW      |

---

## 10. UI/UX Best Practices Applied

### Design Principles

1. **Mobile-First Design**
   - Touch targets minimum 44x44px
   - Thumb-friendly navigation zones
   - Responsive breakpoints: 320px, 768px, 1024px, 1440px

2. **Progressive Disclosure**
   - Show essential info first
   - Details on demand (expand/modal)
   - Avoid overwhelming new users

3. **Feedback & Affordance**
   - Immediate visual feedback on actions
   - Loading states for async operations
   - Clear error messages with recovery options

4. **Consistency**
   - Unified color palette (green=income, red=expense)
   - Consistent iconography (emoji-based)
   - Predictable navigation patterns

5. **Accessibility (WCAG 2.1 AA)**
   - 4.5:1 contrast ratio for text
   - ARIA labels on interactive elements
   - Keyboard navigation support
   - Screen reader compatibility

### Color System

```
Primary:    #4CAF50 (Green - positive actions, income)
Secondary:  #2196F3 (Blue - navigation, links)
Danger:     #F44336 (Red - expenses, warnings, delete)
Warning:    #FF9800 (Orange - alerts, caution)
Success:    #4CAF50 (Green - confirmations)
Neutral:    #9E9E9E (Gray - disabled, secondary text)
Background: #F5F5F5 (Light gray - page background)
Surface:    #FFFFFF (White - cards, modals)
```

### Typography

```
Headings:   Inter/System Font, Bold, 24-32px
Body:       Inter/System Font, Regular, 14-16px
Caption:    Inter/System Font, Regular, 12px
Numbers:    Tabular figures for alignment
```

### Spacing System

```
xs: 4px   (tight spacing)
sm: 8px   (compact elements)
md: 16px  (standard spacing)
lg: 24px  (section spacing)
xl: 32px  (major sections)
```

### Animation Guidelines

- Duration: 200-300ms for micro-interactions
- Easing: ease-out for entrances, ease-in for exits
- Purpose: Guide attention, confirm actions
- Performance: Use transform/opacity only

---

## 11. Requirements-to-Tasks Reconciliation

### Document Maintenance

> ⚠️ **IMPORTANT**: This document must be updated whenever a feature is implemented.
> A Kiro hook (`update-user-journeys`) automatically reminds developers to update this document.

### Complete Requirements Mapping

#### Core Features (Requirements 1-17) - ✅ COMPLETE

| Req    | Name               | Journey    | Task | Frontend | Backend | UI/UX Status |
| ------ | ------------------ | ---------- | ---- | -------- | ------- | ------------ |
| R1     | Authentication     | Onboarding | N/A  | ✅       | ✅      | ✅ Complete  |
| R2     | Budget Management  | Daily      | N/A  | ✅       | ✅      | ✅ Complete  |
| R3     | Transactions       | Daily      | N/A  | ✅       | ✅      | ✅ Complete  |
| R4     | Month Navigation   | Daily      | N/A  | ✅       | ✅      | ✅ Complete  |
| R5     | Summary            | Daily      | N/A  | ✅       | ✅      | ✅ Complete  |
| R6     | Responsive Design  | All        | N/A  | ✅       | N/A     | ✅ Complete  |
| R7     | Data Persistence   | All        | N/A  | ✅       | ✅      | ✅ Complete  |
| R8     | Enhanced Month Nav | Daily      | N/A  | ✅       | N/A     | ✅ Complete  |
| R9     | Budget Reset       | Daily      | N/A  | ✅       | ✅      | ✅ Complete  |
| R10-16 | Bug Fixes          | Various    | N/A  | ✅       | ✅      | ✅ Complete  |
| R17    | Family Management  | Family     | N/A  | ✅       | ✅      | ✅ Complete  |

#### Mobile & Platform (Requirements 22-34) - ✅ MOSTLY COMPLETE

| Req | Name                | Journey       | Task   | Frontend | Backend | UI/UX Status    |
| --- | ------------------- | ------------- | ------ | -------- | ------- | --------------- |
| R22 | Native Mobile Apps  | All           | N/A    | ✅       | ✅      | ✅ Complete     |
| R23 | Mobile UX           | All           | N/A    | ✅       | N/A     | ✅ Complete     |
| R24 | Offline Capability  | All           | N/A    | ✅       | N/A     | ✅ Complete     |
| R25 | Mobile Security     | All           | N/A    | ✅       | ✅      | ✅ Complete     |
| R26 | Export/Backup       | Settings      | N/A    | ✅       | ✅      | ✅ Complete     |
| R27 | Onboarding Tutorial | Onboarding    | N/A    | ⚠️       | N/A     | ⚠️ Needs polish |
| R28 | Search & Filtering  | Daily         | N/A    | ✅       | ⚠️      | ✅ Complete     |
| R29 | Notifications       | Notifications | N/A    | ✅       | ✅      | ✅ Complete     |
| R30 | Multi-Currency      | Settings      | N/A    | ✅       | ✅      | ✅ Complete     |
| R31 | Basic Reporting     | Insights      | Task 3 | ✅       | ✅      | ✅ Complete     |
| R32 | Category Management | Daily         | N/A    | ⚠️       | ✅      | ⚠️ Basic only   |
| R33 | Quick Actions       | Daily         | N/A    | ❌       | N/A     | ❌ Missing      |
| R34 | Enhanced Security   | Settings      | N/A    | ⚠️       | ✅      | ⚠️ No 2FA UI    |

#### Competitive Features (Requirements 35-48) - 🔄 IN PROGRESS

| Req | Name                  | Journey       | Task    | Frontend | Backend | UI/UX Status    |
| --- | --------------------- | ------------- | ------- | -------- | ------- | --------------- |
| R35 | Subscription Tracking | Insights      | -       | ❌       | ❌      | ❌ Not started  |
| R36 | Bill Reminders        | Notifications | Task 2  | ✅       | ✅      | ✅ Complete     |
| R37 | Debt Payoff           | Goals         | -       | ❌       | ❌      | ❌ Not started  |
| R38 | Savings Goals         | Goals         | Task 3  | ✅       | ✅      | ✅ Complete     |
| R39 | Spending Insights     | Insights      | Task 3  | ✅       | ✅      | ✅ Complete     |
| R40 | Rollover Budgets      | Daily         | Task 1  | ✅       | ✅      | ✅ Complete     |
| R41 | Net Worth             | Goals         | -       | ❌       | ❌      | ❌ Not started  |
| R42 | Bank Sync (Plaid)     | Bank          | Task 5  | ✅       | ✅      | ✅ Complete     |
| R43 | Credit Score          | Insights      | -       | ❌       | ❌      | ❌ External API |
| R44 | Receipt Scanning      | Daily         | Task 4  | ❌       | ✅      | ❌ Missing UI   |
| R45 | Investments           | Goals         | -       | ❌       | ❌      | ❌ Not started  |
| R46 | Peer Comparison       | Insights      | Task 8  | ✅       | ✅      | ✅ Complete     |
| R47 | Educational Content   | Insights      | Task 10 | ❌       | ✅      | ❌ Missing UI   |
| R48 | Admin Dashboard       | Admin         | Task 7  | ❌       | ✅      | ❌ Missing UI   |

---

## 12. UI/UX Implementation Checklist

### Per-Feature UI/UX Requirements

#### 🔴 HIGH PRIORITY - Backend Ready, UI Missing

**1. Insights Page (R31, R39)** - ✅ COMPLETE

- [x] Dashboard layout with card grid
- [x] Weekly insight card with AI-generated text
- [x] Spending trend chart (line/area chart)
- [x] Category breakdown (pie/donut chart)
- [x] Month-over-month comparison bars
- [ ] "Ask AI" chat interface (Premium feature)
- [x] Loading skeletons for async data
- [x] Empty state for new users
- [ ] Pull-to-refresh (mobile)

**2. Tips Feed (R47)**

- [ ] Scrollable feed layout (like social media)
- [ ] Tip card with icon, title, body, action
- [ ] Save/dismiss swipe gestures
- [ ] Category filter tabs
- [ ] Daily tip highlight card
- [ ] Saved tips section
- [ ] Read/unread indicators

**3. Goals Page (R38)** - ✅ COMPLETE

- [x] Goal cards with progress bars
- [x] Animated progress on contribution
- [x] Create goal modal with templates
- [x] Goal icon/emoji picker
- [x] Target date picker
- [ ] Drag-and-drop reordering
- [x] Milestone celebration (alert)
- [ ] Archive completed goals

**4. Peer Comparison (R46)**

- [ ] Opt-in/opt-out toggle
- [ ] Category comparison bars
- [ ] Percentile indicators (better/worse than X%)
- [ ] Financial health score gauge
- [ ] Achievement badges display
- [ ] Privacy explanation modal

**5. Bills Page (R36)** - ✅ COMPLETE

- [x] Bills list sorted by due date
- [ ] Calendar view toggle
- [x] Bill card with status (paid/unpaid/overdue)
- [x] Quick "Mark Paid" button
- [x] Add bill modal with recurrence
- [x] Due date countdown
- [x] Color-coded urgency (green/yellow/red)

**6. Receipt Scanner (R44)**

- [ ] Camera capture button
- [ ] Image preview with crop/rotate
- [ ] Processing spinner with status
- [ ] Extracted data confirmation form
- [ ] Category suggestion dropdown
- [ ] Retry on failure
- [ ] Usage limit indicator

**7. Educational Content (R47)**

- [ ] Course catalog grid
- [ ] Course detail page with lessons
- [ ] Lesson viewer (text + video)
- [ ] Quiz component with feedback
- [ ] Progress bar per course
- [ ] Badge showcase
- [ ] Streak indicator

**8. Admin Dashboard (R48)**

- [ ] Metrics cards (users, revenue, etc.)
- [ ] User search with filters
- [ ] User detail modal
- [ ] Action buttons (disable, reset password)
- [ ] System health indicators
- [ ] Audit log table with pagination

#### 🟡 MEDIUM PRIORITY - Enhancements

**9. Search & Filtering (R28)**

- [ ] Search bar in transaction list
- [ ] Filter dropdown (date, category, amount)
- [ ] Search results highlighting
- [ ] Recent searches
- [ ] Clear filters button

**10. Quick Actions (R33)**

- [ ] Recent transactions quick-add
- [ ] Favorite categories
- [ ] Transaction templates
- [ ] Keyboard shortcuts (web)
- [ ] Voice input (mobile)

**11. Notification Center**

- [ ] Bell icon with badge count
- [ ] Notification dropdown/drawer
- [ ] Mark as read
- [ ] Notification grouping
- [ ] Deep links to relevant screens

---

## 13. Implementation Priority Matrix

### Immediate (This Sprint)

| Feature            | Journey       | Effort | Impact | Dependencies  | Status      |
| ------------------ | ------------- | ------ | ------ | ------------- | ----------- |
| TipsFeed           | Insights      | 1 day  | MEDIUM | Backend ready | ✅ Complete |
| InsightsPage       | Insights      | 3 days | HIGH   | Backend ready | ✅ Complete |
| NotificationCenter | Notifications | 2 days | HIGH   | Backend ready | ❌ Pending  |
| GoalsPage          | Goals         | 3 days | HIGH   | Backend ready | ✅ Complete |
| BillsPage          | Notifications | 2 days | HIGH   | Backend ready | ✅ Complete |
| SubscriptionsPage  | Daily         | 2 days | HIGH   | Backend ready | ✅ Complete |
| DebtPayoffPage     | Goals         | 3 days | HIGH   | Backend ready | ✅ Complete |

### Next Sprint

| Feature        | Journey  | Effort | Impact | Dependencies  |
| -------------- | -------- | ------ | ------ | ------------- |
| PeerComparison | Insights | 1 day  | MEDIUM | Backend ready |
| ReceiptScanner | Daily    | 3 days | MEDIUM | Camera API    |
| LearnPage      | Insights | 3 days | MEDIUM | Backend ready |

### Future Sprints

| Feature         | Journey | Effort | Impact | Dependencies  |
| --------------- | ------- | ------ | ------ | ------------- |
| AdminDashboard  | Admin   | 4 days | LOW    | Internal only |
| NetWorthTracker | Goals   | 4 days | MEDIUM | New backend   |
| CreditScore     | Goals   | 3 days | MEDIUM | Partnership   |
| Investments     | Goals   | 4 days | MEDIUM | New backend   |

---

## Appendix: Quick Reference

### Status Legend

| Symbol | Meaning             |
| ------ | ------------------- |
| ✅     | Complete and tested |
| ⚠️     | Partial/needs work  |
| ❌     | Not started         |
| 🔄     | In progress         |

### Journey Abbreviations

| Code          | Journey                   |
| ------------- | ------------------------- |
| Onboarding    | New User Onboarding       |
| Daily         | Daily Budget Management   |
| Bank          | Bank Account Connection   |
| Family        | Family Collaboration      |
| Insights      | Financial Insights        |
| Goals         | Debt & Savings Goals      |
| Notifications | Notifications & Reminders |
| Settings      | Settings & Preferences    |
| Admin         | Admin Dashboard           |

### Task References

Tasks are defined in `.kiro/specs/competitive-features/tasks.md`:

- Task 1: Rollover Budgets ✅
- Task 2: Bill Reminders ✅
- Task 3: Savings Goals ✅
- Task 4: Subscription Tracking ✅
- Task 5: Debt Payoff Calculator ✅
- Task 6: Spending Insights Enhancement
- Task 7: Receipt Scanning
- Task 8: Admin Web Application
- Task 9: Net Worth Tracking
- Task 10: Bank Sync UI (Plaid)
- Task 11: Credit Score Monitoring
- Task 12: Investment Tracking
- Task 13: Peer Comparison
- Task 14: Educational Content

---

_Document maintained by BudgetBuddy Development Team_
_Last reviewed: 2026-02-02_
_Hook: `update-user-journeys` enforces updates on feature completion_
