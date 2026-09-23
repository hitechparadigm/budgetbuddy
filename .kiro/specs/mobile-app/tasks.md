# Tasks: Mobile App

## Status: 🔲 Not Started

Design documented in `docs/mobile-ux-design.md`. Begins after CI/CD is stable (Run 582+).

## Phase 1 — Foundation (Tier 1)

- [ ] 1. Project setup
  - [ ] 1.1 Initialize Expo project in `packages/mobile/` with TypeScript template
  - [ ] 1.2 Configure React Navigation v6 (bottom tabs + native stacks)
  - [ ] 1.3 Set up Zustand store scaffolding (budgetStore, authStore, uiStore)
  - [ ] 1.4 Set up React Query with API client (reuse config from web pattern)
  - [ ] 1.5 Configure Expo SecureStore for token management
  - [ ] 1.6 Add `packages/mobile` to root workspace in package.json
  - [ ] 1.7 Configure TypeScript and ESLint (same rules as web)

- [ ] 2. Authentication
  - [ ] 2.1 LoginScreen — email/password via Cognito
  - [ ] 2.2 Google OAuth sign-in (Expo AuthSession, PKCE)
  - [ ] 2.3 Token refresh interceptor in API client
  - [ ] 2.4 Persist auth state in Expo SecureStore
  - [ ] 2.5 Auth guard: redirect to AuthStack when not authenticated

- [ ] 3. Onboarding
  - [ ] 3.1 BudgetTypeScreen — personal/family/shared selection
  - [ ] 3.2 AIGenerationScreen — progress animation during Bedrock call
  - [ ] 3.3 Complete flow → navigate to BudgetScreen

- [ ] 4. Budget Screen
  - [ ] 4.1 Income / Savings / Expense group sections
  - [ ] 4.2 Category row with planned vs. spent and progress indicator
  - [ ] 4.3 Month navigation (arrow buttons)
  - [ ] 4.4 Over-budget red highlight
  - [ ] 4.5 Floating Action Button → AddTransactionSheet
  - [ ] 4.6 Load from SQLite cache, refresh from API

- [ ] 5. Quick Transaction Entry (Bottom Sheet)
  - [ ] 5.1 Bottom sheet modal using react-native-reanimated
  - [ ] 5.2 Amount input with numpad (native keyboard type numeric)
  - [ ] 5.3 Category picker with CategoryIcon components
  - [ ] 5.4 Date picker
  - [ ] 5.5 Submit with optimistic update to SQLite + API sync

- [ ] 6. Goals Screen
  - [ ] 6.1 Goals list with SVG progress rings
  - [ ] 6.2 Goals / Borrowed / Lent tabs (matches web)
  - [ ] 6.3 Add contribution bottom sheet

- [ ] 7. Offline Support
  - [ ] 7.1 SQLite schema: budgets, periods, categories, transactions
  - [ ] 7.2 Sync on app foreground (AppState listener)
  - [ ] 7.3 Conflict resolution: server wins, toast notification

## Phase 2 — Extended Features (Tier 2)

- [ ] 8. Transactions screen with search + filter
- [ ] 9. Push notifications (Expo Notifications + existing notification Lambda)
- [ ] 10. Accounts screen
- [ ] 11. Bills screen with AI pattern badges
- [ ] 12. Planned Transactions screen
- [ ] 13. Settings screen
- [ ] 14. Insights / AI Coach chat screen
- [ ] 15. Biometric auth (optional, expo-local-authentication)
- [ ] 16. App Store (iOS) + Play Store (Android) submission prep

## Notes

- Reuse `packages/shared/` types for type safety
- AWS profile for dev testing: `hitechparadigm`
- Integration tests: dev environment only, clean up test data, <$0.10 per test run
