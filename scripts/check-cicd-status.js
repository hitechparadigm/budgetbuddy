#!/usr/bin/env node

/**
 * CI/CD Status Checker for Kiro Integration
 *
 * Checks the latest GitHub Actions workflow run and reports status.
 * Can be triggered by Kiro hooks to automatically monitor deployments.
 *
 * Usage:
 *   node scripts/check-cicd-status.js
 *
 * Exit codes:
 *   0 - Success or running
 *   1 - Failure detected
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKFLOW_NAME = 'deploy-dev.yml';
const STATUS_FILE = path.join(__dirname, '../.kiro/cicd-status/latest.json');

function ensureStatusDirectory() {
  const dir = path.dirname(STATUS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('❌ GitHub CLI (gh) is not installed or not in PATH');
    console.error('Install from: https://cli.github.com/');
    return false;
  }
}

function getLatestWorkflowRun() {
  try {
    const result = execSync(
      `gh run list --workflow=${WORKFLOW_NAME} --limit=1 --json status,conclusion,databaseId,createdAt,headBranch,event,displayTitle`,
      { encoding: 'utf-8' }
    );

    const runs = JSON.parse(result);
    return runs.length > 0 ? runs[0] : null;
  } catch (error) {
    console.error('❌ Error fetching workflow runs:', error.message);
    return null;
  }
}

function getFailureLogs(runId) {
  try {
    const logs = execSync(
      `gh run view ${runId} --log-failed`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return logs;
  } catch (error) {
    return `Error fetching logs: ${error.message}`;
  }
}

function saveStatus(status) {
  ensureStatusDirectory();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function main() {
  console.log('🔍 Checking CI/CD status...\n');

  if (!checkGitHubCLI()) {
    process.exit(1);
  }

  const run = getLatestWorkflowRun();

  if (!run) {
    console.log('ℹ️  No workflow runs found');
    process.exit(0);
  }

  const status = {
    runId: run.databaseId,
    status: run.status,
    conclusion: run.conclusion,
    branch: run.headBranch,
    event: run.event,
    title: run.displayTitle,
    createdAt: run.createdAt,
    checkedAt: new Date().toISOString(),
    url: `https://github.com/hitechparadigm/budgetbuddy/actions/runs/${run.databaseId}`
  };

  saveStatus(status);

  console.log(`📊 Workflow: ${WORKFLOW_NAME}`);
  console.log(`🔢 Run ID: ${run.databaseId}`);
  console.log(`🌿 Branch: ${run.headBranch}`);
  console.log(`📝 Title: ${run.displayTitle}`);
  console.log(`⏰ Created: ${new Date(run.createdAt).toLocaleString()}`);
  console.log(`🔗 URL: ${status.url}\n`);

  if (run.status === 'completed') {
    if (run.conclusion === 'success') {
      console.log('✅ CI/CD Status: SUCCESS');
      console.log('🎉 Deployment completed successfully!\n');
      process.exit(0);
    } else if (run.conclusion === 'failure') {
      console.log('❌ CI/CD Status: FAILED');
      console.log('🔍 Fetching failure logs...\n');

      const logs = getFailureLogs(run.databaseId);
      console.log('📋 Failed Job Logs:');
      console.log('─'.repeat(80));
      console.log(logs);
      console.log('─'.repeat(80));

      status.failureLogs = logs;
      saveStatus(status);

      console.log('\n💡 Kiro can help fix this! The error details have been saved.');
      console.log(`📁 Status file: ${STATUS_FILE}\n`);

      process.exit(1);
    } else {
      console.log(`⚠️  CI/CD Status: ${run.conclusion.toUpperCase()}`);
      process.exit(0);
    }
  } else {
    console.log(`⏳ CI/CD Status: ${run.status.toUpperCase()}`);
    console.log('⏱️  Workflow is still running...\n');
    process.exit(0);
  }
}

main();
