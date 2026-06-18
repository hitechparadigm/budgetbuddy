/**
 * Calendar View Component
 *
 * Displays transactions in a calendar format for easy visualization
 * of spending patterns by day.
 */

import React, { useState, useMemo } from "react";
import { formatCurrency as formatCurrencyShared, getCurrencyConfig } from "@budget-buddy/shared/src/utils/currency";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName?: string;
  type: "income" | "expense";
}

interface CalendarViewProps {
  transactions: Transaction[];
  month: string; // Format: YYYY-MM
  onDateClick?: (date: string, transactions: Transaction[]) => void;
  currency?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  transactions,
  month,
  onDateClick,
  currency = "USD",
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Parse month to get year and month number
  const [year, monthNum] = month.split("-").map(Number);

  // Get days in month and first day of week
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstDayOfWeek = new Date(year, monthNum - 1, 1).getDay();

  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach((tx) => {
      const date = tx.date.split("T")[0]; // Handle ISO dates
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(tx);
    });
    return grouped;
  }, [transactions]);

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, { income: number; expense: number }> = {};
    Object.entries(transactionsByDate).forEach(([date, txs]) => {
      totals[date] = txs.reduce(
        (acc, tx) => {
          if (tx.type === "income") {
            acc.income += tx.amount;
          } else {
            acc.expense += tx.amount;
          }
          return acc;
        },
        { income: 0, expense: 0 },
      );
    });
    return totals;
  }, [transactionsByDate]);

  const formatCurrency = (amount: number) => {
    // Use the currency config locale so CAD shows "$46" (en-CA) instead of "CA$46" (en-US)
    try {
      const config = getCurrencyConfig(currency);
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    if (onDateClick) {
      onDateClick(dateStr, transactionsByDate[dateStr] || []);
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Generate calendar grid
  const calendarDays = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === monthNum &&
      today.getDate() === day
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {monthNames[monthNum - 1]} {year}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click on a day to see transactions
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-20" />;
            }

            const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTransactions = transactionsByDate[dateStr] || [];
            const totals = dailyTotals[dateStr];
            const hasTransactions = dayTransactions.length > 0;
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`h-20 p-1 rounded-lg border transition-all text-left ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : hasTransactions
                      ? "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700"
                } ${isToday(day) ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
              >
                <div className="flex flex-col h-full">
                  <span
                    className={`text-sm font-medium ${
                      isToday(day)
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {day}
                  </span>

                  {hasTransactions && (
                    <div className="flex-1 flex flex-col justify-end space-y-0.5 overflow-hidden">
                      {totals?.income > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400 truncate">
                          +{formatCurrency(totals.income)}
                        </div>
                      )}
                      {totals?.expense > 0 && (
                        <div className="text-xs text-red-600 dark:text-red-400 truncate">
                          -{formatCurrency(totals.expense)}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {dayTransactions.length} txn
                        {dayTransactions.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && transactionsByDate[selectedDate]?.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Transactions on{" "}
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transactionsByDate[selectedDate].map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {tx.description}
                  </p>
                  {tx.categoryName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tx.categoryName}
                    </p>
                  )}
                </div>
                <span
                  className={`text-sm font-medium ml-2 ${
                    tx.type === "income"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Income</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Expense</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded ring-2 ring-blue-500" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
