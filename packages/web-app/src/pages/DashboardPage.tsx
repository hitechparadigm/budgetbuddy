/**
 * Dashboard Page
 * Main application dashboard for authenticated users with budget management
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBudget } from '../contexts/BudgetContext';
import { BudgetOverview } from '../components/budget/BudgetOverview';
import { BudgetGroups } from '../components/budget/BudgetGroups';
import { MonthSelector } from '../components/budget/MonthSelector';
import { AddBudgetItem } from '../components/budget/AddBudgetItem';

// ============================================================================
// Dashboard Page Component
// ============================================================================

export const DashboardPage: React.FC = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const {
    currentBudget,
    budgets,
    selectedMonth,
    loading: budgetLoading,
    error: budgetError,
    setSelectedMonth,
    createBudget,
    updateBudget,
    clearError,
    addBudgetItem
  } = useBudget();

  // Local state for add item modal
  const [addItemModal, setAddItemModal] = useState<{
    isOpen: boolean;
    groupType: 'income' | 'saving' | 'expense';
  }>({
    isOpen: false,
    groupType: 'income'
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  // Removed handleCreateBudget - using seamless UX with direct item addition

  const handleClearError = () => {
    clearError();
  };

  const handleUpdateGroups = async (updatedGroups: any) => {
    console.log('Updating groups:', updatedGroups);

    // Always try to update first, since budget might exist even if GET failed
    try {
      await updateBudget(selectedMonth, { groups: updatedGroups });
      console.log('Budget updated successfully');
    } catch (error: any) {
      // If update fails because budget doesn't exist, try creating
      if (error?.statusCode === 404) {
        console.log('Budget not found, creating new budget with groups');
        try {
          await createBudget(selectedMonth, { groups: updatedGroups });
        } catch (createError) {
          console.error('Create budget with groups error:', createError);
        }
      } else {
        console.error('Update groups error:', error);
      }
    }
  };

  // New seamless budget item handlers
  const handleAddIncome = () => {
    setAddItemModal({ isOpen: true, groupType: 'income' });
  };

  const handleAddSavings = () => {
    setAddItemModal({ isOpen: true, groupType: 'saving' });
  };

  const handleAddExpense = () => {
    setAddItemModal({ isOpen: true, groupType: 'expense' });
  };

  const handleAddItem = async (item: any) => {
    try {
      await addBudgetItem(selectedMonth, addItemModal.groupType, item);
      setAddItemModal({ isOpen: false, groupType: 'income' });
    } catch (error) {
      console.error('Add budget item error:', error);
    }
  };

  const handleCloseModal = () => {
    setAddItemModal({ isOpen: false, groupType: 'income' });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                BudgetBuddy Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-700">
                  Welcome, {user.firstName} {user.lastName}
                </div>
              )}
              <button
                onClick={handleLogout}
                disabled={authLoading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${authLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  }`}
              >
                {authLoading ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Error Display */}
          {budgetError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{budgetError}</p>
                </div>
                <button
                  onClick={handleClearError}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Month Selector */}
          <div className="mb-6">
            <MonthSelector
              selectedMonth={selectedMonth}
              availableMonths={budgets.map(b => b.month)}
              onMonthChange={handleMonthChange}
            />
          </div>

          {/* Budget Overview */}
          <div className="mb-6">
            <BudgetOverview
              budget={currentBudget}
              loading={budgetLoading}
            />
          </div>

          {/* Seamless Action Buttons */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Quick Actions for {selectedMonth}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={handleAddIncome}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Income
                </button>
                <button
                  onClick={handleAddSavings}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Savings
                </button>
                <button
                  onClick={handleAddExpense}
                  className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Expense
                </button>
              </div>
            </div>
          </div>

          {/* Budget Groups */}
          <div className="mb-6">
            <BudgetGroups
              groups={currentBudget?.groups || {
                income: [{
                  groupName: 'Income',
                  groupType: 'income',
                  categories: [],
                  totalPlanned: 0,
                  totalSpent: 0,
                  totalRemaining: 0,
                }],
                savings: [{
                  groupName: 'Savings',
                  groupType: 'saving',
                  categories: [],
                  totalPlanned: 0,
                  totalSpent: 0,
                  totalRemaining: 0,
                }],
                expenses: [{
                  groupName: 'Expenses',
                  groupType: 'expense',
                  categories: [],
                  totalPlanned: 0,
                  totalSpent: 0,
                  totalRemaining: 0,
                }]
              }}
              loading={budgetLoading}
              onUpdateGroups={handleUpdateGroups}
            />
          </div>

          {/* Development Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Development Status
            </h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p>✓ Authentication system complete</p>
              <p>✓ Budget CRUD operations implemented</p>
              <p>🔄 Budget dashboard and visualization (current)</p>
              <p>⏳ AI-powered budget generation (next)</p>
              <p>⏳ Transaction management system</p>
            </div>
          </div>
        </div>
      </main>

      {/* Add Budget Item Modal */}
      <AddBudgetItem
        isOpen={addItemModal.isOpen}
        onClose={handleCloseModal}
        onAdd={handleAddItem}
        groupType={addItemModal.groupType}
        month={selectedMonth}
      />
    </div>
  );
};
