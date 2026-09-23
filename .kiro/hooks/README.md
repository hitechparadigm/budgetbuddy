# Kiro Hooks

Active hooks in this workspace, what fires them, and why.

## Schema

All active hooks use the current schema:

```json
{
  "version": "v1",
  "hooks": [{
    "name": "...",
    "trigger": "Stop | UserPromptSubmit | PostFileCreate | PreToolUse | ...",
    "matcher": "optional regex",
    "action": { "type": "agent" | "command", "prompt" | "command": "..." },
    "enabled": true
  }]
}
```

**Matcher semantics (important):** the `matcher` regex is only evaluated for:
- `PreToolUse` / `PostToolUse` — tested against the **tool name**
- `PostFileCreate` / `PostFileSave` / `PostFileDelete` — tested against the **file path**

For every other trigger (including `UserPromptSubmit` and `Stop`) the matcher is **ignored and the hook always fires**. Adding a matcher to a `UserPromptSubmit` hook does not reduce how often it runs.

## Active Hooks

| File | Trigger | Purpose |
|------|---------|---------|
| `continue-until-done.json` | `Stop` | Autonomy enforcement. On completion, checks work-log open items, active spec tasks, CI/CD status, and docs debt. Continues if work remains; explicitly authorizes yielding when clear or blocked. |
| `autonomous-task-executor.json` | `UserPromptSubmit` | Injects CI/CD safety rules (check status before push, never push during a deploy). Fires every turn — kept short deliberately. |
| `doc-management-guide.json` | `PostFileCreate` | Fires on `.kiro/specs/*/\{requirements,design,tasks\}.md`. Reminds to follow spec structure. |
| `update-user-journeys.json` | `PostFileCreate` | Fires on new `pages/` or `screens/` `.tsx` files. Reminds to update `docs/product-requirements.md`. |
| `auto-log-cleanup.json` | `PostFileCreate` | Fires on files under `temp-logs/`. Reminds to clean up after AWS log analysis. |

## Autonomy Design Note

`continue-until-done.json` is the mechanism that implements the "work continuously until done" rule from `.kiro/steering/00-global.md`. Prose in a steering file states the intent; this `Stop` hook is what actually re-prompts on completion.

It is written to check **concrete** signals rather than a vague "keep going," and it explicitly lists conditions under which yielding is correct. Without that second half, a `Stop` hook that only says "continue" can loop indefinitely and never hand control back.

## Stale Files

These use the dead legacy schema (`when`/`then`/`askAgent`) and do not parse. They are inert and kept only for history:

- `master-automation.kiro.hook.DISABLED` — legacy `onAgentComplete` continuation hook, superseded by `continue-until-done.json`
- `auto-push-continue.kiro.hook.DISABLED` — legacy auto-push, intentionally disabled (bypassed validation)
- `validation-success-autopush.kiro.hook.DISABLED` — legacy auto-push, intentionally disabled
- `*.kiro.hook` duplicates of the `.json` files above

Safe to delete when convenient.
