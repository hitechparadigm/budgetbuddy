/**
 * Scheduled Backup Service
 *
 * Automatically creates backups of all user data on a schedule.
 * Triggered by EventBridge (CloudWatch Events) rules.
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

// Reused across warm invocations
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || "budgetbuddy-backups";
const BACKUP_RETENTION_DAYS = parseInt(
  process.env.BACKUP_RETENTION_DAYS || "30",
);

/**
 * Get all user profiles
 */
async function getAllUserProfiles() {
  const profiles = [];
  let lastEvaluatedKey = undefined;

  do {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": "USER#",
        ":sk": "PROFILE",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    };

    const result = await dynamodb.send(new ScanCommand(params));
    profiles.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return profiles;
}

/**
 * Get all budgets for a family
 */
async function getBudgetsForFamily(familyId) {
  const budgets = [];
  let lastEvaluatedKey = undefined;

  do {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :pk) AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `FAMILY#${familyId}`,
        ":sk": "BUDGET#",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    };

    const result = await dynamodb.send(new ScanCommand(params));
    budgets.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return budgets;
}

/**
 * Get all transactions for a family
 */
async function getTransactionsForFamily(familyId) {
  const transactions = [];
  let lastEvaluatedKey = undefined;

  do {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :pk) AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `FAMILY#${familyId}`,
        ":sk": "TRANSACTION#",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    };

    const result = await dynamodb.send(new ScanCommand(params));
    transactions.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return transactions;
}

/**
 * Generate backup data for a user
 */
function generateBackupData(userProfile, budgets, transactions) {
  return {
    version: "1.0.0",
    backupDate: new Date().toISOString(),
    application: "BudgetBuddy",
    backupType: "scheduled",
    data: {
      user: {
        userId: userProfile.userId,
        email: userProfile.email,
        familyId: userProfile.familyId,
        currency: userProfile.currency || "USD",
        locale: userProfile.locale || "en-US",
        onboardingCompleted: userProfile.onboardingCompleted || false,
        createdAt: userProfile.createdAt,
      },
      budgets: budgets.map((budget) => ({
        budgetId: budget.budgetId,
        month: budget.month,
        currency: budget.currency || "USD",
        categories: budget.categories || [],
        totalIncome: budget.totalIncome || 0,
        totalSavings: budget.totalSavings || 0,
        totalExpenses: budget.totalExpenses || 0,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      })),
      transactions: transactions.map((transaction) => ({
        transactionId: transaction.transactionId,
        date: transaction.date,
        category: transaction.category,
        description: transaction.description || "",
        amount: transaction.amount,
        currency: transaction.currency || "USD",
        type: transaction.type,
        budgetMonth: transaction.budgetMonth,
        createdAt: transaction.createdAt,
      })),
    },
    metadata: {
      totalBudgets: budgets.length,
      totalTransactions: transactions.length,
      dateRange: {
        earliest:
          transactions.length > 0
            ? transactions.reduce(
                (min, t) => (t.date < min ? t.date : min),
                transactions[0].date,
              )
            : null,
        latest:
          transactions.length > 0
            ? transactions.reduce(
                (max, t) => (t.date > max ? t.date : max),
                transactions[0].date,
              )
            : null,
      },
    },
  };
}

/**
 * Upload backup to S3
 */
async function uploadBackupToS3(userId, backupData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `backups/${userId}/${timestamp}.json`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: key,
      Body: JSON.stringify(backupData, null, 2),
      ContentType: "application/json",
      ServerSideEncryption: "AES256",
      Metadata: {
        userId,
        backupDate: backupData.backupDate,
        version: backupData.version,
      },
    }),
  );

  return key;
}

/**
 * Delete old backups beyond retention period
 */
async function cleanupOldBackups(userId) {
  const prefix = `backups/${userId}/`;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

  // List all backups for user
  const listResult = await s3.send(
    new ListObjectsV2Command({
      Bucket: BACKUP_BUCKET,
      Prefix: prefix,
    }),
  );

  const objectsToDelete = (listResult.Contents || [])
    .filter((obj) => obj.LastModified < cutoffDate)
    .map((obj) => ({ Key: obj.Key }));

  if (objectsToDelete.length > 0) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BACKUP_BUCKET,
        Delete: {
          Objects: objectsToDelete,
        },
      }),
    );

    console.log(
      `Deleted ${objectsToDelete.length} old backups for user ${userId}`,
    );
  }

  return objectsToDelete.length;
}

/**
 * Create backup for a single user
 */
async function backupUser(userProfile) {
  try {
    const userId = userProfile.userId;
    const familyId = userProfile.familyId;

    console.log(`Creating backup for user ${userId}...`);

    // Get all data for user
    const [budgets, transactions] = await Promise.all([
      getBudgetsForFamily(familyId),
      getTransactionsForFamily(familyId),
    ]);

    // Generate backup data
    const backupData = generateBackupData(userProfile, budgets, transactions);

    // Upload to S3
    const backupKey = await uploadBackupToS3(userId, backupData);

    // Cleanup old backups
    const deletedCount = await cleanupOldBackups(userId);

    console.log(`✅ Backup created for user ${userId}: ${backupKey}`);
    console.log(
      `   Budgets: ${budgets.length}, Transactions: ${transactions.length}`,
    );
    if (deletedCount > 0) {
      console.log(`   Cleaned up ${deletedCount} old backups`);
    }

    return {
      userId,
      success: true,
      backupKey,
      budgetCount: budgets.length,
      transactionCount: transactions.length,
      deletedOldBackups: deletedCount,
    };
  } catch (error) {
    console.error(`❌ Failed to backup user ${userProfile.userId}:`, error);
    return {
      userId: userProfile.userId,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log("🔄 Starting scheduled backup job...");
  console.log("Event:", JSON.stringify(event, null, 2));

  const startTime = Date.now();
  const results = {
    totalUsers: 0,
    successCount: 0,
    failureCount: 0,
    backups: [],
  };

  try {
    // Get all user profiles
    const userProfiles = await getAllUserProfiles();
    results.totalUsers = userProfiles.length;

    console.log(`Found ${userProfiles.length} users to backup`);

    // Create backups for all users (in batches to avoid timeouts)
    const BATCH_SIZE = 10;
    for (let i = 0; i < userProfiles.length; i += BATCH_SIZE) {
      const batch = userProfiles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((profile) => backupUser(profile)),
      );

      results.backups.push(...batchResults);
      results.successCount += batchResults.filter((r) => r.success).length;
      results.failureCount += batchResults.filter((r) => !r.success).length;

      console.log(
        `Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(userProfiles.length / BATCH_SIZE)}`,
      );
    }

    const duration = Date.now() - startTime;

    console.log("✅ Backup job complete!");
    console.log(`   Total users: ${results.totalUsers}`);
    console.log(`   Successful: ${results.successCount}`);
    console.log(`   Failed: ${results.failureCount}`);
    console.log(`   Duration: ${duration}ms`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Scheduled backup completed",
        ...results,
        duration,
      }),
    };
  } catch (error) {
    console.error("❌ Backup job failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Backup job failed",
        details: error.message,
        ...results,
      }),
    };
  }
};
