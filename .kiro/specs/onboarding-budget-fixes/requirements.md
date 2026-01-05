# Requirements Document

## Introduction

This specification addresses critical issues in the BudgetBuddy onboarding and budget management system that are preventing users from completing the onboarding flow successfully and accessing their budgets.

## Glossary

- **Onboarding_Service**: The authentication service endpoint that handles onboarding completion
- **Budget_Service**: The service that manages budget CRUD operations
- **Frontend_App**: The React web application that users interact with
- **Month_String**: Date format YYYY-MM representing a calendar month
- **Logout_Function**: User authentication termination functionality

## Requirements

### Requirement 1: Fix Onboarding Budget Creation Month Mismatch

**User Story:** As a user completing onboarding, I want my budget to be created for the correct month I'm viewing, so that I can immediately see and use my budget after onboarding.

#### Acceptance Criteria

1. WHEN a user completes onboarding with currentMonth "2026-01", THE Onboarding_Service SHALL create a budget with month field "2026-01"
2. WHEN the Frontend_App sends currentMonth parameter, THE Onboarding_Service SHALL use that exact value without modification
3. WHEN a budget is created during onboarding, THE Budget_Service SHALL store it with the month field matching the frontend request
4. WHEN a user navigates to the budget page after onboarding, THE Frontend_App SHALL find and display the budget for the current month
5. IF there is any date/month manipulation in the backend, THEN THE Onboarding_Service SHALL log the transformation for debugging

### Requirement 2: Add User Logout Functionality

**User Story:** As a logged-in user, I want to be able to log out of the application, so that I can secure my account and switch users if needed.

#### Acceptance Criteria

1. WHEN a user is on the budget page, THE Frontend_App SHALL display a logout button or menu option
2. WHEN a user clicks the logout option, THE Frontend_App SHALL clear all authentication tokens
3. WHEN logout is triggered, THE Frontend_App SHALL redirect the user to the login page
4. WHEN a user logs out, THE Frontend_App SHALL clear any cached user data from local storage
5. THE logout functionality SHALL be accessible from all authenticated pages

### Requirement 3: Improve Onboarding Error Handling and Debugging

**User Story:** As a developer, I want comprehensive logging and error handling in the onboarding flow, so that I can quickly identify and fix issues when they occur.

#### Acceptance Criteria

1. WHEN the onboarding endpoint receives a request, THE Onboarding_Service SHALL log the complete request body with month verification
2. WHEN creating a budget during onboarding, THE Onboarding_Service SHALL log the exact budget object being saved
3. WHEN a budget creation fails, THE Onboarding_Service SHALL return a descriptive error message to the frontend
4. WHEN the frontend receives an onboarding error, THE Frontend_App SHALL display the specific error to the user
5. IF onboarding appears successful but budget is not found, THE Frontend_App SHALL provide actionable error messages

### Requirement 4: Validate Month Consistency Across Services

**User Story:** As a system administrator, I want to ensure month values remain consistent between frontend and backend services, so that budget operations work reliably.

#### Acceptance Criteria

1. WHEN the Frontend_App calculates the current month, THE system SHALL use timezone-aware calculations
2. WHEN passing month values between services, THE system SHALL maintain exact string format without conversion
3. WHEN storing budgets in the database, THE Budget_Service SHALL preserve the original month string format
4. WHEN retrieving budgets, THE Budget_Service SHALL return month values in the same format they were stored
5. THE system SHALL validate that month strings follow YYYY-MM format before processing

### Requirement 5: Fix Budget Page Empty State Handling

**User Story:** As a user who has completed onboarding, I want to see my budget immediately on the budget page, so that I can start managing my finances without confusion.

#### Acceptance Criteria

1. WHEN a user navigates to the budget page after completing onboarding, THE Frontend_App SHALL find and display their budget
2. WHEN no budget exists for the current month but onboarding was completed, THE Frontend_App SHALL provide clear guidance
3. WHEN budget loading fails, THE Frontend_App SHALL display specific error messages with suggested actions
4. WHEN a user has budgets for other months but not the current month, THE Frontend_App SHALL offer to copy from previous month
5. THE budget page SHALL never show "No budget found" immediately after successful onboarding completion
