# Setup Git Hooks for BudgetBuddy Documentation
Write-Host "Setting up Git hooks for documentation automation..." -ForegroundColor Blue

# Create .git/hooks directory if it doesn't exist
if (!(Test-Path ".git/hooks")) {
    New-Item -ItemType Directory -Path ".git/hooks" -Force | Out-Null
}

# Copy pre-push hook
Copy-Item ".githooks/pre-push" ".git/hooks/pre-push" -Force

Write-Host "Git hooks installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "What this does:" -ForegroundColor Cyan
Write-Host "  - Checks documentation before every git push"
Write-Host "  - Shows interactive checklist for documentation updates"
Write-Host "  - Prevents pushes without documentation updates"
Write-Host ""
Write-Host "To test the hook:" -ForegroundColor Yellow
Write-Host "  git push origin develop"
Write-Host ""
Write-Host "To bypass the hook (emergency only):" -ForegroundColor Red
Write-Host "  git push --no-verify origin develop"
