# BudgetBuddy Development System Guide

**Last Updated**: 2026-01-31
**Purpose**: Complete reference for steering, specs, and hooks

---

## Quick Start

### For Kiro (AI Assistant)

**Before any work:**

1. Read `.kiro/steering/` files (HOW to work)
2. Read `.kiro/specs/` files (WHAT to build)
3. Propose plan before coding
4. Validate before committing: `node scripts/validate-for-commit.js`
5. Commit safely: `node scripts/safe-commit-push.js "message"`

### For Developers

**Understanding the system:**

- **Steering** (`.kiro/steering/`) = Rules, standards, tech stack
- **Specs** (`.kiro/specs/`) = Requirements, design, tasks
- **Hooks** (`.kiro/hooks/`) = Automation and validation

---

## Steering Files (HOW to Work)

Located in `.kiro/steering/` - Always active, guide all development:

### 1. `00-global.md` - Workflow Rules

- AWS Well-Architected Framework alignment
- Security baselines (no secrets, least privilege)
- Workflow (propose before coding, validate before commit)
- Autonomous development guidelines
- Testing requirements (TDD, property-based testing)

### 2. `product.md` - Product Vision

- Target users (individual, family, premium)
- Core features (budget setup, transaction tracking)
- Non-functional requirements (performance, security)
- Out of scope (bank integration, investments)
- Success metrics (DAU, MAU, conversion)

### 3. `tech.md` - Technology Stack

- Frontend: React, React Native, TypeScript, Tailwind
- Backend: Node.js Lambda, DynamoDB, Cognito
- Testing: Jest, fast-check, property-based testing
- CI/CD: GitHub Actions
- Code standards: ESLint, naming conventions

### 4. `structure.md` - Code Organization

- Repository layout
- Naming conventions (files, functions, classes)
- Module boundaries (handler → service → repository)
- How to add features end-to-end
- Definition of done

---

## Spec Files (WHAT to Build)

### Root Specs (`.kiro/specs/`)

**Project-wide architecture and requirements:**

1. **`design.md`** - Overall architecture, data models, API design
2. **`requirements.md`** - All user stories and acceptance criteria
3. **`tasks.md`** - Implementation phases and progress tracking

**When to use:** Understanding overall project, tracking progress

### Feature Specs (`.kiro/specs/<feature-name>/`)

**Feature-specific details:**

```
.kiro/specs/<feature-name>/
├── requirements.md    # Feature requirements
├── design.md          # Feature architecture
└── tasks.md           # Feature tasks
```

**When to create:**

- Feature is complex (> 1 week work)
- Requires detailed architecture
- Has 10+ tasks
- Can be developed independently

**Examples:**

- `auth-lambda-refactoring/` - Auth Lambda refactoring
- `hooks-optimization/` - Hooks system optimization
- `multi-currency/` - Currency support

---

## Hook System (WHEN to Act)

### Git Hooks (Mandatory)

Located in `.husky/` - Cannot be bypassed:

1. **pre-commit** - Security, linting, types, docs validation
2. **pre-push** - Security re-validation

### Kiro Hooks (Optional Automation)

Located in `.kiro/hooks/` - Assist development:

**Active Hooks (8 total):**

1. `autonomous-task-executor` - Guide autonomous mode
2. `task-continuation` - Auto-continue to next task
3. `cicd-failure-handler` - Fix CI/CD failures
4. `aws-analysis` - Analyze AWS logs (explicit request)
5. `auto-log-cleanup` - Clean up log files
6. `doc-management-guide` - Guide spec documentation

See `.kiro/hooks/ACTIVE_HOOKS.md` for details.

---

## How They Work Together

```
User Request
    ↓
Kiro reads STEERING (how to work)
    ↓
Kiro reads SPECS (what to build)
    ↓
Kiro proposes plan
    ↓
Kiro implements
    ↓
HOOKS trigger (validation, automation)
    ↓
Git hooks enforce (security, quality)
    ↓
Task complete
```

---

## Validation and Safety

### Before Every Commit

```bash
node scripts/validate-for-commit.js
```

Checks:

- ✅ Security (npm audit, no secrets)
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Documentation (4 mandatory files)

### Safe Commit Workflow

```bash
node scripts/safe-commit-push.js "commit message"
```

- Validates first
- Only commits if all pass
- Never bypasses hooks
- Pushes to develop branch

---

## Autonomous Development

### Setup

Give clear instructions:

```
Work through tasks 1-5 autonomously:
- Implement fully (code + tests + docs)
- Validate: node scripts/validate-for-commit.js
- Commit: node scripts/safe-commit-push.js "feat: [description]"
- Monitor CI/CD
- Continue to next task
```

### What Happens

For each task:

1. Implement feature
2. Validate (security, lint, types, docs)
3. If pass → commit and push
4. If fail → auto-fix and retry (max 3 attempts)
5. Monitor CI/CD
6. Continue to next task

### Safety Mechanisms

- Validation mandatory (no bypass)
- Auto-fix with limits (max 3 attempts)
- CI/CD monitoring
- Audit trail (descriptive commits)
- Documentation required

See `.kiro/AUTONOMOUS_DEVELOPMENT_GUIDE.md` for details.

---

## Common Tasks

### Adding a New Feature

1. Check if feature exists in root specs
2. If complex, create feature spec folder
3. Read steering for HOW to implement
4. Follow spec for WHAT to build
5. Validate and commit

### Working on Existing Feature

1. Read feature spec (`.kiro/specs/<feature>/`)
2. Follow design and requirements
3. Complete tasks in order
4. Update task status
5. Validate and commit

### Tracking Progress

Check `.kiro/specs/tasks.md` for:

- ✅ Complete phases
- 🔧 In-progress phases
- ⏳ Planned phases

---

## Best Practices

### Steering

- Keep global rules minimal
- Be specific with examples
- Update regularly
- Avoid duplication

### Specs

- One feature = one spec folder
- Keep root specs high-level
- Link requirements to tasks
- Update as you go

### Hooks

- Don't over-automate
- Test hooks before relying
- Document triggers clearly
- Monitor performance

### Integration

- Read before writing
- Validate before committing
- Update documentation
- Review hook output

---

## Quick Reference

| System       | Purpose       | Location          | When Used           |
| ------------ | ------------- | ----------------- | ------------------- |
| **Steering** | HOW to work   | `.kiro/steering/` | Always              |
| **Specs**    | WHAT to build | `.kiro/specs/`    | Feature development |
| **Hooks**    | WHEN to act   | `.kiro/hooks/`    | Event-triggered     |

---

## Additional Documentation

- `.kiro/STEERING_HOOKS_EXPLAINED.md` - How steering works with hooks (detailed)
- `.kiro/AUTONOMOUS_DEVELOPMENT_GUIDE.md` - Autonomous workflow details
- `.kiro/hooks/ACTIVE_HOOKS.md` - Hook documentation
- `.kiro/hooks/MIGRATION_GUIDE.md` - Hooks optimization changes
- `.kiro/hooks/CICD_MONITORING_SETUP.md` - CI/CD monitoring setup

---

**System Status**: ✅ Operational
**Last Optimization**: 2026-01-31 (Hooks system streamlined)
