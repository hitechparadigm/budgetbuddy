/**
 * Sync Service
 * Handles automatic data synchronization between local and remote data
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { api, budgetsApi, type ApiClient } from './api';
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

/**
 * A conflict that was resolved during a sync.
 *
 * Emitted so the UI can tell the user their local edit was overwritten.
 * Previously a resolved conflict was only console.logged, so the local change
 * disappeared silently.
 */
export interface SyncConflict {
  /** Which local table the conflicting record lives in. */
  entity: 'budgets' | 'transactions' | 'categories';
  /** Id of the conflicting record. */
  id: string;
  /** How the conflict was resolved. */
  strategy: 'server_wins' | 'client_wins' | 'merge';
}

/**
 * A queued change the server rejected as invalid (HTTP 400 or 422).
 *
 * Replaying the same request cannot succeed, so the item is dropped from the
 * queue and this is emitted so the UI can tell the user the change was not
 * saved. Other failures (network, 401, 5xx) keep the existing retry path.
 */
export interface SyncRejection {
  entity: SyncQueueItem['entity'];
  /** Id of the queued record. */
  id: string;
  status: number;
}

/** Whether a failed replay is a validation rejection that no retry can fix. */
export const isValidationRejection = (error: unknown): boolean => {
  const status = (error as { status?: unknown } | null)?.status;
  return status === 400 || status === 422;
};

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
  private conflictListeners: ((conflict: SyncConflict) => void)[] = [];
  private rejectionListeners: ((rejection: SyncRejection) => void)[] = [];
  private networkListener: (() => void) | null = null;
  private appStateListener: any = null;
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null;

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
   * Add a resolved-conflict listener.
   *
   * Fires once per conflict resolved during a sync. Use it to tell the user a
   * local edit was overwritten; without it the overwrite is invisible.
   *
   * @returns an unsubscribe function
   */
  addConflictListener(listener: (conflict: SyncConflict) => void): () => void {
    this.conflictListeners.push(listener);
    return () => {
      const index = this.conflictListeners.indexOf(listener);
      if (index > -1) {
        this.conflictListeners.splice(index, 1);
      }
    };
  }

  /** Notify every conflict listener, isolating a throwing listener. */
  private emitConflict(conflict: SyncConflict): void {
    for (const listener of this.conflictListeners) {
      try {
        listener(conflict);
      } catch (error) {
        console.error('Conflict listener failed:', error);
      }
    }
  }

  /**
   * Add a rejected-change listener. Fires once per queued change the server
   * rejected as invalid; the change has already been dropped from the queue.
   *
   * @returns an unsubscribe function
   */
  addRejectionListener(listener: (rejection: SyncRejection) => void): () => void {
    this.rejectionListeners.push(listener);
    return () => {
      const index = this.rejectionListeners.indexOf(listener);
      if (index > -1) {
        this.rejectionListeners.splice(index, 1);
      }
    };
  }

  /** Notify every rejection listener, isolating a throwing listener. */
  private emitRejection(rejection: SyncRejection): void {
    for (const listener of this.rejectionListeners) {
      try {
        listener(rejection);
      } catch (error) {
        console.error('Rejection listener failed:', error);
      }
    }
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
            if (isValidationRejection(error)) {
              // The server rejected the change itself; a replay cannot fix it.
              // Drop it and tell the user instead of retrying it.
              const status = (error as { status: number }).status;
              console.warn(`Dropping ${item.entity} ${item.type} rejected with ${status}:`, item.id);
              await removeFromSyncQueue(item.id);
              result.failedItems++;
              result.errors.push(`Item ${item.id}: rejected by the server (${status})`);
              this.emitRejection({ entity: item.entity, id: item.data?.id ?? item.id, status });
              continue;
            }
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
      // Each path goes to the gateway that owns it: /budgets is on the budgets
      // gateway, and the categories route is /budget/categories on the main
      // gateway (a bare /categories exists on no gateway).
      const [budgets, transactions, categories] = await Promise.all([
        this.fetchServerData('/budgets', budgetsApi),
        this.fetchServerData('/transactions'),
        this.fetchServerData('/budget/categories'),
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
      // Which gateway owns the route. /budgets is on the budgets gateway;
      // transactions and categories are on the main gateway.
      let client: ApiClient = api;

      // Determine API endpoint and method
      switch (item.entity) {
        case 'budget':
          endpoint = item.type === 'CREATE' ? '/budgets' : `/budgets/${item.data.id}`;
          method = item.type === 'DELETE' ? 'delete' : item.type === 'CREATE' ? 'post' : 'put';
          data = item.type === 'DELETE' ? undefined : item.data;
          client = budgetsApi;
          break;

        case 'transaction':
          endpoint = item.type === 'CREATE' ? '/transactions' : `/transactions/${item.data.id}`;
          method = item.type === 'DELETE' ? 'delete' : item.type === 'CREATE' ? 'post' : 'put';
          data = item.type === 'DELETE' ? undefined : item.data;
          break;

        case 'category':
          // The route is /budget/categories on the main gateway; a bare
          // /categories exists on no gateway.
          //
          // KNOWN GAP: the gateway exposes only GET and POST on
          // /budget/categories (api-stack.ts:635-643). There is no PUT or
          // DELETE on /budget/categories/{categoryId}, only the /rollover
          // sub-resources, so a queued category UPDATE or DELETE still fails.
          // CREATE and the read path now reach a real route.
          endpoint =
            item.type === 'CREATE'
              ? '/budget/categories'
              : `/budget/categories/${item.data.id}`;
          method = item.type === 'DELETE' ? 'delete' : item.type === 'CREATE' ? 'post' : 'put';
          data = item.type === 'DELETE' ? undefined : item.data;
          break;

        default:
          throw new Error(`Unknown entity type: ${item.entity}`);
      }

      // Make API request
      await client[method](endpoint, data);

      // Mark as synced in local database
      if (item.type !== 'DELETE') {
        const tableName = item.entity === 'category' ? 'categories' :
          item.entity === 'budget' ? 'budgets' : 'transactions';
        await markAsSynced(tableName, item.data.id);
      }

      console.log(`Successfully synced ${item.entity} ${item.type}:`, item.data.id);
      return true;
    } catch (error) {
      // A validation rejection goes to the caller, which drops the item.
      if (isValidationRejection(error)) throw error;
      console.error(`Failed to sync ${item.entity} ${item.type}:`, error);
      return false;
    }
  }

  /**
   * Fetch data from server
   */
  private async fetchServerData(endpoint: string, client: ApiClient = api): Promise<any[]> {
    try {
      const response = await client.get(endpoint);
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

          // Tell the UI. The resolution strategy itself is unchanged (server
          // wins by default); this only makes the overwrite visible instead of
          // discarding a local edit silently.
          this.emitConflict({
            entity: tableName,
            id: resolvedItem.id,
            strategy: options.conflictStrategy,
          });
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
