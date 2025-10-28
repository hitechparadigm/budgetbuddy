#!/usr/bin/env pwsh

<#
.SYNOPSIS
    BudgetBuddy Mandatory Documentation Update Script

.DESCRIPTION
    Automatically updates all required documentation files with current session information.
    This script MUST be run before every commit to ensure documentation compliance.

.PARAMETER SessionSummary
    Brief summary of what was accomplished in this session

.PARAMETER Progress
    Current overall progress percentage (0-100)

.PARAMETER Issues
    Array of issues resolved in this session

.PARAMETER Features
    Array of features completed in this session

.EXAMPLE
    ./scripts/update-docs.ps1 -SessionSummary "API troubleshooting resolution" -Progress 75 -Features @("Budget API fix", "Lambda layer rebuild")
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SessionSummary,

    [Parameter(Mandatory=$true)]
    [int]$Progress,

    [string[]]$Issues = @(),
    [string[]]$Features = @(),
    [string[]]$LessonsLearned = @()
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Purple = "`e[35m"
$Reset = "`e[0m"

$CurrentDate = Get-Date -Format "yyyy-MM-dd"
$CurrentDateTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "${Purple}📝 BudgetBuddy Documentation Auto-Update${Reset}" -ForegroundColor Magenta
Write-Host "Session: $SessionSummary" -ForegroundColor Cyan
Write-Host "Progress: $Progress%" -ForegroundColor Green
Write-Host "Date: $CurrentDate" -ForegroundColor Blue

function Update-Changelog {
    Write-Host "${Blue}📋 Updating CHANGELOG.md...${Reset}"

    $changelogPath = "CHANGELOG.md"
    $content = Get-Content $changelogPath -Raw

    # Create new version entry
    $newVersion = "## [Development Update] - $CurrentDate`n`n"
    $newVersion += "### Session Summary`n"
    $newVersion += "- $SessionSummary`n`n"

    if ($Features.Count -gt 0) {
        $newVersion += "### Features Completed`n"
        foreach ($feature in $Features) {
            $newVersion += "- ✅ $feature`n"
        }
        $newVersion += "`n"
    }

    if ($Issues.Count -gt 0) {
        $newVersion += "### Issues Resolved`n"
        foreach ($issue in $Issues) {
            $newVersion += "- 🔧 $issue`n"
        }
        $newVersion += "`n"
    }

    if ($LessonsLearned.Count -gt 0) {
        $newVersion += "### Lessons Learned`n"
        foreach ($lesson in $LessonsLearned) {
            $newVersion += "- 📚 $lesson`n"
        }
        $newVersion += "`n"
    }

    $newVersion += "### Progress Update`n"
    $newVersion += "- Overall Progress: $Progress% complete`n"
    $newVersion += "- Last Updated: $CurrentDateTime`n`n"

    # Insert after "## [Unreleased]"
    $updatedContent = $content -replace "(## \[Unreleased\])", "`$1`n`n$newVersion"

    $updatedContent | Out-File -FilePath $changelogPath -Encoding UTF8 -NoNewline
    Write-Host "${Green}✅ CHANGELOG.md updated${Reset}"
}

function Update-DevelopmentLog {
    Write-Host "${Blue}📋 Updating DEVELOPMENT_LOG.md...${Reset}"

    $devLogPath = "DEVELOPMENT_LOG.md"
    $content = Get-Content $devLogPath -Raw

    # Create new session entry
    $newEntry = "### 🎯 Session: $CurrentDate - $SessionSummary`n`n"

    if ($Features.Count -gt 0) {
        $newEntry += "#### ✅ Accomplishments`n"
        foreach ($feature in $Features) {
            $newEntry += "- **$feature**: Completed successfully`n"
        }
        $newEntry += "`n"
    }

    if ($Issues.Count -gt 0) {
        $newEntry += "#### 🔧 Issues Resolved`n"
        $issueCounter = 1
        foreach ($issue in $Issues) {
            $newEntry += "$issueCounter. **$issue**`n"
            $newEntry += "   - **Issue**: [Detailed description needed]`n"
            $newEntry += "   - **Root Cause**: [Analysis needed]`n"
            $newEntry += "   - **Resolution**: [Solution applied]`n"
            $newEntry += "   - **Lesson**: [Key takeaway]`n"
            $newEntry += "   - **Prevention**: [How to avoid in future]`n"
            $newEntry += "   - **Time Impact**: [Duration to resolve]`n`n"
            $issueCounter++
        }
    }

    if ($LessonsLearned.Count -gt 0) {
        $newEntry += "#### 📚 Lessons Learned`n"
        $lessonCounter = 1
        foreach ($lesson in $LessonsLearned) {
            $newEntry += "$lessonCounter. **$lesson**`n"
            $newEntry += "   - **Context**: [What we were trying to accomplish]`n"
            $newEntry += "   - **Discovery**: [What we learned]`n"
            $newEntry += "   - **Application**: [How to apply this lesson]`n"
            $newEntry += "   - **Impact**: [How this affects future development]`n`n"
            $lessonCounter++
        }
    }

    $newEntry += "#### 📊 Progress Metrics`n"
    $newEntry += "- **Overall MVP Progress**: $Progress% (updated from previous session)`n"
    $newEntry += "- **Session Date**: $CurrentDateTime`n`n"

    # Find insertion point (after "## Current Focus" or similar)
    $insertionPoint = $content.IndexOf("## Current Focus")
    if ($insertionPoint -eq -1) {
        # If not found, insert after first major heading
        $insertionPoint = $content.IndexOf("`n## ")
    }

    if ($insertionPoint -ne -1) {
        $beforeInsertion = $content.Substring(0, $insertionPoint)
        $afterInsertion = $content.Substring($insertionPoint)
        $updatedContent = $beforeInsertion + "`n" + $newEntry + $afterInsertion
    } else {
        # Append to end if no good insertion point found
        $updatedContent = $content + "`n`n" + $newEntry
    }

    $updatedContent | Out-File -FilePath $devLogPath -Encoding UTF8 -NoNewline
    Write-Host "${Green}✅ DEVELOPMENT_LOG.md updated${Reset}"
}

function Update-ReadMe {
    Write-Host "${Blue}📋 Updating README.md...${Reset}"

    $readmePath = "README.md"
    $content = Get-Content $readmePath -Raw

    # Update progress percentage
    $updatedContent = $content -replace "~\d+% complete", "~$Progress% complete"

    # Update recent achievements if features were completed
    if ($Features.Count -gt 0) {
        $achievementsSection = "### Recent Achievements`n"
        foreach ($feature in $Features) {
            $achievementsSection += "- ✅ **$feature**: Completed in latest session`n"
        }

        # Replace existing achievements section
        $updatedContent = $updatedContent -replace "### Recent Achievements[^#]*", $achievementsSection
    }

    $updatedContent | Out-File -FilePath $readmePath -Encoding UTF8 -NoNewline
    Write-Host "${Green}✅ README.md updated${Reset}"
}

function Update-DevelopmentStatus {
    Write-Host "${Blue}📋 Updating docs/development-status.md...${Reset}"

    $statusPath = "docs/development-status.md"
    $content = Get-Content $statusPath -Raw

    # Update overall progress
    $updatedContent = $content -replace "Overall MVP Progress: ~?\d+%", "Overall MVP Progress: $Progress%"

    # Update last updated date
    $updatedContent = $updatedContent -replace "Last Updated: [^`n]*", "Last Updated: $CurrentDate"

    # Add recent fixes section if issues were resolved
    if ($Issues.Count -gt 0) {
        $fixesSection = "## 🔧 Recent Fixes ($CurrentDate)`n"
        foreach ($issue in $Issues) {
            $fixesSection += "- **$issue**: Resolved in latest session`n"
        }
        $fixesSection += "`n"

        # Insert before existing recent fixes or at end
        $insertPoint = $content.IndexOf("## 🔧 Recent Fixes")
        if ($insertPoint -ne -1) {
            $beforeFixes = $content.Substring(0, $insertPoint)
            $updatedContent = $beforeFixes + $fixesSection
        } else {
            $updatedContent = $updatedContent + "`n" + $fixesSection
        }
    }

    $updatedContent | Out-File -FilePath $statusPath -Encoding UTF8 -NoNewline
    Write-Host "${Green}✅ docs/development-status.md updated${Reset}"
}

function Run-DocumentationReview {
    Write-Host "${Blue}🔍 Running documentation review...${Reset}"

    if (Test-Path "scripts/doc-review.ps1") {
        & "./scripts/doc-review.ps1" -Report
        if ($LASTEXITCODE -ne 0) {
            Write-Host "${Yellow}⚠️ Documentation review found issues - please review and fix${Reset}"
        }
    }
}

# Main execution
Write-Host "${Purple}Starting mandatory documentation update...${Reset}"

try {
    Update-Changelog
    Update-DevelopmentLog
    Update-ReadMe
    Update-DevelopmentStatus

    Write-Host "`n${Blue}🔍 Running documentation consistency check...${Reset}"
    Run-DocumentationReview

    Write-Host "`n${Green}✅ All documentation files updated successfully${Reset}"
    Write-Host "${Blue}📋 Summary of updates:${Reset}"
    Write-Host "  - CHANGELOG.md: Added session entry with $($Features.Count) features, $($Issues.Count) issues"
    Write-Host "  - DEVELOPMENT_LOG.md: Added detailed session log"
    Write-Host "  - README.md: Updated progress to $Progress%"
    Write-Host "  - development-status.md: Updated metrics and recent fixes"

    Write-Host "`n${Purple}📝 Next steps:${Reset}"
    Write-Host "1. Review the updated documentation for accuracy"
    Write-Host "2. Add any missing details to the DEVELOPMENT_LOG.md entries"
    Write-Host "3. Verify all progress percentages are consistent"
    Write-Host "4. Commit the documentation updates"

} catch {
    Write-Host "${Red}❌ Error updating documentation: $($_.Exception.Message)${Reset}"
    exit 1
}

Write-Host "`n${Green}🎉 Documentation update complete!${Reset}"
