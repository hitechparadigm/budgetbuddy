/**
 * Validation Utilities for BudgetBuddy Authentication
 *
 * Provides input validation for all auth endpoints.
 */

/**
 * Validate email address format
 *
 * @param {string} email - Email address to validate
 * @returns {string|null} Error message if invalid, null if valid
 */
function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return "Email is required and must be a string";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email must be a valid email address";
  }

  return null;
}

/**
 * Validate password strength
 *
 * @param {string} password - Password to validate
 * @returns {string|null} Error message if invalid, null if valid
 */
function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return "Password is required and must be a string";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  return null;
}

/**
 * Validate onboarding input
 *
 * @param {Object} input - Onboarding input object
 * @param {string} input.city - User's city
 * @param {string} input.country - User's country
 * @param {number} input.familySize - Family size
 * @param {string} input.currentMonth - Current month (YYYY-MM format)
 * @param {Array} input.selectedCategories - Selected expense categories
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validateOnboardingInput(input) {
  const errors = [];

  if (!input.city || typeof input.city !== "string") {
    errors.push("City is required and must be a string");
  }

  if (!input.country || typeof input.country !== "string") {
    errors.push("Country is required and must be a string");
  }

  if (typeof input.familySize !== "number") {
    errors.push("Family size is required and must be a number");
  } else if (input.familySize < 1 || input.familySize > 20) {
    errors.push("Family size must be between 1 and 20");
  }

  if (!input.currentMonth || typeof input.currentMonth !== "string") {
    errors.push("Current month is required and must be a string");
  } else if (!/^\d{4}-\d{2}$/.test(input.currentMonth)) {
    errors.push("Current month must be in YYYY-MM format");
  }

  if (!input.selectedCategories || !Array.isArray(input.selectedCategories)) {
    errors.push("Selected categories is required and must be an array");
  } else if (input.selectedCategories.length === 0) {
    errors.push("At least one category must be selected");
  } else {
    // Validate each category
    input.selectedCategories.forEach((category, index) => {
      if (!category.name || typeof category.name !== "string") {
        errors.push(
          `Category ${index + 1}: name is required and must be a string`
        );
      }
      if (!category.icon || typeof category.icon !== "string") {
        errors.push(
          `Category ${index + 1}: icon is required and must be a string`
        );
      }
      if (
        typeof category.adjustedAmount !== "number" ||
        category.adjustedAmount < 0
      ) {
        errors.push(
          `Category ${index + 1}: adjustedAmount must be a non-negative number`
        );
      }
    });
  }

  return errors;
}

/**
 * Validate registration input
 *
 * @param {Object} input - Registration input object
 * @param {string} input.email - User's email
 * @param {string} input.password - User's password
 * @param {string} input.firstName - User's first name
 * @param {string} input.lastName - User's last name
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validateRegistrationInput(input) {
  const errors = [];

  const emailError = validateEmail(input.email);
  if (emailError) {
    errors.push(emailError);
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    errors.push(passwordError);
  }

  if (!input.firstName || typeof input.firstName !== "string") {
    errors.push("First name is required and must be a string");
  }

  if (!input.lastName || typeof input.lastName !== "string") {
    errors.push("Last name is required and must be a string");
  }

  return errors;
}

/**
 * Validate login input
 *
 * @param {Object} input - Login input object
 * @param {string} input.email - User's email
 * @param {string} input.password - User's password
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validateLoginInput(input) {
  const errors = [];

  const emailError = validateEmail(input.email);
  if (emailError) {
    errors.push(emailError);
  }

  if (!input.password || typeof input.password !== "string") {
    errors.push("Password is required and must be a string");
  }

  return errors;
}

module.exports = {
  validateEmail,
  validatePassword,
  validateOnboardingInput,
  validateRegistrationInput,
  validateLoginInput,
};
