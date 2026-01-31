# How Steering Works with Hooks

**Last Updated**: 2026-01-31
**Purpose**: Explain the relationship between steering files and hooks

---

## The Relationship

**Steering** and **Hooks** work together but serve different purposes:

| Aspect      | Steering                       | Hooks                   |
| ----------- | ------------------------------ | ----------------------- |
| **What**    | Rules and standards            | Automation triggers     |
| **When**    | Always active                  | Event-triggered         |
| **How**     | Kiro reads before every action | Kiro responds to events |
| **Purpose** | Guide HOW to work              | Automate WHEN to act    |

---

## How It Works

### 1. Steering is Always Loaded

**Steering files** (`.kiro/steering/`) are **always active** in Kiro's context:

```
When Kiro starts:
  ↓
Automatically loads:
  - 00-global.md (workflow rules)
  - product.md (product vision)
  - tech.md (technology stack)
  - structure.md (code organization)
  ↓
These rules guide EVERY action Kiro takes
```

**Example:**

- Steering says: "Never commit without validation"
- Kiro follows this rule in ALL situations
- No hook needed to enforce this - it's always active

### 2. Hooks Trigger on Events

**Hooks** (`.kiro/hooks/`) are **event-triggered** automations:

```
Event occurs (file saved, task complete, etc.)
  ↓
Hook checks: Does this event match my trigger?
  ↓
If YES: Hook executes its action
  ↓
Action: Either "askAgent" or "runCommand"
```

**Example:**

- Hook triggers on: `agentStop` (when Kiro completes a task)
- Hook action: "Check for next task and continue"
- This automates the continuation workflow

---

## Three Ways They Interact

### Interaction 1: Hooks Enforce Steering Rules

**Steering defines the rule, hooks enforce it automatically**

**Example: Documentation Requirement**

**Steering says** (`.kiro/steering/00-global.md`):

```markdown
## Documentation Requirements

All commits MUST update 4 mandatory files:

- README.md
- CHANGELOG.md
- DEVELOPMENT_LOG.md
- docs/development-status.md
```

**Hook enforces** (`doc-management-guide.kiro.hook`):

```json
{
  "when": {
    "type": "fileCreated",
    "patterns": [".kiro/specs/*/requirements.md", ".kiro/specs/*/design.md"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Ensure documentation follows structure from .kiro/steering/structure.md"
  }
}
```

**How they work together:**

1. Steering defines the documentation standard
2. Hook triggers when spec files are created
3. Hook reminds Kiro to follow steering rules
4. Kiro applies steering rules to the specific file

---

### Interaction 2: Hooks Reference Steering Content

**Hooks tell Kiro to read specific steering files**

**Example: Autonomous Development**

**Hook** (`autonomous-task-executor.kiro.hook`):

```json
{
  "then": {
    "type": "askAgent",
    "prompt": "Execute tasks autonomously. See .kiro/steering/00-global.md for detailed rules."
  }
}
```

**What happens:**

1. Hook triggers (user says "work autonomously")
2. Hook tells Kiro: "Read 00-global.md for rules"
3. Kiro reads steering file
4. Kiro follows the autonomous development rules from steering
5. Hook provides the trigger, steering provides the rules

**Why this works:**

- Hook doesn't duplicate steering content
- Hook just points to steering
- Steering remains single source of truth
- Updates to steering automatically apply to hook behavior

---

### Interaction 3: Steering Guides Hook Behavior

**Steering defines how Kiro should respond to hook triggers**

**Example: Validation Workflow**

**Steering says** (`.kiro/steering/00-global.md`):

```markdown
## Validation Before Commit

ALWAYS run validation before committing:

1. Run: node scripts/validate-for-commit.js
2. If pass: Commit with safe-commit-push.js
3. If fail: Fix issues and retry (max 3 attempts)
4. Never use --no-verify flag
```

**Hook triggers** (`task-continuation.kiro.hook`):

```json
{
  "when": {
    "type": "agentStop"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Task complete. Check for next task and continue."
  }
}
```

**How they work together:**

1. Kiro completes a task
2. Hook triggers: "Check for next task"
3. Kiro reads steering: "Before starting next task, validate and commit current work"
4. Kiro follows steering rules: Validate → Commit → Continue
5. Hook provides timing, steering provides process

---

## Practical Examples

### Example 1: File Edit Triggers Architecture Review

**Scenario:** Developer saves a Lambda function file

**Flow:**

```
1. Developer saves: backend/functions/auth/index.js
   ↓
2. Hook triggers: architecture-review-simplified.kiro.hook
   Pattern matches: "backend/functions/*/index.js"
   ↓
3. Hook action: askAgent("Review for security and best practices")
   ↓
4. Kiro reads steering:
   - 00-global.md: Security baselines
   - tech.md: Lambda patterns
   - structure.md: Handler → service → repository pattern
   ↓
5. Kiro applies steering rules to review the file:
   - Checks for secrets in code (00-global.md)
   - Verifies Lambda layer usage (tech.md)
   - Validates module structure (structure.md)
   ↓
6. Kiro responds: "Code follows patterns, no issues found"
```

**Key Point:** Hook triggers the review, steering defines what to review for

---

### Example 2: Task Completion Triggers Continuation

**Scenario:** Kiro finishes implementing a feature

**Flow:**

```
1. Kiro completes task (implements feature)
   ↓
2. Hook triggers: task-continuation.kiro.hook
   Event: agentStop
   ↓
3. Hook action: askAgent("Check for next task and continue")
   ↓
4. Kiro reads steering:
   - 00-global.md: "Validate before commit, update docs"
   - 00-global.md: "Check .kiro/specs/*/tasks.md for next task"
   ↓
5. Kiro follows steering workflow:
   a. Validates current work
   b. Commits if validation passes
   c. Checks tasks.md for next incomplete task
   d. Starts next task immediately
   ↓
6. Kiro continues working (no manual intervention)
```

**Key Point:** Hook triggers continuation, steering defines the continuation workflow

---

### Example 3: Spec File Creation Triggers Documentation Guidance

**Scenario:** Developer creates a new feature spec

**Flow:**

```
1. Developer creates: .kiro/specs/budget-export/requirements.md
   ↓
2. Hook triggers: doc-management-guide.kiro.hook
   Pattern matches: ".kiro/specs/*/requirements.md"
   ↓
3. Hook action: askAgent("Ensure proper spec structure")
   ↓
4. Kiro reads steering:
   - structure.md: Spec file structure and format
   - structure.md: Requirements document template
   - 00-global.md: Documentation standards
   ↓
5. Kiro applies steering rules:
   - Checks for user stories format
   - Verifies acceptance criteria structure
   - Ensures proper markdown formatting
   ↓
6. Kiro responds: "Spec follows structure.md template"
```

**Key Point:** Hook triggers on file creation, steering defines proper structure

---

## Why This Design?

### 1. Separation of Concerns

**Steering:**

- Defines WHAT the rules are
- Provides detailed guidance
- Single source of truth
- Updated independently

**Hooks:**

- Defines WHEN to apply rules
- Triggers automation
- Points to steering
- Lightweight and focused

### 2. Maintainability

**Without this separation:**

```json
{
  "prompt": "Review code for: 1) No secrets, 2) Use Lambda layers, 3) Handler→service→repository, 4) AWS SDK v3, 5) Error handling, 6) ..."
}
```

❌ Hook duplicates steering content
❌ Updates needed in multiple places
❌ Easy to get out of sync

**With this separation:**

```json
{
  "prompt": "Review code following .kiro/steering/00-global.md and tech.md"
}
```

✅ Hook references steering
✅ Updates only in steering files
✅ Always in sync

### 3. Flexibility

**Steering can change without updating hooks:**

- Add new security rule → Automatically applies to all reviews
- Change tech stack → Automatically applies to all implementations
- Update workflow → Automatically applies to all automations

**Hooks can change without updating steering:**

- Add new trigger event → Uses existing steering rules
- Change trigger patterns → Same steering guidance applies
- Disable/enable hooks → Steering rules still active

---

## Common Patterns

### Pattern 1: Hook Points to Steering

```json
{
  "prompt": "Follow rules from .kiro/steering/00-global.md"
}
```

**Use when:** Hook needs Kiro to apply general rules

### Pattern 2: Hook Points to Specific Steering Section

```json
{
  "prompt": "Follow validation workflow from .kiro/steering/00-global.md section 'Validation Before Commit'"
}
```

**Use when:** Hook needs specific guidance from steering

### Pattern 3: Hook Combines Steering + Context

```json
{
  "prompt": "Review this Lambda function following .kiro/steering/tech.md Lambda patterns. Check for security issues per 00-global.md."
}
```

**Use when:** Hook needs multiple steering references

---

## What Steering Does NOT Do

### ❌ Steering Does NOT Trigger Actions

**Wrong thinking:**
"Steering says to validate before commit, so it will automatically validate"

**Reality:**

- Steering defines the rule
- Git hooks enforce the rule (pre-commit hook)
- Kiro follows the rule when working

**Steering is passive guidance, not active automation**

### ❌ Steering Does NOT Replace Hooks

**Wrong thinking:**
"If steering says to continue to next task, I don't need a continuation hook"

**Reality:**

- Steering defines HOW to continue (the process)
- Hook defines WHEN to continue (after task complete)
- Both are needed for automation

### ❌ Steering Does NOT Execute Commands

**Wrong thinking:**
"Steering can run validation scripts"

**Reality:**

- Steering documents the validation process
- Hooks or git hooks execute the scripts
- Kiro follows steering guidance when executing

---

## Summary

### The Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                         STEERING                             │
│  (Always Active - Defines Rules and Standards)              │
│                                                              │
│  • HOW to write code                                        │
│  • WHAT technologies to use                                 │
│  • WHAT patterns to follow                                  │
│  • WHAT standards to maintain                               │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ References
                              │
┌─────────────────────────────────────────────────────────────┐
│                          HOOKS                               │
│  (Event-Triggered - Automates Actions)                      │
│                                                              │
│  • WHEN to apply steering rules                             │
│  • WHEN to trigger automation                               │
│  • WHEN to remind Kiro                                      │
│  • WHEN to enforce standards                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
                              │ Guides
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                          KIRO                                │
│  (AI Assistant - Executes Work)                             │
│                                                              │
│  • Reads steering (always)                                  │
│  • Responds to hooks (when triggered)                       │
│  • Applies steering rules to specific situations            │
│  • Follows both steering and hook guidance                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Takeaways

1. **Steering = Rules** (always active, passive guidance)
2. **Hooks = Triggers** (event-driven, active automation)
3. **Hooks reference steering** (don't duplicate content)
4. **Steering guides hook behavior** (defines what to do when triggered)
5. **Both are needed** (steering without hooks = no automation, hooks without steering = no guidance)

### Quick Reference

| Question                     | Answer                                         |
| ---------------------------- | ---------------------------------------------- |
| Where are rules defined?     | Steering files                                 |
| When are rules applied?      | Always (steering) + When triggered (hooks)     |
| How are rules enforced?      | Kiro follows steering, hooks trigger reminders |
| Can I change rules?          | Yes, update steering files                     |
| Can I change triggers?       | Yes, update hook files                         |
| Do hooks duplicate steering? | No, hooks reference steering                   |

---

**For more details:**

- `.kiro/SYSTEM_GUIDE.md` - Complete system overview
- `.kiro/steering/00-global.md` - Global workflow rules
- `.kiro/hooks/ACTIVE_HOOKS.md` - Hook documentation
