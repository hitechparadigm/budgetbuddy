# Implementation Plan: Documentation Validation Fix

## Overview

This plan implements content-based validation for documentation files, replacing the current timestamp-based approach. The implementation follows a modular architecture with separate utilities for git operations, date handling, content parsing, and individual file validators.

## Tasks

- [ ] 1. Set up project structure and utilities
  - Create `scripts/utils/` directory for shared utilities
  - Create `scripts/validators/` directory for file-specific validators
  - Set up Jest test configuration for new modules
  - _Requirements: 1.1, 6.1_

- [ ] 2. Implement git utilities module
  - [ ] 2.1 Create `scripts/utils/git-utils.js`
    - Implement `getStagedFiles()` to execute `git diff --cached --name-only`
    - Implement `categorizeChanges()` to categorize files by type (backend, frontend, infrastructure, tests, docs)
    - Implement `isDocumentationStaged()` to check if doc files are staged
    - Handle errors gracefully with descriptive messages
    - _Requirements: 1.3, 6.1, 6.2, 6.4_

  - [ ]\* 2.2 Write unit tests for git-utils.js
    - Test `getStagedFiles()` with mocked git commands
    - Test `categorizeChanges()` with various file paths (backend, frontend, infrastructure, tests, docs)
    - Test `isDocumentationStaged()` with different file combinations
    - Test error handling for git command failures
    - _Requirements: 1.3, 6.1, 6.2_

  - [ ]\* 2.3 Write property test for file categorization
    - **Property 2: Staged Files Extraction and Categorization**
    - **Validates: Requirements 1.3, 6.1, 6.2, 6.4**
    - Generate random file paths across all categories
    - Verify correct categorization for all paths
    - Minimum 100 iterations
    - _Requirements: 6.2, 6.4_

- [ ] 3. Implement date utilities module
  - [ ] 3.1 Create `scripts/utils/date-utils.js`
    - Implement `getTodayString()` to return today's date in YYYY-MM-DD format
    - Implement `isToday()` to check if date string is today
    - Implement `isWithinDays()` to check if date is within N days
    - Implement `parseDate()` to parse various date formats
    - _Requirements: 2.1, 3.1, 4.2, 5.2_

  - [ ]\* 3.2 Write unit tests for date-utils.js
    - Test `getTodayString()` returns correct format
    - Test `isToday()` with various date formats and timezones
    - Test `isWithinDays()` with boundary conditions (0 days, 7 days, 30 days)
    - Test `parseDate()` with invalid formats
    - _Requirements: 2.1, 3.1, 4.2, 5.2_

  - [ ]\* 3.3 Write property test for date validation
    - **Property 3: Date-Based Entry Validation**
    - **Validates: Requirements 2.1, 3.1, 5.2**
    - Generate random dates (today, past, future)
    - Verify correct detection of today's date
    - Minimum 100 iterations
    - _Requirements: 2.1, 3.1, 5.2_

- [ ] 4. Implement content parser module
  - [ ] 4.1 Create `scripts/utils/content-parser.js`
    - Implement `readFile()` to read file content with error handling
    - Implement `extractSection()` to extract markdown sections by heading
    - Implement `findDatesInContent()` to find date patterns in text
    - Implement `containsKeywords()` to search for keywords/patterns
    - Add file size limits (< 10MB) for safety
    - _Requirements: 1.1, 1.5_

  - [ ]\* 4.2 Write unit tests for content-parser.js
    - Test `readFile()` with existing and non-existent files
    - Test `extractSection()` with various markdown structures
    - Test `findDatesInContent()` with different date formats
    - Test `containsKeywords()` with case sensitivity and patterns
    - Test file size limit enforcement
    - _Requirements: 1.1, 1.5_

- [ ] 5. Implement CHANGELOG validator
  - [ ] 5.1 Create `scripts/validators/changelog-validator.js`
    - Implement `validateChangelog()` function
    - Check for version entry with today's date (pattern: `## [X.Y.Z] - YYYY-MM-DD`)
    - Verify semantic version format (X.Y.Z)
    - Check for category mentions based on staged files (backend, frontend, infrastructure)
    - Return validation result with specific errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]\* 5.2 Write unit tests for changelog-validator.js
    - Test with valid CHANGELOG.md (today's entry, correct format, mentions categories)
    - Test with missing today's entry
    - Test with invalid version format
    - Test with missing category mentions
    - Test error message specificity
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]\* 5.3 Write property test for semantic version validation
    - **Property 4: Semantic Version Format Validation**
    - **Validates: Requirements 2.2**
    - Generate random version strings (valid and invalid formats)
    - Verify correct detection of semantic versioning format
    - Minimum 100 iterations
    - _Requirements: 2.2_

  - [ ]\* 5.4 Write property test for category-specific content validation
    - **Property 5: Category-Specific Content Validation**
    - **Validates: Requirements 2.3, 2.4, 2.5, 3.3**
    - Generate random staged files and documentation content
    - Verify category mentions are correctly detected
    - Minimum 100 iterations
    - _Requirements: 2.3, 2.4, 2.5_

- [ ] 6. Implement DEVELOPMENT_LOG validator
  - [ ] 6.1 Create `scripts/validators/dev-log-validator.js`
    - Implement `validateDevLog()` function
    - Check for session entry with today's date (pattern: `### YYYY-MM-DD`)
    - Verify entry has substantial content (> 50 characters)
    - Check for mentions of relevant work based on staged files
    - Return validation result with specific errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]\* 6.2 Write unit tests for dev-log-validator.js
    - Test with valid DEVELOPMENT_LOG.md (today's entry, substantial content)
    - Test with missing today's entry
    - Test with insufficient content (< 50 chars)
    - Test with missing work mentions
    - Test error message specificity
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]\* 6.3 Write property test for substantial content requirement
    - **Property 6: Substantial Content Requirement**
    - **Validates: Requirements 3.2, 5.3**
    - Generate random content with various lengths
    - Verify minimum character thresholds are enforced
    - Minimum 100 iterations
    - _Requirements: 3.2_

- [ ] 7. Implement README validator
  - [ ] 7.1 Create `scripts/validators/readme-validator.js`
    - Implement `validateReadme()` function
    - Check for "Recent Achievements" section existence
    - Verify at least one achievement within last 7 days
    - Check for major feature mentions based on staged files
    - Return validation result with specific errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]\* 7.2 Write unit tests for readme-validator.js
    - Test with valid README.md (section exists, recent achievements)
    - Test with missing "Recent Achievements" section
    - Test with no recent achievements (> 7 days old)
    - Test with missing major feature mentions
    - Test error message specificity
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]\* 7.3 Write property test for recent achievements time window
    - **Property 7: Recent Achievements Time Window**
    - **Validates: Requirements 4.2**
    - Generate random achievement dates
    - Verify 7-day window is correctly enforced
    - Minimum 100 iterations
    - _Requirements: 4.2_

- [ ] 8. Implement development-status validator
  - [ ] 8.1 Create `scripts/validators/status-validator.js`
    - Implement `validateStatus()` function
    - Check for "Last Updated" field with today's date (pattern: `**Last Updated:** YYYY-MM-DD`)
    - Verify "Current Status" section has substantial content (> 100 characters)
    - Return validation result with specific errors
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]\* 8.2 Write unit tests for status-validator.js
    - Test with valid development-status.md (today's date, substantial content)
    - Test with missing "Last Updated" field
    - Test with outdated "Last Updated" date
    - Test with insufficient "Current Status" content
    - Test error message specificity
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9. Checkpoint - Ensure all validator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Refactor main validation script
  - [ ] 10.1 Update `scripts/validate-documentation.js`
    - Import all utility modules and validators
    - Implement orchestration logic: get staged files → categorize → run validators
    - Aggregate validation results from all validators
    - Generate comprehensive error messages with file, issue, staged files, and fix guidance
    - Exit with code 0 on success, code 1 on failure
    - Maintain backward compatibility (same CLI, same success output format)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.4, 8.5_

  - [ ] 10.2 Handle empty staging area edge case
    - If no files are staged, skip content verification
    - Only check if documentation files themselves are staged
    - Exit with appropriate message
    - _Requirements: 6.3_

  - [ ]\* 10.3 Write integration tests for main script
    - Create temporary git repository for testing
    - Test end-to-end validation with various staged file combinations
    - Test with valid and invalid documentation states
    - Test error aggregation and reporting
    - Test exit codes for success and failure scenarios
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 7.5, 8.4_

  - [ ]\* 10.4 Write property test for content-based validation
    - **Property 1: Content-Based Validation Over Timestamps**
    - **Validates: Requirements 1.1, 1.2, 1.5**
    - Generate random staged files and documentation content
    - Verify validation checks content, not just timestamps
    - Minimum 100 iterations
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ]\* 10.5 Write property test for comprehensive error reporting
    - **Property 10: Comprehensive Error Reporting**
    - **Validates: Requirements 1.4, 7.1, 7.2, 7.3, 7.4**
    - Generate random validation failures
    - Verify all error components are present (file, issue, staged files, guidance)
    - Minimum 100 iterations
    - _Requirements: 1.4, 7.1, 7.2, 7.3, 7.4_

  - [ ]\* 10.6 Write property test for exit code consistency
    - **Property 11: Exit Code Consistency**
    - **Validates: Requirements 7.5, 8.4**
    - Generate random validation scenarios (pass/fail)
    - Verify exit codes are always correct (0 for pass, non-zero for fail)
    - Minimum 100 iterations
    - _Requirements: 7.5, 8.4_

- [ ] 11. Test backward compatibility
  - [ ] 11.1 Test integration with safe-commit-push.js
    - Run safe-commit-push.js with new validation script
    - Verify validation is called correctly
    - Verify error handling works as expected
    - _Requirements: 8.2_

  - [ ] 11.2 Test integration with git pre-commit hooks
    - Trigger pre-commit hook with new validation script
    - Verify validation runs and blocks commits on failure
    - Verify success path allows commits
    - _Requirements: 8.3_

  - [ ]\* 11.3 Write property test for backward compatibility
    - **Property 13: Backward Compatibility**
    - **Validates: Requirements 8.1, 8.5**
    - Test various invocations of validation script
    - Verify CLI interface and output format match expectations
    - Minimum 100 iterations
    - _Requirements: 8.1, 8.5_

- [ ] 12. Update documentation
  - [ ] 12.1 Update README.md
    - Add entry to "Recent Achievements" about improved validation
    - Update "Development Workflow" section if needed
    - _Requirements: All_

  - [ ] 12.2 Update CHANGELOG.md
    - Add version entry for validation fix with today's date
    - Mention content-based validation, improved error messages
    - _Requirements: All_

  - [ ] 12.3 Update DEVELOPMENT_LOG.md
    - Add session entry for today with implementation details
    - Mention modules created, tests written, validation improvements
    - _Requirements: All_

  - [ ] 12.4 Update docs/development-status.md
    - Set "Last Updated" to today's date
    - Update "Current Status" with validation improvements
    - _Requirements: All_

  - [ ] 12.5 Create scripts/README.md (if doesn't exist)
    - Document validation script behavior
    - Explain error messages and how to fix common issues
    - Provide examples of valid documentation
    - _Requirements: 1.4, 7.1, 7.2, 7.3, 7.4_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Run full test suite: `npm test`
  - Run validation script: `node scripts/validate-for-commit.js`
  - Verify all documentation is updated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- All validators follow consistent interface pattern for easy testing and maintenance
- Modular architecture allows independent testing and future enhancements
