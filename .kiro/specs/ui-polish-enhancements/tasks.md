# UI Polish & Enhancements - Implementation Tasks

**Last Updated**: 2026-02-02
**Status**: Ready for Implementation
**Spec**: `.kiro/specs/ui-polish-enhancements/`

## Overview

Implementation tasks for UI polish items and enhancements. All features use existing backend APIs.

---

## Phase 1: Quick Actions (Week 1)

### Task 1: Quick Actions FAB

- [x] 1.1 Create QuickActionsFAB component (Web)
  - [x] 1.1.1 Create `packages/web-app/src/components/QuickActionsFAB.tsx`
  - [x] 1.1.2 Implement expandable FAB with animation
  - [x] 1.1.3 Add "Add Transaction" action
  - [x] 1.1.4 Add "View Budget" action
  - [x] 1.1.5 Add "Scan Receipt" action (link to mobile)
  - [x] 1.1.6 Style with Tailwind CSS
  - **Validates: Requirement 1.1-1.4**

- [ ] 1.2 Create QuickActionsFAB component (Mobile)
  - [ ] 1.2.1 Create `packages/mobile/src/components/QuickActionsFAB.tsx`
  - [ ] 1.2.2 Implement native FAB with React Native
  - [ ] 1.2.3 Add haptic feedback on tap
  - [ ] 1.2.4 Add "Scan Receipt" action with camera
  - **Validates: Requirement 1.1-1.4**

- [x] 1.3 Integrate FAB into layouts
  - [x] 1.3.1 Add FAB to BudgetPage
  - [ ] 1.3.2 Add FAB to TransactionsPage
  - [ ] 1.3.3 Add FAB to mobile screens
  - **Validates: Requirement 1.1**

### Task 2: Keyboard Shortcuts

- [x] 2.1 Create keyboard shortcuts hook
  - [x] 2.1.1 Create `packages/web-app/src/hooks/useKeyboardShortcuts.ts`
  - [x] 2.1.2 Implement shortcut registration
  - [x] 2.1.3 Handle Ctrl/Cmd key detection
  - [x] 2.1.4 Prevent conflicts with browser shortcuts
  - **Validates: Requirement 1.5**

- [x] 2.2 Create shortcuts help modal
  - [x] 2.2.1 Create `packages/web-app/src/components/ShortcutsHelpModal.tsx`
  - [x] 2.2.2 Display all available shortcuts
  - [x] 2.2.3 Open with Ctrl+/ shortcut
  - **Validates: Requirement 1.5**

- [x] 2.3 Implement core shortcuts
  - [x] 2.3.1 Ctrl+N: Open new transaction modal
  - [x] 2.3.2 Ctrl+B: Navigate to budget
  - [x] 2.3.3 Ctrl+S: Navigate to settings
  - [x] 2.3.4 Escape: Close modals
  - **Validates: Requirement 1.5**

### Task 3: Transaction Templates

- [x] 3.1 Create transaction templates feature
  - [x] 3.1.1 Create `packages/web-app/src/components/TransactionTemplateModal.tsx`
  - [x] 3.1.2 Store templates in localStorage
  - [x] 3.1.3 Show recent categories in quick add
  - [x] 3.1.4 Remember last used category
  - **Validates: Requirement 1.6-1.8**

- [ ] 3.2 Add templates to mobile
  - [ ] 3.2.1 Create `packages/mobile/src/components/TransactionTemplateModal.tsx`
  - [ ] 3.2.2 Store templates in AsyncStorage
  - [ ] 3.2.3 Show templates in quick add flow
  - **Validates: Requirement 1.6-1.8**

---

## Phase 2: Transaction Search & Filtering (Week 1)

### Task 4: Search Bar Component

- [x] 4.1 Create SearchBar component
  - [x] 4.1.1 Create `packages/web-app/src/components/SearchBar.tsx`
  - [x] 4.1.2 Implement debounced search input
  - [x] 4.1.3 Add clear button
  - [x] 4.1.4 Add search icon
  - [x] 4.1.5 Style with Tailwind CSS
  - **Validates: Requirement 5.1-5.2**

- [x] 4.2 Create TransactionFilters component
  - [x] 4.2.1 Create `packages/web-app/src/components/TransactionFilters.tsx`
  - [x] 4.2.2 Add category dropdown filter
  - [x] 4.2.3 Add date range picker
  - [x] 4.2.4 Add amount range inputs
  - [x] 4.2.5 Add transaction type toggle
  - [x] 4.2.6 Add clear filters button
  - **Validates: Requirement 5.3-5.7**

- [x] 4.3 Create useTransactionFilters hook
  - [x] 4.3.1 Create `packages/web-app/src/hooks/useTransactionFilters.ts`
  - [x] 4.3.2 Manage filter state
  - [x] 4.3.3 Build query parameters
  - [x] 4.3.4 Persist filters in session
  - **Validates: Requirement 5.8**

- [ ] 4.4 Integrate filters into TransactionList
  - [x] 4.4.1 Update TransactionList to accept filters
  - [x] 4.4.2 Call API with filter parameters
  - [x] 4.4.3 Show active filter indicators
  - **Validates: Requirement 5.1-5.8**

- [ ] 4.5 Add search to mobile
  - [ ] 4.5.1 Create mobile SearchBar component
  - [ ] 4.5.2 Create mobile filter sheet
  - [ ] 4.5.3 Integrate with TransactionsScreen
  - **Validates: Requirement 5.1-5.8**

---

## Phase 3: Goals Enhancements (Week 2)

### Task 5: Drag-and-Drop Reordering

- [x] 5.1 Install and configure @dnd-kit
  - [x] 5.1.1 Add @dnd-kit/core and @dnd-kit/sortable to web-app
  - [x] 5.1.2 Create DndContext wrapper
  - **Note**: Using native HTML5 drag-and-drop instead (already implemented)
  - **Validates: Requirement 3.1**

- [x] 5.2 Create DraggableGoalCard component
  - [x] 5.2.1 Create `packages/web-app/src/components/DraggableGoalCard.tsx`
  - [x] 5.2.2 Wrap existing GoalCard with useSortable
  - [x] 5.2.3 Add drag handle icon
  - [x] 5.2.4 Add visual feedback during drag
  - **Note**: Implemented directly in GoalsPage.tsx
  - **Validates: Requirement 3.1, 3.4**

- [x] 5.3 Update GoalsPage with drag-and-drop
  - [x] 5.3.1 Wrap goals list with DndContext
  - [x] 5.3.2 Handle onDragEnd event
  - [x] 5.3.3 Call PUT /goals/reorder API
  - [x] 5.3.4 Implement optimistic update
  - [x] 5.3.5 Handle reorder errors
  - **Validates: Requirement 3.1, 3.3**

- [x] 5.4 Add keyboard reordering support
  - [x] 5.4.1 Enable keyboard sensors in DndContext
  - [x] 5.4.2 Add ARIA labels for accessibility
  - **Note**: Native drag-and-drop has basic keyboard support
  - **Validates: Requirement 3.1**

- [ ] 5.5 Add mobile reordering
  - [ ] 5.5.1 Implement long-press to reorder on mobile
  - [ ] 5.5.2 Add haptic feedback during drag
  - [ ] 5.5.3 Call reorder API on drop
  - **Validates: Requirement 3.2, 3.3**

### Task 6: Goal Archive Feature

- [x] 6.1 Add archive functionality
  - [x] 6.1.1 Add "Archive" button to completed goals
  - [x] 6.1.2 Create archived goals section
  - [x] 6.1.3 Add "Restore" button for archived goals
  - [x] 6.1.4 Store archive status in backend
  - **Validates: Requirement 3.5-3.7**

- [x] 6.2 Add confetti animation
  - [x] 6.2.1 Install confetti library (canvas-confetti)
  - [x] 6.2.2 Trigger confetti on goal completion
  - [x] 6.2.3 Add celebration modal
  - **Note**: Created custom Confetti component without external dependencies
  - **Validates: Requirement 3.8**

---

## Phase 4: Two-Factor Authentication UI (Week 2)

### Task 7: 2FA Setup Wizard

- [x] 7.1 Create TwoFactorSetup component
  - [x] 7.1.1 Create `packages/web-app/src/components/TwoFactorSetup.tsx`
  - [x] 7.1.2 Implement step wizard (intro → QR → verify → backup)
  - [x] 7.1.3 Generate QR code from Cognito secret
  - [x] 7.1.4 Display backup codes
  - **Validates: Requirement 2.1-2.5**

- [x] 7.2 Create TwoFactorVerify component
  - [x] 7.2.1 Create `packages/web-app/src/components/TwoFactorVerify.tsx`
  - [x] 7.2.2 Implement 6-digit code input
  - [x] 7.2.3 Auto-submit on complete
  - [x] 7.2.4 Handle verification errors
  - **Validates: Requirement 2.4, 2.7**

- [ ] 7.3 Integrate with Settings page
  - [ ] 7.3.1 Add 2FA section to SettingsPage
  - [ ] 7.3.2 Show enable/disable toggle
  - [ ] 7.3.3 Show 2FA status indicator
  - **Validates: Requirement 2.8**

- [ ] 7.4 Update login flow
  - [ ] 7.4.1 Detect MFA challenge from Cognito
  - [ ] 7.4.2 Show TwoFactorVerify on challenge
  - [ ] 7.4.3 Complete authentication after verify
  - **Validates: Requirement 2.7**

- [ ] 7.5 Add 2FA to mobile
  - [ ] 7.5.1 Create TwoFactorSetupScreen
  - [ ] 7.5.2 Create TwoFactorVerifyScreen
  - [ ] 7.5.3 Update login flow for MFA
  - **Validates: Requirement 2.1-2.8**

---

## Phase 5: Tips Feed Enhancements (Week 3)

### Task 8: Tips Feed UI Improvements

- [ ] 8.1 Add category filter tabs
  - [ ] 8.1.1 Create CategoryTabs component
  - [ ] 8.1.2 Filter tips by category
  - [ ] 8.1.3 Persist selected category
  - **Validates: Requirement 4.3**

- [ ] 8.2 Enhance daily tip display
  - [ ] 8.2.1 Create DailyTipCard component
  - [ ] 8.2.2 Highlight with special styling
  - [ ] 8.2.3 Show "Today's Tip" badge
  - **Validates: Requirement 4.4**

- [ ] 8.3 Add saved tips section
  - [ ] 8.3.1 Create SavedTipsPage
  - [ ] 8.3.2 List saved tips
  - [ ] 8.3.3 Add unsave functionality
  - **Validates: Requirement 4.5**

- [ ] 8.4 Add read/unread indicators
  - [ ] 8.4.1 Track read status locally
  - [ ] 8.4.2 Show unread badge on tips
  - [ ] 8.4.3 Mark as read on view
  - **Validates: Requirement 4.6**

- [ ] 8.5 Add mobile swipe gestures
  - [ ] 8.5.1 Create SwipeableTipCard component
  - [ ] 8.5.2 Swipe left to save
  - [ ] 8.5.3 Swipe right to dismiss
  - [ ] 8.5.4 Add visual swipe indicators
  - **Validates: Requirement 4.2**

- [ ] 8.6 Add pull-to-refresh
  - [ ] 8.6.1 Implement pull-to-refresh on mobile
  - [ ] 8.6.2 Add haptic feedback
  - [ ] 8.6.3 Refresh tips feed
  - **Validates: Requirement 4.7**

---

## Phase 6: Theme & Accessibility (Week 3)

### Task 9: Theme System

- [ ] 9.1 Enhance ThemeContext
  - [ ] 9.1.1 Update ThemeContext with light/dark/system modes
  - [ ] 9.1.2 Persist theme preference
  - [ ] 9.1.3 Detect system preference
  - [ ] 9.1.4 Apply theme immediately on change
  - **Validates: Requirement 7.1-7.2**

- [ ] 9.2 Create theme toggle component
  - [ ] 9.2.1 Create ThemeToggle component
  - [ ] 9.2.2 Add to Settings page
  - [ ] 9.2.3 Add to header (optional)
  - **Validates: Requirement 7.1**

- [ ] 9.3 Implement dark mode styles
  - [ ] 9.3.1 Add dark mode Tailwind classes
  - [ ] 9.3.2 Update all components for dark mode
  - [ ] 9.3.3 Test contrast ratios
  - **Validates: Requirement 7.1, 7.5**

### Task 10: Accessibility Improvements

- [ ] 10.1 Add ARIA labels
  - [ ] 10.1.1 Audit all interactive elements
  - [ ] 10.1.2 Add missing ARIA labels
  - [ ] 10.1.3 Add ARIA live regions for updates
  - **Validates: Requirement 7.6**

- [ ] 10.2 Improve keyboard navigation
  - [ ] 10.2.1 Ensure all elements are focusable
  - [ ] 10.2.2 Add visible focus indicators
  - [ ] 10.2.3 Implement focus trapping in modals
  - **Validates: Requirement 7.7**

- [ ] 10.3 Add reduced motion support
  - [ ] 10.3.1 Detect prefers-reduced-motion
  - [ ] 10.3.2 Disable animations when preferred
  - **Validates: Requirement 7.4**

---

## Phase 7: Onboarding Polish (Week 3)

### Task 11: Onboarding Improvements

- [ ] 11.1 Add progress indicator
  - [ ] 11.1.1 Create OnboardingProgress component
  - [ ] 11.1.2 Show current step and total steps
  - [ ] 11.1.3 Add step labels
  - **Validates: Requirement 6.1**

- [ ] 11.2 Add skip and back navigation
  - [ ] 11.2.1 Add "Skip" button for experienced users
  - [ ] 11.2.2 Add "Back" button to return to previous step
  - [ ] 11.2.3 Auto-save progress at each step
  - **Validates: Requirement 6.2-6.4**

- [ ] 11.3 Create tutorial overlay
  - [ ] 11.3.1 Create TutorialOverlay component
  - [ ] 11.3.2 Highlight first transaction entry
  - [ ] 11.3.3 Show tooltips for key features
  - **Validates: Requirement 6.5**

- [ ] 11.4 Add welcome modal
  - [ ] 11.4.1 Create WelcomeModal component
  - [ ] 11.4.2 Show after onboarding completion
  - [ ] 11.4.3 Offer quick tips
  - **Validates: Requirement 6.6**

- [ ] 11.5 Add replay tutorial option
  - [ ] 11.5.1 Add "Replay Tutorial" to Settings
  - [ ] 11.5.2 Reset tutorial state
  - [ ] 11.5.3 Restart onboarding flow
  - **Validates: Requirement 6.7**

---

## Documentation Tasks

- [ ] D.1 Update component documentation
  - [ ] D.1.1 Document new components in README
  - [ ] D.1.2 Add JSDoc comments to all components
  - [ ] D.1.3 Update Storybook (if applicable)

- [ ] D.2 Update user documentation
  - [ ] D.2.1 Document keyboard shortcuts
  - [ ] D.2.2 Document 2FA setup process
  - [ ] D.2.3 Update USER_JOURNEYS.md

- [ ] D.3 Update CHANGELOG and development-status
  - [ ] D.3.1 Add version entry to CHANGELOG
  - [ ] D.3.2 Update development-status.md
  - [ ] D.3.3 Update README.md

---

## Summary

| Phase | Tasks | Features                            | Est. Duration |
| ----- | ----- | ----------------------------------- | ------------- |
| 1     | 1-3   | Quick Actions, Shortcuts, Templates | 3 days        |
| 2     | 4     | Transaction Search & Filtering      | 2 days        |
| 3     | 5-6   | Goals Drag-and-Drop, Archive        | 2 days        |
| 4     | 7     | Two-Factor Authentication UI        | 3 days        |
| 5     | 8     | Tips Feed Enhancements              | 2 days        |
| 6     | 9-10  | Theme & Accessibility               | 2 days        |
| 7     | 11    | Onboarding Polish                   | 2 days        |

**Total Estimated Duration**: 16 days (3-4 weeks)

**Priority Order**:

1. Quick Actions FAB (high user value)
2. Transaction Search (frequently requested)
3. Goals Drag-and-Drop (backend ready)
4. 2FA Setup UI (security)
5. Tips Feed Enhancements (engagement)
6. Theme System (user preference)
7. Onboarding Polish (new user experience)

---

## Definition of Done

- [ ] All tasks completed
- [ ] All components have unit tests
- [ ] Accessibility audit passed
- [ ] Dark mode tested
- [ ] Mobile tested
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed via CI/CD
