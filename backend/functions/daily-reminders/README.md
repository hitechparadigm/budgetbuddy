# Daily Reminders Lambda

Sends each user at most one "log today's spending / add your receipts" reminder per local day, at
the whole hour they chose, and runs the daily spending nudges. Rewritten in Wave 3 phase 1 (1.15.4);
design: Wave 3 design section 3 (D3).

## Triggers

| Rule (`infrastructure/lib/notification-stack.ts`) | Schedule | Event | Work |
|---|---|---|---|
| `DailyRemindersRule` | `cron(0 * * * ? *)` (hourly) | EventBridge scheduled event | Hourly reminders |
| `DailyNudgesRule` | `cron(0 13 * * ? *)` | `{ "mode": "daily-nudges" }` | Spending nudges; Sundays also the weekly insight |

`{ "healthCheck": true }` returns `{ statusCode: 200, body: '{"status":"healthy"}' }` before any read.

## Hourly reminders

1. Query GSI3 `GSI3PK = REMINDER#<HH>` for the current UTC hour (paginated, no Scan, no
   FilterExpression). Only `USER#<userId>/NOTIFICATION_PREFERENCES` items carry GSI3 keys; they are
   written by `upsertReminderPreferences` in the common layer `reminder-preferences.js`.
2. For each due user (at most 4 at a time): skip if reminders are off, if the user's local hour is
   not the `reminderTime` hour, or if `lastReminderDate` is already today's local date.
3. Read `PROFILE.defaultBudgetId`; skip if the user recorded a transaction that local day (GSI1
   `BUDGET#<id>` / `DATE#<localDate>`, matched on `createdBy`).
4. Claim the day with a conditional `UpdateItem` that sets `lastReminderDate`, then invoke the
   notifications function asynchronously with `{ internalAction: 'send', userId, notification }`.
   A failed send keeps the claim (at most once) and emits `ReminderSendFailed` in
   `BudgetBuddy/Reminders`.
5. Re-bucket every user read to tomorrow's UTC hour (DST and time-zone changes), conditioned on
   the `GSI3PK` the run read.

Defaults: on, `reminderTime` `19:00`, `timezone` `UTC` until the client reports one. Quiet hours do
not apply to this reminder. One summary log line per run: `due`, `sent`, `skipped` by reason,
`failed`, `rebucketed`. Bill reminders run in `bills-scheduler` (08:00 UTC). The monthly kickoff
email is off (no SES grant, no verified sender).

## Daily nudges (13:00 UTC)

Finds current-month periods through GSI2 `PERIOD#<YYYY-MM>`, computes up to 3 spending-pace nudges
per budget from the period's flat `groups.expenses` array, and writes `NUDGE#<date>` records (7-day
TTL) for each active member. On Sundays each member also gets the weekly insight (GSI1 `DATE#`
range), unless their `weeklyInsights` preference is `false` or they are in quiet hours in their own
time zone. Periods written without GSI2 keys are not found yet.

## Environment and IAM

- `TABLE_NAME`, `NOTIFICATION_FUNCTION_ARN` (set by the stack).
- `grantReadData` on the table (covers the GSI queries), `dynamodb:PutItem` (nudge records),
  `dynamodb:UpdateItem` on the table ARN only (claim and re-bucket), `lambda:InvokeFunction` on the
  notifications function. Common layer only.

## Backfill

Existing preferences items get their GSI3 keys from `scripts/backfill-reminder-index.js`: dry run by
default, `--apply` to write, idempotent. Run it once after the phase 1 deploy.

## Tests

`handler.test.js` (health, GSI3 query, nudge mode, query failure), `reminders.test.js` (due-user
decisions, claim, re-bucket), `batchProcessing.test.js`. Run with
`npx --no-install jest --ci --runInBand` in this directory.
