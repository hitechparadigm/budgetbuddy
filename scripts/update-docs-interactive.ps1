# Interactive Documentation Update Script for BudgetBuddy
# Run this before every git push to ensure documentation is current

Write-Host "📋 BudgetBuddy Documentation Update Assistant" -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Blue
Write-Host ""

# Get current date for changelog
$currentDate = Get-Date -Format "yyyy-MM-dd"
Write-Host "📅 Current Date: $currentDate" -ForegroundColor Cyan
Write-Host ""

# Function to prompt for yes/no
function Get-YesNo {
    param([string]$prompt)
    do {
        $response = Read-Host "$prompt (y/n)"
    } while ($response -notmatch '^[yn]$')
    return $response -eq 'y'
}

# Function to check if file was modified recently
function Test-RecentlyModified {
    param([string]$filePath, [int]$hours = 24)
    if (Test-Path $filePath) {
        $lastWrite = (Get-Item $filePath).LastWriteTime
        $cutoff = (Get-Date).AddHours(-$hours)
        return $lastWrite -gt $cutoff
    }
    return $false
}

Write-Host "🔍 Checking documentation status..." -ForegroundColor Yellow

# Check required files
$requiredDocs = @(
    "CHANGELOG.md",
    "DEVELOPMENT_LOG.md",
    "README.md",
    "docs/development-status.md",
    ".kiro/specs/family-budget-app/tasks.md"
)

$missingDocs = @()
$oldDocs = @()

foreach ($doc in $requiredDocs) {
    if (!(Test-Path $doc)) {
        $missingDocs += $doc
    } elseif (!(Test-RecentlyModified $doc)) {
        $oldDocs += $doc
    }
}

if ($missingDocs.Count -gt 0) {
    Write-Host "❌ Missing required documentation files:" -ForegroundColor Red
    $missingDocs | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Please create these files before continuing." -ForegroundColor Yellow
    exit 1
}

if ($oldDocs.Count -gt 0) {
    Write-Host "⚠️  Files not updated in last 24 hours:" -ForegroundColor Yellow
    $oldDocs | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host ""
}

Write-Host "📝 Documentation Update Checklist" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# CHANGELOG.md Updates
Write-Host "📄 CHANGELOG.md Updates:" -ForegroundColor Cyan
Write-Host "  □ Add new version entry with date: $currentDate"
Write-Host "  □ List all features added in this session"
Write-Host "  □ Document all issues fixed with root cause and resolution"
Write-Host "  □ Record lessons learned with application guidance"
Write-Host "  □ Update progress metrics"
Write-Host ""

if (Get-YesNo "Have you updated CHANGELOG.md with today's changes?") {
    Write-Host "✅ CHANGELOG.md confirmed" -ForegroundColor Green
} else {
    Write-Host "❌ Please update CHANGELOG.md first" -ForegroundColor Red
    Write-Host "💡 Add a new version section with today's date and document:" -ForegroundColor Blue
    Write-Host "   - Features added"
    Write-Host "   - Issues resolved"
    Write-Host "   - Lessons learned"
    Write-Host "   - Progress metrics"
    exit 1
}

Write-Host ""

# DEVELOPMENT_LOG.md Updates
Write-Host "📄 DEVELOPMENT_LOG.md Updates:" -ForegroundColor Cyan
Write-Host "  □ Add session accomplishments"
Write-Host "  □ Document all issues encountered with detailed resolution steps"
Write-Host "  □ Record lessons learned with context and application"
Write-Host "  □ Update progress metrics"
Write-Host ""

if (Get-YesNo "Have you updated DEVELOPMENT_LOG.md with technical details?") {
    Write-Host "✅ DEVELOPMENT_LOG.md confirmed" -ForegroundColor Green
} else {
    Write-Host "❌ Please update DEVELOPMENT_LOG.md first" -ForegroundColor Red
    Write-Host "💡 Add detailed technical information about:" -ForegroundColor Blue
    Write-Host "   - Issues encountered and how they were resolved"
    Write-Host "   - Lessons learned with context"
    Write-Host "   - Development process improvements"
    exit 1
}

Write-Host ""

# README.md Updates
Write-Host "📄 README.md Updates:" -ForegroundColor Cyan
Write-Host "  □ Update project status phase"
Write-Host "  □ Update overall progress percentage"
Write-Host "  □ Update recent achievements section"
Write-Host "  □ Verify all links and commands work"
Write-Host ""

if (Get-YesNo "Have you updated README.md with current project status?") {
    Write-Host "✅ README.md confirmed" -ForegroundColor Green
} else {
    Write-Host "❌ Please update README.md first" -ForegroundColor Red
    Write-Host "💡 Update the project status section with:" -ForegroundColor Blue
    Write-Host "   - Current development phase"
    Write-Host "   - Progress percentage"
    Write-Host "   - Recent achievements"
    exit 1
}

Write-Host ""

# Task Status Updates
Write-Host "📄 Task Status Updates:" -ForegroundColor Cyan
Write-Host "  □ Mark completed tasks in tasks.md"
Write-Host "  □ Update task progress in development-status.md"
Write-Host ""

if (Get-YesNo "Have you updated task statuses and development status?") {
    Write-Host "✅ Task status confirmed" -ForegroundColor Green
} else {
    Write-Host "❌ Please update task statuses first" -ForegroundColor Red
    Write-Host "💡 Update task completion status in:" -ForegroundColor Blue
    Write-Host "   - .kiro/specs/family-budget-app/tasks.md"
    Write-Host "   - docs/development-status.md"
    exit 1
}

Write-Host ""
Write-Host "🎉 All documentation checks passed!" -ForegroundColor Green
Write-Host "✅ Ready to commit and push to GitHub" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Blue
Write-Host "   git add ."
Write-Host "   git commit -m 'your commit message'"
Write-Host "   git push origin develop"
