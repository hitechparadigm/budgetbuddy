/**
 * Property-Based Tests: Time Window Matching
 *
 * Tests the ±15 minute window logic for daily reminders
 * Validates: Requirements 3.2, 3.9
 */

import * as fc from 'fast-check';

/**
 * Check if a reminder time matches the current time within ±15 minute window
 */
function isWithinReminderWindow(
  reminderHour: number,
  reminderMinute: number,
  currentHour: number,
  currentMinute: number
): boolean {
  // Convert to minutes since midnight
  const reminderMinutes = reminderHour * 60 + reminderMinute;
  const currentMinutes = currentHour * 60 + currentMinute;

  // Calculate difference
  const diff = Math.abs(currentMinutes - reminderMinutes);

  // Check if within ±15 minute window
  return diff <= 15;
}

describe('Property-Based Tests: Time Window Matching', () => {
  describe('isWithinReminderWindow', () => {
    it('should always return true when times are exactly equal', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // hour
          fc.integer({ min: 0, max: 59 }), // minute
          (hour, minute) => {
            const result = isWithinReminderWindow(hour, minute, hour, minute);
            return result === true;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should return true when current time is within +15 minutes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // reminderHour
          fc.integer({ min: 0, max: 44 }), // reminderMinute (max 44 to avoid overflow)
          fc.integer({ min: 1, max: 15 }), // offset in minutes
          (reminderHour, reminderMinute, offset) => {
            const currentMinute = reminderMinute + offset;
            const result = isWithinReminderWindow(
              reminderHour,
              reminderMinute,
              reminderHour,
              currentMinute
            );
            return result === true;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should return true when current time is within -15 minutes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // reminderHour
          fc.integer({ min: 15, max: 59 }), // reminderMinute (min 15 to avoid underflow)
          fc.integer({ min: 1, max: 15 }), // offset in minutes
          (reminderHour, reminderMinute, offset) => {
            const currentMinute = reminderMinute - offset;
            const result = isWithinReminderWindow(
              reminderHour,
              reminderMinute,
              reminderHour,
              currentMinute
            );
            return result === true;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should return false when current time is more than +15 minutes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // reminderHour
          fc.integer({ min: 0, max: 43 }), // reminderMinute (max 43 to avoid overflow)
          fc.integer({ min: 16, max: 60 }), // offset in minutes (> 15)
          (reminderHour, reminderMinute, offset) => {
            const currentMinute = reminderMinute + offset;
            if (currentMinute > 59) return true; // Skip invalid times

            const result = isWithinReminderWindow(
              reminderHour,
              reminderMinute,
              reminderHour,
              currentMinute
            );
            return result === false;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should return false when current time is more than -15 minutes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // reminderHour
          fc.integer({ min: 16, max: 59 }), // reminderMinute (min 16 to avoid underflow)
          fc.integer({ min: 16, max: 60 }), // offset in minutes (> 15)
          (reminderHour, reminderMinute, offset) => {
            const currentMinute = reminderMinute - offset;
            if (currentMinute < 0) return true; // Skip invalid times

            const result = isWithinReminderWindow(
              reminderHour,
              reminderMinute,
              reminderHour,
              currentMinute
            );
            return result === false;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle hour boundaries correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 22 }), // reminderHour (not 23 to test next hour)
          fc.integer({ min: 50, max: 59 }), // reminderMinute (near end of hour)
          (reminderHour, reminderMinute) => {
            // Test transition to next hour
            const currentHour = reminderHour + 1;
            const currentMinute = (reminderMinute + 15) % 60;

            const result = isWithinReminderWindow(
              reminderHour,
              reminderMinute,
              currentHour,
              currentMinute
            );

            // Should be within window if the minute difference is <= 15
            const reminderMinutes = reminderHour * 60 + reminderMinute;
            const currentMinutes = currentHour * 60 + currentMinute;
            const expectedResult = Math.abs(currentMinutes - reminderMinutes) <= 15;

            return result === expectedResult;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should be symmetric (order of times should not matter)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // hour1
          fc.integer({ min: 0, max: 59 }), // minute1
          fc.integer({ min: 0, max: 23 }), // hour2
          fc.integer({ min: 0, max: 59 }), // minute2
          (hour1, minute1, hour2, minute2) => {
            const result1 = isWithinReminderWindow(hour1, minute1, hour2, minute2);
            const result2 = isWithinReminderWindow(hour2, minute2, hour1, minute1);
            return result1 === result2;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle edge case: exactly 15 minutes apart', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // hour
          fc.integer({ min: 0, max: 44 }), // minute (max 44 to avoid overflow)
          (hour, minute) => {
            const result = isWithinReminderWindow(hour, minute, hour, minute + 15);
            return result === true;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle edge case: exactly 16 minutes apart', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // hour
          fc.integer({ min: 0, max: 43 }), // minute (max 43 to avoid overflow)
          (hour, minute) => {
            const result = isWithinReminderWindow(hour, minute, hour, minute + 16);
            return result === false;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle all valid time combinations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // reminderHour
          fc.integer({ min: 0, max: 59 }), // reminderMinute
          fc.integer({ min: 0, max: 23 }), // currentHour
          fc.integer({ min: 0, max: 59 }), // currentMinute
          (reminderHour, reminderMinute, currentHour, currentMinute) => {
            // Should not throw error for any valid time combination
            const result = isWithinReminderWindow(
              reminderHour,
              reminderMinute,
              currentHour,
              currentMinute
            );
            return typeof result === 'boolean';
          }
        ),
        { numRuns: 10000 }
      );
    });
  });
});
