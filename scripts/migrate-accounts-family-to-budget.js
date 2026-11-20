#!/usr/bin/env node

/**
 * Migration: copy account rows from the deprecated FAMILY# partition to BUDGET#
 *
 * backend/functions/accounts resolved a real budgetId and then stored it under
 * a `FAMILY#` prefix, so live rows are `FAMILY#<budgetId>/ACCOUNT#<id>` — the
 * right value behind the wrong prefix. The Lambda now keys on
 * `BUDGET#<budgetId>`, which makes those rows invisible until they are copied
 * forward.
 *
 * Safety properties, all deliberate:
 *   - DRY RUN BY DEFAULT. Writes happen only with an explicit `--apply`.
 *   - Idempotent. A target row that already exists is skipped, never
 *     overwritten, so the script is safe to re-run.
 *   - Non-destructive. The FAMILY# original is never deleted or modified.
 *     Deleting the originals is a separate, later decision.
 *   - Every item is logged in both modes.
 *
 * Usage:
 *   node scripts/migrate-accounts-family-to-budget.js            # dry run
 *   node scripts/migrate-accounts-family-to-budget.js --apply    # writes
 *
 * Environment:
 *   TABLE_NAME   DynamoDB table (default: budgetbuddy-main)
 *   AWS_REGION   region (default: us-east-1)
 *
 * Credentials come from the ambient AWS configuration. Run with the
 * hitechparadigm profile; the script prints the caller identity it resolved
 * and refuses to --apply against a table other than budgetbuddy-main.
 */

const {
  DynamoDBClient,
} = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
} = require('@aws-sdk/lib-dynamodb');
const { execFileSync } = require('child_process');

/**
 * Resolve the calling AWS identity, so --apply can refuse to write into an
 * account the operator did not mean to touch.
 *
 * Two sources, tried in order:
 *   1. `@aws-sdk/client-sts`, if it happens to be installed. It is not a
 *      declared dependency of this repo, so this is best-effort.
 *   2. The AWS CLI, which anyone running this script already needs: the
 *      documented invocation passes an AWS profile through the environment,
 *      and the CLI inherits the same environment as this process.
 *
 * A dry run degrades to a warning if neither resolves; `--apply` refuses.
 *
 * @returns {Promise<{Account?: string, Arn?: string}|null>}
 */
async function resolveCallerIdentity(region) {
  let sdkError;

  try {
    // eslint-disable-next-line global-require
    const sts = require('@aws-sdk/client-sts');
    return await new sts.STSClient({ region }).send(
      new sts.GetCallerIdentityCommand({}),
    );
  } catch (err) {
    // Fall through to the CLI on ANY SDK failure, not only a missing module.
    // The likeliest failure is credential resolution, and the documented way
    // to run this script passes an AWS profile through the environment, which
    // the CLI honours identically, so the present-but-unconfigured-SDK case
    // is exactly the one the fallback exists to cover. Only report a failure
    // when both sources fail.
    sdkError = err;
  }

  try {
    // Fixed argument vector and no shell: nothing here comes from input.
    const raw = execFileSync(
      'aws',
      ['sts', 'get-caller-identity', '--output', 'json', '--region', region],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 },
    );
    const parsed = JSON.parse(raw);
    return parsed && parsed.Account ? parsed : null;
  } catch (cliError) {
    const sdkDetail =
      sdkError && sdkError.code === 'MODULE_NOT_FOUND'
        ? '@aws-sdk/client-sts is not installed'
        : `SDK: ${sdkError ? sdkError.message : 'no result'}`;
    throw new Error(
      `could not resolve caller identity from either source (${sdkDetail}; ` +
        `AWS CLI: ${cliError.message})`,
    );
  }
}

const TABLE_NAME = process.env.TABLE_NAME || 'budgetbuddy-main';
const REGION = process.env.AWS_REGION || 'us-east-1';
const APPLY = process.argv.includes('--apply');

const SOURCE_PK_PREFIX = 'FAMILY#';
const TARGET_PK_PREFIX = 'BUDGET#';
const SK_PREFIX = 'ACCOUNT#';

/** The only table this script may write to. */
const ALLOWED_WRITE_TABLE = 'budgetbuddy-main';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

const stats = {
  scanned: 0,
  copied: 0,
  wouldCopy: 0,
  alreadyPresent: 0,
  skipped: 0,
  errors: 0,
};

const prefix = () => (APPLY ? '[APPLY]  ' : '[DRY RUN]');

/**
 * Build the BUDGET# copy of a FAMILY# account row.
 *
 * The budget id is the FAMILY# suffix: accounts were always keyed on a real
 * budgetId, only the prefix was wrong.
 */
function buildTargetItem(item, targetPK, budgetId) {
  const copy = { ...item };

  // Drop the deprecated prefix's artefacts. GSI1PK/GSI1SK carried
  // `FAMILY#<id>#ACCOUNTS`, which violates the documented GSI1 contract
  // (BUDGET#<budgetId> / USER#<userId>) and is read by nothing.
  delete copy.familyId;
  delete copy.GSI1PK;
  delete copy.GSI1SK;

  return {
    ...copy,
    PK: targetPK,
    budgetId,
    migratedFrom: item.PK,
    migratedAt: new Date().toISOString(),
  };
}

/** Paginated scan of every account row under a FAMILY# partition. */
async function scanFamilyAccounts() {
  const items = [];
  let lastEvaluatedKey;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :pk) AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': SOURCE_PK_PREFIX,
          ':sk': SK_PREFIX,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function printContext() {
  console.log('Accounts FAMILY# → BUDGET# migration');
  console.log(`  mode:    ${APPLY ? 'APPLY (writes copies)' : 'DRY RUN (no writes)'}`);
  console.log(`  table:   ${TABLE_NAME}`);
  console.log(`  region:  ${REGION}`);

  let identityKnown = false;
  try {
    const identity = await resolveCallerIdentity(REGION);
    if (identity) {
      console.log(`  account: ${identity.Account}`);
      console.log(`  caller:  ${identity.Arn}`);
      identityKnown = true;
    } else {
      console.warn('  account: unknown (caller identity could not be resolved)');
    }
  } catch (err) {
    console.warn(`  account: unknown (could not resolve caller identity — ${err.message})`);
  }

  console.log('');

  if (APPLY && !identityKnown) {
    console.error(
      'Refusing to --apply without a confirmed caller identity. Make the AWS ' +
        'CLI available on PATH (or install @aws-sdk/client-sts) and re-run; ' +
        'check with `aws sts get-caller-identity` first.',
    );
    process.exit(1);
  }
}

async function migrate() {
  await printContext();

  if (APPLY && TABLE_NAME !== ALLOWED_WRITE_TABLE) {
    console.error(
      `Refusing to --apply against table "${TABLE_NAME}". ` +
        `Only "${ALLOWED_WRITE_TABLE}" may be written.`,
    );
    process.exit(1);
  }

  const items = await scanFamilyAccounts();
  stats.scanned = items.length;
  console.log(`Scanned ${items.length} FAMILY#*/ACCOUNT#* row(s).\n`);

  for (const item of items) {
    const budgetId = item.PK.slice(SOURCE_PK_PREFIX.length);
    const targetPK = `${TARGET_PK_PREFIX}${budgetId}`;
    const label = `${item.PK}/${item.SK} → ${targetPK}/${item.SK}`;

    if (!budgetId) {
      stats.skipped += 1;
      console.warn(`${prefix()} skip (empty budget id): ${item.PK}/${item.SK}`);
      continue;
    }

    try {
      // Idempotency: an existing target is never overwritten, which is what
      // makes a re-run safe.
      const existing = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: targetPK, SK: item.SK },
        }),
      );

      if (existing.Item) {
        stats.alreadyPresent += 1;
        console.log(`${prefix()} already present, skipping: ${targetPK}/${item.SK}`);
        continue;
      }

      const target = buildTargetItem(item, targetPK, budgetId);

      if (!APPLY) {
        stats.wouldCopy += 1;
        console.log(`${prefix()} would copy ${label}`);
        continue;
      }

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: target,
          // Belt and braces: never clobber a concurrent write.
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );

      stats.copied += 1;
      console.log(`${prefix()} copied ${label}`);
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        stats.alreadyPresent += 1;
        console.log(`${prefix()} already present (race), skipping: ${targetPK}/${item.SK}`);
        continue;
      }
      stats.errors += 1;
      console.error(`${prefix()} ERROR on ${label}: ${err.message}`);
    }
  }

  console.log('\nSummary');
  console.log(`  scanned:         ${stats.scanned}`);
  if (APPLY) {
    console.log(`  copied:          ${stats.copied}`);
  } else {
    console.log(`  would copy:      ${stats.wouldCopy}`);
  }
  console.log(`  already present: ${stats.alreadyPresent}`);
  console.log(`  skipped:         ${stats.skipped}`);
  console.log(`  errors:          ${stats.errors}`);
  console.log('\nOriginal FAMILY# rows were not modified or deleted.');

  if (!APPLY && stats.wouldCopy > 0) {
    console.log('\nRe-run with --apply to write the copies.');
  }

  if (stats.errors > 0) process.exit(1);
}

migrate().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
