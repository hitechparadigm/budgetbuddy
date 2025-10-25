# BudgetBuddy Lambda Function Syntax Validation Script (PowerShell)
param()

Write-Host "🔍 BudgetBuddy Lambda Function Syntax Validation" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$errors = 0
$warnings = 0

Write-Host ""
Write-Host "📁 Checking Lambda function directory structure..." -ForegroundColor Yellow

if (-not (Test-Path "backend/functions")) {
    Write-Host "❌ Error: backend/functions directory not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Lambda functions directory found" -ForegroundColor Green

Write-Host ""
Write-Host "🔍 Validating JavaScript syntax..." -ForegroundColor Yellow

$functionDirs = Get-ChildItem -Path "backend/functions" -Directory

foreach ($funcDir in $functionDirs) {
    $funcName = $funcDir.Name
    $indexFile = Join-Path $funcDir.FullName "index.js"

    Write-Host "  📄 $funcName`: " -NoNewline

    if (Test-Path $indexFile) {
        try {
            $null = node -c $indexFile 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Valid" -ForegroundColor Green
            } else {
                Write-Host "❌ Syntax Error" -ForegroundColor Red
                $errors++
            }
        } catch {
            Write-Host "❌ Syntax Error" -ForegroundColor Red
            $errors++
        }
    } else {
        Write-Host "⚠️  Missing index.js" -ForegroundColor Yellow
        $warnings++
    }
}

Write-Host ""
Write-Host "🔍 Checking for common syntax error patterns..." -ForegroundColor Yellow

Write-Host "  🔗 Optional chaining syntax: " -NoNewline
try {
    $invalidChaining = Select-String -Path "backend/functions/*/index.js" -Pattern "\? \." -ErrorAction SilentlyContinue
    if ($invalidChaining) {
        Write-Host "❌ Found invalid syntax" -ForegroundColor Red
        $errors++
    } else {
        Write-Host "✅ Valid" -ForegroundColor Green
    }
} catch {
    Write-Host "✅ Valid" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 Validation Summary" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "🎉 All Lambda functions passed validation!" -ForegroundColor Green
    exit 0
} elseif ($errors -eq 0) {
    Write-Host "⚠️  Validation completed with warnings" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ Validation failed" -ForegroundColor Red
    Write-Host "❌ $errors syntax error(s) found" -ForegroundColor Red
    exit 1
}
