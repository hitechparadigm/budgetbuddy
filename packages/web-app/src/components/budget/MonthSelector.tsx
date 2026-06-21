/**
 * Month Selector Component
 * Allows users to select different months for budget viewing
 */

import React from 'react';

// ============================================================================
// Types
// ============================================================================

interface MonthSelectorProps {
  selectedMonth: string;
  availableMonths: string[];
  onMonthChange: (month: string) => void;
}

// ============================================================================
// Month Selector Component
// ============================================================================

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  availableMonths,
  onMonthChange,
}) => {
  // ============================================================================
  // Generate Month Options
  // ============================================================================

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();

    // Generate 12 months: 6 months back, current month, 5 months forward
    for (let i = -6; i <= 5; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const displayName = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });

      options.push({
        value: monthString,
        label: displayName,
        hasBudget: availableMonths.includes(monthString),
        isCurrent: monthString === getCurrentMonth(),
      });
    }

    return options;
  };

  const monthOptions = generateMonthOptions();
  const selectedOption = monthOptions.find(option => option.value === selectedMonth);
  const hasBudgetForSelectedMonth = availableMonths.includes(selectedMonth);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(event.target.value);
  };

  // Removed handleCreateBudget - using seamless UX instead

  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentIndex = monthOptions.findIndex(option => option.value === selectedMonth);
    if (direction === 'prev' && currentIndex > 0) {
      onMonthChange(monthOptions[currentIndex - 1].value);
    } else if (direction === 'next' && currentIndex < monthOptions.length - 1) {
      onMonthChange(monthOptions[currentIndex + 1].value);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="bg-[var(--color-surface)] shadow rounded-lg p-4">
      <div className="flex items-center justify-between">
        {/* Month Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded"
            disabled={monthOptions.findIndex(option => option.value === selectedMonth) === 0}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="appearance-none bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-4 py-2 pr-8 text-sm font-medium text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)]"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.isCurrent && '(Current)'} {option.hasBudget && '✓'}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-[var(--color-muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded"
            disabled={monthOptions.findIndex(option => option.value === selectedMonth) === monthOptions.length - 1}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Budget Status and Actions */}
        <div className="flex items-center space-x-3">
          {/* Budget Status Indicator */}
          <div className="flex items-center space-x-2">
            {hasBudgetForSelectedMonth ? (
              <div className="flex items-center space-x-1 text-green-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">Budget exists</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-[var(--color-muted-foreground)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium">No budget</span>
              </div>
            )}
          </div>

          {/* Action Buttons - Removed Create Budget button for seamless UX */}

          {selectedOption?.isCurrent && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Current Month
            </span>
          )}
        </div>
      </div>

      {/* Month Summary */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
          <span>
            Viewing: <span className="font-medium text-[var(--color-foreground)]">{selectedOption?.label}</span>
          </span>
          <span>
            {availableMonths.length} {availableMonths.length === 1 ? 'budget' : 'budgets'} created
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}
