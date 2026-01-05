# Security Check for BudgetBuddy (Windows PowerShell)
param(
    [switch]$PreCommit = $false
)

Write-Host "BudgetBuddy Security Validation" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

$SecurityIssues = 0

function Report-Issue {
    param([string]$Message)
    Write-Host "SECURITY ISSUE: $Message" -ForegroundColor Red
    $script:SecurityIssues++
}

function Report-Success {
    param([string]$Message)
    Write-Host "SUCCESS: $Message" -ForegroundColor Green
}

Write-Host ""
Write-Host "1. Checking for exposed secrets..." -ForegroundColor White

# Check for JWT tokens (exclude source maps)
$jwtPattern = "eyJ[A-Za-z0-9+/=]{100,}"
$sourceFiles = Get-ChildItem -Path "." -Recurse -Include "*.js","*.ts","*.json" | Where-Object { $_.FullName -notmatch "node_modules|\.git|coverage|\.github|mockAuth\.ts|\.test\." }

$foundJWT = $false
foreach ($file in $sourceFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -and $content -match $jwtPattern) {
            # Skip source maps and mock tokens
            if ($content -match "sourceMappingURL=data:application/json;base64" -or $content -match "MOCK.*TOKEN") {
                continue
            }
            Report-Issue "Potential JWT token found in $($file.Name)"
            $foundJWT = $true
        }
    } catch {
        # Skip files that can't be read
    }
}

if (-not $foundJWT) {
    Report-Success "No JWT tokens detected"
}

# Check for AWS keys
$awsPattern = "AKIA[0-9A-Z]{16}"
$foundAWS = $false
foreach ($file in $sourceFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -and $content -match $awsPattern) {
            Report-Issue "AWS access key found in $($file.Name)"
            $foundAWS = $true
        }
    } catch {
        # Skip files that can't be read
    }
}

if (-not $foundAWS) {
    Report-Success "No AWS credentials detected"
}

Write-Host ""
Write-Host "2. Checking npm audit..." -ForegroundColor White

if (Get-Command npm -ErrorAction SilentlyContinue) {
    $auditOutput = npm audit --audit-level=moderate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Report-Success "No moderate or high severity vulnerabilities found"
    } else {
        Report-Issue "npm audit found security vulnerabilities"
        Write-Host $auditOutput -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: npm not available - skipping dependency audit" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Checking .gitignore security entries..." -ForegroundColor White

$requiredEntries = @("auth-logs.txt", "*.log", "logs/", "debug-*.txt")

if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore"
    $missingEntries = @()

    foreach ($entry in $requiredEntries) {
        if ($gitignoreContent -notcontains $entry) {
            $missingEntries += $entry
        }
    }

    if ($missingEntries.Count -gt 0) {
        $entriesText = $missingEntries -join ", "
        Report-Issue "Missing .gitignore entries: $entriesText"
    } else {
        Report-Success ".gitignore security entries are present"
    }
} else {
    Report-Issue ".gitignore file not found"
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Security Validation Summary" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

if ($SecurityIssues -eq 0) {
    Write-Host "All security checks passed! Repository is secure." -ForegroundColor Green
    exit 0
} else {
    Write-Host "Found $SecurityIssues security issues. Please fix before proceeding." -ForegroundColor Red
    exit 1
}
