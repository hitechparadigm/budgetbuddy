/**
 * Budget Groups Component
 * Displays expandable/collapsible budget groups (Income, Savings, Expenses)
 * Simplified design inspired by EveryDollar for easy budget management
 */

import React, { useState } from 'react';
import { BudgetGroup, Category } from '../../contexts/BudgetContext';

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
  onUpdateGroups?: (groups: {
    income: BudgetGroup[];
    savings: BudgetGroup[];
    expenses: BudgetGroup[];
  }) => void;
}

interface BudgetGroupCardProps {
  group: BudgetGroup;
  groupType: 'income' | 'savings' | 'expenses';
  isExpanded: boolean;
  onToggle: () => void;
  onAddCategory: () => void;
  onUpdateCategory: (category: Category, plannedAmount: number) => void;
}

// ============================================================================
// Budget Groups Component
// ============================================================================

export const BudgetGroups: React.FC<BudgetGroupsProps> = ({
  groups,
  loading = false,
  onUpdateGroups
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['income-0', 'savings-0', 'expenses-0'])); // Expand all by default

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

  const handleAddCategory = (groupKey: string) => {
    if (!onUpdateGroups) return;

    const [type, indexStr] = groupKey.split('-');
    const index = parseInt(indexStr);
    const groupType = type as 'income' | 'savings' | 'expenses';

    // Create a simple new category
    const newCategory: Category = {
      categoryId: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      categoryName: `New ${groupType === 'income' ? 'Income' : groupType === 'savings' ? 'Savings' : 'Expense'}`,
      parentGroup: groups[groupType][index].groupName,
      groupType: groupType === 'savings' ? 'saving' : groupType === 'expenses' ? 'expense' : 'income',
      categoryOrder: groups[groupType][index].categories.length,
      icon: groupType === 'income' ? '💰' : groupType === 'savings' ? '🏦' : '🛒',
      colorCode: groupType === 'income' ? '#10B981' : groupType === 'savings' ? '#3B82F6' : '#F59E0B',
      plannedAmount: 0,
      spentAmount: 0,
      remainingAmount: 0,
      isCustom: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const updatedGroups = { ...groups };
    updatedGroups[groupType][index] = {
      ...updatedGroups[groupType][index],
      categories: [...updatedGroups[groupType][index].categories, newCategory]
    };

    onUpdateGroups(updatedGroups);
  };

  const handleUpdateCategory = (groupKey: string, category: Category, plannedAmount: number) => {
    if (!onUpdateGroups) return;

    const [type, indexStr] = groupKey.split('-');
    const index = parseInt(indexStr);
    const groupType = type as 'income' | 'savings' | 'expenses';

    const updatedGroups = { ...groups };
    const group = updatedGroups[groupType][index];

    const updatedCategories = group.categories.map(cat =>
      cat.categoryId === category.categoryId
        ? { ...cat, plannedAmount, remainingAmount: plannedAmount - cat.spentAmount }
        : cat
    );

    updatedGroups[groupType][index] = {
      ...group,
      categories: updatedCategories
    };

    onUpdateGroups(updatedGroups);
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
          onAddCategory={() => handleAddCategory(`income-${index}`)}
          onUpdateCategory={(cat, amount) => handleUpdateCategory(`income-${index}`, cat, amount)}
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
          onAddCategory={() => handleAddCategory(`savings-${index}`)}
          onUpdateCategory={(cat, amount) => handleUpdateCategory(`savings-${index}`, cat, amount)}
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
          onAddCategory={() => handleAddCategory(`expenses-${index}`)}
          onUpdateCategory={(cat, amount) => handleUpdateCategory(`expenses-${index}`, cat, amount)}
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
  onAddCategory,
  onUpdateCategory,
}) => {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');

  // ============================================================================
  // Group Type Styling - Simplified
  // ============================================================================

  const getGroupColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-700';
      case 'savings':
        return 'text-blue-700';
      case 'expenses':
        return 'text-gray-700';
      default:
        return 'text-gray-700';
    }
  };

  const groupColor = getGroupColor(groupType);

  const handleStartEdit = (category: Category) => {
    setEditingCategoryId(category.categoryId);
    setEditAmount(category.plannedAmount.toString());
  };

  const handleSaveEdit = (category: Category) => {
    const amount = parseFloat(editAmount) || 0;
    onUpdateCategory(category, amount);
    setEditingCategoryId(null);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditAmount('');
  };

  const handleStartNameEdit = (category: Category) => {
    setEditingNameId(category.categoryId);
    setEditName(category.categoryName);
  };

  const handleSaveName = (category: Category) => {
    if (editName.trim()) {
      // Update category name - we'll need to extend onUpdateCategory or create a new handler
      console.log('Update category name:', category.categoryId, editName);
    }
    setEditingNameId(null);
    setEditName('');
  };

  const handleCancelNameEdit = () => {
    setEditingNameId(null);
    setEditName('');
  };

  // ============================================================================
  // Render Group Card - EveryDollar Style
  // ============================================================================

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Group Header - Simplified */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3 className={`text-base font-semibold ${groupColor}`}>
            {group.groupName}
          </h3>
        </div>
        <div className="flex items-center space-x-6 text-sm">
          <span className="text-gray-600 font-medium">Planned</span>
          <span className="text-gray-600 font-medium w-24 text-right">Remaining</span>
        </div>
      </div>

      {/* Categories List - Table Style */}
      {isExpanded && (
        <div>
          {group.categories.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {group.categories.map((category) => (
                <div
                  key={category.categoryId}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    {editingNameId === category.categoryId ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(category);
                          if (e.key === 'Escape') handleCancelNameEdit();
                        }}
                        onBlur={() => handleSaveName(category)}
                      />
                    ) : (
                      <button
                        onClick={() => handleStartNameEdit(category)}
                        className="text-sm text-gray-900 hover:text-blue-600 text-left"
                      >
                        {category.categoryName}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-6">
                    {editingCategoryId === category.categoryId ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(category);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleSaveEdit(category)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(category)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 w-24 text-right"
                        >
                          ${category.plannedAmount.toLocaleString()}
                        </button>
                        <span className={`text-sm font-medium w-24 text-right ${category.remainingAmount >= 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                          ${category.remainingAmount.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Add Category Link - EveryDollar Style */}
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={onAddCategory}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add {groupType === 'income' ? 'Income' : groupType === 'savings' ? 'Savings' : 'Expense'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
