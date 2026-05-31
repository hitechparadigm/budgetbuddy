#!/usr/bin/env node

/**
 * Migration Script: Budget Model Redesign — Clear All Existing Data
 *
 * This is a one-time migration script that deletes all DynamoDB items and all
 * Cognito users before deploying the new Budget model. No production users exist,
 * so this is a clean-slate migration with no backward-compatibility concerns.
 *
 * Requirements: REQ-10
 *
 * Usage:
 *   node scripts/migrate-budget-model.js [--dry-run]
 *
 * Options:
 *   --dry-run   Count items and users without deleting anything
 *
 * Environment variables:
 *   DYNAMODB_TABLE_NAME   DynamoDB table to clear (default: budgetbuddy-dev)
 *   COGNITO_USER_POOL_ID  Cognito User Pool ID to clear (required)
 *   AWS_PROFILE           AWS profile to use (default: hitechparadigm)
 *
 * Example:
 *   COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX node scripts/migrate-budget-model.js --dry-run
 *   COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX node scripts/migrate-budget-model.js
 */

'use strict';

const { DynamoDBClient, ScanCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

// ─── Configuration ────────────────────────────────────────────────────────────

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'budgetbuddy-dev';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const REGION = 'us-east-1';
const DRY_RUN = process.argv.includes('--dry-run');
const DYNAMO_BATCH_SIZE = 25; // DynamoDB BatchWriteItem max

// AWS profile: set AWS_PROFILE env var before running, or rely on the default
// credential chain (instance profile, env vars, ~/.aws/credentials).
// Example: AWS_PROFILE=hitechparadigm node scripts/migrate-budget-model.js
const AWS_PROFILE = process.env.AWS_PROFILE || 'hitechparadigm';
if (!process.env.AWS_PROFILE) {
  process.env.AWS_PROFILE = AWS_PROFILE;
}

// ─── AWS Clients ──────────────────────────────────────────────────────────────

// Clients use the default credential chain, which respects AWS_PROFILE.
const dynamoClient = new DynamoDBClient({ region: REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

// ─── Statistics ───────────────────────────────────────────────────────────────

const stats = {
  dynamo: {
    scanned: 0,
    batches: 0,
    deleted: 0,
    errors: 0,
  },
  cognito: {
    listed: 0,
    deleted: 0,
    errors: 0,
  },
};

// ─── DynamoDB helpers ─────────────────────────────────────────────────────────

/**
 * Scan all items from the DynamoDB table, paginating through all pages.
 * Returns an array of raw DynamoDB items (AttributeValue format).
 *
 * @returns {Promise<Array<{PK: object, SK: object}>>}
 */
async function scanAllItems() {
  console.log(`\n📊 Scanning all items from table: ${TABLE_NAME}`);

  const items = [];
  let lastEvaluatedKey = undefined;
  let page = 0;

  do {
    page++;
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'PK, SK', // only fetch keys — we don't need attribute data
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await dynamoClient.send(command);
    const pageItems = response.Items || [];
    items.push(...pageItems);
    lastEvaluatedKey = response.LastEvaluatedKey;

    console.log(`   Page ${page}: ${pageItems.length} items (total so far: ${items.length})`);
  } while (lastEvaluatedKey);

  stats.dynamo.scanned = items.length;
  console.log(`✅ Scan complete. Total items found: ${items.length}`);
  return items;
}

/**
 * Split an array into chunks of the given size.
 *
 * @param {Array} arr
 * @param {number} size
 * @returns {Array[]}
 */
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Delete a batch of DynamoDB items using BatchWriteItem.
 * Each item must have PK and SK in AttributeValue format.
 *
 * @param {Array<{PK: object, SK: object}>} items
 * @returns {Promise<void>}
 */
async function deleteBatch(items) {
  const deleteRequests = items.map(item => ({
    DeleteRequest: {
      Key: {
        PK: item.PK,
        SK: item.SK,
      },
    },
  }));

  const command = new BatchWriteItemCommand({
    RequestItems: {
      [TABLE_NAME]: deleteRequests,
    },
  });

  const response = await dynamoClient.send(command);

  // Handle unprocessed items (DynamoDB may return some on throttle)
  const unprocessed = response.UnprocessedItems?.[TABLE_NAME] || [];
  if (unprocessed.length > 0) {
    console.warn(`   ⚠️  ${unprocessed.length} unprocessed items — retrying...`);
    // Simple single retry for unprocessed items
    const retryCommand = new BatchWriteItemCommand({
      RequestItems: { [TABLE_NAME]: unprocessed },
    });
    await dynamoClient.send(retryCommand);
  }
}

/**
 * Delete all DynamoDB items in batches of 25.
 *
 * @param {Array<{PK: object, SK: object}>} items
 * @returns {Promise<void>}
 */
async function deleteAllDynamoItems(items) {
  if (items.length === 0) {
    console.log('ℹ️  No DynamoDB items to delete.');
    return;
  }

  const batches = chunk(items, DYNAMO_BATCH_SIZE);
  console.log(`\n🗑️  Deleting ${items.length} items in ${batches.length} batches of up to ${DYNAMO_BATCH_SIZE}...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await deleteBatch(batch);
      stats.dynamo.batches++;
      stats.dynamo.deleted += batch.length;
      console.log(`   Batch ${i + 1}/${batches.length}: deleted ${batch.length} items (total deleted: ${stats.dynamo.deleted})`);
    } catch (err) {
      stats.dynamo.errors += batch.length;
      console.error(`   ❌ Batch ${i + 1}/${batches.length} failed: ${err.message}`);
    }
  }
}

// ─── Cognito helpers ──────────────────────────────────────────────────────────

/**
 * List all users in the Cognito User Pool, paginating through all pages.
 * Returns an array of user objects with at least a Username field.
 *
 * @returns {Promise<Array<{Username: string}>>}
 */
async function listAllCognitoUsers() {
  console.log(`\n👥 Listing all users from User Pool: ${USER_POOL_ID}`);

  const users = [];
  let paginationToken = undefined;
  let page = 0;

  do {
    page++;
    const command = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60, // max allowed by Cognito
      PaginationToken: paginationToken,
    });

    const response = await cognitoClient.send(command);
    const pageUsers = response.Users || [];
    users.push(...pageUsers);
    paginationToken = response.PaginationToken;

    console.log(`   Page ${page}: ${pageUsers.length} users (total so far: ${users.length})`);
  } while (paginationToken);

  stats.cognito.listed = users.length;
  console.log(`✅ List complete. Total users found: ${users.length}`);
  return users;
}

/**
 * Delete a single Cognito user by username.
 *
 * @param {string} username
 * @returns {Promise<void>}
 */
async function deleteCognitoUser(username) {
  const command = new AdminDeleteUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
  });
  await cognitoClient.send(command);
}

/**
 * Delete all Cognito users one by one (Cognito has no batch delete API).
 *
 * @param {Array<{Username: string}>} users
 * @returns {Promise<void>}
 */
async function deleteAllCognitoUsers(users) {
  if (users.length === 0) {
    console.log('ℹ️  No Cognito users to delete.');
    return;
  }

  console.log(`\n🗑️  Deleting ${users.length} Cognito users...`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      await deleteCognitoUser(user.Username);
      stats.cognito.deleted++;
      console.log(`   [${i + 1}/${users.length}] Deleted user: ${user.Username}`);
    } catch (err) {
      stats.cognito.errors++;
      console.error(`   ❌ [${i + 1}/${users.length}] Failed to delete ${user.Username}: ${err.message}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         Budget Model Redesign — Data Migration Script        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Configuration:');
  console.log(`  DynamoDB Table : ${TABLE_NAME}`);
  console.log(`  User Pool ID   : ${USER_POOL_ID || '(not set)'}`);
  console.log(`  AWS Profile    : ${process.env.AWS_PROFILE}`);
  console.log(`  Region         : ${REGION}`);
  console.log(`  Mode           : ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE (data will be permanently deleted)'}`);
  console.log();

  // Validate required config
  if (!USER_POOL_ID) {
    console.error('❌ COGNITO_USER_POOL_ID environment variable is required.');
    console.error('   Example: COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX node scripts/migrate-budget-model.js');
    process.exit(1);
  }

  if (!DRY_RUN) {
    console.log('⚠️  WARNING: This will PERMANENTLY DELETE all DynamoDB items and all Cognito users.');
    console.log('   This action cannot be undone. There are no production users, so this is safe.');
    console.log('   Press Ctrl+C within 5 seconds to cancel...');
    console.log();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // ── Step 1: DynamoDB ────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 1: DynamoDB — Clear all items');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dynamoItems = await scanAllItems();

  if (DRY_RUN) {
    const batchCount = Math.ceil(dynamoItems.length / DYNAMO_BATCH_SIZE);
    console.log(`\n[DRY RUN] Would delete ${dynamoItems.length} items in ${batchCount} batch(es) of up to ${DYNAMO_BATCH_SIZE}.`);
  } else {
    await deleteAllDynamoItems(dynamoItems);
  }

  // ── Step 2: Cognito ─────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2: Cognito — Delete all users');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const cognitoUsers = await listAllCognitoUsers();

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would delete ${cognitoUsers.length} Cognito user(s).`);
    if (cognitoUsers.length > 0) {
      console.log('   Users that would be deleted:');
      cognitoUsers.forEach((u, i) => console.log(`     ${i + 1}. ${u.Username}`));
    }
  } else {
    await deleteAllCognitoUsers(cognitoUsers);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Migration Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN complete — no data was modified.\n`);
    console.log(`  DynamoDB items scanned : ${stats.dynamo.scanned}`);
    console.log(`  DynamoDB items to delete: ${dynamoItems.length} (${Math.ceil(dynamoItems.length / DYNAMO_BATCH_SIZE)} batch(es))`);
    console.log(`  Cognito users to delete : ${cognitoUsers.length}`);
    console.log(`\n  Run without --dry-run to apply changes.`);
  } else {
    console.log(`\n✅ Migration complete.\n`);
    console.log('  DynamoDB:');
    console.log(`    Items scanned  : ${stats.dynamo.scanned}`);
    console.log(`    Batches run    : ${stats.dynamo.batches}`);
    console.log(`    Items deleted  : ${stats.dynamo.deleted}`);
    console.log(`    Errors         : ${stats.dynamo.errors}`);
    console.log('  Cognito:');
    console.log(`    Users listed   : ${stats.cognito.listed}`);
    console.log(`    Users deleted  : ${stats.cognito.deleted}`);
    console.log(`    Errors         : ${stats.cognito.errors}`);

    const hasErrors = stats.dynamo.errors > 0 || stats.cognito.errors > 0;
    if (hasErrors) {
      console.log('\n⚠️  Some items/users could not be deleted. Review errors above.');
      process.exit(1);
    } else {
      console.log('\n🚀 Ready to deploy the new Budget model.');
    }
  }
}

main().catch(err => {
  console.error('\n❌ Migration script failed with an unexpected error:');
  console.error(err);
  process.exit(1);
});
