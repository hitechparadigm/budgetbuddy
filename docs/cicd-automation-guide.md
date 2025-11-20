# CI/CD Automation Guide

## Overview

This document describes two critical automation mechanisms implemented in the BudgetBuddy project to ensure code quality, documentation accuracy, and deployment reliability:

1. **Mandatory Documentation Updates on Push** - Git hook that enforces documentation updates before code can be pushed
2. **CI/CD Deployment Monitoring** - Kiro hook that monitors GitHub Actions workflows and alerts on failures

---

## Table of Contents

- [1. Mandatory Documentation Updates](#1-mandatory-documentation-updates)
  - [Architecture](#architecture)
  - [Implementation Details](#implementation-details)
  - [Workflow Diagram](#workflow-diagram)
  - [Configuration](#configuration)
- [2. CI/CD Deployment Monitoring](#2-cicd-deployment-monitoring)
  - [Architecture](#architecture-1)
  - [Implementation Details](#implementation-details-1)
  - [Workflow Diagram](#workflow-diagram-1)
  - [Configuration](#configuration-1)
- [3. Integration & Usage](#3-integration--usage)
- [4. Troubleshooting](#4-troubleshooting)

---

## 1. Mandatory Documentation Updates

### Purpose

Ensures that all documentation files remain current and accurate by enforcing updates before any code is pushed to GitHub. This prevents documentation drift and maintains project knowledge consistency.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Workflow                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  git push origin │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Git Pre-Push Hook                             │
│                  (.githooks/pre-push)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Check Required Files Exist                                   │
│     ├─ CHANGELOG.md                                              │
│     ├─ DEVELOPMENT_LOG.md                                        │
│     ├─ README.md                                                 │
│     ├─ docs/development-status.md                                │
│     └─ docs/api-endpoints.md                                     │
│                                                                   │
│  2. Check File Freshness (< 2 hours old)                         │
│                                                                   │
│  3. Display Mandatory Checklist                                  │
│     ├─ CHANGELOG updates                                         │
│     ├─ DEVELOPMENT_LOG updates                                   │
│     ├─ README updates                                            │
│     ├─ Development status updates                                │
│     ├─ Duplication review                                        │
│     └─ Code documentation review                                 │
│                                                                   │
│  4. Require User Confirmation                                    │
│                                                                   │
│  5. Verify Actual Updates (min 3 files)                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │   APPROVED   │    │   BLOCKED    │
            │  Push Proceeds│    │ Push Rejected│
            └──────────────┘    └──────────────┘
```

### Implementation Details

#### File Location
```
.githooks/pre-push
```

#### Required Documentation Files

The hook enforces updates to these critical files:

1. **CHANGELOG.md** - Version history and feature tracking
2. **DEVELOPMENT_LOG.md** - Detailed session logs and lessons learned
3. **README.md** - Project overview and quick start
4. **docs/development-status.md** - Current progress and task tracking
5. **docs/api-endpoints.md** - API documentation

#### Enforcement Rules

**File Existence Check**
```bash
REQUIRED_DOCS=("CHANGELOG.md" "DEVELOPMENT_LOG.md" "README.md"
               "docs/development-status.md" "docs/api-endpoints.md")

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        MISSING_DOCS+=("$doc")
    fi
done
```

**Freshness Check** (Files must be modified within 2 hours)
```bash
CURRENT_TIME=$(date +%s)
TWO_HOURS=7200

check_file_age() {
    local file=$1
    local file_time=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null)
    local age=$((CURRENT_TIME - file_time))

    if [ $age -gt $TWO_HOURS ]; then
        return 1
    fi
    return 0
}
```

**Verification Check** (Minimum 3 files must be updated)
```bash
if [ ${#RECENT_DOCS[@]} -lt 3 ]; then
    echo "❌ VERIFICATION FAILED: Insufficient documentation updates"
    exit 1
fi
```

#### Mandatory Checklist

The hook displays a comprehensive checklist that developers must complete:

**1. CHANGELOG.md Updates**
- Add new version entry with today's date (YYYY-MM-DD format)
- List ALL features added with detailed descriptions
- Document ALL issues fixed with root cause and resolution steps
- Record lessons learned with specific guidance
- Update progress metrics with exact percentages
- Include testing results and verification steps

**2. DEVELOPMENT_LOG.md Updates**
- Add complete session accomplishments with timestamps
- Document ALL issues encountered with detailed resolution
- Record lessons learned with context
- Update progress metrics for all components
- Include time impact analysis for major issues

**3. README.md Updates**
- Update project status phase and current focus
- Update overall progress percentage
- Update recent achievements section
- Verify ALL links and commands work
- Update 'What's Working' section

**4. docs/development-status.md Updates**
- Mark completed tasks and update progress
- Update completion percentages
- Update 'What's Working' vs 'What's Missing'
- Add recent fixes and accomplishments
- Update next priorities

**5. Duplication & Obsolete Content Review**
- Review ALL files for duplicate information
- Remove or consolidate redundant content
- Update obsolete information
- Ensure consistency across documents
- Verify status indicators match

**6. Codebase Documentation Review**
- Review code comments for accuracy
- Update JSDoc comments
- Remove obsolete TODO comments
- Ensure API docs match implementation
- Update configuration file comments

### Workflow Diagram

```
Developer Makes Changes
         │
         ▼
    git add .
         │
         ▼
  git commit -m "..."
         │
         ▼
  git push origin <branch>
         │
         ▼
┌────────────────────────┐
│  Pre-Push Hook Fires   │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐     NO      ┌──────────────────┐
│ All Required Files     ├────────────►│  Push Blocked    │
│ Exist?                 │             │  Create Files    │
└────────────────────────┘             └──────────────────┘
         │ YES
         ▼
┌────────────────────────┐     NO      ┌──────────────────┐
│ Files Updated Within   ├────────────►│  Warning Shown   │
│ 2 Hours?               │             │  (Continue)      │
└────────────────────────┘             └──────────────────┘
         │ YES/Continue
         ▼
┌────────────────────────┐
│ Display Mandatory      │
│ Checklist (6 sections) │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐     NO      ┌──────────────────┐
│ User Confirms          ├────────────►│  Push Blocked    │
│ Completion? (y/n)      │             │  Update Docs     │
└────────────────────────┘             └──────────────────┘
         │ YES
         ▼
┌────────────────────────┐     NO      ┌──────────────────┐
│ At Least 3 Files       ├────────────►│  Push Blocked    │
│ Actually Updated?      │             │  Verify Updates  │
└────────────────────────┘             └──────────────────┘
         │ YES
         ▼
┌────────────────────────┐
│  ✅ Push Proceeds      │
│  to GitHub             │
└────────────────────────┘
```

### Configuration

#### Installation

The pre-push hook is installed automatically via Husky:

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

#### Manual Installation

If needed, install manually:

```bash
# Make the hook executable
chmod +x .githooks/pre-push

# Link to git hooks directory
git config core.hooksPath .githooks
```

#### Customization

To modify the freshness requirement (default: 2 hours):

```bash
# In .githooks/pre-push, change:
TWO_HOURS=7200  # Change to desired seconds
```

To modify required files:

```bash
# In .githooks/pre-push, modify:
REQUIRED_DOCS=("CHANGELOG.md" "DEVELOPMENT_LOG.md" "README.md"
               "docs/development-status.md" "docs/api-endpoints.md")
```

---

## 2. CI/CD Deployment Monitoring

### Purpose

Automatically monitors GitHub Actions workflow runs and alerts developers when deployments fail, providing immediate access to failure logs and enabling quick resolution through AI assistance.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
│                   (.github/workflows/deploy-dev.yml)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Jobs:                                                            │
│  1. pre-deployment-checks                                        │
│     ├─ Linting                                                   │
│     ├─ Unit Tests                                                │
│     └─ CDK Synthesis                                             │
│                                                                   │
│  2. deploy-infrastructure                                        │
│     ├─ Deploy Database Stack                                     │
│     ├─ Deploy Auth Stack                                         │
│     ├─ Deploy API Stack                                          │
│     ├─ Deploy Hosting Stack                                      │
│     └─ Deploy Monitoring Stack                                   │
│                                                                   │
│  3. health-checks                                                │
│     ├─ CloudFormation Stack Status                               │
│     ├─ API Endpoint Tests                                        │
│     └─ Service Health Checks                                     │
│                                                                   │
│  4. deployment-notification                                      │
│     └─ Generate Summary                                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kiro Hook Monitoring                          │
│              (.kiro/hooks/monitor-cicd-pipeline)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Trigger: Manual Button Click or Scheduled                       │
│                                                                   │
│  Action: Execute check-cicd-status.js                            │
│                                                                   │
│  Script Flow:                                                    │
│  1. Check GitHub CLI availability                                │
│  2. Fetch latest workflow run via gh CLI                         │
│  3. Parse run status and conclusion                              │
│  4. If failed: Fetch failure logs                                │
│  5. Save status to .kiro/cicd-status/latest.json                 │
│  6. Exit with appropriate code                                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │  Exit Code 0 │    │  Exit Code 1 │
            │  (Success)   │    │  (Failure)   │
            └──────────────┘    └──────────────┘
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │  No Action   │    │ Kiro Alerted │
            │              │    │ with Logs    │
            └──────────────┘    └──────────────┘
                                        │
                                        ▼
                                ┌──────────────┐
                                │  AI Analysis │
                                │  & Fix       │
                                └──────────────┘
```

### Implementation Details

#### Components

**1. Kiro Hook Configuration**
```json
{
  "enabled": true,
  "name": "Monitor CI/CD Pipeline",
  "description": "Automatically check GitHub Actions status and fix failures",
  "version": "1",
  "when": {
    "type": "userTriggered"
  },
  "then": {
    "type": "runCommand",
    "command": "node scripts/check-cicd-status.js"
  }
}
```

**2. Status Checker Script** (`scripts/check-cicd-status.js`)

Key Functions:

```javascript
// Check if GitHub CLI is installed
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('❌ GitHub CLI (gh) is not installed');
    return false;
  }
}

// Fetch latest workflow run
function getLatestWorkflowRun() {
  const result = execSync(
    `gh run list --workflow=${WORKFLOW_NAME} --limit=1 --json status,conclusion,databaseId,createdAt,headBranch,event,displayTitle`,
    { encoding: 'utf-8' }
  );

  const runs = JSON.parse(result);
  return runs.length > 0 ? runs[0] : null;
}

// Get failure logs if deployment failed
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

// Save status for Kiro to read
function saveStatus(status) {
  ensureStatusDirectory();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}
```

**3. Status File Format** (`.kiro/cicd-status/latest.json`)

```json
{
  "runId": 19523469599,
  "status": "completed",
  "conclusion": "success",
  "branch": "develop",
  "event": "push",
  "title": "fix: Install dependencies before running unit tests",
  "createdAt": "2025-11-19T21:33:38Z",
  "checkedAt": "2025-11-19T21:45:12.345Z",
  "url": "https://github.com/hitechparadigm/budgetbuddy/actions/runs/19523469599",
  "failureLogs": "... (only present on failure)"
}
```

#### Exit Codes

The script uses exit codes to trigger Kiro alerts:

- **Exit 0**: Success or workflow still running (no alert)
- **Exit 1**: Failure detected (triggers Kiro alert with logs)

```javascript
if (run.conclusion === 'success') {
  console.log('✅ CI/CD Status: SUCCESS');
  process.exit(0);  // No alert
} else if (run.conclusion === 'failure') {
  console.log('❌ CI/CD Status: FAILED');
  // Fetch and save logs
  process.exit(1);  // Triggers Kiro alert
}
```

### Workflow Diagram

```
Developer Pushes Code
         │
         ▼
┌────────────────────────┐
│  GitHub Actions        │
│  Workflow Triggered    │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Pre-Deployment Checks │
│  - Lint                │
│  - Test                │
│  - Build               │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Deploy Infrastructure │
│  - Database            │
│  - Auth                │
│  - API                 │
│  - Hosting             │
│  - Monitoring          │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Health Checks         │
│  - Stack Status        │
│  - API Tests           │
│  - Service Health      │
└────────────────────────┘
         │
         ▼
    Deployment Complete
         │
         ▼
┌────────────────────────┐
│  Developer Clicks      │
│  "Monitor CI/CD"       │
│  Button in Kiro        │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  check-cicd-status.js  │
│  Executes              │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Fetch Latest Run      │
│  via GitHub CLI        │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐     SUCCESS     ┌──────────────────┐
│  Check Run Status      ├────────────────►│  Display Success │
│                        │                  │  Exit Code 0     │
└────────────────────────┘                  └──────────────────┘
         │ FAILURE
         ▼
┌────────────────────────┐
│  Fetch Failure Logs    │
│  via gh run view       │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Save Status + Logs    │
│  to latest.json        │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Exit Code 1           │
│  (Triggers Kiro Alert) │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Kiro Receives Alert   │
│  "CI/CD pipeline has   │
│  failed. Please read   │
│  status file..."       │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Kiro Reads Logs       │
│  Analyzes Failure      │
│  Suggests Fixes        │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Developer Applies Fix │
│  Pushes Again          │
└────────────────────────┘
```

### Configuration

#### Prerequisites

1. **GitHub CLI Installation**

```bash
# Windows (using winget)
winget install --id GitHub.cli

# macOS
brew install gh

# Linux
sudo apt install gh
```

2. **GitHub CLI Authentication**

```bash
gh auth login
```

#### Kiro Hook Setup

The hook is already configured at `.kiro/hooks/monitor-cicd-pipeline.kiro.hook`.

To modify the trigger type, edit the hook file:

```json
{
  "when": {
    "type": "userTriggered"  // Options: userTriggered, onAgentComplete, onFileSave
  }
}
```

#### Script Configuration

Modify `scripts/check-cicd-status.js` to change:

**Workflow Name**
```javascript
const WORKFLOW_NAME = 'deploy-dev.yml';  // Change to your workflow file
```

**Status File Location**
```javascript
const STATUS_FILE = path.join(__dirname, '../.kiro/cicd-status/latest.json');
```

**Repository URL** (for status links)
```javascript
url: `https://github.com/hitechparadigm/budgetbuddy/actions/runs/${run.databaseId}`
```

---

## 3. Integration & Usage

### Complete Development Workflow

```
1. Developer makes code changes
         │
         ▼
2. git add . && git commit -m "..."
         │
         ▼
3. git push origin develop
         │
         ▼
4. Pre-Push Hook Enforces Documentation
   ├─ Check files exist
   ├─ Check freshness
   ├─ Display checklist
   ├─ Require confirmation
   └─ Verify updates
         │
         ▼
5. Push Proceeds to GitHub
         │
         ▼
6. GitHub Actions Workflow Triggers
   ├─ Pre-deployment checks
   ├─ Deploy infrastructure
   ├─ Health checks
   └─ Notification
         │
         ▼
7. Developer Monitors via Kiro
   ├─ Click "Monitor CI/CD Pipeline" button
   ├─ Script checks latest run
   └─ Reports status
         │
         ▼
8. If Failure Detected
   ├─ Kiro receives alert with logs
   ├─ AI analyzes failure
   ├─ Suggests fixes
   └─ Developer applies fix
```

### Daily Usage Examples

**Scenario 1: Successful Deployment**

```bash
# 1. Make changes
vim backend/functions/transactions/index.js

# 2. Commit
git add .
git commit -m "feat: Add transaction filtering"

# 3. Push (hook enforces docs)
git push origin develop
# ✅ Documentation check passed

# 4. Wait for deployment (or continue working)

# 5. Check status in Kiro
# Click "Monitor CI/CD Pipeline" button
# Output: ✅ CI/CD Status: SUCCESS
```

**Scenario 2: Failed Deployment**

```bash
# 1-3. Same as above

# 4. Deployment fails

# 5. Check status in Kiro
# Click "Monitor CI/CD Pipeline" button
# Output: ❌ CI/CD Status: FAILED
# Kiro Alert: "The CI/CD pipeline has failed..."

# 6. Kiro reads .kiro/cicd-status/latest.json
# 7. Kiro analyzes logs and suggests fix
# 8. Apply fix and push again
```

### Automation Options

**Option 1: Manual Monitoring** (Current Setup)
- Click button when needed
- Full control over when to check

**Option 2: Automatic After Each Session**
```json
{
  "when": {
    "type": "onAgentComplete"
  }
}
```

**Option 3: On Every File Save**
```json
{
  "when": {
    "type": "onFileSave",
    "filePatterns": ["**/*.js", "**/*.ts"]
  }
}
```

---

## 4. Troubleshooting

### Pre-Push Hook Issues

**Problem: Hook not executing**
```bash
# Solution: Check hook permissions
chmod +x .githooks/pre-push

# Verify git hooks path
git config core.hooksPath
# Should output: .githooks
```

**Problem: Hook blocks push incorrectly**
```bash
# Check file timestamps
ls -la CHANGELOG.md DEVELOPMENT_LOG.md README.md

# Verify at least 3 files were updated recently
stat -c %Y CHANGELOG.md  # Linux
stat -f %m CHANGELOG.md  # macOS
```

**Problem: Need to bypass hook temporarily**
```bash
# NOT RECOMMENDED, but possible in emergencies
git push --no-verify
```

### CI/CD Monitoring Issues

**Problem: GitHub CLI not found**
```bash
# Install GitHub CLI
winget install --id GitHub.cli  # Windows
brew install gh                  # macOS

# Verify installation
gh --version

# Authenticate
gh auth login
```

**Problem: Script can't fetch workflow runs**
```bash
# Check authentication
gh auth status

# Test manually
gh run list --workflow=deploy-dev.yml --limit=1

# Check repository access
gh repo view
```

**Problem: Status file not created**
```bash
# Check directory exists
ls -la .kiro/cicd-status/

# Create manually if needed
mkdir -p .kiro/cicd-status

# Check permissions
ls -ld .kiro/cicd-status
```

**Problem: Kiro not receiving alerts**
```bash
# Verify hook configuration
cat .kiro/hooks/monitor-cicd-pipeline.kiro.hook

# Test script manually
node scripts/check-cicd-status.js
echo $?  # Should be 0 for success, 1 for failure

# Check Kiro hook is enabled
# Look for "enabled": true in hook file
```

### GitHub Actions Workflow Issues

**Problem: Workflow not triggering**
```yaml
# Check trigger configuration in .github/workflows/deploy-dev.yml
on:
  push:
    branches: [develop]  # Ensure your branch is listed
```

**Problem: Deployment fails at specific step**
```bash
# View logs via CLI
gh run view <run-id> --log

# View logs via web
# Click URL from check-cicd-status.js output
```

**Problem: AWS credentials invalid**
```bash
# Verify secrets in GitHub
gh secret list

# Required secrets:
# - HITECHPARADIGM_AWS_ACCESS_KEY_ID
# - HITECHPARADIGM_AWS_SECRET_ACCESS_KEY
```

---

## Appendix

### File Locations Reference

```
budgetbuddy/
├── .github/
│   └── workflows/
│       └── deploy-dev.yml          # GitHub Actions workflow
├── .githooks/
│   └── pre-push                    # Pre-push documentation hook
├── .kiro/
│   ├── hooks/
│   │   └── monitor-cicd-pipeline.kiro.hook  # Kiro hook config
│   └── cicd-status/
│       └── latest.json             # Status file (generated)
├── scripts/
│   ├── check-cicd-status.js        # CI/CD monitoring script
│   └── update-docs.js              # Documentation helper
└── docs/
    └── cicd-automation-guide.md    # This document
```

### Command Reference

**Git Hooks**
```bash
# Install hooks
git config core.hooksPath .githooks

# Make executable
chmod +x .githooks/pre-push

# Test hook
.githooks/pre-push
```

**GitHub CLI**
```bash
# List workflow runs
gh run list --workflow=deploy-dev.yml

# View specific run
gh run view <run-id>

# View failed logs
gh run view <run-id> --log-failed

# Watch run in real-time
gh run watch <run-id>
```

**Kiro Hooks**
```bash
# Run monitoring script manually
node scripts/check-cicd-status.js

# Check exit code
echo $?  # 0 = success, 1 = failure

# View status file
cat .kiro/cicd-status/latest.json
```

### Environment Variables

**GitHub Actions**
```yaml
env:
  NODE_VERSION: '20'
  AWS_REGION: 'us-east-1'
  ENVIRONMENT: 'dev'
```

**Required Secrets**
- `HITECHPARADIGM_AWS_ACCESS_KEY_ID`
- `HITECHPARADIGM_AWS_SECRET_ACCESS_KEY`

### Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
- [Kiro Hooks Documentation](https://docs.kiro.ai/hooks)

---

## Conclusion

These two automation mechanisms work together to ensure:

1. **Documentation Quality**: Pre-push hook prevents outdated documentation
2. **Deployment Reliability**: CI/CD monitoring catches failures immediately
3. **Developer Productivity**: AI assistance for quick issue resolution
4. **Project Maintainability**: Consistent documentation and deployment practices

By enforcing documentation updates before push and monitoring deployments automatically, the BudgetBuddy project maintains high code quality and rapid iteration cycles.

