#!/usr/bin/env node

/**
 * Revoke Pending Family Invitation Script
 *
 * This script revokes a pending family invitation by email address.
 * Use this when you need to send a new invitation to an email that already has a pending one.
 *
 * Usage:
 *   node scripts/revoke-invitation.js <email>
 *
 * Example:
 *   node scripts/revoke-invitation.js user@example.com
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

async function revokeInvitation(email) {
  try {
    console.log(`\nSearching for pending invitations for: ${email}`);

    // Query for pending invitations by email using GSI4
    const queryResult = await dynamodb.send(
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

    if (!queryResult.Items || queryResult.Items.length === 0) {
      console.log(`\n✓ No pending invitations found for ${email}`);
      return;
    }

    console.log(`\nFound ${queryResult.Items.length} pending invitation(s):`);

    // Revoke each pending invitation
    for (const invitation of queryResult.Items) {
      console.log(`\n  Invitation ID: ${invitation.invitationId}`);
      console.log(`  Family ID: ${invitation.familyId}`);
      console.log(`  Role: ${invitation.role}`);
      console.log(`  Created: ${invitation.createdAt}`);
      console.log(`  Expires: ${invitation.expiresAt}`);

      // Delete the invitation
      await dynamodb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: invitation.PK,
            SK: invitation.SK,
          },
        }),
      );

      console.log(`  ✓ Revoked invitation ${invitation.invitationId}`);
    }

    console.log(
      `\n✓ Successfully revoked all pending invitations for ${email}`,
    );
    console.log(`\nYou can now send a new invitation to this email address.`);
  } catch (error) {
    console.error("\n✗ Error revoking invitation:", error);
    process.exit(1);
  }
}

// Main execution
const email = process.argv[2];

if (!email) {
  console.error("\nUsage: node scripts/revoke-invitation.js <email>");
  console.error(
    "\nExample: node scripts/revoke-invitation.js user@example.com",
  );
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`\n✗ Invalid email format: ${email}`);
  process.exit(1);
}

revokeInvitation(email);
