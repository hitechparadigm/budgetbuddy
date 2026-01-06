/**
 * Sync Service
 * Handles automatic data synchronization between local and remote data
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import {
  getSyncQueue,
  getPendingSyncItems,
  removeFromSyncQueue,
  updateSyncQueueItem,
  markAsSynced,
  updateLastSync,
  storeOfflineData,
  resolveConflict,
  SyncQueueItem,
} from './offline';

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  conflicts: number;
  errors: string[];
}

export interface SyncOptions {
  force?: boolean;
  batchSize?: number;
  maxRetries?: number;
  conflictStrategy?: 'server_wins' | 'client_wins' | 'merge';
}

class SyncService {
  private isInitialized = false;
  private isSyncing = false;
  private syncListeners: ((result: SyncResult) => void)[] = [];
  private networkListener: (() => void) | null = null;
  private appStateListener: any = null;
  private autoSyncInterval: NodeJS.Timeout | null = null;

  private readonly DEFAULT_OPTIONS: Required<SyncOptions> = {
    force: false,
    batchSize: 10,
    maxRetries: 3,
    conflictStrategy: 'server_wins',
  };

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up network state listener
      this.networkListener = NetInfo.addEventListener(state => {
        if (state.isConnected && !this.isSyncing) {
          console.log('Network connected - triggering auto sync');
          this.performSync({ force: false });
        }
      });

      // Set up app state listener
      this.appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && !this.isSyncing) {
          console.log('App became active - checking for sync');
          this.performSync({ force: false });
        }
      });

      // Set up periodic sync (every 5 minutes when online)
      this.autoSyncInterval = setInterval(() => {
        if (!this.isSyncing) {
          this.performSync({ force: false });
        }
      }, 5 * 60 * 1000); // 5 minutes

      this.isInitialized = true;
      console.log('Sync service initialized');

      // Perform initial sync
      await this.performSync({ force: false });
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
      throw error;
    }
  }

  /**
   * Cleanup sync service
   */
  cleanup(): void {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }

    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }

    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }

    this.syncListeners = [];
    this.isInitialized = false;
    console.log('Sync service cleaned up');
  }

  /**
   * Add sync result listener
   */
  addSyncListener(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Perform synchronization
   */
  async performSync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        conflicts: 0,
        errors: ['Sync already in progress'],
      };
    }

    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      this.isSyncing = true;
      console.log('Starting sync process...');

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected && !opts.force) {
        return {
          success: false,
          syncedItems: 0,
          failedItems: 0,
          conflicts: 0,
          errors: ['No network connection'],
        };
      }

      const result: SyncResult = {
        success: true,
        syncedItems: 0,
        failedItems: 0,
        conflicts: 0,
        errors: [],
      };

      // Step 1: Sync local changes to server
      await this.syncLocalToServer(result, opts);

      // Step 2: Sync server changes to local
      await this.syncServerToLocal(result, opts);

      // Step 3: Update last sync timestamp
      await updateLastSync();

      console.log('Sync completed:', result);

      // Notify listeners
      this.syncListeners.forEach(listener => listener(result));

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      const errorResult: SyncResult = {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        conflicts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
      };

      this.syncListeners.forEach(listener => listener(errorResult));
      return errorResult;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync local changes to server
   */
  private async syncLocalToServer(result: SyncResult, options: Required<SyncOptions>): Promise<void> {
    try {
      const syncQueue = await getSyncQueue();
      if (syncQueue.length === 0) {
        console.log('No items in sync queue');
        return;
      }

      console.log(`Syncing ${syncQueue.length} local changes to server`);

      // Process items in batches
      for (let i = 0; i < syncQueue.length; i += options.batchSize) {
        const batch = syncQueue.slice(i, i + options.batchSize);

        for (const item of batch) {
          try {
            // Skip items that exceeded retry limit
            if (item.retryCount >= options.maxRetries) {
              console.warn(`Skipping item after ${options.maxRetries} retries:`, item.id);
              await removeFromSyncQueue(item.id);
              result.failedItems++;
              continue;
            }

            const success = await this.syncItemToServer(item);

            if (success) {
              await removeFromSyncQueue(item.id);
              result.syncedItems++;
            } else {
              await updateSyncQueueItem(item.id, {
                retryCount: item.retryCount + 1,
                lastError: 'Failed to sync to server',
              });
              result.failedItems++;
            }
          } catch (error) {
            console.error(`Failed to sync item ${item.id}:`, error);
            await updateSyncQueueItem(item.id, {
              retryCount: item.retryCount + 1,
              lastError: error instanceof Error ? error.message : 'Unknown error',
            });
            result.failedItems++;
            result.errors.push(`Item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Small delay between batches
        if (i + options.batchSize < syncQueue.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Failed to sync local to server:', error);
      result.errors.push(`Local to server sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync server changes to local
   */
  private async syncServerToLocal(result: SyncResult, options: Required<SyncOptions>): Promise<void> {
    try {
      console.log('Syncing server changes to local');

      // Fetch latest data from server
      const [budgets, transactions, categories] = await Promise.all([
        this.fetchServerData('/budgets'),
        this.fetchServerData('/transactions'),
        this.fetchServerData('/categories'),
      ]);

      // Get local data for comparison
      const pendingItems = await getPendingSyncItems();

      // Sync budgets
      await this.syncEntityFromServer('budgets', budgets, pendingItems.budgets, result, options);

      // Sync transactions
      await this.syncEntityFromServer('transactions', transactions, pendingItems.transactions, result, options);

      // Sync categories
      await this.syncEntityFromServer('categories', categories, pendingItems.categories, result, options);

    } catch (error) {
      console.error('Failed to sync server to local:', error);
      result.errors.push(`Server to local sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync individual item to server
   */
  private async syncItemToServer(item: SyncQueueItem): Promise<boolean> {
    try {
      let endpoint: string;
      let method: 'post' | 'put' | 'delete';
      let data: any;

      // Determine API endpoint and method
      switch (item.entity) {
        case 'budget':
          endpoint = item.type === 'CREATE' ? '/budgets' : `/budgets/${item.data.id}`;
          method = item.type === 'DELETE' ? 'delete' : item.type === 'CREATE' ? 'post' : 'put';
          data = item.type === 'DELETE' ? undefined : item.data;
          break;

        case 'transaction':
          endpoint = item.type === 'CREATE' ? '/transactions' : `/transactions/${item.data.id}`;
          method = item.type === 'DELETE' ? 'delete' : item.type === 'CREATE' ? 'post' : 'put';
          data = item.type === 'DELETE' ? undefined : item.data;
          break;

        case 'category':
          endpoint = item.type === 'CREATE' ? '/categories' : `/categories/${item.data.id}`;
          method = item.type === 'DELETE' ? 'delete' : item.type === 'CREATE' ? 'post' : 'put';
          data = item.type === 'DELETE' ? undefined : item.data;
          break;

        default:
          throw new Error(`Unknown entity type: ${item.entity}`);
      }

      // Make API request
      await api[method](endpoint, data);

      // Mark as synced in local database
      if (item.type !== 'DELETE') {
        const tableName = item.entity === 'category' ? 'categories' :
          item.entity === 'budget' ? 'budgets' : 'transactions';
        await markAsSynced(tableName, item.data.id);
      }

      console.log(`Successfully synced ${item.entity} ${item.type}:`, item.data.id);
      return true;
    } catch (error) {
      console.error(`Failed to sync ${item.entity} ${item.type}:`, error);
      return false;
    }
  }

  /**
   * Fetch data from server
   */
  private async fetchServerData(endpoint: string): Promise<any[]> {
    try {
      const response = await api.get(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      return [];
    }
  }

  /**
   * Sync entity from server to local
   */
  private async syncEntityFromServer(
    tableName: 'budgets' | 'transactions' | 'categories',
    serverData: any[],
    localData: any[],
    result: SyncResult,
    options: Required<SyncOptions>
  ): Promise<void> {
    try {
      for (const serverItem of serverData) {
        const localItem = localData.find(item => item.id === serverItem.id);

        if (!localItem) {
          // New item from server - store locally
          await storeOfflineData(tableName, serverItem, 'synced');
          result.syncedItems++;
        } else if (localItem.sync_status === 'pending') {
          // Conflict - local changes vs server changes
          const resolvedItem = await resolveConflict(
            tableName,
            localItem,
            serverItem,
            options.conflictStrategy
          );
          result.conflicts++;
          console.log(`Resolved conflict for ${tableName}:`, resolvedItem.id);
        } else {
          // Check if server item is newer
          const serverTime = new Date(serverItem.updatedAt || serverItem.updated_at).getTime();
          const localTime = new Date(localItem.updated_at).getTime();

          if (serverTime > localTime) {
            await storeOfflineData(tableName, serverItem, 'synced');
            result.syncedItems++;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to sync ${tableName} from server:`, error);
      result.errors.push(`${tableName} sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isSyncing: boolean;
    pendingItems: number;
    queueSize: number;
    lastSync: string | null;
  }> {
    const [syncQueue, pendingItems] = await Promise.all([
      getSyncQueue(),
      getPendingSyncItems(),
    ]);

    const totalPending = pendingItems.budgets.length +
      pendingItems.transactions.length +
      pendingItems.categories.length;

    return {
      isSyncing: this.isSyncing,
      pendingItems: totalPending,
      queueSize: syncQueue.length,
      lastSync: null, // Would need to get from storage
    };
  }

  /**
   * Force sync (ignores network status)
   */
  async forceSync(): Promise<SyncResult> {
    return this.performSync({ force: true });
  }

  /**
   * Check if sync is in progress
   */
  get isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }
}

// Export singleton instance
export const syncService = new SyncService();
