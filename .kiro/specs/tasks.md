# BudgetBuddy Implementation Tasks

**Last Updated**: 2026-02-01
**Status**: In Progress
**Scope**: Competitive Features Implementation

---

## Phase 1: Foundation Features (Sprint 1)

### Task 1: Bill Reminders System (Requirement 52)

- [x] 1.1 Create bills Lambda function structure
  - [x] 1.1.1 Create `backend/functions/bills/index.js` with CRUD handlers
  - [ ] 1.1.2 Create `backend/functions/bills/service.js` for business logic
  - [x] 1.1.3 Create `backend/functions/bills/package.json`
- [x] 1.2 Implement bill data model and API endpoints
  - [x] 1.2.1 Implement GET /api/bills - list all bills
  - [x] 1.2.2 Implement POST /api/bills - create bill reminder
  - [x] 1.2.3 Implement PUT /api/bills/:id - update bill
  - [x] 1.2.4 Implement POST /api/bills/:id/pay - mark bill as paid
  - [x] 1.2.5 Implement GET /api/bills/upcoming - next 30 days
- [ ] 1.3 Implement bill notification scheduler
  - [ ] 1.3.1 Create EventBridge rule for daily bill check (8AM)
  - [ ] 1.3.2 Implement 7-day reminder notification
  - [ ] 1.3.3 Implement 3-day reminder notification
  - [ ] 1.3.4 Implement due-day notification
  - [ ] 1.3.5 Implement overdue notification
- [x] 1.4 Implement recurring bill auto-scheduling
  - [x] 1.4.1 Calculate next due date based on frequency
  - [x] 1.4.2 Auto-create next bill occurrence when paid
- [x] 1.5 Implement transaction creation on bill payment
  - [x] 1.5.1 Create transaction when bill marked paid
  - [x] 1.5.2 Link transaction to bill record
- [x] 1.6 Add bills CDK infrastructure
  - [x] 1.6.1 Create bills Lambda in api-stack.ts
  - [x] 1.6.2 Add API Gateway routes for /api/bills/\*
  - [ ] 1.6.3 Add EventBridge rules for notifications
- [ ] 1.7 Create bills UI components
  - [ ] 1.7.1 Create BillsPage/BillsScreen component
  - [ ] 1.7.2 Create BillCard component with status indicators
  - [ ] 1.7.3 Create AddBillModal component
  - [ ] 1.7.4 Create BillCalendarView component
- [x] 1.8 Write tests for bills feature
  - [x] 1.8.1 Unit tests for bill service logic
  - [ ] 1.8.2 Integration tests for bill API endpoints
  - [ ] 1.8.3 Property tests for recurring date calculations

### Task 2: Savings Goals System (Requirement 54)

- [x] 2.1 Create goals Lambda function structure
  - [x] 2.1.1 Create `backend/functions/goals/index.js` with CRUD handlers
  - [ ] 2.1.2 Create `backend/functions/goals/service.js` for business logic
  - [x] 2.1.3 Create `backend/functions/goals/package.json`
- [x] 2.2 Implement goals data model and API endpoints
  - [x] 2.2.1 Implement GET /api/goals - list all goals
  - [x] 2.2.2 Implement POST /api/goals - create goal
  - [x] 2.2.3 Implement PUT /api/goals/:id - update goal
  - [x] 2.2.4 Implement DELETE /api/goals/:id - delete goal
  - [x] 2.2.5 Implement POST /api/goals/:id/contribute - add contribution
  - [x] 2.2.6 Implement PUT /api/goals/reorder - reorder priorities
- [x] 2.3 Implement progress calculation
  - [x] 2.3.1 Calculate progress percentage
  - [x] 2.3.2 Calculate monthly required amount
  - [x] 2.3.3 Track milestone achievements (25%, 50%, 75%, 100%)
- [ ] 2.4 Implement category linking
  - [ ] 2.4.1 Link savings category to goal
  - [ ] 2.4.2 Auto-update goal when linked category transaction added
- [ ] 2.5 Implement goal notifications
  - [ ] 2.5.1 Weekly progress update notification
  - [ ] 2.5.2 Milestone celebration notification
  - [ ] 2.5.3 Behind schedule reminder notification
- [x] 2.6 Add goals CDK infrastructure
  - [x] 2.6.1 Create goals Lambda in api-stack.ts
  - [x] 2.6.2 Add API Gateway routes for /api/goals/\*
- [ ] 2.7 Create goals UI components
  - [ ] 2.7.1 Create GoalsPage/GoalsScreen component
  - [ ] 2.7.2 Create GoalCard component with progress bar
  - [ ] 2.7.3 Create AddGoalModal with templates
  - [ ] 2.7.4 Create ContributeModal component
  - [ ] 2.7.5 Implement drag-and-drop reordering
  - [ ] 2.7.6 Add confetti animation for goal completion
- [x] 2.8 Write tests for goals feature
  - [x] 2.8.1 Unit tests for progress calculations
  - [ ] 2.8.2 Integration tests for goals API
  - [ ] 2.8.3 Property tests for milestone triggers

---

## Phase 2: Intelligence Features (Sprint 2)

### Task 3: Spending Insights & Analytics (Requirement 53)

- [x] 3.1 Create insights Lambda function structure
  - [x] 3.1.1 Create `backend/functions/insights/index.js`
  - [ ] 3.1.2 Create `backend/functions/insights/service.js`
  - [ ] 3.1.3 Create `backend/functions/insights/ai-generator.js`
  - [x] 3.1.4 Create `backend/functions/insights/package.json`
- [x] 3.2 Implement insights aggregation
  - [x] 3.2.1 Implement weekly spending aggregation
  - [x] 3.2.2 Implement category breakdown calculation
  - [x] 3.2.3 Implement month-over-month comparison
  - [x] 3.2.4 Implement spending pattern detection
- [ ] 3.3 Implement AI insight generation
  - [ ] 3.3.1 Create Bedrock client for Claude
  - [ ] 3.3.2 Design insight generation prompt
  - [ ] 3.3.3 Implement insight parsing and storage
- [x] 3.4 Implement insights API endpoints
  - [x] 3.4.1 Implement GET /api/insights/weekly
  - [x] 3.4.2 Implement GET /api/insights/monthly
  - [x] 3.4.3 Implement GET /api/insights/trends
  - [x] 3.4.4 Implement POST /api/insights/ask (AI chat)
- [ ] 3.5 Implement scheduled insight generation
  - [ ] 3.5.1 Create EventBridge rule for weekly generation
  - [ ] 3.5.2 Implement batch processing for all users
- [x] 3.6 Add insights CDK infrastructure
  - [x] 3.6.1 Create insights Lambda with Bedrock permissions
  - [x] 3.6.2 Add API Gateway routes
  - [ ] 3.6.3 Add EventBridge scheduled rule
- [ ] 3.7 Create insights UI components
  - [ ] 3.7.1 Create InsightsPage/InsightsScreen
  - [ ] 3.7.2 Create InsightCard component
  - [ ] 3.7.3 Create SpendingTrendChart component
  - [ ] 3.7.4 Create CategoryBreakdownChart component
  - [ ] 3.7.5 Create AskAIModal component
- [x] 3.8 Write tests for insights feature
  - [x] 3.8.1 Unit tests for aggregation logic
  - [ ] 3.8.2 Integration tests for insights API
  - [ ] 3.8.3 Mock tests for Bedrock integration

### Task 4: Receipt Scanning with AI Vision (Requirement 56)

- [x] 4.1 Create receipt Lambda function structure
  - [x] 4.1.1 Create `backend/functions/receipt/index.js`
  - [ ] 4.1.2 Create `backend/functions/receipt/processor.js`
  - [x] 4.1.3 Create `backend/functions/receipt/package.json`
- [ ] 4.2 Implement S3 upload flow
  - [ ] 4.2.1 Create S3 bucket for receipts with lifecycle policy
  - [x] 4.2.2 Implement presigned URL generation
  - [ ] 4.2.3 Implement image compression utility
- [ ] 4.3 Implement AI receipt processing
  - [ ] 4.3.1 Create Bedrock client for Claude Haiku
  - [ ] 4.3.2 Design receipt extraction prompt
  - [ ] 4.3.3 Implement image-to-base64 conversion
  - [x] 4.3.4 Implement response parsing
- [x] 4.4 Implement receipt API endpoints
  - [x] 4.4.1 Implement POST /api/receipt/upload
  - [x] 4.4.2 Implement POST /api/receipt/process
  - [x] 4.4.3 Implement GET /api/receipt/:id
  - [x] 4.4.4 Implement GET /api/receipt/usage
- [x] 4.5 Implement usage limits
  - [x] 4.5.1 Track daily scan count per user
  - [x] 4.5.2 Enforce 10 scans/day limit for free users
  - [x] 4.5.3 Return remaining scans in response
- [x] 4.6 Add receipt CDK infrastructure
  - [ ] 4.6.1 Create S3 bucket with 90-day lifecycle
  - [x] 4.6.2 Create receipt Lambda with S3 and Bedrock permissions
  - [x] 4.6.3 Add API Gateway routes
- [ ] 4.7 Create receipt UI components
  - [ ] 4.7.1 Create ReceiptCaptureButton component
  - [ ] 4.7.2 Create ReceiptPreviewModal component
  - [ ] 4.7.3 Create ReceiptConfirmationForm component
  - [ ] 4.7.4 Integrate with transaction entry flow
- [x] 4.8 Write tests for receipt feature
  - [x] 4.8.1 Unit tests for image processing
  - [ ] 4.8.2 Integration tests for receipt API
  - [ ] 4.8.3 Mock tests for Bedrock Vision

---

## Phase 3: Integration Features (Sprint 3)

### Task 5: Bank Account Sync - Plaid (Requirement 55)

- [x] 5.1 Create Plaid Lambda function structure
  - [x] 5.1.1 Create `backend/functions/plaid/index.js`
  - [ ] 5.1.2 Create `backend/functions/plaid/service.js`
  - [ ] 5.1.3 Create `backend/functions/plaid/mock-service.js`
  - [x] 5.1.4 Create `backend/functions/plaid/package.json`
- [x] 5.2 Implement Plaid Link flow
  - [x] 5.2.1 Implement link token generation
  - [x] 5.2.2 Implement public token exchange
  - [ ] 5.2.3 Store access token in Secrets Manager
- [x] 5.3 Implement account management
  - [x] 5.3.1 Implement GET /api/plaid/accounts
  - [x] 5.3.2 Implement DELETE /api/plaid/accounts/:id
  - [ ] 5.3.3 Implement account balance refresh
- [x] 5.4 Implement transaction sync
  - [x] 5.4.1 Implement daily sync job
  - [x] 5.4.2 Implement 1 sync/day/account limit
  - [ ] 5.4.3 Implement transaction cursor management
  - [x] 5.4.4 Implement pending transaction queue
- [ ] 5.5 Implement AI categorization
  - [ ] 5.5.1 Create categorization prompt
  - [ ] 5.5.2 Implement batch categorization
  - [ ] 5.5.3 Cache merchant-category mappings
- [x] 5.6 Implement mock mode
  - [x] 5.6.1 Create mock accounts data
  - [x] 5.6.2 Create mock transactions generator
  - [x] 5.6.3 Toggle via PLAID_MOCK_MODE env var
- [x] 5.7 Add Plaid CDK infrastructure
  - [x] 5.7.1 Create Plaid Lambda with Secrets Manager access
  - [x] 5.7.2 Add API Gateway routes
  - [ ] 5.7.3 Add EventBridge rule for daily sync
  - [ ] 5.7.4 Store Plaid credentials in Secrets Manager
- [ ] 5.8 Create Plaid UI components
  - [ ] 5.8.1 Create ConnectBankButton component
  - [ ] 5.8.2 Create LinkedAccountsList component
  - [ ] 5.8.3 Create PendingTransactionsQueue component
  - [ ] 5.8.4 Create SyncStatusIndicator component
- [x] 5.9 Write tests for Plaid feature
  - [x] 5.9.1 Unit tests for sync logic
  - [x] 5.9.2 Integration tests with mock mode
  - [ ] 5.9.3 Property tests for rate limiting

### Task 6: Receipt-to-Bank Reconciliation (Requirement 57)

- [x] 6.1 Create reconciliation Lambda function
  - [x] 6.1.1 Create `backend/functions/reconciliation/index.js`
  - [x] 6.1.2 Create `backend/functions/reconciliation/matcher.js` (integrated in index.js)
  - [x] 6.1.3 Create `backend/functions/reconciliation/package.json`
- [x] 6.2 Implement matching algorithm
  - [x] 6.2.1 Implement amount matching (±$0.50 tolerance)
  - [x] 6.2.2 Implement date matching (±2 days)
  - [x] 6.2.3 Implement merchant fuzzy matching
  - [x] 6.2.4 Calculate confidence scores
- [x] 6.3 Implement reconciliation API
  - [x] 6.3.1 Implement GET /api/reconcile/status
  - [x] 6.3.2 Implement GET /api/reconcile/unmatched
  - [x] 6.3.3 Implement POST /api/reconcile/match
  - [x] 6.3.4 Implement POST /api/reconcile/unmatch
  - [x] 6.3.5 Implement GET /api/reconcile/suggestions
  - [x] 6.3.6 Implement POST /api/reconcile/auto
  - [x] 6.3.7 Implement GET /api/reconcile/{matchId}
- [ ] 6.4 Implement auto-reconciliation triggers
  - [ ] 6.4.1 Trigger after Plaid sync
  - [ ] 6.4.2 Trigger after receipt confirmation
- [x] 6.5 Add reconciliation CDK infrastructure
  - [x] 6.5.1 Create reconciliation Lambda
  - [x] 6.5.2 Add API Gateway routes
- [ ] 6.6 Create reconciliation UI components
  - [ ] 6.6.1 Create ReconciliationStatusBadge component
  - [ ] 6.6.2 Create UnmatchedItemsList component
  - [ ] 6.6.3 Create ManualMatchModal component
- [x] 6.7 Write tests for reconciliation
  - [x] 6.7.1 Unit tests for matching algorithm (11 tests passing)
  - [ ] 6.7.2 Property tests for confidence scoring
  - [ ] 6.7.3 Integration tests for reconciliation flow

---

## Phase 4: Engagement Features (Sprint 4)

### Task 7: Admin Web Application (Requirement 47)

- [ ] 7.1 Create admin app package structure
  - [ ] 7.1.1 Create `packages/admin/` directory
  - [ ] 7.1.2 Initialize React + Vite project
  - [ ] 7.1.3 Configure Tailwind CSS
  - [ ] 7.1.4 Set up routing
- [ ] 7.2 Create admin Lambda function
  - [ ] 7.2.1 Create `backend/functions/admin/index.js`
  - [ ] 7.2.2 Implement admin authentication middleware
  - [ ] 7.2.3 Implement audit logging
- [ ] 7.3 Implement admin API endpoints
  - [ ] 7.3.1 Implement GET /admin/dashboard
  - [ ] 7.3.2 Implement GET /admin/users (search)
  - [ ] 7.3.3 Implement GET /admin/users/:id
  - [ ] 7.3.4 Implement POST /admin/users/:id/disable
  - [ ] 7.3.5 Implement POST /admin/users/:id/enable
  - [ ] 7.3.6 Implement POST /admin/users/:id/reset-password
  - [ ] 7.3.7 Implement GET /admin/health
  - [ ] 7.3.8 Implement GET /admin/audit
- [ ] 7.4 Create admin UI pages
  - [ ] 7.4.1 Create DashboardPage with metrics
  - [ ] 7.4.2 Create UsersPage with search
  - [ ] 7.4.3 Create UserDetailPage
  - [ ] 7.4.4 Create SystemHealthPage
  - [ ] 7.4.5 Create AuditLogPage
- [ ] 7.5 Add admin CDK infrastructure
  - [ ] 7.5.1 Create admin Lambda
  - [ ] 7.5.2 Create admin Cognito group
  - [ ] 7.5.3 Add admin API Gateway routes
  - [ ] 7.5.4 Create S3 bucket for admin app hosting
- [ ] 7.6 Write tests for admin feature
  - [ ] 7.6.1 Unit tests for admin service
  - [ ] 7.6.2 Integration tests for admin API
  - [ ] 7.6.3 Auth tests for admin-only access

### Task 8: Peer Comparison System (Requirement 48)

- [ ] 8.1 Create comparison Lambda function
  - [ ] 8.1.1 Create `backend/functions/comparison/index.js`
  - [ ] 8.1.2 Create `backend/functions/comparison/aggregator.js`
  - [ ] 8.1.3 Create `backend/functions/comparison/package.json`
- [ ] 8.2 Implement data aggregation
  - [ ] 8.2.1 Create daily aggregation job
  - [ ] 8.2.2 Group users by region, family size, income
  - [ ] 8.2.3 Calculate category averages and percentiles
  - [ ] 8.2.4 Enforce minimum 50 users per group
- [ ] 8.3 Implement comparison API
  - [ ] 8.3.1 Implement GET /api/comparison/summary
  - [ ] 8.3.2 Implement GET /api/comparison/preferences
  - [ ] 8.3.3 Implement PUT /api/comparison/preferences
- [ ] 8.4 Implement privacy controls
  - [ ] 8.4.1 Implement opt-out functionality
  - [ ] 8.4.2 Ensure no individual data exposure
- [ ] 8.5 Add comparison CDK infrastructure
  - [ ] 8.5.1 Create comparison Lambda
  - [ ] 8.5.2 Add EventBridge rule for daily aggregation
  - [ ] 8.5.3 Add API Gateway routes
- [ ] 8.6 Create comparison UI components
  - [ ] 8.6.1 Create PeerComparisonCard component
  - [ ] 8.6.2 Create CategoryComparisonList component
  - [ ] 8.6.3 Create ComparisonPreferencesModal
- [ ] 8.7 Write tests for comparison feature
  - [ ] 8.7.1 Unit tests for aggregation logic
  - [ ] 8.7.2 Property tests for privacy guarantees
  - [ ] 8.7.3 Integration tests for comparison API

### Task 9: Financial Tips Feed (Requirement 49)

- [ ] 9.1 Create tips Lambda function
  - [ ] 9.1.1 Create `backend/functions/tips/index.js`
  - [ ] 9.1.2 Create `backend/functions/tips/personalizer.js`
  - [ ] 9.1.3 Create `backend/functions/tips/package.json`
- [ ] 9.2 Create tip content library
  - [ ] 9.2.1 Create budgeting tips JSON
  - [ ] 9.2.2 Create saving tips JSON
  - [ ] 9.2.3 Create debt tips JSON
  - [ ] 9.2.4 Create investing tips JSON
- [ ] 9.3 Implement tips API
  - [ ] 9.3.1 Implement GET /api/tips/feed
  - [ ] 9.3.2 Implement GET /api/tips/daily
  - [ ] 9.3.3 Implement POST /api/tips/:id/save
  - [ ] 9.3.4 Implement POST /api/tips/:id/dismiss
  - [ ] 9.3.5 Implement GET /api/tips/saved
- [ ] 9.4 Implement personalization
  - [ ] 9.4.1 Analyze user spending patterns
  - [ ] 9.4.2 Select relevant tips based on behavior
  - [ ] 9.4.3 Track viewed tips to avoid repetition
- [ ] 9.5 Add tips CDK infrastructure
  - [ ] 9.5.1 Create tips Lambda
  - [ ] 9.5.2 Add API Gateway routes
  - [ ] 9.5.3 Store tip content in S3
- [ ] 9.6 Create tips UI components
  - [ ] 9.6.1 Create TipsFeedPage/TipsFeedScreen
  - [ ] 9.6.2 Create TipCard component
  - [ ] 9.6.3 Create SavedTipsPage
- [ ] 9.7 Write tests for tips feature
  - [ ] 9.7.1 Unit tests for personalization logic
  - [ ] 9.7.2 Integration tests for tips API

### Task 10: Educational Content (Requirement 50)

- [ ] 10.1 Create learn Lambda function
  - [ ] 10.1.1 Create `backend/functions/learn/index.js`
  - [ ] 10.1.2 Create `backend/functions/learn/progress.js`
  - [ ] 10.1.3 Create `backend/functions/learn/package.json`
- [ ] 10.2 Create course content
  - [ ] 10.2.1 Create Budgeting 101 course content
  - [ ] 10.2.2 Create Debt Freedom course content
  - [ ] 10.2.3 Create Emergency Fund course content
  - [ ] 10.2.4 Create quiz questions for each course
- [ ] 10.3 Implement learn API
  - [ ] 10.3.1 Implement GET /api/learn/courses
  - [ ] 10.3.2 Implement GET /api/learn/courses/:id
  - [ ] 10.3.3 Implement GET /api/learn/lessons/:id
  - [ ] 10.3.4 Implement POST /api/learn/lessons/:id/complete
  - [ ] 10.3.5 Implement POST /api/learn/quiz/:id/submit
  - [ ] 10.3.6 Implement GET /api/learn/progress
  - [ ] 10.3.7 Implement GET /api/learn/badges
- [ ] 10.4 Implement gamification
  - [ ] 10.4.1 Track learning streaks
  - [ ] 10.4.2 Award badges on milestones
  - [ ] 10.4.3 Calculate course progress
- [ ] 10.5 Add learn CDK infrastructure
  - [ ] 10.5.1 Create learn Lambda
  - [ ] 10.5.2 Add API Gateway routes
  - [ ] 10.5.3 Store course content in S3
- [ ] 10.6 Create learn UI components
  - [ ] 10.6.1 Create LearnPage/LearnScreen
  - [ ] 10.6.2 Create CourseCard component
  - [ ] 10.6.3 Create LessonViewer component
  - [ ] 10.6.4 Create QuizComponent
  - [ ] 10.6.5 Create BadgeDisplay component
  - [ ] 10.6.6 Create StreakIndicator component
- [ ] 10.7 Write tests for learn feature
  - [ ] 10.7.1 Unit tests for progress tracking
  - [ ] 10.7.2 Property tests for badge conditions
  - [ ] 10.7.3 Integration tests for learn API

---

## Summary

| Phase | Tasks | Features                       | Est. Duration |
| ----- | ----- | ------------------------------ | ------------- |
| 1     | 1-2   | Bills, Goals                   | 2 weeks       |
| 2     | 3-4   | Insights, Receipts             | 2 weeks       |
| 3     | 5-6   | Plaid, Reconciliation          | 2 weeks       |
| 4     | 7-10  | Admin, Comparison, Tips, Learn | 3 weeks       |

**Total Estimated Duration**: 9 weeks

**Priority Order**:

1. Bills (high user value, extends existing system)
2. Goals (high engagement, standalone feature)
3. Insights (AI differentiator)
4. Receipts (convenience, AI showcase)
5. Plaid (most requested, complex)
6. Reconciliation (ties features together)
7. Admin (operational necessity)
8. Comparison (engagement)
9. Tips (content)
10. Learn (retention)
