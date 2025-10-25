Write-Host "Checking Lambda function syntax..." -ForegroundColor Yellow

$errors = 0
$files = Get-ChildItem "backend/functions/*/index.js"

foreach ($file in $files) {
    $funcName = $file.Directory.Name
    Write-Host "  $funcName... " -NoNewline

    node -c $file.FullName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "ERROR" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
if ($errors -eq 0) {
    Write-Host "All syntax checks passed!" -ForegroundColor Green
} else {
    Write-Host "Found $errors syntax errors" -ForegroundColor Red
}
