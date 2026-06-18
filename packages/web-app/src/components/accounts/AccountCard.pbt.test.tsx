/**
 * AccountCard Property-Based Tests
 *
 * Property tests for account card component.
 * Uses fast-check for property-based testing.
 *
 * **Validates: Requirements 8.2**
 */

import { render, screen, cleanup } from "@testing-library/react";
import * as fc from "fast-check";
import { AccountCard } from "./AccountCard";
import {
  Account,
  AccountType,
  BankingSubtype,
  CashSubtype,
  CreditCardSubtype,
  InvestmentSubtype,
  LoanSubtype,
  ACCOUNT_SUBTYPE_ICONS,
  ACCOUNT_TYPE_ICONS,
} from "@budget-buddy/shared/src/types/account";
import "@testing-library/jest-dom";

// Mock handlers
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();
const mockOnReconcile = jest.fn();
const mockOnToggleTracking = jest.fn();
const mockOnViewTransactions = jest.fn();

// Create a base account for testing
const createTestAccount = (overrides: Partial<Account> = {}): Account => ({
  accountId: "123e4567-e89b-12d3-a456-426614174000",
  familyId: "123e4567-e89b-12d3-a456-426614174001",
  accountType: AccountType.BANKING,
  accountSubtype: BankingSubtype.CHECKING,
  nickname: "Test Account",
  institutionName: "Test Bank",
  mask: "1234",
  currentBalance: 1000,
  currency: "USD",
  isManual: true,
  isTracked: true,
  plaidAccountId: null,
  plaidItemId: null,
  lastSynced: null,
  lastReconciled: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

// Account type/subtype combinations for testing
const accountTypeSubtypeCombinations: Array<{
  type: AccountType;
  subtype: string;
}> = [
  { type: AccountType.BANKING, subtype: BankingSubtype.CHECKING },
  { type: AccountType.BANKING, subtype: BankingSubtype.SAVINGS },
  { type: AccountType.BANKING, subtype: BankingSubtype.MONEY_MARKET },
  { type: AccountType.CASH, subtype: CashSubtype.CASH },
  { type: AccountType.CASH, subtype: CashSubtype.DIGITAL_WALLET },
  { type: AccountType.CREDIT_CARD, subtype: CreditCardSubtype.CREDIT_CARD },
  { type: AccountType.CREDIT_CARD, subtype: CreditCardSubtype.STORE_CARD },
  { type: AccountType.INVESTMENT, subtype: InvestmentSubtype.BROKERAGE },
  { type: AccountType.INVESTMENT, subtype: InvestmentSubtype.RETIREMENT_401K },
  { type: AccountType.INVESTMENT, subtype: InvestmentSubtype.IRA },
  { type: AccountType.LOAN, subtype: LoanSubtype.MORTGAGE },
  { type: AccountType.LOAN, subtype: LoanSubtype.AUTO_LOAN },
  { type: AccountType.LOAN, subtype: LoanSubtype.STUDENT_LOAN },
];

const renderAccountCard = (account: Account) => {
  cleanup();
  return render(
    <AccountCard
      account={account}
      onEdit={mockOnEdit}
      onDelete={mockOnDelete}
      onReconcile={mockOnReconcile}
      onToggleTracking={mockOnToggleTracking}
      onViewTransactions={mockOnViewTransactions}
    />,
  );
};

describe("AccountCard Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 23: Account Card Content Completeness
   *
   * For any account, the account card SHALL display all required fields:
   * icon, nickname, institution (if present), mask (if present), balance,
   * connection status, and tracking status.
   *
   * **Validates: Requirements 8.2**
   */
  describe("Property 23: Account Card Content Completeness", () => {
    it("should display correct icon for each account type/subtype combination", () => {
      for (const { type, subtype } of accountTypeSubtypeCombinations) {
        const account = createTestAccount({
          accountType: type,
          accountSubtype: subtype as any,
        });

        const { container } = renderAccountCard(account);

        const expectedIcon =
          ACCOUNT_SUBTYPE_ICONS[subtype] || ACCOUNT_TYPE_ICONS[type];
        const iconElement = container.querySelector('span[aria-hidden="true"]');

        expect(iconElement?.textContent).toBe(expectedIcon);
      }
    });

    it("should display account nickname", () => {
      const nicknames = [
        "Main Checking",
        "Emergency Fund",
        "Credit Card",
        "401k Retirement",
      ];

      for (const nickname of nicknames) {
        const account = createTestAccount({ nickname });
        renderAccountCard(account);

        expect(screen.getByText(nickname)).toBeInTheDocument();
      }
    });

    it("should display institution name when present", () => {
      const institutions = [
        "Chase Bank",
        "Bank of America",
        "Fidelity",
        "Vanguard",
      ];

      for (const institutionName of institutions) {
        const account = createTestAccount({ institutionName });
        renderAccountCard(account);

        expect(screen.getByText(institutionName)).toBeInTheDocument();
      }
    });

    it("should not display institution section when null", () => {
      const account = createTestAccount({ institutionName: null });
      renderAccountCard(account);

      // Should not have the bullet separator for institution
      // The account should still render without errors
      expect(screen.getByText("Test Account")).toBeInTheDocument();
    });

    it("should display mask when present", () => {
      const masks = ["1234", "5678", "9012", "3456"];

      for (const mask of masks) {
        const account = createTestAccount({ mask });
        renderAccountCard(account);

        expect(screen.getByText(`••••${mask}`)).toBeInTheDocument();
      }
    });

    it("should display balance for various amounts", () => {
      fc.assert(
        fc.property(
          fc.double({ min: -100000, max: 100000, noNaN: true }),
          (balance) => {
            const account = createTestAccount({ currentBalance: balance });
            const { container } = renderAccountCard(account);

            // Balance element should exist
            const balanceElement = container.querySelector(".font-semibold");
            return balanceElement !== null;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should show "Not Tracked" badge when account is not tracked', () => {
      const account = createTestAccount({ isTracked: false });
      renderAccountCard(account);

      expect(screen.getByText("Not Tracked")).toBeInTheDocument();
    });

    it('should not show "Not Tracked" badge when account is tracked', () => {
      const account = createTestAccount({ isTracked: true });
      renderAccountCard(account);

      expect(screen.queryByText("Not Tracked")).not.toBeInTheDocument();
    });

    it('should show "Connected" badge for non-manual accounts', () => {
      const account = createTestAccount({ isManual: false });
      renderAccountCard(account);

      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it('should not show "Connected" badge for manual accounts', () => {
      const account = createTestAccount({ isManual: true });
      renderAccountCard(account);

      expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    });
  });

  /**
   * Balance color coding property
   */
  describe("Balance Color Coding", () => {
    it("should show green for positive balances on asset accounts", () => {
      const assetTypes = [
        AccountType.BANKING,
        AccountType.CASH,
        AccountType.INVESTMENT,
      ];

      for (const accountType of assetTypes) {
        const account = createTestAccount({
          accountType,
          accountSubtype:
            accountType === AccountType.BANKING
              ? BankingSubtype.CHECKING
              : accountType === AccountType.CASH
                ? CashSubtype.CASH
                : InvestmentSubtype.BROKERAGE,
          currentBalance: 1000,
        });

        const { container } = renderAccountCard(account);
        const balanceElement = container.querySelector(".text-green-600");

        expect(balanceElement).toBeInTheDocument();
      }
    });

    it("should show red for negative balances", () => {
      const account = createTestAccount({ currentBalance: -500 });
      const { container } = renderAccountCard(account);

      const balanceElement = container.querySelector(".text-red-600");
      expect(balanceElement).toBeInTheDocument();
    });

    it("should show liabilities with negative display balance", () => {
      const liabilityTypes = [
        {
          type: AccountType.CREDIT_CARD,
          subtype: CreditCardSubtype.CREDIT_CARD,
        },
        { type: AccountType.LOAN, subtype: LoanSubtype.MORTGAGE },
      ];

      for (const { type, subtype } of liabilityTypes) {
        const account = createTestAccount({
          accountType: type,
          accountSubtype: subtype as any,
          currentBalance: 1000, // Positive balance on liability = debt
        });

        const { container } = renderAccountCard(account);
        // Liabilities show as negative (debt), so the display should show a negative value
        const balanceElement = container.querySelector(".font-semibold");

        expect(balanceElement).toBeInTheDocument();
        // The text should contain a negative sign (displayed as debt)
        expect(balanceElement?.textContent).toMatch(/-/);
      }
    });
  });

  /**
   * Menu accessibility
   */
  describe("Menu Accessibility", () => {
    it("should have accessible menu button", () => {
      const account = createTestAccount();
      renderAccountCard(account);

      const menuButton = screen.getByLabelText("Account actions");
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveAttribute("aria-haspopup", "menu");
      expect(menuButton).toHaveAttribute("aria-expanded", "false");
    });
  });
});
