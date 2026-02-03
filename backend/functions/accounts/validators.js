/**
 * Account Validators
 *
 * Input validation for account operations.
 * Validates account types, subtypes, and required fields.
 */

// Account type constants
const ACCOUNT_TYPES = ["banking", "cash", "credit_card", "investment", "loan"];

const ACCOUNT_SUBTYPES = {
  banking: ["checking", "savings", "money_market"],
  cash: ["cash", "digital_wallet"],
  credit_card: ["credit_card", "store_card"],
  investment: ["brokerage", "retirement_401k", "ira", "other_investment"],
  loan: ["mortgage", "auto_loan", "student_loan", "personal_loan"],
};

const ASSET_ACCOUNT_TYPES = ["banking", "cash", "investment"];
const LIABILITY_ACCOUNT_TYPES = ["credit_card", "loan"];

/**
 * Validate account type
 */
function isValidAccountType(accountType) {
  return ACCOUNT_TYPES.includes(accountType);
}

/**
 * Validate account subtype for a given type
 */
function isValidSubtypeForType(accountType, subtype) {
  // First check if accountType is valid to avoid accessing built-in properties
  if (!isValidAccountType(accountType)) {
    return false;
  }
  const validSubtypes = ACCOUNT_SUBTYPES[accountType];
  return (
    validSubtypes &&
    Array.isArray(validSubtypes) &&
    validSubtypes.includes(subtype)
  );
}

/**
 * Check if account type is an asset
 */
function isAssetAccount(accountType) {
  return ASSET_ACCOUNT_TYPES.includes(accountType);
}

/**
 * Check if account type is a liability
 */
function isLiabilityAccount(accountType) {
  return LIABILITY_ACCOUNT_TYPES.includes(accountType);
}

/**
 * Validate create account input
 */
function validateCreateAccountInput(input) {
  const errors = [];

  // Required fields
  if (!input.accountType) {
    errors.push("accountType is required");
  } else if (!isValidAccountType(input.accountType)) {
    errors.push(
      `Invalid accountType: ${input.accountType}. Must be one of: ${ACCOUNT_TYPES.join(", ")}`,
    );
  }

  if (!input.accountSubtype) {
    errors.push("accountSubtype is required");
  } else if (
    input.accountType &&
    isValidAccountType(input.accountType) &&
    !isValidSubtypeForType(input.accountType, input.accountSubtype)
  ) {
    const validSubtypes = ACCOUNT_SUBTYPES[input.accountType] || [];
    errors.push(
      `Invalid accountSubtype: ${input.accountSubtype}. Must be one of: ${validSubtypes.join(", ")}`,
    );
  }

  if (!input.nickname || typeof input.nickname !== "string") {
    errors.push("nickname is required and must be a string");
  } else if (input.nickname.trim().length < 1) {
    errors.push("nickname cannot be empty or whitespace only");
  } else if (input.nickname.length > 100) {
    errors.push("nickname must be 100 characters or less");
  }

  if (input.currentBalance === undefined || input.currentBalance === null) {
    errors.push("currentBalance is required");
  } else if (
    typeof input.currentBalance !== "number" ||
    isNaN(input.currentBalance)
  ) {
    errors.push("currentBalance must be a valid number");
  }

  // Optional fields validation
  if (input.institutionName !== undefined && input.institutionName !== null) {
    if (typeof input.institutionName !== "string") {
      errors.push("institutionName must be a string");
    } else if (input.institutionName.length > 100) {
      errors.push("institutionName must be 100 characters or less");
    }
  }

  if (input.currency !== undefined && input.currency !== null) {
    if (typeof input.currency !== "string" || input.currency.length !== 3) {
      errors.push("currency must be a 3-character ISO currency code");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate update account input
 */
function validateUpdateAccountInput(input) {
  const errors = [];

  if (input.nickname !== undefined) {
    if (typeof input.nickname !== "string") {
      errors.push("nickname must be a string");
    } else if (input.nickname.length < 1 || input.nickname.length > 100) {
      errors.push("nickname must be between 1 and 100 characters");
    }
  }

  if (input.institutionName !== undefined && input.institutionName !== null) {
    if (typeof input.institutionName !== "string") {
      errors.push("institutionName must be a string");
    } else if (input.institutionName.length > 100) {
      errors.push("institutionName must be 100 characters or less");
    }
  }

  if (input.currentBalance !== undefined) {
    if (
      typeof input.currentBalance !== "number" ||
      isNaN(input.currentBalance)
    ) {
      errors.push("currentBalance must be a valid number");
    }
  }

  if (input.isTracked !== undefined) {
    if (typeof input.isTracked !== "boolean") {
      errors.push("isTracked must be a boolean");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate reconcile account input
 */
function validateReconcileInput(input) {
  const errors = [];

  if (input.newBalance === undefined || input.newBalance === null) {
    errors.push("newBalance is required");
  } else if (typeof input.newBalance !== "number" || isNaN(input.newBalance)) {
    errors.push("newBalance must be a valid number");
  }

  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== "string") {
      errors.push("notes must be a string");
    } else if (input.notes.length > 500) {
      errors.push("notes must be 500 characters or less");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate set tracking input
 */
function validateSetTrackingInput(input) {
  const errors = [];

  if (input.isTracked === undefined || input.isTracked === null) {
    errors.push("isTracked is required");
  } else if (typeof input.isTracked !== "boolean") {
    errors.push("isTracked must be a boolean");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  ACCOUNT_TYPES,
  ACCOUNT_SUBTYPES,
  ASSET_ACCOUNT_TYPES,
  LIABILITY_ACCOUNT_TYPES,
  isValidAccountType,
  isValidSubtypeForType,
  isAssetAccount,
  isLiabilityAccount,
  validateCreateAccountInput,
  validateUpdateAccountInput,
  validateReconcileInput,
  validateSetTrackingInput,
};
