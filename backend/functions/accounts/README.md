# Accounts Lambda Function

Handles account management operations for BudgetBuddy, including manual account creation, balance tracking, and reconciliation.

## Overview

This Lambda function provides CRUD operations for financial accounts. It supports:

- **Manual accounts**: User-created accounts (checking, savings, credit cards, cash, investments, loans)
- **Connected accounts**: Bank accounts linked via Plaid (managed separately but stored here)

## API Endpoints

| Method | Endpoint                  | Description                         |
| ------ | ------------------------- | ----------------------------------- |
| GET    | `/accounts`               | List all accounts for the family    |
| GET    | `/accounts/summary`       | Get accounts summary with net worth |
| GET    | `/accounts/:id`           | Get a single account                |
| POST   | `/accounts`               | Create a new manual account         |
| PUT    | `/accounts/:id`           | Update an account                   |
| DELETE | `/accounts/:id`           | Delete a manual account             |
| POST   | `/accounts/:id/reconcile` | Reconcile account balance           |
| PUT    | `/accounts/:id/tracking`  | Toggle budget tracking              |

## Account Types

| Type          | Subtypes                                          | Category  |
| ------------- | ------------------------------------------------- | --------- |
| `banking`     | checking, savings, money_market                   | Asset     |
| `cash`        | cash, digital_wallet                              | Asset     |
| `investment`  | brokerage, retirement_401k, ira, other_investment | Asset     |
| `credit_card` | credit_card, store_card                           | Liability |
| `loan`        | mortgage, auto_loan, student_loan, personal_loan  | Liability |

## Data Model

```javascript
{
  accountId: "acc-uuid",
  familyId: "family-uuid",
  accountType: "banking",
  accountSubtype: "checking",
  nickname: "Main Checking",
  institutionName: "Chase Bank",
  mask: "4567",
  currentBalance: 5432.10,
  currency: "USD",
  isManual: true,
  isTracked: true,
  plaidAccountId: null,
  plaidItemId: null,
  lastSynced: null,
  lastReconciled: "2026-02-01T10:00:00Z",
  createdAt: "2026-01-15T08:00:00Z",
  updatedAt: "2026-02-01T10:00:00Z"
}
```

## Balance Calculation

When transactions are associated with accounts, balances are updated automatically:

- **Asset accounts** (banking, cash, investment):
  - Income: +amount (increases balance)
  - Expense: -amount (decreases balance)

- **Liability accounts** (credit_card, loan):
  - Income: -amount (payment reduces debt)
  - Expense: +amount (charge increases debt)

## Permissions

| Action    | Required Permission |
| --------- | ------------------- |
| List/View | `account:view`      |
| Create    | `account:create`    |
| Update    | `account:edit`      |
| Delete    | `account:delete`    |

## Related Requirements

- Requirement 2: Manual Account Management
- Requirement 3: Account Balance Tracking
- Requirement 4: Account Selection in Transactions
- Requirement 5: Connected Account Mapping
