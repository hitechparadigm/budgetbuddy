/**
 * DynamoDB key builders for the single table (`budgetbuddy-main`).
 *
 * Every partition key, sort key and GSI key a handler writes or queries is
 * built here (Wave 3 design section 2.5), so the key layout lives in one
 * place instead of string literals scattered across handlers. Pure functions
 * and constants only, no I/O.
 *
 * Input checks are the trust boundary for keys built from request input: a
 * bad month, date, hour or ID throws `KeyValidationError` (statusCode 400),
 * which handlers map to a 400 response. IDs may not contain `#`, so a caller
 * can never reach into another key family by crafting an ID.
 */

/** Sort-key and partition-key prefixes. */
const PREFIX = Object.freeze({
  USER: 'USER#',
  BUDGET: 'BUDGET#',
  PERIOD: 'PERIOD#',
  TOTAL: 'TOTAL#',
  TRANSACTION: 'TRANSACTION#',
  PLAN: 'PLAN#',
  MEMBER: 'MEMBER#',
  ACCOUNT: 'ACCOUNT#',
  GOAL: 'GOAL#',
  BILL: 'BILL#',
  RECEIPT: 'RECEIPT#',
  PATTERN: 'PATTERN#',
  ASSET: 'ASSET#',
  LIABILITY: 'LIABILITY#',
  ALERT: 'ALERT#',
  NUDGE: 'NUDGE#',
  PENDING_TRANSACTION: 'PENDING_TRANSACTION#',
  INVITATION: 'INVITATION#',
  INVITE_TOKEN: 'INVITE_TOKEN#',
  REMINDER: 'REMINDER#',
  DATE: 'DATE#',
  TXN: 'TXN#',
});

/** Fixed sort keys. */
const SK = Object.freeze({
  PROFILE: 'PROFILE',
  METADATA: 'METADATA',
  NOTIFICATION_PREFERENCES: 'NOTIFICATION_PREFERENCES',
  LOOKUP: 'LOOKUP',
});

/** `entityType` values. */
const ENTITY = Object.freeze({
  USER_PROFILE: 'USER_PROFILE',
  BUDGET: 'BUDGET',
  BUDGET_METADATA: 'BUDGET_METADATA',
  MEMBER: 'MEMBER',
  TRANSACTION: 'TRANSACTION',
  PERIOD_TOTAL: 'PERIOD_TOTAL',
  PLANNED_TRANSACTION: 'PLANNED_TRANSACTION',
  ACCOUNT: 'ACCOUNT',
  GOAL: 'GOAL',
  BILL: 'BILL',
  NOTIFICATION_PREFERENCES: 'NOTIFICATION_PREFERENCES',
});

/**
 * Prefix of a planned transaction's sort key. Kept under the name the
 * transaction-planning Lambda has always used (`transaction-planning/keys.js`
 * re-exports this module). Live DEV rows use `PLAN#`.
 */
const PLANNED_TXN_SK_PREFIX = PREFIX.PLAN;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ID_RE = /^[A-Za-z0-9_:.-]{1,128}$/;

/** A key component failed validation; handlers answer 400. */
class KeyValidationError extends Error {
  /**
   * @param {string} field - which component was invalid (e.g. 'month')
   * @param {string} message
   */
  constructor(field, message) {
    super(message);
    this.name = 'KeyValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

/**
 * @param {*} id
 * @param {string} [field]
 * @returns {string} the ID
 * @throws {KeyValidationError}
 */
function assertId(id, field = 'id') {
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw new KeyValidationError(field, `${field} must be 1-128 characters of A-Z, a-z, 0-9, _ : . - (no #)`);
  }
  return id;
}

/**
 * @param {*} month
 * @returns {string} `YYYY-MM`
 * @throws {KeyValidationError}
 */
function assertMonth(month) {
  if (typeof month !== 'string' || !MONTH_RE.test(month)) {
    throw new KeyValidationError('month', 'month must be YYYY-MM');
  }
  return month;
}

/**
 * @param {*} date
 * @returns {string} `YYYY-MM-DD`, a real calendar date
 * @throws {KeyValidationError}
 */
function assertDate(date) {
  const m = typeof date === 'string' ? date.match(DATE_RE) : null;
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) return date;
  }
  throw new KeyValidationError('date', 'date must be a real calendar date YYYY-MM-DD');
}

/**
 * @param {*} hour
 * @returns {string} two-digit hour `00`-`23`
 * @throws {KeyValidationError}
 */
function formatHour(hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new KeyValidationError('hourUtc', 'hourUtc must be an integer 0-23');
  }
  return String(hour).padStart(2, '0');
}

const userPK = (userId) => `${PREFIX.USER}${assertId(userId, 'userId')}`;
const budgetPK = (budgetId) => `${PREFIX.BUDGET}${assertId(budgetId, 'budgetId')}`;
const periodSK = (month) => `${PREFIX.PERIOD}${assertMonth(month)}`;
const totalsPrefix = (month) => `${PREFIX.TOTAL}${assertMonth(month)}#`;
const totalCategorySK = (month, categoryId) => `${totalsPrefix(month)}CAT#${assertId(categoryId, 'categoryId')}`;
const totalMonthSK = (month) => `${totalsPrefix(month)}ALL`;
const transactionSK = (transactionId) => `${PREFIX.TRANSACTION}${assertId(transactionId, 'transactionId')}`;

/**
 * GSI1 keys of a transaction: budget partition, date-ordered sort key.
 * @param {string} budgetId
 * @param {string} date - YYYY-MM-DD
 * @param {string} transactionId
 * @returns {{ GSI1PK: string, GSI1SK: string }}
 */
function transactionGSI1(budgetId, date, transactionId) {
  return {
    GSI1PK: budgetPK(budgetId),
    GSI1SK: `${PREFIX.DATE}${assertDate(date)}#${PREFIX.TXN}${assertId(transactionId, 'transactionId')}`,
  };
}

/**
 * GSI1SK bounds for `BETWEEN` covering every transaction dated start..end
 * (both inclusive). `~` sorts after the `#TXN#` suffix.
 * @param {string} start - YYYY-MM-DD
 * @param {string} end - YYYY-MM-DD
 * @returns {{ from: string, to: string }}
 */
function dateRangeGSI1(start, end) {
  return { from: `${PREFIX.DATE}${assertDate(start)}`, to: `${PREFIX.DATE}${assertDate(end)}#~` };
}

/**
 * GSI1 (by budget) and GSI2 (by month) keys of a budget period.
 * @param {string} budgetId
 * @param {string} month - YYYY-MM
 * @returns {{ GSI1PK: string, GSI1SK: string, GSI2PK: string, GSI2SK: string }}
 */
function periodGSI(budgetId, month) {
  return {
    GSI1PK: budgetPK(budgetId),
    GSI1SK: periodSK(month),
    GSI2PK: periodSK(month),
    GSI2SK: budgetPK(budgetId),
  };
}

/**
 * GSI3 partition key of the reminder bucket for one UTC hour.
 * @param {number} hourUtc - 0-23
 * @returns {string} e.g. `REMINDER#07`
 */
function reminderBucketPK(hourUtc) {
  return `${PREFIX.REMINDER}${formatHour(hourUtc)}`;
}

/**
 * GSI3 keys of a notification-preferences item: users due at one UTC hour.
 * @param {number} hourUtc - 0-23
 * @param {string} userId
 * @returns {{ GSI3PK: string, GSI3SK: string }}
 */
function reminderGSI3(hourUtc, userId) {
  return { GSI3PK: reminderBucketPK(hourUtc), GSI3SK: userPK(userId) };
}

const planSK = (planId) => `${PREFIX.PLAN}${assertId(planId, 'planId')}`;
const memberSK = (userId) => `${PREFIX.MEMBER}${assertId(userId, 'userId')}`;
const accountSK = (accountId) => `${PREFIX.ACCOUNT}${assertId(accountId, 'accountId')}`;
const goalSK = (goalId) => `${PREFIX.GOAL}${assertId(goalId, 'goalId')}`;
const billSK = (billId) => `${PREFIX.BILL}${assertId(billId, 'billId')}`;
const receiptSK = (receiptId) => `${PREFIX.RECEIPT}${assertId(receiptId, 'receiptId')}`;
const patternSK = (patternId) => `${PREFIX.PATTERN}${assertId(patternId, 'patternId')}`;
const assetSK = (assetId) => `${PREFIX.ASSET}${assertId(assetId, 'assetId')}`;
const liabilitySK = (liabilityId) => `${PREFIX.LIABILITY}${assertId(liabilityId, 'liabilityId')}`;
const alertSK = (alertId) => `${PREFIX.ALERT}${assertId(alertId, 'alertId')}`;
const nudgeSK = (date) => `${PREFIX.NUDGE}${assertDate(date)}`;
const pendingTransactionSK = (id) => `${PREFIX.PENDING_TRANSACTION}${assertId(id, 'pendingTransactionId')}`;
const invitationPK = (invitationId) => `${PREFIX.INVITATION}${assertId(invitationId, 'invitationId')}`;
const inviteTokenPK = (tokenHash) => `${PREFIX.INVITE_TOKEN}${assertId(tokenHash, 'tokenHash')}`;

/**
 * Sort key of a planned transaction, exactly as the transaction-planning
 * Lambda has always built it (no validation, so existing callers keep their
 * behavior). New code uses `planSK`, which validates the ID.
 * @param {string} planId
 * @returns {string} e.g. `PLAN#plan_1700000000000_ab12cd`
 */
function plannedTxnSK(planId) {
  return `${PLANNED_TXN_SK_PREFIX}${planId}`;
}

module.exports = {
  PREFIX,
  SK,
  ENTITY,
  PLANNED_TXN_SK_PREFIX,
  KeyValidationError,
  assertId,
  assertMonth,
  assertDate,
  userPK,
  budgetPK,
  periodSK,
  totalsPrefix,
  totalCategorySK,
  totalMonthSK,
  transactionSK,
  transactionGSI1,
  dateRangeGSI1,
  periodGSI,
  reminderBucketPK,
  reminderGSI3,
  planSK,
  plannedTxnSK,
  memberSK,
  accountSK,
  goalSK,
  billSK,
  receiptSK,
  patternSK,
  assetSK,
  liabilitySK,
  alertSK,
  nudgeSK,
  pendingTransactionSK,
  invitationPK,
  inviteTokenPK,
};
