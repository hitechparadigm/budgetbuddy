import React from 'react';

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

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  loading?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="transaction-list-loading">
        <div className="loading-spinner">Loading transactions...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="transaction-list-empty">
        <div className="empty-state">
          <h3>No transactions yet</h3>
          <p>Start by adding your first income or expense transaction.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryName = (categoryId: string) => {
    // Simple category mapping - in production this would come from a categories API
    const categoryMap: Record<string, string> = {
      'cat_groceries_001': 'Groceries',
      'cat_entertainment_001': 'Entertainment',
      'cat_salary_001': 'Salary',
      'cat_utilities_001': 'Utilities',
      'cat_transport_001': 'Transportation',
      'cat_dining_001': 'Dining Out',
      'cat_shopping_001': 'Shopping',
      'cat_healthcare_001': 'Healthcare'
    };
    return categoryMap[categoryId] || categoryId;
  };

  return (
    <div className="transaction-list">
      <div className="transaction-list-header">
        <h2>Recent Transactions</h2>
        <div className="transaction-count">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="transaction-items">
        {transactions.map((transaction) => (
          <div key={transaction.transactionId} className="transaction-item">
            <div className="transaction-main">
              <div className="transaction-info">
                <div className="transaction-description">
                  {transaction.description}
                </div>
                <div className="transaction-details">
                  <span className="transaction-category">
                    {getCategoryName(transaction.categoryId)}
                  </span>
                  {transaction.merchant && (
                    <>
                      <span className="transaction-separator">•</span>
                      <span className="transaction-merchant">
                        {transaction.merchant}
                      </span>
                    </>
                  )}
                  <span className="transaction-separator">•</span>
                  <span className="transaction-date">
                    {formatDate(transaction.transactionDate)}
                  </span>
                </div>
              </div>

              <div className="transaction-amount">
                <span className={`amount ${transaction.type}`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
                <div className="transaction-type">
                  {transaction.type}
                </div>
              </div>
            </div>

            <div className="transaction-actions">
              <button
                onClick={() => onEdit(transaction)}
                className="action-button edit-button"
                title="Edit transaction"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(transaction.transactionId)}
                className="action-button delete-button"
                title="Delete transaction"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
