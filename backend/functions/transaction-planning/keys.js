/**
 * DynamoDB key construction for planned transactions.
 *
 * The key builders now live in the common layer (`/opt/nodejs/keys`, source
 * `backend/layers/common/nodejs/keys.js`); this file re-exports them so the
 * Lambda's existing `require('./keys')` callers and tests do not change.
 * `PLANNED_TXN_SK_PREFIX` is `PLAN#` and `plannedTxnSK(planId)` builds
 * `PLAN#<planId>` exactly as before.
 *
 * In jest, `/opt/nodejs/keys` is mapped to the layer source by the
 * `moduleNameMapper` in this Lambda's package.json.
 */
module.exports = require('/opt/nodejs/keys');
