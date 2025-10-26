# Simple Automated Documentation Update
param(
    [string]$Summary = "Development session update",
    [int]$Progress = 0
)

Write-Host "Automated Documentation Update" -ForegroundColor Blue
Write-Host "=============================" -ForegroundColor Blue

$currentDate = Get-Date -Format "yyyy-MM-dd"
$currentTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Get recent commit messages for context
$recentCommits = git log --oneline -5 --format="%s" | Out-String

Write-Host "Updating CHANGELOG.md..." -ForegroundColor Yellow

# Simple CHANGELOG update
$changelogUpdate = @"

## [Development Update] - $currentDate

### Session Summary
- $Summary

### Recent Changes
$recentCommits

### Progress
- Overall Progress: $Progress% complete
- Last Updated: $currentTime

"@

# Read current changelog and add new entry
$currentChangelog = Get-Content "CHANGELOG.md" -Raw -ErrorAction SilentlyContinue
if ($currentChangelog) {
    $updatedChangelog = $currentChangelog -replace "## \[Unreleased\]", "## [Unreleased]$changelogUpdate"
    $updatedChangelog | Set-Content "CHANGELOG.md" -Encoding UTF8
} else {
    "# Changelog$changelogUpdate" | Set-Content "CHANGELOG.md" -Encoding UTF8
}

Write-Host "Updating DEVELOPMENT_LOG.md..." -ForegroundColor Yellow

# Simple DEVELOPMENT_LOG update
$logUpdate = @"

### Development Session - $currentDate

#### Summary
$Summary

#### Recent Commits
$recentCommits

#### Progress Update
- Overall Progress: $Progress% complete
- Session Date: $currentTime

"@

# Read current log and add new entry
$currentLog = Get-Content "DEVELOPMENT_LOG.md" -Raw -ErrorAction SilentlyContinue
if ($currentLog) {
    $updatedLog = $currentLog -replace "## Current Focus", "$logUpdate`n## Current Focus"
    $updatedLog | Set-Content "DEVELOPMENT_LOG.md" -Encoding UTF8
}

Write-Host "Updating README.md..." -ForegroundColor Yellow

# Update progress in README if provided
if ($Progress -gt 0) {
    $readme = Get-Content "README.md" -Raw -ErrorAction SilentlyContinue
    if ($readme) {
        $updatedReadme = $readme -replace "~\d+% complete", "~$Progress% complete"
        $updatedReadme = $updatedReadme -replace "Overall Progress\*\*: ~\d+%", "Overall Progress**: ~$Progress%"
        $updatedReadme | Set-Content "README.md" -Encoding UTF8
    }
}

Write-Host ""
Write-Host "Documentation updated successfully!" -ForegroundColor Green
Write-Host "Summary: $Summary" -ForegroundColor Cyan
Write-Host "Progress: $Progress%" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ready to commit and push!" -ForegroundColor Green
