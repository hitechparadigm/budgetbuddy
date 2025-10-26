# Smart Commit - Automatically update docs and commit
param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage,
    [string]$SessionSummary = "",
    [int]$ProgressPercent = 0
)

Write-Host "🚀 Smart Commit with Auto Documentation" -ForegroundColor Blue
Write-Host "=======================================" -ForegroundColor Blue

# Auto-detect progress if not provided
if ($ProgressPercent -eq 0) {
    # Try to extract progress from commit message or recent changes
    if ($CommitMessage -match "(\d+)%") {
        $ProgressPercent = [int]$matches[1]
        Write-Host "📊 Auto-detected progress: $ProgressPercent%" -ForegroundColor Cyan
    }
}

# Use commit message as session summary if not provided
if (-not $SessionSummary) {
    $SessionSummary = $CommitMessage
}

Write-Host "📝 Updating documentation..." -ForegroundColor Yellow

# Run the automated documentation update
& "./scripts/auto-update-docs.ps1" -SessionSummary $SessionSummary -ProgressPercent $ProgressPercent

Write-Host ""
Write-Host "📦 Staging all changes..." -ForegroundColor Yellow
git add .

Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m $CommitMessage

Write-Host "🌐 Pushing to GitHub..." -ForegroundColor Yellow
git push origin develop

Write-Host ""
Write-Host "✅ Smart commit completed!" -ForegroundColor Green
Write-Host "🎉 Documentation automatically updated and pushed!" -ForegroundColor Green
