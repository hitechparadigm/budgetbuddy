/**
 * DynamoDB key construction for planned transactions.
 *
 * The sort-key prefix for a planned transaction is defined here and nowhere
 * else. Every read and write in this Lambda goes through `plannedTxnSK` so the
 * stored prefix can never drift between code paths.
 *
 * Note: the stored prefix is `PLAN#`, not the `PLANNED_TXN#` that older
 * revisions of `.kiro/steering/architecture.md` documented. The code is the
 * source of truth because live DEV rows already use `PLAN#`.
 */

const PLANNED_TXN_SK_PREFIX = 'PLAN#';

/**
 * Build the sort key for a planned transaction.
 * @param {string} planId
 * @returns {string} e.g. `PLAN#plan_1700000000000_ab12cd`
 */
function plannedTxnSK(planId) {
  return `${PLANNED_TXN_SK_PREFIX}${planId}`;
}

module.exports = { PLANNED_TXN_SK_PREFIX, plannedTxnSK };
