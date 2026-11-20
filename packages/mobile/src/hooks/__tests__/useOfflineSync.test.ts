/**
 * Tests for the offline-sync hook's queue management.
 *
 * clearSyncQueue and retryFailedItems previously only logged
 * "not implemented". The hook exposed them, so the UI could call them and
 * nothing happened. These assert they now act on the real queue.
 */

import { renderHook, act } from '@testing-library/react-native';

// The hook calls useQueryClient to invalidate caches after a sync. Supplying
// a stub avoids wrapping every renderHook in a QueryClientProvider; cache
// invalidation is not what these tests are about.
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    clear: jest.fn(),
  }),
}));

import { useOfflineSync } from '../useOfflineSync';
import {
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItem,
  getStorageStats,
} from '../../services/offline';
import { syncService } from '../../services/syncService';

jest.mock('../../services/syncService', () => ({
  syncService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn(),
    addSyncListener: jest.fn(() => jest.fn()),
    performSync: jest.fn().mockResolvedValue({ success: true, errors: [] }),
    forceSync: jest.fn().mockResolvedValue({ success: true, errors: [] }),
    getSyncStatus: jest.fn().mockResolvedValue({
      isSyncing: false,
      lastSync: null,
      pendingItems: 0,
      queueSize: 0,
    }),
  },
}));

jest.mock('../../services/offline', () => ({
  getStorageStats: jest.fn(),
  getSyncQueue: jest.fn(),
  removeFromSyncQueue: jest.fn(),
  updateSyncQueueItem: jest.fn(),
}));

const getSyncQueueMock = getSyncQueue as jest.Mock;
const removeFromSyncQueueMock = removeFromSyncQueue as jest.Mock;
const updateSyncQueueItemMock = updateSyncQueueItem as jest.Mock;
const getStorageStatsMock = getStorageStats as jest.Mock;

function queueItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    type: 'CREATE',
    entity: 'transaction',
    data: { id: 't1' },
    timestamp: 1,
    retryCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getSyncQueueMock.mockResolvedValue([]);
  removeFromSyncQueueMock.mockResolvedValue(undefined);
  updateSyncQueueItemMock.mockResolvedValue(undefined);
  getStorageStatsMock.mockResolvedValue({
    pendingItems: 0,
    queueSize: 0,
    lastSync: null,
  });
});

describe('clearSyncQueue', () => {
  it('removes every queued item', async () => {
    getSyncQueueMock.mockResolvedValue([
      queueItem({ id: 'q1' }),
      queueItem({ id: 'q2' }),
      queueItem({ id: 'q3' }),
    ]);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.clearSyncQueue();
    });

    expect(removeFromSyncQueueMock).toHaveBeenCalledTimes(3);
    expect(removeFromSyncQueueMock).toHaveBeenCalledWith('q1');
    expect(removeFromSyncQueueMock).toHaveBeenCalledWith('q2');
    expect(removeFromSyncQueueMock).toHaveBeenCalledWith('q3');
  });

  it('is a no-op on an already-empty queue', async () => {
    getSyncQueueMock.mockResolvedValue([]);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.clearSyncQueue();
    });

    expect(removeFromSyncQueueMock).not.toHaveBeenCalled();
  });

  it('records the failure instead of throwing', async () => {
    getSyncQueueMock.mockRejectedValue(new Error('storage unavailable'));

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.clearSyncQueue();
    });

    expect(result.current.syncStatus.lastError).toBe('storage unavailable');
  });
});

describe('retryFailedItems', () => {
  it('resets retryCount and clears lastError on failed items', async () => {
    getSyncQueueMock.mockResolvedValue([
      queueItem({ id: 'q1', retryCount: 3, lastError: 'boom' }),
      queueItem({ id: 'q2', retryCount: 1 }),
    ]);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.retryFailedItems();
    });

    expect(updateSyncQueueItemMock).toHaveBeenCalledWith('q1', {
      retryCount: 0,
      lastError: undefined,
    });
    expect(updateSyncQueueItemMock).toHaveBeenCalledWith('q2', {
      retryCount: 0,
      lastError: undefined,
    });
  });

  it('leaves never-failed items alone', async () => {
    getSyncQueueMock.mockResolvedValue([
      queueItem({ id: 'q1', retryCount: 0 }),
      queueItem({ id: 'q2', retryCount: 2 }),
    ]);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.retryFailedItems();
    });

    expect(updateSyncQueueItemMock).toHaveBeenCalledTimes(1);
    expect(updateSyncQueueItemMock).toHaveBeenCalledWith('q2', {
      retryCount: 0,
      lastError: undefined,
    });
  });

  it('triggers a sync after resetting', async () => {
    getSyncQueueMock.mockResolvedValue([queueItem({ id: 'q1', retryCount: 2 })]);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.retryFailedItems();
    });

    expect(syncService.performSync).toHaveBeenCalled();
  });

  it('records the failure instead of throwing', async () => {
    getSyncQueueMock.mockRejectedValue(new Error('storage unavailable'));

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.retryFailedItems();
    });

    expect(result.current.syncStatus.lastError).toBe('storage unavailable');
  });
});
