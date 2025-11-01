#!/usr/bin/env node

/**
 * Simple Development Deployment Script
 * Single command to deploy all infrastructure and functions
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting BudgetBuddy Development Deployment...\n');

try {
  // Change to infrastructure directory
  const infraDir = path.join(__dirname, '..', 'infrastructure');
  process.chdir(infraDir);

  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('🔨 Building infrastructure...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('☁️ Deploying to AWS (hitechparadigm profile)...');

  // Set AWS profile environment variable
  process.env.AWS_PROFILE = 'hitechparadigm';

  execSync('npx cdk deploy budgetbuddy-dev-api --require-approval never', {
    stdio: 'inherit',
    env: { ...process.env, AWS_PROFILE: 'hitechparadigm' }
  });

  console.log('\n✅ Deployment completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Test API: https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/transactions/health');
  console.log('   2. Start frontend: npm run dev:web');
  console.log('   3. Visit: http://localhost:5173/test/transactions');

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}
