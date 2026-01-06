#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Intelligently downloads AWS CloudWatch logs for BudgetBuddy analysis
.DESCRIPTION
    Fully automated script that:
    1. Scans all services for recent errors/issues
    2. Downloads only logs with problems from the last 30 minutes
    3. Prioritizes services with the most recent activity
    4. Auto-cleans up after analysis
.PARAMETER Profile
    AWS profile to use (default: hitechparadigm)
#>

param(
    [string]$Profile = "hitechparadigm"
)

# Set error handling
$ErrorActionPreference = "Stop"

Write-Host "🤖 BudgetBuddy Intelligent AWS Logs Analyzer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Create temp logs directory
$LogsDir = "temp-logs"
if (Test-Path $LogsDir) {
    Remove-Item -Recurse -Force $LogsDir
}
New-Item -ItemType Directory -Path $LogsDir | Out-Null

# Smart time range - last 30 minutes for errors, last 2 hours for context
$EndTime = Get-Date
$ErrorStartTime = $EndTime.AddMinutes(-30)  # Recent errors
$ContextStartTime = $EndTime.AddHours(-2)   # Context logs
$ErrorStartMs = [int64](($ErrorStartTime.ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds)
$ContextStartMs = [int64](($ContextStartTime.ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds)
$EndTimeMs = [int64](($EndTime.ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds)

Write-Host "� Scanlning for issues in the last 30 minutes..." -ForegroundColor Yellow
Write-Host "📅 Error scan: $($ErrorStartTime.ToString('HH:mm:ss')) to $($EndTime.ToString('HH:mm:ss'))" -ForegroundColor Green

# All BudgetBuddy services
$Services = @{
    "auth" = "/aws/lambda/budgetbuddy-auth-dev"
    "budget" = "/aws/lambda/budgetbuddy-budget-dev"
    "transactions" = "/aws/lambda/budgetbuddy-transactions-dev"
    "api" = "/aws/apigateway/budgetbuddy-api-dev"
}

$ServicesWithIssues = @()
$TotalErrorCount = 0

# Phase 1: Quick scan for errors in each service
foreach ($ServiceName in $Services.Keys) {
    $LogGroup = $Services[$ServiceName]
    Write-Host "  🔎 Scanning $ServiceName..." -ForegroundColor Blue

    try {
        # Quick error check - only count, don't download yet
        $ErrorCheck = aws logs filter-log-events --log-group-name "$LogGroup" --start-time $ErrorStartMs --end-time $EndTimeMs --filter-pattern "ERROR" --profile $Profile --output json --query 'events[0:5]' 2>$null

        if ($ErrorCheck -and $ErrorCheck -ne "[]") {
            $ErrorEvents = $ErrorCheck | ConvertFrom-Json
            $ErrorCount = $ErrorEvents.Count
            if ($ErrorCount -gt 0) {
                $ServicesWithIssues += @{
                    Name = $ServiceName
                    LogGroup = $LogGroup
                    ErrorCount = $ErrorCount
                    LastError = [DateTimeOffset]::FromUnixTimeMilliseconds($ErrorEvents[0].timestamp).ToString("HH:mm:ss")
                }
                $TotalErrorCount += $ErrorCount
                Write-Host "    ⚠️  Found $ErrorCount recent errors (latest: $($([DateTimeOffset]::FromUnixTimeMilliseconds($ErrorEvents[0].timestamp).ToString("HH:mm:ss")))" -ForegroundColor Red
            }
        } else {
            Write-Host "    ✅ No recent errors" -ForegroundColor Green
        }
    } catch {
        Write-Host "    ❌ Scan failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Phase 2: Download logs only from services with issues
if ($ServicesWithIssues.Count -eq 0) {
    Write-Host ""
    Write-Host "🎉 No recent errors found in any service!" -ForegroundColor Green
    Write-Host "📥 Downloading last 10 minutes of general activity for context..." -ForegroundColor Yellow

    # Download minimal context from API Gateway only
    $ContextStartMs = [int64](($EndTime.AddMinutes(-10).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds)
    $LogGroup = $Services["api"]
    $OutputFile = Join-Path $LogsDir "api-context.log"

    $ContextLogs = aws logs filter-log-events --log-group-name "$LogGroup" --start-time $ContextStartMs --end-time $EndTimeMs --profile $Profile --output text --query 'events[*].[timestamp,message]' 2>$null

    if ($ContextLogs) {
        $FormattedLogs = @()
        $ContextLogs -split "`n" | ForEach-Object {
            if ($_ -match "^(\d+)\s+(.+)$") {
                $Timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$Matches[1]).ToString("HH:mm:ss.fff")
                $Message = $Matches[2]
                $FormattedLogs += "[$Timestamp] $Message"
            }
        }
        $FormattedLogs | Out-File -FilePath $OutputFile -Encoding UTF8
        Write-Host "  📝 Saved $($FormattedLogs.Count) context entries" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "🚨 Found issues in $($ServicesWithIssues.Count) service(s) - downloading detailed logs..." -ForegroundColor Red

    # Sort services by error count (most problematic first)
    $ServicesWithIssues = $ServicesWithIssues | Sort-Object ErrorCount -Descending

    foreach ($Service in $ServicesWithIssues) {
        Write-Host "📥 Downloading $($Service.Name) logs (errors: $($Service.ErrorCount))..." -ForegroundColor Blue

        $OutputFile = Join-Path $LogsDir "$($Service.Name)-errors.log"

        # Download errors + 5 minutes of context before first error
        $ContextStart = [int64](($ErrorStartTime.AddMinutes(-5).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds)

        $LogEvents = aws logs filter-log-events --log-group-name "$($Service.LogGroup)" --start-time $ContextStart --end-time $EndTimeMs --profile $Profile --output text --query 'events[*].[timestamp,message]' 2>$null

        if ($LogEvents) {
            $FormattedLogs = @()
            $LogEvents -split "`n" | ForEach-Object {
                if ($_ -match "^(\d+)\s+(.+)$") {
                    $Timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$Matches[1]).ToString("HH:mm:ss.fff")
                    $Message = $Matches[2]
                    # Highlight errors
                    if ($Message -match "ERROR|Exception|Failed|Error") {
                        $FormattedLogs += "[$Timestamp] 🚨 $Message"
                    } else {
                        $FormattedLogs += "[$Timestamp] $Message"
                    }
                }
            }
            $FormattedLogs | Out-File -FilePath $OutputFile -Encoding UTF8
            Write-Host "  ✅ Saved $($FormattedLogs.Count) log entries" -ForegroundColor Green
        }
    }
}

# Create intelligent summary
$SummaryFile = Join-Path $LogsDir "ANALYSIS_SUMMARY.md"
$Summary = @"
# AWS Logs Analysis Summary

**Scan Time**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Scan Period**: Last 30 minutes (errors) + context
**Total Services Scanned**: $($Services.Count)
**Services with Issues**: $($ServicesWithIssues.Count)
**Total Error Count**: $TotalErrorCount

"@

if ($ServicesWithIssues.Count -eq 0) {
    $Summary += @"
## 🎉 Status: HEALTHY
No errors detected in any service during the scan period.

### Downloaded Files
- **api-context.log**: Recent API activity for context

### Next Steps
- System appears to be running normally
- If you're experiencing issues, they may be:
  - Older than 30 minutes
  - Client-side issues
  - Network connectivity problems

"@
} else {
    $Summary += @"
## 🚨 Status: ISSUES DETECTED

### Services with Problems
"@

    foreach ($Service in $ServicesWithIssues) {
        $Summary += "- **$($Service.Name)**: $($Service.ErrorCount) errors (latest: $($Service.LastError))`n"
    }

    $Summary += @"

### Downloaded Files
"@

    Get-ChildItem $LogsDir -Filter "*.log" | ForEach-Object {
        $LineCount = (Get-Content $_.FullName | Measure-Object -Line).Lines
        $ErrorCount = (Get-Content $_.FullName | Select-String "🚨" | Measure-Object).Count
        $Summary += "- **$($_.Name)**: $LineCount entries ($ErrorCount errors)`n"
    }

    $Summary += @"

### Analysis Focus
1. **Priority**: Services are ordered by error count (most problematic first)
2. **Context**: Each log includes 5 minutes before first error for context
3. **Errors**: Look for 🚨 markers indicating error entries
4. **Patterns**: Check for recurring error messages or timing patterns

"@
}

$Summary += @"

## Auto-Cleanup
These logs will be automatically cleaned up after analysis.
To manually clean: ``Remove-Item -Recurse -Force temp-logs``

---
*Generated by BudgetBuddy Intelligent Log Analyzer*
"@

$Summary | Out-File -FilePath $SummaryFile -Encoding UTF8

Write-Host ""
if ($ServicesWithIssues.Count -eq 0) {
    Write-Host "✅ Analysis complete - No issues detected!" -ForegroundColor Green
    Write-Host "📁 Context logs: $LogsDir/" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Analysis complete - $($ServicesWithIssues.Count) service(s) need attention!" -ForegroundColor Yellow
    Write-Host "📁 Error logs: $LogsDir/" -ForegroundColor Cyan
    Write-Host "🔍 Focus on: $($ServicesWithIssues[0].Name) (most errors)" -ForegroundColor Red
}
Write-Host "📋 Summary: $SummaryFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "🤖 Ready for AI analysis! Logs will auto-cleanup after review." -ForegroundColor Blue
