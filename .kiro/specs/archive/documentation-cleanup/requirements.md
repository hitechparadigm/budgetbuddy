# Requirements Document

## Introduction

This document defines the requirements for a comprehensive documentation cleanup of the BudgetBuddy codebase. The goal is to audit all markdown documentation files, archive session-specific content, consolidate redundant documentation, delete obsolete files, and review scripts for duplication and obsolescence.

## Glossary

- **Documentation_Auditor**: The system/agent responsible for reviewing and categorizing documentation files
- **Archive_Manager**: The system/agent responsible for moving files to the archive directory
- **Consolidation_Engine**: The system/agent responsible for merging redundant documentation
- **Script_Analyzer**: The system/agent responsible for identifying redundant or obsolete scripts
- **Session_Specific_Document**: A markdown file created during a specific development session that documents temporary state, fixes, or summaries
- **Active_Documentation**: Documentation that is actively maintained and referenced during development
- **Obsolete_Documentation**: Documentation that is no longer relevant or has been superseded

## Requirements

### Requirement 1: Archive Session-Specific Documentation

**User Story:** As a developer, I want session-specific documentation moved to an archive folder, so that the root directory remains clean while preserving historical context.

#### Acceptance Criteria

1. WHEN the Documentation_Auditor identifies a session-specific document THEN the Archive_Manager SHALL move it to `docs/archive/sessions/`
2. WHEN archiving a document THEN the Archive_Manager SHALL preserve the original filename
3. THE Archive_Manager SHALL archive the following root-level files:
   - API_GATEWAY_DEPLOYMENT_FIX.md
   - ARCHITECTURE_REVIEW.md
   - AUTONOMOUS_DEVELOPMENT_DESIGN.md
   - BACKUP_RESTORE_IMPLEMENTATION.md
   - COMPREHENSIVE_HOOK_ANALYSIS.md
   - DOCUMENTATION_ENFORCEMENT_ANALYSIS.md
   - FIXES_APPLIED.md
   - HOOK_ANALYSIS.md
   - SESSION_SUMMARY.md
4. THE Archive_Manager SHALL archive the following .kiro/ files to `docs/archive/kiro/`:
   - STEERING_OPTIMIZATION_COMPLETE.md
   - DEPLOYMENT_FAILURE_SUMMARY.md
   - SESSION_41_SUMMARY.md
   - SESSION_CONTINUITY_UPDATE.md
5. WHEN a file is archived THEN the Documentation_Auditor SHALL NOT delete the original until archive is verified

### Requirement 2: Delete Obsolete Documentation

**User Story:** As a developer, I want obsolete documentation deleted, so that the codebase doesn't contain misleading or outdated information.

#### Acceptance Criteria

1. THE Documentation_Auditor SHALL delete `DOCUMENTATION_AUDIT.md` from root (superseded by this spec)
2. THE Documentation_Auditor SHALL delete `READY_TO_DEPLOY.md` from root (deployment completed)
3. THE Documentation_Auditor SHALL delete `.kiro/DOCUMENTATION_CLEANUP_SUMMARY.md` (obsolete cleanup summary)
4. WHEN deleting a file THEN the Documentation_Auditor SHALL verify the file is truly obsolete
5. IF a file marked for deletion contains unique valuable information THEN the Documentation_Auditor SHALL extract and preserve that information before deletion

### Requirement 3: Consolidate Deployment Documentation

**User Story:** As a developer, I want a single comprehensive deployment guide, so that I don't have to search through multiple files for deployment instructions.

#### Acceptance Criteria

1. THE Consolidation_Engine SHALL merge DEPLOYMENT.md, DEPLOYMENT_INSTRUCTIONS.md, and DEPLOYMENT_INSTRUCTIONS_CICD.md into a single `docs/deployment-guide.md`
2. WHEN consolidating THEN the Consolidation_Engine SHALL preserve all unique information from each source
3. WHEN consolidating THEN the Consolidation_Engine SHALL organize content into logical sections:
   - Prerequisites
   - Quick Start (CI/CD recommended)
   - Manual Deployment
   - Environment Configuration
   - Verification Steps
   - Troubleshooting
   - Rollback Procedures
4. AFTER consolidation THEN the Consolidation_Engine SHALL delete the original three files from root
5. THE Consolidation_Engine SHALL update any references to the old files in other documentation

### Requirement 4: Clean Up .kiro/ Directory Blocker Files

**User Story:** As a developer, I want resolved blocker documentation archived, so that the .kiro/ directory only contains active guides and references.

#### Acceptance Criteria

1. THE Documentation_Auditor SHALL archive `.kiro/FAMILY_LAMBDA_502_BLOCKER.md` to `docs/archive/blockers/` (marked as RESOLVED)
2. THE Documentation_Auditor SHALL keep `.kiro/CLOUDFORMATION_EXPORT_BLOCKER.md` in place (still active blocker)
3. THE Documentation_Auditor SHALL keep `.kiro/SHARED_LAYER_EXPORT_ISSUE.md` in place (still active blocker)
4. WHEN archiving a resolved blocker THEN the Archive_Manager SHALL add a header noting the resolution date
5. THE Documentation_Auditor SHALL keep all active guides in .kiro/:
   - README.md
   - SYSTEM_GUIDE.md
   - AUTONOMOUS_DEVELOPMENT_GUIDE.md
   - STEERING_HOOKS_EXPLAINED.md

### Requirement 5: Review and Document Script Status

**User Story:** As a developer, I want a clear understanding of which scripts are actively used, so that I can safely remove or update obsolete scripts.

#### Acceptance Criteria

1. THE Script_Analyzer SHALL identify redundant security check scripts:
   - security-check.ps1
   - security-check-win.ps1
   - security-check-simple.ps1
   - security-check.sh
2. THE Script_Analyzer SHALL consolidate security scripts to keep only:
   - security-check-win.ps1 (Windows)
   - security-check.sh (Linux/Mac)
3. THE Script_Analyzer SHALL delete redundant security scripts:
   - security-check.ps1 (redundant with security-check-win.ps1)
   - security-check-simple.ps1 (simplified version, not needed)
4. THE Script_Analyzer SHALL identify migration scripts and their status:
   - migrate-budgets-currency.js
   - migrate-transactions-currency.js
   - migrate-user-profiles-currency.js
5. IF migration scripts are still needed THEN the Script_Analyzer SHALL document their purpose in scripts/README.md
6. IF migration scripts are obsolete THEN the Script_Analyzer SHALL delete them
7. THE Script_Analyzer SHALL update scripts/README.md with current script inventory

### Requirement 6: Trim Large Log Files

**User Story:** As a developer, I want log files to remain manageable in size, so that they don't slow down repository operations or become difficult to navigate.

#### Acceptance Criteria

1. THE Documentation_Auditor SHALL archive CHANGELOG.md entries older than 6 months to `docs/archive/changelog-archive.md`
2. THE Documentation_Auditor SHALL archive DEVELOPMENT_LOG.md entries older than 3 months to `docs/archive/development-log-archive.md`
3. WHEN archiving log entries THEN the Archive_Manager SHALL preserve the original format and structure
4. WHEN archiving log entries THEN the Archive_Manager SHALL add a reference in the main file pointing to the archive
5. THE main CHANGELOG.md SHALL retain entries from the last 6 months
6. THE main DEVELOPMENT_LOG.md SHALL retain entries from the last 3 months

### Requirement 7: Update Documentation References

**User Story:** As a developer, I want all documentation references to be accurate, so that I can navigate the documentation without encountering broken links.

#### Acceptance Criteria

1. WHEN a file is moved or deleted THEN the Documentation_Auditor SHALL update all references to that file
2. THE Documentation_Auditor SHALL scan all markdown files for broken internal links
3. IF a broken link is found THEN the Documentation_Auditor SHALL either fix the link or remove it
4. THE Documentation_Auditor SHALL update the main README.md to reflect the new documentation structure
5. THE Documentation_Auditor SHALL update .kiro/README.md to reflect changes in the .kiro/ directory
