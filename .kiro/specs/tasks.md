# Implementation Plan: Critical Bug Fixes

## Overview

This implementation plan focuses on fixing the critical bugs that are preventing users from using the application properly. Based on user reports and the current state of the system, we need to immediately address:

1. **Missing Logout Functionality** - Users cannot log out of the application
2. **Onboarding Profile Creation Issues** - New users getting stuck without proper profiles
3. **Budget Access Issues** - Users unable to access their budgets after onboarding

These are production-critical issues that must be fixed immediately.

## Tasks

### Critical Bug Fixes (Immediate Priority)

- [x] 1. Fix Critical Onboarding Budget Persistence Bug

  - **Issue**: Budget created during onboarding but not retrievable afterward
  - **Symptom**: User completes onboarding successfully, but budget page shows "No budgets exist in backend"
  - **Root Cause**: Field name mismatch between onboarding endpoint and budget service
    - Onboarding endpoint used `planned` and `actual` fields
    - Budget service expected `plannedAmount` and `spentAmount` fields
    - Missing required fields: `transactions` array and `order` field
  - **Solution Implemented**:
    - Fixed field names to match budget service expectations (`plannedAmount`, `spentAmount`)
    - Added missing `transactions` array and `order` field to category structure
    - Added comprehensive error handling around budget creation
    - Added immediate verification step to confirm budget was saved to DynamoDB
    - Added detailed logging to debug budget creation process
  - **Status**: FIXED - Deployed and ready for testing
  - _Requirements: 42.1, 42.2, 42.4_

- [x] 2. Add Missing Logout Functionality

  - **Issue**: Users report "there is no way to log out of this screen at all"
  - **Current State**: Logout function exists but no visible UI button
  - Add logout button to budget page header
  - Add logout option to sidebar navigation
  - Ensure logout clears all tokens and redirects to login
  - Test logout functionality across all pages
  - _Requirements: 43.1, 43.2, 43.3_

- [x] 3. Fix User Profile Creation Issues

  - **Issue**: New users getting 404 "User profile not found" errors
  - **Root Cause**: Token parsing issues - some users have tokens missing `custom:userId` or `sub` fields
  - **Solution Implemented**:
    - Created `parseUserFromIdToken` function in AuthContext to handle token parsing gracefully
    - Added token validation utilities in `packages/web-app/src/utils/tokenUtils.ts`
    - Created TokenDiagnostics component for users to self-diagnose token issues
    - Added token diagnostics tool to Settings page
  - **Status**: FIXED - Frontend improvements deployed and working
  - _Requirements: 17.1, 17.2, 17.3_

- [x] 4. **CRITICAL SECURITY ALERT** - Remove Exposed Secrets
  - **Issue**: GitGuardian detected exposed Bearer Token and Company Email Password in repository
  - **Repository**: hitechparadigm/budgetbuddy
  - **Date**: January 5th 2026, 03:31:30 UTC
  - **Solution Implemented**:
    - ✅ Removed `auth-logs.txt` file containing real JWT tokens
    - ✅ Updated `.gitignore` to prevent future exposure of sensitive files
    - ✅ Replaced hardcoded passwords with environment variables in test scripts
    - ✅ Updated mock tokens to be clearly marked as development-only
    - ✅ Created comprehensive security validation script (`scripts/security-check.sh`)
    - ✅ Added automated security checks to CI/CD pipelines (PR and deployment)
    - ✅ Created pre-commit security hook for developers
    - ✅ Updated `SECURITY.md` with comprehensive security guidelines
    - ✅ Added security validation npm scripts (`security:check`, `pre-deploy`)
  - **Status**: FIXED - All exposed secrets removed, comprehensive security measures implemented
  - _Requirements: Security compliance, data protection_

### Secondary Fixes (After Critical Issues)

- [ ] 4. Improve Error Handling and User Feedback

  - Add better error messages for onboarding failures
  - Preserve user input when errors occur
  - Add retry mechanisms for failed operations
  - Provide clear guidance when things go wrong
  - _Requirements: 44.1, 44.2, 44.3_

- [ ] 5. Add Month Consistency Validation
  - Add validation for month format consistency
  - Enhance debugging for month-related issues
  - Add timezone-aware month calculations
  - Provide admin tools for month debugging
  - _Requirements: 45.1, 45.2, 45.3_

## Notes

- Tasks marked with `*` are property-based tests that validate correctness properties
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Focus on mobile-first development while maintaining web app functionality
- Property tests validate universal correctness across platforms
- 2-week timeline requires parallel development of mobile and enhanced web features

## Success Criteria

- Native iOS and Android apps deployed to app stores
- Full offline capability with reliable sync
- Device-level security integration and enhanced security
- Google Sign-In integration for easy access
- AI-powered onboarding with location-based suggestions
- Bank account integration with AI transaction categorization
- Calendar view for expense visualization
- AI-powered insights and spending analytics
- Comprehensive data export and backup functionality
- Multi-currency support for global users
- Push notifications and budget alerts
- Freemium business model with subscription handling
- Feature parity between web and mobile platforms (95%+)
- Admin dashboard and user management system with role-based access control
- Support ticket management and customer service tools
- System monitoring, metrics, and real-time alerts
- Audit logging and security compliance features
- All property-based tests passing with 100+ iterations
- App store approval and public availability
