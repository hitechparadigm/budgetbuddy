#!/usr/bin/env pwsh

<#
.SYNOPSIS
    BudgetBuddy Documentation Review and Cleanup Script

.DESCRIPTION
    Comprehensive script to review all documentation for:
    - Duplicate information across files
    - Obsolete content and outdated progress indicators
    - Inconsistent status reporting
    - Broken links and references
    - Code documentation accuracy

.PARAMETER Fix
    Automatically fix issues where possible

.PARAMETER Report
    Generate detailed report of issues found

.EXAMPLE
    ./scripts/doc-review.ps1 -Report
    ./scripts/doc-review.ps1 -Fix
#>

param(
    [switch]$Fix,
    [switch]$Report
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Purple = "`e[35m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

Write-Host "${Purple}BudgetBuddy Documentation Review and Cleanup${Reset}" -ForegroundColor Magenta
Write-Host "=================================================" -ForegroundColor Magenta

# Documentation files to review
$DocFiles = @(
    "README.md",
    "CHANGELOG.md",
    "DEVELOPMENT_LOG.md",
    "docs/development-status.md",
    "docs/api-endpoints.md",
    "docs/api-troubleshooting.md"
)

# Code documentation files
$CodeDocFiles = @(
    "backend/functions/*/index.js",
    "backend/layers/common/nodejs/utils.js",
    "packages/web-app/src/**/*.tsx",
    "packages/web-app/src/**/*.ts",
    "infrastructure/lib/*.ts"
)

$Issues = @()
$Duplicates = @()
$ObsoleteContent = @()

function Add-Issue {
    param($File, $Type, $Description, $LineNumber = $null)

    $Issues += [PSCustomObject]@{
        File = $File
        Type = $Type
        Description = $Description
        LineNumber = $LineNumber
        Timestamp = Get-Date
    }
}

function Test-FileExists {
    param($FilePath)
    return Test-Path $FilePath
}

function Get-FileContent {
    param($FilePath)
    if (Test-FileExists $FilePath) {
        return Get-Content $FilePath -Raw
    }
    return $null
}

function Find-DuplicateContent {
    Write-Host "${Blue}🔍 Scanning for duplicate content...${Reset}"

    $ContentMap = @{}

    foreach ($file in $DocFiles) {
        if (Test-FileExists $file) {
            $content = Get-FileContent $file
            $lines = $content -split "`n"

            for ($i = 0; $i -lt $lines.Count; $i++) {
                $line = $lines[$i].Trim()
                if ($line.Length -gt 20 -and -not $line.StartsWith("#") -and -not $line.StartsWith("-")) {
                    if ($ContentMap.ContainsKey($line)) {
                        $Duplicates += [PSCustomObject]@{
                            Content = $line
                            Files = @($ContentMap[$line], "$file`:$($i+1)")
                        }
                    } else {
                        $ContentMap[$line] = "$file`:$($i+1)"
                    }
                }
            }
        }
    }

    Write-Host "${Yellow}Found $($Duplicates.Count) potential duplicates${Reset}"
}

function Find-ObsoleteContent {
    Write-Host "${Blue}🔍 Scanning for obsolete content...${Reset}"

    $ObsoletePatterns = @(
        @{ Pattern = "TODO"; Description = "Outdated TODO comments" },
        @{ Pattern = "FIXME"; Description = "Outdated FIXME comments" },
        @{ Pattern = "In Progress"; Description = "Potentially outdated progress indicators" },
        @{ Pattern = "Coming Soon"; Description = "Outdated 'Coming Soon' references" },
        @{ Pattern = "Not Implemented"; Description = "Potentially outdated 'Not Implemented' status" },
        @{ Pattern = "Placeholder"; Description = "Placeholder content that should be updated" },
        @{ Pattern = "2025-10-2[0-6]"; Description = "Old dates that may need updating" },
        @{ Pattern = "~[0-9]+% complete"; Description = "Progress percentages to verify" }
    )

    foreach ($file in $DocFiles) {
        if (Test-FileExists $file) {
            $content = Get-FileContent $file
            $lines = $content -split "`n"

            for ($i = 0; $i -lt $lines.Count; $i++) {
                $line = $lines[$i]
                foreach ($pattern in $ObsoletePatterns) {
                    if ($line -match $pattern.Pattern) {
                        $ObsoleteContent += [PSCustomObject]@{
                            File = $file
                            LineNumber = $i + 1
                            Content = $line.Trim()
                            Type = $pattern.Description
                        }
                    }
                }
            }
        }
    }

    Write-Host "${Yellow}Found $($ObsoleteContent.Count) potentially obsolete items${Reset}"
}

function Test-ProgressConsistency {
    Write-Host "${Blue}🔍 Checking progress consistency...${Reset}"

    $ProgressPatterns = @()

    foreach ($file in $DocFiles) {
        if (Test-FileExists $file) {
            $content = Get-FileContent $file

            # Extract progress percentages
            $matches = [regex]::Matches($content, "(\d+)%\s+complete")
            foreach ($match in $matches) {
                $ProgressPatterns += [PSCustomObject]@{
                    File = $file
                    Percentage = $match.Groups[1].Value
                    Context = $match.Value
                }
            }
        }
    }

    # Check for inconsistencies
    $UniquePercentages = $ProgressPatterns | Group-Object Percentage
    if ($UniquePercentages.Count -gt 1) {
        Add-Issue "Multiple Files" "Inconsistent Progress" "Found different progress percentages: $($UniquePercentages.Name -join ', ')"
    }
}

function Test-Links {
    Write-Host "${Blue}🔍 Testing documentation links...${Reset}"

    foreach ($file in $DocFiles) {
        if (Test-FileExists $file) {
            $content = Get-FileContent $file
            $lines = $content -split "`n"

            for ($i = 0; $i -lt $lines.Count; $i++) {
                $line = $lines[$i]

                # Find markdown links
                $linkMatches = [regex]::Matches($line, '\[([^\]]+)\]\(([^)]+)\)')
                foreach ($match in $linkMatches) {
                    $linkText = $match.Groups[1].Value
                    $linkUrl = $match.Groups[2].Value

                    # Check internal file links
                    if ($linkUrl.StartsWith("./") -or $linkUrl.StartsWith("../") -or (-not $linkUrl.Contains("http"))) {
                        $targetFile = $linkUrl -replace "^\.\/", ""
                        if (-not (Test-Path $targetFile)) {
                            Add-Issue $file "Broken Link" "Link to '$targetFile' is broken" ($i + 1)
                        }
                    }
                }
            }
        }
    }
}

function Review-CodeDocumentation {
    Write-Host "${Blue}🔍 Reviewing code documentation...${Reset}"

    # Check JavaScript/TypeScript files for documentation
    $jsFiles = Get-ChildItem -Path "backend/functions" -Recurse -Include "*.js" -ErrorAction SilentlyContinue
    $tsFiles = Get-ChildItem -Path "packages", "infrastructure" -Recurse -Include "*.ts", "*.tsx" -ErrorAction SilentlyContinue

    $allCodeFiles = @($jsFiles) + @($tsFiles)

    foreach ($file in $allCodeFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content) {
            # Check for functions without JSDoc
            $functionMatches = [regex]::Matches($content, '(?m)^(?!\s*\/\*\*).*function\s+(\w+)|(?m)^(?!\s*\/\*\*).*const\s+(\w+)\s*=.*=>')

            foreach ($match in $functionMatches) {
                $functionName = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
                if ($functionName -and $functionName -ne "anonymous") {
                    Add-Issue $file.Name "Missing Documentation" "Function '$functionName' may need JSDoc documentation"
                }
            }
        }
    }
}

function Generate-Report {
    Write-Host "${Green}📊 Generating Documentation Review Report${Reset}"
    Write-Host "============================================="

    Write-Host "${Red}🚨 Issues Found: $($Issues.Count)${Reset}"
    foreach ($issue in $Issues) {
        $lineInfo = if ($issue.LineNumber) { " (Line $($issue.LineNumber))" } else { "" }
        Write-Host "  ${Yellow}[$($issue.Type)]${Reset} $($issue.File)$lineInfo - $($issue.Description)"
    }

    Write-Host "`n${Yellow}🔄 Duplicate Content: $($Duplicates.Count)${Reset}"
    foreach ($duplicate in $Duplicates) {
        Write-Host "  ${Cyan}Duplicate:${Reset} $($duplicate.Content.Substring(0, [Math]::Min(60, $duplicate.Content.Length)))..."
        Write-Host "    ${Blue}Found in:${Reset} $($duplicate.Files -join ', ')"
    }

    Write-Host "`n${Purple}📅 Potentially Obsolete Content: $($ObsoleteContent.Count)${Reset}"
    foreach ($obsolete in $ObsoleteContent) {
        Write-Host "  ${Yellow}[$($obsolete.Type)]${Reset} $($obsolete.File):$($obsolete.LineNumber) - $($obsolete.Content)"
    }

    # Summary recommendations
    Write-Host "`n${Green}📋 Recommendations:${Reset}"
    Write-Host "1. Review and consolidate duplicate content"
    Write-Host "2. Update or remove obsolete references"
    Write-Host "3. Ensure progress percentages are consistent"
    Write-Host "4. Fix broken internal links"
    Write-Host "5. Add missing code documentation"

    # Save report to file
    $reportPath = "docs/documentation-review-$(Get-Date -Format 'yyyy-MM-dd-HHmm').md"
    $reportContent = @"
# Documentation Review Report - $(Get-Date -Format 'yyyy-MM-dd HH:mm')

## Summary
- Issues Found: $($Issues.Count)
- Duplicate Content: $($Duplicates.Count)
- Obsolete Content: $($ObsoleteContent.Count)

## Issues
$(foreach ($issue in $Issues) {
"- [$($issue.Type)] $($issue.File) - $($issue.Description)"
})

## Duplicates
$(foreach ($duplicate in $Duplicates) {
"- Content: $($duplicate.Content.Substring(0, [Math]::Min(100, $duplicate.Content.Length)))...
  Files: $($duplicate.Files -join ', ')"
})

## Obsolete Content
$(foreach ($obsolete in $ObsoleteContent) {
"- [$($obsolete.Type)] $($obsolete.File):$($obsolete.LineNumber) - $($obsolete.Content)"
})
"@

    $reportContent | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "${Green}📄 Report saved to: $reportPath${Reset}"
}

# Main execution
Write-Host "${Blue}Starting comprehensive documentation review...${Reset}"

# Check if all required files exist
foreach ($file in $DocFiles) {
    if (-not (Test-FileExists $file)) {
        Add-Issue $file "Missing File" "Required documentation file does not exist"
    }
}

# Run all checks
Find-DuplicateContent
Find-ObsoleteContent
Test-ProgressConsistency
Test-Links
Review-CodeDocumentation

# Generate report or apply fixes
if ($Report -or (-not $Fix)) {
    Generate-Report
}

if ($Fix) {
    Write-Host "${Yellow}🔧 Auto-fix functionality not yet implemented${Reset}"
    Write-Host "${Blue}Please review the report and make manual corrections${Reset}"
}

Write-Host "`n${Green}✅ Documentation review complete${Reset}"
Write-Host "${Blue}Total issues found: $($Issues.Count + $Duplicates.Count + $ObsoleteContent.Count)${Reset}"

if ($Issues.Count -gt 0 -or $Duplicates.Count -gt 0 -or $ObsoleteContent.Count -gt 0) {
    exit 1
} else {
    Write-Host "${Green}🎉 No issues found - documentation is clean!${Reset}"
    exit 0
}
