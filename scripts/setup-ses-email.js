/**
 * Setup AWS SES Email Verification
 *
 * This script helps verify email addresses in AWS SES sandbox mode
 */

const {
  SESv2Client,
  CreateEmailIdentityCommand,
  ListEmailIdentitiesCommand,
} = require("@aws-sdk/client-sesv2");

const ses = new SESv2Client({ region: "us-east-1" });

async function listVerifiedEmails() {
  console.log("\n📧 Listing verified email identities...\n");

  try {
    const result = await ses.send(new ListEmailIdentitiesCommand({}));

    if (result.EmailIdentities.length === 0) {
      console.log("❌ No verified email identities found");
      console.log("\n⚠️  AWS SES is in SANDBOX MODE");
      console.log("   You can only send emails to verified addresses");
      return [];
    }

    console.log(
      `✅ Found ${result.EmailIdentities.length} verified email(s):\n`,
    );
    for (const identity of result.EmailIdentities) {
      console.log(`   - ${identity.IdentityName} (${identity.IdentityType})`);
    }

    return result.EmailIdentities;
  } catch (error) {
    console.error("❌ Error listing emails:", error.message);
    return [];
  }
}

async function verifyEmail(email) {
  console.log(`\n📧 Verifying email: ${email}...\n`);

  try {
    await ses.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: email,
      }),
    );

    console.log(`✅ Verification email sent to: ${email}`);
    console.log("\n📬 NEXT STEPS:");
    console.log(`   1. Check inbox for ${email}`);
    console.log("   2. Click the verification link in the email");
    console.log("   3. Wait a few minutes for verification to complete");
    console.log("   4. Run this script again to confirm verification");
  } catch (error) {
    if (error.name === "AlreadyExistsException") {
      console.log(`⚠️  Email ${email} is already registered`);
      console.log("   Check if verification email was sent previously");
    } else {
      console.error("❌ Error verifying email:", error.message);
    }
  }
}

async function checkSandboxStatus() {
  console.log("\n🔍 Checking AWS SES account status...\n");

  try {
    const { GetAccountCommand } = require("@aws-sdk/client-sesv2");
    const result = await ses.send(new GetAccountCommand({}));

    if (result.ProductionAccessEnabled) {
      console.log("✅ SES is in PRODUCTION mode");
      console.log("   You can send emails to any address");
    } else {
      console.log("⚠️  SES is in SANDBOX mode");
      console.log("   You can only send to verified email addresses");
      console.log("\n💡 To request production access:");
      console.log("   1. Go to AWS Console → SES → Account dashboard");
      console.log("   2. Click 'Request production access'");
      console.log("   3. Fill out the form (usually approved in 24 hours)");
    }

    console.log(
      `\n📊 Send quota: ${result.SendQuota.Max24HourSend} emails/day`,
    );
    console.log(`   Send rate: ${result.SendQuota.MaxSendRate} emails/second`);
    console.log(`   Sent today: ${result.SendQuota.SentLast24Hours} emails`);
  } catch (error) {
    console.error("❌ Error checking account:", error.message);
  }
}

async function main() {
  const command = process.argv[2];
  const email = process.argv[3];

  console.log("\n" + "=".repeat(60));
  console.log("📧 AWS SES Email Verification Tool");
  console.log("=".repeat(60));

  if (command === "list") {
    await checkSandboxStatus();
    await listVerifiedEmails();
  } else if (command === "verify" && email) {
    await verifyEmail(email);
  } else if (command === "setup") {
    // Setup common emails for BudgetBuddy
    console.log("\n🚀 Setting up BudgetBuddy email identities...\n");

    await checkSandboxStatus();
    console.log("\n" + "-".repeat(60));

    // Verify sender email
    const senderEmail = email || "noreply@budgetbuddy.com";
    await verifyEmail(senderEmail);

    console.log("\n" + "-".repeat(60));
    console.log("\n💡 For testing, also verify recipient emails:");
    console.log(
      "   node scripts/setup-ses-email.js verify your-test-email@example.com",
    );
  } else {
    console.log("\nUsage:");
    console.log("  node scripts/setup-ses-email.js list");
    console.log("  node scripts/setup-ses-email.js verify <email>");
    console.log("  node scripts/setup-ses-email.js setup [sender-email]");
    console.log("\nExamples:");
    console.log("  node scripts/setup-ses-email.js list");
    console.log("  node scripts/setup-ses-email.js verify dima.pmp@gmail.com");
    console.log(
      "  node scripts/setup-ses-email.js setup noreply@budgetbuddy.com",
    );
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

main();
