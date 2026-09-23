# Multi-Currency Support - Requirements

## Feature Overview

Enable users to select and manage their preferred currency for budgeting and transactions. Support major global currencies with proper formatting and display.

## User Stories

### 1. Currency Selection During Onboarding

**As a** new user
**I want to** select my preferred currency during onboarding
**So that** all my budgets and transactions are displayed in my local currency

**Acceptance Criteria:**

- 1.1 Currency selector appears during onboarding flow
- 1.2 Supports USD, EUR, GBP, CAD, AUD, JPY
- 1.3 Default currency is USD if not selected
- 1.4 Currency is saved to user profile
- 1.5 Currency selection is required before completing onboarding

### 2. Currency Management in Settings

**As an** existing user
**I want to** change my preferred currency in settings
**So that** I can update my currency if I move to a different country

**Acceptance Criteria:**

- 2.1 Currency selector available in Settings page
- 2.2 Shows current selected currency
- 2.3 Can change to any supported currency
- 2.4 Confirmation dialog before changing currency
- 2.5 Warning about existing budget data not being converted
- 2.6 Currency change is saved to user profile

### 3. Currency Display Formatting

**As a** user
**I want to** see amounts formatted correctly for my currency
**So that** I can easily read and understand financial values

**Acceptance Criteria:**

- 3.1 Currency symbol displayed correctly (e.g., $, €, £, ¥)
- 3.2 Decimal places appropriate for currency (2 for most, 0 for JPY)
- 3.3 Thousands separator based on locale
- 3.4 Currency code shown in exports and reports
- 3.5 Consistent formatting across web and mobile

### 4. Budget and Transaction Currency

**As a** user
**I want to** all my budgets and transactions to use my selected currency
**So that** I have a consistent financial view

**Acceptance Criteria:**

- 4.1 New budgets use user's selected currency
- 4.2 New transactions use user's selected currency
- 4.3 Currency stored with each budget and transaction
- 4.4 Currency displayed in budget summary
- 4.5 Currency displayed in transaction list

## Supported Currencies

| Code | Name              | Symbol | Decimal Places | Example    |
| ---- | ----------------- | ------ | -------------- | ---------- |
| USD  | US Dollar         | $      | 2              | $1,234.56  |
| EUR  | Euro              | €      | 2              | €1.234,56  |
| GBP  | British Pound     | £      | 2              | £1,234.56  |
| CAD  | Canadian Dollar   | C$     | 2              | C$1,234.56 |
| AUD  | Australian Dollar | A$     | 2              | A$1,234.56 |
| JPY  | Japanese Yen      | ¥      | 0              | ¥1,235     |

## Out of Scope (Phase 2)

- Currency conversion between currencies
- Real-time exchange rates
- Multi-currency budgets (mixing currencies)
- Historical exchange rate tracking
- Cryptocurrency support

## Technical Requirements

### Data Model

**User Profile:**

```typescript
{
  userId: string;
  email: string;
  currency: string; // ISO 4217 code (USD, EUR, etc.)
  currencySymbol: string; // $, €, £, etc.
  locale: string; // en-US, en-GB, etc.
}
```

**Budget:**

```typescript
{
  budgetId: string;
  month: string;
  currency: string; // ISO 4217 code
  categories: Category[];
  totalIncome: number;
  totalSavings: number;
  totalExpenses: number;
}
```

**Transaction:**

```typescript
{
  transactionId: string;
  date: string;
  category: string;
  amount: number;
  currency: string; // ISO 4217 code
  type: "income" | "expense";
}
```

### API Changes

**User Profile Endpoint:**

- Add `currency` field to profile response
- Add `currency` field to profile update request

**Budget Endpoints:**

- Include `currency` in budget creation
- Include `currency` in budget response

**Transaction Endpoints:**

- Include `currency` in transaction creation
- Include `currency` in transaction response

### Frontend Components

**Currency Selector Component:**

- Dropdown with currency options
- Shows currency code, name, and symbol
- Search/filter functionality
- Accessible keyboard navigation

**Currency Display Component:**

- Format amounts based on currency
- Show currency symbol
- Handle decimal places
- Locale-aware formatting

## Success Metrics

- 100% of new users select a currency during onboarding
- 95%+ of amounts displayed with correct currency formatting
- < 5% of users change currency after initial selection
- Zero currency-related bugs in production

## Dependencies

- User profile system (existing)
- Budget management system (existing)
- Transaction system (existing)
- Onboarding flow (existing)

## Risks and Mitigations

**Risk:** Users changing currency and expecting automatic conversion
**Mitigation:** Clear warning message that existing data won't be converted

**Risk:** Currency formatting inconsistencies across platforms
**Mitigation:** Shared currency utility functions in packages/shared

**Risk:** Missing currency symbols in fonts
**Mitigation:** Use Unicode currency symbols with fallback to code

## Timeline

- Requirements: 1 hour
- Design: 1 hour
- Implementation: 4 hours
- Testing: 2 hours
- Total: 8 hours (1 day)
