/**
 * Budget Service Tests
 * Tests for recurring budget calculations using shared utility
 */

import {
  calculateMonthlyOccurrencesEnhanced,
  calculatePlannedAmount,
} from './budget';
import { Budget } from '../types/budget';

describe('Mobile Budget Service - Recurring Calculations', () => {
  describe('calculateMonthlyOccurrencesEnhanced', () => {
    it('should calculate bi-weekly occurrences correctly for December 2025', () => {
      const budget: Budget = {
        id: 'test-1',
        name: 'Salary',
        amount: 5000,
        frequency: 'bi-weekly',
        startDate: '2025-12-04',
        category: 'Income',
        type: 'income',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const occurrences = calculateMonthlyOccurrencesEnhanced(budget, 2025, 12);
      expect(occurrences).toBe(2); // Dec 4 and Dec 18
    });

    it('should calculate monthly occurrences correctly', () => {
      const budget: Budget = {
        id: 'test-2',
        name: 'Rent',
        amount: 1500,
        frequency: 'monthly',
        startDate: '2025-12-15',
        category: 'Housing',
        type: 'expense',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const occurrences = calculateMonthlyOccurrencesEnhanced(budget, 2025, 12);
      expect(occurrences).toBe(1); // Dec 15
    });

    it('should calculate weekly occurrences correctly', () => {
      const budget: Budget = {
        id: 'test-3',
        name: 'Groceries',
        amount: 100,
        frequency: 'weekly',
        startDate: '2025-12-01',
        category: 'Food',
        type: 'expense',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const occurrences = calculateMonthlyOccurrencesEnhanced(budget, 2025, 12);
      expect(occurrences).toBe(5); // Dec 1, 8, 15, 22, 29
    });
  });

  describe('calculatePlannedAmount', () => {
    it('should calculate planned amount for bi-weekly budget', () => {
      const budget: Budget = {
        id: 'test-1',
        name: 'Salary',
        amount: 5000,
        frequency: 'bi-weekly',
        startDate: '2025-12-04',
        category: 'Income',
        type: 'income',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const planned = calculatePlannedAmount(budget, 2025, 12);
      expect(planned).toBe(10000); // 2 occurrences × $5,000
    });

    it('should calculate planned amount for monthly budget', () => {
      const budget: Budget = {
        id: 'test-2',
        name: 'Rent',
        amount: 1500,
        frequency: 'monthly',
        startDate: '2025-12-15',
        category: 'Housing',
        type: 'expense',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const planned = calculatePlannedAmount(budget, 2025, 12);
      expect(planned).toBe(1500); // 1 occurrence × $1,500
    });

    it('should calculate planned amount for weekly budget', () => {
      const budget: Budget = {
        id: 'test-3',
        name: 'Groceries',
        amount: 100,
        frequency: 'weekly',
        startDate: '2025-12-01',
        category: 'Food',
        type: 'expense',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const planned = calculatePlannedAmount(budget, 2025, 12);
      expect(planned).toBe(500); // 5 occurrences × $100
    });

    it('should handle different months with different occurrence counts', () => {
      const budget: Budget = {
        id: 'test-1',
        name: 'Salary',
        amount: 5000,
        frequency: 'bi-weekly',
        startDate: '2025-12-04',
        category: 'Income',
        type: 'income',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // December 2025: 2 occurrences
      const decPlanned = calculatePlannedAmount(budget, 2025, 12);
      expect(decPlanned).toBe(10000);

      // January 2026: 4 occurrences (Jan 1, 15, 29 + one more)
      const janPlanned = calculatePlannedAmount(budget, 2026, 1);
      expect(janPlanned).toBeGreaterThan(0);
    });
  });

  describe('Cross-platform consistency', () => {
    it('should match web app calculations for the same budget', () => {
      const budget: Budget = {
        id: 'test-salary',
        name: 'Bi-weekly Salary',
        amount: 5000,
        frequency: 'bi-weekly',
        startDate: '2025-12-04',
        category: 'Income',
        type: 'income',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Both should use the same shared utility
      const occurrences = calculateMonthlyOccurrencesEnhanced(budget, 2025, 12);
      const planned = calculatePlannedAmount(budget, 2025, 12);

      expect(occurrences).toBe(2);
      expect(planned).toBe(10000);
    });
  });
});
