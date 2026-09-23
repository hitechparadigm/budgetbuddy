# Design Document: Enhanced Accounts & Transactions

## Overview

This design document covers the technical architecture for enhancing BudgetBuddy with comprehensive account management, batch transaction entry, and improved navigation UX. The feature integrates with the existing Plaid backend while adding support for manual accounts, account-transaction associations, and a modern sidebar navigation pattern.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web App (React/Vite)                                                        │
│  ├── Sidebar Navigation (persistent)                                         │
│  │   ├── Budget, Accounts, Goals, Insights, Learn, Settings                 │
│  │   └── User profile dropdown                                               │
│  ├── Accounts Page (enhanced)                                                │
│  │   ├── Manual Account Management                                           │
│  │   ├── Connected Account Mapping                                           │
│  │   └── Balance Summary                                                     │
│  ├── Transaction Modal (enhanced)                                            │
│  │   ├── Account Selection Dropdown                                          │
│  │   └── Batch Entry Mode                                                    │
│  └── QuickActionsFAB (simplified)                                            │
│       └── Add Income, Add Expense, Scan Receipt only                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/accounts/*        │  /api/transactions/*  │  /api/plaid/*             │
│  (New endpoints)        │  (Enhanced)           │  (Existing)               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Lambda Functions                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  accounts-lambda (NEW)  │  transactions-lambda  │  plaid-lambda             │
│  - CRUD operations      │  - Enhanced with      │  - Existing               │
│  - Balance tracking     │    accountId          │  - Account mapping        │
│  - Reconciliation       │  - Batch support      │    integration            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  DynamoDB (Single Table)                                                     │
│  ├── Account Records (PK: FAMILY#, SK: ACCOUNT#)                            │
│  ├── Transaction Records (enhanced with accountId)                           │
│  └── GSI1: Account Type Index                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Sidebar Navigation Component

```typescript
// packages/web-app/src/components/layout/Sidebar.tsx

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentPath: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number; // For notifications/counts
}

const navItems: NavItem[] = [
  { id: "budget", label: "Budget", icon: "📊", path: "/budget" },
  { id: "accounts", label: "Accounts", icon: "🏦", path: "/accounts" },
  { id: "goals", label: "Goals", icon: "🎯", path: "/goals" },
  { id: "insights", label: "Insights", icon: "💡", path: "/insights" },
  { id: "learn", label: "Learn", icon: "📚", path: "/learn" },
  { id: "settings", label: "Settings", icon: "⚙️", path: "/settings" },
];
```

### 2. Account Management Components

```typescript
// packages/web-app/src/components/accounts/AccountCard.tsx

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onReconcile: (accountId: string) => void;
  onToggleTracking: (accountId: string, isTracked: boolean) => void;
}

// packages/web-app/src/components/accounts/AddAccountModal.tsx

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: CreateAccountInput) => Promise<void>;
}

interface CreateAccountInput {
  accountType: AccountType;
  accountSubtype: AccountSubtype;
  nickname: string;
  institutionName?: string;
  currentBalance: number;
  currency: string;
}
```

### 3. Enhanced Transaction Modal

```typescript
// packages/web-app/src/components/transactions/TransactionModal.tsx

interface TransactionModalProps {
  isOpen: boolean;
  type: "income" | "expense";
  accounts: Account[];
  categories: Category[];
  onSubmit: (transaction: CreateTransactionInput) => Promise<void>;
  onClose: () => void;
}

interface TransactionFormState {
  amount: string;
  description: string;
  date: string;
  categoryId: string;
  accountId: string | null; // NEW: Optional account association
  createAnother: boolean; // NEW: Batch entry mode
}

interface BatchEntryState {
  count: number; // Number of transactions added in session
  lastAccountId: string; // Preserve account selection
  lastType: "income" | "expense";
}
```

### 4. Account Service API

```typescript
// packages/web-app/src/services/accountsApi.ts

interface AccountsApi {
  // CRUD Operations
  getAccounts(): Promise<Account[]>;
  getAccount(accountId: string): Promise<Account>;
  createAccount(input: CreateAccountInput): Promise<Account>;
  updateAccount(accountId: string, input: UpdateAccountInput): Promise<Account>;
  deleteAccount(accountId: string): Promise<void>;

  // Balance Operations
  reconcileAccount(accountId: string, newBalance: number): Promise<Account>;
  getAccountBalance(accountId: string): Promise<number>;

  // Tracking Operations
  setAccountTracking(accountId: string, isTracked: boolean): Promise<Account>;

  // Summary
  getAccountsSummary(): Promise<AccountsSummary>;
}

interface AccountsSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountsByType: Record<AccountType, Account[]>;
}
```

### 5. Backend Lambda Handler

```javascript
// backend/functions/accounts/index.js

// GET /api/accounts - List all accounts for family
// GET /api/accounts/:id - Get single account
// POST /api/accounts - Create manual account
// PUT /api/accounts/:id - Update account
// DELETE /api/accounts/:id - Delete manual account
// POST /api/accounts/:id/reconcile - Reconcile balance
// PUT /api/accounts/:id/tracking - Toggle tracking status

const routes = {
  "GET /accounts": listAccounts,
  "GET /accounts/{id}": getAccount,
  "POST /accounts": createAccount,
  "PUT /accounts/{id}": updateAccount,
  "DELETE /accounts/{id}": deleteAccount,
  "POST /accounts/{id}/reconcile": reconcileAccount,
  "PUT /accounts/{id}/tracking": setTracking,
};
```

## Data Models

### Account Entity

```javascript
// DynamoDB Record Structure
{
  // Keys
  PK: "FAMILY#family123",
  SK: "ACCOUNT#acc-uuid-001",

  // GSI for type-based queries
  GSI1PK: "FAMILY#family123#ACCOUNTS",
  GSI1SK: "banking#acc-uuid-001",

  // Core Fields
  accountId: "acc-uuid-001",
  familyId: "family123",
  accountType: "banking",           // banking, cash, credit_card, investment, loan
  accountSubtype: "checking",       // checking, savings, money_market, etc.
  nickname: "Main Checking",
  institutionName: "Chase Bank",
  mask: "4567",                     // Last 4 digits

  // Balance
  currentBalance: 5432.10,
  currency: "USD",

  // Source
  isManual: true,                   // true for manual, false for Plaid
  plaidAccountId: null,             // Set for connected accounts
  plaidItemId: null,

  // Tracking
  isTracked: true,                  // Include in budget calculations

  // Timestamps
  lastSynced: null,                 // For connected accounts
  lastReconciled: "2026-02-01T10:00:00Z",
  createdAt: "2026-01-15T08:00:00Z",
  updatedAt: "2026-02-01T10:00:00Z",

  // Entity type for single-table design
  entityType: "ACCOUNT"
}
```

### Enhanced Transaction Entity

```javascript
// Extended Transaction Record
{
  // Existing fields...
  PK: "FAMILY#family123",
  SK: "TRANSACTION#txn-uuid-001",
  transactionId: "txn-uuid-001",
  familyId: "family123",
  budgetId: "budget-2026-02",
  categoryId: "cat-groceries",
  type: "expense",
  amount: 125.50,
  description: "Weekly groceries",
  date: "2026-02-01",

  // NEW: Account association
  accountId: "acc-uuid-001",        // Optional, null for legacy transactions

  // Timestamps
  createdAt: "2026-02-01T14:30:00Z",
  updatedAt: "2026-02-01T14:30:00Z",

  entityType: "TRANSACTION"
}
```

### Account Type Enums

```typescript
// packages/shared/src/types/account.ts

export enum AccountType {
  BANKING = "banking",
  CASH = "cash",
  CREDIT_CARD = "credit_card",
  INVESTMENT = "investment",
  LOAN = "loan",
}

export enum BankingSubtype {
  CHECKING = "checking",
  SAVINGS = "savings",
  MONEY_MARKET = "money_market",
}

export enum CashSubtype {
  CASH = "cash",
  DIGITAL_WALLET = "digital_wallet",
}

export enum CreditCardSubtype {
  CREDIT_CARD = "credit_card",
  STORE_CARD = "store_card",
}

export enum InvestmentSubtype {
  BROKERAGE = "brokerage",
  RETIREMENT_401K = "retirement_401k",
  IRA = "ira",
  OTHER_INVESTMENT = "other_investment",
}

export enum LoanSubtype {
  MORTGAGE = "mortgage",
  AUTO_LOAN = "auto_loan",
  STUDENT_LOAN = "student_loan",
  PERSONAL_LOAN = "personal_loan",
}

export type AccountSubtype =
  | BankingSubtype
  | CashSubtype
  | CreditCardSubtype
  | InvestmentSubtype
  | LoanSubtype;
```

### Account Icons Mapping

```typescript
// packages/web-app/src/utils/accountIcons.ts

export const accountTypeIcons: Record<AccountType, string> = {
  banking: "🏦",
  cash: "💵",
  credit_card: "💳",
  investment: "📈",
  loan: "📋",
};

export const accountSubtypeIcons: Record<string, string> = {
  checking: "🏦",
  savings: "🐷",
  money_market: "💰",
  cash: "💵",
  digital_wallet: "📱",
  credit_card: "💳",
  store_card: "🏪",
  brokerage: "📈",
  retirement_401k: "🏖️",
  ira: "🎯",
  other_investment: "📊",
  mortgage: "🏠",
  auto_loan: "🚗",
  student_loan: "🎓",
  personal_loan: "📋",
};
```

## API Endpoints

### New Account Endpoints

| Method | Endpoint                    | Description                  | Auth |
| ------ | --------------------------- | ---------------------------- | ---- |
| GET    | /api/accounts               | List all accounts for family | User |
| GET    | /api/accounts/:id           | Get single account           | User |
| POST   | /api/accounts               | Create manual account        | User |
| PUT    | /api/accounts/:id           | Update account               | User |
| DELETE | /api/accounts/:id           | Delete manual account        | User |
| POST   | /api/accounts/:id/reconcile | Reconcile balance            | User |
| PUT    | /api/accounts/:id/tracking  | Toggle tracking              | User |
| GET    | /api/accounts/summary       | Get accounts summary         | User |

### Enhanced Transaction Endpoints

| Method | Endpoint              | Description        | Changes                |
| ------ | --------------------- | ------------------ | ---------------------- |
| POST   | /api/transactions     | Create transaction | Add optional accountId |
| PUT    | /api/transactions/:id | Update transaction | Add optional accountId |
| GET    | /api/transactions     | List transactions  | Add accountId filter   |

## Balance Calculation Logic

```typescript
// packages/web-app/src/utils/balanceCalculations.ts

/**
 * Calculate balance change for a transaction
 *
 * Asset accounts (banking, cash, investment):
 *   - Income: +amount (increases balance)
 *   - Expense: -amount (decreases balance)
 *
 * Liability accounts (credit_card, loan):
 *   - Income: -amount (payment reduces debt)
 *   - Expense: +amount (charge increases debt)
 */
export function calculateBalanceChange(
  transaction: Transaction,
  account: Account,
): number {
  const isAsset = ["banking", "cash", "investment"].includes(
    account.accountType,
  );
  const isIncome = transaction.type === "income";

  if (isAsset) {
    return isIncome ? transaction.amount : -transaction.amount;
  } else {
    // Liability account
    return isIncome ? -transaction.amount : transaction.amount;
  }
}

/**
 * Update account balance after transaction
 */
export function updateAccountBalance(
  account: Account,
  transaction: Transaction,
  operation: "add" | "remove" | "update",
  previousTransaction?: Transaction,
): number {
  let newBalance = account.currentBalance;

  if (operation === "remove" && previousTransaction) {
    // Reverse the previous transaction's effect
    newBalance -= calculateBalanceChange(previousTransaction, account);
  }

  if (operation === "add" || operation === "update") {
    newBalance += calculateBalanceChange(transaction, account);
  }

  return newBalance;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Batch Mode Form Behavior

_For any_ transaction submitted with "Create another transaction" checkbox checked, the modal SHALL remain open with amount, description, and date fields cleared, AND _for any_ transaction submitted with the checkbox unchecked, the modal SHALL close.

**Validates: Requirements 1.2, 1.5, 1.8**

### Property 2: Batch Mode Context Preservation

_For any_ transaction saved in batch entry mode, the transaction type (income/expense) AND the selected account SHALL be preserved for the next entry.

**Validates: Requirements 1.3, 1.4**

### Property 3: Batch Mode Error Handling

_For any_ transaction that fails to save in batch mode, the form data (amount, description, date, category, account) SHALL remain intact for retry.

**Validates: Requirements 1.9**

### Property 4: Batch Mode Counter Accuracy

_For any_ sequence of N successful transactions in batch mode, the displayed count SHALL equal N.

**Validates: Requirements 1.6**

### Property 5: Account CRUD Round-Trip

_For any_ valid account data, creating an account then retrieving it SHALL return an equivalent account object with all fields preserved.

**Validates: Requirements 2.5, 2.7**

### Property 6: Account Grouping Consistency

_For any_ set of accounts, displaying them on the Accounts page SHALL group them correctly by accountType, with each account appearing in exactly one group.

**Validates: Requirements 2.6**

### Property 7: Account Deletion Preserves Transactions

_For any_ account with associated transactions, deleting the account SHALL NOT delete the transactions, and those transactions SHALL have their account reference marked as deleted.

**Validates: Requirements 2.9**

### Property 8: Account Icon Mapping

_For any_ account type, the displayed icon SHALL match the predefined icon mapping for that type.

**Validates: Requirements 2.10**

### Property 9: Balance Consistency

_For any_ account with initial balance B and a sequence of transactions T1...Tn, the final balance SHALL equal B + sum(balanceChange(Ti)) where balanceChange is calculated based on transaction type and account type (asset vs liability).

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 10: Net Worth Calculation

_For any_ set of accounts, the net worth SHALL equal the sum of all asset account balances (banking, cash, investment) minus the sum of all liability account balances (credit_card, loan).

**Validates: Requirements 3.5**

### Property 11: Balance Color Coding

_For any_ account balance, the display color SHALL be green if balance >= 0 and red if balance < 0.

**Validates: Requirements 3.6**

### Property 12: Reconciliation Creates Adjustment

_For any_ account reconciliation from balance B1 to B2, an adjustment transaction SHALL be created with amount equal to |B2 - B1|.

**Validates: Requirements 3.8**

### Property 13: Account Dropdown Content

_For any_ set of user accounts, the transaction modal account dropdown SHALL list all accounts grouped by type, with each item displaying account name, mask (if present), and current balance.

**Validates: Requirements 4.2, 4.3**

### Property 14: Transaction Account Persistence

_For any_ transaction created with an accountId, retrieving that transaction SHALL return the same accountId.

**Validates: Requirements 4.5**

### Property 15: Transaction Account Filtering

_For any_ account filter selection, the returned transactions SHALL only include transactions where accountId matches one of the selected accounts OR accountId is null (if "No account" is selected).

**Validates: Requirements 4.7**

### Property 16: Last Account Preference

_For any_ transaction saved with an account, the next transaction modal opened SHALL pre-select that account (if preference is enabled).

**Validates: Requirements 4.8**

### Property 17: Connected Account Default Tracking

_For any_ newly connected account via Plaid, the isTracked field SHALL default to true.

**Validates: Requirements 5.3**

### Property 18: Untracked Account Budget Exclusion

_For any_ account marked as untracked, its transactions SHALL NOT be included in budget category totals or overall budget calculations.

**Validates: Requirements 5.4, 5.7**

### Property 19: Untracked Account Display

_For any_ account marked as untracked, it SHALL still appear in the Accounts page with its balance displayed.

**Validates: Requirements 5.5**

### Property 20: Account Mapping Persistence

_For any_ account mapping change (nickname, tracking status, type), the change SHALL be persisted and retrievable after page refresh.

**Validates: Requirements 5.9**

### Property 21: Sidebar Active State

_For any_ navigation path, exactly one sidebar navigation item SHALL be highlighted as active, matching the current route.

**Validates: Requirements 6.3**

### Property 22: Sidebar Collapse Persistence

_For any_ sidebar collapse/expand action, the state SHALL be persisted and restored on page refresh.

**Validates: Requirements 6.9**

### Property 23: Account Card Content Completeness

_For any_ account, the account card SHALL display all required fields: icon, nickname, institution (if present), mask (if present), balance, connection status, and tracking status.

**Validates: Requirements 8.2**

### Property 24: Transaction Account Display

_For any_ transaction in the list, if it has an associated account, the account icon and name SHALL be displayed; if it has no account, "Unassigned" or a generic icon SHALL be displayed.

**Validates: Requirements 9.1, 9.2**

### Property 25: Multi-Account Filter

_For any_ multi-select account filter with accounts A1...An, the returned transactions SHALL include only transactions where accountId is in {A1...An} or accountId is null (if included).

**Validates: Requirements 9.4**

### Property 26: Export Includes Account

_For any_ transaction export, each transaction row SHALL include the account name (or "Unassigned" if no account).

**Validates: Requirements 9.6**

### Property 27: Backward Compatibility - Optional AccountId

_For any_ transaction created without an accountId, the transaction SHALL be saved successfully and retrievable.

**Validates: Requirements 10.1, 10.5, 10.6**

---

## Error Handling

### Account Operations

| Error Scenario                          | Response             | User Message                               |
| --------------------------------------- | -------------------- | ------------------------------------------ |
| Create account with duplicate nickname  | 409 Conflict         | "An account with this name already exists" |
| Delete account with active transactions | 200 OK (soft delete) | "Account deleted. Transactions preserved." |
| Update non-existent account             | 404 Not Found        | "Account not found"                        |
| Invalid account type                    | 400 Bad Request      | "Invalid account type"                     |
| Balance reconciliation fails            | 500 Error            | "Failed to reconcile. Please try again."   |

### Transaction Operations

| Error Scenario                     | Response         | User Message                                     |
| ---------------------------------- | ---------------- | ------------------------------------------------ |
| Transaction with invalid accountId | 400 Bad Request  | "Selected account not found"                     |
| Batch save partial failure         | 207 Multi-Status | "X of Y transactions saved. Retry failed items." |
| Account balance update fails       | 500 Error        | "Transaction saved but balance update failed"    |

### Navigation

| Error Scenario           | Response            | User Message                           |
| ------------------------ | ------------------- | -------------------------------------- |
| Sidebar state save fails | Silent retry        | (No user message, retry in background) |
| Invalid route            | Redirect to /budget | (Redirect to default page)             |

---

## Testing Strategy

### Unit Tests

Unit tests should focus on specific examples and edge cases:

1. **Balance Calculations**
   - Asset account + income = increased balance
   - Asset account + expense = decreased balance
   - Liability account + expense = increased balance (debt)
   - Liability account + income = decreased balance (payment)
   - Zero amount transactions
   - Negative balance scenarios

2. **Account Type Validation**
   - Valid type/subtype combinations
   - Invalid type/subtype combinations
   - Icon mapping for each type

3. **Form Validation**
   - Required field validation
   - Balance format validation
   - Currency validation

4. **Sidebar Navigation**
   - Route matching for active state
   - Collapse/expand toggle
   - Mobile responsive behavior

### Property-Based Tests

Property-based tests should verify universal properties across all inputs. Use fast-check library for JavaScript/TypeScript.

**Configuration**: Minimum 100 iterations per property test.

1. **Balance Consistency Property Test**
   - Generate random accounts and transaction sequences
   - Verify final balance matches expected calculation
   - Tag: **Feature: enhanced-accounts-transactions, Property 9: Balance Consistency**

2. **Account CRUD Round-Trip Property Test**
   - Generate random valid account data
   - Create, retrieve, verify equivalence
   - Tag: **Feature: enhanced-accounts-transactions, Property 5: Account CRUD Round-Trip**

3. **Net Worth Calculation Property Test**
   - Generate random sets of accounts with various types
   - Verify net worth = assets - liabilities
   - Tag: **Feature: enhanced-accounts-transactions, Property 10: Net Worth Calculation**

4. **Transaction Filter Property Test**
   - Generate random transactions with various accounts
   - Apply random account filters
   - Verify only matching transactions returned
   - Tag: **Feature: enhanced-accounts-transactions, Property 15: Transaction Account Filtering**

5. **Batch Mode Context Preservation Property Test**
   - Generate random transaction sequences in batch mode
   - Verify type and account preserved between entries
   - Tag: **Feature: enhanced-accounts-transactions, Property 2: Batch Mode Context Preservation**

6. **Account Grouping Property Test**
   - Generate random accounts of various types
   - Verify each account appears in exactly one group
   - Tag: **Feature: enhanced-accounts-transactions, Property 6: Account Grouping Consistency**

### Integration Tests

1. **Account Lifecycle**
   - Create manual account → Add transactions → Edit account → Reconcile → Delete
   - Verify balance updates at each step

2. **Plaid Account Mapping**
   - Connect via Plaid → Map accounts → Toggle tracking → Verify budget calculations

3. **Batch Transaction Entry**
   - Open modal → Add 5 transactions in batch → Verify all saved → Verify counter

4. **Navigation Flow**
   - Navigate between all sidebar items → Verify active states → Collapse/expand → Verify persistence

### E2E Tests (Playwright)

1. **Complete Account Setup Flow**
   - Login → Navigate to Accounts → Add manual account → Verify display

2. **Transaction with Account Flow**
   - Add account → Add transaction with account → Verify balance update → Verify transaction list

3. **Sidebar Navigation Flow**
   - Navigate all sections → Verify content loads → Test mobile hamburger menu

---

## Security Considerations

1. **Data Isolation**: All account queries filtered by familyId to prevent cross-family data access
2. **Balance Visibility**: Account balances only visible to authenticated family members
3. **Plaid Token Security**: Access tokens stored in AWS Secrets Manager, never exposed to frontend
4. **Input Validation**: All account inputs validated server-side before persistence
5. **Audit Logging**: Account creation, deletion, and reconciliation logged for audit trail

---

## Performance Considerations

1. **Account List Caching**: Cache account list in React Query with 5-minute stale time
2. **Balance Updates**: Optimistic updates for balance changes, reconcile on error
3. **Sidebar State**: Store collapse state in localStorage for instant restore
4. **Lazy Loading**: Load account transactions on-demand when viewing account details
5. **Batch Operations**: Use DynamoDB batch write for bulk account operations
