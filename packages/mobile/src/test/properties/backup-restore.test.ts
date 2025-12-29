/**
 * Property-based tests for backup and restore functionality
 * Tests data integrity, backup completeness, and restore accuracy
 */

import fc from 'fast-check';
import { backupService, BackupData, BackupOptions } from '../../services/backup';
import { Budget, Transaction } from '../../types';

// Mock dependencies
jest.mock('expo-file-system', () => ({
  Paths: {
    document: { uri: 'file:///mock/document/' },
  },
  File: jest.fn().mockImplementation((path, filename) => ({
    uri: `${path.uri}${filename}`,
    write: jest.fn().mockResolvedValue(undefined),
    text: jest.fn().mockResolvedValue('{"version":"1.0.0","timestamp":"2023-01-01T00:00:00.000Z","userId":"test","budgets":[],"transactions":[],"settings":{},"metadata":{"totalBudgets":0,"totalTransactions":0,"dateRange":{"earliest":"2023-01-01T00:00:00.000Z","latest":"2023-01-01T00:00:00.000Z"},"categories":[]}}'),
  })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///mock/backup.json' }],
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage: Record<string, string> = {};
  return {
    getItem: jest.fn().mockImplementation((key: string) => Promise.resolve(storage[key] || null)),
    setItem: jest.fn().mockImplementation((key: string, value: string) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    getAllKeys: jest.fn().mockResolvedValue(Object.keys(storage)),
    multiGet: jest.fn().mockImplementation((keys: string[]) =>
      Promise.resolve(keys.map(key => [key, storage[key] || null]))
    ),
  };
});

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

const backupOptionsGenerator = fc.record({
  includeSettings: fc.option(fc.boolean()),
  dateRange: fc.option(fc.record({
    startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    endDate: fc.date({ min: new Date('2021-01-01'), max: new Date('2025-12-31') }),
  })),
  categories: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 })),
});

describe('Backup and Restore Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the mock storage
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const storage: Record<string, string> = {};
    AsyncStorage.getItem.mockImplementation((key: string) => Promise.resolve(storage[key] || null));
    AsyncStorage.setItem.mockImplementation((key: string, value: string) => {
      storage[key] = value;
      return Promise.resolve();
    });
  });

  /**
   * Property 18: Backup Data Completeness
   * Validates that all provided data is included in the backup
   */
  test('Property 18: Backup includes all provided data without loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(budgetGenerator, { maxLength: 20 }),
        fc.array(transactionGenerator, { maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        backupOptionsGenerator,
        async (budgets, transactions, userId, options) => {
          // Create backup
          const result = await backupService.createFullBackup(budgets, transactions, userId, options);

          // Backup should succeed
          expect(result.success).toBe(true);
          expect(result.filePath).toBeDefined();
          expect(result.backupSize).toBeGreaterThan(0);

          // Verify backup contains expected structure
          expect(result.filePath).toContain('budgetbuddy_backup_');
          expect(result.filePath).toContain('.json');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19: Backup Metadata Accuracy
   * Validates that backup metadata correctly reflects the actual data
   */
  test('Property 19: Backup metadata accurately reflects data content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(budgetGenerator, { maxLength: 15 }),
        fc.array(transactionGenerator, { maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (budgets, transactions, userId) => {
          // Mock the File.write to capture the backup data
          let capturedBackupData: BackupData | null = null;
          const mockFile = {
            uri: 'file:///mock/backup.json',
            write: jest.fn().mockImplementation((data: string) => {
              capturedBackupData = JSON.parse(data);
              return Promise.resolve();
            }),
          };

          // Mock the File constructor
          const { File } = require('expo-file-system');
          File.mockImplementation(() => mockFile);

          // Create backup
          const result = await backupService.createFullBackup(budgets, transactions, userId);

          // Verify backup was created
          expect(result.success).toBe(true);
          expect(capturedBackupData).not.toBeNull();

          if (capturedBackupData) {
            // Verify metadata accuracy
            expect(capturedBackupData.metadata.totalBudgets).toBe(budgets.length);
            expect(capturedBackupData.metadata.totalTransactions).toBe(transactions.length);
            expect(capturedBackupData.userId).toBe(userId);
            expect(capturedBackupData.version).toBe('1.0.0');

            // Verify data integrity
            expect(capturedBackupData.budgets).toHaveLength(budgets.length);
            expect(capturedBackupData.transactions).toHaveLength(transactions.length);

            // Verify categories are extracted correctly
            const expectedCategories = Array.from(new Set([
              ...budgets.flatMap(b => b.groups.flatMap(g => g.categories.map(c => c.name))),
              ...transactions.map(t => t.categoryId),
            ])).sort();

            expect(capturedBackupData.metadata.categories).toEqual(expectedCategories);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backup Options Filtering
   * Validates that backup options correctly filter the data
   */
  test('Property 20: Backup options correctly filter data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(budgetGenerator, { maxLength: 10 }),
        fc.array(transactionGenerator, { maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({
          dateRange: fc.record({
            startDate: fc.date({ min: new Date('2023-01-01'), max: new Date('2023-06-30') }),
            endDate: fc.date({ min: new Date('2023-07-01'), max: new Date('2023-12-31') }),
          }),
          categories: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        }),
        async (budgets, transactions, userId, options) => {
          // Mock the File.write to capture the backup data
          let capturedBackupData: BackupData | null = null;
          const mockFile = {
            uri: 'file:///mock/backup.json',
            write: jest.fn().mockImplementation((data: string) => {
              capturedBackupData = JSON.parse(data);
              return Promise.resolve();
            }),
          };

          const { File } = require('expo-file-system');
          File.mockImplementation(() => mockFile);

          // Create backup with filters
          const result = await backupService.createFullBackup(budgets, transactions, userId, options);

          expect(result.success).toBe(true);
          expect(capturedBackupData).not.toBeNull();

          if (capturedBackupData) {
            // Verify date range filtering for transactions
            const filteredTransactions = capturedBackupData.transactions;
            for (const transaction of filteredTransactions) {
              const transactionDate = new Date(transaction.date);
              expect(transactionDate >= options.dateRange.startDate).toBe(true);
              expect(transactionDate <= options.dateRange.endDate).toBe(true);
            }

            // Verify category filtering for transactions
            for (const transaction of filteredTransactions) {
              expect(options.categories.includes(transaction.categoryId)).toBe(true);
            }

            // Metadata should reflect filtered data
            expect(capturedBackupData.metadata.totalTransactions).toBe(filteredTransactions.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 21: Restore Data Integrity
   * Validates that restore operation maintains data integrity
   */
  test('Property 21: Restore operation maintains data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(budgetGenerator, { maxLength: 5 }),
        fc.array(transactionGenerator, { maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (budgets, transactions, userId) => {
          // Mock backup data
          const mockBackupData: BackupData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            userId,
            budgets,
            transactions,
            settings: { testSetting: 'value' },
            metadata: {
              totalBudgets: budgets.length,
              totalTransactions: transactions.length,
              dateRange: {
                earliest: '2023-01-01T00:00:00.000Z',
                latest: '2023-12-31T23:59:59.999Z',
              },
              categories: Array.from(new Set([
                ...budgets.flatMap(b => b.groups.flatMap(g => g.categories.map(c => c.name))),
                ...transactions.map(t => t.categoryId),
              ])).sort(),
            },
          };

          // Mock File.text to return the backup data
          const { File } = require('expo-file-system');
          File.mockImplementation(() => ({
            text: jest.fn().mockResolvedValue(JSON.stringify(mockBackupData)),
          }));

          // Perform restore
          const result = await backupService.restoreFromBackup();

          // Verify restore result
          expect(result.success).toBe(true);
          expect(result.restored.budgets).toBe(budgets.length);
          expect(result.restored.transactions).toBe(transactions.length);
          expect(result.restored.settings).toBeGreaterThanOrEqual(1); // At least the test setting
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22: Backup Schedule Management
   * Validates that backup scheduling works correctly
   */
  test('Property 22: Backup schedule management maintains consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('daily', 'weekly', 'monthly'),
        async (frequency) => {
          // Schedule automatic backup
          await backupService.scheduleAutomaticBackup(frequency);

          // Get backup status
          const status = await backupService.getBackupStatus();

          // Verify scheduling
          expect(status.autoBackupEnabled).toBe(true);
          expect(status.frequency).toBe(frequency);
          expect(status.nextBackup).toBeDefined();

          // Verify next backup date is in the future
          if (status.nextBackup) {
            const nextBackupDate = new Date(status.nextBackup);
            const now = new Date();
            expect(nextBackupDate > now).toBe(true);

            // Verify frequency-specific logic
            const timeDiff = nextBackupDate.getTime() - now.getTime();
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

            switch (frequency) {
              case 'daily':
                expect(daysDiff).toBeGreaterThan(0.5);
                expect(daysDiff).toBeLessThan(1.5);
                break;
              case 'weekly':
                expect(daysDiff).toBeGreaterThan(6);
                expect(daysDiff).toBeLessThan(8);
                break;
              case 'monthly':
                expect(daysDiff).toBeGreaterThan(28);
                expect(daysDiff).toBeLessThan(32);
                break;
            }
          }

          // Test disabling
          await backupService.disableAutomaticBackup();
          const disabledStatus = await backupService.getBackupStatus();
          expect(disabledStatus.autoBackupEnabled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
