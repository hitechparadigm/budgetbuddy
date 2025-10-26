# Smart Commit - Auto-update docs and commit in one command
param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    [int]$Progress = 0,
    [string]$Summary = ""
)

Write-Host "Smart Commit with Auto Documentation" -ForegroundColor Blue
Write-Host "====================================" -ForegroundColor Blue

# Use commit message as summary if not provided
if (-not $Summary) {
    $Summary = $Message
}

# Auto-detect progress from commit message if not provided
if ($Progress -eq 0 -and $Message -match "(\d+)%") {
    $Progress = [int]$matches[1]
    Write-Host "Auto-detected progress: $Progress%" -ForegroundColor Cyan
}

Write-Host "Updating documentation..." -ForegroundColor Yellow
& "./scripts/auto-docs.ps1" -Summary $Summary -Progress $Progress

Write-Host "Staging changes..." -ForegroundColor Yellow
git add .

Write-Host "Committing..." -ForegroundColor Yellow
git commit -m $Message

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin develop

Write-Host ""
Write-Host "Smart commit completed!" -ForegroundColor Green
Write-Host "Documentation automatically updated and pushed!" -ForegroundColor Green
