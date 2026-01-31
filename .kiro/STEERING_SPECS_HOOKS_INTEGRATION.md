# Steering, Specs, and Hooks Integration Guide

**Last Updated**: 2026-01-31
**Purpose**: Comprehensive guide to understanding how steering files, specs, and hooks work together in BudgetBuddy

---

## Table of Contents

1. [Overview](#overview)
2. [Steering System](#steering-system)
3. [Spec System](#spec-system)
4. [Hook System](#hook-system)
5. [How They Work Together](#how-they-work-together)
6. [Practical Examples](#practical-examples)
7. [Best Practices](#best-practices)

---

## Overview

BudgetBuddy uses three complementary systems to guide development:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT GUIDANCE SYSTEM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   STEERING      │  │     SPECS       │  │     HOOKS       │ │
│  │   (How to)      │  │   (What to)     │  │   (When to)     │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ • Global rules  │  │ • Requirements  │  │ • Git hooks     │ │
│  │ • Tech stack    │  │ • Design docs   │  │ • Kiro hooks    │ │
│  │ • Architecture  │  │ • Task lists    │  │ • Automation    │ │
│  │ • Standards     │  │ • Acceptance    │  │ • Validation    │ │
│  │ • Best practice │  │ • Criteria      │  │ • Monitoring    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           ↓                    ↓                    ↓           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              KIRO (AI Development Assistant)                │ │
│  │  Reads steering → Follows specs → Triggered by hooks       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principle**:

- **Steering** tells Kiro **HOW** to work (methodology, standards, patterns)
- **Specs** tell Kiro **WHAT** to build (requirements, design, tasks)
- **Hooks** tell Kiro **WHEN** to act (triggers, automation, validation)

---

## Steering System

### What is Steering?

Steering files are **always-active guidance documents** that Kiro reads before every action. They define:

- How to write code
- What technologies to use
- What patterns to follow
- What standards to maintain

### Location and Structure

```
.kiro/steering/
├── 00-global.md          # Global rules (highest priority)
├── product.md            # Product vision and requirements
├── tech.md               # Technology stack and decisions
└── structure.md          # Code organization and patterns
```

### Steering File Types

#### 1. Global Steering (`00-global.md`)

**Purpose**: Overarching rules that apply to ALL development

**Contains**:

- Workflow rules (never implement in single step)
- Testing requirements (TDD, validation)
- Security mandates (no secrets in code)
- Documentation requirements (4 mandatory files)
- AWS alignment principles

**Example Rule**:

```markdown
### 1. Never Implement in a Single Step

Before writing any code:

1. Read steering files
2. Read spec files
3. Propose implementation plan
4. Get confirmation
5. Only then generate code
```

#### 2. Product Steering (`product.md`)

**Purpose**: Product vision, user needs, business constraints

**Contains**:

- Target users and personas
- Core value proposition
- Non-functional requirements (performance, security)
- Out of scope features
- Success metrics

**Example**:

```markdown
## Core Value Proposition

### What Must Work Flawlessly

1. Budget Setup
   - AI-powered budget generation
   - Zero-based budgeting
   - Category customization
```

#### 3. Technology Steering (`tech.md`)

**Purpose**: Technology stack, tools, and technical decisions

**Contains**:

- Frontend stack (React, TypeScript, Tailwind)
- Backend stack (Lambda, DynamoDB, Cognito)
- Testing tools (Jest, fast-check)
- CI/CD pipeline (GitHub Actions)
- Dependency management rules

**Example**:

```markdown
## Technology Stack

### Backend Stack

**API Layer:**

- Runtime: Node.js 20.x
- Framework: AWS Lambda (serverless)
- Language: JavaScript (ES2022)
```

#### 4. Structure Steering (`structure.md`)

**Purpose**: Code organization, file structure, naming conventions

**Contains**:

- Repository layout
- Naming conventions (files, functions, classes)
- Module boundaries
- How to add new features
- Definition of done

**Example**:

```markdown
## Naming Conventions

### Files and Directories

**Backend (Lambda Functions):**

- Function Directory: `backend/functions/<function-name>/`
- Handler File: `index.js` (entry point)
- Test File: `<name>.test.js`
```

### How Steering Works

1. **Always Active**: Kiro reads steering files before EVERY action
2. **Hierarchical**: Global rules override specific rules when conflicts exist
3. **Contextual**: Kiro applies relevant steering based on task type
4. **Persistent**: Steering persists across all sessions

**Example Flow**:

```
User: "Add a new Lambda function for budget export"
  ↓
Kiro reads:
  - 00-global.md (workflow, testing, security)
  - tech.md (Lambda, Node.js, AWS SDK)
  - structure.md (function structure, naming)
  ↓
Kiro proposes:
  "I'll create backend/functions/export/ with:
   - index.js (handler)
   - service.js (business logic)
   - repository.js (DynamoDB access)
   - export.test.js (tests)
   Following Lambda layer pattern from structure.md"
```

---

## Spec System

### What are Specs?

Specs are **feature-specific documents** that define WHAT to build. They contain:

- Requirements (user stories, acceptance criteria)
- Design (architecture, data models, API design)
- Tasks (implementation checklist with definition of done)

### Location and Structure

```
.kiro/specs/
├── design.md                          # Root: Overall project design
├── requirements.md                    # Root: Overall project requirements
├── tasks.md                           # Root: Overall project tasks
└── <feature-name>/                    # Feature-specific specs
    ├── design.md                      # Feature design
    ├── requirements.md                # Feature requirements
    └── tasks.md                       # Feature tasks
```

### Root Specs vs Feature Specs

#### Root Specs (`.kiro/specs/`)

**Purpose**: Overall project architecture and high-level requirements

**When to Use**:

- Initial project setup
- Cross-cutting concerns (auth, database, infrastructure)
- Global architecture decisions
- Project-wide requirements

**Example** (from `.kiro/specs/requirements.md`):

```markdown
### Requirement 1: User Authentication

**User Story:** As a user, I want to securely register and log in...

#### Acceptance Criteria

1. WHEN a user accesses the application, THE BudgetBuddy SHALL display login/register
2. THE BudgetBuddy SHALL collect email and password for registration
   ...
```

#### Feature Specs (`.kiro/specs/<feature-name>/`)

**Purpose**: Specific feature implementation details

**When to Use**:

- New feature development
- Major refactoring of existing features
- Complex features requiring detailed design
- Features with multiple sub-tasks

**Example** (from `.kiro/specs/auth-lambda-refactoring/`):

```
.kiro/specs/auth-lambda-refactoring/
├── design.md          # How to refactor auth Lambda
├── requirements.md    # Why refactor, what to achieve
└── tasks.md           # Step-by-step refactoring tasks
```

### Spec File Types

#### 1. Requirements Document (`requirements.md`)

**Purpose**: Define WHAT needs to be built and WHY

**Contains**:

- User stories
- Acceptance criteria
- Success metrics
- Out of scope items

**Format**:

```markdown
### Requirement X: Feature Name

**User Story:** As a [user type], I want [goal], so that [benefit]

#### Acceptance Criteria

1. WHEN [condition], THE System SHALL [behavior]
2. THE System SHALL [requirement]
   ...
```

#### 2. Design Document (`design.md`)

**Purpose**: Define HOW to build the feature

**Contains**:

- Architecture diagrams
- Data models
- API design
- Component structure
- Technical decisions

**Format**:

````markdown
## Architecture

### High-Level Architecture

[Diagram]

## Data Models

### Entity Name

```typescript
interface Entity {
  field: type;
}
```
````

## API Design

### Endpoint Name

```
POST /api/endpoint
Request: { ... }
Response: { ... }
```

````

#### 3. Tasks Document (`tasks.md`)

**Purpose**: Define implementation checklist

**Contains**:
- Ordered task list
- Sub-tasks
- Definition of done
- Dependencies
- Status tracking

**Format**:
```markdown
## Tasks

### Phase 1: Foundation

- [ ] 1. Task Name
  - [ ] 1.1 Sub-task
  - [ ] 1.2 Sub-task
  - Requirements: X.1-X.5

- [x] 2. Completed Task
  - ✅ All sub-tasks done
````

### How Specs Work

1. **Feature-Driven**: Each major feature gets its own spec folder
2. **Hierarchical**: Root specs for project-wide, feature specs for specific features
3. **Referenced**: Kiro reads relevant specs before implementing tasks
4. **Versioned**: Specs evolve with the project

**Example Flow**:

```
User: "Implement task 3.2 from auth-lambda-refactoring spec"
  ↓
Kiro reads:
  - .kiro/specs/auth-lambda-refactoring/requirements.md (why)
  - .kiro/specs/auth-lambda-refactoring/design.md (how)
  - .kiro/specs/auth-lambda-refactoring/tasks.md (what)
  ↓
Kiro implements:
  - Follows design patterns from design.md
  - Validates against acceptance criteria from requirements.md
  - Updates task status in tasks.md
```

---

## Hook System

### What are Hooks?

Hooks are **event-triggered automations** that tell Kiro WHEN to act. They:

- Trigger on specific events (file changes, commits, agent actions)
- Automate repetitive tasks
- Enforce quality gates
- Monitor and validate

### Location and Structure

```
.kiro/hooks/                           # Kiro hooks (optional automation)
├── ACTIVE_HOOKS.md                    # Hook documentation
├── autonomous-task-executor.kiro.hook # Autonomous development
├── post-task-validation.kiro.hook     # Validation after tasks
└── ...

.husky/                                # Git hooks (mandatory validation)
├── pre-commit                         # Security, linting, types, docs
└── pre-push                           # Security re-validation
```

### Hook Types

#### 1. Git Hooks (Mandatory)

**Purpose**: Enforce quality gates before commits/pushes

**Location**: `.husky/`

**Hooks**:

- **pre-commit**: Security, linting, type checking, documentation
- **pre-push**: Security re-validation, documentation enforcement

**Cannot be bypassed** (well, technically can with `--no-verify`, but DON'T!)

**Example** (`.husky/pre-commit`):

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run validation script
node scripts/validate-for-commit.js

# Exit with validation result
exit $?
```

#### 2. Kiro Hooks (Optional Automation)

**Purpose**: Assist development with automation and monitoring

**Location**: `.kiro/hooks/`

**Hook Categories**:

**A. Autonomous Development Hooks**:

- `autonomous-task-executor.kiro.hook` - Orchestrates overnight development
- `post-task-validation.kiro.hook` - Validates after each task
- `validation-failure-handler.kiro.hook` - Auto-fixes validation failures
- `cicd-failure-handler.kiro.hook` - Auto-fixes CI/CD failures

**B. Monitoring Hooks**:

- `monitor-cicd-pipeline.kiro.hook` - Watches GitHub Actions
- `aws-logs-analyzer.kiro.hook` - Analyzes AWS CloudWatch logs
- `manual-aws-analysis.kiro.hook` - On-demand AWS analysis

**C. Quality Hooks**:

- `architecture-review-simplified.kiro.hook` - Reviews code changes
- `doc-management-guide.kiro.hook` - Guides documentation

**D. Utility Hooks**:

- `auto-log-cleanup.kiro.hook` - Cleans temporary files

### Hook Trigger Types

```typescript
type HookTrigger =
  | "fileEdited" // When user saves a file
  | "fileCreated" // When user creates a file
  | "fileDeleted" // When user deletes a file
  | "userTriggered" // When user manually triggers
  | "promptSubmit" // When user sends message to Kiro
  | "agentStop"; // When Kiro completes a task
```

### Hook Action Types

```typescript
type HookAction =
  | "askAgent" // Send message to Kiro
  | "runCommand"; // Execute shell command
```

### Hook Structure

```json
{
  "name": "Hook Name",
  "version": "1.0.0",
  "description": "What this hook does",
  "when": {
    "type": "fileEdited",
    "patterns": ["*.ts", "*.tsx"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Review the changes for security issues"
  }
}
```

### How Hooks Work

1. **Event-Driven**: Hooks trigger on specific events
2. **Conditional**: Hooks can filter by file patterns
3. **Actionable**: Hooks execute commands or ask Kiro
4. **Composable**: Multiple hooks can trigger on same event

**Example Flow**:

```
User saves backend/functions/auth/index.js
  ↓
Triggers: architecture-review-simplified.kiro.hook
  ↓
Hook checks: File matches "backend/**/*.js"
  ↓
Hook action: askAgent("Review for security and best practices")
  ↓
Kiro analyzes: Checks against steering rules
  ↓
Kiro responds: "Code looks good, follows Lambda layer pattern"
```

---

## How They Work Together

### The Complete Development Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INITIATES TASK                           │
│  "Implement user authentication with Google Sign-In"            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    KIRO READS STEERING                           │
│  • 00-global.md: Workflow rules, testing, security              │
│  • tech.md: AWS Cognito, OAuth 2.0, JWT tokens                  │
│  • structure.md: Auth Lambda structure, naming                  │
│  • product.md: Security requirements, user experience           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    KIRO READS SPECS                              │
│  • .kiro/specs/requirements.md: Requirement 1 (Auth)            │
│  • .kiro/specs/design.md: Auth architecture, Cognito setup      │
│  • .kiro/specs/tasks.md: Task 1 (User Authentication System)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    KIRO PROPOSES PLAN                            │
│  "I'll implement Google Sign-In by:                             │
│   1. Creating auth Lambda with OAuth flow                       │
│   2. Integrating AWS Cognito                                    │
│   3. Adding JWT token management                                │
│   4. Writing tests (Jest + property-based)                      │
│   5. Updating documentation"                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    KIRO IMPLEMENTS                               │
│  • Follows structure.md patterns                                │
│  • Uses tech.md stack (Cognito, Lambda, Node.js)                │
│  • Meets requirements.md acceptance criteria                    │
│  • Completes tasks.md checklist                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    HOOKS TRIGGER                                 │
│  • fileEdited: architecture-review-simplified.kiro.hook         │
│    → Kiro reviews code for security and best practices          │
│  • agentStop: post-task-validation.kiro.hook                    │
│    → Runs validation script                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION                                    │
│  • Runs: node scripts/validate-for-commit.js                    │
│  • Checks: Security, linting, types, docs                       │
│  • Result: ✅ All checks passed                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    GIT HOOKS ENFORCE                             │
│  • pre-commit: Validates before commit                          │
│  • pre-push: Re-validates before push                           │
│  • Result: ✅ Commit allowed                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TASK COMPLETE                                 │
│  • Code committed and pushed                                    │
│  • Documentation updated                                        │
│  • Task marked complete in tasks.md                             │
│  • CI/CD pipeline triggered                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

#### 1. Steering → Specs

**Relationship**: Steering defines HOW to implement specs

**Example**:

- **Spec says**: "Implement user authentication" (WHAT)
- **Steering says**: "Use AWS Cognito, JWT tokens, Lambda layers" (HOW)

#### 2. Specs → Hooks

**Relationship**: Hooks automate spec execution

**Example**:

- **Spec says**: "Complete task 3.2" (WHAT)
- **Hook says**: "After task complete, validate and commit" (WHEN)

#### 3. Steering → Hooks

**Relationship**: Hooks enforce steering rules

**Example**:

- **Steering says**: "All commits must pass security validation" (RULE)
- **Hook says**: "Run security check before every commit" (ENFORCEMENT)

---

## Practical Examples

### Example 1: Adding a New Feature

**Scenario**: Add budget export functionality

**Step 1: Check Steering**

```
User: "I want to add CSV export for budgets"
  ↓
Kiro reads:
  - 00-global.md: "Never implement in single step, propose plan first"
  - tech.md: "Use Node.js, AWS Lambda, S3 for file storage"
  - structure.md: "Create backend/functions/export/"
```

**Step 2: Check Specs**

```
Kiro checks:
  - .kiro/specs/requirements.md: Requirement 26 (Data Export)
  - .kiro/specs/design.md: Export API design
  - .kiro/specs/tasks.md: Task 24 (Data Export System)
```

**Step 3: Propose Plan**

```
Kiro proposes:
  "I'll implement CSV export by:
   1. Creating backend/functions/export/ Lambda
   2. Adding /export/csv endpoint to API Gateway
   3. Implementing CSV generation logic
   4. Storing exports in S3 bucket
   5. Adding export button to web UI
   6. Writing tests (unit + integration)
   7. Updating documentation"
```

**Step 4: Implement with Hook Automation**

```
Kiro implements → Hooks trigger:
  - fileEdited: architecture-review-simplified.kiro.hook
    → Reviews Lambda code for best practices
  - agentStop: post-task-validation.kiro.hook
    → Runs validation script
  - pre-commit: Git hook
    → Enforces security and documentation
```

### Example 2: Autonomous Overnight Development

**Scenario**: Complete 5 tasks autonomously

**Setup**:

```
User (10 PM): "Work through tasks 1-5 in auth-lambda-refactoring spec autonomously"
```

**Execution**:

```
For each task:
  1. Kiro reads steering (00-global.md, tech.md, structure.md)
  2. Kiro reads spec (.kiro/specs/auth-lambda-refactoring/)
  3. Kiro implements task
  4. Hook triggers: post-task-validation.kiro.hook
     → Runs: node scripts/validate-for-commit.js
  5. If validation passes:
     → Commits: node scripts/safe-commit-push.js "feat: task X"
     → Git hooks enforce: pre-commit, pre-push
  6. If validation fails:
     → Hook triggers: validation-failure-handler.kiro.hook
     → Auto-fixes and retries (max 3 attempts)
  7. Hook triggers: monitor-cicd-pipeline.kiro.hook
     → Watches GitHub Actions deployment
  8. If CI/CD fails:
     → Hook triggers: cicd-failure-handler.kiro.hook
     → Analyzes logs, fixes, re-commits
  9. Move to next task
```

**Morning**:

```
User (8 AM): Checks git log
  → Sees 5 commits, all validated and deployed
  → Reviews changes if needed
```

### Example 3: Security Enforcement

**Scenario**: Prevent committing secrets

**Flow**:

```
Developer accidentally adds AWS key to code
  ↓
Saves file
  ↓
Hook triggers: architecture-review-simplified.kiro.hook
  → Kiro: "Warning: Potential secret detected"
  ↓
Developer attempts commit
  ↓
Git hook: pre-commit
  → Runs: node scripts/validate-for-commit.js
  → Security check: FAIL (secret detected)
  → Commit blocked
  ↓
Developer removes secret, uses environment variable
  ↓
Commits again
  ↓
Git hook: pre-commit
  → Security check: PASS
  → Commit allowed
```

---

## Best Practices

### Steering Best Practices

1. **Keep Global Rules Minimal**: Only add rules that apply to ALL development
2. **Be Specific**: Provide concrete examples, not vague guidelines
3. **Update Regularly**: Keep steering current with project evolution
4. **Avoid Duplication**: Don't repeat rules across multiple steering files
5. **Prioritize**: Use numbering (00-global.md) to indicate precedence

### Spec Best Practices

1. **One Feature, One Spec Folder**: Don't mix multiple features in one spec
2. **Keep Root Specs High-Level**: Use root specs for project-wide concerns only
3. **Link Requirements to Tasks**: Reference requirement numbers in tasks
4. **Update as You Go**: Keep specs current with implementation
5. **Use Acceptance Criteria**: Make requirements testable and verifiable

### Hook Best Practices

1. **Don't Over-Automate**: Hooks should assist, not replace human judgment
2. **Test Hooks**: Verify hooks work as expected before relying on them
3. **Document Triggers**: Clearly explain when and why hooks trigger
4. **Provide Escape Hatches**: Allow manual override when needed
5. **Monitor Hook Performance**: Ensure hooks don't slow down development

### Integration Best Practices

1. **Read Before Writing**: Always check steering and specs before coding
2. **Validate Before Committing**: Use validation scripts, don't bypass hooks
3. **Update Documentation**: Keep all 4 mandatory docs current
4. **Review Hook Output**: Don't ignore hook warnings and suggestions
5. **Iterate**: Improve steering, specs, and hooks based on experience

---

## Summary

### Quick Reference

| System       | Purpose       | Location                  | When Used             |
| ------------ | ------------- | ------------------------- | --------------------- |
| **Steering** | HOW to work   | `.kiro/steering/`         | Always (every action) |
| **Specs**    | WHAT to build | `.kiro/specs/`            | Feature development   |
| **Hooks**    | WHEN to act   | `.kiro/hooks/`, `.husky/` | Event-triggered       |

### Key Takeaways

1. **Steering is Always Active**: Kiro reads steering before every action
2. **Specs are Feature-Specific**: Root specs for project, feature specs for features
3. **Hooks are Event-Driven**: Automate repetitive tasks and enforce quality
4. **They Work Together**: Steering guides, specs define, hooks enforce
5. **Hierarchy Matters**: Global steering > Feature specs > Hook automation

### Common Questions

**Q: When should I create a new spec folder?**
A: When adding a major feature that requires detailed design and multiple tasks.

**Q: Can I disable hooks?**
A: Kiro hooks (optional) can be disabled. Git hooks (mandatory) should NOT be bypassed.

**Q: How do I update steering?**
A: Edit the relevant steering file in `.kiro/steering/`. Changes apply immediately.

**Q: What if steering and specs conflict?**
A: Steering takes precedence (defines HOW), but specs define WHAT. Resolve conflicts by updating specs to align with steering.

**Q: Can I have multiple spec folders for one feature?**
A: No. One feature = one spec folder. Break large features into smaller features if needed.

---

**For more details, see**:

- `.kiro/STEERING_AND_SPECS_GUIDE.md` - Comprehensive steering and specs guide
- `.kiro/hooks/ACTIVE_HOOKS.md` - Active hooks documentation
- `.kiro/AUTONOMOUS_DEVELOPMENT_GUIDE.md` - Autonomous development workflow
