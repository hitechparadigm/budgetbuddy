# BudgetBuddy Requirements Document

**Last Updated**: 2025-12-28
**Status**: Market-Ready MVP Requirements Complete (35 Requirements)
**Scope**: Web Application + Native Mobile Apps (iOS/Android)

## Introduction

BudgetBuddy is a zero-based budgeting application with both web and native mobile apps that helps users manage their monthly finances. The market-ready MVP includes comprehensive budgeting functionality with a clean, EveryDollar-inspired interface, AWS serverless backend, native mobile apps, offline capability, and all essential features needed to compete in the personal finance app market.

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
- **Planned Item**: A budgeted category with an expected amount (e.g., "Salary: $5,000 bi-weekly")
- **Actual Transaction**: A recorded income or expense transaction (e.g., "Received $4,500 salary on Dec 15")
- **Recurring Frequency**: How often a planned item occurs (weekly, bi-weekly, monthly, annually)
- **Recurrence Calculation**: Logic to determine how many occurrences of a recurring item should happen in a given month

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

---

### Requirement 17: Family Management and Auto-Creation 🔧 IN PROGRESS

**User Story:** As a user, I want to have a family automatically created when I register so that I can create budgets immediately, and I want to be able to invite my partner to share the family budget later.

#### Acceptance Criteria

1. ✅ WHEN a user registers, THE BudgetBuddy SHALL automatically create a single-person family with familyId `family_${userId}`
2. ✅ THE BudgetBuddy SHALL assign the user as the primary family member with role 'primary'
3. ✅ THE BudgetBuddy SHALL create a family metadata record with the user's name and member count of 1
4. ✅ THE BudgetBuddy SHALL ensure all new users have a familyId to prevent budget access issues
5. 🔄 WHEN a user wants to invite a partner, THE BudgetBuddy SHALL provide a family invitation system
6. 🔄 WHEN a partner accepts an invitation, THE BudgetBuddy SHALL add them to the existing family
7. 🔄 THE BudgetBuddy SHALL allow both family members to access and modify the shared budget
8. 🔄 THE BudgetBuddy SHALL provide basic family management (view members, transfer ownership, leave family)

**Implementation Status**:

- ✅ **Phase 1 Complete**: Auto-family creation during registration implemented
- 🔄 **Phase 2 Planned**: Partner invitation and family sharing system

**Technical Notes**:

- Family model supports adult users only (no child accounts)
- Maximum 2 adults per family (couples)
- Children are managed within the family budget but don't get separate accounts
- Existing users without families are handled via manual assignment or migration script

**Root Cause of Original Issue**:

- Users registered without familyId assignment
- Budget/transaction APIs require familyId to function
- Users got stuck in onboarding loop unable to create or access budgets
- Solution: Auto-create single-person family during registration process

---

### Requirement 18: Recurring Budget Planning 🔧 NEW

**User Story:** As a user, I want to plan recurring income and expenses (like bi-weekly salary) with specific expected dates, so that the system correctly calculates my total planned amount for the month and clearly distinguishes between what I planned and what I actually received.

#### Acceptance Criteria

1. WHEN a user creates a planned item with bi-weekly frequency, THE System SHALL calculate how many occurrences happen in the current month
2. WHEN a planned item is bi-weekly with $5,000 amount, THE System SHALL show the correct monthly planned total (e.g., $10,000 for a month with 2 pay periods)
3. WHEN a user creates a planned item, THE System SHALL allow specifying the expected date for the first occurrence
4. WHEN a user views a category, THE System SHALL display both the per-occurrence amount and the monthly total
5. THE System SHALL support frequencies: weekly, bi-weekly, monthly, quarterly, annually
6. WHEN calculating monthly totals, THE System SHALL account for partial months and varying month lengths
7. THE System SHALL store the base amount (per occurrence) and calculate monthly totals dynamically
8. WHEN a user edits a recurring item, THE System SHALL update the monthly planned total accordingly
9. THE System SHALL show the specific expected dates for each occurrence within the month (e.g., "Dec 15, Dec 29")

**Implementation Status**: Not started

---

### Requirement 19: Clear Planned vs Actual Display 🔧 NEW

**User Story:** As a user, I want to clearly see the difference between what I planned to receive/spend and what I actually received/spent, so that I can track my budget performance accurately.

#### Acceptance Criteria

1. WHEN viewing a budget category, THE System SHALL display "Planned" and "Actual" columns with clear labels
2. THE System SHALL show planned amounts in one color (e.g., blue) and actual amounts in another color (e.g., green for income, red for expenses)
3. WHEN a category has recurring frequency, THE System SHALL show the frequency indicator (e.g., "🔄 Bi-weekly")
4. THE System SHALL display the per-occurrence amount and total monthly planned amount separately
5. WHEN actual amounts exceed planned amounts, THE System SHALL highlight the difference
6. THE System SHALL calculate and display variance (Actual - Planned) for each category
7. THE System SHALL use consistent terminology throughout the UI: "Planned" vs "Actual", not "Budgeted" vs "Spent"

**Implementation Status**: Not started

---

### Requirement 20: Monthly Recurrence Logic 🔧 NEW

**User Story:** As a system, I want to accurately calculate how many times a recurring item occurs in any given month, so that planned amounts are correct regardless of month length or start dates.

#### Acceptance Criteria

1. WHEN a bi-weekly item starts on January 1st, THE System SHALL correctly calculate occurrences for each subsequent month
2. WHEN a monthly item is planned, THE System SHALL show exactly 1 occurrence per month
3. WHEN a weekly item is planned, THE System SHALL calculate 4-5 occurrences based on the specific month
4. THE System SHALL handle edge cases like February (28/29 days) and months with 5 Fridays
5. WHEN a user changes the start date of a recurring item, THE System SHALL recalculate all future occurrences
6. THE System SHALL store the next expected date for each recurring item
7. WHEN copying budgets to future months, THE System SHALL preserve recurring settings and recalculate amounts
8. WHEN calculating recurring dates across months, THE System SHALL maintain the exact interval (e.g., bi-weekly = every 14 days)
9. WHEN a bi-weekly item occurs on Dec 5 and Dec 19, THE System SHALL correctly calculate the next occurrence as Jan 2
10. THE System SHALL handle recurring items that span month boundaries correctly

**Implementation Status**: Not started

---

### Requirement 21: Budget Item vs Transaction Clarity 🔧 NEW

**User Story:** As a user, I want clear distinction between planning budget items and recording actual transactions, so that I understand whether I'm setting expectations or recording reality.

#### Acceptance Criteria

1. WHEN adding a budget item, THE System SHALL use terminology like "Plan Income Item" or "Plan Expense Item"
2. WHEN adding a budget item, THE System SHALL allow specifying expected dates for when the income/expense will occur
3. WHEN recording a transaction, THE System SHALL use terminology like "Record Actual Income" or "Record Actual Expense"
4. THE System SHALL use different modal titles and button labels for planning vs recording
5. WHEN viewing the budget, THE System SHALL clearly separate planned items from actual transactions
6. THE System SHALL use visual indicators (icons, colors) to distinguish planning from recording
7. WHEN a user hovers over amounts, THE System SHALL show tooltips explaining "Planned" vs "Actual"
8. THE System SHALL provide help text explaining the difference between budget planning and transaction recording
9. WHEN viewing planned items, THE System SHALL show the expected dates alongside the amounts

**Implementation Status**: Not started

---

### Requirement 22: Native Mobile Apps (iOS/Android) 🚨 **2-WEEK MVP PRIORITY**

**User Story:** As a mobile user, I want native iOS and Android apps so that I can manage my budget on-the-go with a fast, responsive mobile experience.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide native iOS and Android applications built with React Native + Expo
2. THE Mobile App SHALL reuse the existing AWS backend APIs without modification
3. THE Mobile App SHALL support all core budget functionality: create budgets, add transactions, view summaries
4. THE Mobile App SHALL provide mobile-optimized navigation with bottom tabs and stack navigation
5. THE Mobile App SHALL handle authentication using the existing Cognito JWT tokens
6. THE Mobile App SHALL work offline for viewing existing budget data and adding transactions
7. THE Mobile App SHALL sync data when internet connection is restored
8. THE Mobile App SHALL provide native mobile UI components (iOS/Android design systems)
9. THE Mobile App SHALL support biometric authentication (Face ID, Touch ID, Fingerprint)
10. THE Mobile App SHALL be deployable to App Store and Google Play Store

**Implementation Status**: Not started
**Priority**: Critical (2-Week MVP)
**Technology**: React Native + Expo

---

### Requirement 23: Mobile-Optimized User Experience 📱 **2-WEEK MVP PRIORITY**

**User Story:** As a mobile user, I want a touch-optimized interface designed for small screens so that I can quickly add transactions and check my budget while on-the-go.

#### Acceptance Criteria

1. THE Mobile App SHALL use bottom tab navigation for main sections (Budget, Transactions, Summary, Settings)
2. THE Mobile App SHALL provide large, touch-friendly buttons and input fields
3. THE Mobile App SHALL use native mobile gestures (swipe, pull-to-refresh, long press)
4. THE Mobile App SHALL optimize the transaction entry flow for speed (minimal taps)
5. THE Mobile App SHALL provide quick-add shortcuts for common transactions
6. THE Mobile App SHALL use mobile-appropriate font sizes and spacing
7. THE Mobile App SHALL handle both portrait and landscape orientations
8. THE Mobile App SHALL provide haptic feedback for user actions
9. THE Mobile App SHALL use native loading states and error messages
10. THE Mobile App SHALL support dark mode based on device settings

**Implementation Status**: Not started
**Priority**: Critical (2-Week MVP)

---

### Requirement 24: Offline Data Capability 🔄 **2-WEEK MVP PRIORITY**

**User Story:** As a mobile user, I want to add transactions and view my budget even without internet connection, so that I can track expenses anywhere.

#### Acceptance Criteria

1. THE Mobile App SHALL store budget and transaction data locally using AsyncStorage
2. THE Mobile App SHALL allow adding transactions while offline
3. THE Mobile App SHALL queue offline transactions for sync when connection is restored
4. THE Mobile App SHALL display cached budget data when offline
5. THE Mobile App SHALL show connection status to the user
6. THE Mobile App SHALL automatically sync data when internet connection is detected
7. THE Mobile App SHALL handle sync conflicts gracefully (offline changes vs server changes)
8. THE Mobile App SHALL provide manual sync option in settings
9. THE Mobile App SHALL work for at least 7 days offline with full functionality
10. THE Mobile App SHALL notify users of pending sync operations

**Implementation Status**: Not started
**Priority**: Critical (2-Week MVP)

---

### Requirement 25: Mobile Security & Authentication 🔒 **2-WEEK MVP PRIORITY**

**User Story:** As a mobile user, I want secure authentication that leverages my device's built-in security so that my financial data is protected without redundant authentication steps.

#### Acceptance Criteria

1. THE Mobile App SHALL rely on device-level security (device unlock with Face ID, Touch ID, PIN, or password)
2. THE Mobile App SHALL securely store JWT tokens using Expo SecureStore (iOS Keychain/Android Keystore)
3. THE Mobile App SHALL handle token refresh automatically in the background
4. THE Mobile App SHALL provide secure logout that clears all local authentication tokens
5. THE Mobile App SHALL clear sensitive data when app is backgrounded (privacy screen)
6. THE Mobile App SHALL validate JWT tokens on app startup and redirect to login if expired
7. THE Mobile App SHALL use HTTPS for all API communications
8. THE Mobile App SHALL implement proper certificate pinning for API security
9. THE Mobile App SHALL comply with mobile security best practices (OWASP Mobile Top 10)
10. THE Mobile App SHALL provide "Stay logged in" option that respects JWT token expiration

**Rationale**: Device-level biometric authentication (Face ID/Touch ID/PIN) already provides secure access to the device. Adding app-level biometric authentication would create redundant friction and poor user experience. Users cannot access the app without first unlocking their device, making additional biometric prompts unnecessary.

**Implementation Status**: Partially complete (JWT token storage implemented)
**Priority**: Critical (2-Week MVP)

---

### Requirement 26: Data Export and Backup 🚨 **ESSENTIAL**

**User Story:** As a user, I want to export my budget data and create backups so that I can access my financial information outside the app and ensure I never lose my data.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide CSV export for all budget data (categories, transactions, summaries)
2. THE BudgetBuddy SHALL provide PDF export for monthly budget reports
3. THE BudgetBuddy SHALL allow users to export data for specific date ranges
4. THE BudgetBuddy SHALL provide full data backup in JSON format
5. THE BudgetBuddy SHALL allow users to restore data from backup files
6. THE BudgetBuddy SHALL include all user data in exports (budgets, transactions, categories, settings)
7. THE BudgetBuddy SHALL format exported data in standard, readable formats
8. THE BudgetBuddy SHALL provide export functionality in both web and mobile apps
9. THE BudgetBuddy SHALL allow scheduled automatic backups (weekly/monthly)
10. THE BudgetBuddy SHALL notify users before data deletion with export option

**Implementation Status**: Not started
**Priority**: Critical (Essential for user trust)

---

### Requirement 27: Onboarding and Tutorial 📱 **HIGH PRIORITY**

**User Story:** As a new user, I want guided onboarding and tutorials so that I can quickly understand how to use the app and set up my first budget effectively.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide an interactive tutorial for first-time users
2. THE BudgetBuddy SHALL offer a sample budget with pre-filled categories and transactions
3. THE BudgetBuddy SHALL guide users through creating their first budget step-by-step
4. THE BudgetBuddy SHALL provide contextual help tooltips throughout the app
5. THE BudgetBuddy SHALL offer a "Getting Started" guide accessible from settings
6. THE BudgetBuddy SHALL highlight key features during the first few sessions
7. THE BudgetBuddy SHALL provide video tutorials or animated guides for complex features
8. THE BudgetBuddy SHALL allow users to skip or replay tutorial sections
9. THE BudgetBuddy SHALL track onboarding completion and offer help for incomplete steps
10. THE BudgetBuddy SHALL provide different onboarding flows for web vs mobile

**Implementation Status**: Not started
**Priority**: High (User Experience)

---

### Requirement 28: Search and Filtering 📱 **HIGH PRIORITY**

**User Story:** As a user with many transactions, I want to search and filter my financial data so that I can quickly find specific transactions or analyze spending patterns.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide search functionality for transactions by description, amount, or category
2. THE BudgetBuddy SHALL allow filtering transactions by date range
3. THE BudgetBuddy SHALL allow filtering transactions by category or budget group
4. THE BudgetBuddy SHALL allow filtering transactions by amount range (min/max)
5. THE BudgetBuddy SHALL provide search functionality for budget categories
6. THE BudgetBuddy SHALL show search results with highlighting of matched terms
7. THE BudgetBuddy SHALL provide recent searches and search suggestions
8. THE BudgetBuddy SHALL allow combining multiple filters (date + category + amount)
9. THE BudgetBuddy SHALL provide quick filter buttons for common searches (this month, last month, overspent)
10. THE BudgetBuddy SHALL maintain search/filter state when navigating between screens

**Implementation Status**: Not started
**Priority**: High (Essential for users with many transactions)

---

### Requirement 29: Notifications and Reminders 📱 **HIGH PRIORITY**

**User Story:** As a user, I want notifications and reminders so that I stay aware of my budget status and don't miss important financial deadlines.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL send push notifications when categories are overspent
2. THE BudgetBuddy SHALL send budget alerts when approaching spending limits (80%, 90%, 100%)
3. THE BudgetBuddy SHALL provide bill reminders for recurring planned items
4. THE BudgetBuddy SHALL send monthly budget summary notifications
5. THE BudgetBuddy SHALL allow users to customize notification preferences
6. THE BudgetBuddy SHALL provide in-app notifications for important events
7. THE BudgetBuddy SHALL send reminders to add transactions if none recorded for 3+ days
8. THE BudgetBuddy SHALL notify users of large transactions (user-defined threshold)
9. THE BudgetBuddy SHALL provide weekly spending summary notifications
10. THE BudgetBuddy SHALL allow users to disable specific notification types
11. THE BudgetBuddy SHALL send daily expense reminder notifications at user-configurable times
12. THE BudgetBuddy SHALL allow users to set custom daily reminder times (default 7:00 PM)
13. THE BudgetBuddy SHALL respect quiet hours settings for daily expense reminders

**Implementation Status**: Not started
**Priority**: High (Critical for engagement)

---

### Requirement 30: Multi-Currency Support 📱 **HIGH PRIORITY**

**User Story:** As an international user, I want to use my local currency and handle multiple currencies so that I can track my finances accurately regardless of my location.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL support major currencies (USD, EUR, GBP, CAD, AUD, JPY)
2. THE BudgetBuddy SHALL allow users to select their primary currency during onboarding
3. THE BudgetBuddy SHALL display all amounts in the user's selected currency
4. THE BudgetBuddy SHALL provide currency conversion for multi-currency transactions
5. THE BudgetBuddy SHALL update exchange rates daily from a reliable source
6. THE BudgetBuddy SHALL allow users to change their primary currency in settings
7. THE BudgetBuddy SHALL handle currency formatting according to locale (symbols, decimal places)
8. THE BudgetBuddy SHALL provide exchange rate information for converted transactions
9. THE BudgetBuddy SHALL support offline currency conversion using cached rates
10. THE BudgetBuddy SHALL allow manual exchange rate entry when automatic rates unavailable

**Implementation Status**: Not started
**Priority**: High (Global market requirement)

---

### Requirement 31: Basic Reporting and Analytics 📊 **MEDIUM PRIORITY**

**User Story:** As a user, I want basic reports and spending insights so that I can understand my financial patterns and make better budgeting decisions.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide monthly spending comparison (current vs previous months)
2. THE BudgetBuddy SHALL show spending trends for the last 3-6 months
3. THE BudgetBuddy SHALL display top spending categories with percentages
4. THE BudgetBuddy SHALL provide income vs expenses summary charts
5. THE BudgetBuddy SHALL show budget performance metrics (planned vs actual)
6. THE BudgetBuddy SHALL highlight unusual spending patterns or large transactions
7. THE BudgetBuddy SHALL provide category-wise spending trends over time
8. THE BudgetBuddy SHALL show savings rate and emergency fund progress
9. THE BudgetBuddy SHALL provide simple financial insights and recommendations
10. THE BudgetBuddy SHALL allow exporting reports as PDF or images

**Implementation Status**: Not started
**Priority**: Medium (Competitive feature)

---

### Requirement 32: Advanced Category Management 📊 **MEDIUM PRIORITY**

**User Story:** As a user, I want advanced category management options so that I can organize my budget in a way that matches my personal financial structure.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL allow users to create custom budget categories
2. THE BudgetBuddy SHALL provide a library of common category templates
3. THE BudgetBuddy SHALL allow users to customize category icons and colors
4. THE BudgetBuddy SHALL support subcategories for detailed expense tracking
5. THE BudgetBuddy SHALL allow merging and splitting categories
6. THE BudgetBuddy SHALL provide category usage analytics (frequency, amounts)
7. THE BudgetBuddy SHALL allow hiding/archiving unused categories
8. THE BudgetBuddy SHALL support category budgets with rollover options
9. THE BudgetBuddy SHALL allow bulk category operations (delete, merge, edit)
10. THE BudgetBuddy SHALL maintain category history when categories are modified

**Implementation Status**: Not started
**Priority**: Medium (User personalization)

---

### Requirement 33: Quick Actions and Shortcuts 📊 **MEDIUM PRIORITY**

**User Story:** As a frequent user, I want quick actions and shortcuts so that I can perform common tasks faster and more efficiently.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide quick-add buttons for recent transactions
2. THE BudgetBuddy SHALL show favorite categories for faster transaction entry
3. THE BudgetBuddy SHALL provide transaction templates for recurring expenses
4. THE BudgetBuddy SHALL offer swipe gestures for common actions (delete, edit, duplicate)
5. THE BudgetBuddy SHALL provide keyboard shortcuts for web app power users
6. THE BudgetBuddy SHALL show recent transactions for quick duplication
7. THE BudgetBuddy SHALL provide bulk transaction operations (select multiple, bulk edit)
8. THE BudgetBuddy SHALL offer voice input for transaction descriptions (mobile)
9. THE BudgetBuddy SHALL provide camera integration for receipt scanning (future)
10. THE BudgetBuddy SHALL remember user preferences for faster workflows

**Implementation Status**: Not started
**Priority**: Medium (Speed and efficiency)

---

### Requirement 34: Enhanced Security and Privacy 🔒 **HIGH PRIORITY**

**User Story:** As a user storing sensitive financial data, I want enhanced security and privacy controls so that my information is protected and I have control over my data.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide two-factor authentication (2FA) options
2. THE BudgetBuddy SHALL offer session management with device tracking
3. THE BudgetBuddy SHALL provide privacy screen when app is backgrounded
4. THE BudgetBuddy SHALL allow users to delete their account and all data
5. THE BudgetBuddy SHALL provide data download before account deletion
6. THE BudgetBuddy SHALL encrypt sensitive data at rest and in transit
7. THE BudgetBuddy SHALL provide security audit logs for user review
8. THE BudgetBuddy SHALL offer privacy settings for data sharing preferences
9. THE BudgetBuddy SHALL comply with GDPR, CCPA, and other privacy regulations
10. THE BudgetBuddy SHALL provide transparent privacy policy and data usage information

**Implementation Status**: Not started
**Priority**: High (Security and compliance)

---

### Requirement 35: Freemium Business Model 💰 **MEDIUM PRIORITY**

**User Story:** As a business, I want a sustainable freemium model so that I can offer value to free users while generating revenue from premium features.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide a free tier with core budgeting functionality
2. THE BudgetBuddy SHALL limit free users to 3 budgets and 100 transactions per month
3. THE BudgetBuddy SHALL offer premium subscription with unlimited budgets and transactions
4. THE BudgetBuddy SHALL provide premium features: advanced reports, data export, multi-currency
5. THE BudgetBuddy SHALL offer family sharing as a premium feature
6. THE BudgetBuddy SHALL provide clear upgrade prompts without being intrusive
7. THE BudgetBuddy SHALL offer monthly and annual subscription options
8. THE BudgetBuddy SHALL provide free trial period for premium features
9. THE BudgetBuddy SHALL handle subscription management and billing
10. THE BudgetBuddy SHALL maintain feature parity between web and mobile for premium users

**Implementation Status**: Not started
**Priority**: Medium (Business sustainability)

## Updated Success Metrics for Market-Ready MVP

- **User Acquisition**: 1000+ downloads in first month
- **User Retention**: 40%+ monthly active users after 3 months
- **Core Functionality**: User can complete full budget cycle in < 5 minutes
- **Mobile Performance**: App loads in < 3 seconds, 60fps animations
- **Offline Capability**: 7+ days offline functionality without data loss
- **Security**: Zero security incidents, 100% data encryption
- **Export/Backup**: 95%+ successful data exports
- **Multi-Platform**: Feature parity between web and mobile (95%+)
- **Premium Conversion**: 5%+ free-to-premium conversion rate
- **App Store Rating**: 4.0+ stars on both iOS and Android

## Implementation Priority for 2-Week MVP

### **Week 1 Focus (Critical)**

- Requirements 22-25: Mobile apps, offline capability, security
- Core recurring budget planning (Requirements 18-21)

### **Week 2 Focus (High Priority)**

- Requirements 26-27: Data export, onboarding
- Requirements 28-30: Search, notifications, multi-currency (basic)

### **Post-MVP (Medium Priority)**

- Requirements 31-35: Advanced features, business model

## This comprehensive set of 35 requirements now covers all aspects needed for a market-ready MVP that can compete with established personal finance apps.

### Requirement 36: Calendar View for Expenses 📅 **HIGH PRIORITY**

**User Story:** As a user, I want to view my expenses in a calendar format so that I can see spending patterns over time and identify specific dates with high or unusual spending.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide a calendar view showing expenses by date
2. THE BudgetBuddy SHALL display daily spending totals on each calendar date
3. THE BudgetBuddy SHALL allow users to click on dates to see detailed transactions
4. THE BudgetBuddy SHALL use color coding to indicate spending levels (low, medium, high)
5. THE BudgetBuddy SHALL show monthly spending trends in the calendar view
6. THE BudgetBuddy SHALL allow filtering calendar view by category or amount range
7. THE BudgetBuddy SHALL support both monthly and weekly calendar layouts
8. THE BudgetBuddy SHALL highlight recurring transaction dates
9. THE BudgetBuddy SHALL show budget vs actual spending for each day
10. THE BudgetBuddy SHALL provide calendar navigation between months and years

**Implementation Status**: Not started
**Priority**: High (User Experience)

---

### Requirement 37: Bank Account Integration with AI Categorization 🏦 **HIGH PRIORITY**

**User Story:** As a user, I want to connect my bank accounts and automatically import transactions with AI-powered categorization so that I don't have to manually enter every transaction.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL integrate with major banks using Open Banking APIs or Plaid
2. THE BudgetBuddy SHALL securely connect to user bank accounts with proper authentication
3. THE BudgetBuddy SHALL automatically download new transactions daily
4. THE BudgetBuddy SHALL use AI to categorize transactions based on merchant and description
5. THE BudgetBuddy SHALL learn from user corrections to improve categorization accuracy
6. THE BudgetBuddy SHALL suggest categories based on merchant patterns (e.g., Costco → Groceries)
7. THE BudgetBuddy SHALL allow users to review and approve imported transactions
8. THE BudgetBuddy SHALL handle duplicate transaction detection and prevention
9. THE BudgetBuddy SHALL support multiple bank accounts per user
10. THE BudgetBuddy SHALL provide transaction matching with existing manual entries

**Implementation Status**: Not started
**Priority**: High (Automation and convenience)

---

### Requirement 38: AI-Powered Insights and Analytics 🤖 **HIGH PRIORITY**

**User Story:** As a user, I want AI-powered insights about my spending patterns so that I can make better financial decisions and optimize my budget.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL analyze spending patterns and provide personalized insights
2. THE BudgetBuddy SHALL identify unusual spending and alert users to potential issues
3. THE BudgetBuddy SHALL suggest budget optimizations based on spending history
4. THE BudgetBuddy SHALL predict future spending based on historical patterns
5. THE BudgetBuddy SHALL provide seasonal spending analysis and recommendations
6. THE BudgetBuddy SHALL identify opportunities for savings in different categories
7. THE BudgetBuddy SHALL compare user spending to similar demographic groups
8. THE BudgetBuddy SHALL provide goal-based recommendations (e.g., saving for vacation)
9. THE BudgetBuddy SHALL generate monthly financial health reports
10. THE BudgetBuddy SHALL use natural language to explain insights in plain English

**Implementation Status**: Not started
**Priority**: High (Competitive differentiation)

---

### Requirement 39: AI-Powered Onboarding with Location-Based Suggestions 🎯 **HIGH PRIORITY**

**User Story:** As a new user, I want AI to help me set up my budget by suggesting relevant expense categories based on my location and family situation so that I can get started quickly with a personalized budget.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL use AI to suggest expense categories based on user location
2. THE BudgetBuddy SHALL customize category suggestions based on family size and composition
3. THE BudgetBuddy SHALL provide location-specific cost estimates (e.g., average rent in user's city)
4. THE BudgetBuddy SHALL suggest local services and typical expenses for the area
5. THE BudgetBuddy SHALL adapt suggestions based on urban vs rural location
6. THE BudgetBuddy SHALL provide climate-based expense suggestions (heating, cooling costs)
7. THE BudgetBuddy SHALL suggest transportation options based on location (public transit, car expenses)
8. THE BudgetBuddy SHALL customize entertainment and dining suggestions for local culture
9. THE BudgetBuddy SHALL provide realistic budget amounts based on local cost of living
10. THE BudgetBuddy SHALL learn from user selections to improve future suggestions

**Implementation Status**: Not started
**Priority**: High (User onboarding experience)

---

### Requirement 40: Google Account Authentication 🔐 **HIGH PRIORITY**

**User Story:** As a user, I want to log in with my Google account so that I can access the app quickly without creating a separate password.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide Google Sign-In option on login screen
2. THE BudgetBuddy SHALL integrate with Google OAuth 2.0 for secure authentication
3. THE BudgetBuddy SHALL automatically create user profile from Google account information
4. THE BudgetBuddy SHALL support Google Sign-In on both web and mobile platforms
5. THE BudgetBuddy SHALL handle Google account linking with existing email accounts
6. THE BudgetBuddy SHALL provide option to unlink Google account in settings
7. THE BudgetBuddy SHALL maintain session consistency across Google authentication
8. THE BudgetBuddy SHALL handle Google account permission changes gracefully
9. THE BudgetBuddy SHALL support Google Sign-In alongside existing email/password authentication
10. THE BudgetBuddy SHALL comply with Google's authentication and privacy requirements

**Implementation Status**: Not started
**Priority**: High (User convenience and adoption)

---

### Requirement 41: Admin Dashboard and User Management 🔧 **HIGH PRIORITY**

**User Story:** As an administrator, I want a comprehensive admin dashboard so that I can manage users, monitor system health, handle support requests, and maintain the platform effectively.

#### Acceptance Criteria

1. THE BudgetBuddy SHALL provide a secure admin dashboard accessible only to authorized administrators
2. THE Admin Dashboard SHALL display user management functionality including user search, account status, and basic user information
3. THE Admin Dashboard SHALL allow administrators to view user account details, registration date, last login, and subscription status
4. THE Admin Dashboard SHALL provide user account actions: disable/enable accounts, reset passwords, and delete accounts
5. THE Admin Dashboard SHALL display system metrics: total users, active users, new registrations, subscription conversions
6. THE Admin Dashboard SHALL show platform health metrics: API response times, error rates, database performance
7. THE Admin Dashboard SHALL provide support ticket management for user inquiries and issues
8. THE Admin Dashboard SHALL allow administrators to send system-wide notifications or maintenance alerts
9. THE Admin Dashboard SHALL provide audit logs for all administrative actions with timestamps and admin user tracking
10. THE Admin Dashboard SHALL include data export capabilities for user data, system metrics, and compliance reporting
11. THE Admin Dashboard SHALL support role-based access control (super admin, support admin, read-only admin)
12. THE Admin Dashboard SHALL provide subscription management: view plans, process refunds, handle billing issues
13. THE Admin Dashboard SHALL display usage analytics: feature adoption, user engagement, retention metrics
14. THE Admin Dashboard SHALL allow bulk user operations: bulk email, account migrations, data cleanup
15. THE Admin Dashboard SHALL provide real-time monitoring alerts for system issues, security events, and critical errors

**Implementation Status**: Not started
**Priority**: High (Platform management and support)

---

### Requirement 42: Fix Onboarding Budget Creation Month Mismatch 🚨 **CRITICAL BUG FIX**

**User Story:** As a user completing onboarding, I want my budget to be created for the correct month I'm viewing, so that I can immediately see and use my budget after onboarding.

#### Acceptance Criteria

1. WHEN a user completes onboarding with currentMonth "2026-01", THE Onboarding_Service SHALL create a budget with month field "2026-01"
2. WHEN the Frontend_App sends currentMonth parameter, THE Onboarding_Service SHALL use that exact value without modification
3. WHEN a budget is created during onboarding, THE Budget_Service SHALL store it with the month field matching the frontend request
4. WHEN a user navigates to the budget page after onboarding, THE Frontend_App SHALL find and display the budget for the current month
5. IF there is any date/month manipulation in the backend, THEN THE Onboarding_Service SHALL log the transformation for debugging
6. WHEN the onboarding endpoint receives a request, THE Onboarding_Service SHALL log the complete request body with month verification
7. WHEN creating a budget during onboarding, THE Onboarding_Service SHALL log the exact budget object being saved to DynamoDB
8. WHEN a budget creation fails, THE Onboarding_Service SHALL return a descriptive error message to the frontend
9. THE system SHALL validate that month strings follow YYYY-MM format before processing
10. WHEN storing budgets in the database, THE Budget_Service SHALL preserve the original month string format

**Implementation Status**: Not started
**Priority**: Critical (P0 Bug Fix)

**Root Cause**: Frontend correctly sends "2026-01" but budget is being created with "2026-02" month field, causing mismatch when user tries to view their budget.

---

### Requirement 43: Add User Logout Functionality 🚨 **CRITICAL MISSING FEATURE**

**User Story:** As a logged-in user, I want to be able to log out of the application, so that I can secure my account and switch users if needed.

#### Acceptance Criteria

1. WHEN a user is on the budget page, THE Frontend_App SHALL display a logout button or menu option in the header
2. WHEN a user clicks the logout option, THE Frontend_App SHALL clear all authentication tokens from localStorage
3. WHEN logout is triggered, THE Frontend_App SHALL redirect the user to the login page
4. WHEN a user logs out, THE Frontend_App SHALL clear any cached user data from local storage
5. THE logout functionality SHALL be accessible from all authenticated pages
6. THE logout button SHALL be clearly visible and easily accessible (not hidden in deep menus)
7. WHEN logout is successful, THE Frontend_App SHALL show a confirmation message
8. THE logout functionality SHALL work consistently across all browsers and devices
9. WHEN a user logs out, THE Frontend_App SHALL invalidate any active sessions
10. THE logout button SHALL be styled consistently with the application's design system

**Implementation Status**: Not started
**Priority**: Critical (Essential Security Feature)

**Current Issue**: No visible logout option on budget page, users cannot log out of the application.

---

### Requirement 44: Improve Onboarding Error Handling and User Feedback 🔧 **HIGH PRIORITY**

**User Story:** As a user going through onboarding, I want clear feedback when something goes wrong, so that I can understand what happened and take appropriate action.

#### Acceptance Criteria

1. WHEN the frontend receives an onboarding error, THE Frontend_App SHALL display the specific error message to the user
2. WHEN onboarding appears successful but budget is not found, THE Frontend_App SHALL provide actionable error messages
3. WHEN a budget creation fails during onboarding, THE Frontend_App SHALL offer retry options
4. WHEN there are network issues during onboarding, THE Frontend_App SHALL provide clear guidance
5. THE Frontend_App SHALL distinguish between different types of errors (network, validation, server)
6. WHEN onboarding fails, THE Frontend_App SHALL preserve user input so they don't have to re-enter everything
7. THE Frontend_App SHALL provide a "Contact Support" option when critical errors occur
8. WHEN debugging is needed, THE Frontend_App SHALL provide a way to copy error details for support
9. THE error messages SHALL be user-friendly and avoid technical jargon
10. THE Frontend_App SHALL track onboarding completion status to prevent users from getting stuck

**Implementation Status**: Not started
**Priority**: High (User Experience)

---

### Requirement 45: Validate Month Consistency Across Services 🔧 **HIGH PRIORITY**

**User Story:** As a system administrator, I want to ensure month values remain consistent between frontend and backend services, so that budget operations work reliably.

#### Acceptance Criteria

1. WHEN the Frontend_App calculates the current month, THE system SHALL use timezone-aware calculations
2. WHEN passing month values between services, THE system SHALL maintain exact string format without conversion
3. WHEN retrieving budgets, THE Budget_Service SHALL return month values in the same format they were stored
4. THE system SHALL validate month format consistency at API boundaries
5. WHEN month mismatches are detected, THE system SHALL log detailed debugging information
6. THE system SHALL provide clear error messages when month format validation fails
7. WHEN debugging month issues, THE system SHALL log timezone information and date calculations
8. THE system SHALL handle edge cases like timezone boundaries and daylight saving time
9. THE system SHALL provide tools for administrators to diagnose month-related issues
10. THE system SHALL maintain audit logs of month-related operations for troubleshooting

**Implementation Status**: Not started
**Priority**: High (System Reliability)

---

### Requirement 46: Fix Family ID Mismatch Between Auth and Budget Services 🔧 **CRITICAL P0 BUG FIX**

**User Story:** As a user completing onboarding, I want my AI-generated budget to be accessible immediately after creation, so that I can start managing my finances without technical issues.

#### Acceptance Criteria

1. WHEN the Auth_Service creates a budget during onboarding, THE system SHALL use the familyId from the user's DynamoDB profile
2. WHEN the Budget_Service retrieves budgets, THE system SHALL use the same familyId resolution method as the Auth_Service
3. WHEN a user's JWT token lacks custom:familyId, THE system SHALL lookup familyId from the user's DynamoDB profile consistently across all services
4. WHEN familyId lookup fails, THE system SHALL use a consistent fallback pattern (`family_${userId}`) across all services
5. THE Auth_Service and Budget_Service SHALL use identical familyId resolution logic to prevent partition key mismatches
6. WHEN a budget is created during onboarding, THE system SHALL immediately verify the budget exists in DynamoDB using the same keys
7. WHEN budget creation fails, THE system SHALL return an error response and prevent onboarding completion
8. WHEN budget verification fails, THE system SHALL log detailed error information including exact PK/SK values used
9. THE onboarding endpoint SHALL return the exact familyId and month used for budget creation for debugging
10. THE system SHALL log both the creation and verification steps with consistent identifiers to enable troubleshooting

**Root Cause Analysis**:

- Auth service creates budgets using `familyId` from user's DynamoDB profile: `FAMILY#family_user_1767574326611_5kyfa7d61`
- Budget service queries using `familyId` from JWT (often null) or fallback: `FAMILY#family_94c8e448-3021-702b-57bb-6eaac79e1ab0`
- Different partition keys result in "No budgets exist in backend" despite successful budget creation
- Issue persists after previous partial fixes in v1.18.11

**Implementation Status**: Not started
**Priority**: Critical P0 (Blocks user onboarding completion)
**Impact**: Users cannot access AI-generated budgets after completing onboarding
**Troubleshooting Duration**: 2+ days of investigation and partial fixes

---

### Requirement 42: Data Export and Backup System 📊 **HIGH PRIORITY**

**User Story:** As a user, I want to export my budget data in multiple formats and create comprehensive backups, so that I can analyze my finances in external tools and ensure my data is never lost.

#### Acceptance Criteria

1. WHEN a user requests CSV export, THE Export_Service SHALL generate a CSV file containing all budget categories and transactions with proper formatting
2. WHEN exporting to CSV, THE Export_Service SHALL include columns for date, category, description, amount, type (income/expense), budget month, and transaction ID
3. WHEN a user requests PDF export, THE PDF_Generator SHALL create a formatted monthly budget report with visual charts and summaries
4. WHEN generating PDF reports, THE PDF_Generator SHALL include budget vs actual comparisons, category breakdowns, and spending trends
5. THE Export_Service SHALL allow users to select specific date ranges for data export (last month, last 3 months, last year, custom range)
6. THE Export_Service SHALL provide comprehensive data backup in JSON format including all user data (budgets, transactions, categories, settings)
7. WHEN creating backups, THE Backup_System SHALL include metadata such as backup date, user ID, data version, and file integrity checksums
8. THE Backup_System SHALL provide restore functionality to import data from backup files with validation and conflict resolution
9. THE Export_Service SHALL ensure only authenticated users can export their own data with proper security validation
10. THE Export_Service SHALL complete large dataset exports (1000+ transactions) within 30 seconds and provide progress indicators

**Implementation Status**: Not started
**Priority**: High (Essential for user trust and data portability)
**Technology**: Node.js PDF generation, CSV formatting, S3 temporary storage

---

### Requirement 43: Multi-Currency Support System 🌍 **HIGH PRIORITY**

**User Story:** As an international user, I want to use my local currency and handle transactions in multiple currencies, so that I can accurately track my finances regardless of location or travel.

#### Acceptance Criteria

1. THE Currency_Service SHALL support major world currencies (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY, INR, BRL)
2. WHEN a user registers, THE System SHALL allow selection of primary currency during onboarding with automatic detection based on location
3. THE Currency_Service SHALL fetch daily exchange rates from a reliable financial data provider (e.g., ExchangeRate-API, Fixer.io)
4. WHEN displaying amounts, THE System SHALL format currency according to locale standards (symbols, decimal places, thousand separators)
5. THE System SHALL allow users to add transactions in different currencies with automatic conversion to primary currency
6. WHEN converting currencies, THE System SHALL store both original amount/currency and converted amount with exchange rate used
7. THE System SHALL provide offline currency conversion using cached exchange rates (updated within 24 hours)
8. THE System SHALL allow users to change their primary currency in settings with historical data conversion options
9. THE System SHALL display exchange rate information and conversion details for multi-currency transactions
10. THE System SHALL handle currency conversion for budget planning and reporting with clear indicators of converted amounts

**Implementation Status**: Not started
**Priority**: High (Global market requirement)
**Technology**: External exchange rate API, currency formatting libraries

---

### Requirement 44: Push Notifications and Reminders System 📱 **HIGH PRIORITY**

**User Story:** As a mobile user, I want intelligent notifications and reminders about my budget status, so that I stay on track with my financial goals without being overwhelmed by alerts.

#### Acceptance Criteria

1. THE Notification_Service SHALL send push notifications when budget categories exceed 80%, 90%, and 100% of planned amounts
2. THE Notification_Service SHALL provide daily expense reminder notifications at user-configurable times (default 7:00 PM)
3. WHEN users haven't recorded transactions for 3+ consecutive days, THE System SHALL send gentle reminder notifications
4. THE Notification_Service SHALL send monthly budget summary notifications with key metrics and insights
5. THE System SHALL allow users to customize notification preferences for each type of alert (budget alerts, reminders, summaries)
6. THE Notification_Service SHALL respect quiet hours settings and user timezone for notification timing
7. THE System SHALL provide in-app notifications for important events (budget overspending, large transactions, sync issues)
8. THE Notification_Service SHALL send bill reminders for recurring planned items based on expected dates
9. THE System SHALL allow users to set custom spending thresholds for large transaction alerts
10. THE Notification_Service SHALL provide weekly spending summary notifications with category breakdowns and trends

**Implementation Status**: Not started
**Priority**: High (User engagement and retention)
**Technology**: AWS SNS, Expo Push Notifications, EventBridge scheduling
