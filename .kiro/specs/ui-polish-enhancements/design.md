# UI Polish & Enhancements - Design Document

**Last Updated**: 2026-02-02
**Status**: Ready for Implementation
**Spec**: `.kiro/specs/ui-polish-enhancements/`

## Overview

This design document covers the technical implementation of UI polish items and enhancements. All features leverage existing backend APIs and focus on frontend improvements.

---

## 1. Quick Actions System

### 1.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Quick Actions System                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ QuickActions │    │ Keyboard     │    │ Transaction  │       │
│  │ FAB          │    │ Shortcuts    │    │ Templates    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         └───────────────────┴───────────────────┘                │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │ QuickActions    │                          │
│                    │ Context         │                          │
│                    └─────────────────┘                          │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                    │
│     ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│     │ Add Txn    │  │ Scan       │  │ Recent     │             │
│     │ Modal      │  │ Receipt    │  │ Entries    │             │
│     └────────────┘  └────────────┘  └────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Components

**QuickActionsFAB.tsx**

```typescript
interface QuickActionsProps {
  onAddTransaction: () => void;
  onScanReceipt?: () => void;
  onViewBudget: () => void;
  recentCategories: string[];
}
```

**KeyboardShortcuts.tsx**

```typescript
const SHORTCUTS = {
  "ctrl+n": "newTransaction",
  "ctrl+b": "viewBudget",
  "ctrl+s": "settings",
  "ctrl+/": "showHelp",
};
```

### 1.3 State Management

- Use React Context for quick actions state
- Store recent categories in localStorage
- Store transaction templates in localStorage

---

## 2. Two-Factor Authentication UI

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  2FA Flow                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Settings Page                                                   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────┐                                               │
│  │ 2FA Status   │ ──► Enabled: Show disable option              │
│  │ Card         │ ──► Disabled: Show enable button              │
│  └──────────────┘                                               │
│       │                                                          │
│       ▼ (Enable clicked)                                         │
│  ┌──────────────┐                                               │
│  │ Setup Wizard │                                               │
│  │ Step 1: QR   │ ──► Display QR code from Cognito              │
│  │ Step 2: Code │ ──► Verify TOTP code                          │
│  │ Step 3: Done │ ──► Show backup codes                         │
│  └──────────────┘                                               │
│                                                                  │
│  Login Flow (when 2FA enabled)                                   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────┐                                               │
│  │ 2FA Code     │ ──► Enter 6-digit code                        │
│  │ Input        │ ──► Verify with Cognito                       │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Components

**TwoFactorSetup.tsx**

```typescript
interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

// Steps: 'intro' | 'qr' | 'verify' | 'backup' | 'complete'
```

**TwoFactorVerify.tsx**

```typescript
interface TwoFactorVerifyProps {
  onVerify: (code: string) => Promise<boolean>;
  onCancel: () => void;
}
```

### 2.3 Cognito Integration

- Use `associateSoftwareToken` to get secret
- Use `verifySoftwareToken` to verify setup
- Use `respondToAuthChallenge` for login verification

---

## 3. Goals Drag-and-Drop

### 3.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Goals Reordering                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  GoalsPage                                            │       │
│  │  ┌────────────────────────────────────────────────┐  │       │
│  │  │  DndContext (react-dnd or @dnd-kit)            │  │       │
│  │  │  ┌──────────────────────────────────────────┐  │  │       │
│  │  │  │  SortableContext                         │  │  │       │
│  │  │  │  ┌────────────┐  ┌────────────┐         │  │  │       │
│  │  │  │  │ GoalCard 1 │  │ GoalCard 2 │  ...    │  │  │       │
│  │  │  │  │ (Draggable)│  │ (Draggable)│         │  │  │       │
│  │  │  │  └────────────┘  └────────────┘         │  │  │       │
│  │  │  └──────────────────────────────────────────┘  │  │       │
│  │  └────────────────────────────────────────────────┘  │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  On Drop:                                                        │
│  1. Update local state (optimistic)                              │
│  2. Call PUT /goals/reorder                                      │
│  3. Revert on error                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Library Choice

**@dnd-kit/core** (Recommended)

- Modern, accessible, performant
- Built-in keyboard support
- Touch support for mobile
- Tree-shakeable

### 3.3 API Integration

```typescript
// PUT /goals/reorder
interface ReorderRequest {
  goalIds: string[]; // Ordered array of goal IDs
}
```

---

## 4. Tips Feed Enhancements

### 4.1 Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  TipsFeedPage                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  Header: "Financial Tips"                             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  CategoryTabs                                         │       │
│  │  [All] [Budgeting] [Saving] [Debt] [Investing]       │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  DailyTipCard (highlighted)                          │       │
│  │  💡 Today's Tip                                       │       │
│  │  "Track every expense for a week..."                 │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  TipsFeed (virtualized list)                         │       │
│  │  ┌────────────────────────────────────────────────┐  │       │
│  │  │  TipCard (swipeable on mobile)                 │  │       │
│  │  │  [Save] ← swipe → [Dismiss]                    │  │       │
│  │  └────────────────────────────────────────────────┘  │       │
│  │  ┌────────────────────────────────────────────────┐  │       │
│  │  │  TipCard                                       │  │       │
│  │  └────────────────────────────────────────────────┘  │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Swipe Gestures (Mobile)

- Use `react-native-gesture-handler` for swipe
- Left swipe: Save tip
- Right swipe: Dismiss tip
- Visual feedback during swipe

---

## 5. Transaction Search & Filtering

### 5.1 Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  TransactionFilters                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  SearchBar                                            │       │
│  │  [🔍 Search transactions...]                          │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  FilterBar (collapsible)                             │       │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │       │
│  │  │ Category ▼ │ │ Date Range │ │ Amount     │       │       │
│  │  └────────────┘ └────────────┘ └────────────┘       │       │
│  │  ┌────────────┐ ┌────────────────────────────┐       │       │
│  │  │ Type ▼     │ │ [Clear Filters]            │       │       │
│  │  └────────────┘ └────────────────────────────┘       │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Filter State

```typescript
interface TransactionFilters {
  search: string;
  category: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  amountMin: number | null;
  amountMax: number | null;
  type: "income" | "expense" | null;
}
```

### 5.3 Backend API

```
GET /transactions?search=coffee&category=Food&dateFrom=2026-01-01&dateTo=2026-01-31
```

---

## 6. Correctness Properties

### Property 1: Quick Actions Accessibility

- All quick actions SHALL be keyboard accessible
- FAB SHALL have proper ARIA labels
- Shortcuts SHALL not conflict with browser defaults

### Property 2: 2FA Security

- 2FA setup SHALL require valid TOTP code
- Backup codes SHALL be unique and single-use
- 2FA disable SHALL require password confirmation

### Property 3: Goal Ordering Consistency

- Goal order SHALL persist across sessions
- Drag-and-drop SHALL update backend atomically
- Order SHALL be consistent across devices

### Property 4: Search Accuracy

- Search SHALL return all matching transactions
- Filters SHALL be combinable (AND logic)
- Empty search SHALL return all transactions

### Property 5: Theme Persistence

- Theme preference SHALL persist across sessions
- System theme SHALL follow OS preference
- Theme change SHALL apply immediately

---

## 7. Testing Strategy

### Unit Tests

- Quick actions menu rendering
- Keyboard shortcut handling
- Filter state management
- Theme context behavior

### Integration Tests

- 2FA setup flow end-to-end
- Goal reordering with API
- Search with multiple filters

### Property-Based Tests

- Search results contain all matches
- Filter combinations work correctly
- Goal order is always valid

### Accessibility Tests

- Keyboard navigation for all features
- Screen reader compatibility
- Color contrast verification

---

## 8. Implementation Priority

| Feature             | Priority | Effort | Dependencies    |
| ------------------- | -------- | ------ | --------------- |
| Quick Actions FAB   | HIGH     | 2 days | None            |
| Keyboard Shortcuts  | HIGH     | 1 day  | None            |
| Transaction Search  | HIGH     | 2 days | Backend ready   |
| Goals Drag-and-Drop | MEDIUM   | 2 days | @dnd-kit        |
| 2FA Setup UI        | MEDIUM   | 3 days | Cognito MFA     |
| Tips Feed Swipe     | MEDIUM   | 2 days | gesture-handler |
| Theme Toggle        | LOW      | 1 day  | None            |
| Onboarding Polish   | LOW      | 2 days | None            |

---

## 9. File Structure

```
packages/web-app/src/
├── components/
│   ├── QuickActionsFAB.tsx
│   ├── KeyboardShortcuts.tsx
│   ├── TwoFactorSetup.tsx
│   ├── TwoFactorVerify.tsx
│   ├── TransactionFilters.tsx
│   ├── SearchBar.tsx
│   └── DraggableGoalCard.tsx
├── contexts/
│   ├── QuickActionsContext.tsx
│   └── ThemeContext.tsx (update)
└── hooks/
    ├── useKeyboardShortcuts.ts
    └── useTransactionFilters.ts

packages/mobile/src/
├── components/
│   ├── QuickActionsFAB.tsx
│   ├── SwipeableTipCard.tsx
│   └── DraggableGoalCard.tsx
└── screens/
    └── TwoFactorSetupScreen.tsx
```
