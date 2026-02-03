# Steering Files Quick Reference

**Purpose**: Fast lookup for which steering file contains what information

---

## Always-Loaded Files (Core Context)

### `00-global.md` - Workflow & Principles

- Session continuity rules
- Core development workflow
- Autonomous development mode
- Validation and commit workflow
- Security principles
- AWS Well-Architected Framework
- When to ask for help

### `product.md` - Product Context

- Vision and target users
- Core value proposition
- Non-functional requirements
- Business model
- Success metrics
- Critical user journeys

### `tech.md` - Technology Stack

- Frontend stack (React, React Native)
- Backend stack (Lambda, Node.js)
- Data layer (DynamoDB)
- Authentication (Cognito)
- AI/ML (Bedrock)
- Infrastructure (CDK)
- Observability (CloudWatch)
- Security baselines
- Code quality standards

### `structure.md` - Project Structure

- Repository layout
- Naming conventions
- Module boundaries
- How to add a feature
- Definition of done
- Folder structure rules

---

## Conditional Files (Load When Relevant)

### `aws-integration-testing.md`

**Loads when**: Working with `**/*.test.js` files
**Contains**:

- AWS cost limits
- Testing rules and constraints
- AWS profile configuration
- When to test vs when not to test

### `cicd-deployment.md`

**Loads when**: Working with `.github/workflows/**`, `scripts/deploy*`, `scripts/*cicd*`
**Contains**:

- CI/CD monitoring rules
- Deployment workflow
- Failure handling procedures
- Environment configuration
- Critical deployment rules

### `documentation-standards.md`

**Loads when**: Working with `README.md`, `CHANGELOG.md`, `DEVELOPMENT_LOG.md`, `docs/**`
**Contains**:

- Mandatory documentation files
- Update frequency and triggers
- Format requirements
- Code documentation standards
- Architecture documentation
- API documentation

---

## Quick Lookup Table

| Need Information About... | Check This File            | Loads When    |
| ------------------------- | -------------------------- | ------------- |
| Workflow and process      | 00-global.md               | Always        |
| Product requirements      | product.md                 | Always        |
| Technology choices        | tech.md                    | Always        |
| File organization         | structure.md               | Always        |
| AWS testing rules         | aws-integration-testing.md | Editing tests |
| CI/CD procedures          | cicd-deployment.md         | Editing CI/CD |
| Documentation rules       | documentation-standards.md | Editing docs  |

---

## Hook Reference

| Hook Name                | Trigger       | Purpose                      | Token Cost  |
| ------------------------ | ------------- | ---------------------------- | ----------- |
| autonomous-task-executor | agentStop     | Guide autonomous development | ~200 tokens |
| cicd-failure-handler     | userTriggered | Fix CI/CD failures           | ~100 tokens |
| aws-analysis             | userTriggered | Analyze AWS logs             | ~150 tokens |
| auto-log-cleanup         | fileCreated   | Clean temp logs              | ~50 tokens  |
| doc-management-guide     | fileCreated   | Guide spec documentation     | ~100 tokens |
| update-user-journeys     | agentStop     | Update user journey docs     | ~150 tokens |

---

## Token Budget Per Interaction

**Typical interaction** (non-specialized):

- Core steering: ~2,700 tokens
- Hook prompts: ~200 tokens (if triggered)
- **Total**: ~2,900 tokens

**Specialized interaction** (e.g., writing tests):

- Core steering: ~2,700 tokens
- Conditional steering: ~200 tokens (aws-integration-testing.md)
- Hook prompts: ~200 tokens (if triggered)
- **Total**: ~3,100 tokens

**Savings vs old approach**: 35-40% per interaction

---

## When to Add New Steering Files

### Add to Always-Loaded

- Core principles that apply to ALL code
- Fundamental workflows used in every task
- Critical security or compliance rules

### Add as Conditional

- Domain-specific rules (API design, database patterns)
- Technology-specific guidelines (React patterns, Lambda best practices)
- Workflow-specific procedures (deployment, testing, monitoring)

### Add as Manual

- Troubleshooting guides
- Migration procedures
- Rarely-used advanced techniques
- Historical context or decisions

---

## Pattern Matching Examples

### Good Patterns (Specific)

```yaml
# Loads only for test files
fileMatchPattern: "**/*.test.js"

# Loads only for CI/CD files
fileMatchPattern: "{.github/workflows/**,scripts/deploy*,scripts/*cicd*}"

# Loads only for documentation
fileMatchPattern: "{README.md,CHANGELOG.md,DEVELOPMENT_LOG.md,docs/**}"
```

### Bad Patterns (Too Broad)

```yaml
# Would load for almost everything
fileMatchPattern: "**/*"

# Would load for any file with "test" in name
fileMatchPattern: "*test*"
```

---

## Maintenance Checklist

### Monthly

- [ ] Review token usage in practice
- [ ] Check if conditional files load appropriately
- [ ] Identify content that could move to conditional files

### Quarterly

- [ ] Review steering file sizes
- [ ] Archive obsolete content
- [ ] Update patterns based on new file types
- [ ] Consolidate duplicate information

### When Adding Features

- [ ] Update relevant steering files
- [ ] Consider if new conditional file needed
- [ ] Update this quick reference if structure changes

---

## Troubleshooting

### "Steering file not loading when expected"

1. Check frontmatter syntax (YAML must be valid)
2. Verify fileMatchPattern matches your file path
3. Test pattern with glob tester
4. Check file is in `.kiro/steering/` directory

### "Too many tokens being used"

1. Check which files are always-loaded
2. Move specialized content to conditional files
3. Narrow fileMatchPattern to be more specific
4. Consider manual inclusion for rarely-used content

### "Missing context when working on task"

1. Check if relevant conditional file exists
2. Verify fileMatchPattern includes your file type
3. Temporarily reference file manually with #filename
4. Consider broadening pattern or moving to always-loaded

---

**Last Updated**: 2026-02-02
**See Also**: `.kiro/STEERING_OPTIMIZATION_SUMMARY.md` for detailed analysis
