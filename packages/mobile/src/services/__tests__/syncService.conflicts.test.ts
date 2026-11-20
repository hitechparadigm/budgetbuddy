/**
 * Tests for the resolved-conflict listener registry on SyncService.
 *
 * A resolved conflict used to be console.logged only, so a local edit the
 * server overwrote vanished with no indication. These assert the event now
 * reaches a listener with the entity and id, and that the registry behaves:
 * unsubscribe works, and a throwing listener does not stop the others.
 */

import { syncService, type SyncConflict } from '../syncService';
import { conflictMessage } from '../../components/ui/Toast';

/**
 * Reach the private emitter the same way performSync does. Driving the real
 * sync path would need the whole SQLite and network stack mocked; what matters
 * here is the registry contract that path depends on.
 */
function emit(conflict: SyncConflict): void {
  (
    syncService as unknown as { emitConflict: (c: SyncConflict) => void }
  ).emitConflict(conflict);
}

const CONFLICT: SyncConflict = {
  entity: 'transactions',
  id: 'txn_1',
  strategy: 'server_wins',
};

describe('addConflictListener', () => {
  it('invokes the listener once per resolved conflict, with entity and id', () => {
    const listener = jest.fn();
    const unsubscribe = syncService.addConflictListener(listener);

    emit(CONFLICT);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      entity: 'transactions',
      id: 'txn_1',
      strategy: 'server_wins',
    });

    unsubscribe();
  });

  it('fires once per conflict when several are resolved', () => {
    const listener = jest.fn();
    const unsubscribe = syncService.addConflictListener(listener);

    emit({ entity: 'budgets', id: 'b1', strategy: 'server_wins' });
    emit({ entity: 'transactions', id: 't1', strategy: 'server_wins' });
    emit({ entity: 'categories', id: 'c1', strategy: 'server_wins' });

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls.map(([c]) => c.entity)).toEqual([
      'budgets',
      'transactions',
      'categories',
    ]);

    unsubscribe();
  });

  it('stops delivering after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = syncService.addConflictListener(listener);

    emit(CONFLICT);
    unsubscribe();
    emit(CONFLICT);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('delivers to every registered listener', () => {
    const a = jest.fn();
    const b = jest.fn();
    const unsubA = syncService.addConflictListener(a);
    const unsubB = syncService.addConflictListener(b);

    emit(CONFLICT);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    unsubA();
    unsubB();
  });

  it('keeps notifying the rest when one listener throws', () => {
    const thrower = jest.fn(() => {
      throw new Error('listener bug');
    });
    const healthy = jest.fn();
    const unsubA = syncService.addConflictListener(thrower);
    const unsubB = syncService.addConflictListener(healthy);

    expect(() => emit(CONFLICT)).not.toThrow();
    expect(healthy).toHaveBeenCalledTimes(1);

    unsubA();
    unsubB();
  });

  it('is a no-op with no listeners registered', () => {
    expect(() => emit(CONFLICT)).not.toThrow();
  });
});

describe('conflictMessage', () => {
  it('names the entity the user would recognise', () => {
    expect(
      conflictMessage({ entity: 'budgets', id: 'b1', strategy: 'server_wins' }),
    ).toContain('budget');
    expect(
      conflictMessage({ entity: 'transactions', id: 't1', strategy: 'server_wins' }),
    ).toContain('transaction');
    expect(
      conflictMessage({ entity: 'categories', id: 'c1', strategy: 'server_wins' }),
    ).toContain('category');
  });

  it('says the server version won when it did', () => {
    const message = conflictMessage({
      entity: 'transactions',
      id: 't1',
      strategy: 'server_wins',
    });
    expect(message).toMatch(/server version was kept/i);
  });

  it('says the local change won when it did', () => {
    const message = conflictMessage({
      entity: 'transactions',
      id: 't1',
      strategy: 'client_wins',
    });
    expect(message).toMatch(/offline/i);
  });
});
