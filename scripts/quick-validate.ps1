Write-Host "🔍 Quick Lambda Syntax Check" -ForegroundColor Cyan

$errors = 0
$files = Get-ChildItem "backend/functions/*/index.js"

foreach ($file in $files) {
    $funcName = $file.Directory.Name
    Write-Host "Checking $funcName... " -NoNewline

    $result = node -c $file.FullName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅" -ForegroundColor Green
    } else {
        Write-Host "❌" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        $errors++
    }
}

if ($errors -eq 0) {
    Write-Host "`n🎉 All Lambda functions have valid syntax!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Found $errors syntax errors" -ForegroundColor Red
}
