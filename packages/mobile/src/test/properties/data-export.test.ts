/**
 * Property-based tests for data export functionality
 * Tests CSV export, PDF generation, and data integrity
 */

import fc from 'fast-check';
import { exportService } from '../../services/export';
import { Budget, Transaction } from '../../types';

// Mock dependencies
jest.mock('expo-file-system', () => ({
  Paths: {
    document: { uri: 'file:///mock/document/' },
  },
  File: jest.fn().mockImplementation((path, filename) => ({
    uri: `${path.uri}${filename}`,
    write: jest.fn().mockResolvedValue(undefined),
    text: jest.fn().mockResolvedValue('mock,csv,data\n1,2,3'),
  })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({
    uri: 'file:///mock/report.pdf',
    numberOfPages: 1,
  }),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Generators for test data
const budgetGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  userId: fc.string({ minLength: 1, maxLength: 50 }),
  month: fc.string({ minLength: 7, maxLength: 7 }), // YYYY-MM format
  groups: fc.array(fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    type: fc.constantFrom('income', 'savings', 'expense'),
    icon: fc.string({ minLength: 1, maxLength: 10 }),
    categories: fc.array(fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      icon: fc.string({ minLength: 1, maxLength: 10 }),
      isRecurring: fc.boolean(),
      baseAmount: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }).map(Math.fround),
      plannedMonthlyAmount: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }).map(Math.fround),
      actualAmount: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }).map(Math.fround),
      variance: fc.float({ min: Math.fround(-5000), max: Math.fround(5000), noNaN: true }).map(Math.fround),
      transactions: fc.array(fc.record({}), { maxLength: 0 }), // Empty for simplicity
      order: fc.integer({ min: 0, max: 100 }),
      isCustom: fc.boolean(),
      isArchived: fc.boolean(),
      usageCount: fc.integer({ min: 0, max: 1000 }),
    }), { maxLength: 10 }),
    isCollapsed: fc.boolean(),
    order: fc.integer({ min: 0, max: 100 }),
  }), { maxLength: 5 }),
  isAIGenerated: fc.boolean(),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
});

const transactionGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  categoryId: fc.string({ minLength: 1, maxLength: 50 }),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(Math.fround),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  merchant: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().split('T')[0]),
  currency: fc.option(fc.constantFrom('USD', 'EUR', 'GBP', 'CAD')),
  tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 })),
  syncStatus: fc.constantFrom('synced', 'pending', 'failed'),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
  updatedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString())),
});

const exportOptionsGenerator = fc.record({
  startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })),
  endDate: fc.option(fc.date({ min: new Date('2021-01-01'), max: new Date('2025-12-31') })),
  categories: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 })),
});

describe('Data Export Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 23: CSV Export Data Completeness
   * Validates that CSV export includes all required data fields
   */
  test('Property 23: CSV export includes all required data fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(budgetGenerator, { maxLength: 20 }),
        exportOptionsGenerator,
        async (budgets, options) => {
          // Mock the File.write to capture CSV data
          let capturedCsvData = '';
          const mockFile = {
            uri: 'file:///mock/budgets.csv',
            write: jest.fn().mockImplementation((data: string) => {
              capturedCsvData = data;
              return Promise.resolve();
            }),
          };

          const { File } = require('expo-file-system');
          File.mockImplementation(() => mockFile);

          // Export budgets as CSV
          const result = await exportService.exportBudgetsToCSV(budgets, { ...options, format: 'csv' });

          // Verify export succeeded
          expect(result.success).toBe(true);
          expect(result.filePath).toBeDefined();
          expect(capturedCsvData).toBeTruthy();

          // Verify CSV structure
          const lines = capturedCsvData.split('\n').filter(line => line.trim());
          expect(lines.length).toBeGreaterThan(0);

          // Verify header row exists
          const header = lines[0];
          expect(header).toContain('Budget ID');
          expect(header).toContain('Month');
          expect(header).toContain('Group Name');
          expect(header).toContain('Category Name');
          expect(header).toContain('Planned Amount');
          expect(header).toContain('Actual Amount');

          // Verify data rows match budget count (only if budgets exist)
          const dataRows = lines.slice(1);
          const expectedRows = budgets.reduce((total, budget) =>
            total + budget.groups.reduce((groupTotal, group) =>
              groupTotal + group.categories.length, 0), 0);

          if (expectedRows > 0) {
            expect(dataRows.length).toBe(expectedRows);
          } else {
            expect(dataRows.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24: Transaction CSV Export Accuracy
   * Validates that transaction CSV export maintains data accuracy
   */
  test('Property 24: Transaction CSV export maintains data accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionGenerator, { maxLength: 50 }),
        exportOptionsGenerator,
        async (transactions, options) => {
          // Mock the File.write to capture CSV data
          let capturedCsvData = '';
          const mockFile = {
            uri: 'file:///mock/transactions.csv',
            write: jest.fn().mockImplementation((data: string) => {
              capturedCsvData = data;
              return Promise.resolve();
            }),
          };

          const { File } = require('expo-file-system');
          File.mockImplementation(() => mockFile);

          // Export transactions as CSV
          const result = await exportService.exportTransactionsToCSV(transactions, { ...options, format: 'csv' });

          // Verify export succeeded
          expect(result.success).toBe(true);
          expect(result.filePath).toBeDefined();
          expect(capturedCsvData).toBeTruthy();

          // Parse CSV data
          const lines = capturedCsvData.split('\n').filter(line => line.trim());
          expect(lines.length).toBeGreaterThan(0);

          // Verify header
          const header = lines[0];
          expect(header).toContain('Transaction ID');
          expect(header).toContain('Date');
          expect(header).toContain('Amount');
          expect(header).toContain('Description');
          expect(header).toContain('Category ID');

          // Verify data integrity
          const dataRows = lines.slice(1);

          // Apply filters to get expected transaction count
          let filteredTransactions = [...transactions];

          if (options.startDate || options.endDate) {
            filteredTransactions = filteredTransactions.filter(t => {
              const transactionDate = new Date(t.date);
              if (options.startDate && transactionDate < options.startDate) return false;
              if (options.endDate && transactionDate > options.endDate) return false;
              return true;
            });
          }

          if (options.categories && options.categories.length > 0) {
            filteredTransactions = filteredTransactions.filter(t =>
              options.categories!.includes(t.categoryId)
            );
          }

          expect(dataRows.length).toBe(filteredTransactions.length);

          // Verify each data row has correct number of fields
          for (const row of dataRows) {
            const fields = row.split(',');
            expect(fields.length).toBeGreaterThanOrEqual(5); // At least ID, Date, Amount, Description, Category
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 25: PDF Report Generation Consistency
   * Validates that PDF reports are generated consistently
   */
  test('Property 25: PDF report generation maintains consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(budgetGenerator, { maxLength: 10 }),
        fc.array(transactionGenerator, { maxLength: 30 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        async (budgets, transactions, month) => {
          // Mock expo-print
          const mockPrintResult = {
            uri: 'file:///mock/report.pdf',
            numberOfPages: Math.max(1, Math.ceil(budgets.length / 10)),
          };

          const { printToFileAsync } = require('expo-print');
          printToFileAsync.mockResolvedValue(mockPrintResult);

          // Generate PDF report
          const result = await exportService.generateMonthlyBudgetPDF(budgets, transactions, month, { format: 'pdf' });

          // Verify report generation
          expect(result.success).toBe(true);
          expect(result.filePath).toBe(mockPrintResult.uri);
          expect(result.pages).toBe(mockPrintResult.numberOfPages);

          // Verify printToFileAsync was called with HTML content
          expect(printToFileAsync).toHaveBeenCalledWith({
            html: expect.stringContaining('<html>'),
            width: 612,
            height: 792,
            base64: false,
          });

          // Verify HTML content includes budget data
          const htmlContent = printToFileAsync.mock.calls[0][0].html;
          const monthStr = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          expect(htmlContent).toContain(monthStr);
          expect(htmlContent).toContain('Monthly Budget Report');

          // Should contain budget information if budgets exist
          if (budgets.length > 0) {
            expect(htmlContent).toContain('Budget Summary');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26: Export Data Filtering Accuracy
   * Validates that export filters work correctly across all export types
   */
  test('Property 26: Export filters work correctly across all formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionGenerator, { maxLength: 30 }),
        fc.record({
          startDate: fc.date({ min: new Date('2023-01-01'), max: new Date('2023-06-30') }),
          endDate: fc.date({ min: new Date('2023-07-01'), max: new Date('2023-12-31') }),
          categories: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        }),
        async (transactions, filters) => {
          // Mock file operations
          let capturedCsvData = '';
          const mockFile = {
            uri: 'file:///mock/filtered.csv',
            write: jest.fn().mockImplementation((data: string) => {
              capturedCsvData = data;
              return Promise.resolve();
            }),
          };

          const { File } = require('expo-file-system');
          File.mockImplementation(() => mockFile);

          // Export with filters
          const result = await exportService.exportTransactionsToCSV(transactions, { ...filters, format: 'csv' });

          expect(result.success).toBe(true);
          expect(capturedCsvData).toBeTruthy();

          // Parse and verify filtered data
          const lines = capturedCsvData.split('\n').filter(line => line.trim());
          const dataRows = lines.slice(1); // Skip header

          // Manually filter transactions to compare
          const expectedTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const dateInRange = transactionDate >= filters.startDate && transactionDate <= filters.endDate;
            const categoryMatch = filters.categories.includes(t.categoryId);
            return dateInRange && categoryMatch;
          });

          expect(dataRows.length).toBe(expectedTransactions.length);

          // Verify each row represents a valid filtered transaction
          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const fields = row.split(',');

            // Find corresponding transaction
            const transactionId = fields[0].replace(/"/g, ''); // Remove quotes
            const transaction = expectedTransactions.find(t => t.id === transactionId);

            expect(transaction).toBeDefined();
            if (transaction) {
              // Verify date is within range
              const transactionDate = new Date(transaction.date);
              expect(transactionDate >= filters.startDate).toBe(true);
              expect(transactionDate <= filters.endDate).toBe(true);

              // Verify category is in filter list
              expect(filters.categories.includes(transaction.categoryId)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 27: Export Round-Trip Data Integrity
   * Validates that exported data can be parsed back without loss
   */
  test('Property 27: Export maintains basic data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionGenerator, { maxLength: 20 }),
        async (transactions) => {
          // Mock file operations to capture and return CSV data
          let capturedCsvData = '';
          const mockFile = {
            uri: 'file:///mock/roundtrip.csv',
            write: jest.fn().mockImplementation((data: string) => {
              capturedCsvData = data;
              return Promise.resolve();
            }),
            text: jest.fn().mockImplementation(() => Promise.resolve(capturedCsvData)),
          };

          const { File } = require('expo-file-system');
          File.mockImplementation(() => mockFile);

          // Export transactions
          const exportResult = await exportService.exportTransactionsToCSV(transactions, { format: 'csv' });
          expect(exportResult.success).toBe(true);

          // Parse the CSV data back
          const lines = capturedCsvData.split('\n').filter(line => line.trim());
          const header = lines[0].split(',').map(h => h.replace(/"/g, ''));
          const dataRows = lines.slice(1);

          // Verify we can reconstruct transaction data
          const parsedTransactions = dataRows.map(row => {
            const fields = row.split(',').map(f => f.replace(/"/g, ''));
            const transaction: any = {};

            header.forEach((headerField, index) => {
              const value = fields[index];
              switch (headerField) {
                case 'Transaction ID':
                  transaction.id = value;
                  break;
                case 'Date':
                  transaction.date = value;
                  break;
                case 'Amount':
                  transaction.amount = parseFloat(value);
                  break;
                case 'Description':
                  transaction.description = value;
                  break;
                case 'Category ID':
                  transaction.categoryId = value;
                  break;
                case 'Merchant':
                  transaction.merchant = value || undefined;
                  break;
              }
            });

            return transaction;
          });

          // Verify data integrity
          expect(parsedTransactions.length).toBe(transactions.length);

          for (let i = 0; i < transactions.length; i++) {
            const original = transactions[i];
            const parsed = parsedTransactions.find(p => p.id === original.id);

            expect(parsed).toBeDefined();
            if (parsed) {
              expect(parsed.id).toBe(original.id);
              expect(parsed.date).toBe(original.date);
              expect(Math.abs(parsed.amount - original.amount)).toBeLessThan(0.01); // Float precision
              expect(parsed.description).toBe(original.description);
              expect(parsed.categoryId).toBe(original.categoryId);

              if (original.merchant) {
                expect(parsed.merchant).toBe(original.merchant);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
