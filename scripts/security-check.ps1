# Security Validation Script for BudgetBuddy (PowerShell)
# This script performs comprehensive security checks before deployment

param(
    [switch]$PreCommit = $false
)

Write-Host "🔒 BudgetBuddy Security Validation" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Track if any security issues are found
$SecurityIssues = 0

function Report-Issue {
    param([string]$Message)
    Write-Host "❌ SECURITY ISSUE: $Message" -ForegroundColor Red
    $script:SecurityIssues++
}

function Report-Warning {
    param([string]$Message)
    Write-Host "⚠️  WARNING: $Message" -ForegroundColor Yellow
}

function Report-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

Write-Host ""
Write-Host "1. Checking for exposed secrets..." -ForegroundColor White

# Check for real JWT tokens (exclude mock files)
$jwtTokens = Select-String -Path "." -Pattern "eyJ[A-Za-z0-9+/=]{100,}" -Recurse -Exclude "*.md","mockAuth.ts","*.test.js","*.test.ts" | Where-Object { $_.Path -notmatch "node_modules|\.git|coverage" }
if ($jwtTokens) {
    Report-Issue "Real JWT tokens found in repository"
    $jwtTokens | ForEach-Object { Write-Host "  Found in: $($_.Path)" -ForegroundColor Red }
} else {
    Report-Success "No real JWT tokens detected"
}

# Check for AWS credentials
$awsKeys = Select-String -Path "." -Pattern "AKIA[0-9A-Z]{16}" -Recurse | Where-Object { $_.Path -notmatch "node_modules|\.git|coverage" }
if ($awsKeys) {
    Report-Issue "AWS access keys found in repository"
    $awsKeys | ForEach-Object { Write-Host "  Found in: $($_.Path)" -ForegroundColor Red }
} else {
    Report-Success "No AWS credentials detected"
}

# Check for private keys
$privateKeys = Select-String -Path "." -Pattern "BEGIN.*PRIVATE KEY" -Recurse | Where-Object { $_.Path -notmatch "node_modules|\.git|coverage" }
if ($privateKeys) {
    Report-Issue "Private keys found in repository"
    $privateKeys | ForEach-Object { Write-Host "  Found in: $($_.Path)" -ForegroundColor Red }
} else {
    Report-Success "No private keys detected"
}

# Check for hardcoded passwords (excluding validation patterns)
$hardcodedPasswords = Select-String -Path "." -Pattern 'password.*[\'"][^\'"]*[A-Z][^\'"]*[0-9][^\'"]*[!@#$%^&*][^\'"]*[\'"]' -Recurse -Exclude "*.md","validation.ts","*.test.js","*.test.ts" | Where-Object { $_.Path -notmatch "node_modules|\.git|coverage" }
if ($hardcodedPasswords) {
    Report-Issue "Hardcoded passwords found"
    $hardcodedPasswords | ForEach-Object { Write-Host "  Found in: $($_.Path)" -ForegroundColor Red }
} else {
    Report-Success "No hardcoded passwords detected"
}

Write-Host ""
Write-Host "2. Checking for sensitive files..." -ForegroundColor White

# Check for log files
$logFiles = Get-ChildItem -Path "." -Recurse -Include "*.log","auth-logs.txt","debug-*.txt" | Where-Object { $_.FullName -notmatch "node_modules|\.git|coverage" }
if ($logFiles) {
    Report-Issue "Log files found that should not be committed"
    $logFiles | ForEach-Object { Write-Host "  Found: $($_.FullName)" -ForegroundColor Red }
} else {
    Report-Success "No sensitive log files found"
}

# Check for backup files
$backupFiles = Get-ChildItem -Path "." -Recurse -Include "*.bak","*.backup","*~" | Where-Object { $_.FullName -notmatch "node_modules|\.git" }
if ($backupFiles) {
    Report-Issue "Backup files found that should not be committed"
    $backupFiles | ForEach-Object { Write-Host "  Found: $($_.FullName)" -ForegroundColor Red }
} else {
    Report-Success "No backup files found"
}

Write-Host ""
Write-Host "3. Validating environment variable usage..." -ForegroundColor White

# Check scripts use environment variables for passwords
$scriptFiles = Get-ChildItem -Path "scripts" -Filter "*.js" -ErrorAction SilentlyContinue
$hardcodedInScripts = $false
foreach ($file in $scriptFiles) {
    $passwordLines = Select-String -Path $file.FullName -Pattern "password.*:" | Where-Object { $_.Line -notmatch "process\.env|CHANGE_ME_IN_ENV" }
    if ($passwordLines) {
        $hardcodedInScripts = $true
        Report-Issue "Scripts contain hardcoded passwords instead of environment variables"
        break
    }
}
if (-not $hardcodedInScripts) {
    Report-Success "Scripts properly use environment variables"
}

Write-Host ""
Write-Host "4. Validating mock token safety..." -ForegroundColor White

# Check mock tokens are clearly marked
$mockAuthFile = "packages/web-app/src/utils/mockAuth.ts"
if (Test-Path $mockAuthFile) {
    $mockTokens = Select-String -Path $mockAuthFile -Pattern "eyJ[A-Za-z0-9+/=]{50,}" | Where-Object { $_.Line -notmatch "MOCK|TEST|DEVELOPMENT" }
    if ($mockTokens) {
        Report-Issue "Mock tokens should contain obvious mock identifiers"
    } else {
        Report-Success "Mock tokens are properly marked"
    }
}

Write-Host ""
Write-Host "5. Validating .gitignore security entries..." -ForegroundColor White

$requiredEntries = @("auth-logs.txt", "*.log", "logs/", "debug-*.txt")
$gitignoreContent = Get-Content ".gitignore" -ErrorAction SilentlyContinue

foreach ($entry in $requiredEntries) {
    if (-not ($gitignoreContent -contains $entry)) {
        Report-Issue "Missing required .gitignore entry: $entry"
    }
}

if ($SecurityIssues -eq 0) {
    Report-Success ".gitignore security entries are present"
}

Write-Host ""
Write-Host "6. Checking production configuration..." -ForegroundColor White

# Check for HTTP URLs in infrastructure (should use HTTPS)
$httpUrls = Select-String -Path "infrastructure" -Pattern "http://" -Include "*.ts" -Recurse | Where-Object { $_.Line -notmatch "localhost|127\.0\.0\.1" }
if ($httpUrls) {
    Report-Issue "HTTP URLs found in infrastructure - use HTTPS only"
    $httpUrls | ForEach-Object { Write-Host "  Found in: $($_.Path)" -ForegroundColor Red }
} else {
    Report-Success "Infrastructure uses HTTPS properly"
}

# Check for mock auth usage in production code
$mockAuthUsage = Select-String -Path "packages/web-app/src" -Pattern "initMockAuth|isMockAuthActive" -Recurse -Exclude "mockAuth.ts","*.test.*" | Where-Object { $_.Path -notmatch "DevHelper" }
if ($mockAuthUsage) {
    Report-Warning "Mock auth usage found in production code - ensure it's disabled in production"
} else {
    Report-Success "No mock auth usage in production code"
}

Write-Host ""
Write-Host "7. Validating dependency security..." -ForegroundColor White

# Run npm audit if available
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Running npm audit..." -ForegroundColor White
    $auditResult = npm audit --audit-level=moderate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Report-Success "No moderate or high severity vulnerabilities found"
    } else {
        Report-Issue "npm audit found security vulnerabilities"
        Write-Host $auditResult -ForegroundColor Red
    }
} else {
    Report-Warning "npm not available - skipping dependency audit"
}

Write-Host ""
Write-Host "8. Comprehensive secret scanning..." -ForegroundColor White

# Enhanced secret detection patterns
$secretPatterns = @(
    'password.*=.*[\'"][^\'"]{8,}[\'"]',
    'api[_-]?key.*=.*[\'"][^\'"]{20,}[\'"]',
    'secret.*=.*[\'"][^\'"]{16,}[\'"]',
    'token.*=.*[\'"][^\'"]{20,}[\'"]',
    'auth.*=.*[\'"][^\'"]{16,}[\'"]'
)

foreach ($pattern in $secretPatterns) {
    $matches = Select-String -Path "." -Pattern $pattern -Recurse -Exclude "*.md","mockAuth.ts","*.test.js","*.test.ts" | Where-Object { $_.Path -notmatch "node_modules|\.git|coverage" }
    if ($matches) {
        Report-Issue "Potential secrets found matching pattern: $pattern"
        $matches | ForEach-Object { Write-Host "  Found in: $($_.Path)" -ForegroundColor Red }
    }
}

# Check for database connection strings
$dbConnections = Select-String -Path "." -Pattern "mongodb://|mysql://|postgres://|redis://" -Recurse -Exclude "*.md","*.test.js","*.test.ts" | Where-Object { $_.Path -notmatch "node_modules|\.git|coverage" -and $_.Line -notmatch "localhost|127\.0\.0\.1|example\.com" }
if ($dbConnections) {
    Report-Issue "Database connection strings found - ensure they use environment variables"
    $dbConnections | ForEach-Object { Write-Host "  Found in: $($_.Path)" -ForegroundColor Red }
} else {
    Report-Success "No hardcoded database connection strings found"
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Security Validation Summary" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

if ($SecurityIssues -eq 0) {
    Write-Host "🎉 All security checks passed! Repository is secure for deployment." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Found $SecurityIssues security issue(s). Please fix before deploying." -ForegroundColor Red
    Write-Host ""
    Write-Host "For help with security issues, see SECURITY.md" -ForegroundColor Yellow
    exit 1
}
