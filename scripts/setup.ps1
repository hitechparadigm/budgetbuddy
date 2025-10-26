# Setup Automated Documentation System for BudgetBuddy
Write-Host "Setting up automated documentation system..." -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Blue

# Make sure all scripts are executable
Write-Host "Configuring PowerShell execution policy..." -ForegroundColor Yellow
try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host "PowerShell execution policy configured" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not set execution policy. You may need to run:" -ForegroundColor Yellow
    Write-Host "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Automated Documentation System Ready!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

Write-Host "Usage Options:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Smart Commit (Recommended):" -ForegroundColor Yellow
Write-Host "   ./scripts/commit.ps1 'your commit message' -Progress 50"
Write-Host "   - Updates all documentation automatically"
Write-Host "   - Commits and pushes in one command"
Write-Host "   - Auto-detects progress from commit message"
Write-Host ""

Write-Host "2. Manual Documentation Update:" -ForegroundColor Yellow
Write-Host "   ./scripts/auto-docs.ps1 -Summary 'session summary' -Progress 50"
Write-Host "   git add ."
Write-Host "   git commit -m 'your message'"
Write-Host "   git push origin develop"
Write-Host ""

Write-Host "Examples:" -ForegroundColor Cyan
Write-Host "  ./scripts/commit.ps1 'feat: Add budget dashboard with 60% progress'"
Write-Host "  ./scripts/commit.ps1 'fix: Resolve authentication issues' -Progress 45"
Write-Host "  ./scripts/auto-docs.ps1 -Summary 'Completed authentication system' -Progress 40"
Write-Host ""

Write-Host "Benefits:" -ForegroundColor Green
Write-Host "  - Zero manual documentation work"
Write-Host "  - Consistent formatting across all docs"
Write-Host "  - Automatic progress tracking"
Write-Host "  - Git history integration"
Write-Host "  - Never forget to update documentation again!"
Write-Host ""

Write-Host "Files that get updated automatically:" -ForegroundColor Cyan
Write-Host "  - CHANGELOG.md (project changes and versions)"
Write-Host "  - DEVELOPMENT_LOG.md (technical details and progress)"
Write-Host "  - README.md (progress percentage)"
Write-Host "  - docs/development-status.md (current status)"
Write-Host ""

Write-Host "Ready to use! Try it now:" -ForegroundColor Green
Write-Host "./scripts/commit.ps1 'test: Automated documentation system setup complete' -Progress 45"
