/**
 * Daily Reminders job (Wave 3 design section 3, D3).
 *
 * Hourly run (EventBridge `cron(0 * * * ? *)`): reads only the users due this
 * UTC hour from the sparse GSI3 reminder index (`REMINDER#<HH>`), never the
 * whole table, and sends each at most one "log today's spending / add your
 * receipts" reminder per local day, at the whole hour they chose, unless they
 * already recorded a transaction that local day. Quiet hours do not apply to
 * this reminder. Every user read is re-bucketed for tomorrow, so DST and
 * time-zone changes move them to the right hour.
 *
 * Daily run at 13:00 UTC (`{ mode: 'daily-nudges' }`): spending-pace nudges
 * for every budget with a current-month period (GSI2 `PERIOD#<month>`), and on
 * Sundays the weekly insight to each member.
 *
 * Bill reminders live in bills-scheduler (08:00 UTC). The monthly kickoff
 * email stays off (no SES grant, unverified sender).
 *
 * `{ healthCheck: true }` returns at once, before any read.
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { dynamoHelpers, logger, emitEmfMetric } = require('/opt/nodejs/utils');
const keys = require('/opt/nodejs/keys');
const reminderPrefs = require('/opt/nodejs/reminder-preferences');

// Reused across warm invocations
const lambdaClient = new LambdaClient({});

const CONCURRENCY = 4;
const NUDGES_MODE = 'daily-nudges';
const METRIC_NAMESPACE = 'BudgetBuddy/Reminders';
const MAX_NUDGES_PER_BUDGET = 3;
const NUDGE_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Run `worker` over `items` with at most `limit` in flight.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
}

const userIdOf = (item) => String(item.PK || '').slice(keys.PREFIX.USER.length);
const budgetIdOf = (item) => item.budgetId || String(item.PK || '').slice(keys.PREFIX.BUDGET.length);

/**
 * Invoke the notifications function asynchronously with the internal event
 * it dispatches before its auth check.
 * @param {string} userId
 * @param {{ type: string, title: string, body: string, data?: Object }} notification
 */
async function sendNotification(userId, notification) {
  const functionName = process.env.NOTIFICATION_FUNCTION_ARN;
  if (!functionName) throw new Error('NOTIFICATION_FUNCTION_ARN is not set');
  await lambdaClient.send(new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify({ internalAction: 'send', userId, notification })),
  }));
}

// ── Hourly reminders ────────────────────────────────────────────────────────

/** A6: did the user record any transaction on `localDate` in their budget? */
async function loggedOn(budgetId, userId, localDate) {
  const rows = await dynamoHelpers.queryAll({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :day)',
    ExpressionAttributeValues: {
      ':pk': keys.budgetPK(budgetId),
      // no trailing '#', so both DATE#<date> and DATE#<date>#TXN#<id> match
      ':day': `${keys.PREFIX.DATE}${keys.assertDate(localDate)}`,
    },
    ProjectionExpression: 'createdBy',
  }, { maxItems: 1000 });
  return rows.some((row) => row.createdBy === userId);
}

/**
 * Claim today's reminder: SET lastReminderDate only if it is not already
 * today. A failed condition means another run sent it.
 * @returns {Promise<boolean>} true when this run owns the send
 */
async function claimReminder(userId, localDate) {
  try {
    await dynamoHelpers.updateItem(
      keys.userPK(userId),
      reminderPrefs.PREFERENCES_SK,
      { lastReminderDate: localDate },
      {
        condition: {
          expression: 'attribute_exists(#claimUpdatedAt) AND '
            + '(attribute_not_exists(#claimDate) OR #claimDate <> :claimDate)',
          names: { '#claimDate': 'lastReminderDate', '#claimUpdatedAt': 'updatedAt' },
          values: { ':claimDate': localDate },
        },
      },
    );
    return true;
  } catch (error) {
    if (reminderPrefs.isConditionFailure(error)) return false;
    throw error;
  }
}

/**
 * Move the user to tomorrow's bucket if it differs, conditioned on the bucket
 * this run read (a concurrent preferences save wins).
 * @returns {Promise<boolean>} true when the bucket changed
 */
async function rebucket(item, userId, prefs, now) {
  const hourUtc = reminderPrefs.deriveReminderHourUtc(prefs.reminderTime, prefs.timezone, now);
  const bucket = keys.reminderBucketPK(hourUtc);
  if (item.reminderHourUtc === hourUtc && item.GSI3PK === bucket) return false;
  try {
    await dynamoHelpers.updateItem(
      keys.userPK(userId),
      reminderPrefs.PREFERENCES_SK,
      { reminderHourUtc: hourUtc, GSI3PK: bucket },
      {
        condition: {
          expression: '#rebucketPk = :rebucketPk',
          names: { '#rebucketPk': 'GSI3PK' },
          values: { ':rebucketPk': item.GSI3PK },
        },
      },
    );
    return true;
  } catch (error) {
    if (reminderPrefs.isConditionFailure(error)) return false;
    throw error;
  }
}

/** The reminder sent to a user for `localDate`. */
function reminderNotification(localDate) {
  return {
    type: 'daily_reminder',
    title: "Log today's spending",
    body: "Add today's expenses and receipts to keep your budget up to date.",
    data: { type: 'daily_reminder', localDate },
  };
}

/**
 * Decide and (maybe) send one user's reminder, then re-bucket.
 * @returns {Promise<{ outcome: string, rebucketed: boolean }>}
 */
async function processDueUser(item, now) {
  const userId = userIdOf(item);
  const prefs = reminderPrefs.resolvePreferences(item);
  const local = reminderPrefs.localParts(now, prefs.timezone);

  let outcome;
  if (!prefs.dailyRemindersEnabled) {
    outcome = 'disabled';
  } else if (local.hour !== reminderPrefs.reminderHourOf(prefs.reminderTime)) {
    // stale bucket (DST, time-zone change): no catch-up, the re-bucket fixes it
    outcome = 'not_local_hour';
  } else if (item.lastReminderDate === local.date) {
    outcome = 'already_sent';
  } else {
    const profile = await dynamoHelpers.getItem(keys.userPK(userId), keys.SK.PROFILE);
    if (!profile || !profile.defaultBudgetId) {
      outcome = 'no_budget';
    } else if (await loggedOn(profile.defaultBudgetId, userId, local.date)) {
      outcome = 'logged_today';
    } else if (!(await claimReminder(userId, local.date))) {
      outcome = 'already_sent';
    } else {
      try {
        await sendNotification(userId, reminderNotification(local.date));
        outcome = 'sent';
      } catch (error) {
        // at most once: the claim stays, the user misses this one reminder
        logger.error('Reminder send failed', error, { userId });
        emitEmfMetric('ReminderSendFailed', 1, {}, METRIC_NAMESPACE);
        outcome = 'send_failed';
      }
    }
  }

  let rebucketed = false;
  try {
    rebucketed = await rebucket(item, userId, prefs, now);
  } catch (error) {
    logger.warn('Reminder re-bucket failed', { userId, errorName: error.name });
  }
  return { outcome, rebucketed };
}

/**
 * The hourly run. A failed GSI3 query throws, so the invocation fails and
 * EventBridge retries; a per-user failure is logged and the run continues.
 * @param {Date} now
 */
async function runHourlyReminders(now) {
  const startedAt = Date.now();
  const hourUtc = now.getUTCHours();
  const due = await dynamoHelpers.queryAll({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :bucket',
    ExpressionAttributeValues: { ':bucket': keys.reminderBucketPK(hourUtc) },
  });

  const results = await mapLimit(due, CONCURRENCY, async (item) => {
    try {
      return await processDueUser(item, now);
    } catch (error) {
      logger.warn('Reminder user failed', { userId: userIdOf(item), errorName: error.name });
      return { outcome: 'error', rebucketed: false };
    }
  });

  const skipped = {};
  let sent = 0;
  let failed = 0;
  let rebucketed = 0;
  for (const result of results) {
    if (result.rebucketed) rebucketed += 1;
    if (result.outcome === 'sent') sent += 1;
    else if (result.outcome === 'send_failed' || result.outcome === 'error') failed += 1;
    else skipped[result.outcome] = (skipped[result.outcome] || 0) + 1;
  }
  const summary = {
    mode: 'hourly',
    hourUtc,
    due: due.length,
    sent,
    skipped,
    failed,
    rebucketed,
    durationMs: Date.now() - startedAt,
  };
  logger.info('Daily reminders run', summary);
  return summary;
}

// ── 13:00 UTC nudges and Sunday weekly insight ──────────────────────────────

/** Category objects of a period group: a flat category list, or groups with `categories`. */
function categoriesIn(group) {
  if (!Array.isArray(group)) return [];
  return group.flatMap((entry) => (Array.isArray(entry && entry.categories) ? entry.categories : [entry]));
}

/**
 * Spending-pace nudges for a period: a category 20%+ ahead of the month's
 * pace (and more than 50 spent), at most 3. `groups.expenses` is a flat
 * category array on stored periods; the old `.categories` read found nothing.
 */
function computeNudges(period, now) {
  const groups = period.groups || {};
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const fractionElapsed = dayOfMonth / daysInMonth;
  const nudges = [];
  for (const cat of [...categoriesIn(groups.expenses), ...categoriesIn(groups.savings)]) {
    const planned = Number(cat && cat.plannedAmount) || 0;
    const spent = Number(cat && cat.spentAmount) || 0;
    if (planned <= 0) continue;
    const expectedSpent = planned * fractionElapsed;
    if (spent > expectedSpent * 1.2 && spent > 50) {
      const overBy = (spent - expectedSpent).toFixed(0);
      nudges.push({
        type: 'overspend_pace',
        category: cat.name,
        message: `You've spent $${spent.toFixed(0)} of your $${planned.toFixed(0)} ${cat.name} budget, `
          + `about $${overBy} ahead of pace. With ${daysInMonth - dayOfMonth} days left, you may want to slow down.`,
        severity: 'warning',
      });
      if (nudges.length >= MAX_NUDGES_PER_BUDGET) break;
    }
  }
  return nudges;
}

/** A4: a budget's non-deleted transactions dated start..end (inclusive). */
async function transactionsBetween(budgetId, start, end) {
  const { from, to } = keys.dateRangeGSI1(start, end);
  return dynamoHelpers.queryGSIRange('GSI1', keys.budgetPK(budgetId), from, to, {
    FilterExpression: 'attribute_not_exists(isDeleted) OR isDeleted = :false',
    ExpressionAttributeValues: { ':false': false },
    ProjectionExpression: '#type, amount, #date',
    ExpressionAttributeNames: { '#type': 'type', '#date': 'date' },
  });
}

/** Weekly summary of the last 7 days against the 7 before. */
async function weeklyInsight(budgetId, now) {
  const today = now.toISOString().slice(0, 10);
  const weekStart = reminderPrefs.addDays(today, -6);
  const prevStart = reminderPrefs.addDays(today, -13);
  const rows = await transactionsBetween(budgetId, prevStart, today);
  const sum = (list, type) => list
    .filter((t) => t.type === type)
    .reduce((total, t) => total + (Number(t.amount) || 0), 0);
  const thisWeek = rows.filter((t) => t.date >= weekStart);
  const lastWeek = rows.filter((t) => t.date < weekStart);
  const totalSpent = sum(thisWeek, 'expense');
  const prevSpent = sum(lastWeek, 'expense');
  const totalIncome = sum(thisWeek, 'income');
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;
  const spendingChange = prevSpent > 0 ? Math.round(((totalSpent - prevSpent) / prevSpent) * 100) : 0;

  let body = `This week: $${totalSpent.toFixed(2)} spent`;
  if (Math.abs(spendingChange) > 5) {
    body += ` (${spendingChange > 0 ? 'up' : 'down'} ${Math.abs(spendingChange)}% vs last week)`;
  }
  body += `. Savings rate: ${savingsRate.toFixed(0)}%`;

  return {
    type: 'weekly_insight',
    title: 'Weekly Spending Summary',
    body,
    data: {
      type: 'weekly_insight',
      totalSpent: Math.round(totalSpent * 100) / 100,
      spendingChange,
      savingsRate: Math.round(savingsRate * 10) / 10,
      transactionCount: thisWeek.length,
    },
  };
}

/** True when `now` falls in the user's quiet hours, in the user's time zone. */
function inQuietHours(prefs, now) {
  const local = reminderPrefs.localParts(now, prefs.timezone);
  const minutes = local.hour * 60 + local.minute;
  const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + m;
  };
  const start = toMinutes(prefs.quietHoursStart);
  const end = toMinutes(prefs.quietHoursEnd);
  if (start === end) return false;
  return start > end ? minutes >= start || minutes < end : minutes >= start && minutes < end;
}

/** Nudges and (Sundays) the weekly insight for one budget's members. */
async function processBudget(period, now, counts) {
  const budgetId = budgetIdOf(period);
  const members = (await dynamoHelpers.queryByPrefix(keys.budgetPK(budgetId), keys.PREFIX.MEMBER))
    .filter((member) => member.userId && (member.status === undefined || member.status === 'active'));
  if (members.length === 0) return;

  const today = now.toISOString().slice(0, 10);
  const nudges = computeNudges(period, now);
  if (nudges.length > 0) {
    for (const member of members) {
      await dynamoHelpers.putItem({
        PK: keys.userPK(member.userId),
        SK: keys.nudgeSK(today),
        userId: member.userId,
        budgetId,
        nudges,
        read: false,
        ttl: Math.floor(now.getTime() / 1000) + NUDGE_TTL_SECONDS,
      });
      counts.nudgesWritten += 1;
    }
  }

  if (now.getUTCDay() !== 0) return;
  const insight = await weeklyInsight(budgetId, now);
  for (const member of members) {
    const item = await dynamoHelpers.getItem(keys.userPK(member.userId), reminderPrefs.PREFERENCES_SK);
    const prefs = reminderPrefs.resolvePreferences(item);
    if (item && item.weeklyInsights === false) {
      counts.insightsSkipped += 1;
    } else if (inQuietHours(prefs, now)) {
      counts.insightsSkipped += 1;
    } else {
      try {
        await sendNotification(member.userId, insight);
        counts.insightsSent += 1;
      } catch (error) {
        logger.error('Weekly insight send failed', error, { userId: member.userId });
        emitEmfMetric('ReminderSendFailed', 1, {}, METRIC_NAMESPACE);
        counts.failed += 1;
      }
    }
  }
}

/**
 * The 13:00 UTC run. A8 (GSI2 `PERIOD#<month>`) lists the month's periods;
 * periods written without GSI2 keys are not found until they get them.
 * @param {Date} now
 */
async function runDailyNudges(now) {
  const startedAt = Date.now();
  const month = now.toISOString().slice(0, 7);
  const periods = await dynamoHelpers.queryAll({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :period',
    ExpressionAttributeValues: { ':period': keys.periodSK(month) },
  });

  const counts = { nudgesWritten: 0, insightsSent: 0, insightsSkipped: 0, failed: 0, budgetErrors: 0 };
  await mapLimit(periods, CONCURRENCY, async (period) => {
    try {
      await processBudget(period, now, counts);
    } catch (error) {
      counts.budgetErrors += 1;
      logger.warn('Nudge budget failed', { budgetId: budgetIdOf(period), errorName: error.name });
    }
  });

  const summary = {
    mode: NUDGES_MODE,
    month,
    budgets: periods.length,
    ...counts,
    durationMs: Date.now() - startedAt,
  };
  logger.info('Daily nudges run', summary);
  return summary;
}

/**
 * Lambda entry point.
 * @param {{ healthCheck?: boolean, mode?: string }} event
 */
exports.handler = async (event) => {
  if (event && event.healthCheck === true) {
    return { statusCode: 200, body: JSON.stringify({ status: 'healthy' }) };
  }
  const now = new Date();
  const summary = event && event.mode === NUDGES_MODE
    ? await runDailyNudges(now)
    : await runHourlyReminders(now);
  return { statusCode: 200, body: JSON.stringify(summary) };
};

// Exported for tests
exports.runHourlyReminders = runHourlyReminders;
exports.runDailyNudges = runDailyNudges;
exports.computeNudges = computeNudges;
exports.inQuietHours = inQuietHours;
