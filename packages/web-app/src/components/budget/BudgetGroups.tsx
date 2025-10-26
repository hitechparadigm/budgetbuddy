/**
 * Budget Groups Component
 * Displays expandable/collapsible budget groups (Income, Savings, Expenses)
 */

import React, { useState } from 'react';
import { BudgetGroup } from '../../contexts/BudgetContext';

// ============================================================================
// Types
// ============================================================================

interface BudgetGroupsProps {
  groups: {
    income: BudgetGroup[];
    savings: BudgetGroup[];
    expenses: BudgetGroup[];
  };
  loading?: boolean;
}

interface BudgetGroupCardProps {
  group: BudgetGroup;
  groupType: 'income' | 'savings' | 'expenses';
  isExpanded: boolean;
  onToggle: () => void;
}

// ============================================================================
// Budget Groups Component
// ============================================================================

export const BudgetGroups: React.FC<BudgetGroupsProps> = ({
  groups,
  loading = false
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // ============================================================================
  // Render Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ============================================================================
  // Render Budget Groups
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Income Groups */}
      {groups.income.map((group, index) => (
        <BudgetGroupCard
          key={`income-${index}`}
          group={group}
          groupType="income"
          isExpanded={expandedGroups.has(`income-${index}`)}
          onToggle={() => toggleGroup(`income-${index}`)}
        />
      ))}

      {/* Savings Groups */}
      {groups.savings.map((group, index) => (
        <BudgetGroupCard
          key={`savings-${index}`}
          group={group}
          groupType="savings"
          isExpanded={expandedGroups.has(`savings-${index}`)}
          onToggle={() => toggleGroup(`savings-${index}`)}
        />
      ))}

      {/* Expense Groups */}
      {groups.expenses.map((group, index) => (
        <BudgetGroupCard
          key={`expenses-${index}`}
          group={group}
          groupType="expenses"
          isExpanded={expandedGroups.has(`expenses-${index}`)}
          onToggle={() => toggleGroup(`expenses-${index}`)}
        />
      ))}

      {/* Empty State */}
      {groups.income.length === 0 && groups.savings.length === 0 && groups.expenses.length === 0 && (
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Budget Categories
            </h3>
            <p className="text-gray-500 mb-4">
              Add income, savings, and expense categories to start budgeting.
            </p>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Add Categories
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Budget Group Card Component
// ============================================================================

const BudgetGroupCard: React.FC<BudgetGroupCardProps> = ({
  group,
  groupType,
  isExpanded,
  onToggle,
}) => {
  // ============================================================================
  // Calculate Progress
  // ============================================================================

  const progressPercentage = group.totalPlanned > 0
    ? Math.min((group.totalSpent / group.totalPlanned) * 100, 100)
    : 0;

  const isOverBudget = group.totalSpent > group.totalPlanned && group.totalPlanned > 0;

  // ============================================================================
  // Group Type Styling
  // ============================================================================

  const getGroupStyling = (type: string) => {
    switch (type) {
      case 'income':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          progressColor: 'bg-green-600',
          progressBg: 'bg-green-200',
          icon: '💰',
        };
      case 'savings':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          progressColor: 'bg-blue-600',
          progressBg: 'bg-blue-200',
          icon: '🏦',
        };
      case 'expenses':
        return {
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          progressColor: isOverBudget ? 'bg-red-600' : 'bg-orange-600',
          progressBg: isOverBudget ? 'bg-red-200' : 'bg-orange-200',
          icon: '🛒',
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          progressColor: 'bg-gray-600',
          progressBg: 'bg-gray-200',
          icon: '📊',
        };
    }
  };

  const styling = getGroupStyling(groupType);

  // ============================================================================
  // Render Group Card
  // ============================================================================

  return (
    <div className={`bg-white shadow rounded-lg border ${styling.borderColor}`}>
      {/* Group Header */}
      <div
        className={`${styling.bgColor} px-6 py-4 cursor-pointer`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{styling.icon}</span>
            <div>
              <h3 className={`text-lg font-medium ${styling.textColor}`}>
                {group.groupName}
              </h3>
              <p className={`text-sm ${styling.textColor} opacity-75`}>
                {group.categories.length} {group.categories.length === 1 ? 'category' : 'categories'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className={`text-lg font-bold ${styling.textColor}`}>
                ${group.totalSpent.toLocaleString()} / ${group.totalPlanned.toLocaleString()}
              </p>
              <p className={`text-sm ${styling.textColor} opacity-75`}>
                ${group.totalRemaining.toLocaleString()} remaining
              </p>
            </div>
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className={`w-5 h-5 ${styling.textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className={`${styling.progressBg} rounded-full h-2`}>
            <div
              className={`${styling.progressColor} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${styling.textColor} opacity-75`}>
              {progressPercentage.toFixed(1)}% used
            </span>
            {isOverBudget && (
              <span className="text-xs text-red-600 font-medium">
                Over budget by ${(group.totalSpent - group.totalPlanned).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Categories */}
      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-200">
          {group.categories.length > 0 ? (
            <div className="space-y-3">
              {group.categories.map((category) => (
                <div key={category.categoryId} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{category.icon || '📊'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {category.categoryName}
                      </p>
                      {category.isCustom && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Custom
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${category.spentAmount.toLocaleString()} / ${category.plannedAmount.toLocaleString()}
                    </p>
                    <p className={`text-xs ${category.remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(category.remainingAmount).toLocaleString()} {category.remainingAmount >= 0 ? 'left' : 'over'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                No categories in this group yet.
              </p>
              <button className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Add Category
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
