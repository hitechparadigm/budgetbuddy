# Kiro Hooks

Four active hooks. All use the current schema. Anything not listed here has been removed.

## Schema (current)

```json
{
  "version": "v1",
  "hooks": [{
    "name": "...",
    "trigger": "Stop | UserPromptSubmit | PostFileCreate | PreToolUse | ...",
    "matcher": "optional regex",
    "action": { "type": "agent" | "command", "prompt": "..." },
    "enabled": true
  }]
}
```

The legacy schema (`when` / `then` / `askAgent`, `version: "1"`) is NOT used here anymore.
Both schemas were live simultaneously in this repo, which meant several hooks fired twice.
All legacy `*.kiro.hook` and `*.DISABLED` files have been deleted.

## Matcher semantics (this caused a real bug)

`matcher` is only evaluated for:

| Trigger family | Matcher tested against |
|----------------|------------------------|
| `PreToolUse`, `PostToolUse` | tool name |
| `PostFileCreate`, `PostFileSave`, `PostFileDelete` | file path |

For **every other trigger** - including `UserPromptSubmit` and `Stop` - the matcher is
**ignored and the hook always fires**. Adding a matcher to a `UserPromptSubmit` hook does not
reduce how often it runs or what it costs.

## Active hooks

| File | Trigger | Matcher | Purpose |
|------|---------|---------|---------|
| `continue-until-done.json` | `Stop` | n/a | Autonomy driver. On completion, re-checks work-log open items, active spec tasks, CI/CD status, and docs debt. Continues if work remains; explicitly authorizes yielding when clear or blocked. |
| `doc-management-guide.json` | `PostFileCreate` | spec `requirements`/`design`/`tasks` md | Reminds to follow spec structure. |
| `update-user-journeys.json` | `PostFileCreate` | new `pages/` or `screens/` `.tsx` | Reminds to update `docs/product-requirements.md`. |
| `auto-log-cleanup.json` | `PostFileCreate` | `temp-logs/` | Reminds to clean up after AWS log analysis. |

## Why there is no `UserPromptSubmit` hook

There was one (`autonomous-task-executor`) that injected CI/CD safety rules on every single turn.
Its entire content already lives in `.kiro/steering/00-global.md`, which is `inclusion: always`
and therefore loaded every turn regardless. The hook was paying a token cost each turn to repeat
rules the agent already had, so it was removed.

## How autonomy actually works

`00-global.md` states the intent in prose ("work continuously until done"). Prose alone does not
make an agent continue - once a turn ends, nothing re-prompts it.

`continue-until-done.json` is the mechanism. It fires on `Stop` and checks concrete signals rather
than saying a vague "keep going". It also enumerates the conditions under which stopping is
correct. Without that second half, a `Stop` hook that only says "continue" can loop forever and
never hand control back to the user.