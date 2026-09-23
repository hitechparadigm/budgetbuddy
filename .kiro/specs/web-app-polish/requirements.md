# Requirements: Web App Polish

## Status: ✅ Complete (Sessions 147–162)

All 18 completion criteria met. Full task list in `tasks.md`.

## Introduction

The web app polish initiative transformed BudgetBuddy from a functional MVP into a production-ready web application with a consistent design system, AI-powered features, and strong performance/accessibility.

## Requirements Addressed

### REQ-1: Brand Consistency
- All UI uses `--color-primary` (#059669 green) and Inter font
- Lucide React icons replace emoji throughout
- Design tokens for all semantic colors (surface, foreground, muted, border)

### REQ-2: Navigation Architecture
- Sidebar with ≤6 primary items + collapsible Manage group
- Default authenticated route: `/overview` (was `/budget`)
- Mobile-responsive: slide-over panel at <md breakpoint

### REQ-3: Overview Dashboard
- 7 sections: Financial Health Bar, Net Worth sparkline, Top Spending Categories, Upcoming Bills, Active Goals, AI Insight of the Day, Quick Add Transaction

### REQ-4: Core Feature Polish
- Budget page: Ready-to-Assign counter, skeleton loading, keyboard shortcuts (T/B/←→/?/Esc), inline category amount editing
- Insights: chat bubble UI, session persistence, recharts with responsive axes
- Goals: card grid with SVG progress rings

### REQ-5: AI Integration
- Real Bedrock Claude 3.5 Sonnet budget generation (no mock)
- AI coach with last-5-exchange memory + user goals + budget status as context
- Transaction rules engine (auto-categorization)
- EventBridge daily nudges (pace check, unusual transactions, goal tracking)

### REQ-6: Onboarding & Conversion
- Landing page rewritten with new headline
- 4-step onboarding with AI generation animation
- Pricing page with Free vs. Premium comparison
- 3 contextual premium gates (AI memory, data export, health score history)

### REQ-7: Performance & Accessibility
- Lighthouse Performance ≥85 (initial bundle 113KB gzip, was 242KB)
- Lazy-loaded 20 secondary pages via React.lazy + Suspense
- WCAG 2.1 AA color contrast passes (#059669 green: 4.68:1 ratio on white)
- Responsive at 1024px and 768px

### REQ-8: New Features (Session 162)
- `CategoryIcon` component — colored CSS tint badges per category name pattern
- `AiCoachChip` — contextual floating AI coach button on BudgetPage
- GoalsPage: Borrowed and Lent tabs via `subType` field
- `BorrowLendFormPage` at `/goals/borrow-lend/new`
- `PlannedTransactionsPage` — full CRUD at `/planned-transactions`
- `plannedTransactionsApi.ts` service
- Sidebar: CalendarClock + "Planned" item
