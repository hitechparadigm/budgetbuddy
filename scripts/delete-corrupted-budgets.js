/**
 * Delete Corrupted Budgets Script
 *
 * This script deletes all budgets from DynamoDB to fix data structure issues.
 * Run this when budgets have the wrong format and are causing errors.
 *
 * Usage: node scripts/delete-corrupted-budgets.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// Configuration
const TABLE_NAME = 'budgetbuddy-dev-main';
const REGION = 'us-east-1';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function deleteBudgetsForFamily(familyId) {
  console.log(`\n🔍 Searching for budgets for family: ${familyId}`);

  try {
    // Query all items for this family
    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `FAMILY#${familyId}`
      }
    };

    const queryResult = await docClient.send(new QueryCommand(queryParams));
    const items = queryResult.Items || [];

    console.log(`📊 Found ${items.length} total items for family`);

    // Filter for budget items only
    const budgets = items.filter(item => item.entityType === 'BUDGET');
    console.log(`💰 Found ${budgets.length} budget(s) to delete`);

    if (budgets.length === 0) {
      console.log('✅ No budgets to delete');
      return;
    }

    // Delete each budget
    let deletedCount = 0;
    for (const budget of budgets) {
      try {
        const deleteParams = {
          TableName: TABLE_NAME,
          Key: {
            PK: budget.PK,
            SK: budget.SK
          }
        };

        await docClient.send(new DeleteCommand(deleteParams));
        console.log(`  ✓ Deleted budget for month: ${budget.month}`);
        deletedCount++;
      } catch (error) {
        console.error(`  ✗ Failed to delete budget ${budget.month}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} of ${budgets.length} budgets`);

  } catch (error) {
    console.error('❌ Error querying/deleting budgets:', error);
    throw error;
  }
}

async function main() {
  console.log('🗑️  Delete Corrupted Budgets Script');
  console.log('=====================================\n');

  // Get family ID from command line or use default
  const familyId = process.argv[2] || 'family_mock_user_id';

  console.log(`Target Family ID: ${familyId}`);
  console.log(`DynamoDB Table: ${TABLE_NAME}`);
  console.log(`Region: ${REGION}`);

  // Confirm before proceeding
  console.log('\n⚠️  WARNING: This will delete ALL budgets for this family!');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  await deleteBudgetsForFamily(familyId);

  console.log('\n✨ Done! You can now create fresh budgets through the app.');
  console.log('💡 Remember to also run: localStorage.clear() in browser console\n');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
