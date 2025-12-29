/**
 * Tests for Recurring Budget Calculations
 */

import {
  calculateOccurrencesInMonth,
  getOccurrenceDatesInMonth,
  calculatePlannedMonthlyAmount
} from './recurringCalculations';

describe('Recurring Calculations', () => {
  describe('calculateOccurrencesInMonth', () => {
    it('should calculate 2 bi-weekly occurrences starting Dec 5', () => {
      const occurrences = calculateOccurrencesInMonth('bi-weekly', '2025-12-05', '2025-12');
      expect(occurrences).toBe(2); // Dec 5, Dec 19
    });

    it('should calculate 3 bi-weekly occurrences starting Dec 1', () => {
      const occurrences = calculateOccurrencesInMonth('bi-weekly', '2025-12-01', '2025-12');
      expect(occurrences).toBe(3); // Dec 1, Dec 15, Dec 29
    });

    it('should calculate 1 bi-weekly occurrence starting Dec 20', () => {
      const occurrences = calculateOccurrencesInMonth('bi-weekly', '2025-12-20', '2025-12');
      expect(occurrences).toBe(1); // Dec 20
    });

    it('should calculate 4-5 weekly occurrences', () => {
      const occurrences = calculateOccurrencesInMonth('weekly', '2025-12-01', '2025-12');
      expect(occurrences).toBeGreaterThanOrEqual(4);
      expect(occurrences).toBeLessThanOrEqual(5);
    });

    it('should calculate 1 monthly occurrence', () => {
      const occurrences = calculateOccurrencesInMonth('monthly', '2025-12-15', '2025-12');
      expect(occurrences).toBe(1);
    });

    it('should return 0 if start date is after the month', () => {
      const occurrences = calculateOccurrencesInMonth('bi-weekly', '2026-01-05', '2025-12');
      expect(occurrences).toBe(0);
    });
  });

  describe('getOccurrenceDatesInMonth', () => {
    it('should return correct dates for bi-weekly starting Dec 5', () => {
      const dates = getOccurrenceDatesInMonth('bi-weekly', '2025-12-05', '2025-12');
      expect(dates).toEqual(['2025-12-05', '2025-12-19']);
    });

    it('should return correct dates for bi-weekly starting Dec 1', () => {
      const dates = getOccurrenceDatesInMonth('bi-weekly', '2025-12-01', '2025-12');
      expect(dates).toEqual(['2025-12-01', '2025-12-15', '2025-12-29']);
    });

    it('should return empty array if start date is after the month', () => {
      const dates = getOccurrenceDatesInMonth('bi-weekly', '2026-01-05', '2025-12');
      expect(dates).toEqual([]);
    });
  });

  describe('calculatePlannedMonthlyAmount', () => {
    it('should calculate $10,000 for bi-weekly $5,000 starting Dec 5', () => {
      const amount = calculatePlannedMonthlyAmount(5000, 'bi-weekly', '2025-12-05', '2025-12');
      expect(amount).toBe(10000);
    });

    it('should calculate $15,000 for bi-weekly $5,000 starting Dec 1', () => {
      const amount = calculatePlannedMonthlyAmount(5000, 'bi-weekly', '2025-12-01', '2025-12');
      expect(amount).toBe(15000);
    });

    it('should calculate $5,000 for bi-weekly $5,000 starting Dec 20', () => {
      const amount = calculatePlannedMonthlyAmount(5000, 'bi-weekly', '2025-12-20', '2025-12');
      expect(amount).toBe(5000);
    });

    it('should calculate $5,000 for monthly $5,000', () => {
      const amount = calculatePlannedMonthlyAmount(5000, 'monthly', '2025-12-15', '2025-12');
      expect(amount).toBe(5000);
    });
  });
});
