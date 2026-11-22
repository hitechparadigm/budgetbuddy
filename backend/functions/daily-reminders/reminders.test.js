/**
 * Daily reminders behavior (Wave 3 design section 3, tests in 9.3), run
 * against an in-memory table that honors key conditions, GSIs, condition
 * expressions and REMOVE. Users are created through the real layer writer
 * upsertReminderPreferences, so their GSI3 keys are the production ones.
 */
jest.mock(
  "/opt/nodejs/utils",
  () => {
    const table = new Map();
    const keyOf = (pk, sk) => `${pk}|${sk}`;
    const failure = () => Object.assign(new Error("The conditional request failed"), {
      name: "ConditionalCheckFailedException",
    });
    /** Tiny evaluator for the condition expressions the code under test uses. */
    const holds = (item, { expression, names = {}, values = {} }) => {
      const attr = (placeholder) => (item ? item[names[placeholder]] : undefined);
      const js = expression
        .replace(/attribute_exists\((#\w+)\)/g, (_m, n) => `(attr('${n}') !== undefined)`)
        .replace(/attribute_not_exists\((#\w+)\)/g, (_m, n) => `(attr('${n}') === undefined)`)
        .replace(/(#\w+) <> (:\w+)/g, (_m, n, v) => `(attr('${n}') !== values['${v}'])`)
        .replace(/(#\w+) = (:\w+)/g, (_m, n, v) => `(attr('${n}') === values['${v}'])`)
        .replace(/\bAND\b/g, "&&")
        .replace(/\bOR\b/g, "||");
      // eslint-disable-next-line no-new-func
      return new Function("attr", "values", `return ${js};`)(attr, values);
    };
    let tick = 0;
    const helpers = {
      getItem: jest.fn(async (pk, sk) => {
        const item = table.get(keyOf(pk, sk));
        return item ? { ...item } : null;
      }),
      putItem: jest.fn(async (item) => {
        table.set(keyOf(item.PK, item.SK), { ...item });
      }),
      updateItem: jest.fn(async (pk, sk, updates, options = {}) => {
        const current = table.get(keyOf(pk, sk));
        if (options.condition && !holds(current, options.condition)) throw failure();
        tick += 1;
        const next = { ...(current || { PK: pk, SK: sk }), ...updates, updatedAt: `t${tick}` };
        for (const attribute of options.remove || []) delete next[attribute];
        table.set(keyOf(pk, sk), next);
        return { ...next };
      }),
      queryAll: jest.fn(async (input) => {
        const values = input.ExpressionAttributeValues;
        const items = [...table.values()];
        if (input.IndexName === "GSI3") return items.filter((i) => i.GSI3PK === values[":bucket"]);
        if (input.IndexName === "GSI2") return items.filter((i) => i.GSI2PK === values[":period"]);
        if (input.IndexName === "GSI1") {
          return items.filter((i) => i.GSI1PK === values[":pk"]
            && typeof i.GSI1SK === "string" && i.GSI1SK.startsWith(values[":day"]));
        }
        throw new Error(`unexpected query ${JSON.stringify(input)}`);
      }),
      queryByPrefix: jest.fn(async (pk, prefix) =>
        [...table.values()].filter((i) => i.PK === pk && i.SK.startsWith(prefix))),
      queryGSIRange: jest.fn(async (index, pk, from, to) =>
        [...table.values()].filter((i) => i[`${index}PK`] === pk
          && i[`${index}SK`] >= from && i[`${index}SK`] <= to && !i.isDeleted)),
      scan: jest.fn(async () => { throw new Error("scheduled code must never Scan"); }),
    };
    return {
      __table: table,
      dynamoHelpers: helpers,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      emitEmfMetric: jest.fn(),
    };
  },
  { virtual: true },
);
jest.mock(
  "@aws-sdk/client-lambda",
  () => {
    const send = jest.fn(async () => ({ StatusCode: 202 }));
    return {
      __send: send,
      LambdaClient: class {
        send(cmd) {
          return send(cmd);
        }
      },
      InvokeCommand: class {
        constructor(input) {
          this.input = input;
        }
      },
    };
  },
  { virtual: true },
);

process.env.NOTIFICATION_FUNCTION_ARN = "arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:notifications";

const utils = require("/opt/nodejs/utils");
const { __send: mockLambdaSend } = require("@aws-sdk/client-lambda");
const { upsertReminderPreferences } = require("/opt/nodejs/reminder-preferences");
const { runHourlyReminders, runDailyNudges, computeNudges } = require("./index");

const prefsOf = (userId) => utils.__table.get(`USER#${userId}|NOTIFICATION_PREFERENCES`);
const payloads = () => mockLambdaSend.mock.calls.map(([cmd]) => ({
  ...JSON.parse(Buffer.from(cmd.input.Payload).toString("utf8")),
  functionName: cmd.input.FunctionName,
  invocationType: cmd.input.InvocationType,
}));

/** A user with a budget, created the way onboarding creates one. */
async function seedUser(userId, { timezone = "UTC", reminderTime = "19:00", seededAt, budgetId = `budget_${userId}` } = {}) {
  utils.__table.set(`USER#${userId}|PROFILE`, { PK: `USER#${userId}`, SK: "PROFILE", userId, defaultBudgetId: budgetId });
  utils.__table.set(`BUDGET#${budgetId}|MEMBER#${userId}`, {
    PK: `BUDGET#${budgetId}`, SK: `MEMBER#${userId}`, userId, role: "owner", status: "active",
  });
  await upsertReminderPreferences(userId, { timezone, reminderTime }, { now: seededAt });
  return budgetId;
}

function addTransaction(budgetId, date, createdBy, id = `txn_${Math.random().toString(36).slice(2)}`) {
  utils.__table.set(`BUDGET#${budgetId}|TRANSACTION#${id}`, {
    PK: `BUDGET#${budgetId}`, SK: `TRANSACTION#${id}`, GSI1PK: `BUDGET#${budgetId}`,
    GSI1SK: `DATE#${date}`, createdBy, date, type: "expense", amount: 12,
  });
}

beforeEach(() => {
  utils.__table.clear();
  jest.clearAllMocks();
  mockLambdaSend.mockImplementation(async () => ({ StatusCode: 202 }));
});

describe("hourly reminders", () => {
  const DAY_BEFORE = new Date("2026-11-21T12:00:00Z");

  it("sends once at the chosen hour and never twice in two runs of the same hour", async () => {
    await seedUser("user_a", { seededAt: DAY_BEFORE });

    const first = await runHourlyReminders(new Date("2026-11-22T19:00:04Z"));
    const second = await runHourlyReminders(new Date("2026-11-22T19:20:00Z"));

    expect(first).toMatchObject({ hourUtc: 19, due: 1, sent: 1, failed: 0 });
    expect(second).toMatchObject({ due: 1, sent: 0, skipped: { already_sent: 1 } });
    expect(payloads()).toHaveLength(1);
    expect(payloads()[0]).toMatchObject({
      internalAction: "send",
      userId: "user_a",
      functionName: process.env.NOTIFICATION_FUNCTION_ARN,
      invocationType: "Event",
      notification: { type: "daily_reminder", data: { localDate: "2026-11-22" } },
    });
    expect(prefsOf("user_a").lastReminderDate).toBe("2026-11-22");
    expect(utils.dynamoHelpers.scan).not.toHaveBeenCalled();
  });

  it("reads only the bucket of the current UTC hour", async () => {
    await seedUser("user_a", { seededAt: DAY_BEFORE });

    const other = await runHourlyReminders(new Date("2026-11-22T20:00:00Z"));

    expect(other).toMatchObject({ hourUtc: 20, due: 0, sent: 0 });
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  it("skips a user who already recorded a transaction that local day", async () => {
    const budgetId = await seedUser("user_a", { seededAt: DAY_BEFORE });
    addTransaction(budgetId, "2026-11-22", "user_a");

    const result = await runHourlyReminders(new Date("2026-11-22T19:00:00Z"));

    expect(result).toMatchObject({ sent: 0, skipped: { logged_today: 1 } });
    expect(prefsOf("user_a")).not.toHaveProperty("lastReminderDate");
  });

  it("a transaction by another member or on another day does not count", async () => {
    const budgetId = await seedUser("user_a", { seededAt: DAY_BEFORE });
    addTransaction(budgetId, "2026-11-22", "user_partner");
    addTransaction(budgetId, "2026-11-21", "user_a");

    const result = await runHourlyReminders(new Date("2026-11-22T19:00:00Z"));

    expect(result.sent).toBe(1);
  });

  it("Asia/Kolkata 19:00 is in bucket 14 and is sent at 19:30 local", async () => {
    await seedUser("user_in", { timezone: "Asia/Kolkata", seededAt: DAY_BEFORE });
    expect(prefsOf("user_in").GSI3PK).toBe("REMINDER#14");

    const result = await runHourlyReminders(new Date("2026-11-22T14:00:00Z"));

    expect(result.sent).toBe(1);
    expect(payloads()[0].notification.data.localDate).toBe("2026-11-22");
  });

  it("a stale bucket is skipped (never sent at the wrong local hour) and re-bucketed", async () => {
    // Bucketed in July (EDT, 19:00 = 23:00Z); in November 23:00Z is 18:00 EST
    await seedUser("user_ny", { timezone: "America/New_York", seededAt: new Date("2026-07-10T12:00:00Z") });
    expect(prefsOf("user_ny").GSI3PK).toBe("REMINDER#23");

    const result = await runHourlyReminders(new Date("2026-11-22T23:00:00Z"));

    expect(result).toMatchObject({ sent: 0, skipped: { not_local_hour: 1 }, rebucketed: 1 });
    expect(prefsOf("user_ny")).toMatchObject({ GSI3PK: "REMINDER#00", reminderHourUtc: 0 });
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  it("a user skipped because they already logged is re-bucketed too (spring-forward)", async () => {
    // Saturday 2026-03-07 19:00 EST is 00:00Z on the 8th; Sunday 19:00 EDT is 23:00Z
    const budgetId = await seedUser("user_ny", {
      timezone: "America/New_York", seededAt: new Date("2026-03-06T12:00:00Z"),
    });
    expect(prefsOf("user_ny").GSI3PK).toBe("REMINDER#00");
    addTransaction(budgetId, "2026-03-07", "user_ny");

    const result = await runHourlyReminders(new Date("2026-03-08T00:00:00Z"));

    expect(result).toMatchObject({ skipped: { logged_today: 1 }, rebucketed: 1 });
    expect(prefsOf("user_ny").GSI3PK).toBe("REMINDER#23");
  });

  it("a user with no budget yet is skipped", async () => {
    await seedUser("user_new", { seededAt: DAY_BEFORE });
    utils.__table.set("USER#user_new|PROFILE", { PK: "USER#user_new", SK: "PROFILE", userId: "user_new" });

    const result = await runHourlyReminders(new Date("2026-11-22T19:00:00Z"));

    expect(result).toMatchObject({ sent: 0, skipped: { no_budget: 1 } });
  });

  it("a failed send keeps the claim (at most once) and emits ReminderSendFailed", async () => {
    await seedUser("user_a", { seededAt: DAY_BEFORE });
    mockLambdaSend.mockRejectedValueOnce(new Error("invoke failed"));

    const result = await runHourlyReminders(new Date("2026-11-22T19:00:00Z"));
    const retry = await runHourlyReminders(new Date("2026-11-22T19:05:00Z"));

    expect(result).toMatchObject({ sent: 0, failed: 1 });
    expect(utils.emitEmfMetric).toHaveBeenCalledWith("ReminderSendFailed", 1, {}, "BudgetBuddy/Reminders");
    expect(retry).toMatchObject({ sent: 0, skipped: { already_sent: 1 } });
    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
  });

  it("a per-user failure is logged and the run continues", async () => {
    await seedUser("user_a", { seededAt: DAY_BEFORE });
    await seedUser("user_b", { seededAt: DAY_BEFORE });
    utils.dynamoHelpers.getItem.mockRejectedValueOnce(new Error("throttled"));

    const result = await runHourlyReminders(new Date("2026-11-22T19:00:00Z"));

    expect(result).toMatchObject({ due: 2, sent: 1, failed: 1 });
    expect(utils.logger.warn).toHaveBeenCalledWith("Reminder user failed", expect.objectContaining({ errorName: "Error" }));
  });

  it("a user who turned reminders off leaves the index and is not read", async () => {
    await seedUser("user_a", { seededAt: DAY_BEFORE });
    await upsertReminderPreferences("user_a", { dailyRemindersEnabled: false }, { now: DAY_BEFORE });

    const result = await runHourlyReminders(new Date("2026-11-22T19:00:00Z"));

    expect(result.due).toBe(0);
  });

  it("logs one summary line with due, sent and skip reasons", async () => {
    await seedUser("user_a", { seededAt: DAY_BEFORE });

    await runHourlyReminders(new Date("2026-11-22T19:00:00Z"));

    expect(utils.logger.info).toHaveBeenCalledWith("Daily reminders run", expect.objectContaining({
      mode: "hourly", hourUtc: 19, due: 1, sent: 1, skipped: {}, failed: 0,
    }));
  });
});

describe("13:00 UTC nudges and Sunday weekly insight", () => {
  const SUNDAY_1300 = new Date("2026-11-22T13:00:00Z");
  const MONDAY_1300 = new Date("2026-11-23T13:00:00Z");

  function seedPeriod(budgetId, expenses, month = "2026-11") {
    utils.__table.set(`BUDGET#${budgetId}|PERIOD#${month}`, {
      PK: `BUDGET#${budgetId}`, SK: `PERIOD#${month}`, budgetId, month,
      GSI2PK: `PERIOD#${month}`, GSI2SK: `BUDGET#${budgetId}`,
      groups: { income: [], savings: [], expenses },
    });
  }

  it("reads groups.expenses as the flat category array periods store", () => {
    const nudges = computeNudges({
      groups: { expenses: [{ name: "Dining", plannedAmount: 300, spentAmount: 290 }] },
    }, new Date("2026-11-10T13:00:00Z"));

    expect(nudges).toHaveLength(1);
    expect(nudges[0]).toMatchObject({ type: "overspend_pace", category: "Dining" });
  });

  it("writes NUDGE#<date> for each active member of a budget with a current-month period", async () => {
    await seedUser("user_a", { seededAt: MONDAY_1300 });
    utils.__table.set("BUDGET#budget_user_a|MEMBER#user_b", {
      PK: "BUDGET#budget_user_a", SK: "MEMBER#user_b", userId: "user_b", status: "active",
    });
    seedPeriod("budget_user_a", [{ name: "Dining", plannedAmount: 300, spentAmount: 290 }]);

    const result = await runDailyNudges(MONDAY_1300);

    expect(result).toMatchObject({ budgets: 1, nudgesWritten: 2, insightsSent: 0 });
    expect(utils.__table.get("USER#user_a|NUDGE#2026-11-23").nudges[0].category).toBe("Dining");
    expect(utils.__table.has("USER#user_b|NUDGE#2026-11-23")).toBe(true);
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  it("on Sundays sends the weekly insight, honoring each member's quiet hours in their zone", async () => {
    await seedUser("user_a", { seededAt: SUNDAY_1300 });
    // 13:00Z is 05:00 in Los Angeles: inside the default 22:00-08:00 quiet hours
    await seedUser("user_la", { timezone: "America/Los_Angeles", seededAt: SUNDAY_1300, budgetId: "budget_user_a" });
    seedPeriod("budget_user_a", [{ name: "Rent", plannedAmount: 1000, spentAmount: 0 }]);
    addTransaction("budget_user_a", "2026-11-20", "user_a");

    const result = await runDailyNudges(SUNDAY_1300);

    expect(result).toMatchObject({ insightsSent: 1, insightsSkipped: 1, nudgesWritten: 0 });
    expect(payloads()).toHaveLength(1);
    expect(payloads()[0]).toMatchObject({
      internalAction: "send",
      userId: "user_a",
      notification: { type: "weekly_insight", data: { transactionCount: 1, totalSpent: 12 } },
    });
  });
});
