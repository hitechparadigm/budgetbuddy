# BudgetBuddy Web App — Polish Plan
**Goal: Production-ready web app before mobile development begins**
*Authored: June 2026 | Based on heuristic assessment + competitor analysis + code audit*

---

## Executive Summary

BudgetBuddy has more features than any competitor at its price point. The gap is not capability — it is
**fit, finish, and intelligent use of AI**. This plan covers six sequential phases that take the app from
"functional prototype" to a product that competes on design quality with Monarch Money and Copilot.

**Estimated total effort:** 14–18 weeks (solo or small team)
**Sequence matters:** Phase 1 (design foundation) unblocks every phase that follows. Do not skip it.

---

## Competitive Benchmark

| What we must match | Who does it best | Gap today |
|---|---|---|
| Visual polish, single brand color | Copilot, Monarch | Blue/green split, emoji icons |
| Navigation simplicity (≤6 items) | Copilot (4), Monarch (6) | 13 items |
| Persistent financial status signal | YNAB ("Ready to Assign") | Missing |
| Auto-categorization rules | Copilot | Missing |
| Conversational AI (persistent memory) | Cleo 3.0 | Stateless Q&A only |
| Dashboard / spending overview | Monarch, Copilot | Missing page |
| Paycheck planning / cash flow | EveryDollar | Missing |
| Onboarding conversion (<5 min to value) | EveryDollar, Copilot | Multi-step friction |
| Skeleton loading, polished empty states | All competitors | Spinners only |
| Freemium upgrade prompts (contextual) | All competitors | Missing |

---

## Phase 1 — Design Foundation
**Duration: 2 weeks | Blocks everything else**

### 1.1 — Commit to One Brand Color

**Problem:** The app uses blue (`#2563eb`) as the token `--color-primary` but green
(`emerald-600`) on the landing page, sidebar active states, and CTAs. The product
has no visual identity.

**Decision:** Green wins. It is warmer, less banking-cold, and already dominant in the
emotional-anchor moments (onboarding, sidebar, CTAs). Blue should become a neutral
utility color used only for links and informational states.

**Changes required:**
- `index.css`: Change `--color-primary` to `#059669` (emerald-600), `--color-primary-hover` to `#047857`
- `tailwind.config.js`: Remove hardcoded `primary.50/500/600/700` hex values — route everything through CSS vars
- `LandingPage.tsx`, `AuthPage.tsx`: Replace hardcoded `bg-emerald-600` classes with `bg-primary`
- Audit every file for `text-blue-*`, `bg-blue-*`, `border-blue-*` — replace semantic uses with tokens
- Update dark mode primary to `#34d399` (emerald-400) for contrast

### 1.2 — Typography: Add Inter

**Problem:** System font stack renders differently across Windows, Mac, and Android.
The app looks like a different product depending on the OS.

**Changes:**
- Add `@fontsource/inter` (or Google Fonts CDN with `display=swap`) — pinned exact version
- `index.css`: Set `font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- Add a type scale token set: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`,
  `--text-2xl`, `--text-3xl` mapped to Tailwind's scale
- Use `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'` for Inter's tabular numerals —
  critical for financial figures so digits align in columns

### 1.3 — Replace Emoji Icons with Lucide React

**Problem:** Emoji sidebar icons signal prototype quality. They render inconsistently
across OS/browser, have no consistent stroke weight, and can't be themed.

**Package:** `lucide-react` (already a common Tailwind+React pairing, tree-shakeable SVG)

**Sidebar icon mapping:**
```
Budget        → LayoutDashboard
Accounts      → Landmark
Members       → Users
Goals         → Target
Investments   → TrendingUp
Insights      → Sparkles
Bills         → FileText
Subscriptions → RefreshCw
Debt Payoff   → CreditCard
Credit Score  → Award
Tips          → MessageCircle
Learn         → BookOpen
Settings      → Settings2
```

**Also replace emoji in:** `OnboardingPage` budget type options, `GoalsPage` goal icons
(allow users to pick from a curated set of Lucide icons rather than freeform emoji).

### 1.4 — Centralize Component Primitives

**Problem:** Buttons, cards, and inputs are styled inline with raw Tailwind throughout
pages. There is no reusable component layer, so a button change requires touching 20 files.

**Create `packages/web-app/src/components/ui/` with:**
- `Button.tsx` — variants: `primary`, `secondary`, `ghost`, `destructive`; sizes: `sm`, `md`, `lg`
- `Card.tsx` — wraps the `.card` CSS utility with optional header/footer slots
- `Badge.tsx` — variants: `success`, `warning`, `danger`, `neutral`
- `Input.tsx` / `Textarea.tsx` — uses `.input` CSS utility, forwards refs
- `Skeleton.tsx` — animated placeholder for loading states
- `EmptyState.tsx` — icon + heading + description + optional CTA (consolidates existing `EmptyState.tsx`)
- `PageHeader.tsx` — consistent title + subtitle + right-slot pattern used on every page
- `StatCard.tsx` — labeled number with trend indicator (used on Dashboard, Goals, Debt)

This is not a full design system rebuild — just extracting the patterns that already exist
in the app into reusable components. Estimate: 2–3 days of work.

---

## Phase 2 — Information Architecture
**Duration: 1 week**

### 2.1 — Sidebar: Reduce from 13 to 6 Items

**Problem:** 13 nav items creates decision fatigue and buries important features in a
list users stop reading at item 5. Every competitor uses ≤6 primary nav items.

**New sidebar structure:**

```
PRIMARY (always visible)
  ├── Overview          (new — Dashboard page)
  ├── Budget            (existing BudgetPage)
  ├── Accounts          (existing AccountsPage)
  ├── Goals             (existing GoalsPage)
  ├── Insights          (existing InsightsPage)
  └── Manage ▾          (new collapsible group)
        ├── Bills
        ├── Subscriptions
        ├── Debt Payoff
        ├── Credit Score
        ├── Investments
        ├── Net Worth
        └── Members

SECONDARY (bottom of sidebar)
  └── Settings          (absorbs Learn, Help, Tips via tabs)
```

**Settings page redesign:** Add a `Help & Learning` tab that contains Tips Feed and Learn
content. This removes two nav items with zero feature loss.

**Manage group behavior:** Collapses to a single `LayoutGrid` icon in collapsed sidebar mode;
expands to show sub-items with a chevron when sidebar is expanded.

### 2.2 — Add the Missing Dashboard (Overview Page)

**This is the most impactful missing feature in the app.**

Every top competitor (Monarch, Copilot, YNAB) has a **home dashboard** that gives users
a financial snapshot without requiring them to navigate to individual sections.

BudgetBuddy's "Budget" page is the current default route — but it is a working tool,
not an overview. New and returning users need a landing screen that answers:
"How am I doing right now?"

**`/overview` page — sections:**
1. **Financial Health Bar** — current month's budget status: income assigned, spent, remaining
2. **Net Worth Trend** — simple sparkline showing 6-month movement (pulls from NetWorthPage data)
3. **Top Spending Categories** — 5 categories with bar chart (vs. budget), this month
4. **Upcoming Bills** — next 7 days, from BillsPage data
5. **Active Goals Progress** — top 3 goals with compact progress bars
6. **AI Insight of the Day** — one sentence from the Insights engine, refreshed daily
7. **Quick Add Transaction** — inline form (amount + category), no modal required

**Route change:** Make `/overview` the default authenticated route. Redirect `/` → `/overview`.

### 2.3 — Standardize Page Header Pattern

Every page currently implements its own title/subtitle markup. Create a `PageHeader`
component and apply it uniformly:

```tsx
<PageHeader
  title="Goals"
  subtitle="3 active · $12,400 saved of $28,000 total"
  action={<Button variant="primary" size="sm">Add Goal</Button>}
/>
```

This alone creates perceived visual consistency across the entire app.

---

## Phase 3 — Core Feature Polish
**Duration: 3 weeks**

### 3.1 — Budget Page

**Add "Ready to Assign" counter**
- Persistent banner below the month navigator showing `$X unassigned`
- Turns green when zero (fully budgeted), yellow when over-assigned
- Clicking it scrolls to the first income group
- This is YNAB's most-copied UI pattern for good reason: it makes zero-based budgeting legible at a glance

**Add skeleton loading screens**
- Replace the full-page spinner with a skeleton layout that matches the 3-column structure
- Show fake group rows with pulsing gray bars during initial load
- Perceived load time drops dramatically even if actual load time is unchanged

**Keyboard shortcuts**
- `T` → open Add Transaction modal
- `B` → open Add Budget Item modal
- `←` / `→` → previous/next month
- `/` → focus search/filter
- `Escape` → close any open modal
- Show a `?` button in the page header that opens a keyboard shortcut reference overlay

**Category inline editing**
- Clicking a planned amount in a category row should make it directly editable (inline input)
- Currently requires opening a modal — this is a friction point for daily budgeting
- Monarch and YNAB both support inline amount editing

**Over-budget visual warning**
- When a category's `spentAmount > plannedAmount`, the progress bar turns red/amber
- Add a subtle amber background to the row — not just the bar color

### 3.2 — Insights Page

**Make the AI Q&A feel like a product, not a debug panel**

Current: a text input, a "Ask" button, and a text response in a box.
Target: a conversational interface with message bubbles.

Changes:
- Render the question + answer as a chat thread (user bubble right, AI bubble left)
- Show a typing indicator (3-dot animation) while `askLoading` is true
- Persist the last 5 Q&A pairs in `sessionStorage` so refreshing doesn't wipe the conversation
- Suggested questions as pill chips below the input (already in the response object, just need visual polish)

**Weekly insight card**
- Replace plain text with a structured card: headline, body, and a "See details" link
- Add a category badge (e.g., "Dining", "Subscriptions") so users scan faster

**Spending trends chart**
- The current chart relies on a basic implementation — replace with `recharts` (already popular
  in React+Tailwind projects, lightweight) for proper axes, tooltips, and responsive behavior
- Add a category filter so users can isolate one category's 6-month trend

### 3.3 — Goals Page

**Visual progress cards (not just progress bars)**
- Replace the current list layout with a card grid
- Each card: goal icon, name, progress ring (SVG circle), `$X of $Y`, days remaining, and a
  "Add funds" button directly on the card — no need to open a modal first

**AI Goal Advisor** (new feature — see Phase 4)
- "At your current savings rate, you'll reach this goal in X months. Add $Y/month to hit your target date."
- Pulls from the budget's savings category data + goal target

### 3.4 — Debt Payoff Page

**Payoff timeline visualization**
- Add a horizontal timeline showing each debt's projected payoff date under the selected strategy
- Color-code by debt type (mortgage = blue, credit card = red, car = gray)
- Show the "interest savings with avalanche vs. snowball" callout more prominently

**Extra payment slider**
- Replace the numeric input for extra payment with a slider + input combo
- Real-time recalculation of payoff date and interest saved as the slider moves

### 3.5 — Loading, Empty, and Error States (global)

Every page needs three states. Audit all pages and add missing ones:

**Loading:** Skeleton screens (not spinners) for list/table pages; spinners only for button actions.

**Empty:**
- Goals: "You haven't set a goal yet. Where do you want to be in 6 months?" + Add Goal CTA
- Bills: "No upcoming bills tracked. Add your first bill to get payment reminders."
- Transactions: "No transactions this month. Add one manually or connect a bank account."
- Debts: "Debt-free! Or add a debt to start your payoff plan."

**Error:**
- Network error: "Couldn't connect. Check your internet, then [retry]." — retry button calls the fetch again
- Auth error: Redirect to `/auth` with `?returnTo=` so user lands back on the page after re-login
- Partial failure: If one section fails (e.g., trends), show that section's error inline without
  collapsing the whole page

### 3.6 — Settings Page Consolidation

**Current:** Settings is a single long-scroll page with sections for Location, Currency, Bank,
2FA, Theme, Backup/Restore, etc.

**New:** Tab-based layout with sections:
- `Profile` — name, email, password, 2FA
- `Budget` — currency, location, fiscal year start
- `Notifications` — email + push preferences
- `Banks` — Plaid connections (currently split between Settings and Accounts)
- `Privacy` — data export, backup/restore, account deletion
- `Help` — Tips, Learn, Help Center, keyboard shortcuts

---

## Phase 4 — AI Strategy
**Duration: 3 weeks | Highest differentiation potential**

### Current AI State

| Feature | Current implementation | Gap |
|---|---|---|
| Budget generation | `AIBudgetGenerationPage.tsx` — **mocked with setTimeout** | Not calling Bedrock |
| Insights Q&A | `insightsApi.askAboutSpending()` — calls backend | Works, but stateless |
| Weekly insights | Backend-generated, displayed as text | No visual hierarchy |
| Tips feed | Static/editorial content | Not personalized |

### 4.1 — Connect the Real AI Budget Generation

The `AIBudgetGenerationPage` currently simulates a 3-second wait and returns hardcoded mock data.
This is the app's #1 differentiator and it is not yet wired up.

**Backend:** `backend/functions/ai-budget-generation/` needs to call Bedrock (Claude 3.5 Haiku
for cost efficiency) with a prompt that includes:
- User city + country
- Household size
- Selected budget type (personal/family/shared)
- Local cost-of-living data from the 348-city dataset

**Prompt strategy:**
```
You are a financial planning assistant. Generate a zero-based monthly budget for a household of
{size} in {city}, {country} on a {type} budget plan. Return JSON with income, savings, and
expense groups with realistic local amounts. Use the 50/30/20 rule as a baseline but adjust for
local costs. Include a 3-sentence aiInsights array explaining your reasoning.
```

**Frontend:**
- Replace the `setTimeout` mock with the real API call
- Show a multi-step progress animation during generation: "Analyzing cost of living in {city}..." →
  "Building your budget categories..." → "Reviewing for your household size..." → "Ready!"
- This animation makes the AI feel real and impressive even if the actual call is fast

### 4.2 — AI Financial Coach (Persistent, Contextual)

**The core problem with the current Insights Q&A:** Every session starts from zero.
The AI has no memory of previous conversations, user goals, or past insights.

**What to build:**
- Store the last 30 AI interactions per user in DynamoDB (`AI_CONVERSATION#<userId>`)
- Pass the last 5 exchanges as context in every Bedrock call (rolling window)
- Inject the user's active goals, current month's budget status, and top 3 spending categories
  as system context on every request
- The AI can then answer contextually: "Last week you asked about dining. This week you're $45
  over — want me to find where that went?"

**UI:**
- Rename "Ask about spending" to "Ask your AI coach"
- Add a panel that persists across navigation (or a floating button) — not just on the Insights page
- Make it accessible from the Budget page (primary daily-driver page)

### 4.3 — Smart Transaction Categorization (Rules Engine)

**The biggest feature gap vs. Copilot.**

When a user moves transaction from "Dining" to "Groceries", that correction should create a rule:
"Transactions from Whole Foods → always Groceries." This eliminates the need to re-correct the
same merchant every month.

**Backend:**
- New DynamoDB entity: `RULE#<budgetId>#<ruleId>` with fields: `merchantPattern`, `categoryId`,
  `createdAt`, `appliedCount`
- When importing Plaid transactions, run them through the rules engine before saving
- Expose a `/rules` CRUD endpoint

**Frontend:**
- When user recategorizes a transaction, show a prompt: "Always categorize [Merchant] as [Category]?"
  with "Yes" / "Just this once" options
- `/settings` → `Budget` tab shows all rules with the ability to edit or delete them

### 4.4 — Proactive Spending Nudges

**What competitors don't have (yet) — a real AI advantage.**

Use EventBridge scheduled rule (daily) to run an analysis Lambda that:
1. Checks if user is on pace to overspend in any category (current spend ÷ days elapsed > budget ÷ total days)
2. Checks for unusual transactions (amount > 2× category average)
3. Checks if a savings goal is falling behind monthly target

For each finding, create a notification record and surface it:
- In the Overview page as an "AI Alert" card
- As a browser notification (if user granted permission)
- In the NotificationCenter (already exists in components)

**Tone:** Supportive, not alarming. "You've spent $340 of your $400 dining budget with 12 days
left. Might be worth cooking in a couple nights." Not: "WARNING: OVERSPENDING DETECTED."

### 4.5 — Budget Health Score

**A single number that summarizes financial wellness — extremely shareable and retentive.**

Calculate monthly: `(savings_rate × 0.4) + (budget_adherence × 0.4) + (goal_progress × 0.2)`

- Show as a score out of 100 on the Overview page with a color-coded ring
- Show month-over-month delta: "+7 from last month"
- Add a tooltip explaining what drives the score and what the user can improve
- This becomes a natural upgrade hook: "Premium users see a 12-month health score history"

### 4.6 — Cash Flow Forecast (EveryDollar's "Paycheck Planning")

Show users their projected account balance through the end of the month based on:
- Remaining planned income (from budget)
- Remaining planned bills/subscriptions (from Bills + Subscriptions pages)
- Average daily discretionary spend (from transaction history)

**Simple version:** A single "Est. end-of-month balance: +$340" on the Overview page.
**Full version:** A 30-day timeline chart on the Accounts page showing projected vs. actual.

---

## Phase 5 — Onboarding & Conversion
**Duration: 2 weeks**

### 5.1 — Landing Page Rewrite

**Current headline:** "Take control of your family finances"
**Problem:** "Family finances" excludes solo users (the largest segment). The actual differentiator
is the AI generation, which the page buries in a feature grid.

**New structure:**
```
HERO
  Headline:   "Your budget, built in 60 seconds."
  Subline:    "Tell us your city and household size. We'll generate a personalized zero-based
               budget using local cost-of-living data. No spreadsheets. No guesswork."
  CTA:        "Build my budget — it's free"
  Social:     "Trusted by X,XXX users across 348 cities"

PROOF (animated)
  Show the 3-step AI flow: Location → Generate → Done
  30-second auto-play, no click required

FEATURE GRID (after proof)
  Lead with collaboration, then bank sync, then insights
  Remove the generic "Bank-Level Security" tile — this is table stakes, not a differentiator

PRICING (clear, simple)
  Free: [list 4 things]   Premium $9.99/mo: [list 6 things]
  "Start free — upgrade when you're ready"

FOOTER
  Links to Help, Privacy, Terms, About
```

### 5.2 — Onboarding Flow Optimization

**Current flow:** Budget type selection → OnboardingFlow (city, household, categories) → API → Budget page

**Problems:**
1. The "budget type" step (personal/family/shared) is a cold choice with no prior context
2. The family disclosure modal is good but adds a step before users understand the value
3. The transition from onboarding → AI generation → budget dashboard is jarring (no continuity)

**Improved flow:**
1. **Step 1 (30 sec):** "Where do you live?" + "How many people are you budgeting for?"
2. **Step 2 (20 sec):** "What kind of budget?" — personal / with a partner / with roommates
   - Show the description inline under each option (currently behind the disclosure modal)
3. **Step 3 (60 sec):** AI generates the budget with the multi-step progress animation (Phase 4.1)
4. **Step 4 (60 sec):** Review + customize generated categories — pre-selected, user can toggle off
5. **Activate:** Land on the Overview page (not Budget page) — show a "Welcome to BudgetBuddy"
   tooltip chain that highlights the 3 most important things

**Key principle:** The first value moment is seeing your personalized budget. Everything before
that is friction. Minimize it.

### 5.3 — Premium Upgrade Gates (Contextual, Not Paywalls)

**Current state:** No visible premium differentiation in the UI once a user is in the app.

**Where to place upgrade prompts:**
- **Insights page** — "AI Coach with memory is a Premium feature. Upgrade to keep your conversation history."
- **Reports section** (future) — behind gate with preview screenshot
- **Exporting data** — prompt appears when user clicks export
- **Multiple budgets** — "Premium lets you manage a second budget (e.g., a business budget)"
- **Budget Health Score history** — "See your 12-month history with Premium"

**Design principle:** Show the feature, then gate it. Never hide the existence of a premium feature.
Show a preview/blur and a soft "Upgrade" button. Don't hard-block with a modal.

**Pricing page:** Add `/pricing` as a proper page (not just a section of the landing page) so it
can be linked from in-app prompts. Show a comparison table: Free vs. Premium.

### 5.4 — Return User Re-engagement

**77% of app users stop using an app within 3 days.** The antidote is a daily reason to return.

- **Daily AI insight** on the Overview page that changes each day (rotate from a pool of 30+
  insight types: "You're $X under budget on groceries this month 🎉", "3 subscriptions renewed
  this week totaling $X", "Your savings rate this month is X%")
- **Streak indicator** — "You've budgeted for 7 days in a row" — small badge, not gamified, just
  a friendly signal (this is Cleo's core retention mechanic)
- **Monthly budget kickoff reminder** — on the 1st of each month, SES email: "Your [Month] budget
  is ready. Here's what we've pre-filled from last month."

---

## Phase 6 — Quality of Life & Polish
**Duration: 2 weeks (can overlap with Phase 5)**

### 6.1 — Responsive Design Audit

The app needs to work well at these breakpoints before mobile development:
- `1280px` (desktop standard)
- `1024px` (laptop / tablet landscape)
- `768px` (tablet portrait — last supported web breakpoint)

Below 768px, the web app should show a "Get the mobile app" banner rather than trying
to render the full budget table on a small screen. Set this expectation clearly.

**Known issues to fix:**
- The 3-column budget layout at 1024px — the transaction sidebar needs to become a slide-over
- Settings page tabs at 768px — should become an accordion
- Budget group tables — horizontal scroll on narrow screens, not overflow-hidden

### 6.2 — Accessibility Pass (WCAG 2.1 AA)

The development status notes that a heuristic review was done (Session 145). Remaining gaps:
- Color contrast audit with the new green primary (test at `#059669` on white — passes AA at 4.68:1)
- Focus visible on all interactive elements — especially new Lucide icon buttons
- `aria-label` on all icon-only buttons (collapsed sidebar icons, FAB, theme toggle)
- Screen reader test: budget page row read-out should say "Housing: $1,200 planned, $980 spent"
- Ensure `recharts` charts include accessible descriptions for screen readers

### 6.3 — Performance Budget

Before calling the web app "production-ready", hit these targets:
- **Lighthouse Performance:** ≥85
- **FCP (First Contentful Paint):** <1.5s
- **LCP (Largest Contentful Paint):** <2.5s
- **Bundle size:** <300KB gzipped for initial route
- **API calls on Budget page initial load:** ≤3 concurrent

**Quick wins:**
- Add `Inter` with `font-display: swap` to prevent FOIT
- Lazy-load `recharts` (it's large) — only load on Insights/Debt pages
- Code-split the AI generation page — it's only visited once per user lifetime
- Verify Vite's build output — ensure tree-shaking is eliminating unused Lucide icons

### 6.4 — NetWorth Page Integration

`NetWorthPage.tsx` exists but is not in the App.tsx routes or the sidebar. Either:
- Add it as a route under `/net-worth` and include it in the Manage group, OR
- Merge its data into the Overview page's summary section

Given the overlap with `DebtPayoffPage` (both track liabilities) and `GoalsPage` (both
track savings progress), the NetWorth page likely becomes a tab within a future
"Wealth" section. For now, add the route and the nav item under Manage.

### 6.5 — Transaction Search & Filter Polish

The `TransactionFilters` component exists. Polish needed:
- Add a search input that filters transactions by description/merchant name in real-time
- Filter pills should show the active count ("3 filters active")
- Add a "Clear all filters" button that appears when any filter is active
- Persist filter state to `sessionStorage` so navigating away and back doesn't reset filters

---

## Product Requirements Updates

The following requirements should be added or updated in the spec:

### New Requirements

| ID | Requirement | Phase |
|---|---|---|
| REQ-NEW-01 | Overview/Dashboard page with financial health summary | 2 |
| REQ-NEW-02 | "Ready to Assign" counter persistent on Budget page | 3 |
| REQ-NEW-03 | Skeleton loading screens on all data-fetching pages | 3 |
| REQ-NEW-04 | Real Bedrock integration for AI budget generation | 4 |
| REQ-NEW-05 | Persistent AI conversation context (30-message window) | 4 |
| REQ-NEW-06 | Transaction categorization rules engine | 4 |
| REQ-NEW-07 | Proactive spending nudges via EventBridge + notifications | 4 |
| REQ-NEW-08 | Budget Health Score (composite metric, visible on Overview) | 4 |
| REQ-NEW-09 | Cash flow forecast (end-of-month balance projection) | 4 |
| REQ-NEW-10 | Inline category amount editing on Budget page | 3 |
| REQ-NEW-11 | Keyboard shortcuts on Budget page | 3 |
| REQ-NEW-12 | Premium upgrade gates (contextual, non-blocking) | 5 |
| REQ-NEW-13 | `/pricing` page | 5 |
| REQ-NEW-14 | Daily AI insight rotation on Overview page | 5 |
| REQ-NEW-15 | Monthly budget kickoff SES email | 5 |
| REQ-NEW-16 | Transaction rules CRUD in Settings | 4 |
| REQ-NEW-17 | Paycheck planning / cash flow timeline on Accounts page | 4 |
| REQ-NEW-18 | Budget Health Score history (Premium feature) | 4/5 |

### Updated Requirements

| ID | Change |
|---|---|
| REQ-01 (Landing) | Rewrite headline to "Your budget, built in 60 seconds" |
| REQ-12 (Onboarding) | Streamline to 4 steps, eliminate cold-choice budget type step |
| REQ-39 (Insights) | Add chat bubble UI, session persistence, contextual AI memory |
| REQ-41 (Net Worth) | Add to router and sidebar Manage group |

---

## Execution Task Breakdown

### Phase 1 Tasks (Design Foundation)

- [ ] **P1-T1** — Decide on green as primary; update `--color-primary` + `--color-primary-hover` in `index.css`
- [ ] **P1-T2** — Audit all files for hardcoded `bg-emerald-*` / `text-blue-*` and route through tokens
- [ ] **P1-T3** — Add `@fontsource/inter` (exact pinned version); update `index.css` font-family
- [ ] **P1-T4** — Add `font-feature-settings` for tabular numerals to `index.css`
- [ ] **P1-T5** — Install `lucide-react` (pinned version); create icon mapping constant file
- [ ] **P1-T6** — Update `Sidebar.tsx` to use Lucide icons instead of emoji strings
- [ ] **P1-T7** — Update `OnboardingPage.tsx` budget type cards to use Lucide icons
- [ ] **P1-T8** — Create `packages/web-app/src/components/ui/Button.tsx`
- [ ] **P1-T9** — Create `packages/web-app/src/components/ui/Card.tsx`
- [ ] **P1-T10** — Create `packages/web-app/src/components/ui/Badge.tsx`
- [ ] **P1-T11** — Create `packages/web-app/src/components/ui/Skeleton.tsx`
- [ ] **P1-T12** — Create `packages/web-app/src/components/ui/PageHeader.tsx`
- [ ] **P1-T13** — Create `packages/web-app/src/components/ui/StatCard.tsx`
- [ ] **P1-T14** — Migrate `LandingPage.tsx` to use `Button` component; verify no raw Tailwind CTAs remain
- [ ] **P1-T15** — Verify Lighthouse contrast scores pass AA with new primary green

### Phase 2 Tasks (Information Architecture)

- [ ] **P2-T1** — Redesign `Sidebar.tsx` with new 6-item structure + Manage collapsible group
- [ ] **P2-T2** — Create `packages/web-app/src/pages/OverviewPage.tsx` (shell + data connections)
- [ ] **P2-T3** — Add `/overview` route to `App.tsx`; change default redirect from `/budget` to `/overview`
- [ ] **P2-T4** — Build Overview page: Financial Health Bar section
- [ ] **P2-T5** — Build Overview page: Net Worth Trend sparkline
- [ ] **P2-T6** — Build Overview page: Top Spending Categories
- [ ] **P2-T7** — Build Overview page: Upcoming Bills
- [ ] **P2-T8** — Build Overview page: Active Goals compact cards
- [ ] **P2-T9** — Build Overview page: AI Insight of the Day + Quick Add Transaction
- [ ] **P2-T10** — Apply `PageHeader` component to all existing pages
- [ ] **P2-T11** — Add `/net-worth` route and include in Manage group nav

### Phase 3 Tasks (Feature Polish)

- [ ] **P3-T1** — Budget page: Add "Ready to Assign" banner component
- [ ] **P3-T2** — Budget page: Add skeleton loading screen
- [ ] **P3-T3** — Budget page: Implement keyboard shortcuts (`T`, `B`, `←`, `→`, `/`, `?`)
- [ ] **P3-T4** — Budget page: Inline category amount editing on planned amount click
- [ ] **P3-T5** — Budget page: Over-budget row highlighting (amber background + red progress bar)
- [ ] **P3-T6** — Insights page: Chat bubble UI for Q&A thread
- [ ] **P3-T7** — Insights page: Session persistence for conversation (sessionStorage)
- [ ] **P3-T8** — Insights page: Replace chart with `recharts` (lazy loaded)
- [ ] **P3-T9** — Insights page: Category filter for trend chart
- [ ] **P3-T10** — Goals page: Card grid layout with progress rings
- [ ] **P3-T11** — Debt page: Payoff timeline visualization
- [ ] **P3-T12** — Debt page: Extra payment slider
- [ ] **P3-T13** — Global: Add skeleton screens to Goals, Insights, Accounts, Debt pages
- [ ] **P3-T14** — Global: Implement empty states on all list pages (copy defined above)
- [ ] **P3-T15** — Global: Standardize error states with retry buttons
- [ ] **P3-T16** — Settings: Tab-based layout (Profile, Budget, Notifications, Banks, Privacy, Help)

### Phase 4 Tasks (AI Strategy)

- [ ] **P4-T1** — Wire up real Bedrock call in AI budget generation Lambda
- [ ] **P4-T2** — Build multi-step progress animation on `AIBudgetGenerationPage`
- [ ] **P4-T3** — DynamoDB: Add `AI_CONVERSATION#<userId>` entity schema
- [ ] **P4-T4** — Backend: Pass conversation history + user context to every Bedrock Insights call
- [ ] **P4-T5** — Frontend: Rename "Ask about spending" → "Ask your AI coach" + polish chat UI
- [ ] **P4-T6** — Backend: Build rules engine Lambda + DynamoDB entity
- [ ] **P4-T7** — Backend: Apply rules on Plaid import pipeline
- [ ] **P4-T8** — Frontend: "Create a rule?" prompt on transaction recategorization
- [ ] **P4-T9** — Frontend: Rules management in Settings > Budget tab
- [ ] **P4-T10** — Backend: EventBridge daily spending analysis Lambda
- [ ] **P4-T11** — Frontend: AI Alert card on Overview page
- [ ] **P4-T12** — Backend: Budget Health Score calculation Lambda
- [ ] **P4-T13** — Frontend: Budget Health Score ring on Overview page
- [ ] **P4-T14** — Backend: Cash flow forecast calculation
- [ ] **P4-T15** — Frontend: End-of-month forecast on Overview + timeline on Accounts

### Phase 5 Tasks (Onboarding & Conversion)

- [ ] **P5-T1** — Rewrite `LandingPage.tsx` (new headline, proof animation, pricing section)
- [ ] **P5-T2** — Create `/pricing` page
- [ ] **P5-T3** — Redesign onboarding flow to 4 steps (reduce friction)
- [ ] **P5-T4** — Build AI generation multi-step progress animation
- [ ] **P5-T5** — Create Welcome tooltip chain on Overview page (first-login only)
- [ ] **P5-T6** — Add contextual premium gates: Insights, data export, health score history
- [ ] **P5-T7** — Backend: SES monthly budget kickoff email (EventBridge trigger on 1st of month)
- [ ] **P5-T8** — Frontend: Daily rotating AI insight pool (30+ insight templates)

### Phase 6 Tasks (Quality & Polish)

- [ ] **P6-T1** — Responsive design audit at 1280px, 1024px, 768px
- [ ] **P6-T2** — Fix 3-column budget layout at 1024px (transaction sidebar → slide-over)
- [ ] **P6-T3** — Add `<768px` "get the app" banner
- [ ] **P6-T4** — Accessibility: aria-labels on all icon-only buttons post-Lucide migration
- [ ] **P6-T5** — Accessibility: Screen reader test of budget page row read-out
- [ ] **P6-T6** — Run Lighthouse audit; reach ≥85 Performance score
- [ ] **P6-T7** — Add lazy loading for `recharts` bundle
- [ ] **P6-T8** — Transaction filter: real-time search input + "clear all filters" button
- [ ] **P6-T9** — Transaction filter: persist state to sessionStorage

---

## Definition of "Web App Complete"

The web app is ready to hand off for mobile development when:

1. ✅ Single brand color — green throughout, no blue primary
2. ✅ Inter font rendering on all OS
3. ✅ Lucide icons in sidebar and all icon-heavy components
4. ✅ Sidebar has ≤6 primary navigation items
5. ✅ Overview/Dashboard page ships with all 7 sections
6. ✅ Budget page has "Ready to Assign" counter + keyboard shortcuts + inline editing
7. ✅ Real Bedrock AI budget generation (no mock)
8. ✅ AI coach has conversation memory + user context
9. ✅ Transaction rules engine in place
10. ✅ Proactive nudges firing via EventBridge
11. ✅ Skeleton screens on all data-fetching pages
12. ✅ Empty states on all list pages
13. ✅ Landing page rewritten with new headline
14. ✅ Onboarding is 4 steps with AI animation
15. ✅ At least 3 contextual premium gates in place
16. ✅ Lighthouse Performance ≥85
17. ✅ WCAG 2.1 AA color contrast passes
18. ✅ Responsive at 1024px and 768px

Once these 18 items are checked, the web app sets a quality bar that the mobile team
can use as the UX reference implementation.
