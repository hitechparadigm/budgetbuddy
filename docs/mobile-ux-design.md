# BudgetBuddy Mobile App — UI/UX Design Reference

**Created**: 2026-06-18 (Session 148)
**Last Updated**: 2026-09-22 (Session 162)
**Authors**: Competitive analysis based on Budge (iOS) and Budgety (iOS) screenshots
**Status**: Living document — update when design decisions change
**Related**: `docs/web-app-polish-plan.md`, `docs/product-requirements.md`

---

## Purpose

This document records the full UI/UX design direction for the BudgetBuddy mobile app, informed by
a hands-on competitive analysis of **Budge** and **Budgety** — the two closest mobile-native
competitors. It captures:

- What each competitor does well (borrow these)
- What each competitor does poorly (avoid these)
- Where BudgetBuddy has feature advantages to highlight
- The agreed design language, navigation structure, and screen layouts
- MVP implementation priority order

Use this document before building any new mobile screen. Do not rely on memory of this analysis.

---

## Competitor Apps Reviewed

### App 1: Budge
- **Category**: Simple expense tracker / personal budgeting
- **Pricing**: Annual $0.79/mo (save 44%), Monthly $1.39/mo, Lifetime $20.99
- **Theme**: Dark background (#0D0D1A approx), purple gradient accents
- **Target**: Solo users, light expense tracking
- **Screens reviewed**: Premium paywall, Profile menu, Currency rates, Categories, Export/Import data, Contact Center, Settings, Analytics (income + expense donut), Goals/Borrowed/Lent, Balance/Accounts

### App 2: Budgety
- **Category**: Full personal finance manager with AI assistant
- **Pricing**: Free tier + premium
- **Theme**: Dark navy (#0D1B2A approx), amber/yellow accent for AI + premium
- **Target**: Advanced users, couples/families, investment tracking
- **Screens reviewed**: Home (net worth + transactions), Profile side drawer with feature grid, Squads (shared finances), Add Squad form, Cash Flow, Budgets overview, Accounts (net worth chart), Add Account (bank connection), Buddy AI chat

---

## Competitor Analysis: Budge

### What Budge Gets Right — Borrow These

#### 1. Colorful, Instantly Recognizable Category Icons
Each category has a unique colored icon (red shopping cart = Supermarket, blue shirt = Clothing,
red apple = Food, blue car = Transport, etc.). This makes the category list scannable in under
1 second without reading labels. Users identify their category by color + shape, not text.

**Action for BudgetBuddy**: Implement a full 36-icon colored category system. Each icon should
have a colored circular background badge (not just an emoji). See Section 5 for the icon catalog.

#### 2. Three-Tier Premium Pricing with Savings Badge
The Budge premium screen shows Annual / Monthly / Lifetime with a gold "Save 44%" badge on
the Annual option. The Lifetime tier ($20.99) is positioned as the anchor — it makes the
Annual look cheap by comparison. The bottom CTA always reflects the currently selected plan.

**Action for BudgetBuddy**: Use the same three-tier pricing layout. BudgetBuddy's $9.99/mo
premium should follow: Monthly ($9.99) / Annual (~$6.99/mo, save 30%) / Lifetime ($79.99).
Always show a savings badge on the annual option.

#### 3. Donut Chart + Transaction List Layout for Analytics
The analytics screen shows a donut chart at the top with percentage labels, then a legend
row below (category chips), then a date separator, then the transaction list. This is the
most efficient layout for "where did my money go" — one screen answers the full question.

**Action for BudgetBuddy**: Adopt this exact layout on the InsightsScreen and the budget
category drill-down. Do not separate the chart from the transactions.

#### 4. Goals Screen Combines Borrowed / Lent Tabs
Rather than having separate screens for savings goals, money owed to you, and money you
owe, Budge puts all three in one screen with a tab row: GOALS / BORROWED / LENT. This
significantly reduces navigation depth.

**Action for BudgetBuddy**: Merge GoalsScreen to include Borrowed and Lent as tabs.

---

### What Budge Gets Wrong — Avoid These

#### 1. Massive Whitespace on Empty Screens
Currency rates screen shows one CAD entry and 80% black empty space. Goals screen with
only two goals shows the same. There is no empty-state illustration, no guidance, no
prompt to add more. Feels unfinished and like the app is broken.

**Action for BudgetBuddy**: Every screen must have a proper empty state with:
- An on-brand illustration (not clipart)
- A clear headline: "No goals yet"
- A supporting sentence: "Set a savings target and track your progress"
- A primary CTA button: "+ Create Your First Goal"

#### 2. Balance Screen Has Wrong Button Label
The Balance / Accounts screen shows an "Add category" button in the center of the screen
where there is only one account (a credit card). The button should say "Add Account."
This is a copy error that undermines credibility.

**Action for BudgetBuddy**: All button labels must match the action context. Audit every
CTA in the mobile app for context-correct copy.

#### 3. Settings Section Labeled "Calendar" for Transaction Settings
The Settings screen groups "Show completed transactions", "Calculate completed transactions",
"Display account icons in transactions" under a "Calendar" section header. None of these
settings have anything to do with a calendar. Users looking for transaction display settings
would not look under "Calendar."

**Action for BudgetBuddy**: Settings sections must be labeled by what they control:
- "Transactions" (not Calendar)
- "Appearance"
- "Privacy"
- "Account"
- "Subscription"
- "Notifications"

#### 4. Import Screen Uses Generic Clipart Illustration
The Import Data screen uses a stock illustration of two businesspeople standing next to a
giant document. This generic clipart feels cheap and mismatched with the dark premium theme.

**Action for BudgetBuddy**: All illustrations must be:
- Custom or curated (not stock clipart)
- Consistent with the brand color palette (emerald / navy)
- Minimal / abstract (not literal cartoon people)

#### 5. Contact Center Is a Blank Text Box
The Contact Center / Feedback screen is literally a text area labeled "Share your problems,
ideas or just thoughts" with a Send button and an "Or send an email instead" link. No
categories, no ticket system, no response tracking, no confirmation state.

**Action for BudgetBuddy**: Feedback screen should include:
- Topic selector: Bug / Feature request / General feedback
- Text area
- Optional: screenshot attachment
- Confirmation screen after send: "Thanks! We'll get back to you within 24 hours."

#### 6. Three-Item Bottom Navigation Is Too Sparse
Budge's bottom nav has only three items: Goals, Calendar, Balance. This means most
features are either hidden or require deep navigation.

**Action for BudgetBuddy**: Use a 5-tab bottom navigation (see Section 4).

#### 7. Analytics Colors Are Visually Jarring
The expense analytics donut uses magenta/hot-pink for "House" (65.9%) which is visually
aggressive against the dark background. Color should communicate meaning, not just
differentiate slices.

**Action for BudgetBuddy**: Expense analytics use warm reds and oranges. Income analytics
use greens and teals. Category-specific accent colors should be consistent across all charts.

---

## Competitor Analysis: Budgety

### What Budgety Gets Right — Borrow These

#### 1. "Buddy AI" Mascot — Approachable Personality
Budgety uses a cartoon beaver as the Buddy AI mascot with a friendly intro message:
"Think of me as your friendly guide to making sense of your money — no stress, no judgment!"
The mascot reduces financial anxiety and gives the AI feature a distinct, memorable identity.

**Action for BudgetBuddy**: Create the BudgetBuddy AI persona. Name: **"Buddy"** (already
in the product name). Character concept: a small friendly owl (wisdom + finance metaphor)
in emerald green. Full onboarding message: "Hi [Name]! I'm Buddy, your financial
accountability partner. I know your income, your expenses, and your goals. Ask me anything."

#### 2. "Left to Budget" Persistent Banner
Budgety's Budget screen has a persistent green banner at the top: "Left to budget $8,250"
This answers the most important zero-based budgeting question — "how much is still
unallocated?" — without any navigation. It is always visible on the budget screen.

**Action for BudgetBuddy**: Add a sticky "Left to Budget" banner to the top of BudgetScreen.
- Green when positive (money remaining to allocate): "Left to budget: $4,700 ✓"
- Red when negative (over-allocated): "Over-allocated by: $320 ⚠️"
- Updates in real time as categories are added or amounts changed.

#### 3. Bank Connection Screen Shows Real Institution Logos
Budgety's Add Account screen shows real bank logos (CIBC, RBC, Scotiabank, TD, etc.) as
overlapping circles, which immediately signals "this works with your real bank."

**Action for BudgetBuddy**: The BankSyncScreen should display the user's local major banks
prominently. For Canadian users: CIBC, RBC, Scotiabank, TD, BMO, Desjardins.

#### 4. Feature Grid in Side Drawer — Power Users Love It
Budgety's profile/menu side drawer shows a 3-column icon grid of all features. This allows
power users to navigate directly to any feature without remembering where it lives.

**Action for BudgetBuddy**: The "Me" tab should include a feature grid (max 6 tiles, 3x2)
for secondary features: Cash Flow, Learning Center, Insights, Receipt Scanner, Credit Score,
Debt Payoff.

#### 5. "Squads" — Better Name for Shared Finances
"Squads" is more modern, inclusive of non-family arrangements, and non-judgmental.

**Action for BudgetBuddy**: The current RBAC system (owner/partner/household_member/viewer)
is architecturally stronger than Budgety's Squads (which has no role system). Keep the
depth, consider a friendlier marketing name like "Budget Crew" for consumer-facing copy.

#### 6. Net Worth Chart with Privacy Toggle
Budgety's Home and Accounts screens show the Net Worth prominently with a 👁 toggle to
hide the value with asterisks.

**Action for BudgetBuddy**: NetWorthScreen and Home dashboard must include privacy mode.
Store preference in AsyncStorage. Visible by default (see decision log below).

---

### What Budgety Gets Wrong — Avoid These

#### 1. Net Worth Hidden by Default
Privacy mode as the DEFAULT communicates the wrong message — it suggests the number is
shameful or dangerous to see.

**Action for BudgetBuddy**: Net worth is visible by default. Privacy mode is opt-in via
the 👁 toggle.

#### 2. "Buddy AI" Takes a Bottom Nav Slot
AI chat is a secondary workflow, not a primary destination. Users do not open an app to
"chat AI" — they open it to check their budget.

**Action for BudgetBuddy**: AI chat is accessed via:
- A persistent floating "Ask Buddy" chip on the Home screen (amber)
- An "Ask Buddy about this" contextual button on budget/transaction/goal screens
- NOT a primary bottom nav tab

#### 3. Cash Flow Screen Is Empty With No Guidance
"No Transactions" with zero context.

**Action for BudgetBuddy**: Analytics / Cash Flow empty state must explain what the screen
shows and how to populate it, with a primary CTA.

#### 4. Add Squad Form Has No Role Assignment
No way to assign who is owner vs. view-only.

**Action for BudgetBuddy**: The invite flow on mobile must include role selection at invite
time. See `docs/user-guide-budget-collaboration.md` for the full role matrix.

#### 5. Feature Overload in Profile Drawer
12 tiles total — scanning burden is too high.

**Action for BudgetBuddy**: Max 6 tiles (3x2) in the feature grid.

#### 6. Budget Screen Layout Is Confusing
"Amount Earned: $0" looks like a form field, not a progress summary. No planned vs. actual
visual distinction.

**Action for BudgetBuddy**: Each budget category row must show planned amount, spent/received
amount, a progress bar, and an over-budget indicator.

---

## BudgetBuddy Feature Advantage Summary

Features that exist in BudgetBuddy but NOT in either competitor.
These must be prominently surfaced in the mobile app UI, onboarding, and premium paywall:

| Feature | Budge | Budgety | BudgetBuddy | Mobile Surface Priority |
|---------|-------|---------|-------------|------------------------|
| AI budget generation (348 cities) | ❌ | ❌ | ✅ | Onboarding, Premium paywall |
| RBAC collaboration (4 roles) | ❌ | ⚠️ no roles | ✅ | Budget Members screen |
| Debt payoff (avalanche/snowball) | ❌ | ❌ | ✅ | Goals screen, Debt tab |
| Receipt scanning (OCR) | ❌ | ❌ | ✅ | Quick-add transaction FAB |
| Credit score monitoring | ❌ | ❌ | ✅ | Home dashboard card |
| Learning center | ❌ | ❌ | ✅ | Me tab feature grid |
| Offline mode + sync | ❌ | ❌ | ✅ | Status bar indicator |
| Plaid bank integration | ❌ | ✅ | ✅ | Accounts screen |
| Net worth tracking | ❌ | ✅ | ✅ | Home + Accounts screen |
| Investment tracking | ❌ | ✅ | ✅ (partial) | Accounts screen |
| Zero-based budgeting | ❌ | ✅ | ✅ | Budget screen |
| Multiple budget types | ❌ | ⚠️ squads only | ✅ | Budget type selector |

**Marketing takeaway**: "Everything Budgety has, plus receipt scanning, credit score, learning
center, and offline mode — at half the price."

---

## Design System — Mobile

### Color Palette

```
Background (screens):    #0D1B2A  (deep navy)
Surface (cards):         #1A2B3C  (slightly lighter navy)
Surface-raised (modals): #243447  (elevated cards)
Divider:                 #2A3F55  (subtle separator)

Primary (income/positive/actions): #10B981  (emerald-500)
Primary-dark:                      #059669  (emerald-600, pressed state)
Primary-light:                     #D1FAE5  (emerald-100, background tint)

Danger (expenses/negative):        #EF4444  (red-500)
Danger-dark:                       #DC2626  (red-600, pressed state)

AI / Premium accent:               #F59E0B  (amber-500)
AI-dark:                           #D97706  (amber-600)

Text-primary:                      #F8FAFC
Text-secondary:                    #94A3B8  (slate-400)
Text-tertiary:                     #64748B  (slate-500)
Text-disabled:                     #475569  (slate-600)

Success:                           #22C55E  (green-500)
Warning:                           #F97316  (orange-500)
Info:                              #3B82F6  (blue-500)
```

### Typography

```
Platform: System font stack
  iOS:     SF Pro Display / SF Pro Text
  Android: Roboto

Scale (React Native points):
  Display:   32pt, weight 700  (net worth, large numbers)
  H1:        24pt, weight 700  (screen titles)
  H2:        20pt, weight 600  (section headers)
  H3:        17pt, weight 600  (card titles)
  Body:      15pt, weight 400  (general content)
  Body-sm:   13pt, weight 400  (secondary info)
  Label:     11pt, weight 500  (tags, chips)
  Micro:      9pt, weight 400  (timestamps, fine print)

Numbers:
  Tabular (monospace) variant for alignment in lists
  Green (#10B981) for positive values
  Red (#EF4444) for negative values
  White (#F8FAFC) for neutral/balance display
```

### Spacing System

```
Base unit: 4pt
  xs:   4pt  |  sm:   8pt  |  md:  16pt  |  lg:  24pt
  xl:  32pt  |  2xl: 48pt  |  3xl: 64pt

Card padding:  16pt horizontal, 16pt vertical
Screen padding: 16pt horizontal (safe area aware)
Section gap:   24pt
Item gap:       8pt (list items)
```

### Border Radius

```
Card:       12pt    Button:     12pt (or 999pt for pill CTAs)
Icon badge: 999pt   Input:      10pt
Tag/chip:   999pt   Bottom sheet: 24pt (top corners only)
```

### Category Icon System

All category icons use a circular colored background badge (32pt diameter) with a
white icon inside. Icon set: Ionicons (React Native Vector Icons).

```
Sizes:
  List item:   32pt badge, 16pt icon inside
  Card header: 48pt badge, 24pt icon inside
  Large/hero:  64pt badge, 32pt icon inside

Color Map:
  Supermarket / Groceries:  #EF4444  (red)
  Food / Restaurant:        #F97316  (orange)
  Transport / Car:          #3B82F6  (blue)
  Housing / Rent:           #8B5CF6  (violet)
  Utilities:                #06B6D4  (cyan)
  Entertainment:            #EC4899  (pink)
  Health / Medical:         #10B981  (emerald)
  Education:                #22C55E  (green)
  Clothing:                 #A78BFA  (purple)
  Travel:                   #0EA5E9  (sky blue)
  Gifts:                    #F59E0B  (amber)
  Work / Business:          #6366F1  (indigo)
  Electronics:              #64748B  (slate)
  Sport / Fitness:          #84CC16  (lime)
  Savings:                  #10B981  (emerald)
  Investment:               #14B8A6  (teal)
  Income / Salary:          #22C55E  (green)
  Transfer:                 #94A3B8  (gray)
  Other:                    #64748B  (slate)
```

---

## Navigation Architecture

### Bottom Tab Bar (5 tabs)

```
┌──────┬──────┬──────┬──────┬──────┐
│  🏠  │  📊  │  ➕  │  🎯  │  👤  │
│ Home │Budget│      │Goals │  Me  │
└──────┴──────┴──────┴──────┴──────┘
                  ↑
        Elevated emerald FAB
        Opens Quick-Add Bottom Sheet
```

- **Tab 1 — Home**: Net worth, monthly summary, AI insight, recent transactions
- **Tab 2 — Budget**: Zero-based budget for current month
- **Center FAB (➕)**: Quick-add transaction — opens bottom sheet
- **Tab 4 — Goals**: Savings goals, debt payoff, borrowed/lent tabs
- **Tab 5 — Me**: Profile, accounts, settings, feature grid

### Navigation Stack per Tab

```
Home:
  HomeScreen
  └── TransactionDetailScreen
  └── AIChatScreen (pushed from floating chip)
  └── NotificationsScreen

Budget:
  BudgetScreen
  └── BudgetCategoryDetailScreen
      └── TransactionDetailScreen
  └── AddBudgetItemScreen (bottom sheet)
  └── MonthPickerScreen (bottom sheet)
  └── BudgetMembersScreen

Goals:
  GoalsScreen (tabs: Goals / Borrowed / Lent)
  └── GoalDetailScreen
      └── ContributeScreen (bottom sheet)
  └── CreateGoalScreen
  └── DebtPayoffScreen

Me:
  MeScreen (profile + feature grid + settings list)
  └── AccountsScreen
      └── AddAccountScreen
      └── AccountDetailScreen
  └── InsightsScreen
  └── LearningCenterScreen
  └── ReceiptScannerScreen
  └── CreditScoreScreen
  └── BudgetMembersScreen
  └── SettingsScreen
      └── NotificationsSettingsScreen
      └── SecuritySettingsScreen
      └── ThemeScreen
  └── ExportImportScreen
  └── PremiumScreen
  └── FeedbackScreen
```

---

## Screen Specifications

### HomeScreen

**Purpose**: Primary landing screen. Answers "How am I doing this month?" in one view.

```
┌─────────────────────────────────────────┐
│ Avatar  Hi, [FirstName]    🔔  [⋮]     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Net Worth               [👁 hide]   │ │
│ │ $4,700.00                           │ │
│ │ ↑ $400 (9.3%)  this month          │ │
│ │ ▬▬▬▬▬▬▬▬░░░░  [1M][3M][6M][1Y]   │ │
│ └─────────────────────────────────────┘ │
│ ┌──────────────────┐ ┌────────────────┐ │
│ │ 📈 Income        │ │ 📉 Expenses    │ │
│ │ +$8,800          │ │ -$4,100        │ │
│ │ vs last month: — │ │ ↑ 12% higher  │ │
│ └──────────────────┘ └────────────────┘ │
│                                         │
│ ✨ AI Insight                     [×]  │
│ "Food spend is 34% over budget."        │
│                                         │
│ Budget Health             [View Budget →]│
│ Left to budget: $4,700                  │
│ ██████████████░░░░  53% allocated       │
│                                         │
│ Recent Transactions         [View All →]│
│ 🍎  Food         -CA$350   Sep 27      │
│ 🏠  House        -CA$2,700  Sep 31     │
│ 💰  Salary       +CA$8,800  Sep 1      │
│                                         │
│ [✨ Ask Buddy]                          │
└─────────────────────────────────────────┘
```

- Net worth card: pulls from net worth API or calculates from accounts
- Privacy toggle (👁): persists to AsyncStorage
- AI insight: from `GET /insights/latest`, dismissible for 24h
- "Ask Buddy" chip: expands to AIChatSheet bottom sheet

---

### BudgetScreen

**Purpose**: Zero-based monthly budget. Answers "Where is every dollar going?"

```
┌─────────────────────────────────────────┐
│ ← Oct 2026 →                    📅  ⋮ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ LEFT TO BUDGET                (STICKY)│
│ │ $4,700.00    ████████████░░  53%    │ │  ← Green when positive
│ └─────────────────────────────────────┘ │  ← Red when over-allocated
│                                         │
│ INCOME ──────────────────────────────── │
│ ┌─ 💰 Paycheck Dima ────────────────┐  │
│ │  Planned $8,800   Received $0     │  │
│ │  ░░░░░░░░░░░░░░░  0%              │  │
│ └───────────────────────────────────┘  │
│ [+ Add Income Item]                     │
│                                         │
│ SAVINGS ─────────────── $0 / $1,500    │
│ ┌─ 💾 Emergency Fund ───────────────┐  │
│ │  Planned $500   Saved $0          │  │
│ │  ░░░░░░░░░░░░░░  0%               │  │
│ └───────────────────────────────────┘  │
│                                         │
│ EXPENSES ────────── $4,100 / $3,900    │  ← Red = over budget
│ ┌─ 🍎 Food ─────────────────────⚠️──┐  │
│ │  Planned $1,200   Spent $1,400    │  │  ← Red spent amount
│ │  ████████████████  116% !!        │  │  ← Red overflow bar
│ └───────────────────────────────────┘  │
│ ┌─ 🏠 House ────────────────────────┐  │
│ │  Planned $2,700   Spent $2,700    │  │
│ │  ████████████████  100%           │  │
│ └───────────────────────────────────┘  │
│ [+ Add Expense Item]                    │
└─────────────────────────────────────────┘
```

**"Left to Budget" Banner States**:
- **Green**: "Left to budget: $4,700 ✓" — money remaining to allocate
- **Emerald**: "Fully allocated — zero-based achieved! 🎉" — exactly $0 left
- **Red**: "Over-allocated by $320 ⚠️ — reduce a category" — negative balance

---

### Quick-Add Transaction (Bottom Sheet)

**Trigger**: Center FAB (➕). Opens with numeric keypad already visible.

```
┌─────────────────────────────────────────┐
│         ─── drag handle ───             │
│                                         │
│  [EXPENSE]  [INCOME]  [TRANSFER]        │
│                                         │
│           $  350.00                     │
│           ───────────                   │
│                                         │
│  Category    🍎 Food              ›    │
│  Account     💳 CIBC Credit Card  ›    │
│  Date        Today, Jun 18         ›   │
│  Note        Add a note...             │
│                                         │
│  Recent: [🍎] [🏠] [🚗] [🛒] [💡]    │
│                                         │
│  7  8  9  ⌫                            │
│  4  5  6                               │
│  1  2  3  ✅  ← Emerald save           │
│  📷  0  .                              │
└─────────────────────────────────────────┘
```

- Amount auto-formats: 3 → $0.03 → $3.50 → $35.00 → $350.00
- Category: last-used pre-selected
- 📷 button: opens ReceiptScannerScreen, auto-fills on return
- ✅ saves with haptic feedback, closes sheet, optimistic update on HomeScreen

---

### GoalsScreen

**Purpose**: Track savings goals, borrowed money, and lent money in one place.

```
┌─────────────────────────────────────────┐
│ Goals                               ➕  │
│ [GOALS (2)]  [BORROWED (1)]  [LENT (0)] │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Total progress      0/2 fulfilled   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ 🎓 Education for John ────────────┐ │
│ │  ◕ 37.5%  $15,000 / $40,000        │ │  ← Radial progress ring
│ │  ████████░░░░░░  Left: $25,000      │ │
│ │  ✨ Save $1,200/mo → done Sep 2027  │ │  ← AI guidance (amber)
│ │  [+ Add Funds]            [⋮]     │ │
│ └───────────────────────────────────┘  │
│                                         │
│ ┌─ 🏠 Down Payment ──────────────────┐ │
│ │  ◔ 4.0%   $1,000 / $25,000         │ │
│ │  █░░░░░░░░░░░░░  Left: $24,000     │ │
│ │  ✨ Save $2,000/mo → done Aug 2028  │ │
│ │  [+ Add Funds]            [⋮]     │ │
│ └───────────────────────────────────┘  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✨ Buddy says:                       │ │  ← AI insight (amber card)
│ │ "Add $300/month to reach John's     │ │
│ │  education goal by 2027."           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Goal Card States**: Active (emerald bar) / Completed (green border + 🏆) /
Paused (muted + ⏸) / Archived (collapsed section)

---

### MeScreen

**Purpose**: Profile, accounts, secondary feature access, settings.

```
┌─────────────────────────────────────────┐
│ Me                                      │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🏙️ Avatar  Dmytro Malyk            │ │
│ │            dmytro.malyk@gmail.com   │ │
│ │            [FREE]  [⬆ Get Premium] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ My Accounts                   [+ Add]  │
│ ┌─ 💳 CIBC Credit Card ──────────────┐ │
│ │  CA$23,350 available                │ │
│ │  $25,000 limit · CA$1,650 used     │ │
│ │  ████████████░░  93% available     │ │
│ └───────────────────────────────────┘  │
│                                         │
│ Features ─────────────── (3×2 max 6)   │
│ [📈 Insights] [🎓 Learn] [📷 Receipt] │
│ [💳 Credit]   [📉 Debt]  [👥 Members] │
│                                         │
│ Settings & More ─────────────────────  │
│ ⚙️  Settings                       ›  │
│ 📤  Export / Import                 ›  │
│ 🔔  Notifications                   ›  │
│ 💬  Feedback                        ›  │
│ ⭐  Rate BudgetBuddy                ›  │
│ 📜  Terms & Privacy                 ›  │
│ ─────────────────────────────────────  │
│ [→ Log Out]                            │
│                                         │
│ v1.9.132 · Your data is synced  ✓     │
└─────────────────────────────────────────┘
```

---

### AIChatScreen (Buddy AI)

**Mascot**: Buddy the Owl — 64pt circular avatar (emerald background, white owl icon).
**Name**: "Buddy" — consistent with product name "BudgetBuddy"

**Intro State**:
```
┌─────────────────────────────────────────┐
│ ← AI Assistant                          │
│                                         │
│              🦉  Buddy                  │
│    Your financial companion             │
│                                         │
│  "Hi Dmytro! I know your budget,        │
│   accounts, goals, and spending         │
│   patterns. Ask me anything."           │
│                                         │
│  [What's my biggest expense?          ] │
│  [Am I on track for my goals?         ] │
│  [Generate budget for next month      ] │
│  [How much can I spend on fun?        ] │
│                                         │
│  ┌───────────────────────────┐  [Send] │
│  │ Ask Buddy anything...     │         │
│  └───────────────────────────┘         │
│                                         │
│ Disclaimer: Responses may be inaccurate │
└─────────────────────────────────────────┘
```

**Access Points** (contextual triggers):
- Home screen: floating amber chip "✨ Ask Buddy"
- Budget screen: "✨ Ask Buddy about this budget" in ⋮ menu
- Goals: "✨ Am I on track?" below each goal card
- Insights: "✨ Explain this" on each insight card

---

### SettingsScreen

**Sections** (replaces Budge's confusing "Calendar" grouping):

```
APPEARANCE
  Theme                   [System / Light / Dark]
  Text Size               [Default / Large / Extra Large]
  Language                [System / English / French / Ukrainian]

TRANSACTIONS              ← was "Calendar" in Budge — incorrect label
  Show completed          [Toggle]
  Color transaction amounts [Toggle]
  Default transaction type [Expense / Income / Ask]

NOTIFICATIONS
  Budget alerts           [Toggle]
  Goal milestone alerts   [Toggle]
  Weekly summary          [Toggle]
  Bill reminders          [Toggle]

PRIVACY & SECURITY
  Hide balances by default [Toggle]
  Biometric lock          [Toggle]
  Auto-lock after         [1min / 5min / Never]

SYNC & DATA
  Sync status             [status label]
  Offline mode            [Toggle]
  Background sync         [15min / 1hr / Manual]

SUBSCRIPTION
  Current plan            [Free / Premium]
  Manage subscription     → App Store / Play Store

ACCOUNT
  Email address           [current email]
  Change password         →
  Delete account          → (danger, requires confirmation)
```

---

### PremiumScreen

Features shown BEFORE pricing (required for a $9.99 product):

```
[×] close

        ⭐ BudgetBuddy Premium
"Unlock the full power of your finances"

─── FEATURES ────────────────────────────
✨  AI Budget Generation
👥  Budget Collaboration (RBAC — 4 roles)
📊  Advanced Insights & Cash Flow
📤  Export & Reports (CSV, PDF)
💳  Credit Score Monitoring
🎓  Learning Center

─── PRICING ─────────────────────────────
  ┌─── Annual ──── Save 30% ─────────┐  ← Highlighted/recommended
  │  $6.99/month  ($83.88/year)       │
  └───────────────────────────────────┘
  ┌─── Monthly ───────────────────────┐
  │  $9.99/month   Cancel anytime     │
  └───────────────────────────────────┘
  ┌─── Lifetime ──────────────────────┐
  │  $79.99   Pay once, use forever   │
  └───────────────────────────────────┘

[Start Annual Plan — $6.99/month]
Terms · Privacy · Restore Purchase
```

---

### FeedbackScreen

Improvements over Budge's blank text box:

```
Topic:  [Bug report ▼]  (Bug / Feature / General / Praise)

Your message:
[textarea — 500 char limit]

Attach screenshot? (optional)
[+ Add Screenshot]

[Send Feedback]
Or email: support@budgetbuddy.com
```

Post-send confirmation (Budge has no confirmation):
```
  ✅  Thanks, Dmytro!
  Your feedback has been received.
  We typically respond within 24 hours.
  [Back to Settings]
```

---

## Onboarding Flow (5 Steps, < 3 Minutes)

```
Step 1: Welcome
  Buddy owl avatar + wave animation
  "Welcome to BudgetBuddy"
  [Get Started]  [I already have an account]

Step 2: Sign Up / Sign In (existing Cognito flow)

Step 3: Budget type
  "What kind of budget are you setting up?"
  [👤 Personal]  [👨‍👩‍👧 Family]  [🏠 Shared]

Step 4: Location + household (for AI generation)
  "Where do you live?"  [City picker — 348 cities]
  "How many people?"  [1][2][3][4+]

Step 5: AI generation
  Buddy owl animation + loading bar
  "Creating your personalized budget for [City]..."
  → Budget preview
  [Looks good!]  [Customize]

→ HomeScreen + confetti
  "Your budget is ready 🎉"
```

**Principles**: No more than 2 taps per step · Progress dots always visible ·
[Skip] always available · Never ask for credit card during onboarding

---

## Empty States Reference

| Screen | Headline | Supporting copy | CTA |
|--------|----------|-----------------|-----|
| GoalsScreen | "No goals set yet" | "Set a savings target and track your progress" | + Set a Goal |
| TransactionsScreen | "No transactions yet" | "Add your first transaction to get started" | + Add Transaction |
| AccountsScreen | "No accounts connected" | "Connect your bank to see your balance" | + Add Account |
| InsightsScreen | "Not enough data yet" | "Add 2+ weeks of transactions to see patterns" | + Add Transaction |
| CreditScoreScreen | "Connect an account first" | "Link a bank account to unlock credit monitoring" | Connect Bank |
| BudgetScreen (future month) | "Plan ahead for [Month]" | "Copy last month's budget to get started" | Copy Budget |
| HomeScreen (new user) | "Welcome to BudgetBuddy!" | "Set up your first budget to see your overview" | Set Up Budget |
| CashFlowScreen | "No cash flow data yet" | "Add transactions or connect a bank account" | + Add Transaction |

---

## Interaction Patterns

### Swipe Actions on List Items
- Swipe left: `[🗑️ Delete]` (red)
- Swipe right: `[✏️ Edit]` (blue) or `[✅ Mark paid]` (green) where applicable

### Pull to Refresh
All data screens support pull-to-refresh with emerald spinner.

### Long Press
- Category rows: Edit / Delete / Move to group
- Goal cards: Edit / Archive / Delete
- Transaction rows: Edit / Duplicate / Delete

### Loading States
- Skeleton loaders on all list screens (not spinners)
- Skeleton mimics exact shape of real content

### Error States
- Network error: "Connection issue — pull to refresh when online"
- API error: "Something went wrong" + [Try Again]
- Auth expired: Auto-redirect to login + toast "Session expired"

---

## Mobile vs Web Feature Parity

| Feature | Screen File | Status | Priority |
|---------|-------------|--------|----------|
| Authentication | src/screens/auth/ | ✅ Built | — |
| Budget management | BudgetScreen.tsx | ⚠️ Partial | Tier 1 |
| Transactions | TransactionsScreen.tsx | ⚠️ Partial | Tier 1 |
| Goals | GoalsScreen.tsx | ⚠️ Partial | Tier 1 |
| Home Dashboard | ❌ Missing | ❌ Missing | Tier 1 |
| Quick-Add Bottom Sheet | ❌ Missing | ❌ Missing | Tier 1 |
| 5-Tab Navigation | ⚠️ Partial | ⚠️ Partial | Tier 1 |
| AI Chat Screen | ❌ Missing | ❌ Missing | Tier 2 |
| Accounts / Plaid | BankSyncScreen.tsx | ⚠️ Partial | Tier 2 |
| Net Worth | NetWorthScreen.tsx | ⚠️ Partial | Tier 2 |
| Insights | InsightsScreen.tsx | ⚠️ Partial | Tier 2 |
| Subscriptions / Premium | SubscriptionsScreen.tsx | ⚠️ Partial | Tier 2 |
| Debt Payoff | DebtPayoffScreen.tsx | ⚠️ Partial | Tier 2 |
| Receipt Scanner | ❌ Missing | ❌ Missing | Tier 2 |
| Budget Members/Collab | ❌ Missing | ❌ Missing | Tier 3 |
| Learning Center | TipsScreen.tsx | ⚠️ Partial | Tier 3 |
| Credit Score | CreditScoreScreen.tsx | ⚠️ Partial | Tier 3 |
| Investments | InvestmentsScreen.tsx | ⚠️ Partial | Tier 3 |
| Settings | SettingsScreen.tsx | ⚠️ Partial | Tier 1 |
| Bills | BillsScreen.tsx | ⚠️ Partial | Tier 3 |
| Offline | OfflineSettingsScreen.tsx | ⚠️ Partial | Tier 3 |

---

## MVP Implementation Priority

### Tier 1 — Core UX Fixes (Weeks 1–2)
1. 5-tab bottom navigation with center FAB
2. Category icon system — 36 colored icon badges (`src/components/CategoryIcon.tsx`)
3. Persistent "Left to Budget" sticky banner on BudgetScreen
4. Quick-Add Transaction bottom sheet (FAB → numeric keypad → save)
5. HomeScreen — net worth, summary cards, AI insight, recent transactions
6. Empty states for all screens (`src/components/EmptyState.tsx`)

### Tier 2 — Differentiation (Weeks 3–4)
7. AIChatScreen with Buddy owl mascot + suggested prompts
8. Radial progress rings on GoalsScreen + Borrowed/Lent tabs
9. Privacy toggle on net worth (HomeScreen + NetWorthScreen)
10. Bank logos on BankSyncScreen / AddAccountScreen
11. Settings restructure (remove "Calendar", add proper sections)
12. Premium paywall redesign (features first, then pricing tiers)
13. Receipt scanner integration with Quick-Add

### Tier 3 — Collaboration & Polish (Weeks 5–6)
14. Budget Members mobile screen (invite from mobile)
15. Onboarding redesign (5-step flow with Buddy owl intro)
16. Skeleton loaders for all list screens
17. Swipe actions on transaction and category rows
18. FeedbackScreen upgrade (topic picker + confirmation state)

---

## Design Decisions Log

| Date | Decision | Rationale | Alternatives Rejected |
|------|----------|-----------|----------------------|
| 2026-06-18 | 5-tab nav, center FAB | iOS/Android convention; quick-add is highest-frequency action | 3-tab (too sparse — Budge mistake); 4-tab (no room for both Goals and Me) |
| 2026-06-18 | Emerald green as primary | Consistent with web app; warmer than banking-cold blue | Blue (too corporate); Purple (Budge already uses this) |
| 2026-06-18 | Buddy = owl mascot | Wisdom + finance metaphor; emerald fits brand; beaver already used by Budgety | No mascot (less engaging) |
| 2026-06-18 | AI chat NOT a bottom nav tab | AI is secondary workflow; primary nav is for Home/Budget/Goals/Me | AI as 5th tab (Budgety mistake) |
| 2026-06-18 | Net worth visible by default | Transparency is a core product value; privacy mode opt-in | Hidden by default (Budgety mistake) |
| 2026-06-18 | Features before pricing on premium screen | Many features vs cheap competitors; must justify $9.99 before showing price | Pricing first (works for $0.79 apps like Budge; wrong at this price point) |
| 2026-06-18 | "Left to Budget" sticky banner | Zero-based budgeting core metric; always visible | Showing only in header (not persistent enough) |
| 2026-06-18 | Borrowed/Lent merged into GoalsScreen tabs | Reduces nav depth; conceptually related to savings goals | Separate screen (unnecessary depth) |
| 2026-06-18 | Settings section "Transactions" not "Calendar" | "Calendar" is not what users expect for transaction display settings | Keep "Calendar" (Budge mistake) |
| 2026-06-18 | Max 6 tiles (3×2) in feature grid | 12 tiles is a scanning burden (Budgety mistake) | More tiles |

---

## Related Documents

- `docs/product-requirements.md` — Full feature catalog, implemented and planned
- `docs/web-app-polish-plan.md` — Web app design direction (same brand, adapted for desktop)
- `docs/user-guide-budget-collaboration.md` — RBAC roles and invite flows
- `docs/MVP-SPRINT-PLAN.md` — Feature completion status vs competitors
- `packages/mobile/src/screens/` — All existing mobile screen implementations
- `packages/mobile/src/navigation/` — Current navigation structure

---

*Last updated: 2026-09-22 (Session 162)*
