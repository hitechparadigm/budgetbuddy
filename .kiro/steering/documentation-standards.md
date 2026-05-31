---
inclusion: conditional
fileMatchPattern: "{README.md,CHANGELOG.md,DEVELOPMENT_LOG.md,docs/**}"
---

# Documentation Standards

## Mandatory Files (Update Every Commit)

- **CHANGELOG.md**: `## [X.Y.Z] - YYYY-MM-DD` with categorized changes
- **DEVELOPMENT_LOG.md**: `## YYYY-MM-DD - Title (Session X)` with work summary

## Update on Major Changes

- **README.md**: Recent achievements section
- **docs/development-status.md**: Last Updated field + current status

## Code Docs

- JSDoc for public APIs and complex functions
- README per Lambda function and CDK stack
- Inline comments only for non-obvious logic
