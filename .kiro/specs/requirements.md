# BudgetBuddy Requirements Document

**Last Updated**: 2025-11-21
**Status**: MVP Complete (99%)
**Scope**: Web Application (Desktop/Tablet/Landscape)

## Introduction

BudgetBuddy is a zero-based budgeting web application that helps users manage their monthly finances. The MVP focuses on core budgeting functionality with a clean, EveryDollar-inspired interface, AWS serverless backend, and comprehensive budget tracking capabilities.

## Glossary

- **BudgetBuddy**: The web application for personal budget management
- **User**: An authenticated person using the application to manage their finances
- **Budget**: A monthly financial plan with income, savings, and expense categories
- **Category**: A spending or income classification (e.g., Salary, Groceries, Rent)
- **Transaction**: A single income or expense entry recorded against a category
- **Zero-Based Budgeting**: Financial planning where Income - Savings - Expenses = 0
- **Planned Amount**: The budgeted amount for a category
- **Spent Amount**: The actual amount spent/received in a category
- **Budget Group**: A collection of categories (Income, Savings, or Expenses)

## Requirements

### Requirement 1: User Authentication ✅ COMPLETE

**User Story:** As a user, I want to securely register and log in to my account, so that my budget data is protected and accessible only to me.

#### Acceptance Criteria

1. ✅ WHEN a user accesses the application, THE BudgetBuddy SHALL display a login/register interface
2. ✅ THE BudgetBuddy SHALL collect email and password for registration
3. ✅ THE BudgetBuddy SHALL validate email format and password strength (minimum 8 characters)
4. ✅ WHEN a user registers, THE BudgetBuddy SHALL create an account in AWS Cognito
5. ✅ WHEN a user logs in, THE BudgetBuddy SHALL authenticate via Cognito and issue JWT tokens
6. ✅ THE BudgetBuddy SHALL store access token, refresh token, and ID token securely
7. ✅ THE BudgetBuddy SHALL automatically refresh expired tokens
8. ✅ THE BudgetBuddy SHALL protect all budget routes requiring authentication

**Implementation Status**: Complete with AWS Cognito integration, JWT token management, and protected routes.

---

### Requirement 2: Budget Creation and Management ✅ COMPLETE

**User Story:** As a user, I want to create and manage monthly budgets with income, savings, and expense categories, so that I can plan my finances effectively.

#### Acceptance Criteria

1. ✅ THE BudgetBuddy SHALL display a three-column layout: sidebar navigation, budget categories, and transactions/summary
2. ✅ THE BudgetBuddy SHALL organize budget into three groups: Income, Savings, and Expenses
3. ✅ WHEN a user clicks "+ Add Item" under any group, THE BudgetBuddy SHALL open a modal to create a new category
4. ✅ THE BudgetBuddy SHALL allow users to specify category name, icon (emoji), and planned amount
5. ✅ THE BudgetBuddy SHALL support recurring categories with frequencies: weekly, bi-weekly, monthly, annually
6. ✅ WHEN a user hovers over a category, THE BudgetBuddy SHALL show edit and delete buttons
7. ✅ THE BudgetBuddy SHALL display planned vs spent amounts for each category
8. ✅ THE BudgetBuddy SHALL calculate and display total income, total planned, total spent, and remaining budget
9. ✅ THE BudgetBuddy SHALL follow zero-based budgeting principles (Income - Planned = Remaining)
10. ✅ THE BudgetBuddy SHALL persist budget data to DynamoDB via API
11. ✅ THE BudgetBuddy SHALL highlight overspent categories with red background and border

**Implementation Status**: Complete with full CRUD operations, DynamoDB persistence, and visual indicators.

---

### Requirement 3: Transaction Recording and Tracking ✅ COMPLETE

**User Story:** As a user, I want to record actual income and expenses against my planned budget categories, so that I can track my spending and see how I'm doing against my plan.

#### Acceptance Criteria

1. ✅ WHEN a user clicks the floating action button (FAB), THE BudgetBuddy SHALL show Income and Expense options
2. ✅ WHEN a user selects Income or Expense, THE BudgetBuddy SHALL open a transaction modal
3. ✅ THE BudgetBuddy SHALL allow users to select a category, enter amount, description, and date
4. ✅ WHEN a user submits a transaction, THE BudgetBuddy SHALL update the category's spent amount
5. ✅ THE BudgetBuddy SHALL display all transactions in the right sidebar with category, amount, and date
6. ✅ THE BudgetBuddy SHALL show income transactions with green color and expense transactions with red color
7. ✅ THE BudgetBuddy SHALL allow users to delete transactions
8. ✅ WHEN a transaction is deleted, THE BudgetBuddy SHALL update the category's spent amount accordingly
9. ✅ THE BudgetBuddy SHALL persist all transactions to DynamoDB
10. ✅ THE BudgetBuddy SHALL display "No transactions yet" message when no transactions exist

**Implementation Status**: Complete with full transaction CRUD, automatic budget updates, and visual categorization.

---

### Requirement 4: Month Navigation ✅ COMPLETE

**User Story:** As a user, I want to navigate between different months to view and manage budgets for past, current, and future months.

#### Acceptance Criteria

1. ✅ THE BudgetBuddy SHALL display a month navigation bar with 7 months visible (3 before, current, 3 after)
2. ✅ THE BudgetBuddy SHALL highlight the currently selected month with green border and larger size
3. ✅ WHEN a user clicks a different month, THE BudgetBuddy SHALL load that month's budget
4. ✅ THE BudgetBuddy SHALL display previous and next arrow buttons for month navigation
5. ✅ THE BudgetBuddy SHALL show the current month's remaining budget amount
6. ✅ THE BudgetBuddy SHALL handle year boundaries correctly (e.g., December to January)
7. ✅ THE BudgetBuddy SHALL display year when it differs from the current month's year
8. ✅ THE BudgetBuddy SHALL center the month navigation on the page
9. ✅ THE BudgetBuddy SHALL prevent layout jumping when switching months
10. ✅ THE BudgetBuddy SHALL allow only one month to be selected at a time

**Implementation Status**: Complete with fixed date calculations, centered layout, and smooth transitions.

---

### Requirement 5: Budget Summary and Visualization ✅ COMPLETE

**User Story:** As a user, I want to see a visual summary of my budget with charts and breakdowns, so that I can quickly understand my financial situation.

#### Acceptance Criteria

1. ✅ THE BudgetBuddy SHALL provide a Summary tab in the right sidebar
2. ✅ THE BudgetBuddy SHALL display a circular progress chart showing income
3. ✅ THE BudgetBuddy SHALL show three key metrics: Planned, Spent, and Remaining
4. ✅ THE BudgetBuddy SHALL display a color-coded category breakdown with percentages
5. ✅ THE BudgetBuddy SHALL show detailed category information with spent vs planned amounts
6. ✅ THE BudgetBuddy SHALL highlight overspent categories in red
7. ✅ THE BudgetBuddy SHALL group categories by budget group (Savings, Expenses)
8. ✅ THE BudgetBuddy SHALL allow users to toggle between Summary and Transactions views
9. ✅ THE BudgetBuddy SHALL display percentage spent for each category

**Implementation Status**: Complete with visual charts, color-coded breakdowns, and detailed category views.

---

### Requirement 6: Responsive Design ✅ COMPLETE

**User Story:** As a user on different devices, I want the application to work well on desktop, tablet, and landscape mobile, so that I can manage my budget from any device.

#### Acceptance Criteria

1. ✅ THE BudgetBuddy SHALL display a collapsible sidebar on tablet and mobile devices
2. ✅ THE BudgetBuddy SHALL show a hamburger menu button on smaller screens
3. ✅ THE BudgetBuddy SHALL hide the right sidebar on mobile and show it on desktop
4. ✅ THE BudgetBuddy SHALL adjust column layouts for different screen sizes
5. ✅ THE BudgetBuddy SHALL provide horizontal scrolling for month navigation on mobile
6. ✅ THE BudgetBuddy SHALL maintain functionality across all supported screen sizes
7. ✅ THE BudgetBuddy SHALL use responsive text sizes and spacing
8. ✅ THE BudgetBuddy SHALL show mobile-optimized header with centered month display

**Implementation Status**: Complete with responsive breakpoints, collapsible navigation, and mobile-optimized layouts.

---

### Requirement 7: Data Persistence and API Integration ✅ COMPLETE

**User Story:** As a user, I want my budget data to be saved automatically and available across sessions, so that I don't lose my work.

#### Acceptance Criteria

1. ✅ THE BudgetBuddy SHALL save all budget changes to AWS DynamoDB via API Gateway
2. ✅ THE BudgetBuddy SHALL load budget data from the backend on page load
3. ✅ THE BudgetBuddy SHALL handle API errors gracefully with user-friendly messages
4. ✅ THE BudgetBuddy SHALL include authentication tokens in all API requests
5. ✅ THE BudgetBuddy SHALL support multiple budgets per user (one per month)
6. ✅ THE BudgetBuddy SHALL create new budgets automatically when switching to a month without a budget
7. ✅ THE BudgetBuddy SHALL update budgets in real-time as users make changes
8. ✅ THE BudgetBuddy SHALL handle concurrent updates safely

**Implementation Status**: Complete with full API integration, DynamoDB persistence, and error handling.

---

## Out of Scope (Future Enhancements)

The following features are not included in the current MVP:

1. **AI Budget Generation**: Automated budget creation based on user profile
2. **Family Account Sharing**: Multi-user collaboration on shared budgets
3. **Mobile Native Apps**: iOS and Android applications (web-only for MVP)
4. **Premium Features**: Subscription tiers and payment integration
5. **Bank Account Integration**: Automatic transaction import
6. **Reporting and Analytics**: Historical trends and spending analysis
7. **Goal Tracking**: Savings goals and debt payoff planning
8. **Bill Reminders**: Notifications for upcoming bills
9. **Receipt Scanning**: OCR for receipt capture
10. **Export Functionality**: PDF or CSV export of budgets

## Technical Requirements

### Performance
- Page load time < 2 seconds
- API response time < 500ms
- Smooth animations and transitions (60fps)

### Security
- All API requests authenticated with JWT tokens
- HTTPS only for all communications
- Secure token storage in localStorage
- Automatic token refresh before expiration

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Accessibility
- Keyboard navigation support
- ARIA labels for screen readers
- Sufficient color contrast ratios
- Focus indicators on interactive elements

## Success Metrics

- User can create first budget in < 2 minutes
- User can add transaction in < 30 seconds
- 99.9% API uptime
- < 1% error rate on API calls
- Zero data loss incidents
