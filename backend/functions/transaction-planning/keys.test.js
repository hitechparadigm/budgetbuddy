/**
 * Tests for the planned-transaction key module.
 */

const { PLANNED_TXN_SK_PREFIX, plannedTxnSK } = require('./keys');

describe('planned transaction keys', () => {
  it('exposes the stored sort-key prefix', () => {
    expect(PLANNED_TXN_SK_PREFIX).toBe('PLAN#');
  });

  it('builds a sort key from a plan id', () => {
    expect(plannedTxnSK('plan_123')).toBe('PLAN#plan_123');
  });

  it('builds a sort key that always begins with the prefix', () => {
    for (const id of ['a', 'plan_1', 'plan_1700000000000_abcdef', '']) {
      expect(plannedTxnSK(id).startsWith(PLANNED_TXN_SK_PREFIX)).toBe(true);
    }
  });
});
