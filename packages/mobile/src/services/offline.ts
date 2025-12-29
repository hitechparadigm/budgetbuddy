import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { getNetworkStatus } from './api';

/**
 * Offline Storage Service
 * Handles offline data storage, sync queue, and conflict resolution
 */

// Storage keys
const STORAGE_KEYS = {
  SYNC_QUEUE: 'sync_queue',
  LAST_SYNC: 'last_sync',
  OFFLINE_DATA: 'offline_data',
  USER_PREFERENCES: 'user_preferences',
} as const;

// Database configuration
const DB_NAME = 'budgetbuddy.db';
const DB_VERSION = 1;

// Sync queue item types
export interface SyncQueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'budget' | 'transaction' | 'category';
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface OfflineData {
  budgets: Record<string, any>;
  transactions: Record<string, any>;
  categories: Record<string, any>;
  summary: Record<string, any>;
}

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize offline storage
 */
export const initializeOfflineStorage = async (): Promise<void> => {
  try {
    // Initialize SQLite database
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Create tables if they don't exist
    await createTables();

    // Initialize sync queue if it doesn't exist
    const syncQueue = await getSyncQueue();
    if (!syncQueue) {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
    }

    console.log('Offline storage initialized');
  } catch (error) {
    console.error('Failed to initialize offline storage:', error);
    throw error;
  }
};

/**
 * Create database tables
 */
const createTables = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  const createTablesSQL = `
    -- Budgets table
    CREATE TABLE IF NOT EXISTS budgets (
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
    );

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
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
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'synced'
    );

    -- Sync metadata table
    CREATE TABLE IF NOT EXISTS sync_metadata (
      entity_type TEXT PRIMARY KEY,
      last_sync_timestamp TEXT NOT NULL,
      last_sync_status TEXT NOT NULL
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
    CREATE INDEX IF NOT EXISTS idx_budgets_date ON budgets(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions(budget_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
  `;

  await db.execAsync(createTablesSQL);
};

/**
 * Get sync queue from AsyncStorage
 */
export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  try {
    const queueData = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    return queueData ? JSON.parse(queueData) : [];
  } catch (error) {
    console.error('Failed to get sync queue:', error);
    return [];
  }
};

/**
 * Add item to sync queue
 */
export const addToSyncQueue = async (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
  try {
    const queue = await getSyncQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `${item.entity}_${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(newItem);
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));

    console.log('Added to sync queue:', newItem);
  } catch (error) {
    console.error('Failed to add to sync queue:', error);
    throw error;
  }
};

/**
 * Remove item from sync queue
 */
export const removeFromSyncQueue = async (itemId: string): Promise<void> => {
  try {
    const queue = await getSyncQueue();
    const filteredQueue = queue.filter(item => item.id !== itemId);
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(filteredQueue));

    console.log('Removed from sync queue:', itemId);
  } catch (error) {
    console.error('Failed to remove from sync queue:', error);
    throw error;
  }
};

/**
 * Update sync queue item (for retry logic)
 */
export const updateSyncQueueItem = async (itemId: string, updates: Partial<SyncQueueItem>): Promise<void> => {
  try {
    const queue = await getSyncQueue();
    const itemIndex = queue.findIndex(item => item.id === itemId);

    if (itemIndex !== -1) {
      queue[itemIndex] = { ...queue[itemIndex], ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }
  } catch (error) {
    console.error('Failed to update sync queue item:', error);
    throw error;
  }
};

/**
 * Store data offline in SQLite
 */
export const storeOfflineData = async (
  table: 'budgets' | 'transactions' | 'categories',
  data: any,
  syncStatus: 'pending' | 'synced' | 'conflict' = 'pending'
): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  try {
    const now = new Date().toISOString();

    switch (table) {
      case 'budgets':
        await db.runAsync(
          `INSERT OR REPLACE INTO budgets
           (id, name, amount, category, frequency, start_date, end_date, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.name,
            data.amount,
            data.category,
            data.frequency,
            data.startDate,
            data.endDate,
            data.createdAt || now,
            now,
            syncStatus
          ]
        );
        break;

      case 'transactions':
        await db.runAsync(
          `INSERT OR REPLACE INTO transactions
           (id, budget_id, description, amount, category, date, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.budgetId,
            data.description,
            data.amount,
            data.category,
            data.date,
            data.createdAt || now,
            now,
            syncStatus
          ]
        );
        break;

      case 'categories':
        await db.runAsync(
          `INSERT OR REPLACE INTO categories
           (id, name, color, icon, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.name,
            data.color,
            data.icon,
            data.createdAt || now,
            now,
            syncStatus
          ]
        );
        break;
    }

    console.log(`Stored ${table} data offline:`, data.id);
  } catch (error) {
    console.error(`Failed to store ${table} data offline:`, error);
    throw error;
  }
};

/**
 * Get offline data from SQLite
 */
export const getOfflineData = async <T = any>(
  table: 'budgets' | 'transactions' | 'categories',
  filters?: Record<string, any>
): Promise<T[]> => {
  if (!db) throw new Error('Database not initialized');

  try {
    let query = `SELECT * FROM ${table} WHERE is_deleted = 0`;
    const params: any[] = [];

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query += ` AND ${key} = ?`;
        params.push(value);
      });
    }

    query += ' ORDER BY updated_at DESC';

    const result = await db.getAllAsync(query, params);
    return result as T[];
  } catch (error) {
    console.error(`Failed to get ${table} data offline:`, error);
    return [];
  }
};

/**
 * Delete offline data (soft delete)
 */
export const deleteOfflineData = async (
  table: 'budgets' | 'transactions' | 'categories',
  id: string
): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  try {
    await db.runAsync(
      `UPDATE ${table} SET is_deleted = 1, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [new Date().toISOString(), id]
    );

    console.log(`Deleted ${table} data offline:`, id);
  } catch (error) {
    console.error(`Failed to delete ${table} data offline:`, error);
    throw error;
  }
};

/**
 * Get pending sync items from database
 */
export const getPendingSyncItems = async (): Promise<{
  budgets: any[];
  transactions: any[];
  categories: any[];
}> => {
  if (!db) throw new Error('Database not initialized');

  try {
    const [budgets, transactions, categories] = await Promise.all([
      db.getAllAsync(`SELECT * FROM budgets WHERE sync_status = 'pending'`),
      db.getAllAsync(`SELECT * FROM transactions WHERE sync_status = 'pending'`),
      db.getAllAsync(`SELECT * FROM categories WHERE sync_status = 'pending'`),
    ]);

    return { budgets, transactions, categories };
  } catch (error) {
    console.error('Failed to get pending sync items:', error);
    return { budgets: [], transactions: [], categories: [] };
  }
};

/**
 * Mark data as synced
 */
export const markAsSynced = async (
  table: 'budgets' | 'transactions' | 'categories',
  id: string
): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  try {
    await db.runAsync(
      `UPDATE ${table} SET sync_status = 'synced' WHERE id = ?`,
      [id]
    );
  } catch (error) {
    console.error(`Failed to mark ${table} as synced:`, error);
    throw error;
  }
};

/**
 * Handle conflict resolution
 */
export const resolveConflict = async (
  table: 'budgets' | 'transactions' | 'categories',
  localData: any,
  serverData: any,
  strategy: 'server_wins' | 'client_wins' | 'merge' = 'server_wins'
): Promise<any> => {
  try {
    let resolvedData: any;

    switch (strategy) {
      case 'server_wins':
        resolvedData = serverData;
        break;

      case 'client_wins':
        resolvedData = localData;
        break;

      case 'merge':
        // Simple merge strategy - take the most recent update
        const localTime = new Date(localData.updatedAt || localData.updated_at).getTime();
        const serverTime = new Date(serverData.updatedAt || serverData.updated_at).getTime();
        resolvedData = serverTime > localTime ? serverData : localData;
        break;

      default:
        resolvedData = serverData;
    }

    // Store resolved data
    await storeOfflineData(table, resolvedData, 'synced');

    console.log(`Resolved conflict for ${table}:`, resolvedData.id);
    return resolvedData;
  } catch (error) {
    console.error('Failed to resolve conflict:', error);
    throw error;
  }
};

/**
 * Clear all offline data
 */
export const clearOfflineData = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  try {
    await db.execAsync(`
      DELETE FROM budgets;
      DELETE FROM transactions;
      DELETE FROM categories;
      DELETE FROM sync_metadata;
    `);

    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SYNC_QUEUE,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.OFFLINE_DATA,
    ]);

    console.log('Cleared all offline data');
  } catch (error) {
    console.error('Failed to clear offline data:', error);
    throw error;
  }
};

/**
 * Get storage statistics
 */
export const getStorageStats = async (): Promise<{
  syncQueueSize: number;
  pendingItems: number;
  lastSync: string | null;
  isOnline: boolean;
}> => {
  try {
    const [syncQueue, pendingItems] = await Promise.all([
      getSyncQueue(),
      getPendingSyncItems(),
    ]);

    const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    const { isOnline } = getNetworkStatus();

    const totalPending = pendingItems.budgets.length +
      pendingItems.transactions.length +
      pendingItems.categories.length;

    return {
      syncQueueSize: syncQueue.length,
      pendingItems: totalPending,
      lastSync,
      isOnline,
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return {
      syncQueueSize: 0,
      pendingItems: 0,
      lastSync: null,
      isOnline: false,
    };
  }
};

/**
 * Update last sync timestamp
 */
export const updateLastSync = async (): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  } catch (error) {
    console.error('Failed to update last sync:', error);
  }
};
