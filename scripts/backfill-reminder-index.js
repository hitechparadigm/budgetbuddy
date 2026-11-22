#!/usr/bin/env node
/**
 * Backfill: put every existing user into the daily-reminder index
 * (Wave 3 design section 3, phase 1).
 *
 * For each `USER#<id>/PROFILE` it calls the layer's
 * `upsertReminderPreferences(userId, {})`, the same writer
 * PUT /notifications/preferences and auth-onboarding use. That adds the
 * default preferences (first save only), `reminderHourUtc` and the GSI3 keys
 * `REMINDER#<HH>` / `USER#<id>`, and leaves every saved choice alone.
 *
 * Safety properties:
 *   - DRY RUN BY DEFAULT. It reads and reports; writes happen only with --apply.
 *   - Idempotent. A user whose item already has the derived attributes is
 *     skipped (no write), so re-running changes nothing.
 *   - Each write is the writer's conditional UpdateItem on the user's own
 *     NOTIFICATION_PREFERENCES item; nothing is deleted.
 *   - No user identifier or preference value is printed, only counts and
 *     error names.
 *
 * This one-off operator script uses a paginated Scan to list profiles;
 * scheduled code never scans (the job reads the GSI3 index).
 *
 * Usage (run once right after the phase 1 deploy, dry run first):
 *   node scripts/backfill-reminder-index.js            # dry run
 *   node scripts/backfill-reminder-index.js --apply    # writes
 *
 * Environment:
 *   TABLE_NAME   DynamoDB table (default and only --apply target: budgetbuddy-main)
 *   AWS_REGION   region (default: us-east-1)
 * Credentials come from the ambient AWS configuration (the project profile).
 */
const path = require('path');
const Module = require('module');

const LAYER_DIR = path.join(__dirname, '..', 'backend', 'layers', 'common', 'nodejs');
const EXPECTED_TABLE = 'budgetbuddy-main';
const MAX_SCAN_PAGES = 1000;

/**
 * Let the layer modules' `/opt/nodejs/<name>` requires resolve to the layer
 * source in this repository, so the script runs the deployed writer unchanged.
 */
function installLayerResolver() {
  const original = Module._resolveFilename;
  Module._resolveFilename = function resolve(request, ...rest) {
    const target = request.startsWith('/opt/nodejs/')
      ? path.join(LAYER_DIR, request.slice('/opt/nodejs/'.length))
      : request;
    return original.call(this, target, ...rest);
  };
}

/**
 * @param {string[]} argv
 * @returns {{ apply: boolean }}
 */
function parseArgs(argv) {
  const unknown = argv.filter((arg) => arg !== '--apply');
  if (unknown.length > 0) throw new Error(`Unknown argument(s): ${unknown.join(' ')}`);
  return { apply: argv.includes('--apply') };
}

/**
 * Keep the `USER#<id>/PROFILE` items of a key-only Scan and return their user
 * IDs. The selection happens here rather than in a FilterExpression: a filter
 * on PK/SK is the pattern the phase 0 key-filter guard flags, and a Scan
 * filter does not lower the read cost anyway.
 *
 * @param {Array<{PK?: string, SK?: string}>} items - Scan items (PK, SK projected)
 * @param {Object} keys - the layer keys module
 * @returns {string[]} user IDs
 */
function profileUserIds(items, keys) {
  return items
    .filter((item) => item.SK === keys.SK.PROFILE
      && typeof item.PK === 'string' && item.PK.startsWith(keys.PREFIX.USER))
    .map((item) => item.PK.slice(keys.PREFIX.USER.length));
}

/**
 * Plan (and with `apply`, write) the reminder-index entry of every user.
 *
 * @param {Object} deps
 * @param {boolean} deps.apply
 * @param {() => Promise<string[]>} deps.listUserIds - every profile's userId
 * @param {(userId: string) => Promise<Object|null>} deps.getPreferencesItem
 * @param {Object} deps.prefs - the layer reminder-preferences module
 * @param {Date} [deps.now]
 * @returns {Promise<Object>} counts
 */
async function runBackfill({ apply, listUserIds, getPreferencesItem, prefs, now = new Date() }) {
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    users: 0,
    unchanged: 0,
    wouldCreate: 0,
    wouldUpdate: 0,
    created: 0,
    updated: 0,
    failed: 0,
    failures: {},
  };

  const userIds = await listUserIds();
  summary.users = userIds.length;

  for (const userId of userIds) {
    try {
      const existing = await getPreferencesItem(userId);
      const plan = prefs.planReminderPreferences(userId, existing, {}, now);
      if (!prefs.planChangesItem(existing, plan)) {
        summary.unchanged += 1;
      } else if (!apply) {
        summary[existing ? 'wouldUpdate' : 'wouldCreate'] += 1;
      } else {
        const result = await prefs.upsertReminderPreferences(userId, {}, { now, skipIfUnchanged: true });
        if (!result.written) summary.unchanged += 1;
        else summary[existing ? 'updated' : 'created'] += 1;
      }
    } catch (error) {
      summary.failed += 1;
      const name = (error && error.name) || 'Error';
      summary.failures[name] = (summary.failures[name] || 0) + 1;
    }
  }
  return summary;
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  process.env.TABLE_NAME = process.env.TABLE_NAME || EXPECTED_TABLE;
  if (apply && process.env.TABLE_NAME !== EXPECTED_TABLE) {
    throw new Error(`--apply writes only to ${EXPECTED_TABLE}`);
  }

  installLayerResolver();
  const { dynamoHelpers } = require('/opt/nodejs/utils');
  const prefs = require('/opt/nodejs/reminder-preferences');
  const keys = require('/opt/nodejs/keys');

  const listUserIds = async () => {
    const items = await dynamoHelpers.scan({
      ProjectionExpression: 'PK, SK',
      maxPages: MAX_SCAN_PAGES,
    });
    return profileUserIds(items, keys);
  };
  const getPreferencesItem = (userId) =>
    dynamoHelpers.getItem(keys.userPK(userId), prefs.PREFERENCES_SK);

  const summary = await runBackfill({ apply, listUserIds, getPreferencesItem, prefs });
  console.log(JSON.stringify({ table: process.env.TABLE_NAME, ...summary }, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`backfill-reminder-index failed: ${error.name}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { parseArgs, profileUserIds, runBackfill, installLayerResolver, LAYER_DIR };
