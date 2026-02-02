# Budget Lambda Function

**Version**: 1.2.0
**Last Updated**: 2026-02-01

## Overview

The Budget Lambda function handles all budget-related operations for BudgetBuddy, including:

- Budget CRUD operations (Create, Read, Update, Delete)
- Zero-based budgeting calculations
- Category management with rollover support
- Month-to-month budget transitions with recurring items

## Features

### Core Budget Management

- Create budgets for specific months (YYYY-MM format)
- Retrieve budgets by month or list all budgets
- Update budget categories and amounts
- Delete budgets (soft delete for audit trail)

### Zero-Based Budgeting

The function implements zero-based budgeting where:

- `remainingBalance = totalIncome - totalSavings - totalExpenses`
- Goal is to have remainingBalance = 0 (every dollar assigned)

### Rollover Budgets (v1.2.0)

Categories now support rollover functionality:

| Field             | Type    | Description                                                     |
| ----------------- | ------- | --------------------------------------------------------------- |
| `rolloverEnabled` | Boolean | Whether unused budget rolls over to next month (default: false) |
| `rolloverAmount`  | Number  | Current rollover amount from previous months (default: 0)       |
| `rolloverCap`     | Number  | Maximum rollover amount allowed (optional)                      |

**Rollover Calculation** (implemented in Task 1.2):

```
Available = Planned + Rollover - Spent
Next Month Rollover = min(rolloverCap, currentRollover + (planned - spent))
```

## API Endpoints

| Method | Path                               | Description                |
| ------ | ---------------------------------- | -------------------------- |
| GET    | `/budget/health`                   | Health check               |
| GET    | `/budget`                          | List all budgets           |
| GET    | `/budget/current?month=YYYY-MM`    | Get current month's budget |
| GET    | `/budget/{budgetId}?month=YYYY-MM` | Get specific budget        |
| POST   | `/budget`                          | Create new budget          |
| PUT    | `/budget/{budgetId}`               | Update budget              |
| DELETE | `/budget/{budgetId}?month=YYYY-MM` | Delete budget              |

## Data Model

### Budget Structure

```javascript
{
  PK: "FAMILY#<familyId>",
  SK: "BUDGET#<month>",
  entityType: "BUDGET",
  budgetId: string,
  familyId: string,
  month: string,           // YYYY-MM format
  currency: string,        // ISO 4217 code
  totalIncome: number,
  totalSavings: number,
  totalExpenses: number,
  remainingBalance: number,
  totalRollover: number,   // Sum of all category rollovers
  groups: {
    income: CategoryGroup[],
    savings: CategoryGroup[],
    expenses: CategoryGroup[]
  },
  isAIGenerated: boolean,
  createdAt: string,
  updatedAt: string
}
```

### Category Structure

```javascript
{
  id: string,
  name: string,
  plannedAmount: number,
  spentAmount: number,
  remainingAmount: number,
  // Rollover fields (v1.2.0)
  rolloverEnabled: boolean,
  rolloverAmount: number,
  rolloverCap?: number     // Optional
}
```

## Testing

Run tests:

```bash
npm test
```

Test files:

- `budget.test.js` - Core budget CRUD tests
- `rollover.test.js` - Rollover feature tests
- `permission.test.js` - Permission/authorization tests
- `budget-familyid-validation.test.js` - FamilyId validation tests

## Dependencies

- `/opt/nodejs/utils` - Common utilities (DynamoDB helpers, logger, etc.)
- `/opt/nodejs/shared` - Shared utilities (permission checking)

## Changelog

### v1.2.0 (2026-02-01)

- Added rollover budget support (rolloverEnabled, rolloverAmount, rolloverCap)
- Added totalRollover field to budget response
- Added normalization functions for category rollover fields
- Added rollover.test.js with 9 new tests

### v1.1.0 (2026-01-15)

- Encoding fixes and manual deployment trigger

### v1.0.0 (Initial)

- Core budget CRUD operations
- Zero-based budgeting calculations
- Month transition with recurring items
