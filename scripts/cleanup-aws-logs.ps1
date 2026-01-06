#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Cleans up downloaded AWS logs after analysis
.DESCRIPTION
    Removes the temp-logs directory and all downloaded log files
#>

$LogsDir = "temp-logs"

Write-Host "🧹 AWS Logs Cleanup" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

if (Test-Path $LogsDir) {
    try {
        # Get file count before deletion
        $FileCount = (Get-ChildItem $LogsDir -Recurse -File | Measure-Object).Count

        Remove-Item -Recurse -Force $LogsDir
        Write-Host "✅ Successfully cleaned up $FileCount log files from $LogsDir/" -ForegroundColor Green
        Write-Host "💾 Disk space freed up!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error cleaning up logs: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "⚠️  No logs directory found to clean up." -ForegroundColor Yellow
    Write-Host "   The temp-logs directory doesn't exist or was already cleaned up." -ForegroundColor Gray
}
