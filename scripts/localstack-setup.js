/**
 * LocalStack Setup Script
 *
 * Initializes LocalStack with DynamoDB tables and test data
 * for local development and testing.
 */

const {
  DynamoDBClient,
  CreateTableCommand,
} = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

// LocalStack endpoint
const LOCALSTACK_ENDPOINT = "http://localhost:4566";

// Initialize DynamoDB client for LocalStack
const client = new DynamoDBClient({
  endpoint: LOCALSTACK_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
});

const dynamodb = DynamoDBDocumentClient.from(client);

/**
 * Create the main BudgetBuddy table with GSIs
 */
async function createMainTable() {
  console.log("📊 Creating budgetbuddy-main table...");

  const params = {
    TableName: "budgetbuddy-main",
    KeySchema: [
      { AttributeName: "PK", KeyType: "HASH" },
      { AttributeName: "SK", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "PK", AttributeType: "S" },
      { AttributeName: "SK", AttributeType: "S" },
      { AttributeName: "GSI1PK", AttributeType: "S" },
      { AttributeName: "GSI1SK", AttributeType: "S" },
      { AttributeName: "GSI2PK", AttributeType: "S" },
      { AttributeName: "GSI2SK", AttributeType: "S" },
      { AttributeName: "GSI3PK", AttributeType: "S" },
      { AttributeName: "GSI3SK", AttributeType: "S" },
      { AttributeName: "GSI4PK", AttributeType: "S" },
      { AttributeName: "GSI4SK", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          { AttributeName: "GSI1PK", KeyType: "HASH" },
          { AttributeName: "GSI1SK", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "GSI2",
        KeySchema: [
          { AttributeName: "GSI2PK", KeyType: "HASH" },
          { AttributeName: "GSI2SK", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "GSI3",
        KeySchema: [
          { AttributeName: "GSI3PK", KeyType: "HASH" },
          { AttributeName: "GSI3SK", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "GSI4",
        KeySchema: [
          { AttributeName: "GSI4PK", KeyType: "HASH" },
          { AttributeName: "GSI4SK", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  try {
    await client.send(new CreateTableCommand(params));
    console.log("✅ Table created successfully");
  } catch (error) {
    if (error.name === "ResourceInUseException") {
      console.log("ℹ️  Table already exists");
    } else {
      throw error;
    }
  }
}

/**
 * Seed test data for local development
 */
async function seedTestData() {
  console.log("🌱 Seeding test data...");

  const testUserId = "user_test_123";
  const testFamilyId = "family_user_test_123";

  // Create test user profile
  await dynamodb.send(
    new PutCommand({
      TableName: "budgetbuddy-main",
      Item: {
        PK: `USER#${testUserId}`,
        SK: "PROFILE",
        userId: testUserId,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        familyId: testFamilyId,
        familyRole: "primary",
        subscriptionTier: "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
  );

  // Create test family metadata
  await dynamodb.send(
    new PutCommand({
      TableName: "budgetbuddy-main",
      Item: {
        PK: `FAMILY#${testFamilyId}`,
        SK: "METADATA",
        familyId: testFamilyId,
        primaryUserId: testUserId,
        memberCount: 1,
        subscriptionTier: "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
  );

  // Create test family member record
  await dynamodb.send(
    new PutCommand({
      TableName: "budgetbuddy-main",
      Item: {
        PK: `FAMILY#${testFamilyId}`,
        SK: `MEMBER#${testUserId}`,
        userId: testUserId,
        role: "primary",
        joinedAt: new Date().toISOString(),
        addedBy: testUserId,
      },
    }),
  );

  console.log("✅ Test data seeded");
  console.log(`   Test User ID: ${testUserId}`);
  console.log(`   Test Family ID: ${testFamilyId}`);
}

/**
 * Main setup function
 */
async function setup() {
  console.log("🚀 Setting up LocalStack for BudgetBuddy...\n");

  try {
    await createMainTable();
    await seedTestData();

    console.log("\n✅ LocalStack setup complete!");
    console.log("\n📝 Next steps:");
    console.log("   1. Set AWS_ENDPOINT_URL=http://localhost:4566");
    console.log("   2. Set TABLE_NAME=budgetbuddy-main");
    console.log("   3. Run your Lambda functions locally");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

// Run setup
setup();
