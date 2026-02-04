/**
 * Test Email Templates Locally
 *
 * Tests email template generation without requiring AWS SES or LocalStack
 *
 * Usage:
 *   node scripts/test-email-templates.js invitation
 *   node scripts/test-email-templates.js removal
 *   node scripts/test-email-templates.js acceptance
 */

const {
  getInvitationEmailTemplate,
  getRemovalEmailTemplate,
  getAcceptanceEmailTemplate,
} = require("../backend/functions/email/templates");

const templateType = process.argv[2];

if (!templateType) {
  console.error("Usage: node scripts/test-email-templates.js <template-type>");
  console.error("Template types: invitation, removal, acceptance");
  process.exit(1);
}

/**
 * Test invitation email template
 */
function testInvitationTemplate() {
  console.log("🧪 Testing Invitation Email Template\n");

  const data = {
    invitedEmail: "spouse@example.com",
    inviterName: "John Doe",
    inviterEmail: "john@example.com",
    role: "Spouse",
    acceptUrl:
      "https://app.budgetbuddy.com/accept-invitation?token=abc123def456ghi789",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const { subject, html, text } = getInvitationEmailTemplate(data);

  console.log("📧 Email Subject:");
  console.log(`   ${subject}\n`);

  console.log("📝 Plain Text Version:");
  console.log(`   ${text.substring(0, 200)}...\n`);

  console.log("🎨 HTML Version:");
  console.log(`   ${html.substring(0, 300)}...\n`);

  console.log("✅ Template generated successfully!");
  console.log(`   Subject length: ${subject.length} characters`);
  console.log(`   HTML length: ${html.length} characters`);
  console.log(`   Text length: ${text.length} characters`);
}

/**
 * Test removal email template
 */
function testRemovalTemplate() {
  console.log("🧪 Testing Removal Email Template\n");

  const data = {
    memberEmail: "spouse@example.com",
    memberName: "Jane Doe",
    familyName: "John Doe",
    removedBy: "John Doe",
  };

  const { subject, html, text } = getRemovalEmailTemplate(data);

  console.log("📧 Email Subject:");
  console.log(`   ${subject}\n`);

  console.log("📝 Plain Text Version:");
  console.log(`   ${text.substring(0, 200)}...\n`);

  console.log("✅ Template generated successfully!");
  console.log(`   Subject length: ${subject.length} characters`);
  console.log(`   HTML length: ${html.length} characters`);
  console.log(`   Text length: ${text.length} characters`);
}

/**
 * Test acceptance email template
 */
function testAcceptanceTemplate() {
  console.log("🧪 Testing Acceptance Email Template\n");

  const data = {
    primaryEmail: "john@example.com",
    primaryName: "John Doe",
    memberName: "Jane Doe",
    memberEmail: "jane@example.com",
    role: "Spouse",
  };

  const { subject, html, text } = getAcceptanceEmailTemplate(data);

  console.log("📧 Email Subject:");
  console.log(`   ${subject}\n`);

  console.log("📝 Plain Text Version:");
  console.log(`   ${text.substring(0, 200)}...\n`);

  console.log("✅ Template generated successfully!");
  console.log(`   Subject length: ${subject.length} characters`);
  console.log(`   HTML length: ${html.length} characters`);
  console.log(`   Text length: ${text.length} characters`);
}

/**
 * Main test runner
 */
function runTest() {
  console.log("🚀 Email Template Testing\n");

  if (templateType === "invitation") {
    testInvitationTemplate();
  } else if (templateType === "removal") {
    testRemovalTemplate();
  } else if (templateType === "acceptance") {
    testAcceptanceTemplate();
  } else {
    console.error(
      "Unknown template type. Use: invitation, removal, acceptance",
    );
    process.exit(1);
  }
}

runTest();
