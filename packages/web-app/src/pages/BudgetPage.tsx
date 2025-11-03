import React, { useState } from 'react';
import BudgetDashboard from '../components/budget/BudgetDashboard';
import CalendarNavigation from '../components/budget/CalendarNavigation';

export const BudgetPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  // Mock months with data for calendar navigation
  const monthsWithData = [
    '2025-10',
    '2025-11',
    '2025-12'
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Calendar Navigation */}
        <CalendarNavigation
          currentMonth={currentMonth}
          currentYear={currentYear}
          onMonthChange={handleMonthChange}
          monthsWithData={monthsWithData}
        />

        {/* Budget Dashboard */}
        <BudgetDashboard
          currentMonth={currentMonth}
          currentYear={currentYear}
          onMonthChange={handleMonthChange}
        />
      </div>
    </div>
  );
};

export default BudgetPage;
