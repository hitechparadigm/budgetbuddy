# BudgetBuddy Technical Design Document

**Last Updated**: 2026-02-01
**Status**: Active Development
**Scope**: Core Platform + Competitive Features

## Overview

This design document covers the technical architecture for BudgetBuddy's core platform and new competitive features including Admin Web App, Peer Comparison, Financial Tips Feed, and Educational Content.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web App        │  Mobile App       │  Admin App                            │
│  (React/Vite)   │  (React Native)   │  (React/Vite)                         │
│  - Budget UI    │  - Budget UI      │  - User Management                    │
│  - Tips Feed    │  - Tips Feed      │  - Metrics Dashboard                  │
│  - Learn        │  - Learn          │  - System Health                      │
│  - Comparison   │  - Comparison     │  - Audit Logs                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/budget/*     │  /api/tips/*      │  /admin/*                          │
│  /api/transactions │  /api/learn/*     │  (Admin-only endpoints)            │
│  /api/comparison/* │  /api/feed/*      │                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Lambda Functions                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  budget-lambda     │  tips-lambda      │  admin-lambda                      │
│  transactions      │  learn-lambda     │  comparison-lambda                 │
│  auth-lambda       │  feed-lambda      │  analytics-lambda                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  DynamoDB          │  S3               │  Secrets Manager                   │
│  - Users           │  - Tip Content    │  - API Keys                        │
│  - Budgets         │  - Course Assets  │  - Admin Secrets                   │
│  - Transactions    │  - Exports        │                                    │
│  - Comparison Data │                   │                                    │
│  - Learning Progress                   │                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Designs

### 1. Admin Web Application (Requirement 47)

#### 1.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Web App                             │
│                   (packages/admin)                           │
├─────────────────────────────────────────────────────────────┤
│  Pages:                                                      │
│  - Dashboard (metrics overview)                              │
│  - Users (search, view, manage)                              │
│  - System Health (API stats, errors)                         │
│  - Audit Log (admin actions)                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Admin API Endpoints                        │
│                 (backend/functions/admin)                    │
├─────────────────────────────────────────────────────────────┤
│  GET  /admin/dashboard     - Platform metrics                │
│  GET  /admin/users         - Search/list users               │
│  GET  /admin/users/:id     - User details                    │
│  POST /admin/users/:id/disable - Disable account             │
│  POST /admin/users/:id/enable  - Enable account              │
│  POST /admin/users/:id/reset-password - Trigger reset        │
│  GET  /admin/health        - System health metrics           │
│  GET  /admin/audit         - Audit log entries               │
└─────────────────────────────────────────────────────────────┘
```

#### 1.2 Data Model

```javascript
// Admin Audit Log Entry
{
  PK: "AUDIT#2026-02",
  SK: "ACTION#1706745600000#admin123",
  adminId: "admin123",
  adminEmail: "admin@budgetbuddy.com",
  action: "USER_DISABLED",
  targetUserId: "user456",
  targetEmail: "user@example.com",
  details: { reason: "Suspicious activity" },
  ipAddress: "192.168.1.1",
  timestamp: "2026-02-01T12:00:00Z",
  GSI1PK: "ADMIN#admin123",
  GSI1SK: "2026-02-01T12:00:00Z"
}

// Platform Metrics (aggregated daily)
{
  PK: "METRICS#DAILY",
  SK: "2026-02-01",
  totalUsers: 1250,
  activeUsers7d: 890,
  newRegistrations30d: 156,
  totalBudgets: 3420,
  totalTransactions: 45600,
  apiCalls24h: 125000,
  errorRate24h: 0.02,
  avgResponseTime: 245
}
```

#### 1.3 Security

- **Authentication**: Cognito admin user pool group
- **Authorization**: JWT with `admin` role claim
- **Audit**: All admin actions logged with timestamp, IP, admin ID
- **Rate Limiting**: 100 requests/minute per admin

#### 1.4 Correctness Properties

```
Property 1.1: Admin Authentication Required
  ∀ request to /admin/* endpoints:
    request.headers.authorization MUST contain valid admin JWT
    AND JWT.claims.groups MUST include "admin"

Property 1.2: Audit Log Completeness
  ∀ admin action (disable, enable, reset-password):
    audit log entry MUST be created with:
      - adminId, action, targetUserId, timestamp, ipAddress

Property 1.3: User Search Consistency
  ∀ user search query:
    results MUST match users where:
      email CONTAINS query OR userId CONTAINS query OR name CONTAINS query
```

---

### 2. Peer Comparison System (Requirement 48)

#### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Comparison Service                          │
│              (backend/functions/comparison)                  │
├─────────────────────────────────────────────────────────────┤
│  Aggregation Job (EventBridge - daily):                      │
│  1. Query all users with opt-in                              │
│  2. Group by: region, familySize, incomeRange                │
│  3. Calculate category averages per group                    │
│  4. Store aggregated stats (no individual data)              │
├─────────────────────────────────────────────────────────────┤
│  Comparison API:                                             │
│  GET /api/comparison/summary                                 │
│  - Returns user's spending vs peer group averages            │
│  - Calculates percentile rankings                            │
│  - Generates personalized tips                               │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 Data Model

```javascript
// Aggregated Peer Group Stats (anonymized)
{
  PK: "PEERGROUP#us-northeast#family-2#income-50k-75k",
  SK: "STATS#2026-02",
  region: "us-northeast",
  familySize: 2,
  incomeRange: "50k-75k",
  userCount: 156,  // Must be >= 50 for privacy
  categoryAverages: {
    housing: { avg: 1850, median: 1750, p25: 1400, p75: 2100 },
    groceries: { avg: 650, median: 600, p25: 450, p75: 800 },
    transportation: { avg: 450, median: 400, p25: 250, p75: 600 },
    utilities: { avg: 180, median: 165, p25: 120, p75: 220 },
    entertainment: { avg: 200, median: 150, p25: 80, p75: 280 }
  },
  totalSpendingAvg: 4200,
  savingsRateAvg: 0.12,
  lastUpdated: "2026-02-01T00:00:00Z"
}

// User Comparison Preferences
{
  PK: "USER#user123",
  SK: "COMPARISON_PREFS",
  optedIn: true,
  incomeRange: "50k-75k",  // User-provided, optional
  showComparison: true,
  lastComparisonView: "2026-02-01T10:30:00Z"
}
```

#### 2.3 Comparison Response

```javascript
// GET /api/comparison/summary response
{
  peerGroup: {
    region: "us-northeast",
    familySize: 2,
    incomeRange: "50k-75k",
    userCount: 156
  },
  categories: [
    {
      name: "Groceries",
      userSpending: 750,
      peerAverage: 650,
      percentile: 72,
      status: "above_average",  // below_average, average, above_average
      indicator: "🔴",
      tip: "You spend 15% more than similar households. Try meal planning to reduce grocery costs."
    },
    {
      name: "Entertainment",
      userSpending: 120,
      peerAverage: 200,
      percentile: 35,
      status: "below_average",
      indicator: "🟢",
      tip: "Great job! You're spending less than 65% of similar households on entertainment."
    }
  ],
  overallSavingsRate: {
    user: 0.18,
    peerAverage: 0.12,
    percentile: 78,
    status: "above_average",
    message: "You're in the top 22% of savers in your peer group!"
  },
  monthOverMonth: {
    improved: ["Groceries", "Dining"],
    declined: ["Transportation"],
    unchanged: ["Housing", "Utilities"]
  }
}
```

#### 2.4 Privacy Safeguards

1. **Minimum Group Size**: No comparison shown if peer group < 50 users
2. **Aggregation Only**: Only store/return averages, medians, percentiles
3. **No Individual Data**: Never expose individual user spending
4. **Opt-Out**: Users can disable comparison data collection
5. **Income Optional**: Income range is user-provided and optional

#### 2.5 Correctness Properties

```
Property 2.1: Privacy Minimum Group Size
  ∀ comparison request:
    IF peerGroup.userCount < 50 THEN
      response MUST NOT include comparison data
      response MUST include message "Not enough data for comparison"

Property 2.2: Anonymization Guarantee
  ∀ aggregated stats stored:
    stats MUST NOT contain any individual user identifiers
    stats MUST NOT contain any individual transaction data

Property 2.3: Opt-Out Respect
  ∀ user with optedIn = false:
    user's spending data MUST NOT be included in aggregation
    user MUST NOT receive comparison insights

Property 2.4: Percentile Accuracy
  ∀ percentile calculation:
    percentile = (users spending less than user / total users) * 100
    percentile MUST be between 0 and 100
```

---

### 3. Financial Tips Feed (Requirement 49)

#### 3.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tips Feed Service                         │
│                (backend/functions/tips)                      │
├─────────────────────────────────────────────────────────────┤
│  Content Sources:                                            │
│  1. Static tip library (S3 JSON files)                       │
│  2. AI-generated personalized tips (Bedrock)                 │
│  3. Curated news feed (RSS aggregation - Phase 2)            │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  GET /api/tips/feed         - Paginated tip feed             │
│  GET /api/tips/daily        - Today's personalized tip       │
│  POST /api/tips/:id/save    - Bookmark a tip                 │
│  POST /api/tips/:id/dismiss - Mark as not helpful            │
│  GET /api/tips/saved        - User's saved tips              │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2 Data Model

```javascript
// Tip Content (S3 or DynamoDB)
{
  PK: "TIP#tip-001",
  SK: "CONTENT",
  tipId: "tip-001",
  title: "The 50/30/20 Rule Explained",
  content: "A simple budgeting framework: 50% needs, 30% wants, 20% savings...",
  category: "budgeting_basics",
  tags: ["budgeting", "beginner", "savings"],
  readTimeMinutes: 2,
  difficulty: "beginner",
  actionable: true,
  relatedCategories: ["savings", "expenses"],
  createdAt: "2026-01-15T00:00:00Z"
}

// Personalized Tip Triggers
{
  trigger: "overspending_dining",
  condition: "user.categorySpending.dining > user.categoryBudget.dining * 1.2",
  tipTemplate: "You've spent {overspentPercent}% more on dining this month. Here are 5 ways to cut back without sacrificing enjoyment...",
  tips: ["meal-prep-basics", "restaurant-alternatives", "lunch-packing"]
}

// User Tip Interaction
{
  PK: "USER#user123",
  SK: "TIP_INTERACTION#tip-001",
  tipId: "tip-001",
  action: "saved",  // saved, dismissed, viewed
  timestamp: "2026-02-01T10:30:00Z"
}
```

#### 3.3 Personalization Logic

```javascript
// Tip selection algorithm
function selectDailyTip(user, spendingData) {
  const triggers = [
    { condition: isOverspendingCategory, priority: 1 },
    { condition: hasNoEmergencyFund, priority: 2 },
    { condition: highDebtToIncomeRatio, priority: 3 },
    { condition: lowSavingsRate, priority: 4 },
    { condition: newUser, priority: 5 },
  ];

  // Find highest priority matching trigger
  for (const trigger of triggers) {
    if (trigger.condition(user, spendingData)) {
      return selectTipForTrigger(trigger, user.viewedTips);
    }
  }

  // Default: random tip from unviewed pool
  return selectRandomUnviewedTip(user.viewedTips);
}
```

#### 3.4 Correctness Properties

```
Property 3.1: Tip Freshness
  ∀ daily tip request:
    returned tip MUST NOT be in user's last 30 viewed tips
    OR all tips have been viewed (cycle through)

Property 3.2: Personalization Relevance
  ∀ personalized tip:
    tip.relatedCategories MUST intersect with user's active budget categories

Property 3.3: Save/Dismiss Persistence
  ∀ tip save or dismiss action:
    action MUST be persisted to user's tip interactions
    subsequent feed requests MUST respect saved/dismissed status
```

---

### 4. Educational Content (Requirement 50)

#### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Learning Service                            │
│               (backend/functions/learn)                      │
├─────────────────────────────────────────────────────────────┤
│  Content Structure:                                          │
│  Course → Modules → Lessons → Quiz                           │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  GET /api/learn/courses           - List all courses         │
│  GET /api/learn/courses/:id       - Course details           │
│  GET /api/learn/lessons/:id       - Lesson content           │
│  POST /api/learn/lessons/:id/complete - Mark complete        │
│  POST /api/learn/quiz/:id/submit  - Submit quiz answers      │
│  GET /api/learn/progress          - User's learning progress │
│  GET /api/learn/badges            - User's earned badges     │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2 Data Model

```javascript
// Course Definition
{
  PK: "COURSE#budgeting-101",
  SK: "METADATA",
  courseId: "budgeting-101",
  title: "Budgeting 101",
  description: "Master the fundamentals of zero-based budgeting",
  difficulty: "beginner",
  estimatedMinutes: 45,
  moduleCount: 5,
  lessonCount: 12,
  badge: {
    id: "budgeting-master",
    name: "Budgeting Master",
    icon: "🎓"
  },
  prerequisites: [],
  recommendedFor: ["new_users", "no_budget_history"]
}

// Lesson Content
{
  PK: "COURSE#budgeting-101",
  SK: "LESSON#01-01",
  lessonId: "01-01",
  moduleId: "01",
  title: "What is Zero-Based Budgeting?",
  content: "Zero-based budgeting means giving every dollar a job...",
  readTimeMinutes: 3,
  hasQuiz: true,
  resources: [
    { type: "checklist", title: "Budget Setup Checklist", url: "..." }
  ],
  nextLesson: "01-02"
}

// User Learning Progress
{
  PK: "USER#user123",
  SK: "LEARN_PROGRESS#budgeting-101",
  courseId: "budgeting-101",
  completedLessons: ["01-01", "01-02", "01-03"],
  quizScores: { "01": 80, "02": 100 },
  progressPercent: 25,
  startedAt: "2026-01-20T10:00:00Z",
  lastActivityAt: "2026-02-01T14:30:00Z",
  streak: 5  // consecutive days
}

// Badge Award
{
  PK: "USER#user123",
  SK: "BADGE#budgeting-master",
  badgeId: "budgeting-master",
  name: "Budgeting Master",
  icon: "🎓",
  earnedAt: "2026-02-01T15:00:00Z",
  courseId: "budgeting-101"
}
```

#### 4.3 Course Catalog (Phase 1)

| Course ID           | Title               | Lessons | Est. Time | Difficulty   |
| ------------------- | ------------------- | ------- | --------- | ------------ |
| budgeting-101       | Budgeting 101       | 12      | 45 min    | Beginner     |
| debt-freedom        | Debt Freedom        | 10      | 35 min    | Intermediate |
| emergency-fund      | Emergency Fund      | 8       | 25 min    | Beginner     |
| investing-basics    | Investing Basics    | 15      | 60 min    | Intermediate |
| retirement-planning | Retirement Planning | 10      | 40 min    | Advanced     |

#### 4.4 Gamification

```javascript
// Badge Types
const badges = [
  { id: "first-lesson", name: "First Steps", condition: "complete 1 lesson" },
  { id: "course-complete", name: "Graduate", condition: "complete any course" },
  { id: "streak-7", name: "Week Warrior", condition: "7-day learning streak" },
  {
    id: "streak-30",
    name: "Monthly Master",
    condition: "30-day learning streak",
  },
  { id: "quiz-ace", name: "Quiz Ace", condition: "100% on any quiz" },
  {
    id: "all-courses",
    name: "Financial Scholar",
    condition: "complete all courses",
  },
];

// Streak Calculation
function calculateStreak(user) {
  const today = new Date().toISOString().split("T")[0];
  const lastActivity = user.lastActivityAt.split("T")[0];

  if (today === lastActivity) return user.streak;
  if (daysBetween(lastActivity, today) === 1) return user.streak + 1;
  return 1; // Reset streak
}
```

#### 4.5 Correctness Properties

```
Property 4.1: Progress Accuracy
  ∀ user progress:
    progressPercent = (completedLessons.length / course.lessonCount) * 100

Property 4.2: Badge Award Conditions
  ∀ badge award:
    badge.condition MUST be satisfied before award
    badge MUST NOT be awarded twice to same user

Property 4.3: Lesson Sequence
  ∀ lesson completion:
    IF lesson has prerequisites THEN
      all prerequisites MUST be completed first

Property 4.4: Quiz Scoring
  ∀ quiz submission:
    score = (correctAnswers / totalQuestions) * 100
    score MUST be between 0 and 100
```

---

## API Endpoints Summary

### New Endpoints

| Method | Endpoint                        | Description      | Auth  |
| ------ | ------------------------------- | ---------------- | ----- |
| GET    | /admin/dashboard                | Platform metrics | Admin |
| GET    | /admin/users                    | Search users     | Admin |
| GET    | /admin/users/:id                | User details     | Admin |
| POST   | /admin/users/:id/disable        | Disable account  | Admin |
| POST   | /admin/users/:id/enable         | Enable account   | Admin |
| POST   | /admin/users/:id/reset-password | Trigger reset    | Admin |
| GET    | /admin/health                   | System health    | Admin |
| GET    | /admin/audit                    | Audit log        | Admin |
| GET    | /api/comparison/summary         | Peer comparison  | User  |
| GET    | /api/comparison/preferences     | Get prefs        | User  |
| PUT    | /api/comparison/preferences     | Update prefs     | User  |
| GET    | /api/tips/feed                  | Tip feed         | User  |
| GET    | /api/tips/daily                 | Daily tip        | User  |
| POST   | /api/tips/:id/save              | Save tip         | User  |
| POST   | /api/tips/:id/dismiss           | Dismiss tip      | User  |
| GET    | /api/tips/saved                 | Saved tips       | User  |
| GET    | /api/learn/courses              | List courses     | User  |
| GET    | /api/learn/courses/:id          | Course details   | User  |
| GET    | /api/learn/lessons/:id          | Lesson content   | User  |
| POST   | /api/learn/lessons/:id/complete | Complete lesson  | User  |
| POST   | /api/learn/quiz/:id/submit      | Submit quiz      | User  |
| GET    | /api/learn/progress             | User progress    | User  |
| GET    | /api/learn/badges               | User badges      | User  |

---

## DynamoDB Table Updates

### New Access Patterns

| Access Pattern             | PK                                       | SK                           | GSI                   |
| -------------------------- | ---------------------------------------- | ---------------------------- | --------------------- |
| Get peer group stats       | PEERGROUP#{region}#{familySize}#{income} | STATS#{month}                | -                     |
| Get user comparison prefs  | USER#{userId}                            | COMPARISON_PREFS             | -                     |
| Get tip by ID              | TIP#{tipId}                              | CONTENT                      | -                     |
| Get user tip interactions  | USER#{userId}                            | TIP_INTERACTION#{tipId}      | -                     |
| Get course metadata        | COURSE#{courseId}                        | METADATA                     | -                     |
| Get lesson content         | COURSE#{courseId}                        | LESSON#{lessonId}            | -                     |
| Get user learning progress | USER#{userId}                            | LEARN_PROGRESS#{courseId}    | -                     |
| Get user badges            | USER#{userId}                            | BADGE#{badgeId}              | -                     |
| Get audit logs by date     | AUDIT#{month}                            | ACTION#{timestamp}#{adminId} | -                     |
| Get audit logs by admin    | -                                        | -                            | GSI1: ADMIN#{adminId} |
| Get daily metrics          | METRICS#DAILY                            | {date}                       | -                     |

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- Admin Web App MVP (user management, basic metrics)
- Tips Feed with static content library
- Basic comparison data aggregation job

### Phase 2: Engagement (Week 3-4)

- Peer comparison UI and API
- Personalized tips with AI (Bedrock)
- Educational content structure and first course

### Phase 3: Polish (Week 5-6)

- Gamification (badges, streaks)
- Additional courses
- Advanced admin features

---

## Testing Strategy

### Property-Based Tests

1. **Admin Auth**: All admin endpoints require valid admin JWT
2. **Privacy**: Peer comparison never exposes individual data
3. **Personalization**: Tips are relevant to user's spending patterns
4. **Progress**: Learning progress calculations are accurate
5. **Badges**: Badge conditions are correctly evaluated

### Integration Tests

1. Admin user management flow
2. Peer comparison aggregation and retrieval
3. Tip feed personalization
4. Course completion and badge award

---

## Security Considerations

1. **Admin Access**: Separate Cognito group, audit logging, IP allowlisting
2. **Peer Data**: Anonymization, minimum group sizes, opt-out support
3. **Content**: Sanitize all user-generated content (tip feedback)
4. **Rate Limiting**: Prevent abuse of comparison and tips endpoints

---

### 5. Bill Reminders System (Requirement 52)

#### 5.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Bills Service                             │
│               (backend/functions/bills)                      │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  GET  /api/bills              - List all bills               │
│  POST /api/bills              - Create bill reminder         │
│  PUT  /api/bills/:id          - Update bill                  │
│  POST /api/bills/:id/pay      - Mark bill as paid            │
│  GET  /api/bills/calendar     - Calendar view data           │
│  GET  /api/bills/upcoming     - Next 30 days bills           │
├─────────────────────────────────────────────────────────────┤
│  Scheduled Jobs (EventBridge):                               │
│  - Daily 8AM: Check bills due in 7 days → notify             │
│  - Daily 8AM: Check bills due in 3 days → notify             │
│  - Daily 8AM: Check bills due today → notify                 │
│  - Daily 1AM: Auto-schedule next recurring bills             │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2 Data Model

```javascript
// Bill Reminder
{
  PK: "FAMILY#family123",
  SK: "BILL#bill-uuid-001",
  billId: "bill-uuid-001",
  name: "Electric Bill",
  amount: 150.00,
  dueDate: "2026-02-15",
  categoryId: "cat-utilities",
  status: "unpaid",  // unpaid, paid, overdue
  isRecurring: true,
  frequency: "monthly",  // weekly, bi-weekly, monthly, quarterly, annually
  nextDueDate: "2026-03-15",
  remindersSent: ["7day", "3day"],
  paidDate: null,
  transactionId: null,  // linked when paid
  notes: "Account #12345",
  createdAt: "2026-01-01T00:00:00Z",
  GSI1PK: "BILLS#2026-02",  // For calendar queries
  GSI1SK: "2026-02-15#bill-uuid-001"
}
```

#### 5.3 Notification Schedule

| Trigger        | Timing        | Message                              |
| -------------- | ------------- | ------------------------------------ |
| 7-day reminder | 7 days before | "Electric Bill ($150) due in 7 days" |
| 3-day reminder | 3 days before | "Electric Bill ($150) due in 3 days" |
| Due today      | On due date   | "Electric Bill ($150) is due today!" |
| Overdue        | 1 day after   | "⚠️ Electric Bill ($150) is overdue" |

#### 5.4 Correctness Properties

```
Property 5.1: Bill Status Transitions
  Valid transitions: unpaid → paid, unpaid → overdue, overdue → paid
  Invalid: paid → unpaid, paid → overdue

Property 5.2: Recurring Bill Scheduling
  WHEN bill is marked paid AND isRecurring = true:
    nextDueDate MUST be calculated based on frequency
    new bill record MUST be created for next occurrence

Property 5.3: Transaction Creation on Payment
  WHEN bill is marked paid:
    transaction MUST be created with same amount, category, date
    bill.transactionId MUST reference created transaction
```

---

### 6. Spending Insights & Analytics (Requirement 53)

#### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Insights Service                            │
│              (backend/functions/insights)                    │
├─────────────────────────────────────────────────────────────┤
│  Aggregation Job (EventBridge - weekly):                     │
│  1. Query user's transactions for period                     │
│  2. Calculate category totals, trends, patterns              │
│  3. Generate AI insights via Bedrock                         │
│  4. Store insights for quick retrieval                       │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  GET /api/insights/weekly      - This week's insights        │
│  GET /api/insights/monthly     - Monthly summary             │
│  GET /api/insights/trends      - 6-month trend data          │
│  GET /api/insights/patterns    - Spending patterns           │
│  POST /api/insights/ask        - Ask AI about spending       │
└─────────────────────────────────────────────────────────────┘
```

#### 6.2 Data Model

```javascript
// Weekly Insight
{
  PK: "USER#user123",
  SK: "INSIGHT#2026-W05",
  weekNumber: "2026-W05",
  period: { start: "2026-01-27", end: "2026-02-02" },
  summary: {
    totalSpent: 1250.00,
    totalIncome: 5000.00,
    savingsRate: 0.18,
    transactionCount: 45
  },
  categoryBreakdown: [
    { category: "Groceries", amount: 320, change: -5, trend: "down" },
    { category: "Dining", amount: 180, change: 25, trend: "up" },
    { category: "Gas", amount: 85, change: 0, trend: "stable" }
  ],
  aiInsights: [
    {
      type: "alert",
      icon: "⚠️",
      title: "Dining spending up 25%",
      message: "You spent $180 on dining this week, up from $144 last week.",
      actionable: "Try meal prepping to reduce dining costs."
    },
    {
      type: "positive",
      icon: "🎉",
      title: "Great savings rate!",
      message: "You're saving 18% of income, above the recommended 15%."
    }
  ],
  patterns: {
    peakSpendingDay: "Saturday",
    topMerchant: "Amazon",
    avgTransactionSize: 27.78
  },
  generatedAt: "2026-02-02T08:00:00Z"
}
```

#### 6.3 AI Insight Generation (Bedrock)

```javascript
// Prompt for Claude to generate insights
const insightPrompt = `
Analyze this user's weekly spending data and provide 3-5 actionable insights:

Spending Summary:
- Total spent: $${summary.totalSpent}
- Categories: ${JSON.stringify(categoryBreakdown)}
- Compared to last week: ${comparisonData}

Generate insights in JSON format:
[
  {"type": "alert|positive|tip", "title": "...", "message": "...", "actionable": "..."}
]

Focus on: unusual patterns, opportunities to save, positive reinforcement.
Keep messages friendly and encouraging, not judgmental.
`;
```

#### 6.4 Trend Charts Data

```javascript
// GET /api/insights/trends response
{
  months: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"],
  spending: [3200, 3450, 3100, 4200, 3300, 3150],
  income: [5000, 5000, 5000, 5500, 5000, 5000],
  savings: [1800, 1550, 1900, 1300, 1700, 1850],
  categoryTrends: {
    groceries: [350, 380, 340, 420, 360, 320],
    dining: [200, 180, 220, 350, 190, 180],
    entertainment: [150, 120, 180, 280, 140, 100]
  }
}
```

---

### 7. Savings Goals System (Requirement 54)

#### 7.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Goals Service                              │
│               (backend/functions/goals)                      │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  GET  /api/goals              - List all goals               │
│  POST /api/goals              - Create goal                  │
│  PUT  /api/goals/:id          - Update goal                  │
│  DELETE /api/goals/:id        - Delete goal                  │
│  POST /api/goals/:id/contribute - Add contribution           │
│  PUT  /api/goals/reorder      - Reorder priorities           │
│  GET  /api/goals/:id/history  - Contribution history         │
├─────────────────────────────────────────────────────────────┤
│  Scheduled Jobs:                                             │
│  - Weekly: Calculate progress, send updates                  │
│  - On milestone: Send celebration notification               │
└─────────────────────────────────────────────────────────────┘
```

#### 7.2 Data Model

```javascript
// Savings Goal
{
  PK: "FAMILY#family123",
  SK: "GOAL#goal-uuid-001",
  goalId: "goal-uuid-001",
  name: "Emergency Fund",
  icon: "🚨",
  targetAmount: 10000.00,
  currentAmount: 4500.00,
  targetDate: "2026-12-31",
  priority: 1,
  status: "active",  // active, completed, paused, archived
  linkedCategoryId: "cat-savings-emergency",
  progressPercent: 45,
  monthlyRequired: 500.00,  // to reach goal on time
  milestones: {
    "25": { reached: true, date: "2026-01-15" },
    "50": { reached: false },
    "75": { reached: false },
    "100": { reached: false }
  },
  contributions: [
    { date: "2026-02-01", amount: 500, source: "manual" },
    { date: "2026-01-15", amount: 500, source: "category_link" }
  ],
  createdAt: "2025-10-01T00:00:00Z",
  completedAt: null
}
```

#### 7.3 Goal Templates

```javascript
const goalTemplates = [
  {
    id: "emergency",
    name: "Emergency Fund",
    icon: "🚨",
    suggestedAmount: "3-6 months expenses",
  },
  { id: "vacation", name: "Vacation", icon: "✈️", suggestedAmount: null },
  { id: "car", name: "New Car", icon: "🚗", suggestedAmount: null },
  {
    id: "home",
    name: "Home Down Payment",
    icon: "🏠",
    suggestedAmount: "20% of home price",
  },
  { id: "wedding", name: "Wedding", icon: "💍", suggestedAmount: null },
  { id: "education", name: "Education", icon: "🎓", suggestedAmount: null },
  { id: "purchase", name: "Big Purchase", icon: "💻", suggestedAmount: null },
  { id: "holiday", name: "Holiday Gifts", icon: "🎁", suggestedAmount: null },
  { id: "custom", name: "Custom Goal", icon: "🎯", suggestedAmount: null },
];
```

#### 7.4 Progress Calculation

```javascript
function calculateGoalProgress(goal) {
  const progressPercent = Math.min(
    100,
    (goal.currentAmount / goal.targetAmount) * 100,
  );

  let monthlyRequired = null;
  if (goal.targetDate) {
    const monthsRemaining = monthsBetween(
      new Date(),
      new Date(goal.targetDate),
    );
    const amountRemaining = goal.targetAmount - goal.currentAmount;
    monthlyRequired =
      monthsRemaining > 0 ? amountRemaining / monthsRemaining : amountRemaining;
  }

  return { progressPercent, monthlyRequired };
}
```

#### 7.5 Correctness Properties

```
Property 7.1: Progress Accuracy
  progressPercent = (currentAmount / targetAmount) * 100
  progressPercent MUST be capped at 100

Property 7.2: Milestone Triggers
  WHEN progressPercent crosses 25, 50, 75, or 100:
    milestone notification MUST be sent
    milestone.reached MUST be set to true with date

Property 7.3: Category Link Sync
  WHEN transaction added to linkedCategoryId:
    goal.currentAmount MUST increase by transaction amount
    contribution record MUST be created with source="category_link"
```

---

### 8. Bank Account Sync - Plaid Integration (Requirement 55)

#### 8.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Plaid Service                             │
│               (backend/functions/plaid)                      │
├─────────────────────────────────────────────────────────────┤
│  Link Flow:                                                  │
│  1. Frontend requests link token                             │
│  2. User completes Plaid Link                                │
│  3. Frontend sends public_token                              │
│  4. Backend exchanges for access_token                       │
│  5. Store encrypted token in Secrets Manager                 │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  POST /api/plaid/link-token    - Get Plaid Link token        │
│  POST /api/plaid/exchange      - Exchange public token       │
│  GET  /api/plaid/accounts      - List connected accounts     │
│  POST /api/plaid/sync          - Manual sync trigger         │
│  DELETE /api/plaid/accounts/:id - Disconnect account         │
│  GET  /api/plaid/pending       - Pending transactions        │
├─────────────────────────────────────────────────────────────┤
│  Scheduled Sync (EventBridge - daily 3AM UTC):               │
│  1. Get all users with connected accounts                    │
│  2. Batch sync (1 request per account per day)               │
│  3. AI categorize new transactions                           │
│  4. Add to pending review queue                              │
└─────────────────────────────────────────────────────────────┘
```

#### 8.2 Data Model

```javascript
// Connected Bank Account
{
  PK: "USER#user123",
  SK: "PLAID_ACCOUNT#acc-uuid-001",
  accountId: "acc-uuid-001",
  plaidAccountId: "plaid_acc_xxx",
  institutionId: "ins_123",
  institutionName: "Chase",
  accountName: "Checking ****1234",
  accountType: "checking",  // checking, savings, credit
  currentBalance: 5432.10,
  availableBalance: 5200.00,
  lastSynced: "2026-02-01T03:00:00Z",
  nextSyncAvailable: "2026-02-02T03:00:00Z",
  status: "active",  // active, error, disconnected
  accessTokenRef: "plaid/user123/acc-uuid-001",  // Secrets Manager ref
  cursor: "CAoQAhgCIg...",  // Plaid sync cursor
  createdAt: "2026-01-15T10:00:00Z"
}

// Pending Transaction (from Plaid)
{
  PK: "USER#user123",
  SK: "PENDING_TXN#txn-uuid-001",
  transactionId: "txn-uuid-001",
  plaidTransactionId: "plaid_txn_xxx",
  accountId: "acc-uuid-001",
  amount: 45.67,
  merchantName: "AMAZON.COM",
  date: "2026-02-01",
  suggestedCategory: "Shopping",
  categoryConfidence: 0.92,
  status: "pending_review",  // pending_review, approved, rejected
  importedAt: "2026-02-01T03:15:00Z"
}
```

#### 8.3 Cost Control Implementation

```javascript
// Daily sync limit enforcement
async function canSyncAccount(userId, accountId) {
  const account = await getAccount(userId, accountId);
  const now = new Date();
  const nextSync = new Date(account.nextSyncAvailable);

  if (now < nextSync) {
    const hoursRemaining = Math.ceil((nextSync - now) / (1000 * 60 * 60));
    return {
      allowed: false,
      message: `Next sync available in ${hoursRemaining} hours`,
    };
  }
  return { allowed: true };
}

// After successful sync
async function updateSyncTimestamp(userId, accountId) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(3, 0, 0, 0); // Next 3AM UTC

  await updateAccount(userId, accountId, {
    lastSynced: new Date().toISOString(),
    nextSyncAvailable: tomorrow.toISOString(),
  });
}
```

#### 8.4 Mock Mode (Development)

```javascript
// Environment variable: PLAID_MOCK_MODE=true
const mockTransactions = [
  {
    merchant: "WALMART",
    amount: 87.43,
    category: "Groceries",
    date: "2026-02-01",
  },
  { merchant: "SHELL GAS", amount: 45.0, category: "Gas", date: "2026-02-01" },
  {
    merchant: "NETFLIX",
    amount: 15.99,
    category: "Entertainment",
    date: "2026-01-28",
  },
  {
    merchant: "STARBUCKS",
    amount: 6.75,
    category: "Dining",
    date: "2026-01-28",
  },
  {
    merchant: "AMAZON.COM",
    amount: 34.99,
    category: "Shopping",
    date: "2026-01-27",
  },
];

const mockAccounts = [
  { name: "Chase Checking ****1234", type: "checking", balance: 5432.1 },
  { name: "Chase Savings ****5678", type: "savings", balance: 12500.0 },
  { name: "Amex ****9012", type: "credit", balance: -1234.56 },
];
```

#### 8.5 AI Categorization

```javascript
// Prompt for transaction categorization
const categorizationPrompt = `
Categorize this bank transaction:
Merchant: ${transaction.merchantName}
Amount: $${transaction.amount}

Categories: Groceries, Dining, Gas, Shopping, Entertainment, Healthcare,
Utilities, Transportation, Housing, Personal Care, Education, Other

Return JSON: {"category": "...", "confidence": 0.0-1.0}
`;
```

---

### 9. Receipt Scanning with AI Vision (Requirement 56)

#### 9.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Receipt Service                             │
│              (backend/functions/receipt)                     │
├─────────────────────────────────────────────────────────────┤
│  Flow:                                                       │
│  1. Mobile app captures receipt image                        │
│  2. Image compressed and uploaded to S3                      │
│  3. Lambda invokes Claude Haiku via Bedrock                  │
│  4. AI extracts merchant, amount, date, category             │
│  5. Return extracted data for user confirmation              │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  POST /api/receipt/upload      - Get presigned S3 URL        │
│  POST /api/receipt/process     - Process uploaded receipt    │
│  GET  /api/receipt/:id         - Get receipt image           │
│  GET  /api/receipt/usage       - Daily scan usage            │
└─────────────────────────────────────────────────────────────┘
```

#### 9.2 Data Model

```javascript
// Receipt Record
{
  PK: "USER#user123",
  SK: "RECEIPT#rcpt-uuid-001",
  receiptId: "rcpt-uuid-001",
  s3Key: "receipts/user123/2026-02/rcpt-uuid-001.jpg",
  extractedData: {
    merchant: "Costco",
    amount: 156.78,
    date: "2026-02-01",
    category: "Groceries",
    confidence: 0.95
  },
  status: "processed",  // uploading, processing, processed, failed
  transactionId: "txn-uuid-001",  // linked after confirmation
  processedAt: "2026-02-01T14:30:00Z",
  expiresAt: "2026-05-01T00:00:00Z",  // 90-day retention
  createdAt: "2026-02-01T14:29:00Z"
}

// Daily Usage Tracking
{
  PK: "USER#user123",
  SK: "RECEIPT_USAGE#2026-02-01",
  date: "2026-02-01",
  scansUsed: 3,
  scansLimit: 10,  // Free tier limit
  isPremium: false
}
```

#### 9.3 AI Processing (Claude Haiku)

```javascript
// Receipt processing with Bedrock
async function processReceipt(imageBase64) {
  const prompt = `Extract from this receipt image:
- merchant: store/business name
- amount: total amount as number (e.g., 45.67)
- date: purchase date as YYYY-MM-DD
- category: one of [Groceries, Dining, Gas, Shopping, Entertainment, Healthcare, Utilities, Other]

Return ONLY valid JSON: {"merchant":"","amount":0.00,"date":"","category":""}
If unreadable, return: {"error":"Unable to extract receipt data"}`;

  const response = await bedrockClient.invokeModel({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  return JSON.parse(response.body).content[0].text;
}
```

#### 9.4 Cost Control

```javascript
// Check daily limit before processing
async function checkReceiptLimit(userId) {
  const today = new Date().toISOString().split("T")[0];
  const usage = await getUsage(userId, today);

  const limit = usage?.isPremium ? Infinity : 10;
  const used = usage?.scansUsed || 0;

  if (used >= limit) {
    return {
      allowed: false,
      message:
        "Daily scan limit reached. Upgrade to Premium for unlimited scans.",
    };
  }
  return { allowed: true, remaining: limit - used };
}

// Image compression before AI processing
async function compressImage(imageBuffer) {
  // Resize to max 1024px, compress to 80% quality
  // Reduces token cost by ~60%
  return sharp(imageBuffer)
    .resize(1024, 1024, { fit: "inside" })
    .jpeg({ quality: 80 })
    .toBuffer();
}
```

---

### 10. Receipt-to-Bank Reconciliation (Requirement 57)

#### 10.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               Reconciliation Service                         │
│           (backend/functions/reconciliation)                 │
├─────────────────────────────────────────────────────────────┤
│  Triggered by:                                               │
│  1. After Plaid sync imports new transactions                │
│  2. After receipt is processed and confirmed                 │
│  3. Manual reconciliation request                            │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints:                                              │
│  GET  /api/reconcile/status    - Reconciliation summary      │
│  GET  /api/reconcile/unmatched - Unmatched items             │
│  POST /api/reconcile/match     - Manual match                │
│  POST /api/reconcile/unmatch   - Undo match                  │
└─────────────────────────────────────────────────────────────┘
```

#### 10.2 Matching Algorithm

```javascript
async function reconcileTransactions(userId) {
  const bankTxns = await getPendingBankTransactions(userId);
  const receiptTxns = await getUnmatchedReceiptTransactions(userId);

  const matches = [];
  const unmatched = { bank: [], receipt: [] };

  for (const bankTxn of bankTxns) {
    const match = findBestMatch(bankTxn, receiptTxns);

    if (match.confidence >= 0.9) {
      // Auto-match high confidence
      matches.push({
        bank: bankTxn,
        receipt: match.receipt,
        confidence: match.confidence,
        auto: true,
      });
      receiptTxns.splice(receiptTxns.indexOf(match.receipt), 1);
    } else if (match.confidence >= 0.6) {
      // Suggest match for review
      matches.push({
        bank: bankTxn,
        receipt: match.receipt,
        confidence: match.confidence,
        auto: false,
      });
    } else {
      unmatched.bank.push(bankTxn);
    }
  }

  unmatched.receipt = receiptTxns; // Remaining unmatched receipts
  return { matches, unmatched };
}

function findBestMatch(bankTxn, receiptTxns) {
  let bestMatch = { receipt: null, confidence: 0 };

  for (const receipt of receiptTxns) {
    let confidence = 0;

    // Amount matching (40% weight)
    const amountDiff = Math.abs(bankTxn.amount - receipt.amount);
    if (amountDiff === 0) confidence += 0.4;
    else if (amountDiff <= 0.5)
      confidence += 0.3; // Tip tolerance
    else if (amountDiff <= 2.0) confidence += 0.1;

    // Date matching (30% weight)
    const daysDiff = Math.abs(daysBetween(bankTxn.date, receipt.date));
    if (daysDiff === 0) confidence += 0.3;
    else if (daysDiff <= 1) confidence += 0.2;
    else if (daysDiff <= 2) confidence += 0.1; // Pending transaction delay

    // Merchant matching (30% weight)
    const merchantSimilarity = fuzzyMatch(bankTxn.merchant, receipt.merchant);
    confidence += merchantSimilarity * 0.3;

    if (confidence > bestMatch.confidence) {
      bestMatch = { receipt, confidence };
    }
  }

  return bestMatch;
}
```

#### 10.3 Data Model

```javascript
// Reconciliation Record
{
  PK: "USER#user123",
  SK: "RECONCILE#2026-02-01#txn-001",
  bankTransactionId: "bank-txn-001",
  receiptTransactionId: "rcpt-txn-001",
  matchConfidence: 0.95,
  matchType: "auto",  // auto, manual, suggested
  status: "verified",  // verified, mismatch, pending_review
  amountDifference: 0.00,
  reconciledAt: "2026-02-01T15:00:00Z"
}

// Transaction Status Extension
{
  // Added to existing transaction record
  reconciliationStatus: "verified",  // verified, bank_only, receipt_only, mismatch
  linkedReceiptId: "rcpt-uuid-001",
  linkedBankTxnId: "bank-txn-001"
}
```

#### 10.4 UI Status Indicators

| Status       | Icon | Description                      |
| ------------ | ---- | -------------------------------- |
| Verified     | ✅   | Receipt matches bank transaction |
| Bank Only    | 🏦   | Imported from bank, no receipt   |
| Receipt Only | 📸   | Scanned receipt, not in bank yet |
| Mismatch     | ⚠️   | Amount differs between sources   |
| Pending      | ⏳   | Awaiting bank transaction        |

---

## New API Endpoints Summary (Features 5-10)

| Method | Endpoint                  | Description            | Auth |
| ------ | ------------------------- | ---------------------- | ---- |
| GET    | /api/bills                | List all bills         | User |
| POST   | /api/bills                | Create bill reminder   | User |
| PUT    | /api/bills/:id            | Update bill            | User |
| POST   | /api/bills/:id/pay        | Mark bill paid         | User |
| GET    | /api/bills/calendar       | Calendar view          | User |
| GET    | /api/bills/upcoming       | Next 30 days           | User |
| GET    | /api/insights/weekly      | Weekly insights        | User |
| GET    | /api/insights/monthly     | Monthly summary        | User |
| GET    | /api/insights/trends      | 6-month trends         | User |
| POST   | /api/insights/ask         | Ask AI                 | User |
| GET    | /api/goals                | List goals             | User |
| POST   | /api/goals                | Create goal            | User |
| PUT    | /api/goals/:id            | Update goal            | User |
| POST   | /api/goals/:id/contribute | Add contribution       | User |
| PUT    | /api/goals/reorder        | Reorder priorities     | User |
| POST   | /api/plaid/link-token     | Get Plaid Link token   | User |
| POST   | /api/plaid/exchange       | Exchange token         | User |
| GET    | /api/plaid/accounts       | List accounts          | User |
| POST   | /api/plaid/sync           | Manual sync            | User |
| DELETE | /api/plaid/accounts/:id   | Disconnect             | User |
| GET    | /api/plaid/pending        | Pending transactions   | User |
| POST   | /api/receipt/upload       | Get S3 presigned URL   | User |
| POST   | /api/receipt/process      | Process receipt        | User |
| GET    | /api/receipt/:id          | Get receipt image      | User |
| GET    | /api/receipt/usage        | Daily usage            | User |
| GET    | /api/reconcile/status     | Reconciliation summary | User |
| GET    | /api/reconcile/unmatched  | Unmatched items        | User |
| POST   | /api/reconcile/match      | Manual match           | User |

---

## New DynamoDB Access Patterns (Features 5-10)

| Access Pattern           | PK                | SK                        | GSI                 |
| ------------------------ | ----------------- | ------------------------- | ------------------- |
| Get user bills           | FAMILY#{familyId} | BILL#{billId}             | -                   |
| Get bills by month       | -                 | -                         | GSI1: BILLS#{month} |
| Get user insights        | USER#{userId}     | INSIGHT#{week}            | -                   |
| Get user goals           | FAMILY#{familyId} | GOAL#{goalId}             | -                   |
| Get Plaid accounts       | USER#{userId}     | PLAID_ACCOUNT#{accountId} | -                   |
| Get pending transactions | USER#{userId}     | PENDING_TXN#{txnId}       | -                   |
| Get receipts             | USER#{userId}     | RECEIPT#{receiptId}       | -                   |
| Get receipt usage        | USER#{userId}     | RECEIPT_USAGE#{date}      | -                   |
| Get reconciliation       | USER#{userId}     | RECONCILE#{date}#{txnId}  | -                   |

---

## Cost Estimates Summary

| Feature           | Service          | Monthly Cost (1000 users) |
| ----------------- | ---------------- | ------------------------- |
| Bill Reminders    | SNS, EventBridge | ~$5                       |
| Spending Insights | Bedrock (Claude) | ~$20-30                   |
| Savings Goals     | DynamoDB         | ~$2                       |
| Bank Sync (Plaid) | Plaid API        | ~$600-1000 (mock: $0)     |
| Receipt Scanning  | Bedrock (Haiku)  | ~$10-20                   |
| Reconciliation    | Lambda           | ~$2                       |
| **Total**         |                  | **~$640-1060**            |

**Cost Optimization Notes:**

- Plaid: 1 sync/day/account limit saves ~70% vs real-time
- Receipts: Claude Haiku saves ~90% vs Textract
- Insights: Weekly batch processing vs real-time
- Mock mode: $0 for development/testing

---

## Implementation Priority

### Sprint 1 (Week 1-2): Foundation

1. Bill Reminders (Req 52) - Extends existing notification system
2. Savings Goals (Req 54) - New feature, high engagement

### Sprint 2 (Week 3-4): Intelligence

3. Spending Insights (Req 53) - AI integration
4. Receipt Scanning (Req 56) - AI Vision

### Sprint 3 (Week 5-6): Integration

5. Bank Sync with Mock Mode (Req 55) - Plaid foundation
6. Reconciliation (Req 57) - Ties receipts + bank together
