/**
 * Budget Planning Modal
 *
 * Allows users to create and edit monthly budgets by setting
 * planned amounts for each category. Integrates with the unified
 * category system and provides real-time budget calculations.
 */

import React, { useState, useEffect } from "react";
import {
  DEFAULT_CATEGORIES,
  Category,
  CategoryGroup,
} from "../../../../shared/src/types/categories";
import {
  MonthlyBudget,
  BudgetGroup,
  BudgetCategory,
} from "../../../../shared/src/types/budget";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

interface BudgetPlanningModalProps {
  isOpen: boolean;
  currentMonth: number;
  currentYear: number;
  existingBudget?: MonthlyBudget;
  currency?: string;
  onClose: () => void;
  onSubmit: (budgetData: MonthlyBudget) => void;
  loading?: boolean;
}

export const BudgetPlanningModal: React.FC<BudgetPlanningModalProps> = ({
  isOpen,
  currentMonth,
  currentYear,
  existingBudget,
  currency = "USD",
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [budgetCategories, setBudgetCategories] = useState<
    Record<string, number>
  >({});
  const [activeGroup, setActiveGroup] = useState<
    "income" | "savings" | "expense"
  >("income");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize budget categories
  useEffect(() => {
    if (existingBudget) {
      // Load existing budget amounts
      const categoryAmounts: Record<string, number> = {};
      existingBudget.groups.forEach((group) => {
        group.categories.forEach((category) => {
          categoryAmounts[category.categoryId] = category.plannedAmount;
        });
      });
      setBudgetCategories(categoryAmounts);
    } else {
      // Initialize with zeros
      const categoryAmounts: Record<string, number> = {};
      DEFAULT_CATEGORIES.forEach((group) => {
        group.categories.forEach((category) => {
          categoryAmounts[category.id] = 0;
        });
      });
      setBudgetCategories(categoryAmounts);
    }
  }, [existingBudget]);

  if (!isOpen) return null;

  const handleAmountChange = (categoryId: string, amount: number) => {
    // Ensure the amount is properly rounded to avoid floating point precision issues
    const roundedAmount = Math.round(amount * 100) / 100;

    setBudgetCategories((prev) => ({
      ...prev,
      [categoryId]: roundedAmount,
    }));

    // Clear error when user starts typing
    if (errors[categoryId]) {
      setErrors((prev) => ({ ...prev, [categoryId]: "" }));
    }
  };

  const calculateTotals = () => {
    const totals = {
      income: 0,
      savings: 0,
      expense: 0,
    };

    DEFAULT_CATEGORIES.forEach((group) => {
      group.categories.forEach((category) => {
        const amount = budgetCategories[category.id] || 0;
        totals[group.type] += amount;
      });
    });

    return {
      ...totals,
      netBalance: totals.income - totals.savings - totals.expense,
      isBalanced: totals.income - totals.savings - totals.expense === 0,
    };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    // Validate budget
    const newErrors: Record<string, string> = {};

    // Check for negative amounts
    Object.entries(budgetCategories).forEach(([categoryId, amount]) => {
      if (amount < 0) {
        newErrors[categoryId] = "Amount cannot be negative";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build budget groups with category data
    const budgetGroups: BudgetGroup[] = DEFAULT_CATEGORIES.map(
      (categoryGroup) => {
        const categories: BudgetCategory[] = categoryGroup.categories.map(
          (category) => {
            const plannedAmount = budgetCategories[category.id] || 0;
            return {
              categoryId: category.id,
              categoryName: category.name,
              categoryIcon: category.icon,
              categoryColor: category.color,
              plannedAmount: plannedAmount,
              actualAmount: 0, // Will be updated by transactions
              remainingAmount: plannedAmount,
              percentageUsed: 0,
              isOverBudget: false,
              transactionCount: 0,
            };
          },
        );

        const groupTotal = categories.reduce(
          (sum, cat) => sum + cat.plannedAmount,
          0,
        );

        return {
          groupId: categoryGroup.id,
          groupName: categoryGroup.name,
          groupType: categoryGroup.type,
          groupColor: categoryGroup.color,
          totalPlanned: groupTotal,
          totalActual: 0,
          totalRemaining: groupTotal,
          categories: categories,
          order: categoryGroup.order,
          isCollapsed: false,
        };
      },
    );

    // Create complete budget data
    const budgetData: MonthlyBudget = {
      budgetId: existingBudget?.budgetId || `budget_${Date.now()}`,
      familyId: "family_123",
      month: `${currentYear}-${currentMonth.toString().padStart(2, "0")}`,
      year: currentYear,
      status: "active",
      isZeroBasedBudget: true,
      totalIncome: {
        planned: totals.income,
        actual: 0,
        remaining: totals.income,
      },
      totalSavings: {
        planned: totals.savings,
        actual: 0,
        remaining: totals.savings,
      },
      totalExpenses: {
        planned: totals.expense,
        actual: 0,
        remaining: totals.expense,
      },
      netBalance: { planned: totals.netBalance, actual: 0, variance: 0 },
      groups: budgetGroups,
      createdAt: existingBudget?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: existingBudget?.createdBy || "user_123",
      lastModifiedBy: "user_123",
      isAIGenerated: false,
      autoUpdateFromTransactions: true,
    };

    try {
      onSubmit(budgetData);
    } catch (error) {
      console.error("Error saving budget:", error);
    }
  };

  const getMonthName = () => {
    return new Date(currentYear, currentMonth - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const currentGroup = DEFAULT_CATEGORIES.find(
    (group) => group.type === activeGroup,
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              {existingBudget ? "Edit Budget" : "Create Budget"}
            </h2>
            <p className="text-gray-400 text-sm">{getMonthName()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Budget Summary */}
        <div className="p-6 border-b border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-green-900 bg-opacity-30 p-3 rounded-lg border border-green-700">
              <div className="text-green-400 text-sm font-medium">Income</div>
              <div className="text-green-300 text-lg font-bold">
                {formatCurrency(totals.income, currency)}
              </div>
            </div>

            <div className="bg-blue-900 bg-opacity-30 p-3 rounded-lg border border-blue-700">
              <div className="text-blue-400 text-sm font-medium">Savings</div>
              <div className="text-blue-300 text-lg font-bold">
                {formatCurrency(totals.savings, currency)}
              </div>
            </div>

            <div className="bg-red-900 bg-opacity-30 p-3 rounded-lg border border-red-700">
              <div className="text-red-400 text-sm font-medium">Expenses</div>
              <div className="text-red-300 text-lg font-bold">
                {formatCurrency(totals.expense, currency)}
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border ${
                totals.isBalanced
                  ? "bg-green-900 bg-opacity-30 border-green-700"
                  : totals.netBalance > 0
                    ? "bg-yellow-900 bg-opacity-30 border-yellow-700"
                    : "bg-red-900 bg-opacity-30 border-red-700"
              }`}
            >
              <div
                className={`text-sm font-medium ${
                  totals.isBalanced ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {totals.isBalanced ? "Balanced" : "Remaining"}
              </div>
              <div
                className={`text-lg font-bold ${
                  totals.isBalanced
                    ? "text-green-300"
                    : totals.netBalance > 0
                      ? "text-yellow-300"
                      : "text-red-300"
                }`}
              >
                {formatCurrency(Math.abs(totals.netBalance), currency)}
              </div>
            </div>
          </div>

          {!totals.isBalanced && (
            <div className="mt-4 text-center">
              <p
                className={`text-sm ${
                  totals.netBalance > 0 ? "text-yellow-400" : "text-red-400"
                }`}
              >
                {totals.netBalance > 0
                  ? `You have ${formatCurrency(totals.netBalance, currency, { showSymbol: false })} unallocated income`
                  : `You are over budget by ${formatCurrency(Math.abs(totals.netBalance), currency, { showSymbol: false })}`}
              </p>
            </div>
          )}
        </div>

        {/* Category Group Tabs */}
        <div className="flex border-b border-gray-700">
          {DEFAULT_CATEGORIES.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.type)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeGroup === group.type
                  ? "text-white border-b-2 border-blue-500 bg-gray-800"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>

        {/* Category List */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {currentGroup?.categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center space-x-4 p-3 bg-gray-800 rounded-lg"
            >
              {/* Category Icon and Name */}
              <div className="flex items-center space-x-3 flex-1">
                <div
                  className={`w-10 h-10 rounded-full ${category.color} flex items-center justify-center text-white`}
                >
                  {category.icon}
                </div>
                <div>
                  <div className="text-white font-medium">{category.name}</div>
                  <div className="text-gray-400 text-sm">
                    {activeGroup === "income"
                      ? "Expected income"
                      : activeGroup === "savings"
                        ? "Savings goal"
                        : "Spending limit"}
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={budgetCategories[category.id] || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      handleAmountChange(category.id, 0);
                    } else {
                      // Convert to number and handle precision properly
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        // Round to 2 decimal places to avoid floating point precision issues
                        const roundedValue = Math.round(numValue * 100) / 100;
                        handleAmountChange(category.id, roundedValue);
                      }
                    }
                  }}
                  className={`w-32 bg-gray-700 border ${
                    errors[category.id] ? "border-red-500" : "border-gray-600"
                  } rounded px-3 py-2 text-white text-right focus:outline-none focus:border-blue-500`}
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {totals.isBalanced ? (
              <span className="text-green-400">✓ Budget is balanced</span>
            ) : (
              <span className="text-yellow-400">⚠ Budget needs adjustment</span>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Budget"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPlanningModal;
