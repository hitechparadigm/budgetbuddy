import React, { useState, useEffect } from 'react';
import { transactionApi, ApiError } from '../services/api';
import TransactionList from '../components/transactions/TransactionList';
import TransactionForm from '../components/transactions/TransactionForm';
import TransactionPlanningModal from '../components/transactions/TransactionPlanningModal';
import FloatingActionButtons from '../components/transactions/FloatingActionButtons';
import BalanceVisualization from '../components/budget/BalanceVisualization';
import CalendarNavigation from '../components/budget/CalendarNavigation';

interface Transaction {
  transactionId: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  description: string;
  merchant?: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionFormData {
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  description: string;
  merchant: string;
  date: string;
}

interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
}

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [summary, setSummary] = useState<TransactionSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
    transactionCount: 0
  });

  // New state for enhanced features
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [planningType, setPlanningType] = useState<'income' | 'expense'>('expense');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthsWithData, setMonthsWithData] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    type: '' as '' | 'income' | 'expense',
    startDate: '',
    endDate: '',
    categoryId: ''
  });

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  useEffect(() => {
    calculateSummary();
  }, [transactions]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const filterParams: any = {};
      if (filters.type) filterParams.type = filters.type;
      if (filters.startDate) filterParams.startDate = filters.startDate;
      if (filters.endDate) filterParams.endDate = filters.endDate;
      if (filters.categoryId) filterParams.categoryId = filters.categoryId;

      const result = await transactionApi.getTransactions(filterParams);
      setTransactions(result.transactions || []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load transactions';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    setSummary({
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: transactions.length
    });
  };

  const handleCreateTransaction = async (data: TransactionFormData) => {
    setLoading(true);
    try {
      await transactionApi.createTransaction({
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        description: data.description,
        merchant: data.merchant || undefined,
        date: data.date
      });

      setShowForm(false);
      await loadTransactions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create transaction';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTransaction = async (data: TransactionFormData) => {
    if (!editingTransaction) return;

    setLoading(true);
    try {
      await transactionApi.updateTransaction(editingTransaction.transactionId, {
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        description: data.description,
        merchant: data.merchant || undefined,
        date: data.date
      });

      setEditingTransaction(null);
      setShowForm(false);
      await loadTransactions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update transaction';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    setLoading(true);
    try {
      await transactionApi.deleteTransaction(transactionId);
      await loadTransactions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete transaction';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // New handler functions for enhanced features
  const handlePlanTransaction = async (data: any) => {
    setLoading(true);
    try {
      // Convert planned transaction to actual transaction
      await transactionApi.createTransaction({
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        description: data.notes || `${data.categoryName} - ${data.type}`,
        merchant: undefined,
        date: data.date
      });

      setShowPlanningModal(false);
      await loadTransactions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create planned transaction';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeClick = () => {
    setPlanningType('income');
    setShowPlanningModal(true);
  };

  const handleExpenseClick = () => {
    setPlanningType('expense');
    setShowPlanningModal(true);
  };

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
    // Update filters to show transactions for the selected month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    setFilters(prev => ({ ...prev, startDate, endDate }));
  };

  // Generate balance data for visualization
  const balanceData = {
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    netBalance: summary.netAmount,
    currency: 'CAD' as const,
    month: currentMonth.toString().padStart(2, '0'),
    year: currentYear
  };

  // Generate weekly breakdowns (mock data for now)
  const weeklyBreakdowns = [
    { period: `${currentMonth.toString().padStart(2, '0')} 01 - 02`, income: 0, expenses: 0, balance: 0 },
    { period: `${currentMonth.toString().padStart(2, '0')} 02 - 09`, income: 0, expenses: 0, balance: 0 },
    { period: `${currentMonth.toString().padStart(2, '0')} 09 - 16`, income: 0, expenses: 0, balance: 0 },
    { period: `${currentMonth.toString().padStart(2, '0')} 16 - 23`, income: 0, expenses: 0, balance: 0 },
    { period: `${currentMonth.toString().padStart(2, '0')} 23 - 30`, income: 0, expenses: 0, balance: 0 }
  ];

  return (
    <div className="transactions-page min-h-screen bg-gray-950 text-white">
      {/* Calendar Navigation */}
      <div className="mb-6">
        <CalendarNavigation
          currentMonth={currentMonth}
          currentYear={currentYear}
          onMonthChange={handleMonthChange}
          monthsWithData={monthsWithData}
        />
      </div>

      {/* Enhanced Balance Visualization */}
      <div className="mb-6">
        <BalanceVisualization
          balanceData={balanceData}
          weeklyBreakdowns={weeklyBreakdowns}
          loading={loading}
        />
      </div>

      <div className="page-header flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          disabled={loading}
        >
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters">
          <div className="filter-group">
            <label>Type:</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div className="filter-group">
            <label>From:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>To:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>

          <button
            onClick={() => setFilters({ type: '', startDate: '', endDate: '', categoryId: '' })}
            className="button button-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Transaction Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <TransactionForm
              transaction={editingTransaction || undefined}
              onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
              onCancel={handleCancelForm}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Enhanced Transaction Planning Modal */}
      <TransactionPlanningModal
        isOpen={showPlanningModal}
        type={planningType}
        onClose={() => setShowPlanningModal(false)}
        onSubmit={handlePlanTransaction}
        loading={loading}
      />

      {/* Transaction List */}
      <TransactionList
        transactions={transactions}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        loading={loading}
      />

      {/* Floating Action Buttons */}
      <FloatingActionButtons
        onIncomeClick={handleIncomeClick}
        onExpenseClick={handleExpenseClick}
      />
    </div>
  );
};

export default TransactionsPage;
