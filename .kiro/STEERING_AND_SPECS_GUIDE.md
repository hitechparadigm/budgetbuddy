# BudgetBuddy Steering and Specs Guide

**Last Updated**: 2026-01-31
**Purpose**: Quick reference for Kiro's steering files and project specs

---

## Overview

BudgetBuddy uses a comprehensive steering and spec system to ensure consistent, high-quality development following AWS Well-Architected Framework and best practices.

---

## Steering Files (Always Loaded)

Located in `.kiro/steering/` - These files guide **HOW** Kiro works:

### 1. `00-global.md` - Global Workflow Rules

- **Purpose**: Defines Kiro's role, core principles, and workflow rules
- **Key Content**:
  - AWS Well-Architected Framework alignment
  - Security baselines (no secrets in code, least privilege)
  - Workflow rules (never implement in single step, validate before commit)
  - Autonomous development mode guidelines
  - Interaction guidelines (summarize before coding)

### 2. `product.md` - Product Vision and Requirements

- **Purpose**: Defines what BudgetBuddy is and who it's for
- **Key Content**:
  - Vision and target users (individual, family, premium)
  - Core value proposition (budget setup, transaction tracking)
  - Non-functional requirements (performance, availability, security)
  - Out-of-scope features (bank integration, investments)
  - Success metrics (DAU, MAU, conversion, retention)

### 3. `tech.md` - Technology Stack and Standards

- **Purpose**: Locks in the tech stack and development standards
- **Key Content**:
  - Complete technology stack (React, React Native, Node.js, DynamoDB, CDK)
  - Security baselines (secrets management, IAM, encryption)
  - Testing tooling (Jest, fast-check, property-based testing)
  - CI/CD pipeline (GitHub Actions, validation, deployment)
  - Code quality standards (ESLint, TypeScript, naming conventions)

### 4. `structure.md` - Repository Layout and Conventions

- **Purpose**: Defines where files go and how to organize code
- **Key Content**:
  - Repository layout and folder structure
  - Naming conventions (files, code, AWS resources)
  - Module boundaries (handler → service → repository)
  - How to add features end-to-end
  - Definition of done (code + tests + docs + infra)

---

## Spec Files (What to Build)

Specs define **WHAT** to build and in what order:

### Root-Level Specs (`.kiro/specs/`)

**Overall project architecture and requirements**:

1. **`design.md`** (4597 lines)
   - System architecture and AWS diagrams
   - Data models and database design
   - API design and component architecture
   - Technical stack details
   - Performance and security design

2. **`requirements.md`** (1260 lines)
   - 35+ user stories with acceptance criteria
   - Quality attributes and success metrics
   - Out-of-scope features
   - Technical requirements

3. **`tasks.md`** (Current implementation plan)
   - 26 phases covering all features
   - Task breakdown with definition of done
   - Status tracking (✅ complete, 🔄 in progress, ⏳ planned)
   - Success criteria

### Feature-Specific Specs (`.kiro/specs/<feature-name>/`)

**Detailed specs for specific features**:

#### Example: `auth-lambda-refactoring/`

- **`requirements.md`**: User stories for auth Lambda refactoring
- **`design.md`**: Architecture for splitting monolithic Lambda
- **`tasks.md`**: Step-by-step implementation tasks

**When to create feature specs**:

- Large features requiring detailed planning
- Architectural changes affecting multiple components
- Features with complex requirements or dependencies

---

## How Kiro Uses These Files

### Before Starting Any Work

1. **Read steering files** to understand:
   - How to work (00-global.md)
   - What the product is (product.md)
   - What tech to use (tech.md)
   - Where files go (structure.md)

2. **Read spec files** to understand:
   - Overall architecture (root design.md)
   - All requirements (root requirements.md)
   - Current tasks (root tasks.md)
   - Feature-specific details (feature specs if applicable)

3. **Propose implementation plan** before coding

4. **Validate before committing** using `scripts/validate-for-commit.js`

### During Development

- **Follow patterns** defined in steering files
- **Update specs** when requirements or design changes
- **Mark tasks complete** in tasks.md as work progresses
- **Document changes** in all 4 mandatory docs (README, CHANGELOG, DEVELOPMENT_LOG, development-status)

### For Autonomous Development

- **Use validation scripts** before every commit
- **Follow safety mechanisms** (max 3 retry attempts)
- **Never bypass security** checks with --no-verify
- **Update documentation** for every change

---

## Quick Reference

### When to Update Steering Files

- **product.md**: When product vision, users, or requirements change
- **tech.md**: When adding new technologies or changing standards
- **structure.md**: When changing repository layout or conventions
- **00-global.md**: When changing workflow rules or core principles

### When to Update Spec Files

- **Root design.md**: When overall architecture changes
- **Root requirements.md**: When adding/changing user stories
- **Root tasks.md**: When adding/completing tasks
- **Feature specs**: When working on specific features

### When to Create New Feature Specs

Create a new feature spec folder when:

- Feature is large and complex (> 1 week of work)
- Feature affects multiple components
- Feature requires detailed architectural planning
- Feature has many requirements or dependencies

**Structure**:

```
.kiro/specs/<feature-name>/
├── requirements.md    # User stories and acceptance criteria
├── design.md          # Architecture and technical design
└── tasks.md           # Implementation tasks with definition of done
```

---

## Validation and Safety

### Before Every Commit

Run validation:

```bash
node scripts/validate-for-commit.js
```

This checks:

- ✅ Security (npm audit, no secrets)
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Documentation (all 4 files updated)

### Safe Commit Workflow

Use safe commit script:

```bash
node scripts/safe-commit-push.js "commit message"
```

This:

- Validates first
- Only commits if all checks pass
- Never bypasses hooks
- Pushes to develop branch

---

## Benefits of This System

1. **Consistency**: Kiro always follows the same standards
2. **Quality**: Every change is validated before commit
3. **Efficiency**: Clear guidelines reduce back-and-forth
4. **Safety**: Security checks prevent vulnerable code
5. **Autonomy**: Kiro can work overnight with confidence
6. **Maintainability**: Well-documented architecture and decisions

---

## Current Project Status

**Steering System**: ✅ Complete (4 files)
**Root Specs**: ✅ Complete (design, requirements, tasks)
**Feature Specs**: ✅ 1 active (auth-lambda-refactoring)
**Autonomous Development**: ✅ Operational
**Validation Scripts**: ✅ Working

**Next Steps**:

- Continue implementing tasks from root tasks.md
- Create feature specs for new large features as needed
- Keep steering files updated as project evolves

---

**Document Version**: 1.0
**Maintained By**: Development Team
