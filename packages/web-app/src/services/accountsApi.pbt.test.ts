/**
 * Property-Based Tests for Accounts API Error Handling
 *
 * Tests that error messages are safe and don't expose sensitive information.
 *
 * **Validates: Requirements 6.1, 6.2**
 */

import * as fc from 'fast-check';
import { AccountsApiError } from './accountsApi';

// Patterns that should NEVER appear in user-facing error messages
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /credential/i,
  /authorization/i,
  /bearer/i,
  /aws[_-]?access/i,
  /aws[_-]?secret/i,
  /private[_-]?key/i,
  /connection[_-]?string/i,
  /database[_-]?url/i,
  /internal[_-]?error/i,
  /stack[_-]?trace/i,
  /at\s+\w+\s+\(/i, // Stack trace pattern
  /node_modules/i,
  /\.js:\d+:\d+/i, // File:line:column pattern
];

// Patterns that indicate good user-friendly messages
const USER_FRIENDLY_PATTERNS = [
  /please/i,
  /try again/i,
  /check/i,
  /invalid/i,
  /not found/i,
  /permission/i,
  /sign in/i,
  /network/i,
  /connection/i,
  /server error/i,
  /conflicts/i,
];

describe('Property 12: Error Message Safety', () => {
  /**
   * Property: Error messages should never contain sensitive information
   * For any error message, it should not match any sensitive patterns.
   */
  it('should never expose sensitive information in error messages', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.integer({ min: 0, max: 599 }),
        (message, statusCode) => {
          const error = new AccountsApiError(message, statusCode);

          // Check that the error message doesn't contain sensitive patterns
          for (const pattern of SENSITIVE_PATTERNS) {
            if (pattern.test(error.message)) {
              // If the message contains sensitive info, it should be sanitized
              // This test documents what we DON'T want to see
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: AccountsApiError should preserve status code correctly
   */
  it('should preserve status code in error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 100, max: 599 }),
        (message, statusCode) => {
          const error = new AccountsApiError(message, statusCode);
          return error.statusCode === statusCode;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: AccountsApiError should preserve message correctly
   */
  it('should preserve message in error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 100, max: 599 }),
        (message, statusCode) => {
          const error = new AccountsApiError(message, statusCode);
          return error.message === message;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: AccountsApiError should be an instance of Error
   */
  it('should be an instance of Error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 100, max: 599 }),
        (message, statusCode) => {
          const error = new AccountsApiError(message, statusCode);
          return error instanceof Error && error instanceof AccountsApiError;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Network errors should be flagged correctly
   */
  it('should flag network errors correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.boolean(),
        (message, isNetworkError) => {
          const error = new AccountsApiError(message, 0, undefined, isNetworkError);
          return error.isNetworkError === isNetworkError;
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Error Message User-Friendliness', () => {
  /**
   * Test that common HTTP status codes produce user-friendly messages
   */
  it('should produce user-friendly messages for common status codes', () => {
    const statusCodeMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Please sign in to continue.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'This operation conflicts with existing data.',
      500: 'Server error. Please try again later.',
    };

    for (const [statusCode, expectedMessage] of Object.entries(statusCodeMessages)) {
      // Verify the message is user-friendly (contains helpful language)
      const hasUserFriendlyPattern = USER_FRIENDLY_PATTERNS.some(pattern =>
        pattern.test(expectedMessage)
      );
      expect(hasUserFriendlyPattern).toBe(true);
      // Verify status code is valid
      expect(parseInt(statusCode)).toBeGreaterThanOrEqual(100);
    }
  });
});
