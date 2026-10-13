# API Gateway Routing Map

Maps every route prefix defined in the four CDK API stacks to its API Gateway. When adding a new
feature's routes, find the criteria row that matches your feature and wire the route into that
stack. This document is consistency-checked against the CDK stacks by
`scripts/consistency-check.js --check=gateway-routing`; any new top-level route prefix added to a
stack must get a row here in the same PR.

## Main API - `apiBaseUrl` (`api-stack.ts`)
Core account lifecycle domains: auth, the user's own budget/transactions, payments, AI.

| Prefix | Lambda | Notes |
|---|---|---|
| `health` | authHandler | Public API-level health check |
| `auth` | authHandler | Public + protected auth routes |
| `users` | authHandler | Profile |
| `budget` | budgetHandler | Budget CRUD |
| `transactions` | transactionHandler | |
| `export` | exportHandler | |
| `restore` | restoreHandler | |
| `payments` | paymentHandler | Stripe |
| `webhooks` | paymentHandler | Stripe webhook |
| `bills` | billsHandler | |
| `goals` | goalsHandler | |
| `accounts` | accountsHandler | |
| `email` | emailHandler | Health only here; sending lives on features API |
| `ai` | aiHandler | |
| `notifications` | notificationFunction | Device registration |

## Budgets API - `budgetsApiUrl` (`api-budgets-stack.ts`)
Multi-user budget collaboration: membership, invitations, roles.

| Prefix | Lambda | Notes |
|---|---|---|
| `budgets` | budgetsHandler | Collaboration, members, invitations |
| `email` | emailHandler | Invitation emails |

## Features API - `featuresApiUrl` (`api-features-stack.ts`)
Bank integrations and lower-frequency financial features that don't need the AI-heavy extended
stack.

| Prefix | Lambda | Notes |
|---|---|---|
| `investments` | investmentsHandler | |
| `plaid` | plaidHandler | |
| `reconcile` | reconciliationHandler | |
| `admin` | adminHandler | |
| `comparison` | comparisonHandler | |
| `tips` | tipsHandler | |
| `learn` | learnHandler | |
| `subscriptions` | subscriptionsHandler | |
| `debts` | debtPayoffHandler | |
| `credit-score` | creditScoreHandler | |
| `email` | emailHandler | Health only |

## Extended Features API - `extendedFeaturesApiUrl` (`api-features-extended-stack.ts`)
AI-powered and derived-data features (Bedrock, receipts, pattern detection, planning).

| Prefix | Lambda | Notes |
|---|---|---|
| `insights` | insightsHandler | |
| `receipt` | receiptHandler | |
| `patterns` | patternDetectionHandler | |
| `budget-planning` | budgetPlanningHandler | |
| `transaction-planning` | transactionPlanningHandler | |
| `rules` | rulesHandler | |
| `net-worth` | netWorthHandler | |

## Choosing a gateway for a new feature domain

1. Does it touch AI/Bedrock, receipts, or derived analytics (patterns, planning, insights)? ->
   Extended Features API.
2. Does it touch multi-user budget membership or invitations? -> Budgets API.
3. Does it touch bank data (Plaid), or is it a lower-frequency financial feature (comparison,
   tips, learn, subscriptions, debt, credit score, admin)? -> Features API.
4. Everything else - core account lifecycle (auth, budget, transactions, payments, notifications,
   AI chat) -> Main API.

If none of the criteria clearly apply, add a row to whichever table already hosts the most
similar existing domain and note the reasoning in the PR description.