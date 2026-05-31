#!/usr/bin/env node

/**
 * Setup Plaid credentials in AWS Secrets Manager.
 *
 * Usage:
 *   PLAID_CLIENT_ID=xxx PLAID_SANDBOX_SECRET=yyy node scripts/setup-plaid-secrets.js
 *
 * For production (run separately, with caution):
 *   PLAID_CLIENT_ID=xxx PLAID_PROD_SECRET=yyy PLAID_ENV=production node scripts/setup-plaid-secrets.js
 *
 * Required env vars:
 *   PLAID_CLIENT_ID       - Your Plaid client ID
 *   PLAID_SANDBOX_SECRET  - Your Plaid sandbox secret
 *
 * Optional env vars:
 *   AWS_REGION            - AWS region (default: us-east-1)
 *   PLAID_ENV             - sandbox | development | production (default: sandbox)
 *   PLAID_PROD_SECRET     - Production secret (only used when PLAID_ENV=production)
 */

const {
  SecretsManagerClient,
  CreateSecretCommand,
  UpdateSecretCommand,
  DescribeSecretCommand,
} = require("@aws-sdk/client-secrets-manager");

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const PLAID_ENV = process.env.PLAID_ENV || "sandbox";

const SECRET_NAMES = {
  sandbox: "budgetbuddy/plaid/sandbox",
  development: "budgetbuddy/plaid/development",
  production: "budgetbuddy/plaid/production",
};

async function secretExists(client, secretName) {
  try {
    await client.send(new DescribeSecretCommand({ SecretId: secretName }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function main() {
  const clientId = process.env.PLAID_CLIENT_ID;

  if (!clientId) {
    console.error("❌ PLAID_CLIENT_ID environment variable is required");
    console.error(
      "   Usage: PLAID_CLIENT_ID=xxx PLAID_SANDBOX_SECRET=yyy node scripts/setup-plaid-secrets.js",
    );
    process.exit(1);
  }

  let plaidSecret;
  if (PLAID_ENV === "production") {
    plaidSecret = process.env.PLAID_PROD_SECRET;
    if (!plaidSecret) {
      console.error(
        "❌ PLAID_PROD_SECRET environment variable is required for production",
      );
      process.exit(1);
    }
    console.warn(
      "⚠️  WARNING: You are configuring PRODUCTION Plaid credentials.",
    );
    console.warn("   Ensure this is intentional and authorized.");
  } else {
    plaidSecret = process.env.PLAID_SANDBOX_SECRET;
    if (!plaidSecret) {
      console.error("❌ PLAID_SANDBOX_SECRET environment variable is required");
      console.error(
        "   Usage: PLAID_CLIENT_ID=xxx PLAID_SANDBOX_SECRET=yyy node scripts/setup-plaid-secrets.js",
      );
      process.exit(1);
    }
  }

  const secretName = SECRET_NAMES[PLAID_ENV];
  if (!secretName) {
    console.error(
      `❌ Unknown PLAID_ENV: ${PLAID_ENV}. Must be sandbox, development, or production.`,
    );
    process.exit(1);
  }

  const secretValue = JSON.stringify({
    client_id: clientId,
    secret: plaidSecret,
    environment: PLAID_ENV,
  });

  const client = new SecretsManagerClient({ region: AWS_REGION });

  console.log(`🔑 Setting up Plaid credentials for environment: ${PLAID_ENV}`);
  console.log(`   Secret name: ${secretName}`);
  console.log(`   AWS region: ${AWS_REGION}`);
  console.log(`   Client ID: ${clientId.substring(0, 8)}...`);

  try {
    const exists = await secretExists(client, secretName);

    if (exists) {
      console.log(`\n♻️  Updating existing secret: ${secretName}`);
      await client.send(
        new UpdateSecretCommand({
          SecretId: secretName,
          SecretString: secretValue,
          Description: `Plaid API credentials for ${PLAID_ENV} environment`,
        }),
      );
      console.log(`✅ Secret updated successfully: ${secretName}`);
    } else {
      console.log(`\n🆕 Creating new secret: ${secretName}`);
      await client.send(
        new CreateSecretCommand({
          Name: secretName,
          SecretString: secretValue,
          Description: `Plaid API credentials for ${PLAID_ENV} environment`,
          Tags: [
            { Key: "project", Value: "budgetbuddy" },
            { Key: "environment", Value: PLAID_ENV },
            { Key: "service", Value: "plaid" },
          ],
        }),
      );
      console.log(`✅ Secret created successfully: ${secretName}`);
    }

    console.log(`\n🎉 Plaid ${PLAID_ENV} credentials are ready.`);
    console.log(
      `   The Lambda function will read from: ${secretName}`,
    );

    if (PLAID_ENV === "sandbox") {
      console.log(`\n📋 Sandbox test credentials:`);
      console.log(`   Username: user_good`);
      console.log(`   Password: pass_good`);
      console.log(`   Phone/MFA: 415-555-0011 / 123456`);
      console.log(
        `\n   To create a test bank account without Plaid Link UI:`,
      );
      console.log(
        `   POST /plaid/sandbox/create-item  (uses Chase sandbox bank)`,
      );
    }
  } catch (error) {
    console.error(`\n❌ Failed to set up Plaid secret: ${error.message}`);
    if (error.name === "AccessDeniedException") {
      console.error(
        "   Ensure your AWS credentials have secretsmanager:CreateSecret and secretsmanager:UpdateSecret permissions.",
      );
    }
    process.exit(1);
  }
}

main();
