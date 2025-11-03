import React, { useState } from 'react';

interface FloatingActionButtonsProps {
  onIncomeClick: () => void;
  onExpenseClick: () => void;
}

export const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
  onIncomeClick,
  onExpenseClick
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Expanded Action Buttons */}
      {isExpanded && (
        <div className="flex flex-col space-y-3 mb-4">
          {/* Income Button */}
          <button
            onClick={() => {
              onIncomeClick();
              setIsExpanded(false);
            }}
            className="flex items-center space-x-3 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
              💰
            </div>
            <span className="font-medium">Income</span>
          </button>

          {/* Expense Button */}
          <button
            onClick={() => {
              onExpenseClick();
              setIsExpanded(false);
            }}
            className="flex items-center space-x-3 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center">
              💸
            </div>
            <span className="font-medium">Expense</span>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={toggleExpanded}
        className={`w-14 h-14 rounded-full shadow-lg transition-all duration-200 transform ${
          isExpanded
            ? 'bg-gray-600 hover:bg-gray-700 rotate-45'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
        } text-white flex items-center justify-center`}
      >
        {isExpanded ? (
          <span className="text-2xl">✕</span>
        ) : (
          <span className="text-2xl">+</span>
        )}
      </button>

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default FloatingActionButtons;
