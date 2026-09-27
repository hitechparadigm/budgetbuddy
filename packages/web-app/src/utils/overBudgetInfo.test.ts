/**
 * Unit Tests for calculateOverBudgetInfo
 *
 * Feature: web-app-followups
 */

import { calculateOverBudgetInfo } from "./overBudgetInfo";

describe("calculateOverBudgetInfo", () => {
  test("empty array returns zero count and undefined top category", () => {
    expect(calculateOverBudgetInfo([])).toEqual({
      overBudgetCount: 0,
      topOverBudgetCategory: undefined,
    });
  });

  test("all categories at or under budget returns zero count and undefined top category", () => {
    const result = calculateOverBudgetInfo([
      { name: "Groceries", plannedAmount: 500, spentAmount: 500 },
      { name: "Rent", plannedAmount: 1200, spentAmount: 1000 },
    ]);
    expect(result).toEqual({
      overBudgetCount: 0,
      topOverBudgetCategory: undefined,
    });
  });

  test("exactly one category over budget reports that category's name", () => {
    const result = calculateOverBudgetInfo([
      { name: "Groceries", plannedAmount: 500, spentAmount: 500 },
      { name: "Dining", plannedAmount: 100, spentAmount: 150 },
    ]);
    expect(result).toEqual({
      overBudgetCount: 1,
      topOverBudgetCategory: "Dining",
    });
  });

  test("two categories tied for the largest overage report the first one in input order", () => {
    const result = calculateOverBudgetInfo([
      { name: "First", plannedAmount: 100, spentAmount: 150 },
      { name: "Second", plannedAmount: 200, spentAmount: 250 },
    ]);
    expect(result).toEqual({
      overBudgetCount: 2,
      topOverBudgetCategory: "First",
    });
  });
});