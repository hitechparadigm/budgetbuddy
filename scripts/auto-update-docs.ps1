# Automated Documentation Update for BudgetBuddy
# This script automatically updates all documentation files before git push

param(
    [string]$SessionSummary = "",
    [string]$FeaturesAdded = "",
    [string]$IssuesFixed = "",
    [string]$LessonsLearned = "",
    [int]$ProgressPercent = 0
)

Write-Host "🤖 Automated Documentation Update" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue

$currentDate = Get-Date -Format "yyyy-MM-dd"
$currentDateTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Function to get git commit messages since last documentation update
function Get-RecentCommits {
    $lastDocUpdate = git log --oneline --grep="docs:" -1 --format="%H" 2>$null
    if ($lastDocUpdate) {
        $commits = git log --oneline "$lastDocUpdate..HEAD" --format="%s"
        return $commits -join "; "
    } else {
        $commits = git log --oneline -5 --format="%s"
        return $commits -join "; "
    }
}

# Function to detect completed tasks from git history
function Get-CompletedFeatures {
    $recentCommits = git log --oneline -10 --format="%s"
    $features = @()

    foreach ($commit in $recentCommits) {
        if ($commit -match "feat:|add:|implement:|complete:") {
            $features += $commit -replace "^(feat|add|implement|complete):\s*", ""
        }
    }

    return $features -join "`n- "
}

# Function to detect fixed issues from git history
function Get-FixedIssues {
    $recentCommits = git log --oneline -10 --format="%s"
    $fixes = @()

    foreach ($commit in $recentCommits) {
        if ($commit -match "fix:|resolve:|bug:") {
            $fixes += $commit -replace "^(fix|resolve|bug):\s*", ""
        }
    }

    return $fixes -join "`n- "
}

# Auto-detect changes if not provided
if (-not $FeaturesAdded) {
    $FeaturesAdded = Get-CompletedFeatures
}

if (-not $IssuesFixed) {
    $IssuesFixed = Get-FixedIssues
}

if (-not $SessionSummary) {
    $SessionSummary = Get-RecentCommits
}

Write-Host "📊 Detected Changes:" -ForegroundColor Cyan
Write-Host "Features: $FeaturesAdded"
Write-Host "Issues Fixed: $IssuesFixed"
Write-Host "Session Summary: $SessionSummary"
Write-Host ""

# Update CHANGELOG.md
Write-Host "📄 Updating CHANGELOG.md..." -ForegroundColor Yellow

$changelogContent = Get-Content "CHANGELOG.md" -Raw
$newVersion = "0.$(([regex]::Matches($changelogContent, '\[0\.(\d+)\.') | ForEach-Object { [int]$_.Groups[1].Value } | Measure-Object -Maximum).Maximum + 1).0"

$newEntry = @"
## [$newVersion] - $currentDate - Automated Update

### Added
- $FeaturesAdded

### Fixed
- $IssuesFixed

### Session Summary
- $SessionSummary

### Progress Update
- Overall Progress: $ProgressPercent% complete
- Last Updated: $currentDateTime

"@

$updatedChangelog = $changelogContent -replace "## \[Unreleased\]", "## [Unreleased]`n`n$newEntry"
$updatedChangelog | Set-Content "CHANGELOG.md" -Encoding UTF8

Write-Host "✅ CHANGELOG.md updated with version $newVersion" -ForegroundColor Green

# Update DEVELOPMENT_LOG.md
Write-Host "📄 Updating DEVELOPMENT_LOG.md..." -ForegroundColor Yellow

$devLogContent = Get-Content "DEVELOPMENT_LOG.md" -Raw
$newLogEntry = @"

### Automated Session Update ($currentDate)

#### Session Accomplishments
- $FeaturesAdded

#### Issues Resolved
- $IssuesFixed

#### Progress Metrics
- Session Summary: $SessionSummary
- Overall Progress: $ProgressPercent% complete
- Last Updated: $currentDateTime

"@

$updatedDevLog = $devLogContent -replace "## Current Focus", "$newLogEntry`n## Current Focus"
$updatedDevLog | Set-Content "DEVELOPMENT_LOG.md" -Encoding UTF8

Write-Host "✅ DEVELOPMENT_LOG.md updated" -ForegroundColor Green

# Update README.md progress
Write-Host "📄 Updating README.md..." -ForegroundColor Yellow

if ($ProgressPercent -gt 0) {
    $readmeContent = Get-Content "README.md" -Raw
    $updatedReadme = $readmeContent -replace "~\d+% complete", "~$ProgressPercent% complete"
    $updatedReadme = $updatedReadme -replace "Overall Progress\*\*: ~\d+%", "Overall Progress**: ~$ProgressPercent%"
    $updatedReadme | Set-Content "README.md" -Encoding UTF8
    Write-Host "✅ README.md progress updated to $ProgressPercent%" -ForegroundColor Green
} else {
    Write-Host "⚠️ README.md progress not updated (no percentage provided)" -ForegroundColor Yellow
}

# Update development-status.md
Write-Host "📄 Updating docs/development-status.md..." -ForegroundColor Yellow

$statusContent = Get-Content "docs/development-status.md" -Raw
if ($ProgressPercent -gt 0) {
    $updatedStatus = $statusContent -replace "Overall MVP Progress: ~\d+%", "Overall MVP Progress: ~$ProgressPercent%"
    $updatedStatus = $updatedStatus -replace "\*Last Updated:.*\*", "*Last Updated: $currentDate*"
    $updatedStatus | Set-Content "docs/development-status.md" -Encoding UTF8
    Write-Host "✅ development-status.md updated" -ForegroundColor Green
} else {
    Write-Host "⚠️ development-status.md progress not updated (no percentage provided)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 All documentation automatically updated!" -ForegroundColor Green
Write-Host "📝 Summary of changes:" -ForegroundColor Cyan
Write-Host "  - CHANGELOG.md: Added version $newVersion"
Write-Host "  - DEVELOPMENT_LOG.md: Added session entry"
Write-Host "  - README.md: Updated progress to $ProgressPercent%"
Write-Host "  - development-status.md: Updated progress and date"
Write-Host ""
Write-Host "🚀 Ready to commit and push!" -ForegroundColor Green
Write-Host "Next commands:" -ForegroundColor Blue
Write-Host "  git add ."
Write-Host "  git commit -m 'docs: Automated documentation update - $SessionSummary'"
Write-Host "  git push origin develop"
