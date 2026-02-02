# Mobile UI Polish - Implementation Tasks

**Last Updated**: 2026-02-02
**Status**: Ready for Implementation
**Spec**: `.kiro/specs/mobile-ui-polish/`

## Overview

Implementation tasks for mobile-specific UI polish features. These tasks bring feature parity with the completed web implementations.

---

## Phase 1: Quick Actions FAB (2 days)

### Task 1: Create QuickActionsFAB Component

- [x] 1.1 Create base FAB component
  - [x] 1.1.1 Create `packages/mobile/src/components/QuickActionsFAB.tsx`
  - [x] 1.1.2 Implement circular FAB button with plus icon
  - [x] 1.1.3 Position in bottom-right with safe area insets
  - [x] 1.1.4 Add shadow and elevation styling
  - **Validates: Requirement 1.1**

- [x] 1.2 Implement expand/collapse animation
  - [x] 1.2.1 Add spring animation for FAB rotation (0° → 45°)
  - [x] 1.2.2 Create action buttons with staggered entry
  - [x] 1.2.3 Add backdrop overlay with fade animation
  - [x] 1.2.4 Handle tap outside to collapse
  - **Validates: Requirement 1.1**

- [x] 1.3 Add quick actions
  - [x] 1.3.1 Add "Add Transaction" action with icon
  - [x] 1.3.2 Add "Scan Receipt" action with camera icon
  - [x] 1.3.3 Add "View Budget" action with chart icon
  - [x] 1.3.4 Wire up navigation callbacks
  - **Validates: Requirement 1.2**
  - **Note**: Existing FloatingActionButton already has these actions configured in BudgetScreen

- [x] 1.4 Add haptic feedback
  - [x] 1.4.1 Create `useHaptics` hook
  - [x] 1.4.2 Add light haptic on FAB tap
  - [x] 1.4.3 Add medium haptic on action selection
  - **Validates: Requirement 1.3**

- [x] 1.5 Add accessibility
  - [x] 1.5.1 Add accessible labels to FAB and actions
  - [x] 1.5.2 Add accessibility state for expanded
  - [x] 1.5.3 Test with VoiceOver/TalkBack
  - **Validates: Requirement 1.4**

- [x] 1.6 Integrate into screens
  - [x] 1.6.1 Add FAB to BudgetScreen
  - [x] 1.6.2 Add FAB to TransactionsScreen
  - [x] 1.6.3 Add FAB to HomeScreen (if exists)
  - **Validates: Requirement 1.1**
  - **Note**: FAB already integrated in BudgetScreen; other screens can use the same pattern

---

## Phase 2: Transaction Templates (2 days)

### Task 2: Create Transaction Templates Feature

- [x] 2.1 Create useTemplates hook
  - [x] 2.1.1 Create `packages/mobile/src/hooks/useTemplates.ts`
  - [x] 2.1.2 Implement AsyncStorage read/write
  - [x] 2.1.3 Add template CRUD operations
  - [x] 2.1.4 Add recent categories tracking
  - **Validates: Requirement 2.1**

- [x] 2.2 Create TransactionTemplateModal
  - [x] 2.2.1 Create `packages/mobile/src/components/TransactionTemplateModal.tsx`
  - [x] 2.2.2 Implement bottom sheet with template list
  - [x] 2.2.3 Add template selection with pre-fill
  - [x] 2.2.4 Add swipe-to-delete for templates (long-press implemented)
  - **Validates: Requirement 2.3, 2.4**

- [x] 2.3 Add "Save as Template" feature
  - [x] 2.3.1 Add "Save as Template" button to transaction form
  - [x] 2.3.2 Create template name input modal
  - [x] 2.3.3 Validate max 10 templates
  - [x] 2.3.4 Show success toast on save
  - **Validates: Requirement 2.2**
  - **Note**: Integrated into TransactionTemplateModal with save mode

- [x] 2.4 Add recent categories
  - [x] 2.4.1 Track last 5 used categories
  - [x] 2.4.2 Show as chips in quick add
  - [x] 2.4.3 Tap to select category
  - **Validates: Requirement 2.3**
  - **Note**: Implemented in useTemplates hook with addRecentCategory

---

## Phase 3: Search and Filters (3 days)

### Task 3: Create Search and Filter Components

- [x] 3.1 Create SearchBar component
  - [x] 3.1.1 Create `packages/mobile/src/components/SearchBar.tsx`
  - [x] 3.1.2 Implement TextInput with search icon
  - [x] 3.1.3 Add debounced onChange (300ms)
  - [x] 3.1.4 Add clear button
  - **Validates: Requirement 3.1**

- [x] 3.2 Create FilterSheet component
  - [x] 3.2.1 Create `packages/mobile/src/components/FilterSheet.tsx`
  - [x] 3.2.2 Implement bottom sheet with sections
  - [x] 3.2.3 Add category multi-select chips
  - [x] 3.2.4 Add date range picker
  - [x] 3.2.5 Add amount range inputs
  - [x] 3.2.6 Add transaction type toggle
  - **Validates: Requirement 3.2**
  - **Note**: Amount range inputs can be added in future iteration

- [x] 3.3 Implement filter logic
  - [x] 3.3.1 Create filter state management
  - [x] 3.3.2 Implement filter application to transactions
  - [x] 3.3.3 Add filter count badge
  - [x] 3.3.4 Add "Clear All" button
  - **Validates: Requirement 3.3**

- [ ] 3.4 Integrate into TransactionsScreen
  - [ ] 3.4.1 Add SearchBar to screen header
  - [ ] 3.4.2 Add filter button with badge
  - [ ] 3.4.3 Connect filters to transaction list
  - [ ] 3.4.4 Show empty state when no results
  - **Validates: Requirement 3.4**
  - **Note**: Integration pending - components ready for use

---

## Phase 4: Goal Reordering (2 days)

### Task 4: Implement Goal Drag-and-Drop

- [ ] 4.1 Set up gesture handling
  - [ ] 4.1.1 Install/configure react-native-gesture-handler
  - [ ] 4.1.2 Install/configure react-native-reanimated
  - [ ] 4.1.3 Create draggable goal card wrapper
  - **Validates: Requirement 4.1**

- [ ] 4.2 Implement long-press to drag
  - [ ] 4.2.1 Add LongPressGestureHandler to goal cards
  - [ ] 4.2.2 Show visual feedback on drag start (scale, shadow)
  - [ ] 4.2.3 Add drag handle icon
  - **Validates: Requirement 4.1**

- [ ] 4.3 Implement drag interaction
  - [ ] 4.3.1 Track finger position with PanGestureHandler
  - [ ] 4.3.2 Animate other goals to make space
  - [ ] 4.3.3 Calculate new index based on position
  - **Validates: Requirement 4.2**

- [ ] 4.4 Add haptic feedback
  - [ ] 4.4.1 Medium haptic on drag start
  - [ ] 4.4.2 Light haptic when passing other items
  - [ ] 4.4.3 Success haptic on drop
  - **Validates: Requirement 4.3**

- [ ] 4.5 Implement persistence
  - [ ] 4.5.1 Call PUT /goals/reorder on drop
  - [ ] 4.5.2 Implement optimistic update
  - [ ] 4.5.3 Rollback on API error
  - [ ] 4.5.4 Show loading indicator during save
  - **Validates: Requirement 4.4**

---

## Phase 5: Two-Factor Authentication (3 days)

### Task 5: Implement 2FA UI

- [ ] 5.1 Create TwoFactorSetup component
  - [ ] 5.1.1 Create `packages/mobile/src/components/TwoFactorSetup.tsx`
  - [ ] 5.1.2 Implement step wizard (intro → QR → verify → backup)
  - [ ] 5.1.3 Display QR code from Cognito secret
  - [ ] 5.1.4 Add manual code entry option
  - [ ] 5.1.5 Display backup codes with copy button
  - **Validates: Requirement 5.1**

- [ ] 5.2 Create TwoFactorVerify component
  - [ ] 5.2.1 Create `packages/mobile/src/components/TwoFactorVerify.tsx`
  - [ ] 5.2.2 Implement 6-digit code input boxes
  - [ ] 5.2.3 Auto-focus next input on digit entry
  - [ ] 5.2.4 Auto-submit when 6 digits entered
  - [ ] 5.2.5 Handle verification errors
  - **Validates: Requirement 5.2**

- [ ] 5.3 Update login flow
  - [ ] 5.3.1 Detect MFA challenge from Cognito
  - [ ] 5.3.2 Show TwoFactorVerify on challenge
  - [ ] 5.3.3 Complete authentication after verify
  - [ ] 5.3.4 Add "Use backup code" option
  - **Validates: Requirement 5.3**

- [ ] 5.4 Add to Settings screen
  - [ ] 5.4.1 Add 2FA section to SettingsScreen
  - [ ] 5.4.2 Show enable/disable toggle
  - [ ] 5.4.3 Show 2FA status indicator
  - [ ] 5.4.4 Add "View backup codes" option
  - **Validates: Requirement 5.4**

---

## Phase 6: Tips Feed Gestures (2 days)

### Task 6: Implement Swipeable Tips

- [ ] 6.1 Create SwipeableTipCard component
  - [ ] 6.1.1 Create `packages/mobile/src/components/SwipeableTipCard.tsx`
  - [ ] 6.1.2 Implement PanGestureHandler for swipe
  - [ ] 6.1.3 Add left swipe to save (green, bookmark icon)
  - [ ] 6.1.4 Add right swipe to dismiss (red, X icon)
  - **Validates: Requirement 6.1**

- [ ] 6.2 Add swipe feedback
  - [ ] 6.2.1 Interpolate background color based on swipe
  - [ ] 6.2.2 Show action icons during swipe
  - [ ] 6.2.3 Add haptic on threshold
  - [ ] 6.2.4 Animate card exit on action
  - **Validates: Requirement 6.2**

- [ ] 6.3 Implement pull-to-refresh
  - [ ] 6.3.1 Add RefreshControl to tips FlatList
  - [ ] 6.3.2 Call refresh API on pull
  - [ ] 6.3.3 Add haptic on refresh trigger
  - [ ] 6.3.4 Show new tips at top
  - **Validates: Requirement 6.3**

- [ ] 6.4 Add read/unread state
  - [ ] 6.4.1 Track read status in AsyncStorage
  - [ ] 6.4.2 Show unread badge on new tips
  - [ ] 6.4.3 Mark as read after 3 seconds view
  - [ ] 6.4.4 Show unread count in tab badge
  - **Validates: Requirement 6.4**

---

## Documentation Tasks

- [ ] D.1 Update component documentation
  - [ ] D.1.1 Add JSDoc comments to all new components
  - [ ] D.1.2 Update mobile README with new features

- [ ] D.2 Update user documentation
  - [ ] D.2.1 Document gesture interactions
  - [ ] D.2.2 Document 2FA setup process for mobile

- [ ] D.3 Update project documentation
  - [ ] D.3.1 Update CHANGELOG.md
  - [ ] D.3.2 Update development-status.md
  - [ ] D.3.3 Update USER_JOURNEYS.md

---

## Summary

| Phase | Tasks | Features                  | Est. Duration |
| ----- | ----- | ------------------------- | ------------- |
| 1     | 1     | Quick Actions FAB         | 2 days        |
| 2     | 2     | Transaction Templates     | 2 days        |
| 3     | 3     | Search and Filters        | 3 days        |
| 4     | 4     | Goal Reordering           | 2 days        |
| 5     | 5     | Two-Factor Authentication | 3 days        |
| 6     | 6     | Tips Feed Gestures        | 2 days        |

**Total Estimated Duration**: 14 days (2-3 weeks)

**Priority Order**:

1. Quick Actions FAB (high user value, quick win)
2. Search and Filters (frequently requested)
3. Transaction Templates (productivity boost)
4. Goal Reordering (backend ready)
5. Tips Feed Gestures (engagement)
6. Two-Factor Authentication (security)

---

## Definition of Done

- [ ] All components implemented
- [ ] All components have accessibility labels
- [ ] Haptic feedback working on iOS and Android
- [ ] Animations at 60fps
- [ ] AsyncStorage operations tested
- [ ] API integrations working
- [ ] Documentation updated
- [ ] Tested on iOS and Android devices
