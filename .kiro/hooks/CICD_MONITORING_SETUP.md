# CI/CD Monitoring with Kiro Hooks

This guide shows you how to set up automatic CI/CD monitoring so Kiro can detect and fix deployment failures without you constantly checking GitHub Actions.

## 🎯 Goal

Automatically detect CI/CD failures and have Kiro agent fix them without manual monitoring.

## 📋 Prerequisites

1. **GitHub CLI installed**: https://cli.github.com/
   ```bash
   # Windows (PowerShell)
   winget install GitHub.cli

   # Verify installation
   gh --version
   ```

2. **Authenticate GitHub CLI**:
   ```bash
   gh auth login
   ```

## 🔧 Setup Instructions

### Step 1: Create Kiro Hook

1. Open Command Palette in Kiro (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Search for: **"Open Kiro Hook UI"**
3. Click **"Create New Hook"**

### Step 2: Configure Hook

**Hook Configuration:**

- **Name**: `Monitor CI/CD Pipeline`
- **Description**: `Automatically check GitHub Actions status and fix failures`
- **Trigger Type**: Choose one:
  - **Manual Button** (recommended for testing)
  - **On Agent Execution Complete** (automatic after each Kiro session)
  - **On File Save** (if you want to check after every push)

- **Action Type**: `Execute Shell Command`
- **Command**:
  ```bash
  node scripts/check-cicd-status.js
  ```

- **On Command Failure**: `Send message to agent`
- **Failure Message**:
  ```
  The CI/CD pipeline has failed. Please read the status file at .kiro/cicd-status/latest.json and fix the issues found in the logs.
  ```

### Step 3: Test the Hook

1. Push some code to trigger CI/CD
2. Wait a few minutes
3. Click the "Monitor CI/CD Pipeline" button in Kiro
4. Kiro will check the status and alert you if there's a failure

## 🚀 Usage

### Manual Check
- Click the hook button in Kiro's Agent Hooks panel
- Kiro will check GitHub Actions and report status

### Automatic Check (Recommended)
Set trigger to **"On Agent Execution Complete"**:
- After you finish a Kiro session (like pushing code)
- Kiro automatically checks CI/CD status
- If failed, Kiro starts a new session to fix it

## 📊 Status File

The script saves status to: `.kiro/cicd-status/latest.json`

Example content:
```json
{
  "runId": 7234567890,
  "status": "completed",
  "conclusion": "failure",
  "branch": "develop",
  "event": "push",
  "title": "feat: Add responsive layout fixes",
  "createdAt": "2025-11-19T21:30:00Z",
  "checkedAt": "2025-11-19T21:35:00Z",
  "url": "https://github.com/hitechparadigm/budgetbuddy/actions/runs/7234567890",
  "failureLogs": "... error details ..."
}
```

## 🔄 Workflow

1. **You push code** → GitHub Actions starts
2. **Kiro hook triggers** (manual or automatic)
3. **Script checks status** via GitHub CLI
4. **If failed**:
   - Saves error logs to `.kiro/cicd-status/latest.json`
   - Triggers Kiro agent with failure message
   - Kiro reads the logs and fixes the issue
   - Kiro commits and pushes the fix
   - Repeat until successful

## 💡 Advanced: Continuous Monitoring

For continuous monitoring, create a second hook:

**Hook Name**: `Continuous CI/CD Monitor`
**Trigger**: On Agent Execution Complete
**Command**:
```bash
# Check every 30 seconds for 5 minutes
for i in {1..10}; do
  node scripts/check-cicd-status.js
  if [ $? -eq 1 ]; then
    exit 1  # Trigger Kiro agent
  fi
  sleep 30
done
```

## 🎨 Optional: Desktop Notifications

Add to the script for desktop notifications:

**Windows**:
```powershell
# Add to hook command
node scripts/check-cicd-status.js; if ($LASTEXITCODE -eq 1) {
  powershell -Command "New-BurntToastNotification -Text 'CI/CD Failed', 'Kiro is fixing it...'"
}
```

**macOS**:
```bash
node scripts/check-cicd-status.js || osascript -e 'display notification "Kiro is fixing it..." with title "CI/CD Failed"'
```

## 📝 Example Hook Configurations

### Configuration 1: Post-Push Monitor
- **Trigger**: On File Save (for files matching `*.js`, `*.ts`, `*.tsx`)
- **Action**: Execute `node scripts/check-cicd-status.js`
- **Use Case**: Check CI/CD after you save and push code

### Configuration 2: Session End Monitor
- **Trigger**: On Agent Execution Complete
- **Action**: Execute `node scripts/check-cicd-status.js`
- **Use Case**: Automatically check after Kiro finishes a task

### Configuration 3: Manual Check
- **Trigger**: Manual Button
- **Action**: Execute `node scripts/check-cicd-status.js`
- **Use Case**: Check status on demand

## 🐛 Troubleshooting

**"gh: command not found"**
- Install GitHub CLI: https://cli.github.com/
- Restart Kiro after installation

**"gh: authentication required"**
- Run: `gh auth login`
- Follow the prompts to authenticate

**"No workflow runs found"**
- Make sure you've pushed code to trigger CI/CD
- Check workflow name matches in script (default: `deploy-dev.yml`)

## 🎯 Next Steps

1. Set up the hook with manual trigger first
2. Test it a few times
3. Switch to automatic trigger once comfortable
4. Enjoy hands-free CI/CD monitoring!
