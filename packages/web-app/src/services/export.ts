import { Budget, Transaction } from '../types';

// Account lookup type for export
export interface AccountLookup {
  [accountId: string]: string; // accountId -> account name
}

export interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  format: 'csv' | 'pdf';
  accountLookup?: AccountLookup; // NEW: Map of accountId to account name
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

class WebExportService {
  /**
   * Export budget data to CSV format for web
   */
  async exportBudgetsToCSV(budgets: Budget[], options: ExportOptions): Promise<ExportResult> {
    try {
      const filteredBudgets = this.filterBudgetsByDateRange(budgets, options);
      const csvContent = this.generateBudgetCSV(filteredBudgets);

      const fileName = `budgets_${this.formatDateForFilename(new Date())}.csv`;
      this.downloadFile(csvContent, fileName, 'text/csv');

      return { success: true, filePath: fileName };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Export transaction data to CSV format for web
   */
  async exportTransactionsToCSV(
    transactions: Transaction[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const filteredTransactions = this.filterTransactionsByOptions(transactions, options);
      const csvContent = this.generateTransactionCSV(filteredTransactions, options.accountLookup);

      const fileName = `transactions_${this.formatDateForFilename(new Date())}.csv`;
      this.downloadFile(csvContent, fileName, 'text/csv');

      return { success: true, filePath: fileName };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate PDF report for monthly budget summary (web version)
   */
  async generateMonthlyBudgetPDF(
    budgets: Budget[],
    transactions: Transaction[],
    month: Date,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Filter data for the specific month
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthlyBudgets = this.filterBudgetsByDateRange(budgets, {
        ...options,
        startDate: monthStart,
        endDate: monthEnd
      });

      const monthlyTransactions = this.filterTransactionsByOptions(transactions, {
        ...options,
        startDate: monthStart,
        endDate: monthEnd
      });

      // Generate HTML content for PDF
      const htmlContent = this.generateBudgetReportHTML(monthlyBudgets, monthlyTransactions, month);

      // For web, we'll download as HTML file (PDF generation requires server-side processing)
      const fileName = `budget_report_${this.formatDateForFilename(month)}.html`;
      this.downloadFile(htmlContent, fileName, 'text/html');

      return { success: true, filePath: fileName };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Download file in browser
   */
  private downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  /**
   * Filter budgets by date range
   */
  private filterBudgetsByDateRange(budgets: Budget[], options: ExportOptions): Budget[] {
    if (!options.startDate && !options.endDate) {
      return budgets;
    }

    return budgets.filter(budget => {
      const budgetDate = new Date(budget.createdAt);

      if (options.startDate && budgetDate < options.startDate) {
        return false;
      }

      if (options.endDate && budgetDate > options.endDate) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filter transactions by date range and categories
   */
  private filterTransactionsByOptions(transactions: Transaction[], options: ExportOptions): Transaction[] {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);

      // Date range filter
      if (options.startDate && transactionDate < options.startDate) {
        return false;
      }

      if (options.endDate && transactionDate > options.endDate) {
        return false;
      }

      // Category filter
      if (options.categories && options.categories.length > 0) {
        if (!options.categories.includes(transaction.category)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Generate CSV content for budgets
   */
  private generateBudgetCSV(budgets: Budget[]): string {
    const headers = [
      'ID',
      'Name',
      'Category',
      'Planned Amount',
      'Actual Amount',
      'Variance',
      'Type',
      'Frequency',
      'Created Date',
      'Updated Date'
    ];

    const rows = budgets.map(budget => [
      budget.id,
      this.escapeCsvField(budget.name),
      this.escapeCsvField(budget.category),
      budget.plannedAmount.toString(),
      budget.actualAmount.toString(),
      (budget.actualAmount - budget.plannedAmount).toString(),
      budget.type,
      budget.recurringConfig?.frequency || 'none',
      budget.createdAt,
      budget.updatedAt
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  /**
   * Generate CSV content for transactions
   */
  private generateTransactionCSV(
    transactions: Transaction[],
    accountLookup?: AccountLookup
  ): string {
    const headers = [
      'ID',
      'Description',
      'Amount',
      'Category',
      'Account', // NEW: Account column
      'Date',
      'Merchant',
      'Location',
      'Tags',
      'Notes',
      'Sync Status',
      'Created Date'
    ];

    const rows = transactions.map(transaction => {
      // Get account name from lookup or use "Unassigned"
      const accountName = transaction.accountId && accountLookup
        ? (accountLookup[transaction.accountId] || 'Unknown Account')
        : 'Unassigned';

      return [
        transaction.id,
        this.escapeCsvField(transaction.description),
        transaction.amount.toString(),
        this.escapeCsvField(transaction.category),
        this.escapeCsvField(accountName), // NEW: Account name
        transaction.date,
        this.escapeCsvField(transaction.merchant || ''),
        this.escapeCsvField(transaction.location || ''),
        this.escapeCsvField(transaction.tags?.join(';') || ''),
        this.escapeCsvField(transaction.notes || ''),
        transaction.syncStatus || 'synced',
        transaction.createdAt
      ];
    });

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  /**
   * Generate HTML content for budget report
   */
  private generateBudgetReportHTML(
    budgets: Budget[],
    transactions: Transaction[],
    month: Date
  ): string {
    const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Calculate summary statistics
    const totalPlanned = budgets.reduce((sum, budget) => sum + budget.plannedAmount, 0);
    const totalActual = budgets.reduce((sum, budget) => sum + budget.actualAmount, 0);
    const totalVariance = totalActual - totalPlanned;
    const totalTransactions = transactions.length;

    // Group transactions by category
    const transactionsByCategory = transactions.reduce((acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = [];
      }
      acc[transaction.category].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Budget Report - ${monthName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; }
        .positive { color: #22c55e; }
        .negative { color: #ef4444; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .amount { text-align: right; }
        .category-section { margin-bottom: 40px; }
        .category-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
        @media print {
            body { margin: 0; }
            .header { page-break-inside: avoid; }
            .category-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Budget Report</h1>
        <h2>${monthName}</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="summary">
        <h3>Summary</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">$${totalPlanned.toFixed(2)}</div>
                <div>Total Planned</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">$${totalActual.toFixed(2)}</div>
                <div>Total Actual</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${totalVariance >= 0 ? 'negative' : 'positive'}">
                    $${Math.abs(totalVariance).toFixed(2)}
                </div>
                <div>${totalVariance >= 0 ? 'Over Budget' : 'Under Budget'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${totalTransactions}</div>
                <div>Total Transactions</div>
            </div>
        </div>
    </div>

    <div class="category-section">
        <h3>Budget Categories</h3>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Planned</th>
                    <th>Actual</th>
                    <th>Variance</th>
                    <th>% of Budget</th>
                </tr>
            </thead>
            <tbody>
                ${budgets.map(budget => {
      const variance = budget.actualAmount - budget.plannedAmount;
      const percentage = budget.plannedAmount > 0 ? (budget.actualAmount / budget.plannedAmount * 100) : 0;
      return `
                    <tr>
                        <td>${budget.name}</td>
                        <td class="amount">$${budget.plannedAmount.toFixed(2)}</td>
                        <td class="amount">$${budget.actualAmount.toFixed(2)}</td>
                        <td class="amount ${variance >= 0 ? 'negative' : 'positive'}">
                            ${variance >= 0 ? '+' : ''}$${variance.toFixed(2)}
                        </td>
                        <td class="amount">${percentage.toFixed(1)}%</td>
                    </tr>
                  `;
    }).join('')}
            </tbody>
        </table>
    </div>

    ${Object.entries(transactionsByCategory).map(([category, categoryTransactions]) => `
        <div class="category-section">
            <h3 class="category-title">${category} Transactions (${categoryTransactions.length})</h3>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Merchant</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoryTransactions.map(transaction => `
                        <tr>
                            <td>${new Date(transaction.date).toLocaleDateString()}</td>
                            <td>${transaction.description}</td>
                            <td>${transaction.merchant || '-'}</td>
                            <td class="amount">$${transaction.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `).join('')}

    <script>
        // Auto-print functionality for PDF generation
        window.addEventListener('load', function() {
            if (window.location.search.includes('print=true')) {
                window.print();
            }
        });
    </script>
</body>
</html>
    `;
  }

  /**
   * Escape CSV field to handle commas, quotes, and newlines
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Format date for filename (YYYY-MM-DD)
   */
  private formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export const webExportService = new WebExportService();
