/**
 * Budget Overview Component
 * Displays high-level budget summary with income, savings, expenses, and remaining balance
 */

import React from 'react';
import { Budget } from '../../contexts/BudgetContext';

// ============================================================================
// Types
// ============================================================================

interface BudgetOverviewProps {
  budget: Budget | null;
  loading?: boolean;
}

// ============================================================================
// Budget Overview Component
// ============================================================================

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  budget,
  loading = false
}) => {
  // ============================================================================
  // Render Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render No Budget State
  // ============================================================================

  if (!budget) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ready to Start Budgeting
          </h3>
          <p className="text-gray-500 mb-4">
            Use the "Add Income", "Add Savings", or "Add Expense" buttons below to get started.
          </p>
          <p className="text-sm text-blue-600">
            Your budget will be created automatically when you add your first item!
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Calculate Progress Percentages
  // ============================================================================

  const incomeProgress = budget.totalIncome > 0 ? 100 : 0;
  const savingsProgress = budget.totalIncome > 0
    ? Math.min((budget.totalSavings / budget.totalIncome) * 100, 100)
    : 0;
  const expensesProgress = budget.totalIncome > 0
    ? Math.min((budget.totalExpenses / budget.totalIncome) * 100, 100)
    : 0;

  // Determine remaining balance color
  const remainingBalanceColor = budget.remainingBalance > 0
    ? 'text-green-600'
    : budget.remainingBalance < 0
      ? 'text-red-600'
      : 'text-gray-600';

  const remainingBalanceIcon = budget.remainingBalance > 0
    ? '✓'
    : budget.remainingBalance < 0
      ? '⚠'
      : '=';

  // ============================================================================
  // Render Budget Overview
  // ============================================================================

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">
          Budget Overview - {formatMonth(budget.month)}
        </h2>
        {budget.isAIGenerated && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            AI Generated
          </span>
        )}
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Income */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Income</p>
              <p className="text-2xl font-bold text-green-900">
                ${budget.totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="text-green-400 text-2xl">💰</div>
          </div>
          <div className="mt-2">
            <div className="bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${incomeProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Savings */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Savings</p>
              <p className="text-2xl font-bold text-blue-900">
                ${budget.totalSavings.toLocaleString()}
              </p>
            </div>
            <div className="text-blue-400 text-2xl">🏦</div>
          </div>
          <div className="mt-2">
            <div className="bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${savingsProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {savingsProgress.toFixed(1)}% of income
            </p>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Expenses</p>
              <p className="text-2xl font-bold text-orange-900">
                ${budget.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="text-orange-400 text-2xl">🛒</div>
          </div>
          <div className="mt-2">
            <div className="bg-orange-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${expensesProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              {expensesProgress.toFixed(1)}% of income
            </p>
          </div>
        </div>

        {/* Remaining Balance */}
        <div className={`${budget.remainingBalance >= 0 ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${budget.remainingBalance >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
                Remaining
              </p>
              <p className={`text-2xl font-bold ${remainingBalanceColor}`}>
                ${Math.abs(budget.remainingBalance).toLocaleString()}
              </p>
            </div>
            <div className={`text-2xl ${remainingBalanceColor}`}>
              {remainingBalanceIcon}
            </div>
          </div>
          <div className="mt-2">
            <p className={`text-xs ${remainingBalanceColor}`}>
              {budget.remainingBalance > 0
                ? 'Money left to allocate'
                : budget.remainingBalance < 0
                  ? 'Over budget'
                  : 'Perfectly balanced'}
            </p>
          </div>
        </div>
      </div>

      {/* Zero-Based Budgeting Status */}
      <div className={`rounded-lg p-4 ${budget.remainingBalance === 0
        ? 'bg-green-50 border border-green-200'
        : 'bg-yellow-50 border border-yellow-200'
        }`}>
        <div className="flex items-center">
          <div className={`text-2xl mr-3 ${budget.remainingBalance === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
            {budget.remainingBalance === 0 ? '🎯' : '⚖️'}
          </div>
          <div>
            <h3 className={`text-sm font-medium ${budget.remainingBalance === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
              {budget.remainingBalance === 0
                ? 'Perfect Zero-Based Budget!'
                : 'Zero-Based Budget Status'}
            </h3>
            <p className={`text-sm ${budget.remainingBalance === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
              {budget.remainingBalance === 0
                ? 'Every dollar has been allocated. Great job!'
                : `You need to ${budget.remainingBalance > 0 ? 'allocate' : 'reduce'} $${Math.abs(budget.remainingBalance).toLocaleString()} to achieve zero-based budgeting.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

function formatMonth(monthString: string | undefined): string {
  if (!monthString) return 'Unknown Month';
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });
}
