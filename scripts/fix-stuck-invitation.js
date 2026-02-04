/**
 * Fix Stuck Family Invitation
 *
 * Removes a pending invitation that was created but email failed to send
 *
 * Usage:
 *   node scripts/fix-stuck-invitation.js <email>
 *
 * Example:
 *   node scripts/fix-stuck-invitation.js spouse@example.com
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/fix-stuck-invitation.js <email>");
  console.error(
    "Example: node scripts/fix-stuck-invitation.js spouse@example.com",
  );
  process.exit(1);
}

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const dynamodb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";

async function fixStuckInvitation() {
  console.log(`🔍 Searching for pending invitations for: ${email}\n`);

  try {
    // Query for pending invitations by email
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI4",
        KeyConditionExpression: "GSI4PK = :email",
        FilterExpression: "#status = :pending",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":email": `INVITATION#${email.toLowerCase()}`,
          ":pending": "pending",
        },
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      console.log("✅ No pending invitations found for this email.");
      console.log("   You can send a new invitation now.");
      return;
    }

    console.log(`📧 Found ${result.Items.length} pending invitation(s):\n`);

    for (const invitation of result.Items) {
      console.log(`   Invitation ID: ${invitation.invitationId}`);
      console.log(`   Family ID: ${invitation.familyId}`);
      console.log(`   Role: ${invitation.role}`);
      console.log(`   Created: ${invitation.createdAt}`);
      console.log(`   Expires: ${invitation.expiresAt}`);
      console.log();

      // Delete the invitation
      console.log(`🗑️  Deleting invitation ${invitation.invitationId}...`);

      await dynamodb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: invitation.PK,
            SK: invitation.SK,
          },
        }),
      );

      console.log("✅ Invitation deleted successfully!\n");
    }

    console.log("🎉 All pending invitations removed!");
    console.log("   You can now send a new invitation to this email.");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixStuckInvitation();
