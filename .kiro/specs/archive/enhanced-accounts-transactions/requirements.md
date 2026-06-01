# Requirements Document: Enhanced Accounts & Transactions

## Introduction

This feature enhances BudgetBuddy with comprehensive account management, batch transaction entry, and improved navigation UX. Users will be able to manually add accounts (checking, savings, credit cards, cash, investment), connect bank accounts via Plaid, specify which account transactions come from, and navigate the app through a modern sidebar navigation instead of relying solely on the FAB menu.

## Glossary

- **Account**: A financial account (bank account, credit card, cash, investment) that holds money or debt
- **Manual_Account**: An account created by the user without bank connection (e.g., cash wallet, manually tracked credit card)
- **Connected_Account**: A bank account linked via Plaid API for automatic transaction import
- **Account_Type**: The category of account (Banking, Cash, Credit_Card, Investment, Loan)
- **Account_Subtype**: The specific type within a category (Checking, Savings, Money_Market for Banking)
- **Account_Balance**: The current balance of an account (positive for assets, negative for liabilities)
- **Transaction**: A single income or expense entry recorded against a budget category
- **Account_Transaction**: A transaction that is associated with a specific account
- **Batch_Entry**: The ability to add multiple transactions consecutively without closing the modal
- **Account_Mapping**: The process of linking connected bank accounts to budget tracking preferences
- **Tracked_Account**: An account whose transactions are included in budget calculations
- **Untracked_Account**: An account excluded from budget tracking (e.g., investment accounts)
- **Sidebar_Navigation**: A persistent navigation panel on the left side of the application
- **FAB**: Floating Action Button - a circular button for quick actions

## Requirements

### Requirement 1: Batch Transaction Entry

**User Story:** As a user, I want to add multiple transactions quickly without closing the modal each time, so that I can efficiently record several purchases or income items in one session.

#### Acceptance Criteria

1. WHEN a user opens the transaction modal, THE System SHALL display a "Create another transaction" checkbox at the bottom of the form
2. WHEN the "Create another transaction" checkbox is checked AND the user submits a transaction, THE System SHALL save the transaction AND keep the modal open with the form cleared for the next entry
3. WHEN the "Create another transaction" checkbox is checked AND a transaction is saved, THE System SHALL preserve the transaction type (income/expense) for the next entry
4. WHEN the "Create another transaction" checkbox is checked AND a transaction is saved, THE System SHALL preserve the selected account for the next entry
5. WHEN the "Create another transaction" checkbox is unchecked AND the user submits a transaction, THE System SHALL save the transaction AND close the modal
6. WHEN batch entry mode is active, THE System SHALL display a count of transactions added in the current session (e.g., "3 transactions added")
7. WHEN batch entry mode is active, THE System SHALL provide a "Done" button to close the modal after adding multiple transactions
8. THE System SHALL clear the amount, description, and date fields after each successful transaction in batch mode
9. WHEN a transaction fails to save in batch mode, THE System SHALL display an error message AND keep the form data intact for retry

---

### Requirement 2: Manual Account Management

**User Story:** As a user, I want to manually add my bank accounts, credit cards, cash accounts, and investment accounts, so that I can track all my finances in one place without requiring bank connections.

#### Acceptance Criteria

1. THE System SHALL provide an "Add Account" button on the Accounts page
2. WHEN a user clicks "Add Account", THE System SHALL display a modal with account type selection
3. THE System SHALL support the following account types:
   - Banking (subtypes: Checking, Savings, Money_Market)
   - Cash (subtypes: Cash, Digital_Wallet)
   - Credit_Card (subtypes: Credit_Card, Store_Card)
   - Investment (subtypes: Brokerage, Retirement_401k, IRA, Other_Investment)
   - Loan (subtypes: Mortgage, Auto_Loan, Student_Loan, Personal_Loan)
4. WHEN a user selects an account type, THE System SHALL display a form with:
   - Institution Name (optional for Cash type)
   - Account Nickname (required)
   - Current Balance (required)
   - Currency (default to user's preferred currency)
5. WHEN a user submits the account form with valid data, THE System SHALL create the account in DynamoDB
6. THE System SHALL display all manual accounts in the Accounts page grouped by account type
7. THE System SHALL allow users to edit manual account details (nickname, balance, institution)
8. THE System SHALL allow users to delete manual accounts with confirmation
9. WHEN a manual account is deleted, THE System SHALL NOT delete associated transactions but SHALL mark them as "account deleted"
10. THE System SHALL display the account icon based on account type (🏦 Banking, 💵 Cash, 💳 Credit_Card, 📈 Investment, 📋 Loan)

---

### Requirement 3: Account Balance Tracking

**User Story:** As a user, I want to see my account balances and have them update when I add transactions, so that I can track my actual financial position.

#### Acceptance Criteria

1. THE System SHALL display the current balance for each account on the Accounts page
2. WHEN a user adds a transaction with an associated account, THE System SHALL update the account balance accordingly:
   - Expense transactions: decrease balance for asset accounts (Banking, Cash), increase balance for liability accounts (Credit_Card, Loan)
   - Income transactions: increase balance for asset accounts
3. WHEN a user edits a transaction amount or account, THE System SHALL recalculate affected account balances
4. WHEN a user deletes a transaction with an associated account, THE System SHALL reverse the balance change
5. THE System SHALL display a total net worth summary (sum of all asset accounts minus all liability accounts)
6. THE System SHALL color-code balances (green for positive, red for negative)
7. THE System SHALL allow users to manually adjust account balances with a "Reconcile" feature
8. WHEN a user reconciles an account, THE System SHALL create an adjustment transaction to match the new balance
9. THE System SHALL display the last reconciliation date for each account

---

### Requirement 4: Account Selection in Transactions

**User Story:** As a user, I want to specify which account each transaction comes from, so that I can track spending across different accounts and maintain accurate account balances.

#### Acceptance Criteria

1. WHEN a user opens the transaction modal, THE System SHALL display an "Account" dropdown field
2. THE Account dropdown SHALL list all user accounts (both manual and connected) grouped by type
3. THE Account dropdown SHALL display account name, last 4 digits (if applicable), and current balance
4. THE System SHALL allow transactions without an account selection (for backward compatibility)
5. WHEN a user selects an account for a transaction, THE System SHALL store the accountId with the transaction
6. THE System SHALL display the account name/icon on transaction list items
7. WHEN filtering transactions, THE System SHALL allow filtering by account
8. THE System SHALL remember the last used account and pre-select it for new transactions (optional user preference)
9. WHEN viewing transaction details, THE System SHALL display the associated account information

---

### Requirement 5: Connected Account Mapping

**User Story:** As a user who connects bank accounts via Plaid, I want to choose which accounts to track for budgeting and map them to my preferences, so that I can exclude investment or savings accounts from my spending budget.

#### Acceptance Criteria

1. WHEN a user connects a bank via Plaid, THE System SHALL display a mapping interface for each discovered account
2. THE mapping interface SHALL allow users to:
   - Enable/disable budget tracking for each account
   - Assign a custom nickname to each account
   - Select the account type category (if different from Plaid's classification)
3. THE System SHALL default new connected accounts to "tracked" status
4. WHEN an account is marked as "untracked", THE System SHALL NOT include its transactions in budget calculations
5. WHEN an account is marked as "untracked", THE System SHALL still display the account and its balance in the Accounts page
6. THE System SHALL allow users to change tracking status at any time from the Accounts page
7. WHEN tracking status changes, THE System SHALL recalculate budget totals to include/exclude relevant transactions
8. THE System SHALL display a visual indicator (badge/icon) showing tracked vs untracked status
9. THE System SHALL persist account mapping preferences in DynamoDB

---

### Requirement 6: Sidebar Navigation

**User Story:** As a user, I want a clear sidebar navigation to access Budget, Accounts, Goals, Insights, and Settings, so that I can easily navigate between different sections of the app without relying on the FAB menu.

#### Acceptance Criteria

1. THE System SHALL display a persistent sidebar navigation on the left side of the application on desktop/tablet
2. THE sidebar SHALL include navigation items for:
   - Budget (home/default view)
   - Accounts
   - Goals
   - Insights
   - Learn (educational content)
   - Settings
3. THE sidebar SHALL highlight the currently active navigation item
4. THE sidebar SHALL display icons and labels for each navigation item
5. THE sidebar SHALL be collapsible to icons-only mode on desktop
6. WHEN the sidebar is collapsed, THE System SHALL show labels on hover
7. ON mobile devices, THE System SHALL hide the sidebar and show a hamburger menu
8. WHEN the hamburger menu is tapped, THE System SHALL display the sidebar as an overlay
9. THE System SHALL persist the sidebar collapsed/expanded state in user preferences
10. THE sidebar SHALL display the user's name/avatar at the top with a dropdown for profile/logout

---

### Requirement 7: Simplified FAB Actions

**User Story:** As a user, I want the floating action button to focus on quick transaction entry only, so that navigation and transaction entry are clearly separated.

#### Acceptance Criteria

1. THE FAB menu SHALL only include transaction-related actions:
   - Add Income
   - Add Expense
   - Scan Receipt
2. THE FAB menu SHALL NOT include navigation items (View Budget, View Goals, View Insights)
3. THE FAB SHALL remain visible on all pages where transactions can be added
4. THE FAB SHALL be positioned in the bottom-right corner (or bottom-left based on user preference)
5. WHEN the FAB is expanded, THE System SHALL display action buttons with clear labels and icons
6. THE FAB SHALL support keyboard shortcuts (Ctrl+N to open, I for income, E for expense)
7. THE FAB SHALL close when clicking outside or pressing Escape

---

### Requirement 8: Accounts Page Enhancement

**User Story:** As a user, I want a comprehensive Accounts page that shows both manual and connected accounts with their balances and management options.

#### Acceptance Criteria

1. THE Accounts page SHALL display accounts in sections:
   - Banking (Checking, Savings, Money Market)
   - Cash
   - Credit Cards
   - Investments
   - Loans
2. EACH account card SHALL display:
   - Account icon (based on type)
   - Account nickname
   - Institution name (if applicable)
   - Last 4 digits (if applicable)
   - Current balance
   - Connection status (Manual or Connected via [Institution])
   - Tracking status badge (Tracked/Untracked)
3. THE Accounts page SHALL display a "Connect Bank" button for Plaid integration
4. THE Accounts page SHALL display an "Add Manual Account" button
5. EACH account card SHALL have a menu with options:
   - Edit (for manual accounts)
   - Reconcile
   - View Transactions
   - Toggle Tracking
   - Delete (for manual accounts) / Unlink (for connected accounts)
6. THE Accounts page SHALL display a summary section showing:
   - Total Assets (sum of Banking + Cash + Investment balances)
   - Total Liabilities (sum of Credit Card + Loan balances)
   - Net Worth (Assets - Liabilities)
7. THE System SHALL allow drag-and-drop reordering of accounts within sections

---

### Requirement 9: Transaction List Account Display

**User Story:** As a user, I want to see which account each transaction is from in the transaction list, so that I can quickly identify the source of each transaction.

#### Acceptance Criteria

1. WHEN displaying transactions in the list, THE System SHALL show the account icon and name for transactions with an associated account
2. THE System SHALL display "No account" or a generic icon for transactions without an account
3. WHEN filtering transactions, THE System SHALL provide an "Account" filter dropdown
4. THE Account filter SHALL support multi-select to show transactions from multiple accounts
5. THE System SHALL allow sorting transactions by account
6. WHEN exporting transactions, THE System SHALL include the account name in the export

---

### Requirement 10: Data Migration for Existing Transactions

**User Story:** As an existing user, I want my current transactions to continue working after the account feature is added, so that I don't lose any data or functionality.

#### Acceptance Criteria

1. THE System SHALL NOT require an account for existing transactions (accountId is optional)
2. THE System SHALL display existing transactions without accounts as "Unassigned" in the account column
3. THE System SHALL allow users to bulk-assign accounts to existing transactions
4. WHEN bulk-assigning accounts, THE System SHALL provide filters to select transactions by date range, category, or description
5. THE System SHALL NOT automatically assign accounts to existing transactions
6. THE System SHALL maintain backward compatibility with all existing transaction APIs

---

### Requirement 11: Account Data Model

**User Story:** As a developer, I want a well-defined data model for accounts, so that the feature can be implemented consistently across frontend and backend.

#### Acceptance Criteria

1. THE Account data model SHALL include:
   - accountId (UUID, primary key)
   - familyId (partition key for multi-tenant isolation)
   - accountType (enum: banking, cash, credit_card, investment, loan)
   - accountSubtype (enum based on type)
   - nickname (string, required)
   - institutionName (string, optional)
   - mask (string, last 4 digits, optional)
   - currentBalance (number)
   - currency (string, default USD)
   - isManual (boolean)
   - isTracked (boolean, default true)
   - plaidAccountId (string, optional, for connected accounts)
   - plaidItemId (string, optional, for connected accounts)
   - lastSynced (ISO date string, optional)
   - lastReconciled (ISO date string, optional)
   - createdAt (ISO date string)
   - updatedAt (ISO date string)
2. THE Transaction data model SHALL be extended with:
   - accountId (string, optional, references Account)
3. THE System SHALL use DynamoDB single-table design with:
   - PK: FAMILY#{familyId}
   - SK: ACCOUNT#{accountId}
4. THE System SHALL create a GSI for querying accounts by type:
   - GSI1PK: FAMILY#{familyId}#ACCOUNTS
   - GSI1SK: {accountType}#{accountId}

## Technical Requirements

### Performance

- Account list load time < 500ms
- Transaction with account save time < 300ms
- Balance recalculation < 200ms
- Sidebar navigation transition < 100ms

### Security

- All account data encrypted at rest in DynamoDB
- Account balances visible only to family members
- Plaid tokens stored in AWS Secrets Manager
- No sensitive account numbers stored (only last 4 digits)

### Accessibility

- Sidebar navigation keyboard accessible (Tab, Enter, Arrow keys)
- Account selection dropdown accessible with screen readers
- Color-coded balances have text alternatives
- FAB actions accessible via keyboard shortcuts

## Success Metrics

- Users can add 5+ transactions in batch mode in < 2 minutes
- 80% of users create at least one manual account within first week
- Average time to navigate between sections < 2 seconds
- Account balance accuracy maintained at 100% after transactions
