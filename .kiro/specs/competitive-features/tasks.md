# Competitive Features - Implementation Tasks

**Last Updated**: 2026-02-01
**Status**: Ready for Implementation
**Spec**: `.kiro/specs/competitive-features/`

## Phase 1: Quick Wins (Weeks 1-3)

### Task 1: Rollover Budgets (Requirement 40)

- [x] 1.1 Backend: Add rollover fields to budget category schema
  - Add `rolloverEnabled`, `rolloverAmount`, `rolloverCap` fields
  - Update DynamoDB schema documentation
  - **Validates: Requirement 40.1, 40.2**

- [x] 1.2 Backend: Implement rollover calculation in month transition
  - Modify `createBudgetWithRecurringItems()` in `backend/functions/budget/index.js`
  - Calculate rollover: `rollover + (planned - spent)`, respect cap
  - Handle overspent categories (negative rollover)
  - **Validates: Requirement 40.4, 40.5**

- [x] 1.3 Backend: Add rollover API endpoints
  - `PUT /budget/categories/{id}/rollover` - Enable/disable rollover
  - `PUT /budget/categories/{id}/rollover/reset` - Reset rollover to 0
  - **Validates: Requirement 40.7**

- [x] 1.4 Frontend Web: Add rollover toggle to budget category
  - Add toggle switch in category edit modal
  - Display rollover amount separately from planned
  - Show available = planned + rollover - spent
  - **Validates: Requirement 40.2, 40.3, 40.4**

- [x] 1.5 Frontend Mobile: Add rollover toggle to budget category
  - Mirror web implementation in React Native
  - **Validates: Requirement 40.2, 40.3, 40.4**

- [x] 1.6 Property Test: Rollover calculation correctness
  - Rollover never negative (unless overspent)
  - Rollover respects cap when set
  - Year-end rollover works correctly
  - **Validates: Requirement 40.5, 40.8, 40.10**

### Task 2: Bill Reminders (Requirement 36)

- [x] 2.1 Backend: Create bills Lambda function
  - Create `backend/functions/bills/` directory
  - Implement CRUD operations for bills
  - Store in DynamoDB with `BILL#<billId>` sort key
  - **Validates: Requirement 36.1, 36.2**

- [x] 2.2 Backend: Implement bill notification scheduler
  - Extend daily-reminders Lambda to check bills
  - Send notifications at 7, 3, 0 days before due
  - **Validates: Requirement 36.5**

- [x] 2.3 Backend: Implement mark-as-paid with auto-transaction
  - `PUT /bills/{id}/paid` endpoint
  - Optionally create transaction when marked paid
  - **Validates: Requirement 36.6, 36.7**

- [x] 2.4 Backend: Add bills to CDK stack
  - Add Lambda function to api-stack.ts
  - Configure IAM permissions
  - Add API Gateway routes
  - **Validates: Requirement 36**

- [x] 2.5 Frontend Web: Create BillsPage component
  - List bills sorted by due date
  - Show days until due, payment status
  - One-tap mark as paid
  - **Validates: Requirement 36.3, 36.4, 36.6**

- [x] 2.6 Frontend Web: Add bill creation form
  - Name, amount, due date, frequency
  - Category selection
  - Reminder preferences
  - **Validates: Requirement 36.1, 36.8**

- [x] 2.7 Frontend Mobile: Create BillsScreen
  - Mirror web implementation
  - Calendar view of upcoming bills
  - **Validates: Requirement 36.9**

- [x] 2.8 Unit Tests: Bill reminder timing
  - Test notification scheduling logic
  - Test recurring bill date calculations
  - **Validates: Requirement 36.5, 36.8**

### Task 3: Savings Goals (Requirement 38)

- [x] 3.1 Backend: Create goals Lambda function
  - Create `backend/functions/goals/` directory (extend existing if present)
  - Implement CRUD for goals
  - Store with `GOAL#<goalId>` sort key
  - **Validates: Requirement 38.1**

- [x] 3.2 Backend: Implement goal contribution logic
  - Manual contributions endpoint
  - Auto-link category transactions to goals
  - Calculate required monthly savings
  - **Validates: Requirement 38.4, 38.5, 38.3**

- [x] 3.3 Backend: Implement goal reordering
  - `PUT /goals/reorder` endpoint
  - Update priority field for drag-and-drop
  - **Validates: Requirement 38.7**

- [-] 3.4 Backend: Add goal milestone notifications
  - Extend notifications for 25%, 50%, 75%, 100% milestones
  - Weekly progress updates
  - **Validates: Requirement 38.8**

- [x] 3.5 Frontend Web: Create GoalsPage component
  - Goals dashboard with progress bars
  - Current amount, percentage, days remaining
  - **Validates: Requirement 38.2, 38.9**

- [x] 3.6 Frontend Web: Add goal creation/edit form
  - Name, target amount, target date, icon
  - Link to savings category
  - **Validates: Requirement 38.1**

- [ ] 3.7 Frontend Web: Implement drag-and-drop reordering
  - Priority ordering of goals
  - **Validates: Requirement 38.7**

- [x] 3.8 Frontend Mobile: Create GoalsScreen
  - Mirror web implementation
  - Confetti animation on goal completion
  - **Validates: Requirement 38.10**

- [x] 3.9 Property Test: Goal progress calculation
  - Progress percentage = current / target \* 100
  - Required monthly = (target - current) / months remaining
  - **Validates: Requirement 38.2, 38.3**

---

## Phase 2: High-Value Features (Weeks 4-9)

### Task 4: Subscription Tracking (Requirement 35)

- [ ] 4.1 Backend: Create subscriptions Lambda function
  - Create `backend/functions/subscriptions/` directory
  - Implement CRUD operations
  - Store with `SUBSCRIPTION#<subscriptionId>` sort key
  - **Validates: Requirement 35.1, 35.5**

- [ ] 4.2 Backend: Implement subscription detection algorithm
  - Analyze transaction patterns
  - Group by merchant, check intervals (25-35 days)
  - Check amount consistency (±10%)
  - **Validates: Requirement 35.2**

- [ ] 4.3 Backend: Add subscription renewal notifications
  - 3 days before renewal notification
  - Price increase alerts
  - **Validates: Requirement 35.6, 35.10**

- [ ] 4.4 Frontend Web: Create SubscriptionsPage
  - List all subscriptions with details
  - Total monthly cost
  - Status badges (keep/review/cancel)
  - **Validates: Requirement 35.1, 35.3, 35.4, 35.7**

- [ ] 4.5 Frontend Web: Add manual subscription form
  - For subscriptions not auto-detected
  - **Validates: Requirement 35.5**

- [ ] 4.6 Frontend Mobile: Create SubscriptionsScreen
  - Mirror web implementation
  - **Validates: Requirement 35**

- [ ] 4.7 Property Test: Subscription detection accuracy
  - Detected subscriptions match recurring patterns
  - No false positives for one-time purchases
  - **Validates: Requirement 35.2**

### Task 5: Debt Payoff Calculator (Requirement 37)

- [ ] 5.1 Backend: Create debt-payoff Lambda function
  - Create `backend/functions/debt-payoff/` directory
  - Implement CRUD for debts
  - Store with `DEBT#<debtId>` sort key
  - **Validates: Requirement 37.1, 37.2**

- [ ] 5.2 Backend: Implement payoff calculation algorithms
  - Snowball method (smallest balance first)
  - Avalanche method (highest interest first)
  - Calculate total interest, payoff date
  - **Validates: Requirement 37.3, 37.4**

- [ ] 5.3 Backend: Implement extra payment recalculation
  - Recalculate payoff date with extra payments
  - Calculate interest saved
  - **Validates: Requirement 37.6, 37.7**

- [ ] 5.4 Frontend Web: Create DebtPayoffPage
  - List debts with details
  - Strategy selector (snowball/avalanche)
  - Payoff timeline visualization
  - **Validates: Requirement 37.1, 37.3, 37.5**

- [ ] 5.5 Frontend Web: Add debt form and extra payment input
  - Add/edit debts
  - Extra monthly payment slider
  - **Validates: Requirement 37.2, 37.6**

- [ ] 5.6 Frontend Mobile: Create DebtPayoffScreen
  - Mirror web implementation
  - Milestone celebrations
  - **Validates: Requirement 37.9**

- [ ] 5.7 Property Test: Debt payoff calculation correctness
  - Total paid = principal + total interest
  - Avalanche always <= snowball total interest
  - **Validates: Requirement 37.4**

### Task 6: Spending Insights Enhancement (Requirement 39)

- [ ] 6.1 Backend: Enhance insights Lambda with AI
  - Integrate AWS Bedrock for natural language insights
  - Generate personalized recommendations
  - **Validates: Requirement 39.8, 39.9**

- [ ] 6.2 Backend: Add spending pattern analysis
  - Day of week patterns
  - Time of month patterns
  - Merchant frequency
  - **Validates: Requirement 39.6**

- [ ] 6.3 Backend: Add month-over-month comparison
  - Calculate spending changes by category
  - Identify unusual spikes
  - **Validates: Requirement 39.2, 39.5**

- [ ] 6.4 Frontend Web: Enhance InsightsPage
  - Display AI-generated insights
  - Spending trend charts
  - Category comparisons
  - **Validates: Requirement 39.1, 39.3, 39.4**

- [ ] 6.5 Frontend Mobile: Enhance InsightsScreen
  - Mirror web enhancements
  - **Validates: Requirement 39**

- [ ] 6.6 Backend: Add weekly insight notifications
  - Configurable notification preference
  - **Validates: Requirement 39.7**

### Task 7: Receipt Scanning (Requirement 44)

- [ ] 7.1 Backend: Create receipt-ocr Lambda function
  - Create `backend/functions/receipt-ocr/` directory
  - Integrate AWS Textract
  - Extract total, merchant, date
  - **Validates: Requirement 44.3**

- [ ] 7.2 Backend: Create S3 bucket for receipts
  - Add to CDK stack
  - 30-day lifecycle policy
  - SSE-S3 encryption
  - **Validates: Requirement 44.8**

- [ ] 7.3 Backend: Add receipt upload endpoint
  - `POST /receipts/upload` - Get presigned URL
  - `POST /receipts/process` - Trigger OCR
  - **Validates: Requirement 44.1, 44.2**

- [ ] 7.4 Frontend Mobile: Create ReceiptScanner component
  - Camera capture
  - Image crop/rotate
  - **Validates: Requirement 44.1, 44.6**

- [ ] 7.5 Frontend Mobile: Add receipt confirmation screen
  - Display extracted data
  - Allow editing before save
  - Auto-suggest category
  - **Validates: Requirement 44.4, 44.5**

- [ ] 7.6 Frontend Web: Add receipt upload (file picker)
  - Alternative to camera for web
  - **Validates: Requirement 44**

### Task 8: Admin Web Application (Requirement 48)

- [ ] 8.1 Infrastructure: Create AdminStack CDK
  - Separate Cognito user pool
  - Admin API Gateway
  - CloudFront distribution
  - **Validates: Requirement 48.1, 48.2**

- [ ] 8.2 Backend: Create admin Lambda function
  - User management endpoints
  - Analytics endpoints
  - Content management endpoints
  - **Validates: Requirement 48.3, 48.5, 48.6**

- [ ] 8.3 Backend: Implement audit logging
  - Log all admin actions
  - Store in CloudWatch Logs
  - **Validates: Requirement 48.9**

- [ ] 8.4 Frontend Admin: Create React admin app
  - User search and management
  - Analytics dashboard
  - Content management
  - **Validates: Requirement 48.3, 48.5, 48.6**

- [ ] 8.5 Infrastructure: Configure IP allowlist
  - API Gateway resource policy
  - VPN/office IP ranges only
  - **Validates: Requirement 48.10**

---

## Phase 3: Comprehensive Features (Weeks 10-17)

### Task 9: Net Worth Tracking (Requirement 41)

- [ ] 9.1 Backend: Create net-worth Lambda function
  - Create `backend/functions/net-worth/` directory
  - CRUD for assets and liabilities
  - Calculate net worth
  - **Validates: Requirement 41.1, 41.2, 41.3**

- [ ] 9.2 Backend: Add net worth history tracking
  - Store monthly snapshots
  - Calculate month-over-month change
  - **Validates: Requirement 41.4, 41.7**

- [ ] 9.3 Frontend Web: Create NetWorthPage
  - Asset/liability lists
  - Net worth chart over time
  - Asset allocation pie chart
  - **Validates: Requirement 41.4, 41.8**

- [ ] 9.4 Frontend Web: Add asset/liability forms
  - Add/edit assets and liabilities
  - Manual value updates
  - **Validates: Requirement 41.5**

- [ ] 9.5 Frontend Mobile: Create NetWorthScreen
  - Mirror web implementation
  - **Validates: Requirement 41**

- [ ] 9.6 Property Test: Net worth calculation
  - Net worth = Σ assets - Σ liabilities
  - **Validates: Requirement 41.3**

### Task 10: Bank Sync UI (Requirement 42)

- [ ] 10.1 Frontend Web: Integrate Plaid Link SDK
  - Install @plaid/link
  - Create PlaidLinkButton component
  - Handle success/error callbacks
  - **Validates: Requirement 42.12**

- [ ] 10.2 Frontend Web: Create ConnectedAccounts component
  - List connected accounts
  - Show balance, last sync time
  - Manual sync button
  - **Validates: Requirement 42.13, 42.14**

- [ ] 10.3 Frontend Web: Create PendingTransactions component
  - List pending transactions
  - Approve/reject buttons
  - Category assignment
  - **Validates: Requirement 42.15, 42.16, 42.17**

- [ ] 10.4 Frontend Mobile: Integrate Plaid Link
  - Use react-native-plaid-link-sdk
  - **Validates: Requirement 42.12**

- [ ] 10.5 Frontend Mobile: Create connected accounts screen
  - Mirror web implementation
  - **Validates: Requirement 42.13**

- [ ] 10.6 Backend: Add sandbox test account creation
  - Endpoint to create Plaid sandbox accounts
  - Generate sample transactions
  - **Validates: Requirement 42.21, 42.22, 42.23**

### Task 11: Credit Score Monitoring (Requirement 43)

- [ ] 11.1 Backend: Create credit-score Lambda function
  - Create `backend/functions/credit-score/` directory
  - Integrate with credit bureau API
  - Store score history
  - **Validates: Requirement 43.1, 43.2**

- [ ] 11.2 Backend: Implement score change notifications
  - Notify on significant changes (±10 points)
  - **Validates: Requirement 43.8**

- [ ] 11.3 Frontend Web: Create CreditScorePage
  - Display current score and rating
  - Score history chart
  - Factors affecting score
  - **Validates: Requirement 43.1, 43.3, 43.5, 43.6**

- [ ] 11.4 Frontend Web: Add credit improvement tips
  - Based on score factors
  - **Validates: Requirement 43.7**

- [ ] 11.5 Frontend Mobile: Create CreditScoreScreen
  - Mirror web implementation
  - **Validates: Requirement 43**

### Task 12: Investment Tracking (Requirement 45)

- [ ] 12.1 Backend: Create investments Lambda function
  - Create `backend/functions/investments/` directory
  - CRUD for holdings
  - Portfolio calculations
  - **Validates: Requirement 45.1, 45.2, 45.3**

- [ ] 12.2 Backend: Integrate stock price API
  - Alpha Vantage or Yahoo Finance
  - Daily price updates via scheduled Lambda
  - **Validates: Requirement 45.6**

- [ ] 12.3 Backend: Add portfolio performance calculation
  - Total value, gain/loss
  - Asset allocation breakdown
  - **Validates: Requirement 45.3, 45.4**

- [ ] 12.4 Frontend Web: Create InvestmentsPage
  - Portfolio overview
  - Holdings list with performance
  - Allocation charts
  - **Validates: Requirement 45.3, 45.4, 45.5**

- [ ] 12.5 Frontend Web: Add holding form
  - Add/edit holdings
  - Account type selection
  - **Validates: Requirement 45.2**

- [ ] 12.6 Frontend Mobile: Create InvestmentsScreen
  - Mirror web implementation
  - **Validates: Requirement 45**

- [ ] 12.7 Integration: Link investments to net worth
  - Include investment value in net worth calculation
  - **Validates: Requirement 45.8**

---

## Phase 4: Engagement & Growth (Weeks 18-23)

### Task 13: Peer Comparison (Requirement 46)

- [ ] 13.1 Backend: Create peer-comparison Lambda function
  - Create `backend/functions/peer-comparison/` directory
  - Comparison profile management
  - Percentile calculations
  - **Validates: Requirement 46.1, 46.2, 46.3**

- [ ] 13.2 Backend: Create aggregation scheduled Lambda
  - Weekly aggregation of spending data
  - Calculate percentiles by cohort
  - Minimum 50 users per cohort
  - **Validates: Requirement 46.9**

- [ ] 13.3 Backend: Implement badge system
  - Badge definitions and conditions
  - Award badges based on spending patterns
  - **Validates: Requirement 46.6**

- [ ] 13.4 Backend: Calculate Financial Health Score
  - 0-100 score based on multiple factors
  - **Validates: Requirement 46.7**

- [ ] 13.5 Frontend Web: Create PeerComparisonPage
  - Opt-in toggle
  - Spending percentiles by category
  - Visual indicators (green/yellow/red)
  - **Validates: Requirement 46.1, 46.3, 46.5**

- [ ] 13.6 Frontend Web: Add badges display
  - Earned badges showcase
  - Financial Health Score
  - **Validates: Requirement 46.6, 46.7**

- [ ] 13.7 Frontend Mobile: Create PeerComparisonScreen
  - Mirror web implementation
  - **Validates: Requirement 46**

- [ ] 13.8 Property Test: Privacy guarantees
  - No data exposed for cohorts < 50 users
  - **Validates: Requirement 46.9**

### Task 14: Educational Content (Requirement 47)

- [ ] 14.1 Backend: Create learn-content Lambda function
  - Create `backend/functions/learn-content/` directory
  - Content feed endpoint
  - Engagement tracking
  - **Validates: Requirement 47.1, 47.6**

- [ ] 14.2 Backend: Create ContentTable in DynamoDB
  - Content storage schema
  - Category index
  - **Validates: Requirement 47.2**

- [ ] 14.3 Backend: Implement content personalization
  - Use spending patterns for recommendations
  - AI-powered suggestions via Bedrock
  - **Validates: Requirement 47.4, 47.9**

- [ ] 14.4 Backend: Add learning badges
  - Knowledge Seeker, Quiz Master, Graduate
  - **Validates: Requirement 47.7**

- [ ] 14.5 Backend: Add weekly tip notifications
  - Configurable preference
  - **Validates: Requirement 47.5**

- [ ] 14.6 Frontend Web: Create LearnPage
  - Scrollable content feed
  - Content types (tips, articles, videos, quizzes)
  - Bookmark functionality
  - **Validates: Requirement 47.1, 47.2, 47.8**

- [ ] 14.7 Frontend Web: Add learning progress display
  - Articles read, quizzes completed
  - Badges earned
  - **Validates: Requirement 47.6, 47.7**

- [ ] 14.8 Frontend Mobile: Create LearnScreen
  - Mirror web implementation
  - Social media-like feed experience
  - **Validates: Requirement 47**

- [ ] 14.9 Admin: Add content management to admin app
  - Create/edit/delete content
  - Schedule publication
  - View engagement metrics
  - **Validates: Requirement 48.5**

---

## Documentation Tasks

- [ ] D.1 Update API documentation
  - Document all new endpoints in `docs/api-endpoints.md`
  - Include request/response examples

- [ ] D.2 Update USER_JOURNEYS.md
  - Add new user journeys for competitive features
  - Update gap analysis

- [ ] D.3 Create feature guides
  - User guide for each major feature
  - Add to `docs/` directory

- [ ] D.4 Update architecture documentation
  - Update `docs/aws-stack-architecture.md`
  - Add new Lambda functions and tables

---

## Summary

**Total Tasks**: 78 implementation tasks + 4 documentation tasks
**Phases**: 4 phases over 23 weeks
**Priority Order**:

1. Rollover Budgets (quick win, high value)
2. Bill Reminders (extends existing system)
3. Savings Goals (high engagement)
4. Subscription Tracking (pattern detection)
5. Debt Payoff (calculations)
6. Spending Insights (AI enhancement)
7. Receipt Scanning (OCR)
8. Admin App (operations)
9. Net Worth (comprehensive)
10. Bank Sync UI (Plaid frontend)
11. Credit Score (partnership)
12. Investments (portfolio)
13. Peer Comparison (engagement)
14. Educational Content (growth)
