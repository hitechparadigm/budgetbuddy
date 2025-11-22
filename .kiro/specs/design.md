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
