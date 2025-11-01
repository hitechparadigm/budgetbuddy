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

# Check for current progress consistency (only check main progress indicators)
Write-Host "Checking current progress consistency..." -ForegroundColor Blue

$CurrentProgressValues = @()
foreach ($file in $DocFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw

        # Only check main progress indicators, not historical ones
        if ($file -eq "README.md") {
            $matches = [regex]::Matches($content, "Overall Progress.*?(\d+)%\s+complete")
        } elseif ($file -eq "docs/development-status.md") {
            $matches = [regex]::Matches($content, "Overall MVP Progress.*?(\d+)%")
        } elseif ($file -eq "CHANGELOG.md") {
            # Only check the first (most recent) progress entry
            $matches = [regex]::Matches($content, "Overall MVP Progress.*?(\d+)%")
            if ($matches.Count -gt 0) {
                $matches = @($matches[0])  # Only take the first match
            }
        } elseif ($file -eq "DEVELOPMENT_LOG.md") {
            # Only check the most recent session entry
            $matches = [regex]::Matches($content, "Overall MVP Progress.*?(\d+)%")
            if ($matches.Count -gt 0) {
                $matches = @($matches[0])  # Only take the first match
            }
        }

        foreach ($match in $matches) {
            $CurrentProgressValues += @{
                File = $file
                Progress = $match.Groups[1].Value
            }
        }
    }
}

$UniqueProgress = $CurrentProgressValues | Group-Object Progress
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
