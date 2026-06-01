/**
 * TransactionList Property-Based Tests
 *
 * Property tests for transaction list with account display.
 * Uses fast-check for property-based testing.
 *
 * **Validates: Requirements 9.1, 9.2**
 */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import * as fc from "fast-check";
import { TransactionList, Transaction } from "./TransactionList";
import "@testing-library/jest-dom";

// Test account type
interface TestAccount {
  accountId: string;
  budgetId: string;
  accountType: string;
  accountSubtype: string;
  nickname: string;
  institutionName: string | null;
  mask: string | null;
  currentBalance: number;
  currency: string;
  isManual: boolean;
  isTracked: boolean;
  plaidAccountId: string | null;
  plaidItemId: string | null;
  lastSynced: string | null;
  lastReconciled: string | null;
  createdAt: string;
  updatedAt: string;
}

// Account type icons
const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  banking: "🏦",
  cash: "💵",
  credit_card: "💳",
  investment: "📈",
  loan: "📋",
};

// Create test transaction
const createTestTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => ({
  transactionId: `txn-${Math.random().toString(36).slice(2, 10)}`,
  amount: 100,
  type: "expense",
  categoryId: "cat-1",
  categoryName: "Groceries",
  categoryIcon: "🛒",
  description: "Test Transaction",
  transactionDate: "2024-01-15",
  accountId: null,
  createdAt: "2024-01-15T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
  ...overrides,
});

// Create test account
const createTestAccount = (
  overrides: Partial<TestAccount> = {},
): TestAccount => ({
  accountId: `acc-${Math.random().toString(36).slice(2, 10)}`,
  budgetId: "budget-123",
  accountType: "banking",
  accountSubtype: "checking",
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

// Mock handlers
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

const renderList = (
  transactions: Transaction[],
  accounts: TestAccount[] = [],
) => {
  cleanup();
  return render(
    <TransactionList
      transactions={transactions}
      accounts={accounts as any}
      onEdit={mockOnEdit}
      onDelete={mockOnDelete}
    />,
  );
};

describe("TransactionList Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 24: Transaction Account Display
   *
   * For any transaction in the list, if it has an associated account,
   * the account icon and name SHALL be displayed; if it has no account,
   * "Unassigned" or a generic icon SHALL be displayed.
   *
   * **Validates: Requirements 9.1, 9.2**
   */
  describe("Property 24: Transaction Account Display", () => {
    it("should display account name for transactions with accounts", () => {
      const account = createTestAccount({
        accountId: "acc-1",
        nickname: "Main Checking",
        accountType: "banking",
      });

      const transaction = createTestTransaction({
        transactionId: "txn-1",
        accountId: "acc-1",
        description: "Grocery Shopping",
      });

      const { container } = renderList([transaction], [account]);

      // Account name should be displayed
      expect(container.textContent).toContain("Main Checking");
    });

    it("should display correct icon for each account type", () => {
      const accountTypes = Object.keys(ACCOUNT_TYPE_ICONS);

      for (const accountType of accountTypes) {
        const account = createTestAccount({
          accountId: `acc-${accountType}`,
          nickname: `${accountType} Account`,
          accountType,
        });

        const transaction = createTestTransaction({
          transactionId: `txn-${accountType}`,
          accountId: `acc-${accountType}`,
        });

        const { container } = renderList([transaction], [account]);

        // Icon should be displayed
        expect(container.textContent).toContain(
          ACCOUNT_TYPE_ICONS[accountType],
        );
      }
    });

    it('should display "Unassigned" for transactions without accounts', () => {
      const transaction = createTestTransaction({
        transactionId: "txn-1",
        accountId: null,
        description: "Cash Purchase",
      });

      const { container } = renderList([transaction], []);

      // "Unassigned" should be displayed
      expect(container.textContent).toContain("Unassigned");
    });

    it('should display "Unassigned" for transactions with undefined accountId', () => {
      const transaction = createTestTransaction({
        transactionId: "txn-1",
        description: "Legacy Transaction",
      });
      // Remove accountId to simulate undefined
      delete (transaction as any).accountId;

      const { container } = renderList([transaction], []);

      expect(container.textContent).toContain("Unassigned");
    });

    it("should handle mixed transactions (with and without accounts)", () => {
      const account = createTestAccount({
        accountId: "acc-1",
        nickname: "Checking",
      });

      const transactions = [
        createTestTransaction({
          transactionId: "txn-1",
          accountId: "acc-1",
          description: "With Account",
        }),
        createTestTransaction({
          transactionId: "txn-2",
          accountId: null,
          description: "Without Account",
        }),
      ];

      const { container } = renderList(transactions, [account]);

      // Both should be displayed correctly
      expect(container.textContent).toContain("Checking");
      expect(container.textContent).toContain("Unassigned");
    });

    it("should handle transaction with non-existent account", () => {
      const transaction = createTestTransaction({
        transactionId: "txn-1",
        accountId: "acc-deleted",
        description: "Orphaned Transaction",
      });

      const { container } = renderList([transaction], []);

      // Should show "Unknown Account" for non-existent account
      expect(container.textContent).toContain("Unknown Account");
    });
  });

  /**
   * Property: All transactions should be rendered
   */
  describe("Transaction Rendering", () => {
    it("should render all transactions", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (count) => {
          const transactions = Array.from({ length: count }, (_, i) =>
            createTestTransaction({
              transactionId: `txn-${i}`,
              description: `Transaction ${i}`,
            }),
          );

          const { container } = renderList(transactions, []);

          // All transactions should be rendered
          for (let i = 0; i < count; i++) {
            expect(container.textContent).toContain(`Transaction ${i}`);
          }

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it("should display transaction amounts correctly", () => {
      const transactions = [
        createTestTransaction({
          transactionId: "txn-1",
          amount: 123.45,
          type: "expense",
        }),
        createTestTransaction({
          transactionId: "txn-2",
          amount: 500,
          type: "income",
        }),
      ];

      const { container } = renderList(transactions, []);

      // Amounts should be formatted
      expect(container.textContent).toMatch(/\$123\.45/);
      expect(container.textContent).toMatch(/\$500/);
    });

    it("should show income with + and expense with -", () => {
      const transactions = [
        createTestTransaction({
          transactionId: "txn-1",
          amount: 100,
          type: "income",
          description: "Income Transaction",
        }),
        createTestTransaction({
          transactionId: "txn-2",
          amount: 50,
          type: "expense",
          description: "Expense Transaction",
        }),
      ];

      const { container } = renderList(transactions, []);

      // Check for + and - signs
      expect(container.textContent).toContain("+");
      expect(container.textContent).toContain("-");
    });
  });

  /**
   * Empty and loading states
   */
  describe("Empty and Loading States", () => {
    it("should show empty state when no transactions", () => {
      renderList([], []);

      expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    });

    it("should show loading state when loading", () => {
      cleanup();
      render(
        <TransactionList
          transactions={[]}
          accounts={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          loading={true}
        />,
      );

      expect(screen.getByText(/Loading transactions/i)).toBeInTheDocument();
    });
  });

  /**
   * Account lookup efficiency
   */
  describe("Account Lookup", () => {
    it("should correctly map multiple transactions to their accounts", () => {
      const accounts = [
        createTestAccount({ accountId: "acc-1", nickname: "Checking" }),
        createTestAccount({ accountId: "acc-2", nickname: "Savings" }),
        createTestAccount({ accountId: "acc-3", nickname: "Credit Card" }),
      ];

      const transactions = [
        createTestTransaction({ transactionId: "txn-1", accountId: "acc-1" }),
        createTestTransaction({ transactionId: "txn-2", accountId: "acc-2" }),
        createTestTransaction({ transactionId: "txn-3", accountId: "acc-3" }),
        createTestTransaction({ transactionId: "txn-4", accountId: "acc-1" }),
        createTestTransaction({ transactionId: "txn-5", accountId: null }),
      ];

      const { container } = renderList(transactions, accounts);

      // All account names should appear
      expect(container.textContent).toContain("Checking");
      expect(container.textContent).toContain("Savings");
      expect(container.textContent).toContain("Credit Card");
      expect(container.textContent).toContain("Unassigned");
    });
  });
});
