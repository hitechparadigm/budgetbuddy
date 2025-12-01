# BudgetBuddy Design Document

**Last Updated**: 2025-11-21
**Status**: MVP Complete (99%)
**Architecture**: AWS Serverless with React Frontend

## Overview

BudgetBuddy is a zero-based budgeting web application built on AWS serverless architecture with a React frontend. The design follows EveryDollar's clean, three-column layout with focus on simplicity and speed.

**Core Design Principle:** Users should manage their budget effortlessly with minimal clicks and maximum clarity.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Web App (Vite + TypeScript + Tailwind CSS)       │  │
│  │  - Authentication UI                                      │  │
│  │  - Budget Management Interface                           │  │
│  │  - Transaction Recording                                 │  │
│  │  - Summary Visualization                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Infrastructure                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CloudFront CDN (Static Asset Delivery)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Gateway (REST API)                                   │  │
│  │  - /auth/* endpoints                                      │  │
│  │  - /budget/* endpoints                                    │  │
│  │  - JWT token validation                                   │  │
│  │  - CORS configuration                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Lambda Functions (Node.js 20)                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │  │ Auth       │  │ Budget     │  │ Transaction│        │  │
│  │  │ Handler    │  │ Handler    │  │ Handler    │        │  │
│  │  └────────────┘  └────────────┘  └────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Amazon Cognito (User Authentication)                    │  │
│  │  - User pools                                             │  │
│  │  - JWT token generation                                   │  │
│  │  - Password management                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DynamoDB (Data Storage)                                  │  │
│  │  - Single table design                                    │  │
│  │  - User data                                              │  │
│  │  - Budget data                                            │  │
│  │  - Transaction data                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Application Flow

```
┌──────────┐    ┌──────────┐    ┌─────────────────┐
│ Register │ -> │  Login   │ -> │  Budget Screen  │
│          │    │          │    │  (main app)     │
└──────────┘    └──────────┘    └─────────────────┘
```

## Technical Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development and optimized builds)
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Routing**: React Router v6 (client-side routing)
- **State Management**: React useState/useEffect (no complex state library needed)
- **HTTP Client**: Fetch API with custom wrapper
- **Icons**: Emoji-based (no icon library needed)

### Backend
- **API**: AWS API Gateway (REST API)
- **Compute**: AWS Lambda (Node.js 20)
- **Authentication**: AWS Cognito User Pools
- **Database**: Amazon DynamoDB (single-table design)
- **Storage**: Amazon S3 (static assets)
- **CDN**: Amazon CloudFront (global content delivery)
- **Infrastructure**: AWS CDK (TypeScript)

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Testing**: Jest (unit tests)
- **CI/CD**: GitHub Actions
- **Version Control**: Git with GitHub

## Data Models

### User Entity
```typescript
interface User {
  userId: string;           // Cognito user ID
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Budget Entity
```typescript
interface Budget {
  id: string;               // budget_<timestamp>
  userId: string;           // Owner's Cognito ID
  month: string;            // YYYY-MM format
  groups: BudgetGroup[];    // Income, Savings, Expenses
  isAIGenerated: boolean;   // Future: AI-generated flag
  createdAt: string;
  updatedAt: string;
}
```

### Budget Group
```typescript
interface BudgetGroup {
  id: string;
  name: string;             // "Income", "Savings", "Expenses"
  type: 'income' | 'savings' | 'expense';
  icon: string;             // Emoji
  categories: BudgetCategory[];
  isCollapsed: boolean;
  order: number;
}
```

### Budget Category
```typescript
interface BudgetCategory {
  id: string;
  name: string;             // e.g., "Salary", "Groceries"
  icon: string;             // Emoji
  plannedAmount: number;
  spentAmount: number;
  transactions: Transaction[];
  order: number;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'annually';
  nextDueDate?: string;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;             // YYYY-MM-DD
  createdAt: string;
}
```

## Database Design (DynamoDB)

### Single-Table Design

BudgetBuddy uses a single DynamoDB table with a single-table design pattern for cost optimization and performance.

**Table Name**: `budgetbuddy-dev-main`

**Primary Key**:
- **Partition Key (PK)**: String - Entity identifier
- **Sort Key (SK)**: String - Entity type or relationship

**Billing Mode**: On-demand (pay per request)

**Features**:
- Point-in-time recovery enabled
- Encryption at rest with AWS managed keys
- CloudWatch metrics enabled

### Access Patterns

#### 1. User Data
```
PK: USER#<userId>
SK: METADATA
Attributes: email, firstName, lastName, createdAt, updatedAt
```

#### 2. Budget Data
```
PK: USER#<userId>
SK: BUDGET#<month>
Attributes: budgetId, month, groups (JSON), isAIGenerated, createdAt, updatedAt
```

**Example**:
```json
{
  "PK": "USER#abc123",
  "SK": "BUDGET#2025-11",
  "budgetId": "budget_1732147200000",
  "month": "2025-11",
  "groups": [
    {
      "id": "income-group",
      "name": "Income",
      "type": "income",
      "categories": [...]
    }
  ],
  "isAIGenerated": false,
  "createdAt": "2025-11-21T10:00:00Z",
  "updatedAt": "2025-11-21T15:30:00Z"
}
```

### Query Patterns

#### Get User Profile
```typescript
const params = {
  TableName: 'budgetbuddy-dev-main',
  Key: {
    PK: `USER#${userId}`,
    SK: 'METADATA'
  }
};
```

#### Get All Budgets for User
```typescript
const params = {
  TableName: 'budgetbuddy-dev-main',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${userId}`,
    ':sk': 'BUDGET#'
  }
};
```

#### Get Specific Month Budget
```typescript
const params = {
  TableName: 'budgetbuddy-dev-main',
  Key: {
    PK: `USER#${userId}`,
    SK: `BUDGET#${month}`  // e.g., "BUDGET#2025-11"
  }
};
```

#### Create/Update Budget
```typescript
const params = {
  TableName: 'budgetbuddy-dev-main',
  Item: {
    PK: `USER#${userId}`,
    SK: `BUDGET#${month}`,
    budgetId: `budget_${Date.now()}`,
    month: month,
    groups: budgetGroups,
    isAIGenerated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};
```

### Data Storage Strategy

**Embedded Documents**: Budget groups, categories, and transactions are stored as nested JSON within the budget item. This approach:
- Reduces query complexity (single read for entire budget)
- Minimizes DynamoDB costs (fewer read/write operations)
- Simplifies data consistency (atomic updates)
- Matches the application's access patterns (always fetch complete budget)

**Trade-offs**:
- Item size limit: 400KB (sufficient for typical monthly budgets)
- No individual transaction queries (acceptable for MVP)
- Updates require full budget item replacement (acceptable for MVP)

### Performance Characteristics

**Read Operations**:
- Get user profile: 1 read unit
- Get single month budget: 1 read unit
- Get all user budgets: 1 read unit per month

**Write Operations**:
- Create budget: 1 write unit
- Update budget: 1 write unit
- Delete budget: 1 write unit

**Cost Optimization**:
- On-demand billing: Pay only for actual usage
- Single-table design: Reduced table management overhead
- Embedded documents: Fewer operations per user action

### Backup and Recovery

- **Point-in-time Recovery**: Enabled for 35-day retention
- **On-demand Backups**: Manual backups before major changes
- **Disaster Recovery**: Cross-region replication (future enhancement)

## User Interface Design

### Main Budget Screen Layout

**Three-Column Layout** (Desktop):
```
┌──────────────┬─────────────────────────────────────┬──────────────────┐
│ SIDEBAR      │ BUDGET CATEGORIES                   │ SUMMARY/TRANS    │
│ (240px)      │ (flex-1)                            │ (400px resizable)│
├──────────────┼─────────────────────────────────────┼──────────────────┤
│ Logo         │ ◄ Oct Nov Dec [January 2025] Feb   │ [Summary] Trans  │
│ BudgetBuddy  │                                     │                  │
│              │ ● Income for January           ▼    │ Income: $4,000   │
│ 📊 Budget    │   💰 Salary         $4,000    $0   │ Planned: $3,800  │
│ 🏦 Accounts  │   + Add Item                        │ Spent: $620      │
│ 🗺️ Roadmap   │                                     │ Remaining: $3,180│
│ 💳 Paycheck  │ ● Savings for January          ▼    │                  │
│ 🎯 Goals     │   💾 Emergency Fund  $400     $0   │ [Circular Chart] │
│ 📈 Insights  │   🎓 RRSP/401k      $400     $0   │                  │
│ 📰 My Feed   │   + Add Item                        │ Category Details │
│ ❓ Help      │                                     │ ● Savings (20%)  │
│ ⚙️ Settings  │ ● Expenses for January         ▼    │   Emergency $400 │
│              │   🏠 Rent          $1,200    $620  │ ● Expenses (80%) │
│ [User]       │   🛒 Groceries      $400     $0   │   Rent $1,200    │
│ Sign out     │   🚗 Transportation  $200     $0   │   Groceries $400 │
└──────────────┴─────────────────────────────────────┴──────────────────┘
```

**Responsive Behavior**:
- **Desktop (≥1024px)**: Full three-column layout
- **Tablet (768-1023px)**: Collapsible sidebar, two-column main area
- **Mobile Landscape (≥640px)**: Hamburger menu, single column with tabs

### Month Navigation Design

**Centered Navigation Bar**:
```
◄  [Oct] [Nov] [Dec] [January 2025 - $3,180 left] [Feb] [Mar] [Apr]  ►
```

**Features**:
- 7 months visible (3 before, current, 3 after)
- Selected month: larger, green border, shows remaining budget
- Non-selected months: smaller, gray border
- Fixed dimensions prevent layout jumping
- Horizontal scroll on mobile
- Arrow buttons for quick navigation

### Color Scheme

**Primary Colors**:
- Green: `#10b981` (success, positive balance, income)
- Red: `#ef4444` (overspent, negative balance, expenses)
- Blue: `#3b82f6` (interactive elements, links)
- Gray: `#6b7280` (text, borders, neutral elements)

**Background Colors**:
- White: `#ffffff` (main background)
- Light Gray: `#f9fafb` (secondary background)
- Green Tint: `#f0fdf4` (selected month, positive indicators)
- Red Tint: `#fef2f2` (overspent categories)

### Typography

- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto')
- **Headings**:
  - H1: 24px, font-bold
  - H2: 18px, font-semibold
  - H3: 16px, font-medium
- **Body**: 14px, font-normal
- **Small**: 12px, font-normal

## Component Architecture

### Page Components

1. **AuthPage** (`/auth`)
   - Login form
   - Register form
   - Password validation
   - Error handling

2. **BudgetPage** (`/budget`)
   - Main application interface
   - Three-column layout
   - Budget management
   - Transaction recording
   - Summary visualization

3. **SettingsPage** (`/settings`)
   - User profile
   - Account settings
   - Preferences

### Feature Components

1. **Sidebar Navigation**
   - Logo and branding
   - Navigation menu
   - User profile section
   - Collapsible on mobile

2. **Month Navigation**
   - Month pills (7 visible)
   - Previous/Next arrows
   - Current month highlight
   - Remaining budget display

3. **Budget Groups**
   - Income group
   - Savings group
   - Expenses group
   - Collapsible sections
   - Add item buttons

4. **Budget Categories**
   - Category name and icon
   - Planned vs spent amounts
   - Progress indicators
   - Edit/delete buttons (on hover)
   - Overspent highlighting

5. **Transaction Modal**
   - Category selection
   - Amount input
   - Description field
   - Date picker
   - Submit/cancel buttons

6. **Budget Item Modal**
   - Name input
   - Icon picker (emoji)
   - Amount input
   - Recurring options
   - Frequency selector

7. **Summary View**
   - Circular progress chart
   - Key metrics display
   - Category breakdown
   - Percentage calculations
   - Color-coded groups

8. **Transactions List**
   - Transaction items
   - Category labels
   - Amount display
   - Delete buttons
   - Empty state message

9. **Floating Action Button (FAB)**
   - Expandable menu
   - Income option
   - Expense option
   - Smooth animations

## API Design

### Authentication Endpoints

```
POST /auth/register
Request: { email, password, firstName, lastName }
Response: { message, userId }

POST /auth/login
Request: { email, password }
Response: { accessToken, refreshToken, idToken, expiresIn }

GET /auth/profile
Headers: Authorization: Bearer <token>
Response: { userId, email, firstName, lastName }
```

### Budget Endpoints

```
POST /budget
Headers: Authorization: Bearer <token>
Request: { month, groups, isAIGenerated }
Response: { budget }

GET /budget
Headers: Authorization: Bearer <token>
Query: ?month=YYYY-MM (optional)
Response: { budgets: Budget[] }

PUT /budget
Headers: Authorization: Bearer <token>
Request: { month, groups }
Response: { budget }

DELETE /budget/{budgetId}
Headers: Authorization: Bearer <token>
Response: { message }
```

## State Management

### Local State (React useState)
- Current month selection
- Modal visibility states
- Form input values
- UI interaction states (hover, focus)
- Sidebar collapse state

### Persistent State (localStorage)
- JWT tokens (access, refresh, ID)
- Token expiration time
- User preferences (future)

### Server State (API)
- User profile data
- Budget data
- Transaction data

## Security Design

### Authentication Flow
1. User submits credentials
2. Frontend sends to `/auth/login`
3. Lambda validates with Cognito
4. Cognito returns JWT tokens
5. Frontend stores tokens in localStorage
6. All subsequent requests include `Authorization: Bearer <token>` header

### Token Management
- Access token: Short-lived (1 hour)
- Refresh token: Long-lived (30 days)
- ID token: Contains user claims
- Automatic refresh before expiration

### API Security
- All endpoints require authentication (except /auth/register and /auth/login)
- JWT validation on API Gateway
- CORS configured for specific origins
- HTTPS only

## Performance Optimizations

### Frontend
- Code splitting with React.lazy
- Optimized bundle size with Vite
- Minimal dependencies
- Efficient re-renders with React.memo (where needed)
- Debounced API calls for updates

### Backend
- Lambda cold start optimization
- DynamoDB single-table design
- Efficient query patterns
- CloudFront caching for static assets
- API Gateway caching (future)

### Data Loading
- Load budget data on mount
- Optimistic UI updates
- Error boundaries for graceful failures
- Loading states for async operations

## Accessibility

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus indicators
- Color contrast ratios meet WCAG AA standards
- Screen reader friendly

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

1. **AI Budget Generation**: AWS Bedrock integration for personalized budgets
2. **Family Accounts**: Multi-user collaboration
3. **Mobile Apps**: React Native iOS/Android
4. **Bank Integration**: Plaid API for automatic transactions
5. **Reports**: Historical analysis and trends
6. **Goals**: Savings goals and debt payoff tracking
7. **Notifications**: Bill reminders and budget alerts
8. **Export**: PDF/CSV export functionality


---

## Enhanced Month Navigation UI Design

### Overview

Redesign the month navigation interface to match the EveryDollar style with a cleaner header layout, "Today" button, arrow navigation, and future month handling with budget copying functionality.

### Components

#### 1. Month Header Component

**Location**: Top of budget page (desktop/tablet view)

**Layout**:
```
[Month Year]                    [Today] [<] [>]
$X,XXX.XX left to budget
                    [⚠️ You are viewing a future month]
```

**Elements**:
- **Month Title**: Large heading (text-3xl) showing "Month YYYY" (e.g., "December 2025")
- **Budget Remaining**: Subtitle showing amount left to budget with color coding:
  - Green: Positive remaining
  - Red: Negative (over budget)
- **Today Button**: Blue outlined button that navigates to current month
- **Arrow Buttons**: Left/right arrows for prev/next month navigation
- **Future Month Badge**: Orange warning badge (only shown for future months)

#### 2. Empty State Component

**Trigger**: When viewing a future month with no existing budget

**Layout**:
```
        [Circular Icon]

Hey there, looks like you need a budget for December.

We'll copy November's budget to get you started.

    [Start Planning for December]
```

**Elements**:
- **Icon**: Large circular border with document/arrow icon (w-48 h-48)
- **Heading**: "Hey there, looks like you need a budget for [Month]"
- **Subtext**: "We'll copy [Previous Month]'s budget to get you started"
- **Action Button**: Blue button "Start Planning for [Month]"

### Data Flow

#### Month Navigation Flow
```
User clicks arrow/Today
  ↓
Update currentMonth state
  ↓
loadBudget() called
  ↓
Check if budget exists for month
  ↓
If exists: Display budget
If not + future: Show empty state
If not + past: Show empty budget
```

#### Copy Previous Month Flow
```
User clicks "Start Planning"
  ↓
Fetch previous month's budget from API
  ↓
Copy budget structure:
  - Keep: categories, planned amounts, icons
  - Reset: spent amounts = 0, transactions = []
  - New: budget ID, month, timestamps
  ↓
Save new budget to DynamoDB
  ↓
Display new budget
```

### API Integration

**Endpoints Used**:
- `GET /budget` - Fetch all budgets for user
- `POST /budget` - Create new budget
- `PUT /budget/{id}` - Update existing budget

**Budget Copy Logic**:
```typescript
const copyPreviousMonthBudget = async () => {
  // 1. Calculate previous month
  const prevMonth = getPreviousMonth(currentMonth);

  // 2. Fetch previous budget
  const prevBudget = await fetchBudget(prevMonth);

  // 3. Create new budget with copied structure
  const newBudget = {
    ...prevBudget,
    id: generateId(),
    month: currentMonth,
    groups: prevBudget.groups.map(group => ({
      ...group,
      categories: group.categories.map(cat => ({
        ...cat,
        id: generateId(),
        spentAmount: 0,
        transactions: []
      }))
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 4. Save to backend
  await saveBudgetToBackend(newBudget);

  // 5. Update UI
  setBudget(newBudget);
};
```

### State Management

**New State Variables**:
- None (uses existing `currentMonth` state)

**New Functions**:
- `goToToday()` - Navigate to current month
- `isFutureMonth()` - Check if viewing future month
- `copyPreviousMonthBudget()` - Copy previous month's budget

### UI/UX Considerations

1. **Visual Hierarchy**: Month name is prominent, controls are secondary
2. **Color Coding**:
   - Green: Positive budget remaining
   - Red: Over budget
   - Orange: Future month warning
   - Blue: Action buttons
3. **Responsive**: Header adapts to mobile with simplified layout
4. **Loading States**: Show loading indicator while copying budget
5. **Error Handling**: Display error if previous month has no budget

### Testing Strategy

**Unit Tests**:
- Test `isFutureMonth()` with various dates
- Test `copyPreviousMonthBudget()` with mock data
- Test month navigation state updates

**Integration Tests**:
- Test full flow: navigate to future month → copy budget → verify data saved
- Test "Today" button returns to current month
- Test arrow navigation updates month correctly

**Property-Based Tests**:
- Property 1: For any future month, copying previous month should create valid budget
- Property 2: For any month navigation, budget data should persist correctly


---

## Budget Reset and Recurring Category Settings Design

### Overview

Add functionality to reset the current budget and restart the AI setup process, plus preserve recurring category settings (like bi-weekly salary) when copying budgets to future months. This ensures users don't have to reconfigure recurring items every month.

### Components

#### 1. Reset Budget Button

**Location**: Budget page header, near the month navigation controls

**UI Design**:
```
[Month Year]  $X left to budget    [Reset] [Today] [<] [>]
```

**Behavior**:
- Clicking "Reset" opens a confirmation modal
- Modal asks: "Are you sure you want to reset this budget? This will delete all categories and transactions for [Month]."
- Options: "Cancel" (gray) and "Reset Budget" (red)
- On confirm: Delete budget, navigate to AI budget generation page

#### 2. Recurring Category Settings

**Data Model Updates**:
```typescript
interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  plannedAmount: number;
  spentAmount: number;
  transactions: Transaction[];
  order: number;
  isRecurring: boolean;  // NEW
  recurringFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'annually';  // NEW
  nextDueDate?: string;  // NEW - ISO date string
}
```

**UI Updates**:
- Add checkbox "Make this recurring" when adding/editing categories
- Add dropdown for frequency (weekly, bi-weekly, monthly, annually)
- Show recurring badge on category items (e.g., "🔄 Bi-weekly")

#### 3. Smart Budget Copying

**Logic Flow**:
```
User clicks "Start Planning for [Month]"
  ↓
Find most recent past month with budget
  ↓
Copy ONLY recurring categories
  ↓
For each recurring category:
  - Copy: name, icon, plannedAmount, isRecurring, recurringFrequency
  - Reset: spentAmount = 0, transactions = []
  - Calculate: nextDueDate based on frequency
  - Generate: new category ID
  ↓
Save new budget to DynamoDB
  ↓
Display new budget
```

### API Integration

**No new endpoints needed** - uses existing:
- `GET /budget` - Fetch budgets
- `POST /budget` - Create new budget
- `PUT /budget/{id}` - Update budget
- `DELETE /budget/{id}` - Delete budget (for reset)

### State Management

**New State Variables**:
- `showResetModal: boolean` - Control reset confirmation modal
- None for recurring settings (stored in category data)

**Updated Functions**:
- `copyPreviousMonthBudget()` - Filter to only recurring categories
- `handleBudgetItemSubmit()` - Save recurring settings
- `handleResetBudget()` - Delete budget and navigate to AI flow

### Recurring Frequency Calculations

**Next Due Date Logic**:
```typescript
const calculateNextDueDate = (
  currentDate: Date,
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'annually'
): string => {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'bi-weekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'annually':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next.toISOString();
};
```

### UI/UX Considerations

1. **Reset Button Placement**: Near month navigation for easy access
2. **Confirmation Modal**: Prevent accidental budget deletion
3. **Recurring Badge**: Visual indicator on recurring categories
4. **Smart Copying**: Only copy recurring items to reduce clutter
5. **Frequency Options**: Common patterns (weekly, bi-weekly, monthly, annually)

### Testing Strategy

**Unit Tests**:
- Test `calculateNextDueDate()` with various frequencies
- Test `copyPreviousMonthBudget()` filters recurring categories
- Test reset confirmation modal shows/hides correctly

**Integration Tests**:
- Test full reset flow: click → confirm → navigate to AI page
- Test recurring category creation and copying
- Test budget copy preserves recurring settings

**Manual Testing**:
- Create budget with recurring salary (bi-weekly)
- Navigate to future month and create budget
- Verify salary is copied with bi-weekly setting
- Test reset button deletes budget and restarts AI flow


---

## Transaction and Budget Item Clarity Design

### Overview

Improve UI clarity by distinguishing between actual transactions (recorded income/expenses) and planned budget items (future allocations). This prevents user confusion about whether they're recording real activity or planning future spending.

### UI Label Updates

#### Transaction Form (FAB)
**Current**: "Plan an Expense" / "Plan an Income"
**New**: "Record Actual Expense" / "Record Actual Income"

**Modal Title Logic**:
```typescript
const getTransactionModalTitle = (type: 'income' | 'expense', isEdit: boolean) => {
  if (isEdit) return 'Edit Transaction';
  return type === 'income' ? 'Record Actual Income' : 'Record Actual Expense';
};
```

#### Budget Item Form (Add Item Button)
**Current**: Generic "Add Item"
**New**: "Add Planned Income Item" / "Add Planned Expense Item" / "Add Planned Savings Item"

**Modal Title Logic**:
```typescript
const getBudgetItemModalTitle = (groupType: 'income' | 'savings' | 'expense', isEdit: boolean) => {
  if (isEdit) return 'Edit Budget Item';

  const typeLabel = {
    income: 'Income',
    savings: 'Savings',
    expense: 'Expense'
  }[groupType];

  return `Add Planned ${typeLabel} Item`;
};
```

### Terminology Consistency

**Throughout the application**:
- Use "Transaction" or "Actual" for recorded activity
- Use "Budget Item" or "Planned" for future allocations
- Use "Spent" for actual amounts in categories
- Use "Planned" for budgeted amounts in categories

### Component Updates

1. **TransactionForm.tsx**: Update header to show "Record Actual [Type]"
2. **BudgetItemModal.tsx**: Update header to show "Add Planned [Type] Item"
3. **TransactionList.tsx**: Ensure "Transactions" label is used consistently
4. **BudgetDashboard.tsx**: Use "Planned" vs "Actual" labels in summaries

---

## Transaction Date Validation and Warnings Design

### Overview

Prevent users from accidentally adding transactions to the wrong month by validating transaction dates against the currently selected budget month and providing clear warnings with actionable options.

### Validation Logic

```typescript
interface DateValidationResult {
  isValid: boolean;
  warning?: string;
  suggestedMonth?: string;
}

const validateTransactionDate = (
  transactionDate: string,
  currentBudgetMonth: string // Format: "YYYY-MM"
): DateValidationResult => {
  const txDate = new Date(transactionDate);
  const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

  if (txMonth === currentBudgetMonth) {
    return { isValid: true };
  }

  const txMonthName = txDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentMonthName = new Date(currentBudgetMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return {
    isValid: false,
    warning: `This transaction date (${txMonthName}) is outside the current budget month (${currentMonthName})`,
    suggestedMonth: txMonth
  };
};
```

### Warning UI Component

**Location**: Below date input field in TransactionForm

**Design**:
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Warning: Date Outside Current Month                      │
│                                                              │
│ This transaction date (December 2025) is outside the        │
│ current budget month (November 2025).                       │
│                                                              │
│ What would you like to do?                                  │
│                                                              │
│ [Continue with Nov 2025]  [Switch to Dec 2025]  [Cancel]   │
└─────────────────────────────────────────────────────────────┘
```

**Styling**:
- Background: Orange/yellow warning color (`bg-yellow-900 bg-opacity-30`)
- Border: Orange (`border-yellow-600`)
- Icon: Warning emoji or icon
- Buttons: Primary action (Switch), Secondary (Continue), Tertiary (Cancel)

### User Flow

```
User selects date in transaction form
  ↓
Date validation runs on change
  ↓
If date outside current month:
  - Show warning banner
  - Highlight date field with warning color
  - Disable submit until user makes choice
  ↓
User chooses action:
  - Continue: Record in current month (dismiss warning)
  - Switch: Navigate to correct month, keep form data
  - Cancel: Close warning, allow date change
```

### State Management

```typescript
interface TransactionFormState {
  formData: TransactionFormData;
  dateValidation: DateValidationResult;
  showDateWarning: boolean;
  userDateChoice: 'continue' | 'switch' | null;
}
```

### API Integration

No API changes needed - validation is client-side only. Transaction is recorded in the currently selected budget month regardless of transaction date.

---

## Transaction Editing Design

### Overview

Enable users to edit existing transactions by double-clicking on them in the transaction list. This provides a seamless way to correct mistakes without deleting and re-adding transactions.

### UI Interaction

**Transaction List Item**:
- Add `cursor-pointer` class on hover
- Add `onDoubleClick` event handler
- Show visual feedback (slight background change) on hover
- Maintain existing delete button functionality

**CSS Updates**:
```css
.transaction-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.transaction-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
```

### Edit Flow

```
User double-clicks transaction
  ↓
Open TransactionForm in edit mode
  ↓
Pre-populate form with transaction data
  ↓
User modifies fields
  ↓
User clicks "Update Transaction"
  ↓
Validate form
  ↓
Calculate category spent amount changes
  ↓
Update transaction in database
  ↓
Update affected categories' spent amounts
  ↓
Refresh UI
  ↓
Close modal
```

### Category Spent Amount Updates

When editing a transaction, we need to handle three scenarios:

**1. Amount Changed (same category)**:
```typescript
const oldSpent = category.spentAmount;
const newSpent = oldSpent - oldTransaction.amount + newTransaction.amount;
```

**2. Category Changed (same amount)**:
```typescript
// Old category
oldCategory.spentAmount -= transaction.amount;

// New category
newCategory.spentAmount += transaction.amount;
```

**3. Both Amount and Category Changed**:
```typescript
// Old category
oldCategory.spentAmount -= oldTransaction.amount;

// New category
newCategory.spentAmount += newTransaction.amount;
```

### Component Updates

**TransactionList.tsx**:
```typescript
<div
  className="transaction-item"
  onDoubleClick={() => onEdit(transaction)}
  style={{ cursor: 'pointer' }}
>
  {/* Transaction content */}
</div>
```

**TransactionForm.tsx**:
```typescript
interface TransactionFormProps {
  transaction?: Transaction;  // If provided, form is in edit mode
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// In component
const isEditMode = !!transaction;
const modalTitle = isEditMode ? 'Edit Transaction' : getTransactionModalTitle(formData.type);
const submitButtonText = isEditMode ? 'Update Transaction' : 'Add Transaction';
```

**BudgetDashboard.tsx** (or parent component):
```typescript
const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

const handleEditTransaction = (transaction: Transaction) => {
  setEditingTransaction(transaction);
  setShowTransactionModal(true);
};

const handleUpdateTransaction = async (data: TransactionFormData) => {
  if (!editingTransaction) return;

  // Calculate category changes
  const oldCategoryId = editingTransaction.categoryId;
  const newCategoryId = data.categoryId;
  const oldAmount = editingTransaction.amount;
  const newAmount = data.amount;

  // Update transaction
  const updatedTransaction = {
    ...editingTransaction,
    ...data,
    updatedAt: new Date().toISOString()
  };

  // Update categories
  if (oldCategoryId === newCategoryId) {
    // Same category, just update amount
    updateCategorySpent(oldCategoryId, -oldAmount + newAmount);
  } else {
    // Different category, update both
    updateCategorySpent(oldCategoryId, -oldAmount);
    updateCategorySpent(newCategoryId, newAmount);
  }

  // Save to backend
  await updateTransactionAPI(updatedTransaction);

  // Refresh UI
  loadBudget();
  setEditingTransaction(null);
  setShowTransactionModal(false);
};
```

### Error Handling

**Validation Errors**:
- Show inline errors for invalid fields
- Keep modal open with user's changes
- Highlight problematic fields

**API Errors**:
- Show error toast/notification
- Keep modal open with user's changes
- Allow retry or cancel

**Optimistic Updates**:
- Update UI immediately
- Revert if API call fails
- Show error message

### Testing Strategy

**Unit Tests**:
- Test category spent amount calculations for all scenarios
- Test form validation in edit mode
- Test double-click event handler

**Integration Tests**:
- Test full edit flow: double-click → edit → save → verify
- Test category changes update spent amounts correctly
- Test error handling and rollback

**Manual Testing**:
- Double-click various transactions
- Edit amount, category, description, date
- Verify spent amounts update correctly
- Test with transactions in different categories
- Test error scenarios (network failure, validation errors)


---

## User Timezone and Location Management Design

### Overview

Implement proper timezone handling to ensure users see the correct current month and dates based on their local timezone, not UTC or server time. This fixes the critical bug where users see the wrong month (e.g., December instead of November on Nov 30 at 7:22 PM EST).

### Problem Analysis

**Current Bug**:
- Date: November 30, 2025, 7:22 PM EST
- Expected: Show November budget
- Actual: Shows December budget
- Root Cause: Application using UTC time (which is already December 1, 2025 at 00:22 UTC)

**UTC vs EST Conversion**:
```
November 30, 2025, 7:22 PM EST = November 30, 2025, 19:22 EST
November 30, 2025, 19:22 EST = December 1, 2025, 00:22 UTC (5 hours ahead)
```

### Data Model Updates

#### User Profile Extension

```typescript
interface User {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  timezone: string;           // NEW: IANA timezone (e.g., "America/New_York")
  location?: {                // NEW: User's location
    country: string;
    city: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}
```

### Timezone Detection on Registration

**Flow**:
```
User registers
  ↓
Detect timezone using browser API
  ↓
Optionally: Request geolocation for more accuracy
  ↓
Store timezone in user profile
  ↓
Use timezone for all date operations
```

**Implementation**:
```typescript
const detectUserTimezone = (): string => {
  // Use Intl API to get IANA timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Returns: "America/New_York", "America/Toronto", etc.
};

const detectUserLocation = async (): Promise<Location | null> => {
  if (!navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Use reverse geocoding API to get location details
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => resolve(null)
    );
  });
};
```

### Current Month Calculation

**Problem**: Current implementation likely uses:
```typescript
// WRONG - Uses UTC
const currentMonth = new Date().getUTCMonth();
const currentYear = new Date().getUTCFullYear();
```

**Solution**: Use user's timezone:
```typescript
// CORRECT - Uses user's local timezone
const getCurrentMonthInTimezone = (timezone: string): { month: number; year: number } => {
  const now = new Date();

  // Format date in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');

  return { month, year };
};

// Usage
const userTimezone = 'America/New_York';
const { month, year } = getCurrentMonthInTimezone(userTimezone);
// On Nov 30, 2025 7:22 PM EST: month = 11, year = 2025 ✓
```

### Timezone Utility Functions

Create `packages/web-app/src/utils/timezoneHelpers.ts`:

```typescript
/**
 * Gets the current date/time in a specific timezone
 */
export const getCurrentDateInTimezone = (timezone: string): Date => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
};

/**
 * Gets the current month and year in a specific timezone
 */
export const getCurrentMonthInTimezone = (timezone: string): { month: number; year: number } => {
  const date = getCurrentDateInTimezone(timezone);
  return {
    month: date.getMonth() + 1, // 1-12
    year: date.getFullYear()
  };
};

/**
 * Formats a date in a specific timezone
 */
export const formatDateInTimezone = (
  date: Date,
  timezone: string,
  format: Intl.DateTimeFormatOptions
): string => {
  return new Intl.DateTimeFormat('en-US', {
    ...format,
    timeZone: timezone
  }).format(date);
};

/**
 * Checks if a date is "today" in a specific timezone
 */
export const isTodayInTimezone = (date: Date, timezone: string): boolean => {
  const today = getCurrentDateInTimezone(timezone);
  const checkDate = new Date(date);

  return (
    checkDate.getFullYear() === today.getFullYear() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getDate() === today.getDate()
  );
};
```

### Settings Page - Location Update

**UI Design**:
```
┌─────────────────────────────────────────────────────────┐
│ Settings                                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Location & Timezone                                      │
│                                                          │
│ Country:        [United States          ▼]              │
│ City:           [New York                ]              │
│ Zip/Postal:     [10001                   ]              │
│                                                          │
│ Detected Timezone: America/New_York (EST)               │
│ Current Local Time: Nov 30, 2025 7:22 PM                │
│                                                          │
│ [Update Location]                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Location to Timezone Mapping**:
- Use a timezone lookup library (e.g., `geo-tz` or `tzlookup`)
- Or use a geocoding API (Google Maps, OpenStreetMap)
- Store mapping of zip codes to timezones

```typescript
const getTimezoneFromLocation = async (
  country: string,
  city: string,
  zipCode: string
): Promise<string> => {
  // Option 1: Use a library
  // import { find } from 'geo-tz';
  // const timezone = find(latitude, longitude)[0];

  // Option 2: Use a lookup table for common locations
  const locationTimezoneMap: Record<string, string> = {
    'US-10001': 'America/New_York',
    'US-90001': 'America/Los_Angeles',
    'CA-M5H': 'America/Toronto',
    // ... more mappings
  };

  const key = `${country}-${zipCode}`;
  return locationTimezoneMap[key] || 'America/New_York'; // Default fallback
};
```

### State Management

**User Context**:
```typescript
interface UserContext {
  user: User;
  timezone: string;
  updateLocation: (location: Location) => Promise<void>;
  getCurrentMonth: () => { month: number; year: number };
}

const UserProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [timezone, setTimezone] = useState<string>('America/New_York');

  useEffect(() => {
    // Load user profile with timezone
    loadUserProfile().then(profile => {
      setUser(profile);
      setTimezone(profile.timezone || detectUserTimezone());
    });
  }, []);

  const updateLocation = async (location: Location) => {
    const newTimezone = await getTimezoneFromLocation(
      location.country,
      location.city,
      location.zipCode
    );

    // Update user profile
    await updateUserProfile({
      ...user,
      location,
      timezone: newTimezone
    });

    setTimezone(newTimezone);
  };

  const getCurrentMonth = () => {
    return getCurrentMonthInTimezone(timezone);
  };

  return (
    <UserContext.Provider value={{ user, timezone, updateLocation, getCurrentMonth }}>
      {children}
    </UserContext.Provider>
  );
};
```

### API Updates

**User Profile Endpoint**:
```typescript
// GET /user/profile
Response: {
  userId: string;
  email: string;
  timezone: string;
  location?: {
    country: string;
    city: string;
    zipCode: string;
  };
}

// PUT /user/profile
Request: {
  timezone?: string;
  location?: {
    country: string;
    city: string;
    zipCode: string;
  };
}
```

### Migration Strategy

**For Existing Users**:
1. Detect timezone on next login
2. Prompt user to confirm/update location
3. Store timezone in profile
4. Use detected timezone going forward

**Default Behavior**:
- If no timezone stored: Detect from browser
- If detection fails: Use UTC with warning
- Prompt user to set location in settings

### Testing Strategy

**Unit Tests**:
- Test `getCurrentMonthInTimezone()` with various timezones
- Test edge cases: midnight, month boundaries, DST transitions
- Test timezone detection

**Integration Tests**:
- Test full flow: register → detect timezone → show correct month
- Test location update → timezone change → UI updates
- Test with different timezones (EST, PST, UTC, etc.)

**Manual Testing**:
- Test on Nov 30, 2025 at 7:22 PM EST → Should show November
- Test on Nov 30, 2025 at 11:59 PM EST → Should show November
- Test on Dec 1, 2025 at 12:00 AM EST → Should show December
- Test timezone change → Verify month updates immediately

### Edge Cases

1. **Daylight Saving Time**: Use IANA timezones which handle DST automatically
2. **Traveling Users**: Allow manual timezone override in settings
3. **Invalid Locations**: Fallback to browser-detected timezone
4. **No Geolocation Permission**: Use browser timezone API only
5. **Ambiguous Zip Codes**: Prompt user to select from multiple options

### Performance Considerations

- Cache timezone calculations
- Avoid repeated timezone conversions
- Store formatted dates when possible
- Use memoization for expensive operations


---

## Transaction Date Validation Design (Critical Bug Fix)

### Overview

Implement real-time date validation in the transaction modal to prevent users from accidentally adding transactions to the wrong month's budget. This addresses a critical bug where transactions with dates outside the current month are added without warning.

### Validation Logic

```typescript
interface DateValidationResult {
  isValid: boolean;
  warning?: string;
  transactionMonth?: string;
  transactionMonthName?: string;
  currentMonthName?: string;
}

const validateTransactionDate = (
  transactionDate: string,  // YYYY-MM-DD format
  currentBudgetMonth: string // YYYY-MM format
): DateValidationResult => {
  if (!transactionDate || !currentBudgetMonth) {
    return { isValid: true };
  }

  // Extract month from transaction date
  const txDate = new Date(transactionDate);
  const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

  // Check if transaction month matches current budget month
  if (txMonth === currentBudgetMonth) {
    return { isValid: true };
  }

  // Format month names for display
  const txMonthName = txDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const currentMonthName = new Date(currentBudgetMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return {
    isValid: false,
    warning: `This transaction date (${txMonthName}) is outside the current budget month (${currentMonthName})`,
    transactionMonth: txMonth,
    transactionMonthName: txMonthName,
    currentMonthName: currentMonthName
  };
};
```

### UI Components

#### Warning Banner Component

**Location**: Below date input field in transaction modal

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ This transaction date (December 2025) is outside the    │
│    current budget month (November 2025)                     │
│                                                             │
│ [Add to Current Month] [Switch to December] [Change Date]  │
└─────────────────────────────────────────────────────────────┘
```

**Styling**:
- Background: Orange/yellow (`bg-yellow-50`)
- Border: Orange (`border-yellow-300`)
- Icon: Warning icon in orange
- Buttons: Three action buttons with distinct styling

#### Date Input Highlighting

**When date is outside current month**:
- Border color: Orange (`border-yellow-500`)
- Border width: 2px
- Add warning icon next to input

**When date is valid**:
- Normal border color: Gray (`border-gray-300`)
- No warning icon

### User Flow

```
User enters transaction date
  ↓
Validate date against current month
  ↓
If date outside current month:
  ↓
  Display warning banner
  ↓
  Disable submit button
  ↓
  User selects action:
    ├─ "Add to Current Month" → Record in current month, close modal
    ├─ "Switch to [Month]" → Navigate to correct month, preserve form data
    └─ "Change Date" → Dismiss warning, allow date modification
  ↓
If date within current month:
  ↓
  No warning, allow submission
```

### State Management

**New State Variables**:
```typescript
const [dateValidation, setDateValidation] = useState<DateValidationResult>({ isValid: true });
const [showDateWarning, setShowDateWarning] = useState(false);
```

**Validation Trigger**:
- On date input change (real-time validation)
- On form mount (if editing existing transaction)
- On month change (if modal is open)

### Integration Points

1. **Transaction Modal**: Add validation logic to date input handler
2. **Month Navigation**: Pass current month to transaction modal
3. **Form Submission**: Block submission if date warning is active
4. **Month Switching**: Implement callback to switch months from modal

---

## Empty Month Budget Display Fix (Critical Bug Fix)

### Overview

Fix the critical bug where budget data from other months is incorrectly displayed when viewing months without budgets. This ensures users only see budget data for months where they explicitly created budgets.

### Root Cause Analysis

**Current Issue**:
- User navigates to a month without a budget
- Budget state is not properly cleared
- Previous month's budget data remains displayed
- OR: Budget loading logic is not filtering by month correctly

**Expected Behavior**:
- When no budget exists for a month, display empty state
- Only show budget data that matches the exact month being viewed
- Clear previous budget data when switching months

### Fix Implementation

#### 1. Budget Loading Logic

```typescript
const loadBudget = async () => {
  try {
    setLoading(true);

    // Clear previous budget data immediately
    setBudget(null);

    // Fetch all budgets for user
    const response = await fetch(`${API_BASE_URL}/budget`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('budgetbuddy_id_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();

      if (data.budgets && data.budgets.length > 0) {
        // Find budget for the EXACT month being viewed
        const monthBudget = data.budgets.find((b: Budget) => b.month === currentMonth);

        if (monthBudget) {
          // Verify the budget month matches (double-check)
          if (monthBudget.month === currentMonth) {
            setBudget(monthBudget);
          } else {
            console.error('Budget month mismatch:', monthBudget.month, currentMonth);
            setBudget(null);
          }
        } else {
          // No budget found for this month - set to null
          setBudget(null);
        }
      } else {
        // No budgets at all
        setBudget(null);
      }
    } else {
      // API error
      setBudget(null);
    }
  } catch (error) {
    console.error('Error loading budget:', error);
    setBudget(null);
  } finally {
    setLoading(false);
  }
};
```

#### 2. Month Change Handler

```typescript
const changeMonth = (direction: 'prev' | 'next') => {
  // Clear current budget immediately
  setBudget(null);

  // Calculate new month
  const [year, month] = currentMonth.split('-').map(Number);
  const offset = direction === 'prev' ? -1 : 1;
  const date = new Date(year, month - 1 + offset, 1);
  const newMonth = date.toISOString().slice(0, 7);

  // Update month state (triggers useEffect to load budget)
  setCurrentMonth(newMonth);
};
```

#### 3. Empty State Display Logic

```typescript
// In render logic
if (loading) {
  return <LoadingSpinner />;
}

if (!budget) {
  // Check if future month
  if (isFutureMonth(currentMonth)) {
    return <FutureMonthEmptyState />;
  }

  // Past or current month with no budget
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-gray-700 mb-2">
        No budget found for {getMonthName(currentMonth)}
      </h2>
      <p className="text-gray-500 mb-6">
        You haven't created a budget for this month yet.
      </p>
      <button
        onClick={() => navigate('/onboarding')}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Create Budget
      </button>
    </div>
  );
}

// Only render budget UI if budget exists
return <BudgetDisplay budget={budget} />;
```

### Testing Strategy

**Test Cases**:
1. Navigate to month with budget → Should display budget
2. Navigate to month without budget → Should display empty state
3. Navigate from month with budget to month without → Should clear previous budget
4. Create first budget in November → Past months should be empty
5. Navigate to future month without budget → Should show "Start Planning" state
6. Switch rapidly between months → Should not show wrong month's data

**Verification**:
- Check `budget.month` matches `currentMonth` in console
- Verify budget state is null when no budget exists
- Confirm no budget data from other months is displayed

---

## Implementation Priority

**Critical Bug Fixes** (Implement immediately):
1. Empty Month Budget Display Fix (Requirement 15)
2. Transaction Date Validation (Requirement 14)

**Rationale**:
- Empty month bug causes data integrity issues and user confusion
- Date validation bug causes transactions to be added to wrong months
- Both bugs significantly impact core functionality
- Both are relatively quick fixes with high impact
