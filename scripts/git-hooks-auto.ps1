# Setup Automated Git Hooks for BudgetBuddy
Write-Host "Setting up automated Git hooks..." -ForegroundColor Blue

# Create .git/hooks directory if it doesn't exist
if (!(Test-Path ".git/hooks")) {
    New-Item -ItemType Directory -Path ".git/hooks" -Force | Out-Null
}

# Create automated pre-push hook
$prePushHook = @'
#!/bin/bash

# Automated Pre-Push Documentation Update
echo "🤖 Auto-updating documentation before push..."

# Check if we're on Windows and use PowerShell, otherwise use bash
if command -v powershell.exe &> /dev/null; then
    powershell.exe -ExecutionPolicy Bypass -File "./scripts/auto-update-docs.ps1"
elif command -v pwsh &> /dev/null; then
    pwsh -ExecutionPolicy Bypass -File "./scripts/auto-update-docs.ps1"
else
    echo "⚠️ PowerShell not found. Skipping automated documentation update."
    echo "Please run ./scripts/auto-update-docs.ps1 manually."
fi

echo "✅ Pre-push hook completed"
exit 0
'@

$prePushHook | Set-Content ".git/hooks/pre-push" -Encoding UTF8

Write-Host "Git hooks installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "What this does:" -ForegroundColor Cyan
Write-Host "  - Automatically updates documentation before every push"
Write-Host "  - No manual intervention required"
Write-Host "  - Extracts information from git history"
Write-Host ""
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  git add ."
Write-Host "  git commit -m 'your message'"
Write-Host "  git push origin develop  # Documentation auto-updates here"
Write-Host ""
Write-Host "Or use smart commit:" -ForegroundColor Yellow
Write-Host "  ./scripts/smart-commit.ps1 'your message' -ProgressPercent 40"
