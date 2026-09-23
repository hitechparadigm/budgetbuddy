# Requirements: Mobile App (React Native + Expo)

## Introduction

BudgetBuddy mobile app for iOS and Android. Design informed by competitive analysis of Budge and Budgety apps (`docs/mobile-ux-design.md`). Shares the same 4 backend APIs as the web app.

## Requirements

### Requirement 1: Core Navigation

**User Story:** As a mobile user, I want intuitive bottom tab navigation, so that I can quickly access key features.

#### Acceptance Criteria

1. THE app SHALL use a bottom tab bar with 4 tabs: Budget, Transactions, Goals, More.
2. THE app SHALL use React Navigation v6 with native stacks per tab.
3. WHEN the user is not authenticated, THE app SHALL redirect to the Auth flow.

### Requirement 2: Budget Screen

**User Story:** As a mobile user, I want to view and manage my budget on my phone, so that I can track finances on the go.

#### Acceptance Criteria

1. THE budget screen SHALL show income, savings, and expense groups with planned vs. spent amounts.
2. THE user SHALL be able to add a transaction from a prominent floating action button.
3. THE budget screen SHALL support month navigation.
4. WHEN a category is over-budget, THE system SHALL highlight it visually (red tint).
5. THE budget screen SHALL load cached data instantly and refresh from the API in the background.

### Requirement 3: Quick Transaction Entry

**User Story:** As a mobile user, I want to add transactions in under 5 seconds, so that I can capture spending immediately.

#### Acceptance Criteria

1. THE transaction entry form SHALL be accessible via a FAB on budget and transactions screens.
2. THE form SHALL pre-fill today's date and remember the last-used category.
3. THE user SHALL enter amount, category, description, and date.
4. WHEN submitted, THE transaction SHALL appear immediately (optimistic update).

### Requirement 4: Offline Support

**User Story:** As a mobile user, I want the app to work without internet, so that I can track spending anywhere.

#### Acceptance Criteria

1. THE app SHALL store budget and transaction data locally using SQLite.
2. WHEN internet is restored, THE app SHALL sync local changes to the backend automatically.
3. WHEN a sync conflict occurs, THE app SHALL prefer server version and notify the user.

### Requirement 5: Goals Screen

**User Story:** As a mobile user, I want to view and update financial goals, so that I can track progress on the go.

#### Acceptance Criteria

1. THE goals screen SHALL display goals with progress rings and amounts.
2. THE user SHALL be able to add a contribution.
3. Goals SHALL show Goals, Borrowed, and Lent tabs (matching web app).

### Requirement 6: Onboarding

**User Story:** As a new mobile user, I want a guided setup, so that I can start budgeting quickly.

#### Acceptance Criteria

1. THE onboarding SHALL cover: account creation/sign-in, budget type selection, AI budget generation.
2. THE AI generation step SHALL show a progress animation.
3. WHEN complete, THE user SHALL land on the Budget screen.

### Requirement 7: Authentication

**User Story:** As a mobile user, I want to sign in with email or Google, so that my data syncs with the web app.

#### Acceptance Criteria

1. THE app SHALL support Cognito email/password and Google OAuth (PKCE via Expo AuthSession).
2. THE app SHALL store tokens in Expo SecureStore (hardware-backed where available).
3. WHEN the access token expires, THE app SHALL silently refresh using the refresh token.

### Requirement 8: Push Notifications (Tier 2)

**User Story:** As a mobile user, I want push notifications for bills and budget alerts.

#### Acceptance Criteria

1. THE app SHALL request push permission during onboarding (optional, dismissable).
2. WHEN a bill is due within 3 days, THE system SHALL send a push notification.
3. WHEN spending exceeds 90% of a category budget, THE system SHALL send an alert.
