# Implementation Plan: AI-Powered Bill Reminders and Future Budget Planning

## Overview

This implementation plan breaks down the AI-powered bill reminders and budget planning feature into discrete, manageable tasks. The approach follows a layered architecture (handler → service → repository) and integrates with existing bills infrastructure. Each task builds incrementally, with testing integrated throughout to catch errors early.

## Tasks

- [x] 1. Set up infrastructure and data models
  - Create DynamoDB tables for patterns and budget suggestions
  - Create S3 bucket for pattern cache
  - Configure IAM roles for Bedrock access
  - Add CloudWatch alarms for monitoring
  - _Requirements: 8.2, 9.5_

- [ ] 2. Implement pattern detection repository layer
  - [x] 2.1 Create pattern-detection-repository.js
    - Implement getTransactionHistory() to query transactions by date range
    - Implement savePattern() to store detected patterns
    - Implement getPatternsByFamily() to retrieve patterns with status filtering
    - Implement updatePatternStatus() to update approval status
    - _Requirements: 1.1, 8.3_

  - [ ]\* 2.2 Write property test for authorization scoping
    - **Property 20: Authorization Scoping**
    - **Validates: Requirements 8.3**

  - [x]\* 2.3 Write unit tests for repository methods
    - Test DynamoDB query construction
    - Test error handling for failed queries
    - _Requirements: 1.1, 8.3_

- [ ] 3. Implement fuzzy matching algorithm
  - [x] 3.1 Create fuzzy-matching-utils.js
    - Implement Levenshtein distance calculation
    - Implement merchant name normalization (lowercase, remove special chars)
    - Implement fuzzyMatch() with 80% similarity threshold
    - _Requirements: 6.2_

  - [ ]\* 3.2 Write property test for fuzzy matching
    - **Property 5: Fuzzy Merchant Matching**
    - **Validates: Requirements 6.2**

  - [x]\* 3.3 Write unit tests for edge cases
    - Test with identical names
    - Test with completely different names
    - Test with minor variations (typos, abbreviations)
    - _Requirements: 6.2_

- [ ] 4. Implement pattern detection algorithm
  - [x] 4.1 Create pattern-detection-algorithm.js
    - Implement frequency detection (weekly, bi-weekly, monthly, quarterly, annual)
    - Implement date tolerance logic (±3 days)
    - Implement amount variance calculations (mean, median, stdDev)
    - Implement confidence scoring algorithm
    - Implement minimum occurrence threshold (3+)
    - _Requirements: 1.2, 1.5, 6.1, 6.3, 6.4_

  - [ ]\* 4.2 Write property test for frequency detection
    - **Property 2: Frequency Detection with Tolerance**
    - **Validates: Requirements 1.2, 6.3**

  - [ ]\* 4.3 Write property test for amount variance
    - **Property 3: Amount Variance Handling**
    - **Validates: Requirements 1.5, 6.4**

  - [ ]\* 4.4 Write property test for minimum occurrences
    - **Property 4: Minimum Occurrence Threshold**
    - **Validates: Requirements 6.1**

  - [x]\* 4.5 Write unit tests for confidence scoring
    - Test with perfect patterns (high confidence)
    - Test with irregular patterns (low confidence)
    - Test edge cases (exactly 3 occurrences, high variance)
    - _Requirements: 1.3, 1.6_

- [ ] 5. Implement AI prompt engineering
  - [x] 5.1 Create ai-prompt-builder.js
    - Implement buildPatternDetectionPrompt() with transaction data
    - Implement buildBudgetPlanningPrompt() with historical data
    - Include JSON schema in prompts
    - Include example outputs
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [ ]\* 5.2 Write property test for prompt completeness
    - **Property 25: Prompt Structure Completeness**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

  - [x]\* 5.3 Write unit tests for prompt validation
    - Test all required fields included
    - Test JSON schema formatting
    - Test example output formatting
    - _Requirements: 10.1, 10.2, 10.5_

- [ ] 6. Implement AWS Bedrock integration
  - [x] 6.1 Create bedrock-client.js
    - Implement callBedrock() with retry logic and exponential backoff
    - Implement response validation against JSON schema
    - Implement cost estimation and logging
    - Implement error handling for malformed responses
    - _Requirements: 9.3, 9.4, 9.5, 10.4_

  - [ ]\* 6.2 Write property test for error handling
    - **Property 23: Error Handling with Retry Logic**
    - **Validates: Requirements 9.3, 9.4**

  - [ ]\* 6.3 Write property test for cost monitoring
    - **Property 24: Cost Monitoring**
    - **Validates: Requirements 9.5**

  - [x]\* 6.4 Write unit tests for Bedrock client
    - Test successful API calls
    - Test retry logic with transient failures
    - Test error handling with permanent failures
    - Test response validation
    - _Requirements: 9.3, 9.4, 10.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement pattern detection service layer
  - [ ] 8.1 Create pattern-detection-service.js
    - Implement analyzeTransactions() orchestrating algorithm + AI
    - Implement getPatterns() with filtering
    - Implement updatePattern() for user edits
    - Implement approvePattern() triggering bill creation
    - Implement rejectPattern() marking as ignored
    - Integrate fuzzy matching, algorithm, and Bedrock client
    - _Requirements: 1.1, 1.7, 2.5, 2.6, 5.2, 5.4_

  - [ ]\* 8.2 Write property test for pattern output completeness
    - **Property 1: Pattern Detection Output Completeness**
    - **Validates: Requirements 1.3, 1.4, 1.7, 2.2**

  - [ ]\* 8.3 Write property test for high-confidence flagging
    - **Property 6: High-Confidence Pattern Flagging**
    - **Validates: Requirements 1.6, 10.6**

  - [ ]\* 8.4 Write property test for pattern status persistence
    - **Property 8: Pattern Status Persistence**
    - **Validates: Requirements 2.5, 5.6**

  - [ ]\* 8.5 Write property test for user edit preservation
    - **Property 9: User Edit Preservation**
    - **Validates: Requirements 2.6**

  - [ ]\* 8.6 Write property test for explanation presence
    - **Property 16: Explanation Presence**
    - **Validates: Requirements 5.5**

  - [ ]\* 8.7 Write unit tests for service methods
    - Test analyzeTransactions with various transaction sets
    - Test pattern approval flow
    - Test pattern rejection flow
    - Test pattern editing
    - _Requirements: 1.1, 2.5, 2.6, 5.2_

- [ ] 9. Implement pattern detection Lambda handler
  - [ ] 9.1 Create backend/functions/pattern-detection/index.js
    - Implement POST /api/patterns/detect handler
    - Implement GET /api/patterns handler
    - Implement PUT /api/patterns/{patternId} handler
    - Implement DELETE /api/patterns/{patternId} handler
    - Add authentication and authorization checks
    - Add input validation
    - Add error handling and logging
    - _Requirements: 1.1, 8.3, 8.6, 9.4_

  - [ ]\* 9.2 Write integration tests for pattern detection endpoints
    - Test end-to-end pattern detection flow
    - Test authorization enforcement
    - Test error responses
    - _Requirements: 1.1, 8.3_

- [ ] 10. Integrate with existing bills Lambda
  - [ ] 10.1 Update backend/functions/bills/index.js
    - Add aiGenerated, sourcePatternId, aiConfidenceScore fields to bill model
    - Implement createBillFromPattern() service method
    - Set reminder schedule (7 days, 3 days, due date)
    - Add duplicate detection logic
    - _Requirements: 2.3, 2.4, 2.7, 7.1, 7.6_

  - [ ]\* 10.2 Write property test for bill creation from pattern
    - **Property 7: Bill Reminder Creation from Pattern**
    - **Validates: Requirements 2.3, 2.4, 2.7**

  - [ ]\* 10.3 Write property test for AI metadata preservation
    - **Property 10: AI Metadata Preservation**
    - **Validates: Requirements 5.7, 7.4**

  - [ ]\* 10.4 Write property test for duplicate detection
    - **Property 19: Duplicate Bill Detection**
    - **Validates: Requirements 7.6**

  - [ ]\* 10.5 Write property test for integration compatibility
    - **Property 17: Integration with Existing Bills System**
    - **Validates: Requirements 7.1, 7.2**

  - [ ]\* 10.6 Write unit tests for bill creation
    - Test bill creation with AI metadata
    - Test reminder schedule calculation
    - Test duplicate detection
    - _Requirements: 2.3, 2.4, 7.6_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement budget planning service layer
  - [ ] 12.1 Create budget-planning-service.js
    - Implement generateSuggestions() analyzing bills and history
    - Implement bi-weekly frequency calculations
    - Implement seasonal adjustment logic
    - Implement confidence scoring for suggestions
    - Integrate with Bedrock for AI enhancement
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [ ]\* 12.2 Write property test for budget suggestion completeness
    - **Property 11: Budget Suggestion Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6**

  - [ ]\* 12.3 Write property test for budget intelligence
    - **Property 13: Budget Suggestion Intelligence**
    - **Validates: Requirements 4.3, 4.4**

  - [ ]\* 12.4 Write unit tests for budget planning
    - Test bi-weekly calculations (2 vs 3 occurrences)
    - Test seasonal adjustments
    - Test confidence scoring
    - _Requirements: 3.3, 3.6_

- [ ] 13. Implement budget planning Lambda handler
  - [ ] 13.1 Create backend/functions/budget-planning/index.js
    - Implement POST /api/budget/suggestions handler
    - Implement POST /api/budget/apply-suggestions handler
    - Add authentication and authorization
    - Add input validation
    - Add error handling
    - _Requirements: 3.1, 8.3_

  - [ ]\* 13.2 Write integration tests for budget planning endpoints
    - Test end-to-end suggestion generation
    - Test suggestion application
    - Test authorization
    - _Requirements: 3.1, 8.3_

- [ ] 14. Implement notification system integration
  - [ ] 14.1 Update notification service
    - Add PATTERN_DETECTED notification type
    - Add PATTERN_AMOUNT_CHANGED notification type
    - Add PATTERN_MISSING notification type
    - Add BUDGET_SUGGESTION_AVAILABLE notification type
    - Implement notification triggering logic
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]\* 14.2 Write property test for notification triggering
    - **Property 12: Notification Triggering Rules**
    - **Validates: Requirements 4.1, 4.2, 4.5, 4.6**

  - [ ]\* 14.3 Write unit tests for notifications
    - Test notification creation for each type
    - Test actionable options included
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

- [ ] 15. Implement manual pattern creation
  - [ ] 15.1 Add manual pattern creation to pattern detection service
    - Implement createManualPattern() from transaction
    - Prompt for frequency
    - Create bill reminder
    - _Requirements: 5.2_

  - [ ]\* 15.2 Write property test for manual pattern creation
    - **Property 14: Manual Pattern Creation**
    - **Validates: Requirements 5.2**

  - [ ]\* 15.3 Write unit tests for manual creation
    - Test pattern creation from transaction
    - Test bill reminder creation
    - _Requirements: 5.2_

- [ ] 16. Implement pattern edit propagation
  - [ ] 16.1 Add edit propagation logic
    - Implement updateAssociatedBill() when pattern edited
    - Preserve AI metadata during edits
    - _Requirements: 5.4, 7.4_

  - [ ]\* 16.2 Write property test for edit propagation
    - **Property 15: Pattern Edit Propagation**
    - **Validates: Requirements 5.4**

  - [ ]\* 16.3 Write unit tests for edit propagation
    - Test bill updates when pattern edited
    - Test metadata preservation
    - _Requirements: 5.4, 7.4_

- [ ] 17. Implement payment recording for learning
  - [ ] 17.1 Update bills service to record payments
    - Add payment recording logic
    - Store payment data for future pattern detection
    - _Requirements: 7.5_

  - [ ]\* 17.2 Write property test for payment recording
    - **Property 18: Payment Recording for Learning**
    - **Validates: Requirements 7.5**

  - [ ]\* 17.3 Write unit tests for payment recording
    - Test payment data storage
    - Test association with bill
    - _Requirements: 7.5_

- [ ] 18. Implement account deletion cleanup
  - [ ] 18.1 Add cleanup logic to account deletion
    - Delete all patterns for deleted family
    - Delete all budget suggestions for deleted family
    - _Requirements: 8.5_

  - [ ]\* 18.2 Write property test for deletion cleanup
    - **Property 21: Account Deletion Cleanup**
    - **Validates: Requirements 8.5**

  - [ ]\* 18.3 Write unit tests for cleanup
    - Test pattern deletion
    - Test suggestion deletion
    - _Requirements: 8.5_

- [ ] 19. Implement sensitive data logging protection
  - [ ] 19.1 Add logging sanitization
    - Implement sanitizeLogData() to remove sensitive fields
    - Apply to all log statements
    - _Requirements: 8.6_

  - [ ]\* 19.2 Write property test for logging protection
    - **Property 22: Sensitive Data Logging Protection**
    - **Validates: Requirements 8.6**

  - [ ]\* 19.3 Write unit tests for sanitization
    - Test sensitive data removal
    - Test log format
    - _Requirements: 8.6_

- [ ] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Update CDK infrastructure stack
  - [ ] 21.1 Update infrastructure/lib/api-features-stack.ts
    - Add pattern-detection Lambda function
    - Add budget-planning Lambda function
    - Add DynamoDB tables (patterns, budget-suggestions)
    - Add S3 bucket for pattern cache
    - Configure IAM roles for Bedrock access
    - Add API Gateway routes
    - Add CloudWatch alarms
    - _Requirements: 8.2, 9.5_

  - [ ]\* 21.2 Test CDK synthesis and deployment
    - Run cdk synth to validate
    - Deploy to dev environment
    - Verify resources created
    - _Requirements: 8.2_

- [ ] 22. Create frontend pattern review interface
  - [ ] 22.1 Create PatternReviewModal component
    - Display detected patterns with all metadata
    - Show confidence scores and explanations
    - Provide approve/reject/edit actions
    - Integrate with pattern detection API
    - _Requirements: 2.1, 2.2, 5.3, 5.5_

  - [ ]\* 22.2 Write component tests
    - Test pattern display
    - Test user actions
    - _Requirements: 2.1, 2.2_

- [ ] 23. Create frontend budget suggestion interface
  - [ ] 23.1 Create BudgetSuggestionsModal component
    - Display AI-generated suggestions
    - Show confidence scores and breakdowns
    - Provide approve/reject/modify actions
    - Integrate with budget planning API
    - _Requirements: 3.7_

  - [ ]\* 23.2 Write component tests
    - Test suggestion display
    - Test user actions
    - _Requirements: 3.7_

- [ ] 24. Integrate notifications into UI
  - [ ] 24.1 Update NotificationCenter component
    - Add handlers for new notification types
    - Display pattern detection notifications
    - Display budget suggestion notifications
    - Provide action buttons
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]\* 24.2 Write component tests
    - Test notification display
    - Test action handling
    - _Requirements: 4.1, 4.2, 4.5_

- [ ] 25. Add manual pattern creation UI
  - [ ] 25.1 Add "Mark as Recurring" button to transactions
    - Add button to transaction list items
    - Create frequency selection modal
    - Integrate with manual pattern creation API
    - _Requirements: 5.1, 5.2_

  - [ ]\* 25.2 Write component tests
    - Test button display
    - Test modal interaction
    - _Requirements: 5.1, 5.2_

- [ ] 26. Update bills page to show AI metadata
  - [ ] 26.1 Update BillsPage component
    - Display AI-generated badge for AI bills
    - Show confidence scores
    - Distinguish AI vs manual bills
    - _Requirements: 5.7, 7.3_

  - [ ]\* 26.2 Write component tests
    - Test AI badge display
    - Test metadata display
    - _Requirements: 5.7_

- [ ] 27. Final checkpoint - End-to-end testing
  - [ ] 27.1 Test complete pattern detection flow
    - Create test transactions
    - Trigger pattern detection
    - Review and approve patterns
    - Verify bill reminders created
    - _Requirements: 1.1, 2.3, 2.4_

  - [ ] 27.2 Test complete budget planning flow
    - Create test bills and history
    - Generate budget suggestions
    - Review and apply suggestions
    - Verify budget updated
    - _Requirements: 3.1, 3.2_

  - [ ] 27.3 Test notification flows
    - Trigger pattern detection
    - Verify notifications sent
    - Test notification actions
    - _Requirements: 4.1, 4.2_

- [ ] 28. Update documentation
  - Update README.md with feature overview
  - Update CHANGELOG.md with version entry
  - Update DEVELOPMENT_LOG.md with implementation summary
  - Update docs/development-status.md with completion status
  - Update docs/api-endpoints.md with new endpoints
  - Create backend/functions/pattern-detection/README.md
  - Create backend/functions/budget-planning/README.md

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Frontend tasks can be done in parallel with backend after APIs are complete
- All testing tasks are required for comprehensive quality assurance
