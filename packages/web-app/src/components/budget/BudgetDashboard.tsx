/**
 * Budget Dashboard Component
 *
 * Shows budget vs actual comparison with progress bars,
 * category breakdowns, and real-time updates from transactions.
 */

import React, { useState, useEffect } from 'react';
import { MonthlyBudget } from '../../../../shared/src/types/budget';
import { DEFAULT_CATEGORIES, getCategoryById } from '../../../../shared/src/types/categories';
import BudgetPlanningModal from './BudgetPlanningModal';
import { saveBudgetToStorage, getBudgetFromStorage } from '../../utils/budgetStorage';

interface BudgetDashboardProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  currentMonth,
  currentYear,
  onMonthChange
}) => {
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load budget from storage on mount or month change
  useEffect(() => {
    const storedBudget = getBudgetFromStorage(currentMonth, currentYear);
    if (storedBudget) {
      setBudget(storedBudget);
    } else {
      setBudget(getDefaultBudget());
    }
  }, [currentMonth, currentYear]);

  // Create default budget structure
  const getDefaultBudget = (): MonthlyBudget => ({
    budgetId: 'budget_001',
    month: `${currentYear}-${currentMonth.toString().padStart(2, '0')}`,
    year: currentYear,
    status: 'active',
    isZeroBasedBudget: true,
    totalIncome: {
      planned: 3500,
      actual: 3000,
      remaining: 500
    },
    totalSavings: {
      planned: 700,
      actual: 500,
      remaining: 200
    },
    totalExpenses: {
      planned: 2800,
      actual: 1850,
      remaining: 950
    },
    netBalance: {
      planned: 0,
      actual: 650,
      variance: 650
    },
    groups: [
      {
        groupId: 'income_group',
        groupName: 'Income',
        groupType: 'income',
        groupColor: 'green',
        totalPlanned: 3500,
        totalActual: 3000,
        totalRemaining: 500,
        order: 1,
        isCollapsed: false,
        categories: [
          {
            categoryId: 'cat_salary',
            categoryName: 'Salary',
            categoryIcon: '💰',
            categoryColor: 'bg-blue-600',
            plannedAmount: 3000,
            actualAmount: 3000,
            remainingAmount: 0,
            percentageUsed: 100,
            isOverBudget: false,
            transactionCount: 1,
            lastTransactionDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
          },
          {
            categoryId: 'cat_investment',
            categoryName: 'Investment',
            categoryIcon: '📈',
            categoryColor: 'bg-green-600',
            plannedAmount: 500,
            actualAmount: 0,
            remainingAmount: 500,
            percentageUsed: 0,
            isOverBudget: false,
            transactionCount: 0
          }
        ]
      },
      {
        groupId: 'savings_group',
        groupName: 'Savings',
        groupType: 'savings',
        groupColor: 'blue',
        totalPlanned: 700,
        totalActual: 500,
        totalRemaining: 200,
        order: 2,
        isCollapsed: false,
        categories: [
          {
            categoryId: 'cat_emergency_fund',
            categoryName: 'Emergency Fund',
            categoryIcon: '🛡️',
            categoryColor: 'bg-red-600',
            plannedAmount: 500,
            actualAmount: 500,
            remainingAmount: 0,
            percentageUsed: 100,
            isOverBudget: false,
            transactionCount: 1
          },
          {
            categoryId: 'cat_retirement',
            categoryName: 'Retirement',
            categoryIcon: '🏖️',
            categoryColor: 'bg-blue-600',
            plannedAmount: 200,
            actualAmount: 0,
            remainingAmount: 200,
            percentageUsed: 0,
            isOverBudget: false,
            transactionCount: 0
          }
        ]
      },
      {
        groupId: 'expenses_group',
        groupName: 'Expenses',
        groupType: 'expense',
        groupColor: 'red',
        totalPlanned: 2800,
        totalActual: 1850,
        totalRemaining: 950,
        order: 3,
        isCollapsed: false,
        categories: [
          {
            categoryId: 'cat_groceries',
            categoryName: 'Groceries',
            categoryIcon: '🛒',
            categoryColor: 'bg-red-600',
            plannedAmount: 600,
            actualAmount: 225,
            remainingAmount: 375,
            percentageUsed: 37.5,
            isOverBudget: false,
            transactionCount: 3,
            lastTransactionDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-15`
          },
          {
            categoryId: 'cat_housing',
            categoryName: 'Housing',
            categoryIcon: '🏠',
            categoryColor: 'bg-brown-600',
            plannedAmount: 1200,
            actualAmount: 1200,
            remainingAmount: 0,
            percentageUsed: 100,
            isOverBudget: false,
            transactionCount: 1,
            lastTransactionDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
          },
          {
            categoryId: 'cat_utilities',
            categoryName: 'Utilities',
            categoryIcon: '⚡',
            categoryColor: 'bg-yellow-600',
            plannedAmount: 200,
            actualAmount: 0,
            remainingAmount: 200,
            percentageUsed: 0,
            isOverBudget: false,
            transactionCount: 0
          },
          {
            categoryId: 'cat_transportation',
            categoryName: 'Transportation',
            categoryIcon: '🚗',
            categoryColor: 'bg-blue-700',
            plannedAmount: 300,
            actualAmount: 125,
            remainingAmount: 175,
            percentageUsed: 41.7,
            isOverBudget: false,
            transactionCount: 2
          },
          {
            categoryId: 'cat_entertainment',
            categoryName: 'Entertainment',
            categoryIcon: '🎬',
            categoryColor: 'bg-purple-600',
            plannedAmount: 200,
            actualAmount: 150,
            remainingAmount: 50,
            percentageUsed: 75,
            isOverBudget: false,
            transactionCount: 4
          },
          {
            categoryId: 'cat_groceries',
            categoryName: 'Dining Out',
            categoryIcon: '🍽️',
            categoryColor: 'bg-orange-600',
            plannedAmount: 300,
            actualAmount: 150,
            remainingAmount: 150,
            percentageUsed: 50,
            isOverBudget: false,
            transactionCount: 6
          }
        ]
      }
    ],
    createdAt: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01T00:00:00Z`,
    updatedAt: new Date().toISOString(),
    createdBy: 'user_123',
    lastModifiedBy: 'user_123',
    isAIGenerated: false,
    autoUpdateFromTransactions: true
  });

  const handleBudgetUpdate = (updatedBudget: MonthlyBudget) => {
    setBudget(updatedBudget);
    saveBudgetToStorage(updatedBudget);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const getProgressColor = (percentageUsed: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'bg-red-500';
    if (percentageUsed >= 90) return 'bg-yellow-500';
    if (percentageUsed >= 75) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const handleCreateBudget = () => {
    setShowPlanningModal(true);
  };

  const handleBudgetCreated = (newBudget: MonthlyBudget) => {
    handleBudgetUpdate(newBudget);
    setShowPlanningModal(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold text-white mb-4">
          No Budget for {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <p className="text-gray-400 mb-6">
          Create a budget to start tracking your income and expenses for this month.
        </p>
        <button
          onClick={handleCreateBudget}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Create Budget
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Budget
          </h2>
          <button
            onClick={handleCreateBudget}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Edit Budget
          </button>
        </div>

        {/* Budget Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-4">
            <div className="text-green-400 text-sm font-medium">Total Income</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(budget.totalIncome.planned)}</div>
            <div className="text-sm text-gray-400">
              {formatCurrency(budget.totalIncome.actual)} actual
            </div>
          </div>

          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
            <div className="text-blue-400 text-sm font-medium">Total Savings</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(budget.totalSavings.planned)}</div>
            <div className="text-sm text-gray-400">
              {formatCurrency(budget.totalSavings.actual)} actual
            </div>
          </div>

          <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4">
            <div className="text-red-400 text-sm font-medium">Total Expenses</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(budget.totalExpenses.planned)}</div>
            <div className="text-sm text-gray-400">
              {formatCurrency(budget.totalExpenses.actual)} actual
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            budget.netBalance.planned >= 0
              ? 'bg-green-900 bg-opacity-30 border border-green-700'
              : 'bg-red-900 bg-opacity-30 border border-red-700'
          }`}>
            <div className={`text-sm font-medium ${
              budget.netBalance.planned >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              Net Balance
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(budget.netBalance.planned)}</div>
            <div className="text-sm text-gray-400">
              {budget.netBalance.planned >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </div>
        </div>

        {/* Zero-Based Budget Status */}
        {budget.isZeroBasedBudget && (
          <div className={`p-4 rounded-lg mb-6 ${
            Math.abs(budget.netBalance.planned) < 0.01
              ? 'bg-green-900 bg-opacity-30 border border-green-700'
              : 'bg-yellow-900 bg-opacity-30 border border-yellow-700'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {Math.abs(budget.netBalance.planned) < 0.01 ? '✅' : '⚠️'}
              </span>
              <span className={`font-medium ${
                Math.abs(budget.netBalance.planned) < 0.01 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {Math.abs(budget.netBalance.planned) < 0.01
                  ? 'Zero-Based Budget Achieved'
                  : 'Budget Not Balanced'
                }
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {Math.abs(budget.netBalance.planned) < 0.01
                ? 'Every dollar has been allocated to income, savings, or expenses.'
                : `You have ${formatCurrency(Math.abs(budget.netBalance.planned))} unallocated.`
              }
            </div>
          </div>
        )}
      </div>

      {/* Budget Categories by Group */}
      {budget.groups.map((group) => (
        <div key={group.groupId} className="bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${
                group.groupType === 'income' ? 'bg-green-500' :
                group.groupType === 'savings' ? 'bg-blue-500' : 'bg-red-500'
              }`}></span>
              <span>{group.groupName}</span>
            </h3>
            <div className="text-right">
              <div className="text-lg font-semibold text-white">
                {formatCurrency(group.totalActual)}
              </div>
              <div className="text-sm text-gray-400">
                of {formatCurrency(group.totalPlanned)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {group.categories.map((category) => (
              <div key={category.categoryId} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full ${category.categoryColor} flex items-center justify-center text-white text-sm`}>
                      {category.categoryIcon}
                    </div>
                    <div>
                      <div className="font-medium text-white">{category.categoryName}</div>
                      <div className="text-sm text-gray-400">
                        {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''}
                        {category.lastTransactionDate && (
                          <span> • Last: {new Date(category.lastTransactionDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">
                      {formatCurrency(category.actualAmount)}
                    </div>
                    <div className="text-sm text-gray-400">
                      of {formatCurrency(category.plannedAmount)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getProgressColor(category.percentageUsed, category.isOverBudget)
                    }`}
                    style={{ width: `${Math.min(category.percentageUsed, 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className={`${
                    category.isOverBudget ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {category.percentageUsed.toFixed(1)}% used
                  </span>
                  <span className={`${
                    category.remainingAmount >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {category.remainingAmount >= 0 ? 'Remaining: ' : 'Over by: '}
                    {formatCurrency(Math.abs(category.remainingAmount))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Budget Planning Modal */}
      <BudgetPlanningModal
        isOpen={showPlanningModal}
        onClose={() => setShowPlanningModal(false)}
        onSubmit={handleBudgetUpdate}
        currentMonth={currentMonth}
        currentYear={currentYear}
        existingBudget={budget}
      />
    </div>
  );
};

export default BudgetDashboard;
