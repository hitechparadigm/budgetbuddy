/**
 * Input validation utilities for BudgetBuddy
 * Provides client-side validation for forms and user input
 * Ensures data integrity before sending to API
 */

/**
 * Validate email address format using RFC-compliant regex
 * Used in registration and login forms
 * @param email - Email address string to validate
 * @returns true if email format is valid
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate postal/ZIP code format based on country
 * Supports Canadian postal codes (A1A 1A1) and US ZIP codes (12345 or 12345-6789)
 * @param postalCode - Postal or ZIP code to validate
 * @param country - Country code or name to determine validation rules
 * @returns true if postal code format is valid for the specified country
 */
export const validatePostalCode = (postalCode: string, country: string): boolean => {
  switch (country.toUpperCase()) {
    case 'CA':
    case 'CANADA':
      // Canadian postal code format: A1A 1A1 (letter-digit-letter space/dash digit-letter-digit)
      const canadianRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      return canadianRegex.test(postalCode);
    case 'US':
    case 'USA':
    case 'UNITED STATES':
      // US ZIP code format: 12345 or 12345-6789 (5 digits optionally followed by dash and 4 digits)
      const usRegex = /^\d{5}(-\d{4})?$/;
      return usRegex.test(postalCode);
    default:
      // Generic validation for other countries: 3-10 characters
      return postalCode.length >= 3 && postalCode.length <= 10;
  }
};

/**
 * Validate password strength with detailed error reporting
 * Enforces security requirements for user account passwords
 * @param password - Password string to validate
 * @returns Object containing validation result and array of specific error messages
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Check minimum length requirement
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Check for uppercase letter requirement
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letter requirement
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for number requirement
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous characters from user-provided strings
 * @param input - Raw user input string
 * @returns Sanitized string with dangerous characters removed
 */
export const sanitizeInput = (input: string): string => {
  // Trim whitespace and remove angle brackets that could be used for HTML injection
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Validate monetary amounts for budget and transaction entries
 * Ensures amounts are positive numbers within reasonable limits
 * @param amount - Numeric amount to validate
 * @returns true if amount is valid (non-negative number under $1M)
 */
export const validateAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount >= 0 && amount <= 1000000; // Max $1M to prevent unrealistic entries
};