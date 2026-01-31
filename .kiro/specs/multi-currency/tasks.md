# Multi-Currency Support - Implementation Tasks

## Overview

Implement multi-currency support for BudgetBuddy, allowing users to select and manage their preferred currency. This includes currency selection during onboarding, currency management in settings, and proper currency formatting throughout the application.

## Tasks

### Phase 1: Currency Utility Module

- [x] 1. Create Currency Utility Module
  - [x] 1.1 Create `packages/shared/src/utils/currency.ts`
    - Define CurrencyConfig interface
    - Create CURRENCY_CONFIGS constant with 6 currencies
    - Implement getCurrencyConfig() function
    - Implement formatCurrency() function using Intl.NumberFormat
    - Implement parseCurrency() function
    - Implement isValidCurrency() function
    - Implement getSupportedCurrencies() function
    - Implement getCurrencySymbol() function
    - _Requirements: 3.1-3.5_

  - [x] 1.2 Create currency utility tests
    - Test formatCurrency() for all 6 currencies
    - Test decimal places (2 for most, 0 for JPY)
    - Test thousands separators
    - Test symbol positioning
    - Test compact notation
    - Test currency validation
    - Test parsing and formatting are inverse operations
    - _Requirements: 3.1-3.5_

  - [x] 1.3 Export currency utilities from shared package
    - Add to `packages/shared/src/utils/index.ts`
    - Update package exports
    - _Requirements: 3.5_

### Phase 2: Currency Selector Component

- [x] 2. Create Currency Selector Component
  - [x] 2.1 Create `packages/web-app/src/components/CurrencySelector.tsx`
    - Create CurrencySelectorProps interface
    - Implement dropdown with all 6 currencies
    - Show currency symbol, code, and name
    - Handle onChange callback
    - Support disabled state
    - Support required validation
    - Accessible keyboard navigation
    - _Requirements: 1.1, 2.1-2.3_

  - [x] 2.2 Create currency selector tests
    - Test rendering with all currencies
    - Test currency change callback
    - Test disabled state
    - Test required validation
    - Test keyboard navigation
    - _Requirements: 1.1, 2.1-2.3_

  - [x] 2.3 Add currency selector styles
    - Consistent with existing design system
    - Responsive for mobile
    - Clear focus indicators
    - _Requirements: 1.1, 2.1-2.3_

### Phase 3: Data Model Updates

- [x] 3. Update User Profile Schema
  - [x] 3.1 Update user profile DynamoDB schema
    - Add `currency` field (default: "USD")
    - Add `locale` field (default: "en-US")
    - Update TypeScript types
    - _Requirements: 1.4, 2.6_

  - [x] 3.2 Update auth Lambda function
    - Add currency to profile creation
    - Add currency to profile update
    - Add currency to profile response
    - Validate currency code
    - _Requirements: 1.4, 2.6_

  - [x] 3.3 Update auth Lambda tests
    - Test profile creation with currency
    - Test profile update with currency
    - Test invalid currency code
    - _Requirements: 1.4, 2.6_

- [x] 4. Update Budget Schema
  - [x] 4.1 Update budget DynamoDB schema
    - Add `currency` field to budget
    - Update TypeScript types
    - _Requirements: 4.1, 4.3_

  - [x] 4.2 Update budget Lambda function
    - Add currency to budget creation
    - Add currency to budget response
    - Use user's currency as default
    - _Requirements: 4.1, 4.3_

  - [x] 4.3 Update budget Lambda tests
    - Test budget creation with currency
    - Test budget response includes currency
    - _Requirements: 4.1, 4.3_

- [x] 5. Update Transaction Schema
  - [x] 5.1 Update transaction DynamoDB schema
    - Add `currency` field to transaction
    - Update TypeScript types
    - _Requirements: 4.2, 4.3_

  - [x] 5.2 Update transaction Lambda function
    - Add currency to transaction creation
    - Add currency to transaction response
    - Use budget's currency as default
    - _Requirements: 4.2, 4.3_

  - [x] 5.3 Update transaction Lambda tests
    - Test transaction creation with currency
    - Test transaction response includes currency
    - _Requirements: 4.2, 4.3_

### Phase 4: Onboarding Integration

- [x] 6. Add Currency Selection to Onboarding
  - [x] 6.1 Update OnboardingFlow component
    - Add currency selection step after location
    - Use CurrencySelector component
    - Default to USD if not selected
    - Save currency to user profile
    - Pass currency to AI budget generation
    - _Requirements: 1.1-1.5_

  - [x] 6.2 Update onboarding tests
    - Test currency selection step
    - Test default currency (USD)
    - Test currency saved to profile
    - Test currency passed to AI generation
    - _Requirements: 1.1-1.5_

  - [x] 6.3 Update onboarding Lambda function
    - Accept currency in onboarding request
    - Save currency to user profile
    - Use currency in budget creation
    - _Requirements: 1.1-1.5_

### Phase 5: Settings Page Integration

- [x] 7. Add Currency Management to Settings
  - [x] 7.1 Update SettingsPage component
    - Add "Currency Settings" section
    - Show current currency with symbol and code
    - Add CurrencySelector for changing currency
    - Add confirmation dialog before changing
    - Add warning about existing data not being converted
    - Update user profile on currency change
    - _Requirements: 2.1-2.6_

  - [x] 7.2 Create currency change confirmation dialog
    - Show warning message
    - Confirm/Cancel buttons
    - Accessible keyboard navigation
    - _Requirements: 2.4, 2.5_

  - [x] 7.3 Update settings page tests
    - Test currency display
    - Test currency change
    - Test confirmation dialog
    - Test warning message
    - _Requirements: 2.1-2.6_

### Phase 6: UI Formatting Updates

- [ ] 8. Update Budget Display
  - [x] 8.1 Update BudgetList component
    - Use formatCurrency() for all amounts
    - Show currency symbol in budget summary
    - Show currency code in budget header
    - Format category amounts with currency
    - _Requirements: 3.1-3.5, 4.4_

  - [x] 8.2 Update BudgetForm component
    - Use formatCurrency() for input placeholders
    - Show currency symbol in input fields
    - Parse currency input correctly
    - _Requirements: 3.1-3.5, 4.4_

  - [x] 8.3 Update budget display tests
    - Test currency formatting for USD
    - Test currency formatting for EUR
    - Test currency formatting for JPY
    - Test currency symbol display
    - _Requirements: 3.1-3.5, 4.4_

- [ ] 9. Update Transaction Display
  - [x] 9.1 Update TransactionList component
    - Use formatCurrency() for transaction amounts
    - Show currency symbol in transaction list
    - Format amounts based on user's currency
    - _Requirements: 3.1-3.5, 4.5_

  - [x] 9.2 Update TransactionForm component
    - Use formatCurrency() for input placeholders
    - Show currency symbol in amount input
    - Parse currency input correctly
    - _Requirements: 3.1-3.5, 4.5_

  - [x] 9.3 Update transaction display tests
    - Test currency formatting for USD
    - Test currency formatting for EUR
    - Test currency formatting for JPY
    - Test currency symbol display
    - _Requirements: 3.1-3.5, 4.5_

### Phase 7: Mobile App Integration

- [ ] 10. Update Mobile Currency Display
  - [x] 10.1 Create mobile CurrencySelector component
    - Port web component to React Native
    - Use native picker component
    - Touch-optimized UI
    - _Requirements: 1.1, 2.1-2.3, 3.5_

  - [x] 10.2 Update mobile onboarding flow
    - Add currency selection step
    - Use mobile CurrencySelector
    - Save currency to user profile
    - _Requirements: 1.1-1.5, 3.5_

  - [ ] 10.3 Update mobile settings screen
    - Add currency management section
    - Use mobile CurrencySelector
    - Add confirmation dialog
    - _Requirements: 2.1-2.6, 3.5_

  - [ ] 10.4 Update mobile budget and transaction displays
    - Use formatCurrency() for all amounts
    - Show currency symbols
    - Format based on user's currency
    - _Requirements: 3.1-3.5, 4.4, 4.5_

### Phase 8: Data Migration

- [ ] 11. Create Data Migration Script
  - [ ] 11.1 Create migration script
    - Scan all user profiles
    - Add `currency: "USD"` to profiles without currency
    - Add `locale: "en-US"` to profiles without locale
    - Log migration progress
    - _Requirements: All existing users_

  - [ ] 11.2 Create budget migration script
    - Scan all budgets
    - Add `currency: "USD"` to budgets without currency
    - Log migration progress
    - _Requirements: All existing budgets_

  - [ ] 11.3 Create transaction migration script
    - Scan all transactions
    - Add `currency: "USD"` to transactions without currency
    - Log migration progress
    - _Requirements: All existing transactions_

  - [ ] 11.4 Test migration scripts
    - Test with sample data
    - Verify data integrity
    - Test rollback procedure
    - _Requirements: All existing data_

### Phase 9: Testing and Documentation

- [ ] 12. Integration Testing
  - [ ] 12.1 Test end-to-end onboarding flow
    - Test currency selection
    - Test budget creation with currency
    - Test transaction creation with currency
    - _Requirements: 1.1-1.5, 4.1-4.5_

  - [ ] 12.2 Test currency change flow
    - Test changing currency in settings
    - Test confirmation dialog
    - Test warning message
    - Test new budgets use new currency
    - _Requirements: 2.1-2.6_

  - [ ] 12.3 Test currency formatting
    - Test all 6 currencies
    - Test decimal places
    - Test thousands separators
    - Test symbol positioning
    - _Requirements: 3.1-3.5_

- [ ] 13. Documentation Updates
  - [ ] 13.1 Update API documentation
    - Document currency fields in user profile
    - Document currency fields in budget
    - Document currency fields in transaction
    - _Requirements: All_

  - [ ] 13.2 Update user documentation
    - Add currency selection guide
    - Add currency change guide
    - Add supported currencies list
    - _Requirements: All_

  - [ ] 13.3 Update README and CHANGELOG
    - Add multi-currency support to features
    - Document supported currencies
    - Add version entry
    - _Requirements: All_

## Definition of Done

- [ ] All 13 tasks completed
- [ ] All unit tests passing (> 80% coverage)
- [ ] All integration tests passing
- [ ] Currency formatting works for all 6 currencies
- [ ] Currency selection in onboarding flow
- [ ] Currency management in settings
- [ ] Data migration scripts tested
- [ ] Documentation updated
- [ ] Code reviewed and validated
- [ ] Deployed to dev environment
- [ ] End-to-end testing with real AWS

## Success Criteria

- ✅ All 6 currencies supported (USD, EUR, GBP, CAD, AUD, JPY)
- ✅ Currency formatting works on web and mobile
- ✅ Currency selection in onboarding flow
- ✅ Currency management in settings
- ✅ All amounts display with correct currency
- ✅ 100% test coverage for currency utilities
- ✅ Zero currency-related bugs in production
- ✅ Existing users migrated to USD
- ✅ New users can select any supported currency
