# Requirements: Goals — Borrowed & Lent Tracking

## Introduction

Extends the Goals feature with Borrowed and Lent sub-types, allowing users to track informal loans using the existing goal infrastructure. No new DynamoDB entity or Lambda is required.

## Requirements

### Requirement 1: Tabbed Navigation on Goals Page

**User Story:** As a user, I want to switch between Goals, Borrowed, and Lent views, so that I can manage different tracking contexts separately.

#### Acceptance Criteria

1. THE GoalsPage SHALL display three tabs: Goals, Borrowed, Lent.
2. WHEN the Goals tab is active, THE system SHALL show only goals where `subType` is `undefined` or `'goal'`.
3. WHEN the Borrowed tab is active, THE system SHALL show only goals where `subType === 'borrowed'`.
4. WHEN the Lent tab is active, THE system SHALL show only goals where `subType === 'lent'`.
5. Each tab SHALL display a count badge showing the number of items in that category.

### Requirement 2: Create Borrowed / Lent Record

**User Story:** As a user, I want to record money I borrowed or lent, so that I can track repayment progress.

#### Acceptance Criteria

1. WHEN the user navigates to `/goals/borrow-lend/new?type=borrowed`, THE system SHALL show a form for recording borrowed money.
2. WHEN the user navigates to `/goals/borrow-lend/new?type=lent`, THE system SHALL show a form for recording lent money.
3. THE form SHALL collect: description, amount, counterparty name, and optional due date.
4. WHEN submitted, THE system SHALL create a GOAL# record with `subType: 'borrowed'` or `subType: 'lent'`.
5. THE existing GOAL# DynamoDB key is reused — no new entity type required.

### Requirement 3: Progress Tracking

**User Story:** As a user, I want to track how much of a borrowed/lent amount has been repaid.

#### Acceptance Criteria

1. Borrowed/lent goals SHALL use `currentAmount` to track repayment progress, same as regular goals.
2. WHEN `currentAmount >= targetAmount`, THE system SHALL show the record as fully settled.
3. THE user SHALL be able to add a contribution (partial repayment) using the existing goal contribution flow.

### Requirement 4: Access Control

**User Story:** As a budget user, I want borrowed/lent records to be budget-scoped.

#### Acceptance Criteria

1. THE system SHALL enforce the same RBAC rules as regular goals.
2. Owner and partner roles may create, edit, and delete. Viewers may only read.
