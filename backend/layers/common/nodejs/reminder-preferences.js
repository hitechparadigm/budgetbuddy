/**
 * Notification preferences: the one parser and the one writer of
 * `USER#<userId>/NOTIFICATION_PREFERENCES` (Wave 3 design section 3).
 *
 * The parser and defaults moved here unchanged from notifications/index.js
 * (commit e941ab5, field allowlist, no body spread) with `timezone` added, so
 * PUT /notifications/preferences, auth-onboarding and the reminder-index
 * backfill share the same rules.
 *
 * `upsertReminderPreferences` also maintains the reminder index: it derives
 * `reminderHourUtc` from `reminderTime` + `timezone` and sets the sparse GSI3
 * keys `REMINDER#<HH>` / `USER#<id>` while daily reminders are on, removing
 * them when they are off. The hourly daily-reminders job re-buckets with the
 * same `deriveReminderHourUtc`.
 */

const { dynamoHelpers } = require('/opt/nodejs/utils');
const keys = require('/opt/nodejs/keys');

const PREFERENCES_SK = keys.SK.NOTIFICATION_PREFERENCES;
const DEFAULT_TIMEZONE = 'UTC';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_TIMEZONE_LENGTH = 64;

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  budgetAlertsEnabled: true,
  dailyRemindersEnabled: true,
  reminderTime: '19:00',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: DEFAULT_TIMEZONE,
});

/** 24-hour HH:MM, e.g. 07:30 or 22:00 */
const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const isBoolean = (value) => typeof value === 'boolean';
const isTimeOfDay = (value) => typeof value === 'string' && TIME_HH_MM.test(value);

/**
 * True for a time zone name `Intl` accepts (an IANA name such as
 * `America/Toronto` or `UTC`), at most 64 characters.
 * @param {*} value
 * @returns {boolean}
 */
function isIanaTimeZone(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TIMEZONE_LENGTH) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * The only attributes a client may write on its preferences item, with the
 * check each value must pass. Anything else in the request body (PK, SK, GSI
 * keys, reminderHourUtc, lastReminderDate, userId, role, ...) is never copied
 * into the item.
 */
const PREFERENCE_FIELDS = Object.freeze({
  budgetAlertsEnabled: { isValid: isBoolean, expected: 'a boolean' },
  dailyRemindersEnabled: { isValid: isBoolean, expected: 'a boolean' },
  reminderTime: { isValid: isTimeOfDay, expected: 'a 24-hour HH:MM time' },
  quietHoursStart: { isValid: isTimeOfDay, expected: 'a 24-hour HH:MM time' },
  quietHoursEnd: { isValid: isTimeOfDay, expected: 'a 24-hour HH:MM time' },
  timezone: { isValid: isIanaTimeZone, expected: 'an IANA time zone' },
});

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Copy only the allowlisted preference attributes from a stored item.
 * @param {Object|null} item - DynamoDB item
 * @returns {Object} Preference fields present on the item
 */
function pickPreferenceFields(item) {
  const picked = {};
  if (!item) return picked;
  for (const field of Object.keys(PREFERENCE_FIELDS)) {
    if (item[field] !== undefined) picked[field] = item[field];
  }
  return picked;
}

/**
 * Build the attribute updates for PUT /notifications/preferences.
 *
 * Accepts the fields at the top level (mobile client) or nested under
 * `preferences` (web client). Fields outside PREFERENCE_FIELDS are dropped
 * rather than rejected, because both shipped clients send `userId` alongside
 * the preferences and installed mobile builds cannot be changed from here.
 *
 * @param {*} body - Parsed request body
 * @returns {{ updates?: Object, error?: string }}
 */
function parsePreferenceUpdates(body) {
  if (!isPlainObject(body)) {
    return { error: 'Request body must be a JSON object' };
  }
  let source = body;
  if (body.preferences !== undefined) {
    if (!isPlainObject(body.preferences)) {
      return { error: 'preferences must be an object' };
    }
    source = body.preferences;
  }

  const updates = {};
  for (const [field, rule] of Object.entries(PREFERENCE_FIELDS)) {
    if (source[field] === undefined) continue;
    if (!rule.isValid(source[field])) {
      return { error: `${field} must be ${rule.expected}` };
    }
    updates[field] = source[field];
  }

  if (Object.keys(updates).length === 0) {
    const allowed = Object.keys(PREFERENCE_FIELDS).join(', ');
    return { error: `No valid preference fields provided (allowed: ${allowed})` };
  }
  return { updates };
}

/**
 * Stored preferences merged over the defaults. A stored time zone `Intl`
 * no longer accepts falls back to UTC.
 * @param {Object|null} item
 * @returns {Object}
 */
function resolvePreferences(item) {
  const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...pickPreferenceFields(item) };
  if (!isIanaTimeZone(merged.timezone)) merged.timezone = DEFAULT_TIMEZONE;
  if (!isTimeOfDay(merged.reminderTime)) {
    merged.reminderTime = DEFAULT_NOTIFICATION_PREFERENCES.reminderTime;
  }
  return merged;
}

// ── Time-zone arithmetic (Intl only, no dependency) ─────────────────────────

const formatters = new Map();

function formatterFor(timeZone) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * Wall-clock parts of an instant in a time zone.
 * @param {Date|number} instant
 * @param {string} timeZone - IANA name
 * @returns {{ year: number, month: number, day: number, hour: number,
 *   minute: number, second: number, date: string }} `date` is YYYY-MM-DD
 */
function localParts(instant, timeZone) {
  const parts = {};
  for (const { type, value } of formatterFor(timeZone).formatToParts(new Date(instant))) {
    if (type !== 'literal') parts[type] = Number(value);
  }
  const pad = (n) => String(n).padStart(2, '0');
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
  };
}

/** Local time minus UTC, in ms, at an instant. */
function zoneOffsetMs(instantMs, timeZone) {
  const p = localParts(instantMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * @param {string} date - YYYY-MM-DD
 * @param {number} days
 * @returns {string} YYYY-MM-DD
 */
function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The UTC instant at which a local date shows HH:00 in a time zone. When HH:00
 * does not exist that day (spring-forward gap), the first valid instant after
 * it. When it exists twice (fall-back), the earlier one.
 * @param {string} localDate - YYYY-MM-DD
 * @param {number} hour - 0-23
 * @param {string} timeZone
 * @returns {number} epoch ms
 */
function utcInstantOf(localDate, hour, timeZone) {
  const [y, m, d] = localDate.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  const first = guess - zoneOffsetMs(guess, timeZone);
  const second = guess - zoneOffsetMs(first, timeZone);
  const shows = (instant) => {
    const p = localParts(instant, timeZone);
    return p.date === localDate && p.hour === hour && p.minute === 0;
  };
  const hits = [first, second].filter(shows);
  if (hits.length > 0) return Math.min(...hits);
  return Math.max(first, second);
}

/**
 * @param {string} reminderTime - HH:MM; minutes are ignored
 * @returns {number} 0-23
 */
function reminderHourOf(reminderTime) {
  return Number(String(reminderTime).slice(0, 2));
}

/**
 * UTC hour bucket for a reminder at `reminderTime` local in `timezone`,
 * derived for the NEXT local day (so a bucket written today is right for
 * tomorrow across a DST switch) and rounded up to a whole UTC hour (so zones
 * with a :30 or :45 offset are reminded at HH:30 / HH:45 local).
 *
 * @param {string} reminderTime - HH:MM
 * @param {string} timezone - IANA name
 * @param {Date} [now]
 * @returns {number} 0-23
 */
function deriveReminderHourUtc(reminderTime, timezone, now = new Date()) {
  const tomorrow = addDays(localParts(now, timezone).date, 1);
  const instant = utcInstantOf(tomorrow, reminderHourOf(reminderTime), timezone);
  return new Date(Math.ceil(instant / HOUR_MS) * HOUR_MS).getUTCHours();
}

// ── Writer ──────────────────────────────────────────────────────────────────

/**
 * Compute the write `upsertReminderPreferences` would make, without I/O.
 *
 * @param {string} userId
 * @param {Object|null} existing - stored item, or null
 * @param {Object} updates - parser output, or {}
 * @param {Date} [now]
 * @returns {{ fields: Object, remove: string[], condition: Object, merged: Object }}
 */
function planReminderPreferences(userId, existing, updates, now = new Date()) {
  const merged = resolvePreferences({ ...pickPreferenceFields(existing), ...updates });
  // First save seeds every default so readers always see a full item; later
  // saves touch only the fields the caller sent, as before.
  const fields = existing ? { ...updates } : { ...DEFAULT_NOTIFICATION_PREFERENCES, ...updates };
  const hourUtc = deriveReminderHourUtc(merged.reminderTime, merged.timezone, now);
  fields.reminderHourUtc = hourUtc;

  let remove = [];
  if (merged.dailyRemindersEnabled) {
    Object.assign(fields, keys.reminderGSI3(hourUtc, userId));
  } else {
    remove = ['GSI3PK', 'GSI3SK'];
  }

  const names = { '#seenUpdatedAt': 'updatedAt' };
  const condition = existing && existing.updatedAt !== undefined
    ? { expression: '#seenUpdatedAt = :seenUpdatedAt', names, values: { ':seenUpdatedAt': existing.updatedAt } }
    : { expression: 'attribute_not_exists(#seenUpdatedAt)', names };

  return { fields, remove, condition, merged };
}

/**
 * True when applying `plan` to `existing` would change a stored attribute
 * (always true for a missing item). The backfill uses it to stay idempotent.
 * @param {Object|null} existing
 * @param {{ fields: Object, remove: string[] }} plan
 * @returns {boolean}
 */
function planChangesItem(existing, plan) {
  if (!existing) return true;
  if (Object.entries(plan.fields).some(([field, value]) => existing[field] !== value)) return true;
  return plan.remove.some((field) => existing[field] !== undefined);
}

const isConditionFailure = (error) =>
  Boolean(error) && error.name === 'ConditionalCheckFailedException';

/**
 * The only writer of `USER#<userId>/NOTIFICATION_PREFERENCES`.
 *
 * GetItem, then one UpdateItem on the caller's fixed key: SET the validated
 * fields (defaults seeded on first save), `reminderHourUtc` and the GSI3 keys
 * (or REMOVE them when reminders are off), conditioned on the `updatedAt` it
 * read. On a conflict it re-reads and retries once, then rethrows.
 *
 * @param {string} userId - caller's userId from the verified token
 * @param {Object} [updates] - parsePreferenceUpdates output, or {} (onboarding, backfill)
 * @param {{ now?: Date, skipIfUnchanged?: boolean }} [options]
 * @returns {Promise<{ success: true, preferences: Object, written: boolean }>}
 */
async function upsertReminderPreferences(userId, updates = {}, options = {}) {
  const { now = new Date(), skipIfUnchanged = false } = options;
  const pk = keys.userPK(userId);

  for (let attempt = 0; ; attempt += 1) {
    const existing = await dynamoHelpers.getItem(pk, PREFERENCES_SK);
    const plan = planReminderPreferences(userId, existing, updates, now);

    if (skipIfUnchanged && !planChangesItem(existing, plan)) {
      return { success: true, preferences: plan.merged, written: false };
    }

    try {
      const updated = await dynamoHelpers.updateItem(pk, PREFERENCES_SK, plan.fields, {
        remove: plan.remove,
        condition: plan.condition,
      });
      return {
        success: true,
        preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...pickPreferenceFields(updated) },
        written: true,
      };
    } catch (error) {
      if (!isConditionFailure(error) || attempt >= 1) throw error;
    }
  }
}

/**
 * Preferences for GET /notifications/preferences: fields never saved fall
 * back to defaults; no internal attribute is returned.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function getNotificationPreferences(userId) {
  const item = await dynamoHelpers.getItem(keys.userPK(userId), PREFERENCES_SK);
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...pickPreferenceFields(item),
    ...(item && item.updatedAt ? { updatedAt: item.updatedAt } : {}),
  };
}

module.exports = {
  PREFERENCES_SK,
  DEFAULT_TIMEZONE,
  DEFAULT_NOTIFICATION_PREFERENCES,
  PREFERENCE_FIELDS,
  isIanaTimeZone,
  pickPreferenceFields,
  parsePreferenceUpdates,
  resolvePreferences,
  localParts,
  addDays,
  utcInstantOf,
  reminderHourOf,
  deriveReminderHourUtc,
  planReminderPreferences,
  planChangesItem,
  isConditionFailure,
  upsertReminderPreferences,
  getNotificationPreferences,
};
