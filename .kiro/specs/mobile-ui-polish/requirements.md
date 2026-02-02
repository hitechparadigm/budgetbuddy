# Mobile UI Polish - Requirements

**Last Updated**: 2026-02-02
**Status**: Ready for Implementation
**Parent Spec**: `.kiro/specs/ui-polish-enhancements/`

## Overview

This spec covers the remaining mobile-specific UI polish tasks from the parent UI Polish spec. All web implementations are complete; these tasks focus on bringing feature parity to the React Native mobile app.

## Background

The web application has implemented:

- Quick Actions FAB with animations
- Keyboard shortcuts system
- Transaction templates
- Transaction search and filtering
- Goals drag-and-drop reordering
- Two-Factor Authentication UI
- Tips feed enhancements with read/unread indicators
- Theme system (light/dark/system)
- Accessibility improvements
- Onboarding polish with tutorial overlay

The mobile app needs equivalent implementations adapted for native mobile UX patterns.

---

## Requirement 1: Mobile Quick Actions FAB

### User Story

_"As a mobile user, I want quick access to common actions via a floating action button so I can add transactions and scan receipts with minimal taps."_

### Acceptance Criteria

1.1 **FAB Component**

- [ ] FAB displays in bottom-right corner of main screens
- [ ] FAB expands on tap to show action menu
- [ ] FAB collapses when tapping outside or selecting action
- [ ] FAB has smooth animation (spring physics)

  1.2 **Quick Actions**

- [ ] "Add Transaction" action opens transaction form
- [ ] "Scan Receipt" action opens camera for receipt scanning
- [ ] "View Budget" action navigates to budget screen
- [ ] Actions have icons and labels

  1.3 **Haptic Feedback**

- [ ] Light haptic on FAB tap
- [ ] Medium haptic on action selection
- [ ] Haptic feedback respects system settings

  1.4 **Accessibility**

- [ ] FAB has accessible label "Quick Actions"
- [ ] Each action has accessible label
- [ ] Supports VoiceOver/TalkBack navigation

---

## Requirement 2: Mobile Transaction Templates

### User Story

_"As a mobile user, I want to save and reuse transaction templates so I can quickly add recurring expenses like coffee or gas."_

### Acceptance Criteria

2.1 **Template Storage**

- [ ] Templates stored in AsyncStorage
- [ ] Maximum 10 templates per user
- [ ] Templates persist across app restarts

  2.2 **Template Creation**

- [ ] "Save as Template" option in transaction form
- [ ] Template includes: description, amount, category
- [ ] Template name is editable

  2.3 **Template Usage**

- [ ] Templates shown in quick add flow
- [ ] Tap template to pre-fill transaction form
- [ ] Recent categories shown as suggestions

  2.4 **Template Management**

- [ ] View all templates in settings
- [ ] Delete individual templates
- [ ] Edit existing templates

---

## Requirement 3: Mobile Search and Filters

### User Story

_"As a mobile user, I want to search and filter my transactions so I can find specific purchases or analyze spending patterns."_

### Acceptance Criteria

3.1 **Search Bar**

- [ ] Search bar at top of transactions screen
- [ ] Debounced search (300ms delay)
- [ ] Clear button to reset search
- [ ] Search by description, merchant, or amount

  3.2 **Filter Sheet**

- [ ] Bottom sheet with filter options
- [ ] Category filter (multi-select)
- [ ] Date range picker
- [ ] Amount range inputs
- [ ] Transaction type toggle (income/expense)

  3.3 **Filter Persistence**

- [ ] Filters persist during session
- [ ] Clear all filters button
- [ ] Active filter count badge on filter button

  3.4 **Results Display**

- [ ] Filtered results update in real-time
- [ ] Empty state when no results match
- [ ] Result count displayed

---

## Requirement 4: Mobile Goal Reordering

### User Story

_"As a mobile user, I want to reorder my savings goals by priority so I can focus on what matters most."_

### Acceptance Criteria

4.1 **Long-Press to Reorder**

- [ ] Long-press on goal card initiates drag mode
- [ ] Visual feedback when drag mode active (scale, shadow)
- [ ] Drag handle icon visible in drag mode

  4.2 **Drag Interaction**

- [ ] Smooth drag following finger position
- [ ] Other goals animate to make space
- [ ] Drop zone indicators

  4.3 **Haptic Feedback**

- [ ] Medium haptic on drag start
- [ ] Light haptic when passing other items
- [ ] Success haptic on drop

  4.4 **Persistence**

- [ ] New order saved to backend on drop
- [ ] Optimistic update with rollback on error
- [ ] Loading indicator during save

---

## Requirement 5: Mobile Two-Factor Authentication

### User Story

_"As a mobile user, I want to set up and use two-factor authentication so my account is more secure."_

### Acceptance Criteria

5.1 **2FA Setup Screen**

- [ ] Step-by-step wizard (intro → QR → verify → backup)
- [ ] QR code display for authenticator app
- [ ] Manual entry code option
- [ ] Backup codes display with copy button

  5.2 **2FA Verification Screen**

- [ ] 6-digit code input with auto-focus
- [ ] Auto-submit when 6 digits entered
- [ ] Error handling with retry option
- [ ] "Use backup code" option

  5.3 **Login Flow Integration**

- [ ] Detect MFA challenge from Cognito
- [ ] Show 2FA verification screen on challenge
- [ ] Complete authentication after successful verify

  5.4 **Settings Integration**

- [ ] 2FA section in settings screen
- [ ] Enable/disable toggle
- [ ] Status indicator (enabled/disabled)
- [ ] "View backup codes" option

---

## Requirement 6: Mobile Tips Feed Gestures

### User Story

_"As a mobile user, I want to swipe through tips and save favorites so I can quickly consume financial advice."_

### Acceptance Criteria

6.1 **Swipeable Tip Cards**

- [ ] Swipe left to save tip
- [ ] Swipe right to dismiss tip
- [ ] Visual indicators during swipe (icons, colors)
- [ ] Snap back if swipe not completed

  6.2 **Swipe Feedback**

- [ ] Haptic feedback on swipe threshold
- [ ] Animation on successful swipe
- [ ] Undo toast for dismiss action

  6.3 **Pull-to-Refresh**

- [ ] Pull down to refresh tips feed
- [ ] Loading indicator during refresh
- [ ] Haptic feedback on refresh trigger
- [ ] New tips appear at top

  6.4 **Read/Unread State**

- [ ] Unread badge on new tips
- [ ] Mark as read on view (3 seconds)
- [ ] Unread count in tab badge

---

## Non-Functional Requirements

### Performance

- All animations at 60fps
- Gesture response < 16ms
- AsyncStorage operations < 100ms

### Accessibility

- All components support VoiceOver/TalkBack
- Minimum touch target 44x44 points
- Sufficient color contrast (4.5:1)

### Platform Support

- iOS 13+
- Android 10+
- Expo SDK 50+

---

## Dependencies

- React Native Reanimated (animations)
- React Native Gesture Handler (gestures)
- Expo Haptics (haptic feedback)
- AsyncStorage (local storage)
- Existing mobile components and services

---

## Out of Scope

- Web implementations (already complete)
- Backend changes (APIs already exist)
- New features not in parent spec
