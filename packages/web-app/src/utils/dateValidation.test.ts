/**
 * Date Validation Test Suite
 *
 * CRITICAL: Regression tests for transaction date validation (Requirements 11 & 14)
 * Bug: Users could add transactions with dates outside current budget month without warning
 * Root Cause: No date validation in transaction modal
 * Fix: Created date validation utilities with warning system
 *
 * These tests ensure the date validation bug doesn't happen again.
 */

import {
  validateTransactionDate,
  getCurrentMonth,
  formatMonthName,
  DateValidationResult
} from './dateValidation';

describe('dateValidation - Regression Tests for Requirements 11 & 14', () => {
  describe('validateTransactionDate', () => {
    describe('Valid dates (within current month)', () => {
      it('should return valid for transaction date in current month', () => {
        const result = validateTransactionDate('2025-11-15', '2025-11');
        expect(result.isValid).toBe(true);
        expect(result.warning).toBeUndefined();
        expect(result.suggestedMonth).toBeUndefined();
      });

      it('should return valid for first day of month', () => {
        const result = validateTransactionDate('2025-11-01', '2025-11');
        expect(result.isValid).toBe(true);
        expect(result.warning).toBeUndefined();
      });

      it('should return valid for last day of month', () => {
        const result = validateTransactionDate('2025-11-30', '2025-11');
        expect(result.isValid).toBe(true);
        expect(result.warning).toBeUndefined();
      });

      it('should return valid for middle of month', () => {
        const result = validateTransactionDate('2025-11-15', '2025-11');
        expect(result.isValid).toBe(true);
      });
    });

    describe('Invalid dates (outside current month)', () => {
      /**
       * CRITICAL TEST: Regression test for the original bug
       * User could add transaction with Dec 2 date while viewing Nov budget
       * No warning appeared, causing transactions to be added to wrong months
       */
      it('should return invalid for December date when viewing November budget', () => {
        const result = validateTransactionDate('2025-12-02', '2025-11');
        expect(result.isValid).toBe(false);
        expect(result.warning).toBeDefined();
        expect(result.warning).toContain('December 2025');
        expect(result.warning).toContain('November 2025');
        expect(result.suggestedMonth).toBe('2025-12');
        expect(result.transactionMonthName).toBe('December 2025');
        expect(result.currentMonthName).toBe('November 2025');
      });

      it('should return invalid for previous month date', () => {
        const result = validateTransactionDate('2025-10-15', '2025-11');
        expect(result.isValid).toBe(false);
        expect(result.warning).toContain('October 2025');
        expect(result.warning).toContain('November 2025');
        expect(result.suggestedMonth).toBe('2025-10');
      });

      it('should return invalid for next month date', () => {
        const result = validateTransactionDate('2025-12-15', '2025-11');
        expect(result.isValid).toBe(false);
        expect(result.warning).toContain('December 2025');
        expect(result.warning).toContain('November 2025');
        expect(result.suggestedMonth).toBe('2025-12');
      });

      it('should return invalid for date in different year', () => {
        const result = validateTransactionDate('2024-11-15', '2025-11');
        expect(result.isValid).toBe(false);
        expect(result.warning).toContain('November 2024');
        expect(result.warning).toContain('November 2025');
        expect(result.suggestedMonth).toBe('2024-11');
      });

      it('should return invalid for date many months in future', () => {
        const result = validateTransactionDate('2026-06-15', '2025-11');
        expect(result.isValid).toBe(false);
        expect(result.warning).toContain('June 2026');
        expect(result.warning).toContain('November 2025');
        expect(result.suggestedMonth).toBe('2026-06');
      });

      it('should return invalid for date many months in past', () => {
        const result = validateTransactionDate('2025-01-15', '2025-11');
        expect(result.isValid).toBe(false);
        expect(result.warning).toContain('January 2025');
        expect(result.warning).toContain('November 2025');
        expect(result.suggestedMonth).toBe('2025-01');
      });
    });

    describe('Edge cases', () => {
      it('should return valid for empty transaction date', () => {
        const result = validateTransactionDate('', '2025-11');
        expect(result.isValid).toBe(true);
        expect(result.warning).toBeUndefined();
      });

      it('should return valid for empty current month', () => {
        const result = validateTransactionDate('2025-11-15', '');
        expect(result.isValid).toBe(true);
        expect(result.warning).toBeUndefined();
      });

      it('should return valid when both are empty', () => {
        const result = validateTransactionDate('', '');
        expect(result.isValid).toBe(true);
        expect(result.warning).toBeUndefined();
      });

      it('should handle February in leap year', () => {
        const result = validateTransactionDate('2024-02-29', '2024-02');
        expect(result.isValid).toBe(true);
      });

      it('should handle February in non-leap year', () => {
        const result = validateTransactionDate('2025-02-28', '2025-02');
        expect(result.isValid).toBe(true);
      });

      it('should handle month boundaries correctly', () => {
        // Last day of November
        const nov30 = validateTransactionDate('2025-11-30', '2025-11');
        expect(nov30.isValid).toBe(true);

        // First day of December
        const dec1 = validateTransactionDate('2025-12-01', '2025-11');
        expect(dec1.isValid).toBe(false);
        expect(dec1.suggestedMonth).toBe('2025-12');
      });

      it('should handle year boundaries correctly', () => {
        // Last day of December
        const dec31 = validateTransactionDate('2025-12-31', '2025-12');
        expect(dec31.isValid).toBe(true);

        // First day of January next year
        const jan1 = validateTransactionDate('2026-01-01', '2025-12');
        expect(jan1.isValid).toBe(false);
        expect(jan1.suggestedMonth).toBe('2026-01');
      });
    });

    describe('Warning message format', () => {
      it('should include transaction month name in warning', () => {
        const result = validateTransactionDate('2025-12-02', '2025-11');
        expect(result.warning).toContain('December 2025');
      });

      it('should include current budget month name in warning', () => {
        const result = validateTransactionDate('2025-12-02', '2025-11');
        expect(result.warning).toContain('November 2025');
      });

      it('should have clear warning message structure', () => {
        const result = validateTransactionDate('2025-12-02', '2025-11');
        expect(result.warning).toMatch(/This transaction date \(.+\) is outside the current budget month \(.+\)/);
      });

      it('should provide suggested month for navigation', () => {
        const result = validateTransactionDate('2025-12-02', '2025-11');
        expect(result.suggestedMonth).toBe('2025-12');
      });

      it('should provide transaction month name for display', () => {
        const result = validateTransactionDate('2025-12-02', '2025-11');
        expect(result.transactionMonthName).toBe('December 2025');
      });

      it('should provide current month name for display', () => {
        const result = validateTransactionDate('2025-12-02', '2025-11');
        expect(result.currentMonthName).toBe('November 2025');
      });
    });

    describe('All months validation', () => {
      it('should correctly validate all 12 months', () => {
        const months = [
          { month: '2025-01', name: 'January' },
          { month: '2025-02', name: 'February' },
          { month: '2025-03', name: 'March' },
          { month: '2025-04', name: 'April' },
          { month: '2025-05', name: 'May' },
          { month: '2025-06', name: 'June' },
          { month: '2025-07', name: 'July' },
          { month: '2025-08', name: 'August' },
          { month: '2025-09', name: 'September' },
          { month: '2025-10', name: 'October' },
          { month: '2025-11', name: 'November' },
          { month: '2025-12', name: 'December' }
        ];

        months.forEach(({ month, name }) => {
          const validResult = validateTransactionDate(`${month}-15`, month);
          expect(validResult.isValid).toBe(true);

          const invalidResult = validateTransactionDate('2025-01-15', month);
          if (month !== '2025-01') {
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.warning).toContain(name);
          }
        });
      });
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const month = getCurrentMonth();
      expect(month).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should return a valid month (01-12)', () => {
      const month = getCurrentMonth();
      const monthPart = parseInt(month.split('-')[1]);
      expect(monthPart).toBeGreaterThanOrEqual(1);
      expect(monthPart).toBeLessThanOrEqual(12);
    });

    it('should return a valid year', () => {
      const month = getCurrentMonth();
      const yearPart = parseInt(month.split('-')[0]);
      expect(yearPart).toBeGreaterThan(2020);
      expect(yearPart).toBeLessThan(2100);
    });

    it('should pad month with leading zero', () => {
      const month = getCurrentMonth();
      const monthPart = month.split('-')[1];
      expect(monthPart).toHaveLength(2);
    });
  });

  describe('formatMonthName', () => {
    it('should format November 2025 correctly', () => {
      const formatted = formatMonthName('2025-11');
      expect(formatted).toBe('November 2025');
    });

    it('should format December 2025 correctly', () => {
      const formatted = formatMonthName('2025-12');
      expect(formatted).toBe('December 2025');
    });

    it('should format January 2026 correctly', () => {
      const formatted = formatMonthName('2026-01');
      expect(formatted).toBe('January 2026');
    });

    it('should format all months correctly', () => {
      const expectedMonths = [
        { input: '2025-01', expected: 'January 2025' },
        { input: '2025-02', expected: 'February 2025' },
        { input: '2025-03', expected: 'March 2025' },
        { input: '2025-04', expected: 'April 2025' },
        { input: '2025-05', expected: 'May 2025' },
        { input: '2025-06', expected: 'June 2025' },
        { input: '2025-07', expected: 'July 2025' },
        { input: '2025-08', expected: 'August 2025' },
        { input: '2025-09', expected: 'September 2025' },
        { input: '2025-10', expected: 'October 2025' },
        { input: '2025-11', expected: 'November 2025' },
        { input: '2025-12', expected: 'December 2025' }
      ];

      expectedMonths.forEach(({ input, expected }) => {
        const formatted = formatMonthName(input);
        expect(formatted).toBe(expected);
      });
    });

    it('should handle different years', () => {
      expect(formatMonthName('2024-11')).toBe('November 2024');
      expect(formatMonthName('2025-11')).toBe('November 2025');
      expect(formatMonthName('2026-11')).toBe('November 2026');
    });
  });

  /**
   * INTEGRATION TEST: Complete date validation flow
   * This test simulates the original bug scenario
   */
  describe('Integration: Complete date validation flow', () => {
    it('should detect and warn about December date in November budget', () => {
      // Simulate user viewing November 2025 budget
      const currentBudgetMonth = '2025-11';

      // User tries to add transaction with December 2 date
      const transactionDate = '2025-12-02';

      // Validate the date
      const result = validateTransactionDate(transactionDate, currentBudgetMonth);

      // Should detect the mismatch
      expect(result.isValid).toBe(false);

      // Should provide clear warning
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('December 2025');
      expect(result.warning).toContain('November 2025');

      // Should suggest correct month for navigation
      expect(result.suggestedMonth).toBe('2025-12');

      // Should provide month names for UI display
      expect(result.transactionMonthName).toBe('December 2025');
      expect(result.currentMonthName).toBe('November 2025');
    });

    it('should allow valid dates without warning', () => {
      const currentBudgetMonth = '2025-11';
      const transactionDate = '2025-11-15';

      const result = validateTransactionDate(transactionDate, currentBudgetMonth);

      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.suggestedMonth).toBeUndefined();
    });

    it('should handle month navigation scenario', () => {
      // User starts in November
      let currentMonth = '2025-11';
      const transactionDate = '2025-12-02';

      // Validate shows warning
      let result = validateTransactionDate(transactionDate, currentMonth);
      expect(result.isValid).toBe(false);
      expect(result.suggestedMonth).toBe('2025-12');

      // User switches to December
      currentMonth = result.suggestedMonth!;

      // Validate again - should be valid now
      result = validateTransactionDate(transactionDate, currentMonth);
      expect(result.isValid).toBe(true);
    });

    it('should handle edge case of month boundary', () => {
      const currentMonth = '2025-11';

      // Last day of November - valid
      const nov30 = validateTransactionDate('2025-11-30', currentMonth);
      expect(nov30.isValid).toBe(true);

      // First day of December - invalid
      const dec1 = validateTransactionDate('2025-12-01', currentMonth);
      expect(dec1.isValid).toBe(false);
      expect(dec1.suggestedMonth).toBe('2025-12');
    });
  });

  /**
   * PROPERTY-BASED TEST: Date validation properties
   */
  describe('Property-based tests', () => {
    it('should always return valid for dates in the same month', () => {
      const months = ['2025-01', '2025-02', '2025-03', '2025-11', '2025-12'];
      const days = [1, 5, 10, 15, 20, 25, 28];

      months.forEach(month => {
        days.forEach(day => {
          const date = `${month}-${String(day).padStart(2, '0')}`;
          const result = validateTransactionDate(date, month);
          expect(result.isValid).toBe(true);
        });
      });
    });

    it('should always return invalid for dates in different months', () => {
      const testCases = [
        { txDate: '2025-01-15', budgetMonth: '2025-02' },
        { txDate: '2025-03-15', budgetMonth: '2025-04' },
        { txDate: '2025-11-15', budgetMonth: '2025-12' },
        { txDate: '2025-12-15', budgetMonth: '2025-11' }
      ];

      testCases.forEach(({ txDate, budgetMonth }) => {
        const result = validateTransactionDate(txDate, budgetMonth);
        expect(result.isValid).toBe(false);
        expect(result.warning).toBeDefined();
        expect(result.suggestedMonth).toBeDefined();
      });
    });

    it('should always provide suggested month when invalid', () => {
      const testCases = [
        { txDate: '2025-01-15', budgetMonth: '2025-02', expected: '2025-01' },
        { txDate: '2025-12-15', budgetMonth: '2025-11', expected: '2025-12' },
        { txDate: '2024-11-15', budgetMonth: '2025-11', expected: '2024-11' }
      ];

      testCases.forEach(({ txDate, budgetMonth, expected }) => {
        const result = validateTransactionDate(txDate, budgetMonth);
        expect(result.suggestedMonth).toBe(expected);
      });
    });
  });
});
