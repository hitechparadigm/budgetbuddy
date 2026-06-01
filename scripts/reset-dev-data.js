/**
 * Dev Data Reset Script
 *
 * Deletes ALL user data from the dev environment:
 * - All Cognito users from the dev user pool
 * - All DynamoDB records with PK starting with USER#, BUDGET#, or FAMILY#
 *
 * SAFETY: Only runs against dev (budgetbuddy-main table, us-east-1_LAkOBLENO pool)
 * This is IRREVERSIBLE.
 */

const { execSync } = require('child_process');
const { DynamoDBClient, ScanCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');

const REGION = 'us-east-1';
const TABLE_NAME = 'budgetbuddy-main';
const USER_POOL_ID = 'us-east-1_LAkOBLENO';
const PROFILE = 'hitechparadigm';

// Use the AWS CLI profile via environment variable for the SDK
process.env.AWS_PROFILE = PROFILE;
process.env.AWS_REGION = REGION;

const dynamo = new DynamoDBClient({ region: REGION });

function runCli(cmd) {
  return JSON.parse(execSync(`aws ${cmd} --profile ${PROFILE} --region ${REGION} --output json`, { encoding: 'utf8' }));
}

async function scanAllItems() {
  const items = [];
  let lastKey;
  do {
    const params = {
      TableName: TABLE_NAME,
      ProjectionExpression: 'PK, SK',
    };
    if (lastKey) params.ExclusiveStartKey = lastKey;

    const resp = await dynamo.send(new ScanCommand(params));
    for (const item of resp.Items || []) {
      const pk = item.PK?.S || '';
      if (pk.startsWith('USER#') || pk.startsWith('BUDGET#') || pk.startsWith('FAMILY#')) {
        items.push({ PK: item.PK, SK: item.SK });
      }
    }
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function batchDelete(items) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    const requests = chunk.map(item => ({
      DeleteRequest: { Key: { PK: item.PK, SK: item.SK } }
    }));
    await dynamo.send(new BatchWriteItemCommand({
      RequestItems: { [TABLE_NAME]: requests }
    }));
    console.log(`  Deleted DynamoDB batch ${Math.floor(i / 25) + 1} (${chunk.length} items)`);
  }
}

async function deleteAllCognitoUsers() {
  const result = runCli(`cognito-idp list-users --user-pool-id ${USER_POOL_ID}`);
  const users = result.Users || [];
  console.log(`Found ${users.length} Cognito users`);

  for (const user of users) {
    execSync(`aws cognito-idp admin-delete-user --user-pool-id ${USER_POOL_ID} --username "${user.Username}" --profile ${PROFILE} --region ${REGION}`);
    const email = user.Attributes?.find(a => a.Name === 'email')?.Value || user.Username;
    console.log(`  Deleted Cognito user: ${email}`);
  }
}

async function main() {
  console.log('=== BudgetBuddy Dev Data Reset ===');
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`User Pool: ${USER_POOL_ID}`);
  console.log('');

  // Step 1: Scan DynamoDB
  console.log('Scanning DynamoDB for USER#, BUDGET#, FAMILY# records...');
  const items = await scanAllItems();
  console.log(`Found ${items.length} DynamoDB records to delete`);

  // Step 2: Delete DynamoDB records
  if (items.length > 0) {
    console.log('Deleting DynamoDB records...');
    await batchDelete(items);
    console.log(`✅ Deleted ${items.length} DynamoDB records`);
  } else {
    console.log('No DynamoDB records to delete');
  }

  // Step 3: Delete Cognito users
  console.log('');
  console.log('Deleting Cognito users...');
  await deleteAllCognitoUsers();
  console.log('✅ All Cognito users deleted');

  console.log('');
  console.log('✅ Dev environment reset complete. You can now register fresh.');
}

main().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
