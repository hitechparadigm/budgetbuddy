/**
 * BudgetSwitcher Component
 *
 * Displays the active budget name and type badge in the app header.
 * Shows a dropdown with all available budgets when the user has more than one.
 * On selection, calls budgetService.setActiveBudget() then triggers a data reload.
 *
 * **Validates: REQ-4**
 */

import React, { useState, useRef, useEffect } from 'react';
import { Budget, BudgetType, MemberRole, budgetService } from '../services/budgetService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetSwitcherProps {
  budgets: Budget[];
  activeBudgetId: string;
  onSwitch: (budgetId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BUDGET_TYPE_LABELS: Record<BudgetType, string> = {
  personal: 'Personal',
  family: 'Family',
  shared: 'Shared',
};

const BUDGET_TYPE_COLORS: Record<BudgetType, string> = {
  personal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  family: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  shared: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  partner: 'Partner',
  household_member: 'Household Member',
  viewer: 'Viewer',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BudgetSwitcher: React.FC<BudgetSwitcherProps> = ({
  budgets,
  activeBudgetId,
  onSwitch,
}) => {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeBudget = budgets.find((b) => b.budgetId === activeBudgetId) ?? budgets[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Only render when there are multiple budgets
  if (budgets.length <= 1) {
    return null;
  }

  const handleSelect = async (budgetId: string) => {
    if (budgetId === activeBudgetId || switching) return;

    setSwitching(true);
    setOpen(false);

    try {
      await budgetService.setActiveBudget(budgetId);
      onSwitch(budgetId);
    } catch (err) {
      console.error('Failed to switch budget:', err);
    } finally {
      setSwitching(false);
    }
  };

  if (!activeBudget) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={switching}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch budget"
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-lg border
          bg-[var(--color-surface)] dark:bg-gray-800
          border-[var(--color-border)] dark:border-gray-700
          text-[var(--color-foreground)] dark:text-gray-100
          hover:bg-[var(--color-background)] dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-green-500
          transition-colors text-sm font-medium
          disabled:opacity-60 disabled:cursor-not-allowed
        `}
      >
        {/* Budget name */}
        <span className="max-w-[140px] truncate">{activeBudget.name}</span>

        {/* Type badge */}
        <span
          className={`
            px-1.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0
            ${BUDGET_TYPE_COLORS[activeBudget.budgetType]}
          `}
        >
          {BUDGET_TYPE_LABELS[activeBudget.budgetType]}
        </span>

        {/* Chevron / spinner */}
        {switching ? (
          <svg
            className="w-4 h-4 animate-spin text-[var(--color-muted-foreground)] flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className={`w-4 h-4 text-[var(--color-muted-foreground)] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Available budgets"
          className="
            absolute left-0 mt-1 w-72 z-50
            bg-[var(--color-surface)] dark:bg-gray-800
            border border-[var(--color-border)] dark:border-gray-700
            rounded-lg shadow-lg
            py-1 overflow-hidden
          "
        >
          {budgets.map((budget) => {
            const isActive = budget.budgetId === activeBudgetId;
            return (
              <button
                key={budget.budgetId}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(budget.budgetId)}
                className={`
                  w-full text-left px-4 py-3 flex items-center justify-between
                  hover:bg-[var(--color-background)] dark:hover:bg-gray-700
                  focus:outline-none focus:bg-[var(--color-background)] dark:focus:bg-gray-700
                  transition-colors
                  ${isActive ? 'bg-green-50 dark:bg-green-900/20' : ''}
                `}
              >
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`
                        font-medium text-sm truncate
                        ${isActive
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-[var(--color-foreground)] dark:text-gray-100'
                        }
                      `}
                    >
                      {budget.name}
                    </span>
                    {isActive && (
                      <svg
                        className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-label="Active budget"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Role row */}
                  <div className="text-xs text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mt-0.5">
                    {ROLE_LABELS[budget.role]}
                  </div>
                </div>

                {/* Type badge */}
                <span
                  className={`
                    ml-3 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0
                    ${BUDGET_TYPE_COLORS[budget.budgetType]}
                  `}
                >
                  {BUDGET_TYPE_LABELS[budget.budgetType]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetSwitcher;
