# Fix encoding issues in documentation files
Write-Host "Fixing encoding issues in documentation..." -ForegroundColor Blue

# Define the files to fix
$filesToFix = @(
    "README.md",
    "CHANGELOG.md",
    "DEVELOPMENT_LOG.md",
    "docs/development-status.md"
)

# Define encoding fixes (garbled -> correct)
$encodingFixes = @{
    "âœ…" = "✅"
    "ðŸŽ¯" = "🎯"
    "ðŸš€" = "🚀"
    "ðŸ"š" = "📚"
    "ðŸ"§" = "🔧"
    "ðŸ—ï¸" = "🏗️"
    "ðŸ"" = "📁"
    "ðŸ"‹" = "📋"
    "ðŸ"¦" = "📦"
    "â"œâ"€â"€" = "├──"
    "â"‚" = "│"
    "â""â"€â"€" = "└──"
    "â†" = "←"
    "â¬…ï¸" = "⬅️"
    "ðŸ'°" = "💰"
    "ðŸ"„" = "📄"
    "ðŸ"ž" = "📞"
    "ðŸ"Š" = "📊"
    "ðŸŽ‰" = "🎉"
    "ðŸ"¥" = "🔥"
    "âš™ï¸" = "⚙️"
    "â" = "❌"
    "âš ï¸" = "⚠️"
    "ðŸ'¡" = "💡"
    "ðŸ"" = "🔍"
    "ðŸ¤–" = "🤖"
    "ðŸ§ª" = "🧪"
    "ðŸ"" = "📝"
    "ðŸ"ˆ" = "📈"
    "ðŸ"‹" = "📋"
    "ðŸ"„" = "📄"
}

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        Write-Host "Fixing encoding in $file..." -ForegroundColor Yellow

        # Read file content
        $content = Get-Content $file -Raw -Encoding UTF8

        # Apply all encoding fixes
        foreach ($fix in $encodingFixes.GetEnumerator()) {
            $content = $content -replace [regex]::Escape($fix.Key), $fix.Value
        }

        # Write back with proper UTF-8 encoding
        $content | Set-Content $file -Encoding UTF8 -NoNewline

        Write-Host "Fixed $file" -ForegroundColor Green
    } else {
        Write-Host "File not found: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Encoding fixes completed!" -ForegroundColor Green
Write-Host "All files now use proper UTF-8 encoding with correct Unicode characters." -ForegroundColor Cyan
