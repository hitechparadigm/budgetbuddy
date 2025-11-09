/**
 * BudgetBuddy Transaction Planning Error Classes
 *
 * Custom error classes for transaction planning operations with specific error handling.
 * Provides structured error responses for different failure scenarios.
 */

/**
 * Base error class for transaction planning operations
 */
class TransactionPlanningError extends Error {
    constructor(message, code = 'TRANSACTION_PLANNING_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Error thrown when planned transaction validation fails
 */
class PlanValidationError extends TransactionPlanningError {
    constructor(message, field = null) {
        super(message, 'PLAN_VALIDATION_ERROR');
        this.field = field;
    }
}

/**
 * Error thrown when recurring pattern is invalid
 */
class RecurringPatternError extends TransactionPlanningError {
    constructor(message, pattern = null) {
        super(message, 'RECURRING_PATTERN_ERROR');
        this.pattern = pattern;
    }
}

/**
 * Error thrown when planned transaction execution fails
 */
class ExecutionError extends TransactionPlanningError {
    constructor(message, planId = null) {
        super(message, 'EXECUTION_ERROR');
        this.planId = planId;
    }
}

/**
 * Error thrown when planned transaction is not found
 */
class PlanNotFoundError extends TransactionPlanningError {
    constructor(planId) {
        super(`Planned transaction not found with ID: ${planId}`, 'PLAN_NOT_FOUND');
        this.planId = planId;
    }
}

/**
 * Error thrown when trying to modify executed planned transaction
 */
class ExecutedPlanError extends TransactionPlanningError {
    constructor(planId) {
        super(`Cannot modify executed planned transaction: ${planId}`, 'EXECUTED_PLAN_ERROR');
        this.planId = planId;
    }
}

/**
 * Error thrown when recurring generation fails
 */
class RecurringGenerationError extends TransactionPlanningError {
    constructor(message, details = null) {
        super(message, 'RECURRING_GENERATION_ERROR');
        this.details = details;
    }
}

/**
 * Error thrown when date calculation fails
 */
class DateCalculationError extends TransactionPlanningError {
    constructor(message, date = null) {
        super(message, 'DATE_CALCULATION_ERROR');
        this.date = date;
    }
}

/**
 * Error thrown when currency conversion fails
 */
class CurrencyError extends TransactionPlanningError {
    constructor(message, currency = null) {
        super(message, 'CURRENCY_ERROR');
        this.currency = currency;
    }
}

/**
 * Error thrown when authorization fails for planned transaction operations
 */
class PlanAuthorizationError extends TransactionPlanningError {
    constructor(message, userId = null, planId = null) {
        super(message, 'PLAN_AUTHORIZATION_ERROR');
        this.userId = userId;
        this.planId = planId;
    }
}

module.exports = {
    TransactionPlanningError,
    PlanValidationError,
    RecurringPatternError,
    ExecutionError,
    PlanNotFoundError,
    ExecutedPlanError,
    RecurringGenerationError,
    DateCalculationError,
    CurrencyError,
    PlanAuthorizationError
};
