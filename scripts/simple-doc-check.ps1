#!/usr/bin/env pwsh

# Simple Documentation Consistency Check
Write-Host "BudgetBuddy Documentation Review" -ForegroundColor Magenta

$DocFiles = @(
    "README.md",
    "CHANGELOG.md",
    "DEVELOPMENT_LOG.md",
    "docs/development-status.md"
)

$Issues = @()

Write-Host "Checking documentation files..." -ForegroundColor Blue

foreach ($file in $DocFiles) {
    if (-not (Test-Path $file)) {
        $Issues += "Missing file: $file"
        Write-Host "MISSING: $file" -ForegroundColor Red
    } else {
        Write-Host "Found: $file" -ForegroundColor Green

        # Check file age (should be updated within last 24 hours)
        $fileAge = (Get-Date) - (Get-Item $file).LastWriteTime
        if ($fileAge.TotalHours -gt 24) {
            $Issues += "Outdated file: $file (last updated $($fileAge.Days) days ago)"
            Write-Host "OUTDATED: $file" -ForegroundColor Yellow
        }
    }
}

# Check for progress consistency
Write-Host "Checking progress consistency..." -ForegroundColor Blue

$ProgressValues = @()
foreach ($file in $DocFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $matches = [regex]::Matches($content, "(\d+)%\s+complete")
        foreach ($match in $matches) {
            $ProgressValues += @{
                File = $file
                Progress = $match.Groups[1].Value
            }
        }
    }
}

$UniqueProgress = $ProgressValues | Group-Object Progress
if ($UniqueProgress.Count -gt 1) {
    Write-Host "INCONSISTENT PROGRESS VALUES:" -ForegroundColor Red
    foreach ($group in $UniqueProgress) {
        Write-Host "  $($group.Name)% in: $($group.Group.File -join ', ')" -ForegroundColor Yellow
    }
    $Issues += "Inconsistent progress values found"
}

# Summary
Write-Host "`nSummary:" -ForegroundColor Cyan
if ($Issues.Count -eq 0) {
    Write-Host "All documentation checks passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Issues found:" -ForegroundColor Red
    foreach ($issue in $Issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
    exit 1
}
