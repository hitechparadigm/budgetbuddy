@echo off
echo Fixing encoding issues in documentation files...
echo.

REM Use PowerShell to fix encoding with proper UTF-8 handling
powershell -Command "& {
    $files = @('README.md', 'CHANGELOG.md', 'DEVELOPMENT_LOG.md', 'docs/development-status.md')

    foreach ($file in $files) {
        if (Test-Path $file) {
            Write-Host 'Fixing encoding in' $file -ForegroundColor Yellow

            # Read with UTF-8 and fix common encoding issues
            $content = Get-Content $file -Raw -Encoding UTF8

            # Fix garbled emojis and symbols
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

            # Write back with UTF-8 BOM to ensure proper encoding
            [System.IO.File]::WriteAllText((Resolve-Path $file), $content, [System.Text.Encoding]::UTF8)

            Write-Host 'Fixed' $file -ForegroundColor Green
        } else {
            Write-Host 'File not found:' $file -ForegroundColor Red
        }
    }

    Write-Host ''
    Write-Host 'Encoding fixes completed!' -ForegroundColor Green
}"

echo.
echo All documentation files have been fixed for proper UTF-8 encoding.
pause
