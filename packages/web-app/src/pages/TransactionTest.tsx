import React, { useState, useEffect } from 'react';
import { transactionApi, ApiError } from '../services/api';

// Types for testing
interface Transaction {
  transactionId: string;
  familyId: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  description: string;
  merchant?: string;
  transactionDate: string;
  budgetMonth: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

interface CreateTransactionRequest {
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  description: string;
  merchant?: string;
  date?: string;
}

const TransactionTest: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('');

  // Form state for creating transactions
  const [formData, setFormData] = useState<CreateTransactionRequest>({
    amount: 0,
    type: 'expense',
    categoryId: 'cat_groceries_001',
    description: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Test health check on component mount
  useEffect(() => {
    testHealthCheck();
  }, []);

  const testHealthCheck = async () => {
    try {
      const health = await transactionApi.healthCheck();
      setHealthStatus(`✅ ${health.service} service is ${health.status}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unknown error';
      setHealthStatus(`❌ Health check failed: ${message}`);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await transactionApi.getTransactions();
      setTransactions(result.transactions);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load transactions';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await transactionApi.createTransaction(formData);

      // Reset form
      setFormData({
        amount: 0,
        type: 'expense',
        categoryId: 'cat_groceries_001',
        description: '',
        merchant: '',
        date: new Date().toISOString().split('T')[0]
      });

      // Reload transactions
      await loadTransactions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create transaction';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
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

  const handleInputChange = (field: keyof CreateTransactionRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Transaction API Testing</h1>

      {/* Health Status */}
      <div style={{
        padding: '10px',
        marginBottom: '20px',
        backgroundColor: healthStatus.includes('✅') ? '#d4edda' : '#f8d7da',
        border: `1px solid ${healthStatus.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px'
      }}>
        <strong>Health Status:</strong> {healthStatus || 'Checking...'}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Create Transaction Form */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Create New Transaction</h2>
        <form onSubmit={createTransaction} style={{ display: 'grid', gap: '15px', maxWidth: '500px' }}>
          <div>
            <label>Type:</label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as 'income' | 'expense')}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div>
            <label>Amount ($):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <div>
            <label>Category ID:</label>
            <select
              value={formData.categoryId}
              onChange={(e) => handleInputChange('categoryId', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="cat_groceries_001">Groceries</option>
              <option value="cat_entertainment_001">Entertainment</option>
              <option value="cat_salary_001">Salary</option>
              <option value="cat_utilities_001">Utilities</option>
              <option value="cat_transport_001">Transportation</option>
            </select>
          </div>

          <div>
            <label>Description:</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <div>
            <label>Merchant:</label>
            <input
              type="text"
              value={formData.merchant}
              onChange={(e) => handleInputChange('merchant', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label>Date:</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating...' : 'Create Transaction'}
          </button>
        </form>
      </div>

      {/* Load Transactions */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={loadTransactions}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Load Transactions'}
        </button>
      </div>

      {/* Transactions List */}
      <div>
        <h2>Transactions ({transactions.length})</h2>
        {transactions.length === 0 ? (
          <p>No transactions found. Create some transactions or click "Load Transactions" to fetch existing ones.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Amount</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Merchant</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.transactionId}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {transaction.transactionDate}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: transaction.type === 'income' ? '#d4edda' : '#f8d7da',
                        color: transaction.type === 'income' ? '#155724' : '#721c24'
                      }}>
                        {transaction.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>
                      ${transaction.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {transaction.description}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {transaction.merchant || '-'}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {transaction.categoryId}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <button
                        onClick={() => deleteTransaction(transaction.transactionId)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {transactions.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <strong>Total Income:</strong> ${transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
            </div>
            <div>
              <strong>Total Expenses:</strong> ${transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
            </div>
            <div>
              <strong>Net Amount:</strong> ${(
                transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
                transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
              ).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTest;
