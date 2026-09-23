# Multi-Currency Support - Design

## Architecture Overview

Multi-currency support will be implemented as a cross-cutting concern affecting user profiles, budgets, transactions, and UI formatting. The design follows these principles:

1. **Currency as User Preference**: Currency is a user-level setting stored in the profile
2. **Currency Metadata**: Each budget and transaction stores its currency for data integrity
3. **Shared Formatting**: Currency formatting logic is centralized in shared utilities
4. **No Automatic Conversion**: Phase 1 does not include currency conversion

## Component Design

### 1. Currency Utility Module

**Location**: `packages/shared/src/utils/currency.ts`

**Purpose**: Centralized currency formatting and validation logic

**Functions**:

```typescript
// Currency configuration
export interface CurrencyConfig {
  code: string; // ISO 4217 code (USD, EUR, etc.)
  name: string; // Full name (US Dollar, Euro, etc.)
  symbol: string; // Currency symbol ($, €, £, etc.)
  symbolPosition: "before" | "after"; // Symbol position
  decimalPlaces: number; // Number of decimal places
  thousandsSeparator: string; // Thousands separator (,)
  decimalSeparator: string; // Decimal separator (.)
  locale: string; // Locale for Intl.NumberFormat
}

// Get currency configuration
export function getCurrencyConfig(code: string): CurrencyConfig;

// Format amount with currency
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
  },
): string;

// Parse currency string to number
export function parseCurrency(value: string, currencyCode: string): number;

// Validate currency code
export function isValidCurrency(code: string): boolean;

// Get all supported currencies
export function getSupportedCurrencies(): CurrencyConfig[];

// Get currency symbol
export function getCurrencySymbol(code: string): string;
```

**Implementation**:

```typescript
const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-GB',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-CA',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-AU',
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    symbolPosition: 'before',
    decimalPlaces: 0,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'ja-JP',
  },
};

export function formatCurrency(
  amount: number,
  currencyCode: string,
  options: {
    showSymbol = true,
    showCode = false,
    compact = false,
  } = {}
): string {
  const config = getCurrencyConfig(currencyCode);

  // Use Intl.NumberFormat for locale-aware formatting
  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
    notation: compact ? 'compact' : 'standard',
  });

  let formatted = formatter.format(amount);

  // Add currency code if requested
  if (options.showCode) {
    formatted += ` ${config.code}`;
  }

  return formatted;
}
```

### 2. Currency Selector Component

**Location**: `packages/web-app/src/components/CurrencySelector.tsx`

**Purpose**: Reusable currency selection dropdown

**Props**:

```typescript
interface CurrencySelectorProps {
  value: string; // Current currency code
  onChange: (code: string) => void; // Callback when currency changes
  disabled?: boolean; // Disable selector
  showSymbol?: boolean; // Show currency symbol
  showCode?: boolean; // Show currency code
  label?: string; // Label text
  required?: boolean; // Required field
}
```

**UI Design**:

```
┌─────────────────────────────────────┐
│ Currency *                          │
│ ┌─────────────────────────────────┐ │
│ │ $ USD - US Dollar            ▼ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Dropdown Options:                   │
│ ┌─────────────────────────────────┐ │
│ │ $ USD - US Dollar               │ │
│ │ € EUR - Euro                    │ │
│ │ £ GBP - British Pound           │ │
│ │ C$ CAD - Canadian Dollar        │ │
│ │ A$ AUD - Australian Dollar      │ │
│ │ ¥ JPY - Japanese Yen            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 3. Onboarding Integration

**Location**: `packages/web-app/src/components/OnboardingFlow.tsx`

**Changes**:

1. Add currency selection step after location selection
2. Default to USD if not selected
3. Save currency to user profile during onboarding completion
4. Pass currency to AI budget generation

**Flow**:

```
1. Location Selection
   ↓
2. Currency Selection (NEW)
   ↓
3. Family Size
   ↓
4. AI Budget Generation (uses currency)
   ↓
5. Budget Customization
   ↓
6. Complete
```

### 4. Settings Page Integration

**Location**: `packages/web-app/src/pages/SettingsPage.tsx`

**Changes**:

1. Add "Currency" section
2. Show current currency with symbol and code
3. Currency selector dropdown
4. Confirmation dialog before changing
5. Warning about existing data not being converted

**UI Design**:

```
┌─────────────────────────────────────────────┐
│ Currency Settings                           │
├─────────────────────────────────────────────┤
│                                             │
│ Current Currency                            │
│ ┌─────────────────────────────────────────┐ │
│ │ 💵 $ USD - US Dollar                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Change Currency                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Select currency                      ▼ │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ⚠️ Warning: Changing your currency will not │
│    convert existing budget amounts. Only    │
│    new budgets and transactions will use    │
│    the new currency.                        │
│                                             │
│ [Update Currency]                           │
└─────────────────────────────────────────────┘
```

### 5. Budget Display Integration

**Location**: `packages/web-app/src/components/budget/BudgetList.tsx`

**Changes**:

1. Use `formatCurrency()` for all amount displays
2. Show currency symbol in budget summary
3. Show currency code in budget header
4. Format category amounts with currency

**Example**:

```
Before: $1,234.56
After:  $1,234.56 (USD user)
        €1.234,56 (EUR user)
        ¥1,235    (JPY user)
```

### 6. Transaction Display Integration

**Location**: `packages/web-app/src/components/transactions/TransactionList.tsx`

**Changes**:

1. Use `formatCurrency()` for transaction amounts
2. Show currency symbol in transaction form
3. Format amounts based on user's currency

## Data Model Changes

### User Profile

**DynamoDB Schema**:

```typescript
{
  PK: "USER#<userId>",
  SK: "PROFILE",
  userId: string,
  email: string,
  familyId: string,
  currency: string,        // NEW: ISO 4217 code (default: "USD")
  locale: string,          // NEW: Locale string (default: "en-US")
  onboardingCompleted: boolean,
  createdAt: string,
  updatedAt: string,
}
```

### Budget

**DynamoDB Schema**:

```typescript
{
  PK: "FAMILY#<familyId>",
  SK: "BUDGET#<month>",
  budgetId: string,
  month: string,
  currency: string,        // NEW: ISO 4217 code
  categories: Category[],
  totalIncome: number,
  totalSavings: number,
  totalExpenses: number,
  createdAt: string,
  updatedAt: string,
}
```

### Transaction

**DynamoDB Schema**:

```typescript
{
  PK: "FAMILY#<familyId>",
  SK: "TRANSACTION#<transactionId>",
  transactionId: string,
  date: string,
  category: string,
  description: string,
  amount: number,
  currency: string,        // NEW: ISO 4217 code
  type: "income" | "expense",
  budgetMonth: string,
  createdAt: string,
}
```

## API Changes

### User Profile Endpoints

**GET /auth/profile**

Response:

```json
{
  "userId": "user123",
  "email": "user@example.com",
  "familyId": "family123",
  "currency": "USD",
  "locale": "en-US",
  "onboardingCompleted": true
}
```

**PUT /auth/profile**

Request:

```json
{
  "currency": "EUR",
  "locale": "de-DE"
}
```

### Budget Endpoints

**POST /budget**

Request:

```json
{
  "month": "2026-02",
  "currency": "USD",
  "categories": [...]
}
```

Response:

```json
{
  "budgetId": "budget123",
  "month": "2026-02",
  "currency": "USD",
  "categories": [...],
  "totalIncome": 5000,
  "totalSavings": 1000,
  "totalExpenses": 3000
}
```

### Transaction Endpoints

**POST /transactions**

Request:

```json
{
  "date": "2026-02-01",
  "category": "Groceries",
  "amount": 150,
  "currency": "USD",
  "type": "expense",
  "budgetMonth": "2026-02"
}
```

Response:

```json
{
  "transactionId": "trans123",
  "date": "2026-02-01",
  "category": "Groceries",
  "amount": 150,
  "currency": "USD",
  "type": "expense"
}
```

## Migration Strategy

### Existing Users

1. **Default Currency**: Set all existing users to USD
2. **Backfill Budgets**: Add `currency: "USD"` to all existing budgets
3. **Backfill Transactions**: Add `currency: "USD"` to all existing transactions
4. **Migration Script**: Run one-time migration script to update DynamoDB

### New Users

1. Currency selection required during onboarding
2. Default to USD if skipped
3. All new budgets and transactions use selected currency

## Testing Strategy

### Unit Tests

**Currency Utility Tests**:

- Test `formatCurrency()` for all supported currencies
- Test decimal places (2 for most, 0 for JPY)
- Test thousands separators
- Test symbol positioning
- Test compact notation
- Test currency validation

**Component Tests**:

- Test CurrencySelector rendering
- Test currency change callback
- Test disabled state
- Test required validation

### Integration Tests

**Onboarding Flow**:

- Test currency selection during onboarding
- Test default currency (USD)
- Test currency saved to profile

**Settings Page**:

- Test currency display
- Test currency change
- Test confirmation dialog
- Test warning message

**Budget Display**:

- Test currency formatting in budget summary
- Test currency formatting in category amounts
- Test different currencies (USD, EUR, JPY)

**Transaction Display**:

- Test currency formatting in transaction list
- Test currency formatting in transaction form

### Property-Based Tests

**Currency Formatting Properties**:

- Property: Formatting and parsing are inverse operations
- Property: All amounts >= 0 format without errors
- Property: Currency codes are always uppercase
- Property: Decimal places match currency config

## Performance Considerations

1. **Caching**: Currency configs are static and can be cached
2. **Intl.NumberFormat**: Use memoization for formatters
3. **Bundle Size**: Currency configs add ~2KB to bundle
4. **Rendering**: Currency formatting is fast (< 1ms per call)

## Security Considerations

1. **Input Validation**: Validate currency codes against whitelist
2. **SQL Injection**: Not applicable (NoSQL database)
3. **XSS**: Currency symbols are safe (Unicode characters)
4. **Data Integrity**: Currency stored with each record

## Accessibility

1. **Screen Readers**: Currency symbols announced correctly
2. **Keyboard Navigation**: Currency selector fully keyboard accessible
3. **Color Contrast**: Currency text meets WCAG AA standards
4. **Focus Indicators**: Clear focus states on currency selector

## Internationalization

1. **Locale-Aware Formatting**: Use Intl.NumberFormat
2. **RTL Support**: Currency symbols positioned correctly
3. **Translation**: Currency names translatable
4. **Date Formatting**: Consistent with currency locale

## Future Enhancements (Phase 2)

1. **Currency Conversion**: Real-time exchange rates
2. **Multi-Currency Budgets**: Mix currencies in single budget
3. **Historical Rates**: Track exchange rate changes
4. **More Currencies**: Add 50+ additional currencies
5. **Cryptocurrency**: Support BTC, ETH, etc.

## Success Criteria

- ✅ All 6 currencies supported (USD, EUR, GBP, CAD, AUD, JPY)
- ✅ Currency formatting works on web and mobile
- ✅ Currency selection in onboarding flow
- ✅ Currency management in settings
- ✅ All amounts display with correct currency
- ✅ 100% test coverage for currency utilities
- ✅ Zero currency-related bugs in production
