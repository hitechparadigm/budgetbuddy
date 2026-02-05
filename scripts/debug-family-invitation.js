/**
 * Debug Family Invitation Issues
 *
 * This script helps diagnose and fix family invitation problems:
 * - Check family member count
 * - List pending invitations
 * - Clean up stuck invitations
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "budgetbuddy-dev-main";

async function debugFamilyInvitation(userId) {
  console.log("\n🔍 Debugging Family Invitation for user:", userId);
  console.log("=".repeat(60));

  try {
    // 1. Get user profile to find familyId
    console.log("\n1️⃣  Getting user profile...");
    const userResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
        },
      }),
    );

    if (!userResult.Item) {
      console.log("❌ User not found");
      return;
    }

    const user = userResult.Item;
    const familyId = user.familyId;
    console.log("✅ User found:");
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Family ID: ${familyId}`);
    console.log(`   - Role: ${user.familyRole || "primary"}`);

    // 2. Get family metadata
    console.log("\n2️⃣  Getting family metadata...");
    const familyResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "METADATA",
        },
      }),
    );

    if (!familyResult.Item) {
      console.log(
        "⚠️  Family metadata not found (will be auto-created on invite)",
      );
    } else {
      const family = familyResult.Item;
      console.log("✅ Family metadata found:");
      console.log(`   - Member count: ${family.memberCount}`);
      console.log(`   - Primary user: ${family.primaryUserId}`);
      console.log(`   - Subscription: ${family.subscriptionTier}`);

      if (family.memberCount >= 2) {
        console.log("\n❌ ISSUE: Family is full (max 2 members)");
        console.log("   Cannot send more invitations until a member leaves");
      }
    }

    // 3. Get family members
    console.log("\n3️⃣  Getting family members...");
    const membersResult = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          "PK = :familyPK AND begins_with(SK, :memberPrefix)",
        ExpressionAttributeValues: {
          ":familyPK": `FAMILY#${familyId}`,
          ":memberPrefix": "MEMBER#",
        },
      }),
    );

    const members = membersResult.Items || [];
    console.log(`✅ Found ${members.length} member(s):`);
    for (const member of members) {
      console.log(`   - User ID: ${member.userId}`);
      console.log(`     Role: ${member.role}`);
      console.log(`     Joined: ${member.joinedAt}`);
    }

    // 4. Get pending invitations
    console.log("\n4️⃣  Getting pending invitations...");
    const invitationsResult = await dynamodb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          "begins_with(PK, :invPrefix) AND familyId = :familyId AND #status = :pending",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":invPrefix": "INVITATION#",
          ":familyId": familyId,
          ":pending": "pending",
        },
      }),
    );

    const invitations = invitationsResult.Items || [];
    console.log(`✅ Found ${invitations.length} pending invitation(s):`);
    for (const inv of invitations) {
      console.log(`   - Invitation ID: ${inv.invitationId}`);
      console.log(`     Email: ${inv.invitedEmail}`);
      console.log(`     Role: ${inv.role}`);
      console.log(`     Created: ${inv.createdAt}`);
      console.log(`     Expires: ${inv.expiresAt}`);

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(inv.expiresAt);
      if (now > expiresAt) {
        console.log(`     ⚠️  EXPIRED - can be cleaned up`);
      }
    }

    // 5. Summary and recommendations
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY:");
    console.log("=".repeat(60));

    const actualMemberCount = members.length;
    const metadataMemberCount = familyResult.Item?.memberCount || 0;

    if (actualMemberCount !== metadataMemberCount) {
      console.log(`⚠️  Member count mismatch:`);
      console.log(`   - Actual members: ${actualMemberCount}`);
      console.log(`   - Metadata count: ${metadataMemberCount}`);
      console.log(`   - This may cause invitation issues`);
    }

    if (actualMemberCount >= 2) {
      console.log("❌ Cannot send invitations: Family is full (2/2 members)");
    } else if (invitations.length > 0) {
      console.log(`⚠️  ${invitations.length} pending invitation(s) exist`);
      console.log("   - Cannot send duplicate invitations to same email");
      console.log("   - Use revoke or resend for existing invitations");
    } else {
      console.log("✅ Family can accept new invitations");
      console.log(`   - Current members: ${actualMemberCount}/2`);
      console.log(`   - Pending invitations: ${invitations.length}`);
    }

    // 6. Offer cleanup options
    if (invitations.length > 0) {
      console.log("\n💡 TO FIX:");
      console.log("   Option 1: Revoke pending invitations via UI");
      console.log("   Option 2: Run cleanup script:");
      console.log(`   node scripts/cleanup-family-invitations.js ${userId}`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  }
}

// Get userId from command line
const userId = process.argv[2];

if (!userId) {
  console.log("Usage: node scripts/debug-family-invitation.js <userId>");
  console.log("\nExample:");
  console.log(
    "  node scripts/debug-family-invitation.js 12345678-1234-1234-1234-123456789012",
  );
  process.exit(1);
}

debugFamilyInvitation(userId);
