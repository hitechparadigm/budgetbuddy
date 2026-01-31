#!/usr/bin/env node

/**
 * Migration Script: Add Currency to Budgets
 *
 * This script migrates existing budgets to include currency field.
 * All existing budgets will be set to USD currency.
 *
 * Usage:
 *   node scripts/migrate-budgets-currency.js [--dry-run] [--profile hitechparadigm]
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
 * Scan all budgets from DynamoDB
 */
async function scanBudgets() {
  console.log(`📊 Scanning budgets from table: ${TABLE_NAME}`);

  const budgets = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :pk) AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": "FAMILY#",
        ":sk": "BUDGET#",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);
    budgets.push(...(response.Items || []));
    lastEvaluatedKey = response.LastEvaluatedKey;

    console.log(`   Found ${budgets.length} budgets so far...`);
  } while (lastEvaluatedKey);

  console.log(`✅ Scan complete. Found ${budgets.length} budgets.\n`);
  return budgets;
}

/**
 * Check if budget needs migration
 */
function needsMigration(budget) {
  return !budget.currency;
}

/**
 * Migrate a single budget
 */
async function migrateBudget(budget) {
  if (DRY_RUN) {
    console.log(
      `   [DRY RUN] Would update budget ${budget.budgetId || budget.month}:`,
    );
    console.log(`      - Add currency: ${DEFAULT_CURRENCY}`);
    return true;
  }

  try {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: budget.PK,
        SK: budget.SK,
      },
      UpdateExpression: "SET #currency = :currency, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#currency": "currency",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":currency": DEFAULT_CURRENCY,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    });

    await docClient.send(command);
    console.log(
      `   ✅ Migrated budget ${budget.budgetId || budget.month} (${budget.PK})`,
    );
    return true;
  } catch (error) {
    console.error(
      `   ❌ Error migrating budget ${budget.budgetId || budget.month}:`,
      error.message,
    );
    return false;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log("🚀 Starting Budget Currency Migration\n");
  console.log(`Configuration:`);
  console.log(`  - Table: ${TABLE_NAME}`);
  console.log(`  - Default Currency: ${DEFAULT_CURRENCY}`);
  console.log(`  - AWS Profile: ${AWS_PROFILE}`);
  console.log(
    `  - Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will update database)"}\n`,
  );

  try {
    // Scan all budgets
    const budgets = await scanBudgets();
    stats.total = budgets.length;

    if (budgets.length === 0) {
      console.log("ℹ️  No budgets found. Nothing to migrate.");
      return;
    }

    // Filter budgets that need migration
    const budgetsToMigrate = budgets.filter(needsMigration);

    console.log(`📋 Migration Summary:`);
    console.log(`  - Total budgets: ${stats.total}`);
    console.log(`  - Need migration: ${budgetsToMigrate.length}`);
    console.log(
      `  - Already migrated: ${stats.total - budgetsToMigrate.length}\n`,
    );

    if (budgetsToMigrate.length === 0) {
      console.log("✅ All budgets already have currency. Nothing to do.");
      return;
    }

    // Migrate each budget
    console.log(`🔄 Migrating ${budgetsToMigrate.length} budgets...\n`);

    for (const budget of budgetsToMigrate) {
      const success = await migrateBudget(budget);
      if (success) {
        stats.migrated++;
      } else {
        stats.errors++;
      }
    }

    // Print final statistics
    console.log(`\n📊 Migration Complete!`);
    console.log(`  - Total budgets: ${stats.total}`);
    console.log(`  - Migrated: ${stats.migrated}`);
    console.log(`  - Errors: ${stats.errors}`);
    console.log(
      `  - Already had currency: ${stats.total - budgetsToMigrate.length}`,
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
