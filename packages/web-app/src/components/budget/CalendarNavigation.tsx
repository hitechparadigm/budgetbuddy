import React from 'react';

interface CalendarNavigationProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
  monthsWithData?: string[]; // Array of "YYYY-MM" strings
}

export const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  currentMonth,
  currentYear,
  onMonthChange,
  monthsWithData = []
}) => {
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];

  const today = new Date();
  const currentMonthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

  // Generate months to display (current month ± 6 months)
  const generateMonthsToShow = () => {
    const months = [];
    const startDate = new Date(currentYear, currentMonth - 7, 1);

    for (let i = 0; i < 13; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const hasData = monthsWithData.includes(monthKey);
      const isToday = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      const isCurrent = date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;

      months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`,
        key: monthKey,
        hasData,
        isToday,
        isCurrent
      });
    }

    return months;
  };

  const monthsToShow = generateMonthsToShow();

  const navigateToToday = () => {
    onMonthChange(today.getMonth() + 1, today.getFullYear());
  };

  const navigateToPrevious = () => {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    onMonthChange(prevMonth, prevYear);
  };

  const navigateToNext = () => {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    onMonthChange(nextMonth, nextYear);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={navigateToPrevious}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          ←
        </button>

        <div className="text-center">
          <h2 className="text-white text-lg font-semibold">
            {monthNames[currentMonth - 1]} {currentYear}
          </h2>
          <button
            onClick={navigateToToday}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={navigateToNext}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          →
        </button>
      </div>

      {/* Month Timeline */}
      <div className="relative">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {monthsToShow.map((month) => (
            <button
              key={month.key}
              onClick={() => onMonthChange(month.month, month.year)}
              className={`flex-shrink-0 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                month.isCurrent
                  ? 'bg-blue-600 text-white shadow-lg'
                  : month.isToday
                  ? 'bg-blue-900 bg-opacity-50 text-blue-300 border border-blue-600'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">{month.label}</div>
                {month.hasData && (
                  <div className="w-2 h-2 bg-green-400 rounded-full mx-auto mt-1"></div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="flex justify-center space-x-2">
        <button
          onClick={() => onMonthChange(today.getMonth() + 1, today.getFullYear())}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            currentMonth === today.getMonth() + 1 && currentYear === today.getFullYear()
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          This Month
        </button>

        <button
          onClick={() => {
            const nextMonth = today.getMonth() + 2 > 12 ? 1 : today.getMonth() + 2;
            const nextYear = today.getMonth() + 2 > 12 ? today.getFullYear() + 1 : today.getFullYear();
            onMonthChange(nextMonth, nextYear);
          }}
          className="px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
        >
          Next Month
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>Has Data</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span>Current</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarNavigation;
