# Budget App MVP Design Document

## Overview

A streamlined budget application following EveryDollar's design principles with AI-powered personalization. The design prioritizes simplicity, speed, and user focus with a single-screen budget management interface.

**Core Design Principle:** Users should create their first budget in 30 seconds and manage it effortlessly.

## Architecture

### Application Flow
```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Register  │ -> │ AI Questions │ -> │  Budget Screen  │
│ (30 seconds)│    │  (2 minutes) │    │  (main app)     │
└─────────────┘    └──────────────┘    └─────────────────┘
```

### Technical Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State Management**: React Context + Local Storage
- **Routing**: React Router (minimal - only 3 routes)
- **UI Framework**: Custom components following EveryDollar patterns
- **Data Persistence**: Local Storage (MVP), prepared for backend integration

## Components and Interfaces

### 1. Core Application Structure

```typescript
// Simplified routing - only essential screens
const routes = [
  '/auth',           // Registration/Login
  '/onboarding',     // AI Questions (7 steps)
  '/budget'          // Main Budget Screen (default)
];
```

### 2. Main Budget Screen Layout

Following EveryDollar's three-column layout design:

```
┌──────────────┬─────────────────────────────────────┬──────────────────┐
│ SIDEBAR      │ BUDGET CATEGORIES                   │ TRANSACTIONS     │
├──────────────┼─────────────────────────────────────┼──────────────────┤
│ $ BudgetBuddy│ November 2025                  < >  │ Summary | Trans  │
│              │                                     │                  │
│ $1,850 left  │ ● Income for November          ▼   │ [Search...]      │
│ to budget    │   Planned    Received               │                  │
│              │                                     │ November         │
│ 📊 Budget    │ 💰 Salary 1      $4,400  $4,400    │                  │
│ 🏦 Accounts  │ 💰 Salary 2      $1,600  $1,600    │ + Salary 1       │
│ 🗺️ Roadmap   │ + Add Item                          │   $4,400.00      │
│ 💳 Paycheck  │                                     │                  │
│ 🎯 Goals     │ Total Income     $6,000  $6,000    │ + Salary 2       │
│ 📈 Insights  │                                     │   $1,600.00      │
│              │ ● Savings for November         ▼   │                  │
│              │   Planned    Spent                  │ - Investment     │
│ ⚙️ Settings  │ 💾 Emergency     $0      $0         │   $2,000.00      │
│              │ 💾 Investments   $2,000  $2,000    │                  │
│              │ + Add Item                          │ [Connect Bank]   │
│              │                                     │                  │
│              │ Total Savings    $2,000  $2,000    │                  │
│              │                                     │                  │
│              │ ● Expenses for November        ▼   │                  │
│              │   Planned    Spent                  │                  │
│              │ 💸 Housing       $2,500  $0         │                  │
│              │ 💸 Groceries     $1,200  $0         │                  │
│              │ 💸 Transport     $800    $0         │                  │
│              │ + Add Item                          │                  │
│              │                                     │                  │
│              │ Total Expenses   $4,500  $0         │                  │
│              │                                     │         [+]      │
└──────────────┴─────────────────────────────────────┴──────────────────┘
```

### 3. Transaction Modal (via FAB)

Accessed through floating action button:

```
┌─────────────────────────────────────┐
│ Plan an Income/Expense          [×] │
├─────────────────────────────────────┤
│ Category                            │
│ [Select category... ▼]              │
│                                     │
│ Amount                              │
│ $ [_______]                         │
│                                     │
│ Description                         │
│ [Enter description...]              │
│                                     │
│ Date                                │
│ [2025-11-09]                        │
│                                     │
│ [Cancel]      [Add Transaction]     │
└─────────────────────────────────────┘
```

### 4. Budget Item Modal (Planning)

For adding/editing budget categories:

```
┌─────────────────────────────────────┐
│ Add Income Item                 [×] │
├─────────────────────────────────────┤
│ Name                                │
│ [e.g., Salary, Rent...]             │
│                                     │
│ Icon                                │
│ [💰]                                │
│                                     │
│ Planned Amount                      │
│ $ [_______]                         │
│                                     │
│ ☑ Recurring                         │
│                                     │
│ Frequency                           │
│ [Monthly ▼]                         │
│ • Weekly                            │
│ • Bi-weekly                         │
│ • Monthly                           │
│ • Annually                          │
│                                     │
│ [Cancel]           [Add Item]       │
└─────────────────────────────────────┘
```

## Data Models

### Budget Data Structure
```typescript
interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  plannedAmount: number;
  spentAmount: number;
  transactions: Transaction[];
  order: number;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'annually';
  nextDueDate?: string;
}

interface BudgetGroup {
  id: string;
  name: string;
  type: 'income' | 'savings' | 'expense';
  icon: string;
  categories: BudgetCategory[];
  isCollapsed: boolean;
  order: number;
}

interface Transaction {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

interface Budget {
  id: string;
  userId: string;
  month: string; // "2025-11"
  groups: BudgetGroup[];
  isAIGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### AI Onboarding Data
```typescript
interface OnboardingData {
  familySituation: 'single' | 'couple' | 'family' | 'other';
  householdSize: number;
  monthlyIncome: 'under-2k' | '2k-3k' | '3k-5k' | '5k-8k' | 'over-8k' | 'prefer-not-to-say';
  housingStatus: 'rent' | 'own' | 'live-with-family' | 'other';
  transportation: string[]; // Supports multiple selections
  mainGoal: 'emergency-fund' | 'pay-debt' | 'save-house' | 'retirement' | 'vacation';
  debtSituation: 'no-debt' | 'credit-cards' | 'student-loans' | 'mortgage-only' | 'multiple-debts';
}
```

## User Experience Design

### 1. Design System (EveryDollar-Inspired)

**Color Palette:**
- Primary: `#2563eb` (Blue 600)
- Success: `#059669` (Emerald 600)
- Warning: `#d97706` (Amber 600)
- Danger: `#dc2626` (Red 600)
- Background: `#f9fafb` (Gray 50)
- Surface: `#ffffff` (White)
- Text Primary: `#111827` (Gray 900)
- Text Secondary: `#6b7280` (Gray 500)

**Typography:**
- Headings: `font-bold text-xl-2xl`
- Body: `font-medium text-base`
- Labels: `font-medium text-sm`
- Numbers: `font-bold` (amounts, percentages)

**Spacing System:**
- Container: `max-w-2xl mx-auto px-4`
- Sections: `space-y-6`
- Cards: `p-6 rounded-lg`
- Buttons: `px-4 py-2`

### 2. Interaction Patterns

**Progressive Disclosure:**
- Show only essential information initially
- Expand details on user interaction
- Hide complexity behind simple actions

**Immediate Feedback:**
- Real-time balance updates
- Visual progress indicators
- Instant validation messages

**Touch-Friendly Design:**
- Minimum 44px touch targets
- Generous spacing between interactive elements
- Clear visual hierarchy

### 3. Responsive Design

**Desktop (1024px+):**
- Three-column layout (sidebar, budget, transactions)
- Full navigation sidebar (256px width)
- Hover states for edit/delete buttons
- Right sidebar shows transaction history

**Tablet (768px-1024px):**
- Collapsible sidebar (64px width when collapsed)
- Hide right transaction sidebar
- Touch-optimized interactions
- Mobile header with hamburger menu

**Mobile (320px-768px):**
- Slide-out sidebar (fixed overlay)
- Single column budget view
- Hide transaction sidebar
- Floating action button for transactions
- Mobile-optimized category rows

## Error Handling

### User-Friendly Error States

**Empty States:**
```
┌─────────────────────────────────────┐
│              🎯                     │
│                                     │
│     Ready to start budgeting?       │
│                                     │
│  Click any "Add to [Category]"      │
│     button to get started!          │
│                                     │
│        [Take Quick Tour]            │
└─────────────────────────────────────┘
```

**Over-Budget Warning:**
```
┌─────────────────────────────────────┐
│ ⚠️  Groceries: $50 over budget      │
│                                     │
│ You've spent $500 of your $450      │
│ grocery budget this month.          │
│                                     │
│ [Adjust Budget] [View Transactions] │
└─────────────────────────────────────┘
```

**Data Loading:**
- Skeleton screens for budget categories
- Progressive loading of transaction history
- Graceful degradation for offline use

## Testing Strategy

### User Experience Testing
1. **30-Second Budget Test**: New users should complete onboarding and see their first budget within 30 seconds
2. **One-Click Transaction**: Adding a transaction should require maximum 3 taps/clicks
3. **Visual Clarity**: Users should understand their budget status at a glance

### Technical Testing
1. **Component Testing**: Each UI component tested in isolation
2. **Integration Testing**: Full user flows from onboarding to budget management
3. **Performance Testing**: Page load times under 2 seconds
4. **Accessibility Testing**: WCAG 2.1 AA compliance

### Cross-Platform Testing
1. **Browser Compatibility**: Chrome, Firefox, Safari, Edge
2. **Device Testing**: Desktop, tablet, mobile viewports
3. **Touch Interaction**: Gesture support and touch targets

## Performance Considerations

### Optimization Strategies
1. **Code Splitting**: Lazy load onboarding components
2. **Local Storage**: Immediate data persistence without API calls
3. **Optimistic Updates**: Update UI immediately, sync later
4. **Minimal Dependencies**: Keep bundle size under 500KB

### Loading Performance
- Initial page load: < 2 seconds
- Transaction updates: < 100ms
- Category calculations: Real-time
- Offline functionality: Full budget access

## Accessibility Standards

### WCAG 2.1 AA Compliance
- **Keyboard Navigation**: Full app usable without mouse
- **Screen Reader Support**: Proper ARIA labels and roles
- **Color Contrast**: Minimum 4.5:1 ratio for all text
- **Focus Management**: Clear focus indicators and logical tab order

### Inclusive Design
- **Simple Language**: Clear, jargon-free interface text
- **Error Prevention**: Validation and confirmation dialogs
- **Flexible Input**: Multiple ways to enter data
- **Consistent Patterns**: Predictable interaction models

## Future Scalability

### Backend Integration Preparation
```typescript
// API service layer ready for backend
interface BudgetService {
  getBudget(userId: string, month: string): Promise<Budget>;
  updateBudget(budget: Budget): Promise<Budget>;
  addTransaction(transaction: Transaction): Promise<Transaction>;
  generateAIBudget(onboardingData: OnboardingData): Promise<Budget>;
}
```

### Mobile App Considerations
- **Shared Components**: React Native compatibility
- **Offline-First**: Local storage with sync capabilities
- **Push Notifications**: Budget alerts and reminders
- **Biometric Auth**: Touch/Face ID for quick access

This design prioritizes user experience while maintaining technical excellence and scalability for future enhancements.
