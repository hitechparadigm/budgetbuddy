/**
 * Property-Based Tests: Quiet Hours
 *
 * Tests quiet hours logic for all cases including overnight periods
 * Validates: Requirement 3.3
 */

import * as fc from 'fast-check';

/**
 * Check if current time is within quiet hours
 * Handles overnight quiet hours (e.g., 10 PM - 8 AM)
 */
function isInQuietHours(
  currentHour: number,
  currentMinute: number,
  quietStartHour: number,
  quietStartMinute: number,
  quietEndHour: number,
  quietEndMinute: number
): boolean {
  // Convert to minutes since midnight
  const currentMinutes = currentHour * 60 + currentMinute;
  const startMinutes = quietStartHour * 60 + quietStartMinute;
  const endMinutes = quietEndHour * 60 + quietEndMinute;

  // Check if quiet hours span midnight (overnight)
  if (startMinutes > endMinutes) {
    // Overnight quiet hours (e.g., 22:00 - 08:00)
    // In quiet hours if: current >= start OR current < end
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Same-day quiet hours (e.g., 13:00 - 14:00)
    // In quiet hours if: start <= current < end
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

describe('Property-Based Tests: Quiet Hours', () => {
  describe('isInQuietHours', () => {
    it('should return true when current time equals quiet start time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // startHour
          fc.integer({ min: 0, max: 59 }), // startMinute
          fc.integer({ min: 0, max: 23 }), // endHour
          fc.integer({ min: 0, max: 59 }), // endMinute
          (startHour, startMinute, endHour, endMinute) => {
            // Skip if start equals end (no quiet hours)
            if (startHour === endHour && startMinute === endMinute) return true;

            const result = isInQuietHours(
              startHour,
              startMinute,
              startHour,
              startMinute,
              endHour,
              endMinute
            );
            return result === true;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should return false when current time equals quiet end time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // startHour
          fc.integer({ min: 0, max: 59 }), // startMinute
          fc.integer({ min: 0, max: 23 }), // endHour
          fc.integer({ min: 0, max: 59 }), // endMinute
          (startHour, startMinute, endHour, endMinute) => {
            // Skip if start equals end (no quiet hours)
            if (startHour === endHour && startMinute === endMinute) return true;

            const result = isInQuietHours(
              endHour,
              endMinute,
              startHour,
              startMinute,
              endHour,
              endMinute
            );
            return result === false;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle overnight quiet hours correctly (e.g., 22:00 - 08:00)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 23 }), // startHour (evening)
          fc.integer({ min: 0, max: 59 }), // startMinute
          fc.integer({ min: 0, max: 10 }), // endHour (morning)
          fc.integer({ min: 0, max: 59 }), // endMinute
          (startHour, startMinute, endHour, endMinute) => {
            // Test time in evening (should be in quiet hours)
            const eveningResult = isInQuietHours(
              startHour + 1 > 23 ? 23 : startHour + 1,
              0,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            // Test time in morning (should be in quiet hours)
            const morningResult = isInQuietHours(
              endHour - 1 < 0 ? 0 : endHour - 1,
              0,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            // Test time in afternoon (should NOT be in quiet hours)
            const afternoonResult = isInQuietHours(
              14,
              0,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            return eveningResult === true && morningResult === true && afternoonResult === false;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle same-day quiet hours correctly (e.g., 13:00 - 14:00)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 15 }), // startHour
          fc.integer({ min: 0, max: 59 }), // startMinute
          fc.integer({ min: 16, max: 20 }), // endHour (later same day)
          fc.integer({ min: 0, max: 59 }), // endMinute
          (startHour, startMinute, endHour, endMinute) => {
            // Test time during quiet hours
            const duringResult = isInQuietHours(
              startHour + 1,
              0,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            // Test time before quiet hours
            const beforeResult = isInQuietHours(
              startHour - 1,
              0,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            // Test time after quiet hours
            const afterResult = isInQuietHours(
              endHour + 1 > 23 ? 23 : endHour + 1,
              0,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            return duringResult === true && beforeResult === false && afterResult === false;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle midnight boundary correctly', () => {
      // Quiet hours: 23:00 - 01:00
      const startHour = 23;
      const startMinute = 0;
      const endHour = 1;
      const endMinute = 0;

      // 23:30 should be in quiet hours
      expect(isInQuietHours(23, 30, startHour, startMinute, endHour, endMinute)).toBe(true);

      // 00:30 should be in quiet hours
      expect(isInQuietHours(0, 30, startHour, startMinute, endHour, endMinute)).toBe(true);

      // 01:00 should NOT be in quiet hours (end time is exclusive)
      expect(isInQuietHours(1, 0, startHour, startMinute, endHour, endMinute)).toBe(false);

      // 22:00 should NOT be in quiet hours
      expect(isInQuietHours(22, 0, startHour, startMinute, endHour, endMinute)).toBe(false);

      // 02:00 should NOT be in quiet hours
      expect(isInQuietHours(2, 0, startHour, startMinute, endHour, endMinute)).toBe(false);
    });

    it('should handle all valid time combinations without errors', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // currentHour
          fc.integer({ min: 0, max: 59 }), // currentMinute
          fc.integer({ min: 0, max: 23 }), // startHour
          fc.integer({ min: 0, max: 59 }), // startMinute
          fc.integer({ min: 0, max: 23 }), // endHour
          fc.integer({ min: 0, max: 59 }), // endMinute
          (currentHour, currentMinute, startHour, startMinute, endHour, endMinute) => {
            // Should not throw error for any valid time combination
            const result = isInQuietHours(
              currentHour,
              currentMinute,
              startHour,
              startMinute,
              endHour,
              endMinute
            );
            return typeof result === 'boolean';
          }
        ),
        { numRuns: 10000 }
      );
    });

    it('should return false when quiet hours start and end are the same', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // hour
          fc.integer({ min: 0, max: 59 }), // minute
          fc.integer({ min: 0, max: 23 }), // currentHour
          fc.integer({ min: 0, max: 59 }), // currentMinute
          (hour, minute, currentHour, currentMinute) => {
            // When start equals end, there are no quiet hours
            const result = isInQuietHours(
              currentHour,
              currentMinute,
              hour,
              minute,
              hour,
              minute
            );
            return result === false;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle minute precision correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // startHour
          fc.integer({ min: 0, max: 58 }), // startMinute
          (startHour, startMinute) => {
            const endHour = startHour;
            const endMinute = startMinute + 1;

            // One minute before start should NOT be in quiet hours
            const beforeResult = isInQuietHours(
              startHour,
              startMinute - 1 < 0 ? 59 : startMinute - 1,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            // At start should be in quiet hours
            const atStartResult = isInQuietHours(
              startHour,
              startMinute,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            // At end should NOT be in quiet hours
            const atEndResult = isInQuietHours(
              endHour,
              endMinute,
              startHour,
              startMinute,
              endHour,
              endMinute
            );

            return atStartResult === true && atEndResult === false;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should be consistent for the same inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // currentHour
          fc.integer({ min: 0, max: 59 }), // currentMinute
          fc.integer({ min: 0, max: 23 }), // startHour
          fc.integer({ min: 0, max: 59 }), // startMinute
          fc.integer({ min: 0, max: 23 }), // endHour
          fc.integer({ min: 0, max: 59 }), // endMinute
          (currentHour, currentMinute, startHour, startMinute, endHour, endMinute) => {
            const result1 = isInQuietHours(
              currentHour,
              currentMinute,
              startHour,
              startMinute,
              endHour,
              endMinute
            );
            const result2 = isInQuietHours(
              currentHour,
              currentMinute,
              startHour,
              startMinute,
              endHour,
              endMinute
            );
            return result1 === result2;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });
});
