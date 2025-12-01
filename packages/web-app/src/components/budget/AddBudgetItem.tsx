import React, { useState } from 'react';

// Local Category interface (matches the one in BudgetContext)
interface Category {
  categoryId: string;
  categoryName: string;
  parentGroup: string;
  groupType: 'income' | 'saving' | 'expense';
  categoryOrder: number;
  icon: string;
  colorCode: string;
  plannedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  isCustom: boolean;
  isActive: boolean;
  createdAt: string;
  isRecurring?: boolean;
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'annually';
  startDate?: string;
  endDate?: string;
  nextDueDate?: string;
}

interface AddBudgetItemProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Partial<Category>) => void;
  groupType: 'income' | 'saving' | 'expense';
  month: string;
}

type FrequencyOption = 'weekly' | 'bi-weekly' | 'monthly' | 'annually';

export const AddBudgetItem: React.FC<AddBudgetItemProps> = ({
  isOpen,
  onClose,
  onAdd,
  groupType,
  month
}) => {
  const [formData, setFormData] = useState({
    categoryName: '',
    plannedAmount: '',
    isRecurring: false,
    frequency: 'monthly' as FrequencyOption,
    startDate: '',
    endDate: '',
    icon: '💰',
    colorCode: '#3B82F6'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newItem: Partial<Category> = {
      categoryName: formData.categoryName,
      plannedAmount: parseFloat(formData.plannedAmount) || 0,
      spentAmount: 0,
      remainingAmount: parseFloat(formData.plannedAmount) || 0,
      groupType,
      icon: formData.icon,
      colorCode: formData.colorCode,
      isCustom: true,
      isActive: true,
      isRecurring: formData.isRecurring,
      frequency: formData.isRecurring ? formData.frequency : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    };

    onAdd(newItem);

    // Reset form
    setFormData({
      categoryName: '',
      plannedAmount: '',
      isRecurring: false,
      frequency: 'monthly',
      startDate: '',
      endDate: '',
      icon: '💰',
      colorCode: '#3B82F6'
    });

    onClose();
  };

  const getGroupTypeLabel = () => {
    switch (groupType) {
      case 'income': return 'Income';
      case 'saving': return 'Savings';
      case 'expense': return 'Expense';
      default: return 'Item';
    }
  };

  const getModalTitle = () => {
    const typeLabel = getGroupTypeLabel();
    return `Add Planned ${typeLabel} Item`;
  };

  const getSubmitButtonText = () => {
    const typeLabel = getGroupTypeLabel();
    return `Add ${typeLabel} Item`;
  };

  const getDefaultIcon = () => {
    switch (groupType) {
      case 'income': return '💰';
      case 'saving': return '🏦';
      case 'expense': return '💳';
      default: return '💰';
    }
  };

  const frequencyOptions: { value: FrequencyOption; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'annually', label: 'Annually' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.categoryName}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${groupType} name`}
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.plannedAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, plannedAmount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Recurring Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700">
              This is a recurring {groupType}
            </label>
          </div>

          {/* Frequency (only if recurring) */}
          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as FrequencyOption }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* End Date (only if recurring) */}
          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Icon and Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={getDefaultIcon()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={formData.colorCode}
                onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getSubmitButtonText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
