# Design: Mobile App

## Technology Stack

- React Native 0.74+ + Expo SDK 51+
- TypeScript strict
- React Navigation v6 (bottom tabs + native stacks)
- SQLite (`expo-sqlite`) + AsyncStorage for offline
- Expo SecureStore for JWT token storage
- Expo Notifications for push
- Zustand for global state
- React Query for server state

## Project Structure

```
packages/mobile/
  app/              — Expo Router entry points (if using file-based routing)
  screens/          — screen components (Budget, Transactions, Goals, More, Auth)
  components/       — shared UI (CategoryIcon, ProgressRing, TransactionRow, FAB)
  services/         — API clients (same 4 base URLs as web)
  hooks/            — useBudget, useTransactions, useGoals, useAuth, useSync
  stores/           — Zustand: budgetStore, authStore, uiStore
  navigation/       — bottom tab config, stack navigators
  db/               — SQLite schema and migrations
  utils/            — date helpers, currency formatting (shared with packages/shared)
```

## Key Design Decisions

### API Reuse
Shares all 4 API Gateways with web app. No mobile-specific backend needed.
`packages/shared/` types reused across web and mobile.

### State Architecture
- **Zustand**: global auth state, UI state (active tab, modals)
- **React Query**: server data with background refresh + cache
- **SQLite**: offline storage for budget + transactions; synced on foreground

### Offline Strategy
1. On startup: load from SQLite immediately (instant display)
2. Fetch from API in background; update SQLite + React Query cache
3. On transaction create: write to SQLite first, then sync API
4. Conflict resolution: server version wins; user notified via toast

### Navigation Structure
```
AuthStack
  LoginScreen
  RegisterScreen
  OnboardingStack
    BudgetTypeScreen
    AIGenerationScreen

AppTabs (bottom bar)
  BudgetTab
    BudgetScreen
    AddTransactionSheet (bottom sheet)
  TransactionsTab
    TransactionsScreen
    TransactionDetailScreen
  GoalsTab
    GoalsScreen (Goals/Borrowed/Lent tabs)
    AddGoalScreen
  MoreTab
    MoreScreen → Accounts, Bills, Settings, Insights, Planned Transactions
```

### UI Inspiration (from docs/mobile-ux-design.md)
- **Budge**: large colored category icons, swipe-to-delete, budget-screen quick-add
- **Budgety**: progress rings for goals, minimal tab bar, bottom sheet modals

## Security

- Expo SecureStore for JWT tokens (hardware-backed on supported devices)
- No PII in AsyncStorage — only non-sensitive preferences
- Certificate pinning for API calls (production builds only)
- Biometric authentication (optional): `expo-local-authentication` for FaceID/TouchID
- All API calls go through same Cognito-authorized API Gateways as web
