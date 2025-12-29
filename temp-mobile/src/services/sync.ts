import { api, getNetworkStatus } from './api';
import {
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItem,
  getPendingSyncItems,
  markAsSynced,
  storeOfflineData,
  resolveConflict,
  updateLastSync,
  SyncQueueItem,
} from './offline';

/**
 * Sync Service
 * Handles synchronization between offline and online data
 */

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  conflicts: number;
  errors: string[];
}

export interface SyncOptions {
  force?: boolean;
  maxRetries?: number;
  conflictResolution?: 'server_wins' | 'client_wins' | 'merge';
}

// Sync status
let isSyncing = false;
let lastSyncResult: SyncResult | null = null;

/**
 * Check if sync is currently running
 */
export const isSyncInProgress = (): boolean => isSyncing;

/**
 * Get last sync result
 */
export const getLastSyncResult = (): SyncResult | null => lastSyncResult;

/**
 * Sync all pending data
 */
export const syncData = async (options: SyncOptions = {}): Promise<SyncResult> => {
  const { force = false, maxRetries = 3, conflictResolution = 'server_wins' } = options;

  // Check if already syncing
  if (isSyncing && !force) {
    throw new Error('Sync already in progress');
  }

  // Check network status
  const { isOnline } = getNetworkStatus();
  if (!isOnline) {
    throw new Error('No internet connection');
  }

  isSyncing = true;

  const result: SyncResult = {
    success: false,
    syncedItems: 0,
    failedItems: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    console.log('Starting data sync...');

    // Step 1: Sync pending local changes to server
    await syncLocalChangesToServer(result, maxRetries);

    // Step 2: Fetch latest data from server
    await syncServerDataToLocal(result, conflictResolution);

    // Step 3: Process sync queue
    await processSyncQueue(result, maxRetries);

    // Update last sync timestamp
    await updateLastSync();

    result.success = result.failedItems === 0;
    lastSyncResult = result;

    console.log('Sync completed:', result);
    return result;

  } catch (error) {
    console.error('Sync failed:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    result.success = false;
    lastSyncResult = result;
    throw error;
  } finally {
    isSyncing = false;
  }
};

/**
 * Sync local changes to server
 */
const syncLocalChangesToServer = async (result: SyncResult, maxRetries: number): Promise<void> => {
  try {
    const pendingItems = await getPendingSyncItems();

    // Sync budgets
    for (const budget of pendingItems.budgets) {
      await syncItemToServer('budgets', budget, result, maxRetries);
    }

    // Sync transactions
    for (const transaction of pendingItems.transactions) {
      await syncItemToServer('transactions', transaction, result, maxRetries);
    }

    // Sync categories
    for (const category of pendingItems.categories) {
      await syncItemToServer('categories', category, result, maxRetries);
    }

  } catch (error) {
    console.error('Failed to sync local changes to server:', error);
    result.errors.push('Failed to sync local changes');
    throw error;
  }
};

/**
 * Sync individual item to server
 */
const syncItemToServer = async (
  endpoint: string,
  item: any,
  result: SyncResult,
  maxRetries: number
): Promise<void> => {
  try {
    let response;

    if (item.is_deleted) {
      // Delete item on server
      response = await api.delete(`/${endpoint}/${item.id}`);
    } else if (item.sync_status === 'pending') {
      // Check if item exists on server
      try {
        await api.get(`/${endpoint}/${item.id}`);
        // Item exists, update it
        response = await api.put(`/${endpoint}/${item.id}`, item);
      } catch (error: any) {
        if (error.status === 404) {
          // Item doesn't exist, create it
          response = await api.post(`/${endpoint}`, item);
        } else {
          throw error;
        }
      }
    }

    // Mark as synced
    await markAsSynced(endpoint.slice(0, -1) as any, item.id);
    result.syncedItems++;

  } catch (error: any) {
    console.error(`Failed to sync ${endpoint} item:`, error);
    result.failedItems++;
    result.errors.push(`Failed to sync ${endpoint}: ${error.message}`);

    // Handle conflicts
    if (error.status === 409) {
      result.conflicts++;
      // Add to sync queue for conflict resolution
      await updateSyncQueueItem(item.id, {
        lastError: 'Conflict detected',
        retryCount: (item.retryCount || 0) + 1,
      });
    }
  }
};

/**
 * Sync server data to local storage
 */
const syncServerDataToLocal = async (
  result: SyncResult,
  conflictResolution: 'server_wins' | 'client_wins' | 'merge'
): Promise<void> => {
  try {
    // Fetch latest data from server
    const [budgetsResponse, transactionsResponse, categoriesResponse] = await Promise.all([
      api.get('/budgets'),
      api.get('/transactions'),
      api.get('/categories'),
    ]);

    // Store server data locally
    for (const budget of budgetsResponse.data) {
      await storeOfflineData('budgets', budget, 'synced');
    }

    for (const transaction of transactionsResponse.data) {
      await storeOfflineData('transactions', transaction, 'synced');
    }

    for (const category of categoriesResponse.data) {
      await storeOfflineData('categories', category, 'synced');
    }

    console.log('Server data synced to local storage');

  } catch (error) {
    console.error('Failed to sync server data to local:', error);
    result.errors.push('Failed to fetch server data');
    throw error;
  }
};

/**
 * Process sync queue items
 */
const processSyncQueue = async (result: SyncResult, maxRetries: number): Promise<void> => {
  try {
    const syncQueue = await getSyncQueue();

    for (const item of syncQueue) {
      await processSyncQueueItem(item, result, maxRetries);
    }

  } catch (error) {
    console.error('Failed to process sync queue:', error);
    result.errors.push('Failed to process sync queue');
  }
};

/**
 * Process individual sync queue item
 */
const processSyncQueueItem = async (
  item: SyncQueueItem,
  result: SyncResult,
  maxRetries: number
): Promise<void> => {
  try {
    // Skip if max retries exceeded
    if (item.retryCount >= maxRetries) {
      console.warn(`Max retries exceeded for sync item: ${item.id}`);
      result.failedItems++;
      return;
    }

    let response;
    const endpoint = `/${item.entity}s`; // Convert entity to plural endpoint

    switch (item.type) {
      case 'CREATE':
        response = await api.post(endpoint, item.data);
        break;

      case 'UPDATE':
        response = await api.put(`${endpoint}/${item.data.id}`, item.data);
        break;

      case 'DELETE':
        response = await api.delete(`${endpoint}/${item.data.id}`);
        break;
    }

    // Remove from sync queue on success
    await removeFromSyncQueue(item.id);
    result.syncedItems++;

  } catch (error: any) {
    console.error(`Failed to process sync queue item: ${item.id}`, error);

    // Update retry count
    await updateSyncQueueItem(item.id, {
      retryCount: item.retryCount + 1,
      lastError: error.message,
    });

    result.failedItems++;
    result.errors.push(`Sync queue item failed: ${error.message}`);

    // Handle conflicts
    if (error.status === 409) {
      result.conflicts++;
    }
  }
};

/**
 * Sync specific entity type
 */
export const syncEntity = async (
  entity: 'budgets' | 'transactions' | 'categories',
  options: SyncOptions = {}
): Promise<SyncResult> => {
  const { conflictResolution = 'server_wins' } = options;

  const result: SyncResult = {
    success: false,
    syncedItems: 0,
    failedItems: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    // Check network status
    const { isOnline } = getNetworkStatus();
    if (!isOnline) {
      throw new Error('No internet connection');
    }

    console.log(`Syncing ${entity}...`);

    // Fetch latest data from server
    const response = await api.get(`/${entity}`);

    // Store server data locally
    for (const item of response.data) {
      await storeOfflineData(entity, item, 'synced');
      result.syncedItems++;
    }

    result.success = true;
    console.log(`${entity} sync completed:`, result);

    return result;

  } catch (error) {
    console.error(`Failed to sync ${entity}:`, error);
    result.errors.push(error instanceof Error ? error.message : `Failed to sync ${entity}`);
    result.success = false;
    throw error;
  }
};

/**
 * Auto-sync when network becomes available
 */
export const enableAutoSync = (): void => {
  // This would be called when network status changes to online
  // Implementation depends on network monitoring setup
  console.log('Auto-sync enabled');
};

/**
 * Disable auto-sync
 */
export const disableAutoSync = (): void => {
  console.log('Auto-sync disabled');
};

/**
 * Force sync all data (ignores current sync status)
 */
export const forceSyncAll = async (): Promise<SyncResult> => {
  return syncData({ force: true });
};

/**
 * Get sync status information
 */
export const getSyncStatus = async (): Promise<{
  isSyncing: boolean;
  lastSync: SyncResult | null;
  pendingItems: number;
  queueSize: number;
  isOnline: boolean;
}> => {
  try {
    const [syncQueue, pendingItems] = await Promise.all([
      getSyncQueue(),
      getPendingSyncItems(),
    ]);

    const totalPending = pendingItems.budgets.length +
      pendingItems.transactions.length +
      pendingItems.categories.length;

    const { isOnline } = getNetworkStatus();

    return {
      isSyncing,
      lastSync: lastSyncResult,
      pendingItems: totalPending,
      queueSize: syncQueue.length,
      isOnline,
    };
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return {
      isSyncing: false,
      lastSync: null,
      pendingItems: 0,
      queueSize: 0,
      isOnline: false,
    };
  }
};
