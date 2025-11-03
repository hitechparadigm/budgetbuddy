import React, { useState } from 'react';
import { CategorySelector } from './CategorySelector';
import { RecurringOptions } from './RecurringOptions';
import '../../styles/modal-dark-theme.css';

interface TransactionPlanData {
  type: 'income' | 'expense';
  amount: number;
  currency: 'CAD' | 'USD';
  categoryId: string;
  categoryName: string;
  date: string;
  time: string;
  notes?: string;
  isRecurring: boolean;
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'annually' | 'custom';
  customInterval?: number;
  onLastDayOfMonth?: boolean;
  endDate?: string;
}

interface TransactionPlanningModalProps {
  isOpen: boolean;
  type: 'income' | 'expense';
  onClose: () => void;
  onSubmit: (data: TransactionPlanData) => Promise<void>;
  loading?: boolean;
}

export const TransactionPlanningModal: React.FC<TransactionPlanningModalProps> = ({
  isOpen,
  type,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<TransactionPlanData>({
    type,
    amount: 0,
    currency: 'CAD',
    categoryId: '',
    categoryName: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: '',
    isRecurring: false
  });

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting transaction plan:', error);
    }
  };

  const handleInputChange = (field: keyof TransactionPlanData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId,
      categoryName
    }));

    if (errors.categoryId) {
      setErrors(prev => ({ ...prev, categoryId: '' }));
    }
  };

  const title = type === 'income' ? 'Plan an income' : 'Plan an outcome';
  const titleColor = type === 'income' ? 'text-green-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="transaction-modal-dark bg-gray-900 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: '#111827',
          color: '#ffffff'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ←
          </button>
          <h2 className={`text-lg font-semibold ${titleColor}`}>
            {title}
          </h2>
          <div className="w-6" /> {/* Spacer */}
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <CategorySelector
              type={type}
              selectedCategoryId={formData.categoryId}
              onCategorySelect={handleCategorySelect}
              error={errors.categoryId}
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  className={`w-full bg-gray-800 border ${
                    errors.amount ? 'border-red-500' : 'border-gray-600'
                  } rounded-lg px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-blue-500`}
                  placeholder="8800"
                />
              </div>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value as 'CAD' | 'USD')}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            {errors.amount && <span className="text-red-500 text-sm mt-1">{errors.amount}</span>}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`w-full bg-gray-800 border ${
                  errors.date ? 'border-red-500' : 'border-gray-600'
                } rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500`}
              />
              {errors.date && <span className="text-red-500 text-sm mt-1">{errors.date}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Today Button */}
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              handleInputChange('date', now.toISOString().split('T')[0]);
              handleInputChange('time', now.toTimeString().slice(0, 5));
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Today
          </button>

          {/* MORE Section */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex items-center justify-center w-full text-blue-400 hover:text-blue-300 font-medium py-2"
            >
              MORE {showMoreOptions ? '▲' : '▼'}
            </button>

            {showMoreOptions && (
              <div className="space-y-4 mt-4">
                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    rows={3}
                    placeholder="Add any additional notes..."
                  />
                </div>

                {/* Recurring Options */}
                <RecurringOptions
                  isRecurring={formData.isRecurring}
                  frequency={formData.frequency}
                  customInterval={formData.customInterval}
                  onLastDayOfMonth={formData.onLastDayOfMonth}
                  endDate={formData.endDate}
                  onChange={(field, value) => handleInputChange(field as keyof TransactionPlanData, value)}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionPlanningModal;
