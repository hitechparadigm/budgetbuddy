# Spec Structure Explained

**Last Updated**: 2026-01-31
**Purpose**: Clear explanation of how specs are organized in BudgetBuddy

---

## Visual Structure

```
.kiro/specs/
│
├── 📄 design.md                    ← ROOT SPEC: Overall project design
├── 📄 requirements.md              ← ROOT SPEC: Overall project requirements
├── 📄 tasks.md                     ← ROOT SPEC: Overall project tasks
│
├── 📁 auth-lambda-refactoring/     ← FEATURE SPEC: Auth refactoring
│   ├── 📄 design.md                ← How to refactor auth Lambda
│   ├── 📄 requirements.md          ← Why refactor, what to achieve
│   └── 📄 tasks.md                 ← Step-by-step refactoring tasks
│
└── 📁 mobile-app-completion/       ← FEATURE SPEC: Mobile app features
    ├── 📄 design.md                ← Mobile app architecture
    ├── 📄 requirements.md          ← Mobile app requirements (if exists)
    └── 📄 tasks.md                 ← Mobile app tasks (if exists)
```

---

## Two Types of Specs

### 1. Root Specs (Project-Wide)

**Location**: `.kiro/specs/` (directly in specs folder)

**Files**:

- `design.md` - Overall project architecture
- `requirements.md` - All project requirements (42+ requirements)
- `tasks.md` - All project tasks organized by phase

**Purpose**:

- Define the ENTIRE BudgetBuddy project
- Cross-cutting concerns (auth, database, infrastructure)
- High-level architecture decisions
- Project-wide requirements and tasks

**When to Use**:

- Initial project setup
- Understanding overall architecture
- Finding project-wide requirements
- Tracking overall project progress

**Example Content** (from `.kiro/specs/requirements.md`):

```markdown
### Requirement 1: User Authentication ✅ COMPLETE

**User Story:** As a user, I want to securely register and log in...

### Requirement 2: Budget Creation and Management ✅ COMPLETE

**User Story:** As a user, I want to create and manage monthly budgets...

### Requirement 17: Family Management and Auto-Creation 🔧 IN PROGRESS

**User Story:** As a user, I want to have a family automatically created...
```

**Example Content** (from `.kiro/specs/tasks.md`):

```markdown
### Phase 1: Core Authentication & User Management ✅ COMPLETE

- [x] 1. User Authentication System
- [x] 2. Google Sign-In Integration
- [x] 3. User Profile Management

### Phase 2: Core Budget Management ✅ COMPLETE

- [x] 4. Budget Creation and Management
- [x] 5. Transaction Recording and Tracking
```

---

### 2. Feature Specs (Feature-Specific)

**Location**: `.kiro/specs/<feature-name>/` (subfolder in specs)

**Files**:

- `design.md` - Feature-specific architecture
- `requirements.md` - Feature-specific requirements
- `tasks.md` - Feature-specific tasks

**Purpose**:

- Define a SPECIFIC feature or refactoring
- Detailed implementation plans
- Feature-specific requirements and tasks
- Isolated from other features

**When to Use**:

- Major new feature development
- Complex refactoring projects
- Features requiring detailed design
- Features with many sub-tasks

**Current Feature Specs**:

#### A. `auth-lambda-refactoring/`

**Purpose**: Refactor authentication Lambda functions

**Contains**:

- `design.md` - New auth Lambda architecture
- `requirements.md` - Why refactor, what to achieve
- `tasks.md` - Step-by-step refactoring checklist

**Example** (from `auth-lambda-refactoring/requirements.md`):

```markdown
### Requirement 1: Separate Auth Concerns

**User Story:** As a developer, I want auth logic separated into distinct Lambdas...

### Requirement 2: Improve Error Handling

**User Story:** As a developer, I want consistent error handling...
```

#### B. `mobile-app-completion/`

**Purpose**: Complete mobile app features

**Contains**:

- `design.md` - Mobile app architecture and features
- `requirements.md` - Mobile-specific requirements (if exists)
- `tasks.md` - Mobile app tasks (if exists)

**Note**: This folder currently only has `design.md`. It may be incomplete or in progress.

---

## How to Use Specs

### Scenario 1: Understanding the Overall Project

**Goal**: "I want to understand BudgetBuddy's architecture"

**Read**:

1. `.kiro/specs/design.md` - Overall architecture, tech stack, data models
2. `.kiro/specs/requirements.md` - All 42+ requirements
3. `.kiro/specs/tasks.md` - Implementation phases and progress

**Why**: Root specs give you the complete picture of the entire project.

---

### Scenario 2: Implementing a New Feature

**Goal**: "I want to add budget export functionality"

**Steps**:

1. **Check Root Specs First**:
   - `.kiro/specs/requirements.md` - Look for Requirement 26 (Data Export)
   - `.kiro/specs/tasks.md` - Look for Task 24 (Data Export System)

2. **If Feature is Complex, Create Feature Spec**:

   ```
   .kiro/specs/budget-export/
   ├── design.md       ← Export architecture, API design
   ├── requirements.md ← Export requirements
   └── tasks.md        ← Export implementation tasks
   ```

3. **Implement Following Spec**:
   - Read design.md for HOW to build
   - Read requirements.md for WHAT to build
   - Follow tasks.md for step-by-step implementation

**Why**: Feature specs isolate complex features for focused development.

---

### Scenario 3: Working on Existing Feature

**Goal**: "I want to refactor auth Lambda functions"

**Read**:

1. `.kiro/specs/auth-lambda-refactoring/design.md` - Refactoring architecture
2. `.kiro/specs/auth-lambda-refactoring/requirements.md` - Why and what
3. `.kiro/specs/auth-lambda-refactoring/tasks.md` - Implementation checklist

**Why**: Feature spec has all details for this specific refactoring project.

---

### Scenario 4: Tracking Project Progress

**Goal**: "I want to see what's done and what's left"

**Read**:

1. `.kiro/specs/tasks.md` - Overall project tasks with status
   - ✅ Complete phases
   - 🔧 In-progress phases
   - ⏳ Planned phases

**Why**: Root tasks.md shows complete project status at a glance.

---

## Decision Tree: Root Spec vs Feature Spec

```
┌─────────────────────────────────────────────────────────────────┐
│  Do I need to understand the ENTIRE project?                    │
│  (architecture, all requirements, overall progress)             │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ├─ YES → Read ROOT SPECS (.kiro/specs/*.md)
                    │
                    └─ NO
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Am I working on a SPECIFIC feature or refactoring?             │
│  (auth refactoring, mobile app, export feature)                 │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ├─ YES → Read FEATURE SPEC (.kiro/specs/<feature>/*.md)
                    │
                    └─ NO → Start with ROOT SPECS, then decide
```

---

## When to Create a New Feature Spec

### Create Feature Spec When:

1. **Feature is Complex**
   - Requires detailed architecture design
   - Has multiple components or services
   - Needs extensive data modeling

2. **Feature is Large**
   - Has 10+ tasks
   - Spans multiple phases
   - Requires multiple developers

3. **Feature is Isolated**
   - Can be developed independently
   - Has clear boundaries
   - Doesn't affect core architecture

4. **Feature Needs Detailed Planning**
   - Requires research or prototyping
   - Has multiple design alternatives
   - Needs stakeholder review

### Examples of Features That Need Spec Folders:

✅ **auth-lambda-refactoring** - Complex refactoring with multiple Lambdas
✅ **mobile-app-completion** - Large feature with many components
✅ **budget-export** (future) - Isolated feature with API design
✅ **multi-currency** (future) - Complex feature with data modeling

### Examples of Features That DON'T Need Spec Folders:

❌ **Add logout button** - Simple UI change, covered in root tasks
❌ **Fix date validation bug** - Bug fix, not a feature
❌ **Update documentation** - Maintenance task
❌ **Add unit test** - Testing task, not a feature

---

## Spec File Relationships

### Root Specs Reference Feature Specs

**Example** (from `.kiro/specs/tasks.md`):

```markdown
### Phase 4: Critical Bug Fixes ✅ COMPLETE

- [x] 15. Fix Family ID Mismatch Between Auth and Budget Services
  - See: .kiro/specs/auth-lambda-refactoring/ for detailed refactoring plan
  - Requirements: 46.1-46.10
```

**Why**: Root tasks reference feature specs for detailed implementation.

### Feature Specs Reference Root Requirements

**Example** (from `.kiro/specs/auth-lambda-refactoring/tasks.md`):

```markdown
- [ ] 1. Separate Auth Concerns
  - Requirements: 1.1-1.8 (from root requirements.md)
```

**Why**: Feature tasks link back to root requirements for traceability.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Duplicating Content

**Wrong**:

```
.kiro/specs/requirements.md          ← Has Requirement 1: User Auth
.kiro/specs/auth-lambda-refactoring/requirements.md  ← Also has Requirement 1: User Auth
```

**Right**:

```
.kiro/specs/requirements.md          ← Has Requirement 1: User Auth (original)
.kiro/specs/auth-lambda-refactoring/requirements.md  ← Has Requirement 1: Refactor Auth (specific to refactoring)
```

**Why**: Feature specs should have NEW requirements specific to that feature, not duplicate root requirements.

---

### ❌ Mistake 2: Creating Unnecessary Feature Specs

**Wrong**:

```
.kiro/specs/add-logout-button/       ← Overkill for simple task
├── design.md
├── requirements.md
└── tasks.md
```

**Right**:

```
.kiro/specs/tasks.md                 ← Just add task to root tasks
- [ ] 12. Add Missing Logout Functionality
```

**Why**: Simple tasks don't need dedicated spec folders.

---

### ❌ Mistake 3: Mixing Root and Feature Content

**Wrong**:

```
.kiro/specs/design.md                ← Has BOTH overall architecture AND auth refactoring details
```

**Right**:

```
.kiro/specs/design.md                ← Overall architecture only
.kiro/specs/auth-lambda-refactoring/design.md  ← Auth refactoring details
```

**Why**: Keep root specs high-level, feature specs detailed.

---

## Checking for Duplications

### Current Status

**Root Specs**:

- ✅ `.kiro/specs/design.md` - Overall project design (4597 lines)
- ✅ `.kiro/specs/requirements.md` - 42+ requirements (1260 lines)
- ✅ `.kiro/specs/tasks.md` - All project tasks organized by phase

**Feature Specs**:

- ✅ `.kiro/specs/auth-lambda-refactoring/` - Complete (design, requirements, tasks)
- ⚠️ `.kiro/specs/mobile-app-completion/` - Incomplete (only design.md exists)

### Potential Issues

1. **mobile-app-completion/** is incomplete:
   - Has `design.md` but missing `requirements.md` and `tasks.md`
   - **Action**: Either complete it or remove it if not needed

2. **No obvious duplications** between root and feature specs:
   - Root specs cover overall project
   - Feature specs cover specific refactoring/features
   - No content overlap detected

---

## Recommendations

### 1. Complete or Remove `mobile-app-completion/`

**Option A: Complete It**

```bash
# Add missing files
touch .kiro/specs/mobile-app-completion/requirements.md
touch .kiro/specs/mobile-app-completion/tasks.md
```

**Option B: Remove It** (if not needed)

```bash
# Remove incomplete spec
rm -rf .kiro/specs/mobile-app-completion/
```

**Recommendation**: Check if mobile app features are already covered in root specs. If yes, remove this folder to avoid confusion.

---

### 2. Keep Root Specs Updated

**Action**: Regularly update root specs as project evolves

- Add new requirements to `requirements.md`
- Update architecture in `design.md`
- Track progress in `tasks.md`

---

### 3. Create Feature Specs for Complex Features

**Future Features That May Need Spec Folders**:

- `budget-export/` - Data export functionality
- `multi-currency/` - Currency support
- `notifications/` - Push notification system
- `premium-features/` - Subscription and premium tier

---

## Summary

### Quick Reference

| Spec Type         | Location                     | Purpose          | When to Use                              |
| ----------------- | ---------------------------- | ---------------- | ---------------------------------------- |
| **Root Specs**    | `.kiro/specs/*.md`           | Overall project  | Understanding project, tracking progress |
| **Feature Specs** | `.kiro/specs/<feature>/*.md` | Specific feature | Complex features, refactoring projects   |

### Key Takeaways

1. **Root Specs = Project-Wide**: Overall architecture, all requirements, all tasks
2. **Feature Specs = Feature-Specific**: Detailed design, feature requirements, feature tasks
3. **No Duplication**: Feature specs should NOT duplicate root specs
4. **Hierarchy**: Root specs → Feature specs → Implementation
5. **Traceability**: Feature tasks reference root requirements

### When in Doubt

**Ask yourself**:

- "Does this affect the ENTIRE project?" → Root spec
- "Is this a SPECIFIC feature or refactoring?" → Feature spec
- "Is this a SIMPLE task?" → Just add to root tasks.md

---

**For more details, see**:

- `.kiro/STEERING_AND_SPECS_GUIDE.md` - Comprehensive steering and specs guide
- `.kiro/STEERING_SPECS_HOOKS_INTEGRATION.md` - How steering, specs, and hooks work together
