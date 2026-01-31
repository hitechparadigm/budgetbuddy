# Session Continuity Workflow Update

## Overview

Updated steering files and hooks to incorporate session continuity as the FIRST step in any workflow. This ensures that when continuing work across sessions, the agent always understands the current context before proceeding.

## Changes Made

### 1. Updated `.kiro/steering/00-global.md`

**Added Section 0: Session Continuity (FIRST STEP)**

This new section comes BEFORE all other workflow rules and emphasizes:

- Check for context transfer summary from previous session FIRST
- Understand what was in progress, completed, and what's next
- THEN read steering files and specs
- Make informed decision on what to work on

**Why This Matters:**

- Prevents duplicating work that was just completed
- Avoids missing important context about in-progress tasks
- Ensures continuity across session boundaries
- Prevents starting wrong tasks or ignoring blockers

**Updated Section 1: Never Implement in a Single Step**

Added step 1: "Read context transfer summary (if present)" before reading steering files.

**Updated Autonomous Development Mode**

Added "Session Continuity (FIRST STEP)" subsection that emphasizes checking context transfer at the start of each autonomous session.

### 2. Updated `.kiro/hooks/autonomous-task-executor.kiro.hook`

**Added SESSION CONTINUITY section to the prompt:**

```
SESSION CONTINUITY (FIRST STEP):
1. Check for context transfer summary from previous session
2. If present, READ IT to understand:
   - What tasks were in progress
   - What was just completed
   - What should be done next
   - Any blockers or issues
3. Then read steering files and specs
4. Make decision on what to work on next
```

This ensures the autonomous task executor ALWAYS checks for context before starting work.

**Fixed SESSION ENDING section:**

**Old (contradictory):**

```
- When the current session is ending or about to be summarized, STOP all work immediately
- Do NOT continue working after a message the session is ending
- Wait to allow session transition
- Continue working in the new session  ← CONTRADICTORY!
```

**New (clear):**

```
- When notified the session is ending or being summarized, STOP immediately
- Complete current commit if in progress, then stop
- Do NOT start new tasks
- The context transfer summary will allow the next session to continue seamlessly
```

**Why this matters:** The agent can't "continue in the new session" - that's a different instance. The context transfer summary is what enables continuation, not the agent itself.

## Workflow Order (New)

### Starting a New Session

1. **Check for context transfer summary** (if present)
2. **Read the summary** to understand current state
3. **Read steering files** (product.md, tech.md, structure.md)
4. **Read relevant specs** based on context
5. **Check CI/CD status** before starting any task
6. **Proceed with work**

### During Autonomous Development

1. **Session continuity check** (at session start)
2. **CI/CD status check** (before each task)
3. **Implement task**
4. **Commit and push**
5. **Monitor deployment**
6. **Continue to next task**

## Benefits

1. **Better Context Awareness**: Agent always knows what was happening before
2. **Reduced Duplication**: Won't redo work that was just completed
3. **Smoother Transitions**: Seamless continuation across session boundaries
4. **Fewer Mistakes**: Less likely to start wrong task or miss blockers
5. **More Efficient**: Spends less time figuring out what to do next

## Implementation Notes

- Context transfer summaries are provided by the system when sessions get too long
- They contain a structured summary of recent work and current state
- Reading them FIRST provides the most up-to-date project state
- Steering files provide general guidance, but context summaries provide specific state

## Testing

This update has been applied to:

- ✅ Global steering file (00-global.md)
- ✅ Autonomous task executor hook
- ✅ Workflow documentation

## Next Steps

When this change is deployed:

1. Agent will always check for context transfer at session start
2. Agent will read context BEFORE reading steering files
3. Agent will make better decisions about what to work on next
4. Autonomous development will be more efficient and accurate

## Related Files

- `.kiro/steering/00-global.md` - Main workflow rules
- `.kiro/hooks/autonomous-task-executor.kiro.hook` - Autonomous development hook
- This document - Explanation of changes
