/**
 * DynamoDB helper functions for auth-onboarding Lambda
 *
 * Provides simplified DynamoDB operations for the onboarding function.
 * These are extracted from the common utils layer to keep the function self-contained.
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB Document Client (singleton pattern)
let dynamoClient;
const getDynamoClient = () => {
  if (!dynamoClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
      maxAttempts: 3,
      requestTimeout: 5000,
    });

    dynamoClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
  }
  return dynamoClient;
};

/**
 * Get item by primary key
 * @param {string} pk - Partition key
 * @param {string} sk - Sort key
 * @returns {Promise<Object|null>} Item or null if not found
 */
async function getItem(pk, sk) {
  const client = getDynamoClient();
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      PK: pk,
      SK: sk,
    },
  });

  const result = await client.send(command);
  return result.Item || null;
}

/**
 * Put item into DynamoDB
 * @param {Object} item - Item to store
 * @returns {Promise<void>}
 */
async function putItem(item) {
  const client = getDynamoClient();
  const command = new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  await client.send(command);
}

module.exports = {
  getItem,
  putItem,
};
