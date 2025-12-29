# BudgetBuddy Design Document

**Last Updated**: 2025-12-28
**Status**: Market-Ready MVP Design Complete
**Architecture**: AWS Serverless with React Web App + React Native Mobile Apps

## Overview

BudgetBuddy is a comprehensive zero-based budgeting platform with both web and native mobile applications built on AWS serverless architecture. The design follows EveryDollar's clean, intuitive interface while providing advanced features like recurring budget planning, offline capability, multi-currency support, and comprehensive data export options.

**Core Design Principle:** Users should manage their budget effortlessly across all devices with minimal clicks, maximum clarity, and complete data ownership.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Web App (Vite + TypeScript + Tailwind CSS)       │  │
│  │  - Desktop & Tablet Experience                           │  │
│  │  - Advanced Features & Admin                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Native Mobile Apps (iOS + Android)               │  │
│  │  - Mobile-First Experience                               │  │
│  │  - Offline Capability                                    │  │
│  │  - Device-Level Security Integration                     │  │
│  │  - Push Notifications                                    │  │
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
│  │  - /export/* endpoints (NEW)                             │  │
│  │  - /notifications/* endpoints (NEW)                      │  │
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
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │  │ Export     │  │ Notification│  │ Currency   │        │  │
│  │  │ Handler    │  │ Handler    │  │ Handler    │        │  │
│  │  └────────────┘  └────────────┘  └────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Amazon Cognito (User Authentication)                    │  │
│  │  - User pools                                             │  │
│  │  - JWT token generation                                   │  │
│  │  - Password management                                    │  │
│  │  - MFA support (NEW)                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DynamoDB (Data Storage)                                  │  │
│  │  - Single table design                                    │  │
│  │  - User data                                              │  │
│  │  - Budget data with recurring logic                      │  │
│  │  - Transaction data                                       │  │
│  │  - Notification preferences (NEW)                        │  │
│  │  - Export history (NEW)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Additional AWS Services                                  │  │
│  │  - SNS (Push Notifications)                              │  │
│  │  - SES (Email Notifications)                             │  │
│  │  - S3 (Export File Storage)                              │  │
│  │  - EventBridge (Scheduled Notifications)                 │  │
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

### Frontend - Web Application
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development and optimized builds)
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Routing**: React Router v6 (client-side routing)
- **State Management**: React useState/useEffect + React Query (API caching)
- **HTTP Client**: Fetch API with custom wrapper
- **Icons**: Emoji-based (no icon library needed)

### Frontend - Mobile Applications
- **Framework**: React Native with Expo (managed workflow)
- **Language**: TypeScript
- **Navigation**: React Navigation 6 (bottom tabs + stack navigation)
- **State Management**: Zustand (lightweight state) + React Query (API caching)
- **UI Components**: React Native Elements + Native Base
- **Animations**: React Native Reanimated 3
- **Offline Storage**: AsyncStorage + SQLite (for complex queries)
- **Security**: Expo SecureStore (token storage) + Device-level authentication
- **Notifications**: Expo Notifications
- **Network**: NetInfo (connection detection)

### Backend
- **API**: AWS API Gateway (REST API)
- **Compute**: AWS Lambda (Node.js 20)
- **Authentication**: AWS Cognito User Pools
- **Database**: Amazon DynamoDB (single-table design)
- **Storage**: Amazon S3 (static assets, export files)
- **CDN**: Amazon CloudFront (global content delivery)
- **Notifications**: Amazon SNS (push notifications) + SES (email)
- **Scheduling**: Amazon EventBridge (recurring notifications)
- **Infrastructure**: AWS CDK (TypeScript)

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Testing**: Jest (unit tests) + Detox (E2E mobile testing)
- **Mobile Builds**: EAS Build (Expo Application Services)
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
  timezone: string;         // NEW: IANA timezone (e.g., "America/New_York")
  currency: string;         // NEW: Primary currency (USD, EUR, etc.)
  location?: {              // NEW: User's location
    country: string;
    city: string;
    zipCode: string;
  };
  preferences: {            // NEW: User preferences
    notifications: NotificationPreferences;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  subscription: {           // NEW: Subscription info
    tier: 'free' | 'premium';
    expiresAt?: string;
    features: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  budgetAlerts: boolean;
  overspendingAlerts: boolean;
  billReminders: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
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
  color?: string;           // NEW: Custom color

  // Recurring settings (NEW)
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually';
  baseAmount: number;       // Amount per occurrence
  startDate?: string;       // When recurring started (first expected date)
  endDate?: string;         // When recurring ends (optional)
  nextExpectedDate?: string; // Next expected occurrence
  expectedDates?: string[]; // All expected dates for current month
  isPaused: boolean;        // Whether recurring is paused

  // Calculated amounts
  plannedMonthlyAmount: number; // Calculated from baseAmount * occurrences
  actualAmount: number;     // Sum of all transactions (renamed from spentAmount)
  variance: number;         // actualAmount - plannedMonthlyAmount

  transactions: Transaction[];
  order: number;

  // Category management (NEW)
  isCustom: boolean;        // User-created vs system category
  parentCategoryId?: string; // For subcategories
  isArchived: boolean;      // Hidden but preserved
  usageCount: number;       // How often used
  lastUsed?: string;        // Last transaction date
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  merchant?: string;        // NEW: Merchant/payee name
  date: string;             // YYYY-MM-DD
  currency?: string;        // NEW: Transaction currency (if different from user default)
  exchangeRate?: number;    // NEW: Exchange rate used for conversion
  location?: {              // NEW: Transaction location
    latitude: number;
    longitude: number;
    address?: string;
  };
  tags?: string[];          // NEW: User-defined tags
  receiptUrl?: string;      // NEW: Receipt image URL
  isRecurring?: boolean;    // NEW: Part of recurring transaction
  recurringTemplateId?: string; // NEW: Link to recurring template
  syncStatus: 'synced' | 'pending' | 'failed'; // NEW: Offline sync status
  createdAt: string;
  updatedAt?: string;       // NEW: For transaction editing
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

## Mobile Application Architecture

### React Native + Expo Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Native App Structure                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Navigation    │  │   State Mgmt    │  │   API Layer     │ │
│  │                 │  │                 │  │                 │ │
│  │ • Bottom Tabs   │  │ • Zustand       │  │ • React Query   │ │
│  │ • Stack Nav     │  │ • AsyncStorage  │  │ • Offline Queue │ │
│  │ • Deep Linking  │  │ • Secure Store  │  │ • Auto Retry    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   UI Layer      │  │   Security      │  │   Platform      │ │
│  │                 │  │                 │  │                 │ │
│  │ • Native Base   │  │ • Device Auth   │  │ • iOS Specific  │ │
│  │ • Reanimated    │  │ • Keychain      │  │ • Android Spec  │ │
│  │ • Gestures      │  │ • App Lock      │  │ • Permissions   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Features      │  │   Offline       │  │   Notifications │ │
│  │                 │  │                 │  │                 │ │
│  │ • Budget CRUD   │  │ • Local DB      │  │ • Push Notifs   │ │
│  │ • Transactions  │  │ • Sync Queue    │  │ • Local Notifs  │ │
│  │ • Export/Import │  │ • Conflict Res  │  │ • Scheduling    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Structure

```typescript
// Bottom Tab Navigator (Main App)
type RootTabParamList = {
  Budget: undefined;
  Transactions: undefined;
  Summary: undefined;
  Settings: undefined;
};

// Stack Navigators for each tab
type BudgetStackParamList = {
  BudgetList: undefined;
  BudgetDetail: { budgetId: string };
  AddCategory: { groupType: 'income' | 'savings' | 'expense' };
  EditCategory: { categoryId: string };
};

type TransactionStackParamList = {
  TransactionList: undefined;
  AddTransaction: { categoryId?: string };
  EditTransaction: { transactionId: string };
  TransactionDetail: { transactionId: string };
};
```

### Offline Data Strategy

```typescript
// Local Database Schema (SQLite)
interface LocalBudget {
  id: string;
  month: string;
  data: Budget;
  lastSynced: string;
  isDirty: boolean; // Has local changes
}

interface LocalTransaction {
  id: string;
  budgetId: string;
  data: Transaction;
  syncStatus: 'synced' | 'pending' | 'failed';
  createdLocally: boolean;
  lastSyncAttempt?: string;
}

// Sync Queue Management
interface SyncQueue {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'budget' | 'transaction' | 'category';
  entityId: string;
  data: any;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}
```

### Security Implementation

```typescript
// Device-Level Authentication
interface DeviceAuth {
  isDeviceSecure(): Promise<boolean>;
  requiresAuthentication(): boolean;
  getSecurityLevel(): Promise<'none' | 'pin' | 'biometric'>;
}

// Secure Storage
interface SecureStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// App Lock Management
interface AppLock {
  isLocked: boolean;
  lockTimeout: number; // minutes
  requiresAuth: boolean;
  lastActivity: Date;
}
```

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


---

## AI Budget Persistence After Month Navigation Fix (Requirement 16)

### Problem Analysis

**Current Bug Symptoms**:
1. User completes AI onboarding for November
2. Budget saves successfully (409 conflict = already exists)
3. User switches to October (empty state - correct)
4. User switches back to November
5. `loadBudget()` calls GET /budget
6. Backend returns "No budgets exist in backend"
7. Frontend redirects to onboarding (incorrect)

**Root Cause**:
The backend `getBudgets` function IS working correctly and returning budgets. The issue is in the frontend logic:

1. **Backend is correct**: The `getBudgets` function queries DynamoDB with `FAMILY#${familyId}` and returns all budgets
2. **Frontend issue**: After the AI budget is saved and localStorage is cleared, when the user navigates back to November, the frontend checks:
   - Backend returns budgets ✓
   - Finds budget for November ✓
   - BUT the console shows "No budgets exist in backend" - this is a logging issue
3. **Actual problem**: The 409 conflict response is not being handled properly - the frontend treats it as an error instead of success

### Solution Design

#### Backend Changes
**No changes needed** - the backend is working correctly:
- `POST /budget` returns 409 when budget exists (correct behavior)
- `GET /budget` returns all budgets for the family (working)
- DynamoDB queries are correct

#### Frontend Changes

**1. Handle 409 Conflict as Success**

In `saveBudgetToBackend()`:
```typescript
const saveBudgetToBackend = async (budgetData: Budget) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        month: budgetData.month,
        groups: budgetData.groups,
        isAIGenerated: budgetData.isAIGenerated
      })
    });

    // CRITICAL FIX: Treat 409 conflict as success (budget already exists)
    if (response.ok || response.status === 409) {
      console.log('[saveBudgetToBackend] Budget saved or already exists');

      // Clear AI budget from localStorage after successful save
      localStorage.removeItem('ai-generated-budget');

      // If 409, fetch the existing budget to update local state
      if (response.status === 409) {
        console.log('[saveBudgetToBackend] Budget already exists, fetching from backend');
        await loadBudget(); // Reload to get the existing budget
      } else {
        const savedBudget = await response.json();
        if (savedBudget.data) {
          setBudget(savedBudget.data);
        }
      }
    } else {
      const errorText = await response.text();
      console.error('[saveBudgetToBackend] Failed to save budget:', errorText);
    }
  } catch (error) {
    console.error('[saveBudgetToBackend] Error saving budget:', error);
  }
};
```

**2. Improve Budget Loading Logic**

In `loadBudget()`:
```typescript
const loadBudget = async () => {
  try {
    // Clear budget state immediately
    setBudget(null);
    setLoading(true);

    console.log('[loadBudget] Loading budget for month:', currentMonth);

    // Fetch all budgets from backend
    const response = await fetch(`${API_BASE_URL}/budget`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('budgetbuddy_id_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[loadBudget] Failed to fetch budgets:', response.status);
      setLoading(false);
      return;
    }

    const data = await response.json();
    console.log('[loadBudget] Backend response:', data);

    // Check if we have budgets
    if (data.data && data.data.budgets && data.data.budgets.length > 0) {
      console.log('[loadBudget] Found', data.data.budgets.length, 'budgets');

      // Find budget for the EXACT month being viewed
      const monthBudget = data.data.budgets.find((b: Budget) => b.month === currentMonth);

      if (monthBudget) {
        console.log('[loadBudget] Found budget for', currentMonth);
        setBudget(monthBudget);
        setLoading(false);
        return;
      }

      // No budget for this month - show empty state
      console.log('[loadBudget] No budget found for', currentMonth);
      setBudget(null);
      setLoading(false);
      return;
    }

    // No budgets exist at all
    console.log('[loadBudget] No budgets exist in backend');

    // Only check for AI budget if this is the current month
    const isCurrentMonth = currentMonth === getCurrentMonthString();
    if (isCurrentMonth) {
      const aiGeneratedBudget = localStorage.getItem('ai-generated-budget');

      if (aiGeneratedBudget) {
        console.log('[loadBudget] Using AI-generated budget for current month');
        const parsedBudget = JSON.parse(aiGeneratedBudget);
        const budget = createBudgetFromAIData(parsedBudget, currentMonth);

        setBudget(budget);
        await saveBudgetToBackend(budget);
        setLoading(false);
        return;
      } else {
        // No AI budget - redirect to onboarding
        navigate('/onboarding');
        return;
      }
    }

    // Not current month and no budgets - show empty state
    setBudget(null);
    setLoading(false);

  } catch (error) {
    console.error('[loadBudget] Error loading budget:', error);
    setBudget(null);
    setLoading(false);
  }
};
```

**3. Add Helper Function**

```typescript
const createBudgetFromAIData = (parsedBudget: any, month: string): Budget => {
  return {
    id: `budget_${Date.now()}`,
    userId: 'mock_user_id',
    month: month,
    groups: [
      {
        id: 'income-group',
        name: 'Income',
        type: 'income',
        icon: '💰',
        isCollapsed: false,
        order: 1,
        categories: parsedBudget.income?.map((cat: any, index: number) => ({
          ...cat,
          spentAmount: 0,
          transactions: [],
          order: index + 1,
          isRecurring: false
        })) || []
      },
      {
        id: 'savings-group',
        name: 'Savings',
        type: 'savings',
        icon: '💾',
        isCollapsed: false,
        order: 2,
        categories: parsedBudget.savings?.map((cat: any, index: number) => ({
          ...cat,
          spentAmount: 0,
          transactions: [],
          order: index + 1,
          isRecurring: false
        })) || []
      },
      {
        id: 'expenses-group',
        name: 'Expenses',
        type: 'expense',
        icon: '💸',
        isCollapsed: false,
        order: 3,
        categories: parsedBudget.expenses?.map((cat: any, index: number) => ({
          ...cat,
          spentAmount: 0,
          transactions: [],
          order: index + 1,
          isRecurring: false
        })) || []
      }
    ],
    isAIGenerated: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};
```

### Data Flow

**Correct Flow**:
```
1. User completes AI onboarding
   ↓
2. AI budget saved to localStorage
   ↓
3. Navigate to /budget
   ↓
4. loadBudget() called
   ↓
5. Backend returns empty (no budgets yet)
   ↓
6. Check localStorage for AI budget
   ↓
7. Create budget from AI data
   ↓
8. POST to backend (saves successfully)
   ↓
9. Clear localStorage
   ↓
10. User switches to October
   ↓
11. loadBudget() called
   ↓
12. Backend returns 1 budget (November)
   ↓
13. No match for October → show empty state
   ↓
14. User switches back to November
   ↓
15. loadBudget() called
   ↓
16. Backend returns 1 budget (November)
   ↓
17. Match found → display budget ✓
```

### API Response Structure

**Backend Response Format**:
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "budgetId": "budget_1732147200000",
        "familyId": "family_user123",
        "month": "2025-11",
        "totalIncome": 4000,
        "totalSavings": 800,
        "totalExpenses": 3200,
        "remainingBalance": 0,
        "groups": { ... },
        "isAIGenerated": true,
        "createdAt": "2025-11-21T10:00:00Z",
        "updatedAt": "2025-11-21T10:00:00Z"
      }
    ],
    "count": 1
  },
  "message": "Budgets retrieved successfully",
  "timestamp": "2025-12-01T03:24:35.057Z"
}
```

**Frontend Must Access**: `data.data.budgets` (not `data.budgets`)

### Testing Strategy

**Unit Tests**:
- Test `saveBudgetToBackend()` handles 409 as success
- Test `loadBudget()` correctly parses backend response structure
- Test `createBudgetFromAIData()` creates valid budget object

**Integration Tests**:
- Test full flow: AI onboarding → save → navigate away → navigate back
- Test 409 conflict handling when budget already exists
- Test localStorage clearing after successful save

**Manual Testing**:
1. Complete AI onboarding for November
2. Verify budget displays correctly
3. Switch to October (should be empty)
4. Switch back to November (should show saved budget)
5. Refresh page (should still show November budget)
6. Check console for "No budgets exist" - should NOT appear when budgets exist

### Success Criteria

- User creates AI budget → navigates away → returns → sees saved budget
- No "No budgets exist in backend" logs when budgets actually exist
- 409 conflicts handled gracefully without errors
- localStorage AI budget cleared after successful save
- Budget persists across page refreshes and month navigation

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Mobile App Platform Compatibility
*For any* supported mobile platform (iOS/Android), the app should build successfully and provide the same core functionality as the web version
**Validates: Requirements 22.1, 22.3**

### Property 2: API Compatibility Across Platforms
*For any* API endpoint, requests from mobile apps should return the same data structure and status codes as requests from the web app
**Validates: Requirements 22.2, 22.5**

### Property 3: Offline Transaction Persistence
*For any* transaction added while offline, it should be stored locally and successfully synced to the server when connection is restored
**Validates: Requirements 24.2, 24.3**

### Property 4: Biometric Authentication Fallback
*For any* device where biometric authentication is unavailable or fails, the system should provide PIN authentication as a working alternative
**Validates: Requirements 25.1, 25.2**

### Property 5: Secure Token Storage
*For any* authentication token, it should be stored using platform-specific secure storage (Keychain/Keystore) and retrieved correctly across app sessions
**Validates: Requirements 25.3**

### Property 6: Data Export Completeness
*For any* user data export request, the exported file should contain all user budgets, transactions, and categories without data loss
**Validates: Requirements 26.1, 26.6**

### Property 7: Search Result Accuracy
*For any* search query, all returned results should match the search criteria and no matching items should be omitted
**Validates: Requirements 28.1, 28.2**

### Property 8: Notification Delivery
*For any* budget alert condition (overspending, approaching limits), the system should send notifications to users who have enabled that notification type
**Validates: Requirements 29.1, 29.2**

### Property 9: Currency Conversion Consistency
*For any* transaction in a non-primary currency, the converted amount should be calculated using the current exchange rate and displayed consistently across all views
**Validates: Requirements 30.1, 30.4**

### Property 10: Recurring Budget Calculation Accuracy
*For any* recurring budget item with bi-weekly frequency, the monthly planned amount should equal the base amount multiplied by the correct number of occurrences in that specific month
**Validates: Requirements 18.1, 18.2, 20.8, 20.9**

### Property 11: Planned vs Actual Variance Calculation
*For any* budget category, the variance should always equal the actual amount minus the planned amount, and be displayed with correct positive/negative indicators
**Validates: Requirements 19.1, 19.6**

### Property 12: Offline Data Synchronization
*For any* data modified while offline, when connection is restored, the local changes should be successfully merged with server data without data loss
**Validates: Requirements 24.6, 24.7**

### Property 13: Cross-Platform Feature Parity
*For any* core budgeting feature available on web, the same feature should be available and function identically on mobile platforms
**Validates: Requirements 22.3, 35.10**

### Property 14: Security Session Management
*For any* user session, the app should automatically lock after the configured inactivity period and require re-authentication
**Validates: Requirements 25.4, 25.5**

### Property 15: Export Data Integrity Round Trip
*For any* exported budget data, importing it back into the system should recreate the exact same budget structure and amounts
**Validates: Requirements 26.4, 26.5**

## Error Handling

### Mobile App Error Handling
- **Network Errors**: Graceful degradation to offline mode with user notification
- **Authentication Errors**: Automatic token refresh with fallback to login screen
- **Sync Conflicts**: User-friendly conflict resolution with data preservation
- **Storage Errors**: Fallback storage mechanisms with error reporting

### API Error Handling
- **Rate Limiting**: Exponential backoff with user feedback
- **Server Errors**: Retry logic with circuit breaker pattern
- **Validation Errors**: Field-specific error messages with correction guidance
- **Currency API Errors**: Fallback to cached exchange rates

### Data Consistency
- **Offline Sync**: Conflict resolution with user choice for critical data
- **Concurrent Updates**: Optimistic locking with rollback capability
- **Export Failures**: Partial export recovery with retry options
- **Import Validation**: Schema validation with detailed error reporting

## Testing Strategy

### Mobile Testing Approach
- **Unit Tests**: Core business logic and utility functions (Jest)
- **Component Tests**: React Native component behavior (React Native Testing Library)
- **Integration Tests**: API integration and offline sync (Detox E2E)
- **Device Testing**: Real device testing on iOS and Android
- **Performance Testing**: Memory usage, battery impact, and load times

### Property-Based Testing Configuration
- **Framework**: fast-check for JavaScript/TypeScript property testing
- **Test Iterations**: Minimum 100 iterations per property test
- **Mobile-Specific**: Test across different device configurations and network conditions
- **Cross-Platform**: Verify properties hold on both iOS and Android

### Testing Tags Format
Each property test must reference its design document property:
- **Feature: market-ready-mvp, Property 1**: Mobile App Platform Compatibility
- **Feature: market-ready-mvp, Property 10**: Recurring Budget Calculation Accuracy

### Dual Testing Strategy
- **Unit Tests**: Specific examples, edge cases, error conditions, mobile-specific scenarios
- **Property Tests**: Universal properties across all inputs, cross-platform consistency
- **Integration Tests**: End-to-end workflows, offline/online transitions, multi-device sync

## Performance Optimizations

### Mobile Performance
- **Bundle Size**: Code splitting and lazy loading for React Native
- **Memory Management**: Efficient image handling and data caching
- **Battery Optimization**: Background task management and efficient sync
- **Startup Time**: Optimized app launch and authentication flow

### Cross-Platform Optimization
- **API Caching**: Shared cache strategy between web and mobile
- **Offline Storage**: Efficient local database with sync optimization
- **Network Usage**: Minimal data transfer with delta sync
- **Real-time Updates**: WebSocket connections for live budget updates

## Security Design

### Mobile Security
- **Biometric Integration**: Platform-specific biometric APIs with secure fallback
- **Secure Storage**: Keychain (iOS) and Keystore (Android) for sensitive data
- **App Backgrounding**: Privacy screen and data clearing when app is backgrounded
- **Certificate Pinning**: SSL certificate validation for API communications

### Data Protection
- **Encryption**: End-to-end encryption for sensitive financial data
- **Privacy Controls**: User-controlled data sharing and deletion
- **Audit Logging**: Security event tracking with user access
- **Compliance**: GDPR, CCPA, and financial data protection standards

## Future Enhancements

### Mobile-Specific Features
- **Receipt Scanning**: OCR integration for automatic transaction entry
- **Voice Input**: Voice-to-text for transaction descriptions
- **Apple Pay/Google Pay**: Integration for transaction tracking
- **Widgets**: Home screen widgets for quick budget overview

### Advanced Features
- **AI Insights**: Machine learning for spending pattern analysis
- **Bank Integration**: Open banking APIs for automatic transaction import
- **Receipt Scanning**: OCR integration for automatic transaction entry
- **Voice Input**: Voice-to-text for transaction descriptions
- **Apple Pay/Google Pay**: Integration for transaction tracking
- **Widgets**: Home screen widgets for quick budget overview

---

## Admin Dashboard Design

### Overview

A comprehensive admin dashboard for platform management, user support, and system monitoring. Built as a separate web application with role-based access control and real-time monitoring capabilities.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Dashboard Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Admin Web     │  │   Admin API     │  │   Monitoring    │ │
│  │   Application   │  │   Gateway       │  │   Services      │ │
│  │                 │  │                 │  │                 │ │
│  │ • React + TS    │  │ • Separate API  │  │ • CloudWatch    │ │
│  │ • Admin UI      │  │ • Admin Auth    │  │ • Custom Metrics│ │
│  │ • Role-based    │  │ • Rate Limiting │  │ • Alerts        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   User Mgmt     │  │   System Health │  │   Support       │ │
│  │   Lambda        │  │   Lambda        │  │   Lambda        │ │
│  │                 │  │                 │  │                 │ │
│  │ • CRUD Users    │  │ • Metrics       │  │ • Tickets       │ │
│  │ • Bulk Ops      │  │ • Performance   │  │ • Notifications │ │
│  │ • Audit Logs    │  │ • Alerts        │  │ • Email         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Models

#### Admin User
```typescript
interface AdminUser {
  adminId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'support_admin' | 'read_only';
  permissions: AdminPermission[];
  lastLogin?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

interface AdminPermission {
  resource: 'users' | 'system' | 'support' | 'billing';
  actions: ('read' | 'write' | 'delete')[];
}
```

#### Support Ticket
```typescript
interface SupportTicket {
  ticketId: string;
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}
```

#### System Metrics
```typescript
interface SystemMetrics {
  timestamp: string;
  totalUsers: number;
  activeUsers: number;
  newRegistrations: number;
  subscriptionConversions: number;
  apiResponseTime: number;
  errorRate: number;
  databaseConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}
```

### UI Components

#### Dashboard Overview
```
┌─────────────────────────────────────────────────────────────────┐
│ BudgetBuddy Admin Dashboard                    [Admin Name ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📊 Overview    👥 Users    🎫 Support    💰 Billing    ⚙️ System │
│                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │ Total Users │ │Active Users │ │New Today    │ │Conversions  ││
│ │   12,847    │ │   3,421     │ │    127      │ │    23       ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ System Health                                               │ │
│ │ API Response Time: 245ms  Error Rate: 0.12%  Uptime: 99.9% │ │
│ │ [Real-time Chart]                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Recent Activity                                             │ │
│ │ • User john@example.com upgraded to Premium                 │ │
│ │ • Support ticket #1234 resolved                            │ │
│ │ • System alert: High memory usage resolved                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### User Management
```
┌─────────────────────────────────────────────────────────────────┐
│ User Management                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Search users...] [Filter ▼] [Export] [Bulk Actions ▼]        │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Email              │ Name        │ Status │ Plan │ Last Login││
│ │ john@example.com   │ John Smith  │ Active │ Free │ 2 hrs ago ││
│ │ jane@example.com   │ Jane Doe    │ Active │ Pro  │ 1 day ago ││
│ │ bob@example.com    │ Bob Johnson │ Disabled│ Free │ 1 week ago││
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Previous] Page 1 of 128 [Next]                                │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints

#### Admin Authentication
```
POST /admin/auth/login
Request: { email, password, mfaCode? }
Response: { accessToken, refreshToken, adminUser }

GET /admin/auth/profile
Headers: Authorization: Bearer <admin_token>
Response: { adminUser, permissions }
```

#### User Management
```
GET /admin/users
Query: ?search=email&status=active&plan=premium&page=1&limit=50
Response: { users: User[], total: number, page: number }

GET /admin/users/{userId}
Response: { user: User, budgets: Budget[], transactions: Transaction[] }

PUT /admin/users/{userId}/status
Request: { status: 'active' | 'disabled', reason: string }
Response: { success: boolean }

DELETE /admin/users/{userId}
Request: { reason: string, exportData: boolean }
Response: { success: boolean, exportUrl?: string }
```

#### System Monitoring
```
GET /admin/metrics/overview
Response: {
  totalUsers, activeUsers, newRegistrations,
  subscriptionConversions, systemHealth
}

GET /admin/metrics/performance
Query: ?timeRange=24h&metric=response_time
Response: { dataPoints: MetricPoint[], summary: MetricSummary }

GET /admin/alerts
Response: { alerts: SystemAlert[], count: number }
```

#### Support Management
```
GET /admin/support/tickets
Query: ?status=open&priority=high&assignedTo=admin123
Response: { tickets: SupportTicket[], total: number }

POST /admin/support/tickets
Request: { userId, subject, description, category, priority }
Response: { ticket: SupportTicket }

PUT /admin/support/tickets/{ticketId}
Request: { status, assignedTo, resolution }
Response: { ticket: SupportTicket }
```

### Security Implementation

#### Role-Based Access Control
```typescript
const AdminPermissions = {
  super_admin: {
    users: ['read', 'write', 'delete'],
    system: ['read', 'write'],
    support: ['read', 'write'],
    billing: ['read', 'write']
  },
  support_admin: {
    users: ['read', 'write'],
    support: ['read', 'write'],
    billing: ['read']
  },
  read_only: {
    users: ['read'],
    system: ['read'],
    support: ['read'],
    billing: ['read']
  }
};

const checkPermission = (adminUser: AdminUser, resource: string, action: string): boolean => {
  const permissions = AdminPermissions[adminUser.role];
  return permissions[resource]?.includes(action) || false;
};
```

#### Admin Authentication
- Separate admin user pool in Cognito
- Multi-factor authentication required
- Session timeout: 4 hours
- IP whitelisting for super admins
- Audit logging for all admin actions

### Monitoring and Alerts

#### Real-time Metrics
- User registration rate
- API error rates and response times
- Database performance metrics
- Memory and CPU usage
- Active user sessions

#### Alert Conditions
- Error rate > 1%
- API response time > 1000ms
- New user registrations spike (>500% increase)
- Database connection pool exhaustion
- Failed payment processing > 5%

#### Notification Channels
- Email alerts to admin team
- Slack integration for critical alerts
- SMS for urgent system issues
- In-dashboard notifications

### Implementation Priority

**Phase 1 (Essential)**:
- Basic admin authentication
- User management (view, search, disable)
- System health dashboard
- Basic support ticket system

**Phase 2 (Enhanced)**:
- Advanced user operations (bulk actions, data export)
- Detailed system metrics and monitoring
- Role-based access control
- Audit logging

**Phase 3 (Advanced)**:
- Real-time alerts and notifications
- Advanced analytics and reporting
- Automated user lifecycle management
- Integration with external support tools

### Testing Strategy

**Security Testing**:
- Role-based access control validation
- Admin authentication flow testing
- Permission boundary testing
- Audit log integrity verification

**Performance Testing**:
- Large dataset handling (10k+ users)
- Real-time metrics performance
- Bulk operation efficiency
- Dashboard load times

**Integration Testing**:
- Admin API with main application APIs
- Monitoring system integration
- Alert notification delivery
- Data export functionality
- **Investment Tracking**: Portfolio integration with budget planning
- **Family Collaboration**: Real-time collaborative budgeting

### Platform Expansion
- **Apple Watch**: Quick transaction entry and budget monitoring
- **Android Wear**: Spending alerts and budget summaries
- **Desktop Apps**: Native desktop applications for power users
- **Web Extensions**: Browser extensions for online purchase tracking
