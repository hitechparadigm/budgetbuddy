/**
 * offline.ts on the expo-sqlite async API (SDK 52+).
 *
 * Runs the real module against a fake database that records every call. The schema
 * literal below is copied verbatim from the pre-upgrade file (the expo-sqlite v11
 * version), so any schema edit fails this test.
 */

jest.unmock('../offline');

type Call = { method: string; sql?: string; args?: unknown[]; inTransaction: boolean };

const mockCalls: Call[] = [];
let mockInTransaction = false;
let mockTransactionCount = 0;

const mockDb = {
  execAsync: jest.fn(async (sql: string) => {
    mockCalls.push({ method: 'exec', sql, inTransaction: mockInTransaction });
  }),
  runAsync: jest.fn(async (sql: string, args?: unknown[]) => {
    mockCalls.push({ method: 'run', sql, args, inTransaction: mockInTransaction });
    return { lastInsertRowId: 7, changes: 2 };
  }),
  getAllAsync: jest.fn(async (sql: string, args?: unknown[]) => {
    mockCalls.push({ method: 'getAll', sql, args, inTransaction: mockInTransaction });
    return [{ id: 'row-1' }];
  }),
  withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
    mockTransactionCount += 1;
    mockInTransaction = true;
    try {
      await task();
    } finally {
      mockInTransaction = false;
    }
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve(mockDb)),
}));

import * as SQLite from 'expo-sqlite';
import {
  CREATE_TABLE_STATEMENTS,
  clearOfflineData,
  deleteOfflineData,
  execWrite,
  getOfflineData,
  initializeOfflineStorage,
  markAsSynced,
  storeOfflineData,
} from '../offline';

// Verbatim from `git show 726df868a55b:packages/mobile/src/services/offline.ts`.
const SCHEMA_BEFORE_UPGRADE = [
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'synced'
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    budget_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'synced',
    FOREIGN KEY (budget_id) REFERENCES budgets (id)
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'synced'
  )`,
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    entity_type TEXT PRIMARY KEY,
    last_sync_timestamp TEXT NOT NULL,
    last_sync_status TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category)`,
  `CREATE INDEX IF NOT EXISTS idx_budgets_date ON budgets(start_date, end_date)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions(budget_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)`,
];

const oneLine = (sql?: string) => (sql ?? '').replace(/\s+/g, ' ').trim();

describe('offline storage on expo-sqlite', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  beforeEach(async () => {
    mockCalls.length = 0;
    mockTransactionCount = 0;
    await initializeOfflineStorage();
  });

  it('opens budgetbuddy.db', () => {
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('budgetbuddy.db');
  });

  it('creates the unchanged schema, one statement at a time, in one transaction', () => {
    expect(CREATE_TABLE_STATEMENTS).toEqual(SCHEMA_BEFORE_UPGRADE);
    const execs = mockCalls.filter((c) => c.method === 'exec');
    expect(execs.map((c) => c.sql)).toEqual(SCHEMA_BEFORE_UPGRADE);
    expect(execs.every((c) => c.inTransaction)).toBe(true);
    expect(mockTransactionCount).toBe(1);
  });

  it('stores a budget with INSERT OR REPLACE in the original column order, binding NULL for a missing endDate', async () => {
    mockCalls.length = 0;

    await storeOfflineData('budgets', {
      id: 'budget-1',
      name: 'Groceries',
      amount: 400,
      category: 'food',
      frequency: 'monthly',
      startDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(mockCalls).toHaveLength(1);
    const [call] = mockCalls;
    expect(call.method).toBe('run');
    expect(oneLine(call.sql)).toBe(
      'INSERT OR REPLACE INTO budgets ' +
        '(id, name, amount, category, frequency, start_date, end_date, created_at, updated_at, sync_status) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    expect(call.args).toEqual([
      'budget-1',
      'Groceries',
      400,
      'food',
      'monthly',
      '2026-01-01',
      null,
      '2026-01-01T00:00:00.000Z',
      expect.any(String),
      'pending',
    ]);
    expect(call.args).not.toContain(undefined);
  });

  it('reads with the same filtered SELECT', async () => {
    mockCalls.length = 0;

    const rows = await getOfflineData('budgets', { category: 'x' });

    expect(rows).toEqual([{ id: 'row-1' }]);
    expect(mockCalls).toEqual([
      {
        method: 'getAll',
        sql: 'SELECT * FROM budgets WHERE is_deleted = 0 AND category = ? ORDER BY updated_at DESC',
        args: ['x'],
        inTransaction: false,
      },
    ]);
  });

  it('soft-deletes', async () => {
    mockCalls.length = 0;

    await deleteOfflineData('transactions', 'txn-1');

    expect(mockCalls).toHaveLength(1);
    expect(mockCalls[0].sql).toBe(
      "UPDATE transactions SET is_deleted = 1, updated_at = ?, sync_status = 'pending' WHERE id = ?",
    );
    expect(mockCalls[0].args).toEqual([expect.any(String), 'txn-1']);
  });

  it('marks a row as synced', async () => {
    mockCalls.length = 0;

    await markAsSynced('categories', 'cat-1');

    expect(mockCalls).toEqual([
      {
        method: 'run',
        sql: "UPDATE categories SET sync_status = 'synced' WHERE id = ?",
        args: ['cat-1'],
        inTransaction: false,
      },
    ]);
  });

  it('clears all four tables in one transaction', async () => {
    mockCalls.length = 0;
    mockTransactionCount = 0;

    await clearOfflineData();

    expect(mockTransactionCount).toBe(1);
    expect(mockCalls.map((c) => [c.method, c.sql, c.inTransaction])).toEqual([
      ['run', 'DELETE FROM budgets', true],
      ['run', 'DELETE FROM transactions', true],
      ['run', 'DELETE FROM categories', true],
      ['run', 'DELETE FROM sync_metadata', true],
    ]);
  });

  it('maps runAsync lastInsertRowId/changes to the legacy insertId/rowsAffected shape', async () => {
    await expect(execWrite('DELETE FROM budgets WHERE id = ?', ['budget-1'])).resolves.toEqual({
      insertId: 7,
      rowsAffected: 2,
    });
  });
});
