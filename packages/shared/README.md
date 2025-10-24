# @budget-buddy/shared

**Purpose**: Shared types, utilities, constants, and components used across all BudgetBuddy applications (web, mobile, admin).

## What's in this package

This package contains common code that needs to be consistent across all platforms:

### Types (`src/types/`)
- **User types**: User profiles, authentication, onboarding data schemas
- **Budget types**: Budget structures, categories, AI generation requests
- **Transaction types**: Transaction records, filters, creation requests
- **Family types**: Family accounts, invitations, member management
- **API types**: Request/response schemas, error handling, authentication tokens

### Utilities (`src/utils/`)
- **Currency**: Multi-currency formatting (CAD/USD), parsing, percentage calculations
- **Date**: Date formatting, month navigation, validation, range generation
- **Validation**: Email, postal codes, passwords, input sanitization

### Constants (`src/constants/`)
- **Categories**: Default budget categories by region (Canada vs US specific)
- **Regions**: Cost of living data for 50+ cities, regional configurations

### Components (`src/components/`)
- Placeholder for future shared UI components

## Package.json Explanation

- **Dependencies**: 
  - `zod`: Runtime type validation and schema definition
- **Scripts**:
  - `build`: Compiles TypeScript to JavaScript
  - `dev`: Watches for changes and recompiles
  - `lint`: Runs ESLint for code quality
  - `typecheck`: Validates TypeScript without emitting files
  - `test`: Runs Jest unit tests
  - `clean`: Removes build artifacts

## Usage

Import shared code in other packages:

```typescript
import { User, formatCurrency, validateEmail } from '@budget-buddy/shared';
```

## Development

Run in watch mode during development:
```bash
yarn dev
```

Build for production:
```bash
yarn build
```