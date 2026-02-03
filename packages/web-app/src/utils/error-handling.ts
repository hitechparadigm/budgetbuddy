/**
 * Error Handling Utilities
 *
 * Provides consistent error handling across the application.
 * Detects network errors and provides user-friendly messages.
 *
 * **Validates: Requirements 3.4, 3.5, 4.2, 5.3**
 */

/**
 * Check if an error is a network error (Failed to fetch)
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message === "Failed to fetch";
}

/**
 * Get a user-friendly error message from an error
 * Ensures no internal error details are exposed
 */
export function getUserFriendlyErrorMessage(error: unknown, defaultMessage: string = "An unexpected error occurred"): string {
  if (isNetworkError(error)) {
    return "Network error: Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (error instanceof Error) {
    // Don't expose internal error details - use the message if it's user-friendly
    const message = error.message;

    // Check if the message looks like an internal error (contains stack traces, technical details)
    if (message.includes("at ") || message.includes("Error:") || message.includes("undefined")) {
      return defaultMessage;
    }

    return message;
  }

  return defaultMessage;
}

/**
 * Error types for categorization
 */
export type ErrorType = "network" | "auth" | "validation" | "server" | "unknown";

/**
 * Categorize an error for appropriate handling
 */
export function categorizeError(error: unknown): ErrorType {
  if (isNetworkError(error)) {
    return "network";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("unauthorized") || message.includes("authentication") || message.includes("log in")) {
      return "auth";
    }

    if (message.includes("invalid") || message.includes("required") || message.includes("validation")) {
      return "validation";
    }

    if (message.includes("server") || message.includes("500") || message.includes("internal")) {
      return "server";
    }
  }

  return "unknown";
}
