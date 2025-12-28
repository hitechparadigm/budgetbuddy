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


---

### Requirement 8: Enhanced Month Navigation UI

**User Story:** As a user, I want a cleaner month navigation interface with a dropdown, "Today" button, and arrow controls, so that I can quickly navigate to any month and easily return to the current month.

#### Acceptance Criteria

1. WHEN viewing the budget page, THE BudgetBuddy SHALL display the current month name and year as a large heading (e.g., "December 2025")
2. THE BudgetBuddy SHALL display the remaining budget amount below the month heading (e.g., "$5,700.00 left to budget")
3. THE BudgetBuddy SHALL provide a "Today" button that navigates to the current month
4. THE BudgetBuddy SHALL provide left and right arrow buttons for navigating to previous and next months
5. WHEN viewing a future month, THE BudgetBuddy SHALL display an orange warning badge stating "You are viewing a future month"
6. WHEN viewing a future month with no budget, THE BudgetBuddy SHALL display an empty state with:
   - A circular icon illustration
   - Message: "Hey there, looks like you need a budget for [Month]"
   - Subtext: "We'll copy [Previous Month]'s budget to get you started"
   - Action button: "Start Planning for [Month]"
7. WHEN clicking "Start Planning for [Month]", THE BudgetBuddy SHALL copy the previous month's budget structure (categories and planned amounts) but reset all spent amounts and transactions to zero
8. THE BudgetBuddy SHALL automatically save the new budget to DynamoDB when created
9. THE BudgetBuddy SHALL remove the horizontal month scroll navigation (replaced by dropdown + arrows)
10. THE BudgetBuddy SHALL maintain the current month selection when navigating between months

**Implementation Notes:**
- Replace horizontal month pills with cleaner header design
- Add month dropdown for quick access to any month
- Implement copy-previous-month functionality for future months
- Ensure budget data persists across month changes


---

### Requirement 9: Budget Reset and Recurring Category Settings

**User Story:** As a user, I want to reset my current budget and restart the AI setup process, and I want recurring category settings (like bi-weekly salary) to be preserved when creating future month budgets, so that I don't have to reconfigure recurring items every month.

#### Acceptance Criteria

1. WHEN viewing a budget, THE BudgetBuddy SHALL display a "Reset Budget" button in the header or settings area
2. WHEN clicking "Reset Budget", THE BudgetBuddy SHALL prompt for confirmation before proceeding
3. WHEN confirmed, THE BudgetBuddy SHALL delete the current month's budget and navigate to the AI budget generation flow
4. WHEN a category is marked as recurring (bi-weekly, monthly, etc.), THE BudgetBuddy SHALL store this setting with the category
5. WHEN copying a budget to a future month, THE BudgetBuddy SHALL preserve all recurring settings (frequency, next due date)
6. WHEN copying a budget to a future month, THE BudgetBuddy SHALL only copy categories marked as recurring or manually selected
7. THE BudgetBuddy SHALL NOT automatically create budgets for all future months
8. THE BudgetBuddy SHALL only create a new month's budget when the user clicks "Start Planning for [Month]"
9. WHEN creating a future month budget, THE BudgetBuddy SHALL copy recurring categories from the most recent past month
10. THE BudgetBuddy SHALL calculate the next due date for recurring categories based on their frequency

**Implementation Notes:**
- Add "Reset Budget" button to budget page header
- Store `isRecurring` and `recurringFrequency` fields with each category
- Update `copyPreviousMonthBudget()` to preserve recurring settings
- Add confirmation modal for budget reset
- Navigate to AI budget generation page after reset


---

### Requirement 10: Transaction and Budget Item Clarity

**User Story:** As a user, I want clear distinction between actual transactions and planned budget items, so that I understand whether I'm recording real expenses/income or planning future allocations.

#### Acceptance Criteria

1. WHEN a user adds a transaction via the FAB, THE BudgetBuddy SHALL display a modal title that clearly indicates "Add Actual [Income/Expense]" based on the transaction type
2. WHEN a user clicks "Add Item" in a budget group, THE BudgetBuddy SHALL display a modal title that clearly indicates "Add Planned [Income/Expense] Item"
3. THE BudgetBuddy SHALL use distinct terminology throughout the UI to differentiate between:
   - "Transactions" or "Actual" for recorded income/expenses
   - "Budget Items" or "Planned" for budgeted allocations
4. WHEN displaying the transaction form, THE BudgetBuddy SHALL show "Record Transaction" or similar language indicating actual activity
5. WHEN displaying the budget item form, THE BudgetBuddy SHALL show "Plan Budget Item" or similar language indicating future planning

**Implementation Status**: Not started

---

### Requirement 11: Transaction Date Validation and Warnings

**User Story:** As a user, I want to be warned when adding transactions outside the current budget month, so that I don't accidentally record transactions in the wrong month's budget.

#### Acceptance Criteria

1. WHEN a user selects a transaction date, THE BudgetBuddy SHALL compare it to the currently selected budget month
2. WHEN the selected transaction date is outside the current budget month, THE BudgetBuddy SHALL display a warning message
3. THE warning message SHALL clearly state: "This transaction date ([Date]) is outside the current budget month ([Month Year])"
4. THE BudgetBuddy SHALL provide options to:
   - Continue with the current month (record transaction in current budget)
   - Switch to the correct month (navigate to the month matching the transaction date)
   - Cancel and change the date
5. THE BudgetBuddy SHALL highlight the date field with a warning color (orange/yellow) when the date is outside the current month
6. WHEN a user confirms recording a transaction outside the current month, THE BudgetBuddy SHALL record it in the currently selected budget month
7. THE BudgetBuddy SHALL allow users to dismiss the warning and proceed with their choice

**Implementation Status**: Not started

---

### Requirement 12: Transaction Editing

**User Story:** As a user, I want to edit transactions after I've added them, so that I can correct mistakes or update transaction details without deleting and re-adding.

#### Acceptance Criteria

1. WHEN a user double-clicks on a transaction in the transaction list, THE BudgetBuddy SHALL open the transaction form in edit mode
2. THE BudgetBuddy SHALL pre-populate the transaction form with the existing transaction data
3. THE transaction form title SHALL indicate "Edit Transaction" when in edit mode
4. THE BudgetBuddy SHALL allow users to modify all transaction fields: amount, category, description, merchant, and date
5. WHEN a user saves an edited transaction, THE BudgetBuddy SHALL update the transaction in the database
6. WHEN a transaction's amount or category changes, THE BudgetBuddy SHALL update the affected category's spent amount accordingly
7. WHEN a transaction's category changes, THE BudgetBuddy SHALL:
   - Subtract the amount from the old category's spent amount
   - Add the amount to the new category's spent amount
8. THE BudgetBuddy SHALL provide visual feedback (cursor change) on hover to indicate transactions are clickable
9. THE BudgetBuddy SHALL maintain the existing "Delete" button functionality alongside the double-click edit feature
10. WHEN editing fails, THE BudgetBuddy SHALL display an error message and keep the form open with the user's changes

**Implementation Status**: Not started


---

### Requirement 13: User Timezone and Location Management

**User Story:** As a user, I want the application to use my local timezone so that I see the correct current month and dates, and I want to be able to update my location in settings to adjust my timezone.

#### Acceptance Criteria

1. WHEN a user registers for the first time, THE BudgetBuddy SHALL detect the user's timezone using browser geolocation or timezone API
2. WHEN a user logs in, THE BudgetBuddy SHALL load the user's saved timezone from their profile
3. THE BudgetBuddy SHALL use the user's timezone for all date calculations including:
   - Determining the current month for budget display
   - Displaying transaction dates
   - Calculating month boundaries
   - Showing "Today" in month navigation
4. WHEN determining the current month, THE BudgetBuddy SHALL use the user's local date/time, not UTC or server time
5. THE BudgetBuddy SHALL store the user's timezone in their profile (e.g., "America/New_York", "America/Toronto")
6. THE BudgetBuddy SHALL provide a Settings page where users can update their location
7. WHEN a user updates their location in Settings, THE BudgetBuddy SHALL allow input of:
   - Country
   - City
   - Zip Code or Postal Code
8. WHEN a user updates their location, THE BudgetBuddy SHALL automatically determine and update the timezone based on the location
9. WHEN the timezone changes, THE BudgetBuddy SHALL immediately update all date displays and recalculate the current month
10. THE BudgetBuddy SHALL persist timezone changes to the user's profile in DynamoDB
11. THE BudgetBuddy SHALL handle edge cases such as:
    - Users traveling across timezones
    - Daylight saving time transitions
    - Invalid or ambiguous location data

**Implementation Status**: Not started

**Priority**: High (Bug Fix)

**Notes**:
- Current bug: Application shows December budget on November 30, 2025 at 7:22 PM EST
- Root cause: Application likely using UTC time instead of user's local timezone
- Impact: Users see wrong month, leading to confusion and incorrect budget tracking


---

### Requirement 14: Transaction Date Validation (Critical Bug Fix)

**User Story:** As a user, I want to be warned when adding transactions with dates outside the current budget month, so that I don't accidentally record transactions in the wrong month's budget.

#### Acceptance Criteria

1. WHEN a user enters a transaction date in the transaction modal, THE BudgetBuddy SHALL validate the date against the currently selected budget month
2. WHEN the transaction date is outside the current budget month, THE BudgetBuddy SHALL display a warning message immediately
3. THE warning message SHALL clearly state: "This transaction date ([Month Year]) is outside the current budget month ([Month Year])"
4. THE BudgetBuddy SHALL provide three action options:
   - "Add to Current Month" - Record transaction in currently selected budget month
   - "Switch to [Month]" - Navigate to the month matching the transaction date
   - "Change Date" - Dismiss warning and allow user to modify the date
5. THE BudgetBuddy SHALL highlight the date field with a warning color (orange/yellow border) when the date is outside the current month
6. WHEN a user confirms "Add to Current Month", THE BudgetBuddy SHALL record the transaction in the currently selected budget month
7. WHEN a user selects "Switch to [Month]", THE BudgetBuddy SHALL navigate to the correct month and preserve the transaction form data
8. THE BudgetBuddy SHALL prevent form submission until the user acknowledges the warning by selecting one of the three options
9. WHEN the transaction date is within the current budget month, THE BudgetBuddy SHALL not display any warning
10. THE BudgetBuddy SHALL validate the date in real-time as the user types or selects a date

**Implementation Status**: Not started

**Priority**: Critical (Bug Fix)

**Notes**:
- Current bug: User can add transaction with Dec 2 date while viewing Nov budget, no warning appears
- Impact: Transactions are added to wrong months, causing budget tracking errors
- Root cause: No date validation in transaction modal

---

### Requirement 15: Empty Month Budget Display (Critical Bug Fix)

**User Story:** As a user, I want to see empty budget screens for months where I haven't created budgets, so that I don't see incorrect budget data from other months.

#### Acceptance Criteria

1. WHEN a user navigates to a month without an existing budget, THE BudgetBuddy SHALL display an empty state
2. THE BudgetBuddy SHALL NOT display budget data from other months when viewing a month without a budget
3. WHEN viewing a past month without a budget, THE BudgetBuddy SHALL display a message: "No budget found for [Month Year]"
4. WHEN viewing a future month without a budget, THE BudgetBuddy SHALL display the "Start Planning" empty state with copy previous month option
5. THE BudgetBuddy SHALL only load budget data that matches the exact month being viewed (YYYY-MM format)
6. WHEN switching between months, THE BudgetBuddy SHALL clear the previous month's budget data before loading the new month
7. THE BudgetBuddy SHALL verify that the loaded budget's month field matches the currently selected month
8. WHEN no budget exists for a month, THE BudgetBuddy SHALL set the budget state to null
9. THE BudgetBuddy SHALL NOT automatically create budgets for months that don't have them
10. THE BudgetBuddy SHALL only create a new budget when the user explicitly clicks "Start Planning for [Month]" or adds their first budget item

**Implementation Status**: Not started

**Priority**: Critical (Bug Fix)

**Notes**:
- Current bug: User sees budget data in months where they never created budgets (e.g., seeing budgets in past months before they started using the app)
- Impact: Confusing user experience, incorrect budget tracking, data integrity issues
- Root cause: Budget loading logic not properly filtering by month or showing cached data from other months
- User started budget in November but sees budgets in all past/future months

---

### Requirement 16: AI Budget Persistence After Month Navigation (Critical Bug Fix)

**User Story:** As a user who created an AI budget, I want to see my saved budget when I navigate back to that month, so that I don't have to recreate it every time.

#### Acceptance Criteria

1. WHEN a user creates an AI budget for a month THEN THE BudgetBuddy SHALL save it to DynamoDB with correct PK and SK keys
2. WHEN a user navigates away from a month with a saved budget and returns THEN THE BudgetBuddy SHALL retrieve the budget from DynamoDB
3. WHEN the GET /budget endpoint is called THEN THE BudgetBuddy SHALL return all budgets matching the user's ID
4. WHEN a specific month is requested via GET /budget?month=YYYY-MM THEN THE BudgetBuddy SHALL return only that month's budget
5. WHEN a budget exists in DynamoDB THEN THE BudgetBuddy SHALL NOT return "No budgets exist in backend"
6. WHEN the backend returns a 409 conflict on POST THEN THE BudgetBuddy SHALL treat this as success (budget already exists)
7. WHEN switching months THEN THE BudgetBuddy SHALL clear previous month's budget data before loading new month
8. WHEN loading a budget THEN THE BudgetBuddy SHALL verify the budget's month field matches the requested month
9. WHEN an AI budget is saved successfully THEN THE BudgetBuddy SHALL clear it from localStorage to prevent duplicate saves
10. WHEN the backend GET returns empty array THEN THE BudgetBuddy SHALL check if the response structure is correct before assuming no budgets exist

**Implementation Status**: Not started

**Priority**: Critical (P0 Bug Fix)

**Notes**:
- Current bug: User creates AI budget for November → switches to October → returns to November → gets redirected to onboarding
- Symptom: Budget saves successfully (409 conflict confirms it exists), but GET /budget returns "No budgets exist"
- Impact: Users cannot access their saved AI budgets after navigating between months
- Root cause: Backend GET endpoint not returning saved budgets OR frontend not correctly processing the response
- Expected: User should see their saved budget when returning to the month
