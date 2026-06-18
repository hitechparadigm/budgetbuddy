# Web App Polish — Task Tracking

**Source**: `docs/web-app-polish-plan.md`
**Goal**: Production-ready web app before mobile development begins
**18 completion criteria** — see "Definition of Web App Complete" in the plan

---

## Phase 1 — Design Foundation (2 weeks)

### 1.1 Brand Color — Green as Primary
- [x] **P1-T1** — Update `--color-primary` to `#059669`, `--color-primary-hover` to `#047857` in `packages/web-app/src/index.css`; update dark mode primary to `#34d399`
- [x] **P1-T2** — Audit all files for hardcoded `bg-emerald-*` / `text-blue-*` / `border-blue-*` semantic uses; route through CSS tokens

### 1.2 Typography — Inter Font
- [x] **P1-T3** — Add `@fontsource/inter` (exact pinned version) to `packages/web-app/package.json`; update `index.css` font-family
- [x] **P1-T4** — Add `font-feature-settings: 'cv02','cv03','cv04','cv11'` for tabular numerals in `index.css`

### 1.3 Icons — Replace Emoji with Lucide React
- [x] **P1-T5** — Install `lucide-react` (pinned version) in `packages/web-app/package.json`; create `src/utils/icons.ts` icon mapping constant
- [x] **P1-T6** — Update `Sidebar.tsx` to use Lucide icons instead of emoji strings
- [x] **P1-T7** — Update `OnboardingPage.tsx` budget type cards to use Lucide icons

### 1.4 UI Primitives
- [x] **P1-T8** — Create `packages/web-app/src/components/ui/Button.tsx` — variants: primary, secondary, ghost, destructive; sizes: sm, md, lg
- [x] **P1-T9** — Create `packages/web-app/src/components/ui/Card.tsx` — wraps `.card` CSS utility, optional header/footer slots
- [x] **P1-T10** — Create `packages/web-app/src/components/ui/Badge.tsx` — variants: success, warning, danger, neutral
- [x] **P1-T11** — Create `packages/web-app/src/components/ui/Skeleton.tsx` — animated placeholder for loading states
- [x] **P1-T12** — Create `packages/web-app/src/components/ui/PageHeader.tsx` — title + subtitle + right-slot
- [x] **P1-T13** — Create `packages/web-app/src/components/ui/StatCard.tsx` — labeled number with trend indicator
- [x] **P1-T14** — Migrate `LandingPage.tsx` CTAs to use `Button` component; verify no raw Tailwind CTAs remain
- [x] **P1-T15** — Verify color contrast: `#059669` on white passes WCAG AA (4.68:1 ratio — expected pass)
- [x] **P1-T16** — Fix all pre-existing frontend TypeScript errors (~50 `noUnusedLocals`/`noUnusedParameters` + real type errors listed in validate output); upgrade `type-check:web` and `lint:check:web` in `validate-for-commit.js` from WARN to FAIL after cleanup

---

## Phase 2 — Information Architecture (1 week)

### 2.1 Sidebar Restructure
- [x] **P2-T1** — Redesign `Sidebar.tsx`: 6 primary items + collapsible `Manage` group (Bills, Subscriptions, Debt Payoff, Credit Score, Investments, Net Worth, Members) *(done in P1-T6)*

### 2.2 Overview / Dashboard Page
- [x] **P2-T2** — Create `packages/web-app/src/pages/OverviewPage.tsx` shell with data service connections
- [x] **P2-T3** — Add `/overview` route to `App.tsx`; change default authenticated redirect from `/budget` to `/overview`
- [x] **P2-T4** — Overview: Financial Health Bar (income assigned / spent / remaining for current month)
- [x] **P2-T5** — Overview: Net Worth Trend sparkline (6-month, pulls from NetWorth data)
- [x] **P2-T6** — Overview: Top 5 Spending Categories with bar chart vs. budget
- [x] **P2-T7** — Overview: Upcoming Bills next 7 days
- [x] **P2-T8** — Overview: Active Goals top 3 compact progress bars
- [x] **P2-T9** — Overview: AI Insight of the Day + Quick Add Transaction inline form
- [x] **P2-T10** — Apply `PageHeader` component to all existing pages (BudgetPage, GoalsPage, AccountsPage, InsightsPage, SettingsPage, BillsPage, SubscriptionsPage, DebtPayoffPage, CreditScorePage)
- [x] **P2-T11** — Add `/net-worth` route to `App.tsx`; add NetWorthPage to Manage group nav

---

## Phase 3 — Core Feature Polish (3 weeks)

### 3.1 Budget Page
- [x] **P3-T1** — Add "Ready to Assign" banner: `$X unassigned`, green at zero, yellow when over-assigned, click scrolls to first income group
- [x] **P3-T2** — Add skeleton loading screen matching 3-column layout (pulsing group rows)
- [x] **P3-T3** — Keyboard shortcuts: `T` (add transaction), `B` (add budget item), `←/→` (month nav), `/` (search focus), `?` (shortcuts overlay), `Escape` (close modal)
- [ ] **P3-T4** — Inline category amount editing: click planned amount → inline input, no modal required
- [x] **P3-T5** — Over-budget row: amber background + red progress bar when `spentAmount > plannedAmount` *(already implemented)*

### 3.2 Insights Page
- [x] **P3-T6** — Insights page: Chat bubble UI for AI Q&A: user bubble right, AI bubble left, typing indicator (3-dot)
- [x] **P3-T7** — Insights page: Session persistence: last 5 Q&A pairs in `sessionStorage`, survives page refresh
- [ ] **P3-T8** — Insights page: Replace existing chart with `recharts` (lazy loaded), proper axes + tooltips + responsive
- [ ] **P3-T9** — Insights page: Category filter for trend chart

### 3.3 Goals Page
- [ ] **P3-T10** — Card grid layout with SVG progress rings, `$X of $Y`, days remaining, inline "Add funds" button

### 3.4 Debt Payoff Page
- [ ] **P3-T11** — Payoff timeline: horizontal timeline showing projected payoff dates per debt, color-coded by type
- [ ] **P3-T12** — Extra payment slider + input combo with real-time recalculation

### 3.5 Global States
- [x] **P3-T13** — Skeleton screens on Goals, Insights, Accounts, Debt pages
- [x] **P3-T14** — Empty states on all list pages (Goals, Bills, Transactions, Debts — copy in plan)
- [ ] **P3-T15** — Error states: network error with retry button, auth error redirects with `?returnTo=`, partial failure inline

### 3.6 Settings Page
- [x] **P3-T16** — Tab-based Settings: Profile, Budget, Notifications, Banks, Privacy, Help tabs

---

## Phase 4 — AI Strategy (3 weeks)

- [x] **P4-T1** — Wire real Bedrock call in AI budget generation Lambda (replace setTimeout mock)
- [x] **P4-T2** — Multi-step progress animation on `AIBudgetGenerationPage`: 4 steps with status text
- [ ] **P4-T3** — DynamoDB: `AI_CONVERSATION#<userId>` entity schema (last 30 interactions)
- [ ] **P4-T4** — Backend: inject last 5 exchanges + user goals + budget status as context in every Bedrock Insights call
- [ ] **P4-T5** — Frontend: rename "Ask about spending" → "Ask your AI coach"; chat bubble UI polish
- [ ] **P4-T6** — Backend: transaction rules engine Lambda + `RULE#<budgetId>#<ruleId>` DynamoDB entity
- [ ] **P4-T7** — Backend: apply rules engine on Plaid import pipeline
- [ ] **P4-T8** — Frontend: "Create a rule?" prompt on transaction recategorization
- [ ] **P4-T9** — Frontend: rules management in Settings > Budget tab
- [ ] **P4-T10** — Backend: EventBridge daily spending analysis Lambda (pace check, unusual txns, goal tracking)
- [ ] **P4-T11** — Frontend: AI Alert card on Overview page (surfaces nudge notifications)
- [ ] **P4-T12** — Backend: Budget Health Score calculation Lambda `(savings_rate×0.4 + adherence×0.4 + goal_progress×0.2)`
- [ ] **P4-T13** — Frontend: Budget Health Score ring on Overview page with month-over-month delta
- [ ] **P4-T14** — Backend: Cash flow forecast calculation (remaining income - bills - avg daily spend)
- [ ] **P4-T15** — Frontend: end-of-month balance forecast on Overview + 30-day timeline on Accounts

---

## Phase 5 — Onboarding & Conversion (2 weeks)

- [x] **P5-T1** — Rewrite `LandingPage.tsx`: new headline "Your budget, built in 60 seconds", proof animation section, clean pricing section
- [ ] **P5-T2** — Create `/pricing` page (`PricingPage.tsx`) with Free vs Premium comparison table
- [ ] **P5-T3** — Redesign onboarding to 4 steps: Location+size → Budget type → AI generation → Review+customize
- [ ] **P5-T4** — AI generation multi-step progress animation (4 step labels during Bedrock call)
- [ ] **P5-T5** — Welcome tooltip chain on Overview page (first-login only, highlight 3 key features)
- [x] **P5-T6** — Contextual premium gates: Insights AI memory, data export, health score history
- [ ] **P5-T7** — Backend: SES monthly budget kickoff email via EventBridge (1st of month trigger)
- [ ] **P5-T8** — Frontend: daily rotating AI insight pool (30+ templates) on Overview page

---

## Phase 6 — Quality & Polish (2 weeks, overlaps Phase 5)

- [ ] **P6-T1** — Responsive audit at 1280px, 1024px, 768px
- [ ] **P6-T2** — Fix 3-column budget layout at 1024px: transaction sidebar → slide-over panel
- [ ] **P6-T3** — Add `<768px` "Get the mobile app" banner
- [ ] **P6-T4** — Accessibility: `aria-label` on all icon-only buttons post-Lucide migration
- [ ] **P6-T5** — Accessibility: screen reader test of budget page row read-out
- [ ] **P6-T6** — Lighthouse audit; reach ≥85 Performance score
- [ ] **P6-T7** — Lazy-load `recharts` bundle (only on Insights/Debt pages)
- [x] **P6-T8** — Transaction filter: real-time search input + "clear all filters" button
- [x] **P6-T9** — Transaction filter: persist state to `sessionStorage`

---

## Definition of "Web App Complete" (18 criteria)

- [ ] Single brand color — green throughout, no blue primary
- [ ] Inter font rendering on all OS
- [ ] Lucide icons in sidebar and all icon-heavy components
- [ ] Sidebar has ≤6 primary navigation items
- [ ] Overview/Dashboard page ships with all 7 sections
- [ ] Budget page has "Ready to Assign" counter + keyboard shortcuts + inline editing
- [ ] Real Bedrock AI budget generation (no mock)
- [ ] AI coach has conversation memory + user context
- [ ] Transaction rules engine in place
- [ ] Proactive nudges firing via EventBridge
- [ ] Skeleton screens on all data-fetching pages
- [ ] Empty states on all list pages
- [ ] Landing page rewritten with new headline
- [ ] Onboarding is 4 steps with AI animation
- [ ] At least 3 contextual premium gates in place
- [ ] Lighthouse Performance ≥85
- [ ] WCAG 2.1 AA color contrast passes
- [ ] Responsive at 1024px and 768px
