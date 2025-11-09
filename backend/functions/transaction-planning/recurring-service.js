/**
 * BudgetBuddy Recurring Transaction Service
 *
 * Handles complex recurring transaction calculations, pattern validation,
 * and automatic generation of future transaction occurrences.
 */

const { DateCalculationError, RecurringPatternError } = require('./errors');
const { logger } = require('/opt/nodejs/utils');

/**
 * Validates recurring transaction pattern
 * @param {Object} recurringData - The recurring transaction configuration
 * @returns {boolean} - True if valid, throws error if invalid
 */
function validateRecurringPattern(recurringData) {
    const { frequency, customInterval, onLastDayOfMonth, endDate, startDate } = recurringData;

    // Validate frequency
    const validFrequencies = ['weekly', 'bi-weekly', 'monthly', 'annually', 'custom'];
    if (!validFrequencies.includes(frequency)) {
        throw new RecurringPatternError(`Invalid frequency: ${frequency}. Must be one of: ${validFrequencies.join(', ')}`);
    }

    // Validate custom interval
    if (frequency === 'custom') {
        if (!customInterval || customInterval < 1 || customInterval > 365) {
            throw new RecurringPatternError('Custom interval must be between 1 and 365');
        }
    }

    // Validate end date is after start date
    if (endDate && startDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            throw new RecurringPatternError('End date must be after start date');
        }
    }

    // Validate onLastDayOfMonth only applies to monthly/custom patterns
    if (onLastDayOfMonth && !['monthly', 'custom'].includes(frequency)) {
        throw new RecurringPatternError('onLastDayOfMonth can only be used with monthly or custom frequency');
    }

    return true;
}

/**
 * Calculates the next occurrence date for a recurring transaction
 * @param {string} currentDate - Current date in YYYY-MM-DD format
 * @param {string} frequency - Frequency pattern
 * @param {number} customInterval - Custom interval for custom frequency
 * @param {boolean} onLastDayOfMonth - Whether to schedule on last day of month
 * @returns {string} - Next occurrence date in YYYY-MM-DD format
 */
function calculateNextOccurrence(currentDate, frequency, customInterval = null, onLastDayOfMonth = false) {
    try {
        const date = new Date(currentDate);

        // Validate input date
        if (isNaN(date.getTime())) {
            throw new DateCalculationError(`Invalid date format: ${currentDate}`);
        }

        let nextDate = new Date(date);

        switch (frequency) {
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;

            case 'bi-weekly':
                nextDate.setDate(nextDate.getDate() + 14);
                break;

            case 'monthly':
                if (onLastDayOfMonth) {
                    // Move to next month, then set to last day
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    nextDate.setDate(0); // Sets to last day of previous month (which is the month we want)
                } else {
                    // Keep same day of month, move to next month
                    const originalDay = nextDate.getDate();
                    nextDate.setMonth(nextDate.getMonth() + 1);

                    // Handle cases where the day doesn't exist in the next month (e.g., Jan 31 -> Feb 31)
                    if (nextDate.getDate() !== originalDay) {
                        nextDate.setDate(0); // Set to last day of the month
                    }
                }
                break;

            case 'annually':
                nextDate.setFullYear(nextDate.getFullYear() + 1);

                // Handle leap year edge case (Feb 29)
                if (nextDate.getMonth() !== date.getMonth()) {
                    nextDate.setDate(0); // Set to last day of February
                }
                break;

            case 'custom':
                if (!customInterval || customInterval < 1) {
                    throw new RecurringPatternError('Custom interval must be specified and greater than 0');
                }

                if (onLastDayOfMonth) {
                    // Move by custom interval months, then set to last day
                    nextDate.setMonth(nextDate.getMonth() + customInterval);
                    nextDate.setDate(0);
                } else {
                    // Move by custom interval months, keep same day
                    const originalDay = nextDate.getDate();
                    nextDate.setMonth(nextDate.getMonth() + customInterval);

                    // Handle cases where the day doesn't exist in the target month
                    if (nextDate.getDate() !== originalDay) {
                        nextDate.setDate(0); // Set to last day of the month
                    }
                }
                break;

            default:
                throw new RecurringPatternError(`Unsupported frequency: ${frequency}`);
        }

        return nextDate.toISOString().split('T')[0];

    } catch (error) {
        logger.error('Error calculating next occurrence', {
            currentDate,
            frequency,
            customInterval,
            onLastDayOfMonth,
            error: error.message
        });

        if (error instanceof RecurringPatternError || error instanceof DateCalculationError) {
            throw error;
        }

        throw new DateCalculationError(`Failed to calculate next occurrence: ${error.message}`);
    }
}

/**
 * Generates a series of occurrence dates for a recurring transaction
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} frequency - Frequency pattern
 * @param {number} customInterval - Custom interval for custom frequency
 * @param {boolean} onLastDayOfMonth - Whether to schedule on last day of month
 * @param {string} endDate - End date in YYYY-MM-DD format (optional)
 * @param {number} maxOccurrences - Maximum number of occurrences to generate
 * @returns {Array<string>} - Array of occurrence dates in YYYY-MM-DD format
 */
function generateOccurrences(startDate, frequency, customInterval = null, onLastDayOfMonth = false, endDate = null, maxOccurrences = 100) {
    try {
        validateRecurringPattern({ frequency, customInterval, onLastDayOfMonth, endDate, startDate });

        const occurrences = [];
        let currentDate = startDate;
        const endDateTime = endDate ? new Date(endDate) : null;

        for (let i = 0; i < maxOccurrences; i++) {
            const nextDate = calculateNextOccurrence(currentDate, frequency, customInterval, onLastDayOfMonth);
            const nextDateTime = new Date(nextDate);

            // Check if we've passed the end date
            if (endDateTime && nextDateTime > endDateTime) {
                break;
            }

            occurrences.push(nextDate);
            currentDate = nextDate;

            // Safety check to prevent infinite loops
            if (nextDate === currentDate && i > 0) {
                logger.warn('Detected potential infinite loop in occurrence generation', {
                    startDate,
                    frequency,
                    customInterval,
                    onLastDayOfMonth,
                    currentIteration: i
                });
                break;
            }
        }

        logger.info('Generated recurring occurrences', {
            startDate,
            frequency,
            customInterval,
            onLastDayOfMonth,
            endDate,
            occurrenceCount: occurrences.length
        });

        return occurrences;

    } catch (error) {
        logger.error('Error generating occurrences', {
            startDate,
            frequency,
            customInterval,
            onLastDayOfMonth,
            endDate,
            maxOccurrences,
            error: error.message
        });

        throw error;
    }
}

/**
 * Checks if a recurring pattern has ended
 * @param {Object} recurringTransaction - The recurring transaction object
 * @param {string} checkDate - Date to check against (defaults to today)
 * @returns {boolean} - True if the recurring pattern has ended
 */
function hasRecurringEnded(recurringTransaction, checkDate = null) {
    const { endDate, frequency } = recurringTransaction;

    // If no end date specified, it never ends
    if (!endDate) {
        return false;
    }

    const compareDate = checkDate ? new Date(checkDate) : new Date();
    const endDateTime = new Date(endDate);

    // Set time to end of day for end date comparison
    endDateTime.setHours(23, 59, 59, 999);

    return compareDate > endDateTime;
}

/**
 * Calculates the human-readable description of a recurring pattern
 * @param {Object} recurringData - The recurring transaction configuration
 * @returns {string} - Human-readable description
 */
function getRecurringDescription(recurringData) {
    const { frequency, customInterval, onLastDayOfMonth, endDate } = recurringData;

    let description = 'Repeats ';

    switch (frequency) {
        case 'weekly':
            description += 'every week';
            break;
        case 'bi-weekly':
            description += 'every two weeks';
            break;
        case 'monthly':
            description += onLastDayOfMonth ? 'on the last day of every month' : 'every month';
            break;
        case 'annually':
            description += 'every year';
            break;
        case 'custom':
            const interval = customInterval || 1;
            const unit = interval === 1 ? 'month' : 'months';
            description += `every ${interval} ${unit}`;
            if (onLastDayOfMonth) {
                description += ' on the last day';
            }
            break;
        default:
            description += 'with custom pattern';
    }

    if (endDate) {
        const endDateObj = new Date(endDate);
        description += ` until ${endDateObj.toLocaleDateString()}`;
    } else {
        description += ' indefinitely';
    }

    return description;
}

/**
 * Validates that a date is valid for recurring scheduling
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {boolean} - True if valid, throws error if invalid
 */
function validateScheduleDate(date) {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
        throw new DateCalculationError(`Invalid date format: ${date}`);
    }

    // Check if date is too far in the past (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (dateObj < oneYearAgo) {
        throw new DateCalculationError('Schedule date cannot be more than 1 year in the past');
    }

    // Check if date is too far in the future (more than 10 years)
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

    if (dateObj > tenYearsFromNow) {
        throw new DateCalculationError('Schedule date cannot be more than 10 years in the future');
    }

    return true;
}

module.exports = {
    validateRecurringPattern,
    calculateNextOccurrence,
    generateOccurrences,
    hasRecurringEnded,
    getRecurringDescription,
    validateScheduleDate
};
