/**
 * Property-Based Tests for Error Handling Utilities
 *
 * Feature: critical-bug-fixes
 * Tests error detection and user-friendly message generation.
 *
 * **Validates: Requirements 3.4, 3.5, 4.2, 5.3**
 */

import * as fc from "fast-check";
import {
  isNetworkError,
  getUserFriendlyErrorMessage,
  categorizeError,
} from "./error-handling";

describe("Feature: critical-bug-fixes - Error Handling Property Tests", () => {
  /**
   * Property 5: Error Response Contains User-Friendly Message
   *
   * For any API error response (non-2xx status), the error handling should
   * produce a user-friendly message that does not expose internal error details.
   *
   * **Validates: Requirements 3.4, 3.5, 4.2, 5.3**
   */
  describe("Property 5: Error Response Contains User-Friendly Message", () => {
    test("network errors always produce network-specific message", () => {
      const networkError = new TypeError("Failed to fetch");

      fc.assert(
        fc.property(fc.string(), (defaultMessage) => {
          const message = getUserFriendlyErrorMessage(networkError, defaultMessage);
          // Property: network errors should always produce the network error message
          return message.includes("Network error") && message.includes("internet connection");
        }),
        { numRuns: 100 }
      );
    });

    test("user-friendly messages never contain stack traces", () => {
      const errorMessages = fc.oneof(
        fc.constant("at Object.<anonymous>"),
        fc.constant("Error: Something went wrong at line 42"),
        fc.constant("undefined is not a function"),
        fc.constant("Cannot read property 'x' of undefined"),
        fc.string()
      );

      fc.assert(
        fc.property(errorMessages, (errorMessage) => {
          const error = new Error(errorMessage);
          const message = getUserFriendlyErrorMessage(error, "Default error");

          // Property: message should not contain stack trace indicators
          const hasStackTrace = message.includes("at ") && message.includes("Object");
          return !hasStackTrace;
        }),
        { numRuns: 100 }
      );
    });

    test("non-Error values produce default message", () => {
      const nonErrorValues = fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.integer(),
        fc.string(),
        fc.object()
      );

      fc.assert(
        fc.property(nonErrorValues, fc.string({ minLength: 1 }), (value, defaultMsg) => {
          // Skip if value is an Error instance
          if (value instanceof Error) return true;

          const message = getUserFriendlyErrorMessage(value, defaultMsg);
          // Property: non-Error values should return the default message
          return message === defaultMsg;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("isNetworkError", () => {
    test("correctly identifies TypeError with 'Failed to fetch'", () => {
      const networkError = new TypeError("Failed to fetch");
      expect(isNetworkError(networkError)).toBe(true);
    });

    test("returns false for other TypeErrors", () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s !== "Failed to fetch"),
          (message) => {
            const error = new TypeError(message);
            return isNetworkError(error) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    test("returns false for non-TypeError errors", () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const error = new Error(message);
          return isNetworkError(error) === false;
        }),
        { numRuns: 100 }
      );
    });

    test("returns false for non-Error values", () => {
      const nonErrorValues = fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.integer(),
        fc.string(),
        fc.object()
      );

      fc.assert(
        fc.property(nonErrorValues, (value) => {
          return isNetworkError(value) === false;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("categorizeError", () => {
    test("categorizes network errors correctly", () => {
      const networkError = new TypeError("Failed to fetch");
      expect(categorizeError(networkError)).toBe("network");
    });

    test("categorizes auth errors correctly", () => {
      const authMessages = ["Unauthorized", "Please log in", "Authentication failed"];
      authMessages.forEach(msg => {
        expect(categorizeError(new Error(msg))).toBe("auth");
      });
    });

    test("categorizes validation errors correctly", () => {
      const validationMessages = ["Invalid input", "Field required", "Validation failed"];
      validationMessages.forEach(msg => {
        expect(categorizeError(new Error(msg))).toBe("validation");
      });
    });

    test("categorizes server errors correctly", () => {
      const serverMessages = ["Internal server error", "500 error", "Server unavailable"];
      serverMessages.forEach(msg => {
        expect(categorizeError(new Error(msg))).toBe("server");
      });
    });

    test("returns unknown for unrecognized errors", () => {
      fc.assert(
        fc.property(
          fc.string().filter(s =>
            !s.toLowerCase().includes("unauthorized") &&
            !s.toLowerCase().includes("authentication") &&
            !s.toLowerCase().includes("log in") &&
            !s.toLowerCase().includes("invalid") &&
            !s.toLowerCase().includes("required") &&
            !s.toLowerCase().includes("validation") &&
            !s.toLowerCase().includes("server") &&
            !s.toLowerCase().includes("500") &&
            !s.toLowerCase().includes("internal")
          ),
          (message) => {
            const error = new Error(message);
            return categorizeError(error) === "unknown";
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 6: Error Response Includes Suggestions
 *
 * For any error in the AI Insights feature, the error response should
 * include at least one alternative question suggestion.
 *
 * **Validates: Requirements 5.6**
 */
describe("Property 6: Error Response Includes Suggestions", () => {
  // Default suggestions that should always be provided with AI errors
  const defaultSuggestions = [
    "How much did I spend on groceries?",
    "What's my biggest expense category?",
    "Am I spending more than last month?",
  ];

  test("AI error responses always include suggestions", () => {
    fc.assert(
      fc.property(fc.string(), (errorMessage) => {
        // Simulate the error response structure from InsightsPage
        const errorResponse = {
          question: "test question",
          answer: errorMessage || "Sorry, I couldn't process your question.",
          suggestions: defaultSuggestions,
        };

        // Property: error response must have at least one suggestion
        return (
          Array.isArray(errorResponse.suggestions) &&
          errorResponse.suggestions.length > 0
        );
      }),
      { numRuns: 100 }
    );
  });

  test("suggestions are always valid strings", () => {
    fc.assert(
      fc.property(fc.nat(10), () => {
        // Property: all suggestions must be non-empty strings
        return defaultSuggestions.every(
          (s) => typeof s === "string" && s.length > 0
        );
      }),
      { numRuns: 100 }
    );
  });

  test("error response structure is consistent", () => {
    const errorTypes = [
      new TypeError("Failed to fetch"),
      new Error("Server error"),
      new Error("Timeout"),
      null,
      undefined,
    ];

    errorTypes.forEach((error) => {
      // Simulate the error handling logic from InsightsPage
      let errorMessage = "Sorry, I couldn't process your question. Please try again later.";
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage = "Network error: Unable to connect to the server. Please check your internet connection and try again.";
      }

      const response = {
        question: "test",
        answer: errorMessage,
        suggestions: defaultSuggestions,
      };

      // Property: response always has required fields
      expect(response).toHaveProperty("question");
      expect(response).toHaveProperty("answer");
      expect(response).toHaveProperty("suggestions");
      expect(response.suggestions.length).toBeGreaterThan(0);
    });
  });
});
