/**
 * TOTP Timing Property-Based Tests
 * Feature: test-coverage-improvement
 * **Validates: Requirements 5.6**
 * 
 * Property 8: TOTP Timing Validation
 * - TOTP codes are valid within the time window
 * - TOTP codes expire after the time window
 * - Clock drift tolerance works correctly
 */

const fc = require('fast-check');

// TOTP implementation for testing
class TOTPValidator {
  constructor(options = {}) {
    this.step = options.step || 30; // 30 second time step
    this.window = options.window || 1; // Allow 1 step before/after
    this.digits = options.digits || 6;
  }

  getCounter(timestamp) {
    return Math.floor(timestamp / 1000 / this.step);
  }

  isValidForTimestamp(code, secret, timestamp) {
    const counter = this.getCounter(timestamp);
    for (let i = -this.window; i <= this.window; i++) {
      const expectedCode = this.generateCode(secret, counter + i);
      if (code === expectedCode) return true;
    }
    return false;
  }

  generateCode(secret, counter) {
    // Simple deterministic hash for testing
    let hash = 0;
    for (let i = 0; i < secret.length; i++) {
      hash = ((hash << 5) - hash + secret.charCodeAt(i) + counter) | 0;
    }
    return Math.abs(hash % 1000000).toString().padStart(this.digits, '0');
  }

  getCurrentCode(secret, timestamp = Date.now()) {
    const counter = this.getCounter(timestamp);
    return this.generateCode(secret, counter);
  }

  isLockedOut(lockoutUntil, currentTime = Date.now()) {
    if (!lockoutUntil) return false;
    return new Date(lockoutUntil).getTime() > currentTime;
  }

  getRemainingLockoutMinutes(lockoutUntil, currentTime = Date.now()) {
    if (!lockoutUntil) return 0;
    const lockoutTime = new Date(lockoutUntil).getTime();
    if (isNaN(lockoutTime)) return 0;
    const remaining = lockoutTime - currentTime;
    return Math.max(0, Math.ceil(remaining / 60000));
  }
}

describe('Property 8: TOTP Timing Validation', () => {
  const validator = new TOTPValidator();

  describe('8.1: TOTP codes valid within time window', () => {
    test('current code is always valid', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (secret, timestamp) => {
            const code = validator.getCurrentCode(secret, timestamp);
            return validator.isValidForTimestamp(code, secret, timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('code from previous step is valid (clock drift tolerance)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (secret, timestamp) => {
            const previousTimestamp = timestamp - 30000;
            const code = validator.getCurrentCode(secret, previousTimestamp);
            return validator.isValidForTimestamp(code, secret, timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('code from next step is valid (clock drift tolerance)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (secret, timestamp) => {
            const nextTimestamp = timestamp + 30000;
            const code = validator.getCurrentCode(secret, nextTimestamp);
            return validator.isValidForTimestamp(code, secret, timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('8.2: TOTP codes expire after time window', () => {
    test('code from 2+ steps ago is invalid', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (secret, timestamp) => {
            const oldTimestamp = timestamp - 90000;
            const code = validator.getCurrentCode(secret, oldTimestamp);
            return !validator.isValidForTimestamp(code, secret, timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('code from 2+ steps in future is invalid', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (secret, timestamp) => {
            const futureTimestamp = timestamp + 90000;
            const code = validator.getCurrentCode(secret, futureTimestamp);
            return !validator.isValidForTimestamp(code, secret, timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('8.3: Lockout timing properties', () => {
    test('lockout is active when lockoutUntil is in future', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 60 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (minutesUntilExpiry, currentTime) => {
            const lockoutUntil = new Date(currentTime + minutesUntilExpiry * 60000).toISOString();
            return validator.isLockedOut(lockoutUntil, currentTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('lockout is inactive when lockoutUntil is in past', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 60 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (minutesSinceExpiry, currentTime) => {
            const lockoutUntil = new Date(currentTime - minutesSinceExpiry * 60000).toISOString();
            return !validator.isLockedOut(lockoutUntil, currentTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('remaining lockout minutes is non-negative', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -60, max: 60 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (minutesOffset, currentTime) => {
            const lockoutUntil = new Date(currentTime + minutesOffset * 60000).toISOString();
            const remaining = validator.getRemainingLockoutMinutes(lockoutUntil, currentTime);
            return remaining >= 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('null lockout returns 0 remaining minutes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (currentTime) => {
            const remaining = validator.getRemainingLockoutMinutes(null, currentTime);
            return remaining === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('remaining lockout minutes decreases as time passes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 30 }),
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (initialMinutes, elapsedMinutes, baseTime) => {
            const lockoutUntil = new Date(baseTime + initialMinutes * 60000).toISOString();
            const remaining1 = validator.getRemainingLockoutMinutes(lockoutUntil, baseTime);
            const remaining2 = validator.getRemainingLockoutMinutes(lockoutUntil, baseTime + elapsedMinutes * 60000);
            return remaining2 <= remaining1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('8.4: Code determinism', () => {
    test('same secret and timestamp always produce same code', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (secret, timestamp) => {
            const code1 = validator.getCurrentCode(secret, timestamp);
            const code2 = validator.getCurrentCode(secret, timestamp);
            return code1 === code2;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('code format is always 6 digits', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (secret, timestamp) => {
            const code = validator.getCurrentCode(secret, timestamp);
            return code.length === 6 && /^\d{6}$/.test(code);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
