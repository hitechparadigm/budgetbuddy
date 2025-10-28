# JSON File Validation Script for BudgetBuddy
# Validates all JSON files in the project and detects corruption

Write-Host "Scanning BudgetBuddy project for JSON file issues..." -ForegroundColor Cyan

$jsonFiles = Get-ChildItem -Recurse -Filter "*.json" | Where-Object {
    $_.FullName -notmatch "node_modules" -and
    $_.FullName -notmatch "cdk\.out" -and
    $_.FullName -notmatch "cdk-out-temp"
}

$corruptedFiles = @()
$invalidFiles = @()
$validFiles = @()

foreach ($file in $jsonFiles) {
    Write-Host "Checking: $($file.FullName)" -ForegroundColor Gray

    try {
        $content = Get-Content $file.FullName -Raw

        # Check for JavaScript patterns that shouldn't be in JSON
        if ($content -match "^/\*\*|^const |^function |^module\.exports|^require\(") {
            Write-Host "CORRUPTED: $($file.FullName) contains JavaScript code!" -ForegroundColor Red
            $corruptedFiles += $file.FullName
            continue
        }

        # Validate JSON syntax
        $jsonObject = $content | ConvertFrom-Json -ErrorAction Stop
        Write-Host "VALID: $($file.FullName)" -ForegroundColor Green
        $validFiles += $file.FullName

    } catch {
        Write-Host "INVALID JSON: $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Red
        $invalidFiles += $file.FullName
    }
}

# Summary Report
Write-Host "`nJSON Validation Summary:" -ForegroundColor Cyan
Write-Host "Valid files: $($validFiles.Count)" -ForegroundColor Green
Write-Host "Invalid JSON files: $($invalidFiles.Count)" -ForegroundColor Red
Write-Host "Corrupted files: $($corruptedFiles.Count)" -ForegroundColor Red

if ($corruptedFiles.Count -gt 0) {
    Write-Host "`nCRITICAL: The following files are corrupted with non-JSON content:" -ForegroundColor Red
    foreach ($file in $corruptedFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host "`nThese files must be fixed immediately to prevent deployment failures!" -ForegroundColor Yellow
}

if ($invalidFiles.Count -gt 0) {
    Write-Host "`nThe following files have invalid JSON syntax:" -ForegroundColor Red
    foreach ($file in $invalidFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
}

if ($corruptedFiles.Count -gt 0 -or $invalidFiles.Count -gt 0) {
    Write-Host "`nSee docs/JSON_FILE_CORRUPTION_PREVENTION.md for recovery procedures" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`nAll JSON files are valid!" -ForegroundColor Green
    exit 0
}
