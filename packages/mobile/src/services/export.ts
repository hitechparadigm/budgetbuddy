import { Budget, Transaction } from '../types';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';

export interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  format: 'csv' | 'pdf';
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  pages?: number;
  error?: string;
}

class ExportService {
  /**
   * Export budget data to CSV format
   */
  async exportBudgetsToCSV(budgets: Budget[], options: ExportOptions): Promise<ExportResult> {
    try {
      const filteredBudgets = this.filterBudgetsByDateRange(budgets, options);
      const csvContent = this.generateBudgetCSV(filteredBudgets);

      const fileName = `budgets_${this.formatDateForFilename(new Date())}.csv`;
      const budgetFile = new File(Paths.document, fileName);

      await budgetFile.write(csvContent);

      if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(budgetFile.uri);
      }

      return { success: true, filePath: budgetFile.uri };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Export transaction data to CSV format
   */
  async exportTransactionsToCSV(transactions: Transaction[], options: ExportOptions): Promise<ExportResult> {
    try {
      const filteredTransactions = this.filterTransactionsByOptions(transactions, options);
      const csvContent = this.generateTransactionCSV(filteredTransactions);

      const fileName = `transactions_${this.formatDateForFilename(new Date())}.csv`;
      const transactionFile = new File(Paths.document, fileName);

      await transactionFile.write(csvContent);

      if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(transactionFile.uri);
      }

      return { success: true, filePath: transactionFile.uri };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate PDF report for monthly budget summary
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

      // Create PDF from HTML
      const fileName = `budget_report_${this.formatDateForFilename(month)}.pdf`;

      // For mobile, use expo-print
      if (Platform.OS !== 'web') {
        try {
          const { uri, numberOfPages } = await Print.printToFileAsync({
            html: htmlContent,
            width: 612,
            height: 792,
            base64: false,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
          }

          return { success: true, filePath: uri, pages: numberOfPages };
        } catch (printError) {
          // Fallback: save as HTML file if PDF generation fails
          const htmlFileName = `budget_report_${this.formatDateForFilename(month)}.html`;
          const htmlFile = new File(Paths.document, htmlFileName);

          await htmlFile.write(htmlContent);

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(htmlFile.uri);
          }

          return { success: true, filePath: htmlFile.uri, pages: 1 };
        }
      } else {
        // Web platform: save as HTML file
        const htmlFileName = `budget_report_${this.formatDateForFilename(month)}.html`;
        const htmlFile = new File(Paths.document, htmlFileName);

        await htmlFile.write(htmlContent);

        return { success: true, filePath: htmlFile.uri, pages: 1 };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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
        if (!options.categories.includes(transaction.categoryId)) {
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
      'Budget ID',
      'Month',
      'Group Name',
      'Category Name',
      'Planned Amount',
      'Actual Amount',
      'Variance',
      'Type',
      'Is Recurring',
      'Created Date',
      'Updated Date'
    ];

    const rows: string[][] = [];

    budgets.forEach(budget => {
      budget.groups.forEach(group => {
        group.categories.forEach(category => {
          const variance = category.actualAmount - category.plannedMonthlyAmount;
          rows.push([
            budget.id,
            budget.month,
            this.escapeCsvField(group.name),
            this.escapeCsvField(category.name),
            category.plannedMonthlyAmount.toString(),
            category.actualAmount.toString(),
            variance.toString(),
            group.type,
            category.isRecurring.toString(),
            budget.createdAt,
            budget.updatedAt
          ]);
        });
      });
    });

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  /**
   * Generate CSV content for transactions
   */
  private generateTransactionCSV(transactions: Transaction[]): string {
    const headers = [
      'Transaction ID',
      'Date',
      'Amount',
      'Description',
      'Category ID',
      'Merchant',
      'Location',
      'Tags',
      'Currency',
      'Sync Status',
      'Created Date'
    ];

    const rows = transactions.map(transaction => [
      transaction.id,
      transaction.date,
      transaction.amount.toString(),
      this.escapeCsvField(transaction.description),
      this.escapeCsvField(transaction.categoryId),
      this.escapeCsvField(transaction.merchant || ''),
      this.escapeCsvField(transaction.location?.address || ''),
      this.escapeCsvField(transaction.tags?.join(';') || ''),
      this.escapeCsvField(transaction.currency || 'USD'),
      transaction.syncStatus || 'synced',
      transaction.createdAt
    ]);

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

    // Calculate summary statistics from budget categories
    let totalPlanned = 0;
    let totalActual = 0;
    const budgetCategories: Array<{ name: string, planned: number, actual: number, type: string }> = [];

    budgets.forEach(budget => {
      budget.groups.forEach(group => {
        group.categories.forEach(category => {
          totalPlanned += category.plannedMonthlyAmount;
          totalActual += category.actualAmount;
          budgetCategories.push({
            name: category.name,
            planned: category.plannedMonthlyAmount,
            actual: category.actualAmount,
            type: group.type
          });
        });
      });
    });

    const totalVariance = totalActual - totalPlanned;
    const totalTransactions = transactions.length;

    // Group transactions by category
    const transactionsByCategory = transactions.reduce((acc, transaction) => {
      if (!acc[transaction.categoryId]) {
        acc[transaction.categoryId] = [];
      }
      acc[transaction.categoryId].push(transaction);
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

export const exportService = new ExportService();
