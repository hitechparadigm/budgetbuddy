# Design: Web App Polish

## Status: ✅ Complete

## Design System

### CSS Tokens (`packages/web-app/src/index.css`)
```css
--color-primary: #059669        /* green */
--color-primary-hover: #047857
--color-background: (light/dark adaptive)
--color-surface: (light/dark adaptive)
--color-foreground: (light/dark adaptive)
--color-muted: (light/dark adaptive)
--color-border: (light/dark adaptive)
```

### Component Library (`packages/web-app/src/components/ui/`)

| Component | Variants / Notes |
|-----------|------------------|
| `Button.tsx` | primary, secondary, ghost, destructive; sizes: sm, md, lg |
| `Card.tsx` | surface wrapper, optional header/footer slots |
| `Badge.tsx` | success, warning, danger, neutral |
| `Skeleton.tsx` | animated pulse placeholder |
| `PageHeader.tsx` | title + subtitle + right slot |
| `StatCard.tsx` | labeled number with trend indicator |
| `EmptyState.tsx` | empty list states with optional action |
| `ErrorState.tsx` | network/auth/partial error variants |
| `CategoryIcon.tsx` | colored CSS tint badge (added Session 162) |
| `AiCoachChip.tsx` | contextual floating AI coach button (added Session 162) |

### Icons
Lucide React (pinned version) — replaces all emoji strings.

## Key Pages

| Route | Component | Status |
|-------|-----------|--------|
| `/` | LandingPage | ✅ |
| `/overview` | OverviewPage (7 sections) | ✅ |
| `/budget` | BudgetPage + AiCoachChip | ✅ |
| `/budget/members` | BudgetMembersPage | ✅ |
| `/goals` | GoalsPage (Goals/Borrowed/Lent tabs) | ✅ |
| `/goals/borrow-lend/new` | BorrowLendFormPage | ✅ |
| `/planned-transactions` | PlannedTransactionsPage | ✅ |
| `/insights` | InsightsPage (chat UI) | ✅ |
| `/pricing` | PricingPage | ✅ |
| `/onboarding` | OnboardingPage (4 steps) | ✅ |
| All other pages | Various | ✅ |

## Performance Strategy

- React.lazy + Suspense for all 20 secondary pages
- Code splitting: vendor chunk, UI chunk, charts chunk
- recharts lazy-loaded only on Insights page
- Result: 113KB initial bundle (down from 242KB), Lighthouse ≥85

## Backend Supporting Infrastructure

- `budget-planning` Lambda: AI budget suggestions via Bedrock
- `insights` Lambda: AI coach with conversation memory
- `rules` Lambda: transaction auto-categorization
- EventBridge daily-reminders Lambda: proactive nudges + monthly kickoff email
- `transaction-planning` Lambda: planned transactions CRUD
- All routed through api-features-extended-stack.ts
