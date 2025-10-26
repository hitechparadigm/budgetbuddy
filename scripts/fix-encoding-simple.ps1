# Simple encoding fix script
Write-Host "Fixing encoding issues..." -ForegroundColor Blue

# Fix README.md
if (Test-Path "README.md") {
    Write-Host "Fixing README.md..." -ForegroundColor Yellow
    $content = Get-Content "README.md" -Raw -Encoding UTF8
    $content = $content -replace 'âœ…', '✅'
    $content = $content -replace 'ðŸŽ¯', '🎯'
    $content = $content -replace 'ðŸš€', '🚀'
    $content = $content -replace 'ðŸ"š', '📚'
    $content = $content -replace 'ðŸ"§', '🔧'
    $content = $content -replace 'ðŸ—ï¸', '🏗️'
    $content = $content -replace 'ðŸ"', '📁'
    $content = $content -replace 'ðŸ"‹', '📋'
    $content = $content -replace 'ðŸ"¦', '📦'
    $content = $content -replace 'â"œâ"€â"€', '├──'
    $content = $content -replace 'â"‚', '│'
    $content = $content -replace 'â""â"€â"€', '└──'
    $content = $content -replace 'â†', '←'
    $content = $content -replace 'â¬…ï¸', '⬅️'
    $content = $content -replace 'ðŸ'°', '💰'
    $content = $content -replace 'ðŸ"„', '📄'
    $content = $content -replace 'ðŸ"ž', '📞'
    $content = $content -replace 'ðŸ"Š', '📊'
    $content = $content -replace 'ðŸŽ‰', '🎉'
    $content = $content -replace 'âš™ï¸', '⚙️'
    $content = $content -replace 'â', '❌'
    $content = $content -replace 'âš ï¸', '⚠️'
    $content = $content -replace 'ðŸ'¡', '💡'
    $content = $content -replace 'ðŸ"', '🔍'
    $content = $content -replace 'ðŸ¤–', '🤖'
    $content = $content -replace 'ðŸ§ª', '🧪'
    $content = $content -replace 'ðŸ"', '📝'
    $content = $content -replace 'ðŸ"ˆ', '📈'
    $content | Set-Content "README.md" -Encoding UTF8
    Write-Host "Fixed README.md" -ForegroundColor Green
}

Write-Host "Encoding fix completed!" -ForegroundColor Green
