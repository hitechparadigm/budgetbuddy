# 🤖 Automated Documentation System

## Quick Start

### Option 1: Smart Commit (Recommended)
```powershell
# Automatically updates docs and commits in one command
./scripts/smart-commit.ps1 "feat: Add budget dashboard" -ProgressPercent 45
```

### Option 2: Manual Documentation Update
```powershell
# Update docs manually, then commit normally
./scripts/auto-update-docs.ps1 -ProgressPercent 45
git add .
git commit -m "your message"
git push origin develop
```

### Option 3: Automated Git Hooks
```powershell
# One-time setup - docs update automatically on every push
./scripts/git-hooks-auto.ps1

# Then just use normal git commands
git add .
git commit -m "your message"
git push origin develop  # Documentation updates automatically
```

## How It Works

### 🔍 Auto-Detection
The system automatically detects:
- **Features Added**: From commit messages with `feat:`, `add:`, `implement:`
- **Issues Fixed**: From commit messages with `fix:`, `resolve:`, `bug:`
- **Session Summary**: Recent commit messages
- **Progress**: From commit message percentages or manual input

### 📄 Files Updated
- **CHANGELOG.md**: Adds new version with features, fixes, and progress
- **DEVELOPMENT_LOG.md**: Adds session entry with technical details
- **README.md**: Updates progress percentage
- **docs/development-status.md**: Updates progress and last updated date

### 🎯 Benefits
- ✅ **Zero Manual Work**: No more forgetting to update documentation
- ✅ **Consistent Format**: All documentation follows the same structure
- ✅ **Git History Integration**: Automatically extracts information from commits
- ✅ **Progress Tracking**: Automatically updates progress across all files
- ✅ **Version Management**: Auto-increments changelog versions

## Examples

### Smart Commit Examples
```powershell
# Basic usage
./scripts/smart-commit.ps1 "feat: Complete authentication system"

# With progress update
./scripts/smart-commit.ps1 "feat: Add budget CRUD operations" -ProgressPercent 50

# With custom session summary
./scripts/smart-commit.ps1 "fix: Resolve login issues" -SessionSummary "Fixed authentication token handling and improved error messages"
```

### Manual Update Examples
```powershell
# Basic documentation update
./scripts/auto-update-docs.ps1

# With progress
./scripts/auto-update-docs.ps1 -ProgressPercent 60

# With detailed information
./scripts/auto-update-docs.ps1 -SessionSummary "Implemented budget dashboard" -FeaturesAdded "Budget visualization, Category management" -IssuesFixed "Fixed calculation errors" -ProgressPercent 65
```

## Parameters

### smart-commit.ps1
- `CommitMessage` (required): Git commit message
- `SessionSummary` (optional): Custom session description
- `ProgressPercent` (optional): Overall project progress percentage

### auto-update-docs.ps1
- `SessionSummary` (optional): Session description
- `FeaturesAdded` (optional): Features added (auto-detected if not provided)
- `IssuesFixed` (optional): Issues fixed (auto-detected if not provided)
- `LessonsLearned` (optional): Lessons learned
- `ProgressPercent` (optional): Progress percentage

## Migration from Manual Process

### Before (Manual)
1. Complete development work
2. Manually update CHANGELOG.md
3. Manually update DEVELOPMENT_LOG.md
4. Manually update README.md
5. Manually update development-status.md
6. git add, commit, push

### After (Automated)
```powershell
# Option A: One command does everything
./scripts/smart-commit.ps1 "your commit message" -ProgressPercent 45

# Option B: Separate steps
./scripts/auto-update-docs.ps1 -ProgressPercent 45
git add .
git commit -m "your message"
git push origin develop
```

## Troubleshooting

### PowerShell Execution Policy
If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Git Hooks Not Working
Re-run the setup:
```powershell
./scripts/git-hooks-auto.ps1
```

### Documentation Not Updating
Check that files exist and are writable:
- CHANGELOG.md
- DEVELOPMENT_LOG.md
- README.md
- docs/development-status.md

## Advanced Usage

### Custom Documentation Updates
```powershell
./scripts/auto-update-docs.ps1 `
  -SessionSummary "Major authentication overhaul" `
  -FeaturesAdded "JWT token management, Protected routes, Session persistence" `
  -IssuesFixed "Login timeout issues, Token refresh problems" `
  -LessonsLearned "Always validate JWT tokens on client side" `
  -ProgressPercent 75
```

### Integration with CI/CD
The automated system works great with GitHub Actions and other CI/CD systems since it requires no user interaction.
