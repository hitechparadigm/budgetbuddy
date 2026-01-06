#!/usr/bin/env node

/**
 * Enhanced CI/CD Monitor for Continuous Development
 *
 * Monitors GitHub Actions and provides detailed status for Kiro automation
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const WORKFLOW_NAME = "deploy-dev.yml";
const STATUS_FILE = path.join(__dirname, "../.kiro/cicd-status/latest.json");
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 30000; // 30 seconds

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix =
    {
      info: "📊",
      success: "✅",
      error: "❌",
      warning: "⚠️",
      progress: "⏳",
    }[type] || "ℹ️";

  console.log(`${prefix} [${timestamp}] ${message}`);
}

function ensureStatusDirectory() {
  const dir = path.dirname(STATUS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function checkGitHubCLI() {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch {
    log("GitHub CLI (gh) is not installed or not in PATH", "error");
    log("Install from: https://cli.github.com/", "info");
    return false;
  }
}

function getLatestWorkflowRun() {
  try {
    const result = execSync(
      `gh run list --workflow=${WORKFLOW_NAME} --limit=1 --json status,conclusion,databaseId,createdAt,headBranch,event,displayTitle,url`,
      { encoding: "utf-8" }
    );

    const runs = JSON.parse(result);
    return runs.length > 0 ? runs[0] : null;
  } catch (error) {
    log(`Error fetching workflow runs: ${error.message}`, "error");
    return null;
  }
}

function getFailureLogs(runId) {
  try {
    log(`Fetching failure logs for run ${runId}...`, "progress");
    const logs = execSync(`gh run view ${runId} --log-failed`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return logs;
  } catch (error) {
    return `Error fetching logs: ${error.message}`;
  }
}

function saveStatus(status) {
  ensureStatusDirectory();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function waitForCompletion(runId, maxWaitTime = 600000) {
  // 10 minutes max
  const startTime = Date.now();
  const pollInterval = 30000; // 30 seconds

  log(`Monitoring workflow run ${runId} for completion...`, "progress");

  while (Date.now() - startTime < maxWaitTime) {
    const run = getLatestWorkflowRun();

    if (!run || run.databaseId !== runId) {
      log("Workflow run not found or changed", "warning");
      return null;
    }

    if (run.status === "completed") {
      return run;
    }

    log(`Workflow still running... (${run.status})`, "progress");

    // Sleep for poll interval
    execSync(
      `powershell -Command "Start-Sleep -Seconds ${pollInterval / 1000}"`,
      { stdio: "ignore" }
    );
  }

  log("Timeout waiting for workflow completion", "warning");
  return null;
}

function analyzeFailure(logs) {
  const commonIssues = [
    {
      pattern: /npm ERR!/i,
      type: "npm_error",
      description: "NPM dependency or installation error",
    },
    {
      pattern: /TypeScript error/i,
      type: "typescript_error",
      description: "TypeScript compilation error",
    },
    {
      pattern: /Test failed/i,
      type: "test_failure",
      description: "Unit or integration test failure",
    },
    {
      pattern: /AWS/i,
      type: "aws_error",
      description: "AWS deployment or configuration error",
    },
    {
      pattern: /Permission denied/i,
      type: "permission_error",
      description: "File or system permission error",
    },
  ];

  const detectedIssues = commonIssues.filter((issue) =>
    issue.pattern.test(logs)
  );

  return {
    issues: detectedIssues,
    rawLogs: logs,
    summary:
      detectedIssues.length > 0
        ? `Detected ${detectedIssues.length} issue(s): ${detectedIssues
            .map((i) => i.description)
            .join(", ")}`
        : "No specific issues detected in logs",
  };
}

function main() {
  log("Starting enhanced CI/CD monitoring...", "info");

  if (!checkGitHubCLI()) {
    process.exit(1);
  }

  const run = getLatestWorkflowRun();

  if (!run) {
    log("No workflow runs found", "warning");
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
    url:
      run.url ||
      `https://github.com/hitechparadigm/budgetbuddy/actions/runs/${run.databaseId}`,
  };

  log(`Workflow: ${WORKFLOW_NAME}`, "info");
  log(`Run ID: ${run.databaseId}`, "info");
  log(`Branch: ${run.headBranch}`, "info");
  log(`Status: ${run.status}`, "info");
  log(`URL: ${status.url}`, "info");

  if (run.status === "in_progress" || run.status === "queued") {
    log("Workflow is running, waiting for completion...", "progress");
    const completedRun = waitForCompletion(run.databaseId);

    if (completedRun) {
      status.status = completedRun.status;
      status.conclusion = completedRun.conclusion;
    }
  }

  if (status.status === "completed") {
    if (status.conclusion === "success") {
      log("CI/CD Pipeline: SUCCESS", "success");
      log("Deployment completed successfully!", "success");

      status.success = true;
      saveStatus(status);

      process.exit(0);
    } else if (status.conclusion === "failure") {
      log("CI/CD Pipeline: FAILED", "error");

      const logs = getFailureLogs(run.databaseId);
      const analysis = analyzeFailure(logs);

      status.success = false;
      status.failureLogs = logs;
      status.analysis = analysis;

      log(`Failure Analysis: ${analysis.summary}`, "error");

      saveStatus(status);

      // Output structured failure information for Kiro
      console.log("\n--- FAILURE ANALYSIS FOR KIRO ---");
      console.log(
        JSON.stringify(
          {
            type: "cicd_failure",
            runId: run.databaseId,
            analysis: analysis,
            actionRequired: true,
            suggestedFixes: analysis.issues.map((issue) => ({
              type: issue.type,
              description: issue.description,
            })),
          },
          null,
          2
        )
      );
      console.log("--- END FAILURE ANALYSIS ---\n");

      process.exit(1);
    } else {
      log(`CI/CD Status: ${status.conclusion}`, "warning");
      status.success = false;
      saveStatus(status);
      process.exit(0);
    }
  } else {
    log(`CI/CD Status: ${status.status}`, "progress");
    status.success = null; // Still running
    saveStatus(status);
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, analyzeFailure, waitForCompletion };
