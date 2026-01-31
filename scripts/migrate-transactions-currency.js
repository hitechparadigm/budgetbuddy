#!/usr/bin/env node

/**
 * Migration Script: Add Currency to Transactions
 *
 * This script migrates existing transactions to include currency field.
 * All existing transactions will be set to USD currency.
 *
 * Usage:
 *   node scripts/migrate-transactions-currency.js [--dry-run] [--profile hitechparadigm]
 *
 * Options:
 *   --dry-run: Preview changes without applying them
 *   --profile: AWS profile to use (default: hitechparadigm)
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

// Configuration
const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-dev-main";
const DEFAULT_CURRENCY = "USD";
const AWS_PROFILE = process.argv.includes("--profile")
  ? process.argv[process.argv.indexOf("--profile") + 1]
  : "hitechparadigm";
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 25; // DynamoDB batch write limit

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: "us-east-1",
  credentials: process.env.AWS_PROFILE
    ? undefined
    : {
        profile: AWS_PROFILE,
      },
});

const docClient = DynamoDBDocumentClient.from(client);

// Statistics
const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
};

/**
 * Scan all transactions from DynamoDB
 */
async function scanTransactions() {
  console.log(`📊 Scanning transactions from table: ${TABLE_NAME}`);

  const transactions = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :pk) AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": "FAMILY#",
        ":sk": "TRANSACTION#",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);
    transactions.push(...(response.Items || []));
    lastEvaluatedKey = response.LastEvaluatedKey;

    console.log(`   Found ${transactions.length} transactions so far...`);
  } while (lastEvaluatedKey);

  console.log(`✅ Scan complete. Found ${transactions.length} transactions.\n`);
  return transactions;
}

/**
 * Check if transaction needs migration
 */
function needsMigration(transaction) {
  return !transaction.currency;
}

/**
 * Migrate a single transaction
 */
async function migrateTransaction(transaction) {
  if (DRY_RUN) {
    console.log(
      `   [DRY RUN] Would update transaction ${transaction.transactionId}:`,
    );
    console.log(`      - Add currency: ${DEFAULT_CURRENCY}`);
    return true;
  }

  try {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: transaction.PK,
        SK: transaction.SK,
      },
      UpdateExpression: "SET #currency = :currency",
      ExpressionAttributeNames: {
        "#currency": "currency",
      },
      ExpressionAttributeValues: {
        ":currency": DEFAULT_CURRENCY,
      },
      ReturnValues: "ALL_NEW",
    });

    await docClient.send(command);
    return true;
  } catch (error) {
    console.error(
      `   ❌ Error migrating transaction ${transaction.transactionId}:`,
      error.message,
    );
    return false;
  }
}

/**
 * Migrate transactions in batches
 */
async function migrateBatch(transactions, batchNumber, totalBatches) {
  console.log(
    `\n🔄 Processing batch ${batchNumber}/${totalBatches} (${transactions.length} transactions)...`,
  );

  let batchMigrated = 0;
  let batchErrors = 0;

  for (const transaction of transactions) {
    const success = await migrateTransaction(transaction);
    if (success) {
      batchMigrated++;
      stats.migrated++;
    } else {
      batchErrors++;
      stats.errors++;
    }
  }

  console.log(
    `   ✅ Batch ${batchNumber} complete: ${batchMigrated} migrated, ${batchErrors} errors`,
  );
}

/**
 * Main migration function
 */
async function migrate() {
  console.log("🚀 Starting Transaction Currency Migration\n");
  console.log(`Configuration:`);
  console.log(`  - Table: ${TABLE_NAME}`);
  console.log(`  - Default Currency: ${DEFAULT_CURRENCY}`);
  console.log(`  - AWS Profile: ${AWS_PROFILE}`);
  console.log(`  - Batch Size: ${BATCH_SIZE}`);
  console.log(
    `  - Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will update database)"}\n`,
  );

  try {
    // Scan all transactions
    const transactions = await scanTransactions();
    stats.total = transactions.length;

    if (transactions.length === 0) {
      console.log("ℹ️  No transactions found. Nothing to migrate.");
      return;
    }

    // Filter transactions that need migration
    const transactionsToMigrate = transactions.filter(needsMigration);

    console.log(`📋 Migration Summary:`);
    console.log(`  - Total transactions: ${stats.total}`);
    console.log(`  - Need migration: ${transactionsToMigrate.length}`);
    console.log(
      `  - Already migrated: ${stats.total - transactionsToMigrate.length}\n`,
    );

    if (transactionsToMigrate.length === 0) {
      console.log("✅ All transactions already have currency. Nothing to do.");
      return;
    }

    // Split into batches
    const batches = [];
    for (let i = 0; i < transactionsToMigrate.length; i += BATCH_SIZE) {
      batches.push(transactionsToMigrate.slice(i, i + BATCH_SIZE));
    }

    console.log(
      `🔄 Migrating ${transactionsToMigrate.length} transactions in ${batches.length} batches...\n`,
    );

    // Migrate each batch
    for (let i = 0; i < batches.length; i++) {
      await migrateBatch(batches[i], i + 1, batches.length);

      // Small delay between batches to avoid throttling
      if (i < batches.length - 1 && !DRY_RUN) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Print final statistics
    console.log(`\n📊 Migration Complete!`);
    console.log(`  - Total transactions: ${stats.total}`);
    console.log(`  - Migrated: ${stats.migrated}`);
    console.log(`  - Errors: ${stats.errors}`);
    console.log(
      `  - Already had currency: ${stats.total - transactionsToMigrate.length}`,
    );

    if (DRY_RUN) {
      console.log(`\n⚠️  This was a DRY RUN. No changes were made.`);
      console.log(`   Run without --dry-run to apply changes.`);
    } else {
      console.log(`\n✅ Migration successful!`);
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrate();
