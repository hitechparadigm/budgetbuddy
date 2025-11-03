import React, { useState, useEffect } from 'react';

interface Transaction {
  transactionId: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  description: string;
  merchant?: string;
  transactionDate: string;
}

interface TransactionFormData {
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  description: string;
  merchant: string;
  date: string;
}

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: 0,
    type: 'expense',
    categoryId: '',
    description: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Categories - in production this would come from an API
  const categories = {
    income: [
      { id: 'cat_salary_001', name: 'Salary' },
      { id: 'cat_freelance_001', name: 'Freelance' },
      { id: 'cat_investment_001', name: 'Investment' },
      { id: 'cat_other_income_001', name: 'Other Income' }
    ],
    expense: [
      { id: 'cat_groceries_001', name: 'Groceries' },
      { id: 'cat_utilities_001', name: 'Utilities' },
      { id: 'cat_transport_001', name: 'Transportation' },
      { id: 'cat_entertainment_001', name: 'Entertainment' },
      { id: 'cat_dining_001', name: 'Dining Out' },
      { id: 'cat_shopping_001', name: 'Shopping' },
      { id: 'cat_healthcare_001', name: 'Healthcare' }
    ]
  };

  // Initialize form with transaction data if editing
  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        description: transaction.description,
        merchant: transaction.merchant || '',
        date: transaction.transactionDate
      });
    }
  }, [transaction]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
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
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }
  };

  const handleInputChange = (field: keyof TransactionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Reset category when type changes
    if (field === 'type') {
      setFormData(prev => ({ ...prev, categoryId: '' }));
      if (errors.categoryId) {
        setErrors(prev => ({ ...prev, categoryId: '' }));
      }
    }
  };

  const currentCategories = categories[formData.type];

  return (
    <div className="transaction-form">
      <div className="transaction-form-header">
        <h2>{transaction ? 'Edit Transaction' : 'Add New Transaction'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="transaction-form-content">
        {/* Transaction Type */}
        <div className="form-group">
          <label className="form-label">Transaction Type</label>
          <div className="transaction-type-selector">
            <button
              type="button"
              className={`type-button ${formData.type === 'income' ? 'active income' : 'inactive'}`}
              onClick={() => handleInputChange('type', 'income')}
            >
              <span className="type-icon">💰</span>
              Income
            </button>
            <button
              type="button"
              className={`type-button ${formData.type === 'expense' ? 'active expense' : 'inactive'}`}
              onClick={() => handleInputChange('type', 'expense')}
            >
              <span className="type-icon">💸</span>
              Expense
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="form-group">
          <label htmlFor="amount" className="form-label">Amount</label>
          <div className="amount-input-wrapper">
            <span className="currency-symbol">$</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
              className={`form-input amount-input ${errors.amount ? 'error' : ''}`}
              placeholder="0.00"
            />
          </div>
          {errors.amount && <span className="form-error">{errors.amount}</span>}
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="categoryId" className="form-label">Category</label>
          <select
            id="categoryId"
            value={formData.categoryId}
            onChange={(e) => handleInputChange('categoryId', e.target.value)}
            className={`form-select ${errors.categoryId ? 'error' : ''}`}
          >
            <option value="">Select a category</option>
            {currentCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <span className="form-error">{errors.categoryId}</span>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">Description</label>
          <input
            id="description"
            type="text"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={`form-input ${errors.description ? 'error' : ''}`}
            placeholder="What was this transaction for?"
          />
          {errors.description && <span className="form-error">{errors.description}</span>}
        </div>

        {/* Merchant */}
        <div className="form-group">
          <label htmlFor="merchant" className="form-label">Merchant (Optional)</label>
          <input
            id="merchant"
            type="text"
            value={formData.merchant}
            onChange={(e) => handleInputChange('merchant', e.target.value)}
            className="form-input"
            placeholder="Where did this transaction occur?"
          />
        </div>

        {/* Date */}
        <div className="form-group">
          <label htmlFor="date" className="form-label">Date</label>
          <input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className={`form-input ${errors.date ? 'error' : ''}`}
          />
          {errors.date && <span className="form-error">{errors.date}</span>}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="button button-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (transaction ? 'Update Transaction' : 'Add Transaction')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
