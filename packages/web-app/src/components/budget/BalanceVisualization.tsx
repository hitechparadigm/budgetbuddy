import React from "react";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

interface BalanceData {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  currency: "CAD" | "USD";
  month: string;
  year: number;
}

interface WeeklyBreakdown {
  period: string;
  income: number;
  expenses: number;
  balance: number;
}

interface BalanceVisualizationProps {
  balanceData: BalanceData;
  weeklyBreakdowns?: WeeklyBreakdown[];
  loading?: boolean;
}

export const BalanceVisualization: React.FC<BalanceVisualizationProps> = ({
  balanceData,
  weeklyBreakdowns = [],
  loading = false,
}) => {
  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-400";
    if (balance < 0) return "text-red-400";
    return "text-[var(--color-muted-foreground)]";
  };

  const getMonthLabel = (month: string, year: number) => {
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year.toString().slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded mb-4"></div>
        <div className="h-12 bg-gray-700 rounded mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      {/* Month Header */}
      <div className="text-center">
        <h2 className="text-[var(--color-muted-foreground)] text-sm font-medium mb-1">
          {getMonthLabel(balanceData.month, balanceData.year)} Balance
        </h2>
        <div
          className={`text-3xl font-bold ${getBalanceColor(balanceData.netBalance)}`}
        >
          {formatCurrency(balanceData.netBalance, balanceData.currency)}
        </div>
      </div>

      {/* Income and Expenses Summary */}
      <div className="grid grid-cols-2 gap-4">
        {/* Income */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300 text-sm font-medium">Income</span>
          </div>
          <div className="text-green-400 text-xl font-bold">
            {formatCurrency(balanceData.totalIncome, balanceData.currency)}
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-300 text-sm font-medium">Expenses</span>
          </div>
          <div className="text-red-400 text-xl font-bold">
            -{formatCurrency(balanceData.totalExpenses, balanceData.currency)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[var(--color-muted-foreground)]">
          <span>Budget Allocation</span>
          <span>
            {balanceData.totalIncome > 0
              ? Math.round(
                  (balanceData.totalExpenses / balanceData.totalIncome) * 100,
                )
              : 0}
            % used
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              balanceData.totalExpenses > balanceData.totalIncome
                ? "bg-red-500"
                : "bg-blue-500"
            }`}
            style={{
              width: `${Math.min(
                balanceData.totalIncome > 0
                  ? (balanceData.totalExpenses / balanceData.totalIncome) * 100
                  : 0,
                100,
              )}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Weekly Breakdowns */}
      {weeklyBreakdowns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-gray-300 text-sm font-medium">
            Weekly Breakdown
          </h3>
          <div className="space-y-2">
            {weeklyBreakdowns.map((week, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg"
              >
                <span className="text-[var(--color-muted-foreground)] text-sm">{week.period}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-green-400 text-sm">
                    +{formatCurrency(week.income, balanceData.currency)}
                  </span>
                  <span className="text-red-400 text-sm">
                    -{formatCurrency(week.expenses, balanceData.currency)}
                  </span>
                  <span
                    className={`text-sm font-medium ${getBalanceColor(week.balance)}`}
                  >
                    {formatCurrency(week.balance, balanceData.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balance Status Indicator */}
      <div
        className={`text-center p-3 rounded-lg ${
          balanceData.netBalance > 0
            ? "bg-green-900 bg-opacity-30 border border-green-700"
            : balanceData.netBalance < 0
              ? "bg-red-900 bg-opacity-30 border border-red-700"
              : "bg-gray-800 border border-gray-600"
        }`}
      >
        <span
          className={`text-sm font-medium ${
            balanceData.netBalance > 0
              ? "text-green-400"
              : balanceData.netBalance < 0
                ? "text-red-400"
                : "text-[var(--color-muted-foreground)]"
          }`}
        >
          {balanceData.netBalance > 0
            ? "✓ Budget is balanced with surplus"
            : balanceData.netBalance < 0
              ? "⚠ Budget is over by " +
                formatCurrency(
                  Math.abs(balanceData.netBalance),
                  balanceData.currency,
                )
              : "○ Budget is perfectly balanced"}
        </span>
      </div>
    </div>
  );
};

export default BalanceVisualization;
