'use strict';

/**
 * Tests for the layer key-builder module (Wave 3 design 2.5, 9.3).
 */

const fc = require('fast-check');
const keys = require('./keys');

describe('keys: builders', () => {
  test('partition keys', () => {
    expect(keys.userPK('user_1')).toBe('USER#user_1');
    expect(keys.budgetPK('budget_1')).toBe('BUDGET#budget_1');
    expect(keys.invitationPK('inv_1')).toBe('INVITATION#inv_1');
    expect(keys.inviteTokenPK('abc123')).toBe('INVITE_TOKEN#abc123');
  });

  test('period and totals', () => {
    expect(keys.periodSK('2026-11')).toBe('PERIOD#2026-11');
    expect(keys.totalsPrefix('2026-11')).toBe('TOTAL#2026-11#');
    expect(keys.totalCategorySK('2026-11', 'cat_1')).toBe('TOTAL#2026-11#CAT#cat_1');
    expect(keys.totalMonthSK('2026-11')).toBe('TOTAL#2026-11#ALL');
  });

  test('transaction keys', () => {
    expect(keys.transactionSK('txn_1')).toBe('TRANSACTION#txn_1');
    expect(keys.transactionGSI1('budget_1', '2026-11-20', 'txn_1')).toEqual({
      GSI1PK: 'BUDGET#budget_1',
      GSI1SK: 'DATE#2026-11-20#TXN#txn_1',
    });
  });

  test('dateRangeGSI1 bounds include every transaction on both end dates', () => {
    const { from, to } = keys.dateRangeGSI1('2026-11-01', '2026-11-30');
    const first = keys.transactionGSI1('b', '2026-11-01', 'txn_zzz').GSI1SK;
    const last = keys.transactionGSI1('b', '2026-11-30', 'txn_zzz').GSI1SK;
    const after = keys.transactionGSI1('b', '2026-12-01', 'txn_000').GSI1SK;
    expect(from <= first && first <= to).toBe(true);
    expect(from <= last && last <= to).toBe(true);
    expect(after > to).toBe(true);
  });

  test('periodGSI writes both the by-budget and by-month index keys', () => {
    expect(keys.periodGSI('budget_1', '2026-11')).toEqual({
      GSI1PK: 'BUDGET#budget_1',
      GSI1SK: 'PERIOD#2026-11',
      GSI2PK: 'PERIOD#2026-11',
      GSI2SK: 'BUDGET#budget_1',
    });
  });

  test('reminderGSI3 pads the UTC hour to two digits', () => {
    expect(keys.reminderGSI3(7, 'user_1')).toEqual({ GSI3PK: 'REMINDER#07', GSI3SK: 'USER#user_1' });
    expect(keys.reminderGSI3(23, 'user_1').GSI3PK).toBe('REMINDER#23');
    expect(keys.reminderGSI3(0, 'user_1').GSI3PK).toBe('REMINDER#00');
  });

  test('one sort-key builder per entity prefix', () => {
    expect(keys.planSK('plan_1')).toBe('PLAN#plan_1');
    expect(keys.memberSK('user_1')).toBe('MEMBER#user_1');
    expect(keys.accountSK('acc_1')).toBe('ACCOUNT#acc_1');
    expect(keys.goalSK('goal_1')).toBe('GOAL#goal_1');
    expect(keys.billSK('bill_1')).toBe('BILL#bill_1');
    expect(keys.receiptSK('r1')).toBe('RECEIPT#r1');
    expect(keys.patternSK('p1')).toBe('PATTERN#p1');
    expect(keys.assetSK('a1')).toBe('ASSET#a1');
    expect(keys.liabilitySK('l1')).toBe('LIABILITY#l1');
    expect(keys.alertSK('al1')).toBe('ALERT#al1');
    expect(keys.nudgeSK('2026-11-20')).toBe('NUDGE#2026-11-20');
    expect(keys.pendingTransactionSK('pt1')).toBe('PENDING_TRANSACTION#pt1');
  });

  test('plannedTxnSK keeps the transaction-planning Lambda behavior (no validation)', () => {
    expect(keys.PLANNED_TXN_SK_PREFIX).toBe('PLAN#');
    expect(keys.plannedTxnSK('plan_123')).toBe('PLAN#plan_123');
    expect(keys.plannedTxnSK('')).toBe('PLAN#');
  });

  test('constants are frozen', () => {
    expect(Object.isFrozen(keys.PREFIX)).toBe(true);
    expect(Object.isFrozen(keys.ENTITY)).toBe(true);
    expect(keys.ENTITY.BUDGET).toBe('BUDGET');
    expect(keys.ENTITY.PERIOD_TOTAL).toBe('PERIOD_TOTAL');
  });
});

describe('keys: validation (trust boundary)', () => {
  test.each([
    ['contains #', 'a#b'],
    ['empty', ''],
    ['too long', 'x'.repeat(129)],
    ['space', 'a b'],
    ['slash', 'a/b'],
    ['number', 42],
    ['undefined', undefined],
  ])('rejects an ID that is %s', (_label, id) => {
    expect(() => keys.budgetPK(id)).toThrow(keys.KeyValidationError);
    try {
      keys.budgetPK(id);
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.field).toBe('budgetId');
    }
  });

  test('accepts IDs at the 128-character limit and with : . - _', () => {
    expect(keys.userPK('u'.repeat(128))).toBe(`USER#${'u'.repeat(128)}`);
    expect(keys.userPK('user_a-b.c:d')).toBe('USER#user_a-b.c:d');
  });

  test.each(['2026-13', '2026-00', '2026-1', '26-11', '2026-11-01', 'abcd-ef'])('rejects month %s', (month) => {
    expect(() => keys.periodSK(month)).toThrow(keys.KeyValidationError);
  });

  test.each(['2026-02-30', '2026-02-29', '2025-04-31', '2026-13-01', '2026-1-01', '2026-11-20T00:00:00Z'])(
    'rejects impossible or malformed date %s',
    (date) => {
      expect(() => keys.transactionGSI1('b', date, 't')).toThrow(keys.KeyValidationError);
    },
  );

  test('accepts a leap day in a leap year', () => {
    expect(keys.nudgeSK('2028-02-29')).toBe('NUDGE#2028-02-29');
  });

  test.each([-1, 24, 1.5, '7', null])('rejects reminder hour %p', (hour) => {
    expect(() => keys.reminderGSI3(hour, 'user_1')).toThrow(keys.KeyValidationError);
  });

  test('property: no built key ever contains a # supplied by the caller', () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        let built;
        try {
          built = keys.goalSK(id);
        } catch (err) {
          return err instanceof keys.KeyValidationError;
        }
        return built === `GOAL#${id}` && !id.includes('#');
      }),
    );
  });
});

describe('reminderBucketPK (Wave 3 phase 1)', () => {
  const { reminderBucketPK, reminderGSI3: gsi3 } = require('./keys');

  test('pads the UTC hour and matches reminderGSI3', () => {
    expect(reminderBucketPK(7)).toBe('REMINDER#07');
    expect(reminderBucketPK(23)).toBe('REMINDER#23');
    expect(gsi3(7, 'u1').GSI3PK).toBe(reminderBucketPK(7));
  });

  test.each([-1, 24, 1.5, '07'])('rejects %p', (hour) => {
    expect(() => reminderBucketPK(hour)).toThrow('hourUtc');
  });
});
