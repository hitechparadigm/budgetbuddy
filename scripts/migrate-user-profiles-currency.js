#!/usr/bin/env node

/**
 * Migration Script: Add Currency to User Profiles
 *
 * This script migrates existing user profiles to include currency and locale fields.
 * All existing users will be set to USD currency with en-US locale.
 *
 * Usage:
 *   node scripts/migrate-user-profiles-currency.js [--dry-run] [--profile hitechparadigm]
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
const DEFAULT_LOCALE = "en-US";
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
 * Scan all user profiles from DynamoDB
 */
async function scanUserProfiles() {
  console.log(`📊 Scanning user profiles from table: ${TABLE_NAME}`);

  const profiles = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": "USER#",
        ":sk": "PROFILE",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);
    profiles.push(...(response.Items || []));
    lastEvaluatedKey = response.LastEvaluatedKey;

    console.log(`   Found ${profiles.length} profiles so far...`);
  } while (lastEvaluatedKey);

  console.log(`✅ Scan complete. Found ${profiles.length} user profiles.\n`);
  return profiles;
}

/**
 * Check if profile needs migration
 */
function needsMigration(profile) {
  return !profile.currency || !profile.locale;
}

/**
 * Migrate a single user profile
 */
async function migrateProfile(profile) {
  const updates = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Add currency if missing
  if (!profile.currency) {
    updates.push("#currency = :currency");
    expressionAttributeNames["#currency"] = "currency";
    expressionAttributeValues[":currency"] = DEFAULT_CURRENCY;
  }

  // Add locale if missing
  if (!profile.locale) {
    updates.push("#locale = :locale");
    expressionAttributeNames["#locale"] = "locale";
    expressionAttributeValues[":locale"] = DEFAULT_LOCALE;
  }

  // Add updatedAt timestamp
  updates.push("#updatedAt = :updatedAt");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();

  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would update profile ${profile.userId}:`);
    if (!profile.currency)
      console.log(`      - Add currency: ${DEFAULT_CURRENCY}`);
    if (!profile.locale) console.log(`      - Add locale: ${DEFAULT_LOCALE}`);
    return true;
  }

  try {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: profile.PK,
        SK: profile.SK,
      },
      UpdateExpression: `SET ${updates.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    await docClient.send(command);
    console.log(`   ✅ Migrated profile ${profile.userId}`);
    return true;
  } catch (error) {
    console.error(
      `   ❌ Error migrating profile ${profile.userId}:`,
      error.message,
    );
    return false;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log("🚀 Starting User Profile Currency Migration\n");
  console.log(`Configuration:`);
  console.log(`  - Table: ${TABLE_NAME}`);
  console.log(`  - Default Currency: ${DEFAULT_CURRENCY}`);
  console.log(`  - Default Locale: ${DEFAULT_LOCALE}`);
  console.log(`  - AWS Profile: ${AWS_PROFILE}`);
  console.log(
    `  - Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will update database)"}\n`,
  );

  try {
    // Scan all user profiles
    const profiles = await scanUserProfiles();
    stats.total = profiles.length;

    if (profiles.length === 0) {
      console.log("ℹ️  No user profiles found. Nothing to migrate.");
      return;
    }

    // Filter profiles that need migration
    const profilesToMigrate = profiles.filter(needsMigration);

    console.log(`📋 Migration Summary:`);
    console.log(`  - Total profiles: ${stats.total}`);
    console.log(`  - Need migration: ${profilesToMigrate.length}`);
    console.log(
      `  - Already migrated: ${stats.total - profilesToMigrate.length}\n`,
    );

    if (profilesToMigrate.length === 0) {
      console.log(
        "✅ All profiles already have currency and locale. Nothing to do.",
      );
      return;
    }

    // Migrate each profile
    console.log(`🔄 Migrating ${profilesToMigrate.length} profiles...\n`);

    for (const profile of profilesToMigrate) {
      const success = await migrateProfile(profile);
      if (success) {
        stats.migrated++;
      } else {
        stats.errors++;
      }
    }

    // Print final statistics
    console.log(`\n📊 Migration Complete!`);
    console.log(`  - Total profiles: ${stats.total}`);
    console.log(`  - Migrated: ${stats.migrated}`);
    console.log(`  - Errors: ${stats.errors}`);
    console.log(
      `  - Already had currency: ${stats.total - profilesToMigrate.length}`,
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
