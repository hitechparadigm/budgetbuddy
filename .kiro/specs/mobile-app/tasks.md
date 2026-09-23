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

## Phase 3 - Testing

Coverage target: >80% statements and branches on `packages/mobile/src/`.
Runner: `jest-expo`. Component tests: `@testing-library/react-native`.

- [ ] 17. Test harness setup
  - [ ] 17.1 Configure `jest-expo` preset and `jest.setup.js`
  - [ ] 17.2 Mock `expo-secure-store`, `expo-sqlite`, `expo-notifications`
  - [ ] 17.3 Add `test`, `test:coverage` scripts to `packages/mobile/package.json`
  - [ ] 17.4 Set Jest `coverageThreshold` to 80% so the gate is enforced by CI, not by hand

- [ ] 18. Unit tests - stores and services
  - [ ] 18.1 `authStore` - login sets token, logout clears it, refresh replaces it
  - [ ] 18.2 `budgetStore` - month switch, optimistic transaction insert, rollback on API failure
  - [ ] 18.3 API client - attaches `budgetbuddy_id_token`, retries once on 401, surfaces 403
  - [ ] 18.4 Correct base URL chosen per endpoint group (4 gateways)
  - _Requirements: 1.3, 7.2, 7.3_

- [ ] 19. Unit tests - offline layer
  - [ ] 19.1 SQLite schema migration is idempotent on repeat launch
  - [ ] 19.2 Writes queue while offline and flush in order on reconnect
  - [ ] 19.3 Conflict resolution prefers server and emits a user-visible notice
  - [ ] 19.4 Corrupt or partial cache falls back to network without crashing
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 20. Component tests - Tier 1 screens
  - [ ] 20.1 `BudgetScreen` - renders groups, over-budget row is flagged, month nav works
  - [ ] 20.2 `AddTransactionSheet` - validation, category pick, optimistic insert
  - [ ] 20.3 `GoalsScreen` - progress rings, Goals/Borrowed/Lent tabs
  - [ ] 20.4 `LoginScreen` - error states for wrong password and network failure
  - [ ] 20.5 Onboarding - budget type selection advances to AI generation step
  - _Requirements: 2.1, 2.4, 3.1, 5.1, 5.3, 6.1_

- [ ] 21. Accessibility tests
  - [ ] 21.1 Every touch target is at least 44x44
  - [ ] 21.2 Interactive elements expose `accessibilityLabel` and `accessibilityRole`
  - [ ] 21.3 Text contrast meets WCAG AA
  - _Requirements: 1.1, 2.2_

- [ ] 22. Coverage gate
  - [ ] 22.1 `npm run test:coverage` in `packages/mobile` reports >80%
  - [ ] 22.2 Wire the mobile suite into `pr-check.yml`

- [ ] 23. Integration tests (dev only, AWS profile `hitechparadigm`)
  - [ ] 23.1 Sign in against dev Cognito, token persists across app restart
  - [ ] 23.2 Create a transaction, confirm it appears via the web API
  - [ ] 23.3 Airplane-mode write then reconnect, record syncs exactly once (no duplicate)
  - [ ] 23.4 Clean up all created records
  - _Constraints: max 10 API calls per test, under ## Notes.10 per run, never against prod_

- [ ] 24. E2E tests - Detox
  - [ ] 24.1 Add Detox with iOS Simulator and Android Emulator configs
  - [ ] 24.2 Onboarding: register through AI budget generation to Budget screen
  - [ ] 24.3 Add a transaction from the FAB, budget totals update
  - [ ] 24.4 Add a goal contribution, progress advances
  - [ ] 24.5 Offline: kill network, add transaction, restore network, verify single sync
  - [ ] 24.6 Run both platforms in CI on the release candidate branch
  - _Requirements: 2.1, 3.1, 4.2, 5.2, 6.1_
## Notes

- Reuse `packages/shared/` types for type safety
- AWS profile for dev testing: `hitechparadigm`
- Integration tests: dev environment only, clean up test data, <$0.10 per test run
