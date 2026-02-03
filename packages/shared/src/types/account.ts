/**
 * Account Types and Enums for BudgetBuddy
 *
 * Supports manual accounts (user-created) and connected accounts (via Plaid).
 * Used for tracking balances and associating transactions with specific accounts.
 */

import { z } from 'zod';

// ============================================================================
// Account Type Enums
// ============================================================================

export enum AccountType {
  BANKING = 'banking',
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  LOAN = 'loan',
}

export enum BankingSubtype {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  MONEY_MARKET = 'money_market',
}

export enum CashSubtype {
  CASH = 'cash',
  DIGITAL_WALLET = 'digital_wallet',
}

export enum CreditCardSubtype {
  CREDIT_CARD = 'credit_card',
  STORE_CARD = 'store_card',
}

export enum InvestmentSubtype {
  BROKERAGE = 'brokerage',
  RETIREMENT_401K = 'retirement_401k',
  IRA = 'ira',
  OTHER_INVESTMENT = 'other_investment',
}

export enum LoanSubtype {
  MORTGAGE = 'mortgage',
  AUTO_LOAN = 'auto_loan',
  STUDENT_LOAN = 'student_loan',
  PERSONAL_LOAN = 'personal_loan',
}

export type AccountSubtype =
  | BankingSubtype
  | CashSubtype
  | CreditCardSubtype
  | InvestmentSubtype
  | LoanSubtype;

// ============================================================================
// Account Type/Subtype Mappings
// ============================================================================

export const ACCOUNT_SUBTYPES: Record<AccountType, readonly string[]> = {
  [AccountType.BANKING]: Object.values(BankingSubtype),
  [AccountType.CASH]: Object.values(CashSubtype),
  [AccountType.CREDIT_CARD]: Object.values(CreditCardSubtype),
  [AccountType.INVESTMENT]: Object.values(InvestmentSubtype),
  [AccountType.LOAN]: Object.values(LoanSubtype),
} as const;

// ============================================================================
// Account Icons
// ============================================================================

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  [AccountType.BANKING]: '🏦',
  [AccountType.CASH]: '💵',
  [AccountType.CREDIT_CARD]: '💳',
  [AccountType.INVESTMENT]: '📈',
  [AccountType.LOAN]: '📋',
};

export const ACCOUNT_SUBTYPE_ICONS: Record<string, string> = {
  // Banking
  [BankingSubtype.CHECKING]: '🏦',
  [BankingSubtype.SAVINGS]: '🐷',
  [BankingSubtype.MONEY_MARKET]: '💰',
  // Cash
  [CashSubtype.CASH]: '💵',
  [CashSubtype.DIGITAL_WALLET]: '📱',
  // Credit Card
  [CreditCardSubtype.CREDIT_CARD]: '💳',
  [CreditCardSubtype.STORE_CARD]: '🏪',
  // Investment
  [InvestmentSubtype.BROKERAGE]: '📈',
  [InvestmentSubtype.RETIREMENT_401K]: '🏖️',
  [InvestmentSubtype.IRA]: '🎯',
  [InvestmentSubtype.OTHER_INVESTMENT]: '📊',
  // Loan
  [LoanSubtype.MORTGAGE]: '🏠',
  [LoanSubtype.AUTO_LOAN]: '🚗',
  [LoanSubtype.STUDENT_LOAN]: '🎓',
  [LoanSubtype.PERSONAL_LOAN]: '📋',
};

// ============================================================================
// Account Type Labels (for UI display)
// ============================================================================

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.BANKING]: 'Banking',
  [AccountType.CASH]: 'Cash',
  [AccountType.CREDIT_CARD]: 'Credit Cards',
  [AccountType.INVESTMENT]: 'Investments',
  [AccountType.LOAN]: 'Loans',
};

export const ACCOUNT_SUBTYPE_LABELS: Record<string, string> = {
  // Banking
  [BankingSubtype.CHECKING]: 'Checking',
  [BankingSubtype.SAVINGS]: 'Savings',
  [BankingSubtype.MONEY_MARKET]: 'Money Market',
  // Cash
  [CashSubtype.CASH]: 'Cash',
  [CashSubtype.DIGITAL_WALLET]: 'Digital Wallet',
  // Credit Card
  [CreditCardSubtype.CREDIT_CARD]: 'Credit Card',
  [CreditCardSubtype.STORE_CARD]: 'Store Card',
  // Investment
  [InvestmentSubtype.BROKERAGE]: 'Brokerage',
  [InvestmentSubtype.RETIREMENT_401K]: '401(k)',
  [InvestmentSubtype.IRA]: 'IRA',
  [InvestmentSubtype.OTHER_INVESTMENT]: 'Other Investment',
  // Loan
  [LoanSubtype.MORTGAGE]: 'Mortgage',
  [LoanSubtype.AUTO_LOAN]: 'Auto Loan',
  [LoanSubtype.STUDENT_LOAN]: 'Student Loan',
  [LoanSubtype.PERSONAL_LOAN]: 'Personal Loan',
};

// ============================================================================
// Asset vs Liability Classification
// ============================================================================

export const ASSET_ACCOUNT_TYPES: AccountType[] = [
  AccountType.BANKING,
  AccountType.CASH,
  AccountType.INVESTMENT,
];

export const LIABILITY_ACCOUNT_TYPES: AccountType[] = [
  AccountType.CREDIT_CARD,
  AccountType.LOAN,
];

export function isAssetAccount(accountType: AccountType): boolean {
  return ASSET_ACCOUNT_TYPES.includes(accountType);
}

export function isLiabilityAccount(accountType: AccountType): boolean {
  return LIABILITY_ACCOUNT_TYPES.includes(accountType);
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const AccountTypeSchema = z.nativeEnum(AccountType);

export const AccountSubtypeSchema = z.union([
  z.nativeEnum(BankingSubtype),
  z.nativeEnum(CashSubtype),
  z.nativeEnum(CreditCardSubtype),
  z.nativeEnum(InvestmentSubtype),
  z.nativeEnum(LoanSubtype),
]);

export const AccountSchema = z.object({
  accountId: z.string().uuid(),
  familyId: z.string(),
  accountType: AccountTypeSchema,
  accountSubtype: AccountSubtypeSchema,
  nickname: z.string().min(1).max(100),
  institutionName: z.string().max(100).optional().nullable(),
  mask: z.string().max(4).optional().nullable(), // Last 4 digits
  currentBalance: z.number(),
  currency: z.string().length(3).default('USD'),
  isManual: z.boolean(),
  isTracked: z.boolean().default(true),
  plaidAccountId: z.string().optional().nullable(),
  plaidItemId: z.string().optional().nullable(),
  lastSynced: z.string().datetime().optional().nullable(),
  lastReconciled: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Account = z.infer<typeof AccountSchema>;

// ============================================================================
// Account Summary Types
// ============================================================================

export interface AccountsSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountsByType: Record<AccountType, Account[]>;
  accountCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the icon for an account based on its subtype (preferred) or type
 */
export function getAccountIcon(account: Pick<Account, 'accountType' | 'accountSubtype'>): string {
  return ACCOUNT_SUBTYPE_ICONS[account.accountSubtype] || ACCOUNT_TYPE_ICONS[account.accountType];
}

/**
 * Get the display label for an account type
 */
export function getAccountTypeLabel(accountType: AccountType): string {
  return ACCOUNT_TYPE_LABELS[accountType];
}

/**
 * Get the display label for an account subtype
 */
export function getAccountSubtypeLabel(accountSubtype: AccountSubtype): string {
  return ACCOUNT_SUBTYPE_LABELS[accountSubtype] || accountSubtype;
}

/**
 * Validate that a subtype is valid for a given account type
 */
export function isValidSubtypeForType(accountType: AccountType, subtype: string): boolean {
  return ACCOUNT_SUBTYPES[accountType]?.includes(subtype) ?? false;
}

/**
 * Calculate balance change for a transaction on an account
 *
 * Asset accounts (banking, cash, investment):
 *   - Income: +amount (increases balance)
 *   - Expense: -amount (decreases balance)
 *
 * Liability accounts (credit_card, loan):
 *   - Income: -amount (payment reduces debt)
 *   - Expense: +amount (charge increases debt)
 */
export function calculateBalanceChange(
  transactionType: 'income' | 'expense',
  amount: number,
  accountType: AccountType
): number {
  const isAsset = isAssetAccount(accountType);
  const isIncome = transactionType === 'income';

  if (isAsset) {
    return isIncome ? amount : -amount;
  } else {
    // Liability account
    return isIncome ? -amount : amount;
  }
}


// ============================================================================
// Input Validation Schemas (for API requests)
// ============================================================================

/**
 * Schema for creating a new manual account
 */
export const CreateAccountInputSchema = z.object({
  accountType: AccountTypeSchema,
  accountSubtype: AccountSubtypeSchema,
  nickname: z.string().min(1, 'Account nickname is required').max(100),
  institutionName: z.string().max(100).optional().nullable(),
  currentBalance: z.number(),
  currency: z.string().length(3).default('USD'),
}).refine(
  (data) => isValidSubtypeForType(data.accountType, data.accountSubtype),
  {
    message: 'Invalid subtype for the selected account type',
    path: ['accountSubtype'],
  }
);

export type CreateAccountInput = z.infer<typeof CreateAccountInputSchema>;

/**
 * Schema for updating an existing account
 */
export const UpdateAccountInputSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  institutionName: z.string().max(100).optional().nullable(),
  currentBalance: z.number().optional(),
  isTracked: z.boolean().optional(),
});

export type UpdateAccountInput = z.infer<typeof UpdateAccountInputSchema>;

/**
 * Schema for reconciling an account balance
 */
export const ReconcileAccountInputSchema = z.object({
  newBalance: z.number(),
  notes: z.string().max(500).optional(),
});

export type ReconcileAccountInput = z.infer<typeof ReconcileAccountInputSchema>;

/**
 * Schema for setting account tracking status
 */
export const SetAccountTrackingInputSchema = z.object({
  isTracked: z.boolean(),
});

export type SetAccountTrackingInput = z.infer<typeof SetAccountTrackingInputSchema>;

/**
 * Schema for mapping a connected (Plaid) account
 */
export const MapConnectedAccountInputSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  accountType: AccountTypeSchema.optional(),
  accountSubtype: AccountSubtypeSchema.optional(),
  isTracked: z.boolean().default(true),
});

export type MapConnectedAccountInput = z.infer<typeof MapConnectedAccountInputSchema>;

/**
 * Schema for account query filters
 */
export const AccountFilterSchema = z.object({
  accountType: AccountTypeSchema.optional(),
  isManual: z.boolean().optional(),
  isTracked: z.boolean().optional(),
});

export type AccountFilter = z.infer<typeof AccountFilterSchema>;
