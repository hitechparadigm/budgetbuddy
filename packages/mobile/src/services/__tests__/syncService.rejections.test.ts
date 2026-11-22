/**
 * Offline-queue replay drops a change the server rejects as invalid.
 *
 * A queued transaction create that POST /transactions rejects with 400 (for
 * example one queued before the client sent `type`) can never succeed, so the
 * replay must remove it and tell the user, not keep it for another retry. A
 * network failure keeps the existing retry path.
 *
 * Runs the real SyncService replay loop; only the offline store and the HTTP
 * client are mocked.
 */
import { syncService, isValidationRejection, type SyncResult } from '../syncService';
import { rejectionMessage } from '../../components/ui/Toast';
import { api } from '../api';
import {
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItem,
  type SyncQueueItem,
} from '../offline';

jest.mock('../offline', () => ({
  getSyncQueue: jest.fn(),
  getPendingSyncItems: jest.fn(() => Promise.resolve({ budgets: [], transactions: [], categories: [] })),
  removeFromSyncQueue: jest.fn(() => Promise.resolve()),
  updateSyncQueueItem: jest.fn(() => Promise.resolve()),
  markAsSynced: jest.fn(() => Promise.resolve()),
  updateLastSync: jest.fn(() => Promise.resolve()),
  storeOfflineData: jest.fn(() => Promise.resolve()),
  resolveConflict: jest.fn(),
}));

const QUEUED: SyncQueueItem = {
  id: 'queue_1',
  type: 'CREATE',
  entity: 'transaction',
  data: { id: 'txn_local_1', categoryId: 'cat_food', amount: 12, description: 'Lunch', date: '2026-11-20' },
  timestamp: 1,
  retryCount: 0,
};

const OPTIONS = { force: false, batchSize: 10, maxRetries: 3, conflictStrategy: 'server_wins' as const };

/** Drive the private replay loop that performSync calls first. */
async function replay(): Promise<SyncResult> {
  const result: SyncResult = { success: true, syncedItems: 0, failedItems: 0, conflicts: 0, errors: [] };
  await (syncService as unknown as {
    syncLocalToServer: (r: SyncResult, o: typeof OPTIONS) => Promise<void>;
  }).syncLocalToServer(result, OPTIONS);
  return result;
}

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

beforeEach(() => {
  jest.clearAllMocks();
  (getSyncQueue as jest.Mock).mockResolvedValue([QUEUED]);
});

describe('offline queue replay', () => {
  it('drops an item rejected with 400 and emits a rejection', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(httpError(400));
    const listener = jest.fn();
    const unsubscribe = syncService.addRejectionListener(listener);

    const result = await replay();
    unsubscribe();

    expect(api.post).toHaveBeenCalledWith('/transactions', QUEUED.data);
    expect(removeFromSyncQueue).toHaveBeenCalledWith('queue_1');
    expect(updateSyncQueueItem).not.toHaveBeenCalled();
    expect(result.failedItems).toBe(1);
    expect(listener).toHaveBeenCalledWith({ entity: 'transaction', id: 'txn_local_1', status: 400 });
  });

  it('keeps a network failure in the queue for retry', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(httpError(0));
    const listener = jest.fn();
    const unsubscribe = syncService.addRejectionListener(listener);

    await replay();
    unsubscribe();

    expect(removeFromSyncQueue).not.toHaveBeenCalled();
    expect(updateSyncQueueItem).toHaveBeenCalledWith('queue_1', expect.objectContaining({ retryCount: 1 }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('treats only 400 and 422 as validation rejections', () => {
    expect(isValidationRejection(httpError(400))).toBe(true);
    expect(isValidationRejection(httpError(422))).toBe(true);
    expect(isValidationRejection(httpError(401))).toBe(false);
    expect(isValidationRejection(httpError(500))).toBe(false);
    expect(isValidationRejection(new Error('offline'))).toBe(false);
  });

  it('tells the user the offline change was not saved', () => {
    expect(rejectionMessage({ entity: 'transaction', id: 't1', status: 400 })).toMatch(
      /transaction you saved offline was rejected/i,
    );
  });
});
