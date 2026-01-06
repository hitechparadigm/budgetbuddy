/**
 * Offline Sync Hook
 * Manages offline data synchronization and provides sync status
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getNetworkStatus } from '../services/api';
import { getStorageStats } from '../services/offline';
import { syncService, SyncResult } from '../services/syncService';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingItems: number;
  queueSize: number;
  lastSync: string | null;
  lastError: string | null;
  progress: number; // 0-100
  lastSyncResult: SyncResult | null;
}

export interface UseOfflineSyncReturn {
  syncStatus: SyncStatus;
  triggerSync: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;
  retryFailedItems: () => Promise<void>;
  forceSync: () => Promise<void>;
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingItems: 0,
    queueSize: 0,
    lastSync: null,
    lastError: null,
    progress: 0,
    lastSyncResult: null,
  });

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    try {
      const networkStatus = getNetworkStatus();
      const stats = await getStorageStats();
      const syncServiceStatus = await syncService.getSyncStatus();

      setSyncStatus(prev => ({
        ...prev,
        isOnline: networkStatus.isOnline,
        pendingItems: stats.pendingItems,
        queueSize: stats.syncQueueSize,
        lastSync: stats.lastSync,
        isSyncing: syncServiceStatus.isSyncing,
      }));
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }, []);

  // Handle sync result
  const handleSyncResult = useCallback((result: SyncResult) => {
    setSyncStatus(prev => ({
      ...prev,
      lastSyncResult: result,
      lastError: result.success ? null : result.errors.join(', '),
      progress: 100,
    }));

    // Invalidate React Query cache to refresh UI
    queryClient.invalidateQueries();
  }, [queryClient]);

  // Initialize sync service and listeners
  useEffect(() => {
    const initializeSync = async () => {
      try {
        await syncService.initialize();

        // Add sync result listener
        const removeListener = syncService.addSyncListener(handleSyncResult);

        return removeListener;
      } catch (error) {
        console.error('Failed to initialize sync service:', error);
      }
    };

    let removeListener: (() => void) | undefined;

    initializeSync().then(listener => {
      removeListener = listener;
    });

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [handleSyncResult]);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, progress: 0 }));
      await syncService.performSync();
      await updateSyncStatus();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastError: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  }, [updateSyncStatus]);

  // Force sync (ignores network status)
  const forceSync = useCallback(async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, progress: 0 }));
      await syncService.forceSync();
      await updateSyncStatus();
    } catch (error) {
      console.error('Force sync failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastError: error instanceof Error ? error.message : 'Force sync failed',
      }));
    }
  }, [updateSyncStatus]);

  // Clear sync queue (for debugging/reset)
  const clearSyncQueue = useCallback(async () => {
    try {
      // This would need to be implemented in syncService
      console.log('Clear sync queue not implemented in sync service yet');
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
    }
  }, [updateSyncStatus]);

  // Retry failed items
  const retryFailedItems = useCallback(async () => {
    try {
      // This would need to be implemented in syncService
      console.log('Retry failed items not implemented in sync service yet');
      await triggerSync();
    } catch (error) {
      console.error('Failed to retry items:', error);
    }
  }, [triggerSync]);

  // Update status periodically
  useEffect(() => {
    // Initial status update
    updateSyncStatus();

    // Set up periodic status updates
    const statusInterval = setInterval(updateSyncStatus, 5000);
    return () => clearInterval(statusInterval);
  }, [updateSyncStatus]);

  return {
    syncStatus,
    triggerSync,
    clearSyncQueue,
    retryFailedItems,
    forceSync,
  };
};
