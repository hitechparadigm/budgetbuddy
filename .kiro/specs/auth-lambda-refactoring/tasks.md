# Implementation Plan: Auth Lambda Refactoring

## Overview

This implementation plan refactors the monolithic 1484-line authentication Lambda function into six separate, focused Lambda functions. The refactoring prevents recurring bugs, improves maintainability, and enables independent deployment.

**Timeline**: 3 weeks (1 week preparation, 1 week migration, 1 week cleanup)
**Priority**: High - Prevents recurring production bugs
**Risk**: Medium - Requires careful migration strategy

## Tasks

### Phase 1: Shared Utilities Layer (Week 1)

- [x] 1. Create shared utilities package structure

  - Create `backend/layers/shared/nodejs/shared/` directory
  - Create package.json with dependencies
  - Set up build and deployment scripts
  - _Requirements: 2.1, 2.7_

- [x] 2. Implement CORS utilities

  - [x] 2.1 Extract getCorsHeaders function from monolithic Lambda

    - Copy function to `shared/cors.js`
    - Add unit tests for CORS header generation
    - Test with all allowed origins
    - _Requirements: 2.2_

  - [x] 2.2 Add CORS preflight handler
    - Create handleCorsPreflightfunction
    - Add unit tests for OPTIONS requests
    - _Requirements: 2.2_

- [x] 3. Implement token parsing utilities

  - [x] 3.1 Extract parseAuthToken function

    - Copy function to `shared/token-parser.js`
    - Add unit tests for JWT parsing
    - Test with valid and invalid tokens
    - _Requirements: 2.3_

  - [x] 3.2 Extract parseIdToken function

    - Copy function to `shared/token-parser.js`
    - Add unit tests for ID token parsing
    - _Requirements: 2.3_

  - [x] 3.3 Extract parseGoogleToken function
    - Copy function to `shared/token-parser.js`
    - Add unit tests for Google token parsing
    - _Requirements: 2.3_

- [x] 4. Implement validation utilities

  - [x] 4.1 Extract validateEmail function

    - Copy function to `shared/validators.js`
    - Add unit tests for email validation
    - _Requirements: 2.4_

  - [x] 4.2 Extract validatePassword function

    - Copy function to `shared/validators.js`
    - Add unit tests for password validation
    - _Requirements: 2.4_

  - [x] 4.3 Create validateOnboardingInput function
    - Extract validation logic from onboarding endpoint
    - Add unit tests for onboarding validation
    - _Requirements: 2.4_

- [x] 5. Implement error handling utilities

  - [x] 5.1 Create formatErrorResponse function

    - Standardize error response format
    - Add unit tests for error formatting
    - _Requirements: 2.5_

  - [x] 5.2 Create error classes
    - ValidationError, AuthenticationError, NotFoundError
    - Add unit tests for error classes
    - _Requirements: 2.5_

- [x] 6. Deploy shared utilities layer
  - Create CloudFormation template for Lambda Layer
  - Deploy layer to AWS
  - Verify layer is accessible from Lambda functions
  - _Requirements: 2.7, 2.8_

### Phase 2: Create New Lambda Functions (Week 1)

- [-] 7. Create auth-register Lambda

  - [-] 7.1 Create function structure

    - Create `backend/functions/auth-register/` directory
    - Create index.js with handler function
    - Add package.json with dependencies
    - _Requirements: 1.1, 1.7_

  - [ ] 7.2 Implement registration logic

    - Extract registration code from monolithic Lambda
    - Use shared utilities for validation and CORS
    - Ensure imports are at top of file
    - _Requirements: 1.1, 1.9_

  - [ ] 7.3 Add unit tests

    - Test successful registration
    - Test validation errors
    - Test duplicate user error
    - _Requirements: 4.1, 4.4_

  - [ ] 7.4 Create CloudFormation stack
    - Define Lambda function resource
    - Define IAM role with minimal permissions
    - Define CloudWatch log group
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 8. Create auth-login Lambda

  - [ ] 8.1 Create function structure

    - Create `backend/functions/auth-login/` directory
    - Create index.js with handler function
    - Add package.json with dependencies
    - _Requirements: 1.2, 1.7_

  - [ ] 8.2 Implement login logic

    - Extract login code from monolithic Lambda
    - Use shared utilities for validation and CORS
    - Ensure imports are at top of file
    - _Requirements: 1.2, 1.9_

  - [ ] 8.3 Add unit tests

    - Test successful login
    - Test invalid credentials
    - Test validation errors
    - _Requirements: 4.1, 4.4_

  - [ ] 8.4 Create CloudFormation stack
    - Define Lambda function resource
    - Define IAM role with minimal permissions
    - Define CloudWatch log group
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 9. Create auth-google Lambda

  - [ ] 9.1 Create function structure

    - Create `backend/functions/auth-google/` directory
    - Create index.js with handler function
    - Add package.json with dependencies
    - _Requirements: 1.3, 1.7_

  - [ ] 9.2 Implement Google Sign-In logic

    - Extract Google auth code from monolithic Lambda
    - Use shared utilities for token parsing and CORS
    - Ensure imports are at top of file
    - _Requirements: 1.3, 1.9_

  - [ ] 9.3 Add unit tests

    - Test successful Google Sign-In
    - Test new user creation
    - Test existing user login
    - _Requirements: 4.1, 4.4_

  - [ ] 9.4 Create CloudFormation stack
    - Define Lambda function resource
    - Define IAM role with minimal permissions
    - Define CloudWatch log group
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 10. Create auth-profile Lambda

  - [ ] 10.1 Create function structure

    - Create `backend/functions/auth-profile/` directory
    - Create index.js with handler function
    - Add package.json with dependencies
    - _Requirements: 1.4, 1.7_

  - [ ] 10.2 Implement profile retrieval logic

    - Extract profile code from monolithic Lambda
    - Use shared utilities for token parsing and CORS
    - Ensure imports are at top of file
    - _Requirements: 1.4, 1.9_

  - [ ] 10.3 Add unit tests

    - Test successful profile retrieval
    - Test unauthorized access
    - Test profile not found
    - _Requirements: 4.1, 4.4_

  - [ ] 10.4 Create CloudFormation stack
    - Define Lambda function resource
    - Define IAM role with minimal permissions
    - Define CloudWatch log group
    - _Requirements: 3.3, 3.4, 3.5_

- [x] 11. Create auth-onboarding Lambda ⭐

  - [x] 11.1 Create function structure

    - Create `backend/functions/auth-onboarding/` directory
    - Create index.js with handler function
    - Add package.json with dependencies
    - _Requirements: 1.5, 1.7_

  - [x] 11.2 Implement onboarding logic

    - Extract onboarding code from monolithic Lambda
    - Use shared utilities for validation and CORS
    - **CRITICAL**: Ensure dynamoHelpers and FamilyIdResolver imports are at top of file
    - _Requirements: 1.5, 1.9, 1.10_

  - [x] 11.3 Add unit tests

    - Test successful onboarding
    - Test budget creation
    - Test validation errors
    - Test import availability (prevent ReferenceError)
    - _Requirements: 4.1, 4.4_

  - [x] 11.4 Create CloudFormation stack
    - Define Lambda function resource
    - Define IAM role with minimal permissions
    - Define CloudWatch log group
    - **⚠️ STATUS**: CDK stack created but NOT deployed to AWS yet
    - **🚨 ACTION REQUIRED**: Run `cdk deploy budgetbuddy-dev-auth-onboarding`
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 12. Create auth-geolocation Lambda

  - [ ] 12.1 Create function structure

    - Create `backend/functions/auth-geolocation/` directory
    - Create index.js with handler function
    - Add package.json with dependencies
    - _Requirements: 1.6, 1.7_

  - [ ] 12.2 Implement geolocation logic

    - Extract geolocation code from monolithic Lambda
    - Use shared utilities for CORS
    - Ensure imports are at top of file
    - _Requirements: 1.6, 1.9_

  - [ ] 12.3 Add unit tests

    - Test successful geolocation
    - Test API failure handling
    - _Requirements: 4.1, 4.4_

  - [ ] 12.4 Create CloudFormation stack
    - Define Lambda function resource
    - Define IAM role with minimal permissions
    - Define CloudWatch log group
    - _Requirements: 3.3, 3.4, 3.5_

### Phase 3: Monitoring and Observability (Week 1)

- [ ] 13. Create CloudWatch dashboards

  - Create dashboard showing all Lambda metrics
  - Add widgets for invocations, errors, duration, throttles
  - Add widgets for cold starts
  - _Requirements: 6.5_

- [ ] 14. Create CloudWatch alarms

  - [ ] 14.1 Create error rate alarms

    - Alarm when error rate > 5% for 5 minutes
    - Send SNS notification
    - _Requirements: 6.2_

  - [ ] 14.2 Create latency alarms

    - Alarm when p99 latency > 1 second for 5 minutes
    - Send SNS notification
    - _Requirements: 6.3_

  - [ ] 14.3 Create throttling alarms
    - Alarm when throttles > 0 for 5 minutes
    - Send SNS notification
    - _Requirements: 6.4_

- [ ] 15. Implement structured logging
  - Add request ID to all log statements
  - Add user ID to all log statements
  - Add endpoint name to all log statements
  - _Requirements: 6.6, 6.7, 6.8, 6.9_

### Phase 4: API Gateway Integration (Week 2)

- [ ] 16. Update API Gateway routes

  - [ ] 16.1 Create new routes for new Lambdas

    - /auth/register → auth-register Lambda
    - /auth/login → auth-login Lambda
    - /auth/google → auth-google Lambda
    - /auth/profile → auth-profile Lambda
    - /auth/onboarding → auth-onboarding Lambda
    - /auth/geolocation → auth-geolocation Lambda
    - _Requirements: 3.6_

  - [ ] 16.2 Add feature flags for gradual rollout
    - Create Lambda@Edge function for routing
    - Route 10% of traffic to new Lambdas initially
    - _Requirements: 5.2, 5.3_

- [ ] 17. Deploy API Gateway changes
  - Deploy to staging environment
  - Test all endpoints
  - Deploy to production
  - _Requirements: 3.6_

### Phase 5: Migration and Testing (Week 2)

- [ ] 18. Property-based testing

  - [ ] 18.1 Test API contract consistency

    - Generate random valid inputs
    - Compare old and new Lambda responses
    - Ensure 100% match
    - _Requirements: 4.1, 4.6_

  - [ ] 18.2 Test error handling consistency
    - Generate random invalid inputs
    - Compare old and new Lambda error responses
    - Ensure 100% match
    - _Requirements: 4.1, 4.9_

- [ ] 19. Integration testing

  - [ ] 19.1 Test registration → login flow

    - Register new user
    - Login with credentials
    - Verify tokens
    - _Requirements: 4.1_

  - [ ] 19.2 Test registration → onboarding flow

    - Register new user
    - Complete onboarding
    - Verify budget creation
    - _Requirements: 4.1_

  - [ ] 19.3 Test Google Sign-In flow
    - Sign in with Google
    - Verify user creation
    - Verify tokens
    - _Requirements: 4.1_

- [ ] 20. Gradual rollout

  - [ ] 20.1 Route 10% of traffic to new Lambdas

    - Update feature flag
    - Monitor error rates and latency
    - Wait 24 hours
    - _Requirements: 5.3, 5.5_

  - [ ] 20.2 Route 25% of traffic to new Lambdas

    - Update feature flag
    - Monitor error rates and latency
    - Wait 24 hours
    - _Requirements: 5.4_

  - [ ] 20.3 Route 50% of traffic to new Lambdas

    - Update feature flag
    - Monitor error rates and latency
    - Wait 24 hours
    - _Requirements: 5.4_

  - [ ] 20.4 Route 75% of traffic to new Lambdas

    - Update feature flag
    - Monitor error rates and latency
    - Wait 24 hours
    - _Requirements: 5.4_

  - [ ] 20.5 Route 100% of traffic to new Lambdas
    - Update feature flag
    - Monitor error rates and latency
    - Wait 48 hours
    - _Requirements: 5.4, 5.10_

### Phase 6: Cleanup and Documentation (Week 3)

- [ ] 21. Remove old monolithic Lambda

  - Delete old Lambda function
  - Delete old CloudFormation stack
  - Remove feature flags
  - _Requirements: 5.10_

- [ ] 22. Update documentation

  - [ ] 22.1 Create README for each Lambda

    - Document purpose
    - Document inputs and outputs
    - Document error responses
    - Document deployment process
    - _Requirements: 9.1-9.7_

  - [ ] 22.2 Create architecture diagrams

    - Diagram showing all Lambda functions
    - Diagram showing shared utilities
    - Diagram showing API Gateway routing
    - _Requirements: 9.10_

  - [ ] 22.3 Update main README
    - Document new architecture
    - Document deployment process
    - Document rollback process
    - _Requirements: 9.1-9.9_

- [ ] 23. Add code quality checks

  - [ ] 23.1 Add ESLint rules

    - Add no-use-before-define rule
    - Add max-lines rule (300 lines)
    - Add max-file-lines rule (500 lines)
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ] 23.2 Add pre-commit hooks
    - Run ESLint on all Lambda functions
    - Run unit tests
    - Block commit if checks fail
    - _Requirements: 10.9, 10.10_

- [ ] 24. Performance optimization

  - [ ] 24.1 Optimize bundle sizes

    - Remove unused dependencies
    - Use webpack to bundle code
    - Measure cold start times
    - _Requirements: 7.1, 7.4_

  - [ ] 24.2 Configure provisioned concurrency

    - Enable for high-traffic endpoints (login, profile)
    - Monitor cost vs performance
    - _Requirements: 7.3_

  - [ ] 24.3 Optimize Lambda memory
    - Test with different memory settings
    - Find optimal memory for each Lambda
    - _Requirements: 7.9_

- [ ] 25. Final validation
  - Run full test suite
  - Verify all CloudWatch alarms are working
  - Verify all documentation is complete
  - Verify all code quality checks pass
  - _Requirements: All_

## Notes

- **Critical Path**: Shared utilities → New Lambdas → API Gateway → Gradual rollout
- **Risk Mitigation**: Feature flags enable instant rollback if issues occur
- **Testing**: Property-based tests ensure consistency with old implementation
- **Monitoring**: CloudWatch alarms catch issues before users are affected
- **Documentation**: Comprehensive docs ensure maintainability

## Success Criteria

- ✅ Each Lambda function is 100-300 lines (down from 1484 lines)
- ✅ Zero import ordering bugs after refactoring
- ✅ Deployment time reduced by 50%
- ✅ Test execution time reduced by 60%
- ✅ Cold start time reduced by 40%
- ✅ Independent deployment of endpoints achieved
- ✅ Zero production incidents during migration
- ✅ 100% test coverage maintained
- ✅ Documentation complete for all Lambda functions
- ✅ Developer satisfaction improved

This comprehensive refactoring plan addresses the root cause of recurring bugs and establishes a maintainable architecture for the authentication system.
