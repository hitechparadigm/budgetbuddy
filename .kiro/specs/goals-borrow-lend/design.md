# Design: Goals — Borrowed & Lent

## Architecture

Reuses existing Goals infrastructure entirely — no new Lambda, no new DynamoDB entity, no new API routes.

### Data Model Extension

Existing `GOAL#<id>` record gains an optional `subType` field:
```
subType: 'goal' | 'borrowed' | 'lent'   (undefined → treated as 'goal' for backward compatibility)
```

No migration needed. Existing goals without `subType` continue working as regular goals.

### Frontend

**`GoalsPage.tsx`** — updated:
- Tab strip: `Goals | Borrowed | Lent`
- Filter goal list by `subType` per active tab
- Tab-specific empty states + CTA buttons ("Track borrowing" / "Track lending")

**`BorrowLendFormPage.tsx`** — new page at `/goals/borrow-lend/new`:
- Reads `?type=borrowed|lent` from URL search params
- Form fields: description, amount, counterparty name, optional due date
- Uses existing goals API (`POST /goals`) with `subType` field in body
- Redirects to `/goals` on success

### Security

- Same RBAC as regular goals via `BudgetAccessResolver`
- No new Lambda permissions required
