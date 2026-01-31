# .kiro/ Directory

**Purpose**: Development system configuration and documentation

---

## Directory Structure

```
.kiro/
├── steering/                          # HOW to work (always active)
│   ├── 00-global.md                   # Workflow rules
│   ├── product.md                     # Product vision
│   ├── tech.md                        # Technology stack
│   └── structure.md                   # Code organization
│
├── specs/                             # WHAT to build
│   ├── design.md                      # Overall architecture
│   ├── requirements.md                # All requirements
│   ├── tasks.md                       # All tasks
│   └── <feature-name>/                # Feature-specific specs
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
│
├── hooks/                             # WHEN to act (automation)
│   ├── ACTIVE_HOOKS.md                # Hook documentation
│   ├── *.kiro.hook                    # Active hooks
│   └── *.kiro.hook.DISABLED           # Disabled hooks
│
├── cicd-status/                       # CI/CD monitoring
│   └── latest.json                    # Latest pipeline status
│
├── SYSTEM_GUIDE.md                    # Complete system reference
├── STEERING_HOOKS_EXPLAINED.md        # How steering works with hooks
└── AUTONOMOUS_DEVELOPMENT_GUIDE.md    # Autonomous workflow guide
```

---

## Quick Start

### For Kiro (AI Assistant)

**Before any work:**

1. Read `steering/` files
2. Read relevant `specs/` files
3. Propose plan
4. Validate: `node scripts/validate-for-commit.js`
5. Commit: `node scripts/safe-commit-push.js "message"`

### For Developers

**Understanding the system:**

- Read `SYSTEM_GUIDE.md` for complete overview
- Read `AUTONOMOUS_DEVELOPMENT_GUIDE.md` for autonomous workflow
- Check `hooks/ACTIVE_HOOKS.md` for automation details

---

## Key Files

| File                              | Purpose                       |
| --------------------------------- | ----------------------------- |
| `SYSTEM_GUIDE.md`                 | Complete system reference     |
| `STEERING_HOOKS_EXPLAINED.md`     | How steering works with hooks |
| `AUTONOMOUS_DEVELOPMENT_GUIDE.md` | Autonomous workflow guide     |
| `steering/00-global.md`           | Global workflow rules         |
| `specs/tasks.md`                  | Current implementation tasks  |
| `hooks/ACTIVE_HOOKS.md`           | Hook system documentation     |

---

## Documentation Philosophy

**Minimal and Focused:**

- Each file has single, clear purpose
- No duplication between files
- Practical examples over theory
- Quick reference over comprehensive guides

**Always Current:**

- Updated with every major change
- Obsolete content removed immediately
- Version tracked in git

---

**Last Updated**: 2026-01-31
**System Status**: ✅ Operational
