/**
 * Dashboard Page
 * Main application dashboard for authenticated users with budget management
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBudget } from '../contexts/BudgetContext';
import { BudgetOverview } from '../components/budget/BudgetOverview';
import { BudgetGroups } from '../components/budget/BudgetGroups';
import { MonthSelector } from '../components/budget/MonthSelector';

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
    clearError
  } = useBudget();

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

  const handleCreateBudget = async (month: string) => {
    try {
      await createBudget(month);
    } catch (error) {
      console.error('Create budget error:', error);
    }
  };

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
              onCreateBudget={handleCreateBudget}
            />
          </div>

          {/* Budget Overview */}
          <div className="mb-6">
            <BudgetOverview
              budget={currentBudget}
              loading={budgetLoading}
            />
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
    </div>
  );
};
