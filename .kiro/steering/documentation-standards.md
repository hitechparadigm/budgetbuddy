---
inclusion: conditional
fileMatchPattern: "{README.md,CHANGELOG.md,DEVELOPMENT_LOG.md,docs/**}"
---

# Documentation Standards

**ONLY load when working with documentation files**

## Mandatory Files (Must Update on Every Commit)

1. **README.md** - Project overview, recent achievements
2. **CHANGELOG.md** - Version history with semantic versioning
3. **DEVELOPMENT_LOG.md** - Daily development progress
4. **docs/development-status.md** - Current status and next steps

## When to Update

- **README.md**: Major features, status changes
- **CHANGELOG.md**: Every commit (version entry)
- **DEVELOPMENT_LOG.md**: Every session (with summary)
- **development-status.md**: Progress updates, blockers

## Format Requirements

- Use emojis for categories (🔒🔧🐛🚀🤖)
- Include technical details and impact
- Follow established patterns
- Keep consistent structure

## Code Documentation

- **JSDoc**: For public APIs and complex functions
- **README**: Per Lambda function, per CDK stack
- **Inline Comments**: Only for non-obvious logic

## Architecture Documentation

- **Diagrams**: Text-based (Mermaid or PlantUML)
- **ADRs**: Architecture Decision Records in `docs/`
- **Runbooks**: Operational procedures in `docs/`

## API Documentation

- **Format**: OpenAPI 3.0 (future)
- **Location**: `docs/api-endpoints.md`
- **Examples**: Request/response samples
