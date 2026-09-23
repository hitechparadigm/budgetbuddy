# Requirements: Planned Transactions

## Introduction

Planned transactions let users schedule future income or expenses against budget categories before they occur, giving a forward-looking view of cash flow.

## Requirements

### Requirement 1: View Planned Transactions

**User Story:** As a budget user, I want to see all my planned transactions in one place, so that I can anticipate upcoming cash flow.

#### Acceptance Criteria

1. WHEN the user navigates to `/planned-transactions`, THE system SHALL display all planned transactions for the active budget.
2. WHEN no planned transactions exist, THE system SHALL display an empty state with a prompt to create one.
3. THE system SHALL show name, amount, due date, category, and paid/unpaid status for each item.

### Requirement 2: Create Planned Transaction

**User Story:** As a budget user, I want to create a planned transaction, so that I can track expected future income or expenses.

#### Acceptance Criteria

1. WHEN the user submits the create form with name, amount, due date, and category, THE system SHALL create a `PLANNED_TXN#<id>` record under `BUDGET#<budgetId>` in DynamoDB.
2. THE system SHALL require name, amount (positive number), due date, and category.
3. THE system SHALL default `isPaid` to `false` on creation.

### Requirement 3: Edit and Delete

**User Story:** As a budget user, I want to edit or delete planned transactions, so that I can keep my plan accurate.

#### Acceptance Criteria

1. WHEN the user edits a planned transaction, THE system SHALL update all changed fields in DynamoDB.
2. WHEN the user deletes a planned transaction, THE system SHALL permanently remove it.
3. THE system SHALL require `owner` or `partner` role to create, edit, or delete. Viewers may only read.

### Requirement 4: Mark as Paid

**User Story:** As a budget user, I want to mark a planned transaction as paid, so that I can track execution against my plan.

#### Acceptance Criteria

1. WHEN the user marks a planned transaction as paid, THE system SHALL set `isPaid: true` and record `paidAt` timestamp.
2. THE planned transaction SHALL remain visible after being marked paid, with a visual paid indicator.

### Requirement 5: Budget-Scoped Access Control

**User Story:** As a budget owner, I want planned transactions to be budget-scoped, so that data is isolated per budget.

#### Acceptance Criteria

1. THE system SHALL resolve budget access via `BudgetAccessResolver.resolveAccess(userId, dynamoHelpers)` on every request.
2. IF the user has no active budget, THE system SHALL return 403.
3. Viewers SHALL have read-only access (GET only).
