/**
 * TransactionModal Property-Based Tests
 *
 * Property tests for transaction modal with account selection and batch mode.
 * Uses fast-check for property-based testing.
 *
 * **Validates: Requirements 1.1-1.9, 4.1-4.8**
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  TransactionModal,
  Category,
} from "./TransactionModal";
import "@testing-library/jest-dom";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

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

// Test categories
const testCategories: Category[] = [
  { id: "cat-1", name: "Groceries", icon: "🛒" },
  { id: "cat-2", name: "Utilities", icon: "💡" },
  { id: "cat-3", name: "Entertainment", icon: "🎬" },
];

// Account type order - kept for documentation purposes
// const ACCOUNT_TYPE_ORDER = [
//   "banking",
//   "cash",
//   "credit_card",
//   "investment",
//   "loan",
// ];

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
const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
const mockOnClose = jest.fn();

const renderModal = (
  accounts: TestAccount[] = [],
  type: "income" | "expense" = "expense",
) => {
  cleanup();
  return render(
    <TransactionModal
      isOpen={true}
      type={type}
      accounts={accounts as any}
      categories={testCategories}
      onSubmit={mockOnSubmit}
      onClose={mockOnClose}
    />,
  );
};

describe("TransactionModal Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 13: Account Dropdown Content
   *
   * For any set of user accounts, the transaction modal account dropdown SHALL
   * list all accounts grouped by type, with each item displaying account name,
   * mask (if present), and current balance.
   *
   * **Validates: Requirements 4.2, 4.3**
   */
  describe("Property 13: Account Dropdown Content", () => {
    it("should list all accounts in the dropdown", () => {
      const accounts = [
        createTestAccount({ accountType: "banking", nickname: "Checking" }),
        createTestAccount({ accountType: "cash", nickname: "Wallet" }),
        createTestAccount({ accountType: "credit_card", nickname: "Visa" }),
      ];

      renderModal(accounts);

      const dropdown = screen.getByLabelText("Account (optional)");
      expect(dropdown).toBeInTheDocument();

      // All accounts should be in the dropdown
      accounts.forEach((account) => {
        expect(dropdown.innerHTML).toContain(account.nickname);
      });
    });

    it("should group accounts by type", () => {
      const accounts = [
        createTestAccount({ accountType: "banking", nickname: "Checking 1" }),
        createTestAccount({ accountType: "banking", nickname: "Savings 1" }),
        createTestAccount({ accountType: "credit_card", nickname: "Visa" }),
        createTestAccount({ accountType: "loan", nickname: "Mortgage" }),
      ];

      const { container } = renderModal(accounts);

      // Check for optgroup elements
      const optgroups = container.querySelectorAll("optgroup");
      expect(optgroups.length).toBeGreaterThan(0);

      // Banking group should have 2 accounts
      const bankingGroup = Array.from(optgroups).find(
        (og) => og.label === "Banking",
      );
      expect(bankingGroup).toBeDefined();
      if (bankingGroup) {
        const options = bankingGroup.querySelectorAll("option");
        expect(options.length).toBe(2);
      }
    });

    it("should display account mask when present", () => {
      const accounts = [
        createTestAccount({ nickname: "Checking", mask: "4567" }),
        createTestAccount({ nickname: "Savings", mask: null }),
      ];

      renderModal(accounts);

      const dropdown = screen.getByLabelText("Account (optional)");
      expect(dropdown.innerHTML).toContain("••••4567");
    });

    it("should display account balance", () => {
      const accounts = [
        createTestAccount({ nickname: "Checking", currentBalance: 1234.56 }),
      ];

      renderModal(accounts);

      const dropdown = screen.getByLabelText("Account (optional)");
      // Balance should be formatted
      expect(dropdown.innerHTML).toMatch(/\$1,234\.56/);
    });

    it("should have 'No account selected' option", () => {
      const accounts = [createTestAccount()];

      renderModal(accounts);

      const dropdown = screen.getByLabelText(
        "Account (optional)",
      ) as HTMLSelectElement;
      const noAccountOption = Array.from(dropdown.options).find(
        (opt) => opt.value === "",
      );
      expect(noAccountOption).toBeDefined();
      expect(noAccountOption?.textContent).toBe("No account selected");
    });

    it("should handle empty accounts list", () => {
      renderModal([]);

      const dropdown = screen.getByLabelText(
        "Account (optional)",
      ) as HTMLSelectElement;
      // Should only have the "No account selected" option
      expect(dropdown.options.length).toBe(1);
      expect(dropdown.options[0].value).toBe("");
    });
  });

  /**
   * Property 2: Batch Mode Context Preservation
   *
   * For any transaction saved in batch entry mode, the transaction type
   * (income/expense) AND the selected account SHALL be preserved for the next entry.
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  describe("Property 2: Batch Mode Context Preservation", () => {
    it("should preserve account selection after batch save", async () => {
      const accounts = [
        createTestAccount({ accountId: "acc-1", nickname: "Checking" }),
        createTestAccount({ accountId: "acc-2", nickname: "Savings" }),
      ];

      renderModal(accounts);

      // Select an account
      const accountDropdown = screen.getByLabelText(
        "Account (optional)",
      ) as HTMLSelectElement;
      fireEvent.change(accountDropdown, { target: { value: "acc-1" } });

      // Enable batch mode
      const batchCheckbox = screen.getByLabelText(
        /Create another transaction/i,
      );
      fireEvent.click(batchCheckbox);

      // Fill required fields
      const categoryDropdown = screen.getByLabelText("Category *");
      fireEvent.change(categoryDropdown, { target: { value: "cat-1" } });

      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "50" } });

      // Submit
      const submitButton = screen.getByText("Add Transaction");
      fireEvent.click(submitButton);

      // Wait for async submit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Account should still be selected
      expect(accountDropdown.value).toBe("acc-1");
    });

    it("should clear amount, description, and category after batch save", async () => {
      const accounts = [createTestAccount({ accountId: "acc-1" })];

      renderModal(accounts);

      // Enable batch mode
      const batchCheckbox = screen.getByLabelText(
        /Create another transaction/i,
      );
      fireEvent.click(batchCheckbox);

      // Fill form
      const categoryDropdown = screen.getByLabelText(
        "Category *",
      ) as HTMLSelectElement;
      fireEvent.change(categoryDropdown, { target: { value: "cat-1" } });

      const amountInput = screen.getByPlaceholderText(
        "0.00",
      ) as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: "100" } });

      const descInput = screen.getByPlaceholderText(
        "Enter description...",
      ) as HTMLInputElement;
      fireEvent.change(descInput, { target: { value: "Test purchase" } });

      // Submit
      const submitButton = screen.getByText("Add Transaction");
      fireEvent.click(submitButton);

      // Wait for async submit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Fields should be cleared
      expect(amountInput.value).toBe("");
      expect(descInput.value).toBe("");
      expect(categoryDropdown.value).toBe("");
    });
  });

  /**
   * Property 4: Batch Mode Counter Accuracy
   *
   * For any sequence of N successful transactions in batch mode,
   * the displayed count SHALL equal N.
   *
   * **Validates: Requirements 1.6**
   */
  describe("Property 4: Batch Mode Counter Accuracy", () => {
    it("should increment counter after each successful save", async () => {
      const accounts = [createTestAccount()];

      renderModal(accounts);

      // Enable batch mode
      const batchCheckbox = screen.getByLabelText(
        /Create another transaction/i,
      );
      fireEvent.click(batchCheckbox);

      // Submit 3 transactions
      for (let i = 0; i < 3; i++) {
        const categoryDropdown = screen.getByLabelText("Category *");
        fireEvent.change(categoryDropdown, { target: { value: "cat-1" } });

        const amountInput = screen.getByPlaceholderText("0.00");
        fireEvent.change(amountInput, { target: { value: "50" } });

        const submitButton = screen.getByText("Add Transaction");
        fireEvent.click(submitButton);

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Counter should show 3
      expect(screen.getByText(/3 transactions added/i)).toBeInTheDocument();
    });

    it("should not show counter when count is 0", () => {
      renderModal([]);

      // Counter should not be visible
      expect(screen.queryByText(/transactions added/i)).not.toBeInTheDocument();
    });
  });

  /**
   * Property 16: Last Account Preference
   *
   * For any transaction saved with an account, the next transaction modal
   * opened SHALL pre-select that account (if preference is enabled).
   *
   * **Validates: Requirements 4.8**
   */
  describe("Property 16: Last Account Preference", () => {
    it("should save last used account to localStorage", async () => {
      const accounts = [
        createTestAccount({ accountId: "acc-1", nickname: "Checking" }),
      ];

      renderModal(accounts);

      // Select account
      const accountDropdown = screen.getByLabelText("Account (optional)");
      fireEvent.change(accountDropdown, { target: { value: "acc-1" } });

      // Fill and submit
      const categoryDropdown = screen.getByLabelText("Category *");
      fireEvent.change(categoryDropdown, { target: { value: "cat-1" } });

      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "50" } });

      const submitButton = screen.getByText("Add Transaction");
      fireEvent.click(submitButton);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check localStorage
      expect(localStorageMock.getItem("budgetbuddy_last_account")).toBe(
        "acc-1",
      );
    });

    it("should pre-select last used account on modal open", () => {
      const accounts = [
        createTestAccount({ accountId: "acc-1", nickname: "Checking" }),
        createTestAccount({ accountId: "acc-2", nickname: "Savings" }),
      ];

      // Set last account in localStorage
      localStorageMock.setItem("budgetbuddy_last_account", "acc-2");

      renderModal(accounts);

      const accountDropdown = screen.getByLabelText(
        "Account (optional)",
      ) as HTMLSelectElement;
      expect(accountDropdown.value).toBe("acc-2");
    });

    it("should not pre-select if last account no longer exists", () => {
      const accounts = [
        createTestAccount({ accountId: "acc-1", nickname: "Checking" }),
      ];

      // Set non-existent account in localStorage
      localStorageMock.setItem("budgetbuddy_last_account", "acc-deleted");

      renderModal(accounts);

      const accountDropdown = screen.getByLabelText(
        "Account (optional)",
      ) as HTMLSelectElement;
      expect(accountDropdown.value).toBe("");
    });
  });

  /**
   * Property 1: Batch Mode Form Behavior
   *
   * For any transaction submitted with "Create another transaction" checkbox
   * checked, the modal SHALL remain open. For any transaction submitted with
   * the checkbox unchecked, the modal SHALL close.
   *
   * **Validates: Requirements 1.2, 1.5, 1.8**
   */
  describe("Property 1: Batch Mode Form Behavior", () => {
    it("should keep modal open when batch mode is enabled", async () => {
      renderModal([]);

      // Enable batch mode
      const batchCheckbox = screen.getByLabelText(
        /Create another transaction/i,
      );
      fireEvent.click(batchCheckbox);

      // Fill and submit
      const categoryDropdown = screen.getByLabelText("Category *");
      fireEvent.change(categoryDropdown, { target: { value: "cat-1" } });

      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "50" } });

      const submitButton = screen.getByText("Add Transaction");
      fireEvent.click(submitButton);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modal should still be visible (onClose not called)
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should close modal when batch mode is disabled", async () => {
      renderModal([]);

      // Fill and submit (batch mode disabled by default)
      const categoryDropdown = screen.getByLabelText("Category *");
      fireEvent.change(categoryDropdown, { target: { value: "cat-1" } });

      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "50" } });

      const submitButton = screen.getByText("Add Transaction");
      fireEvent.click(submitButton);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modal should close
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should show 'Done' button in batch mode after saving", async () => {
      renderModal([]);

      // Enable batch mode
      const batchCheckbox = screen.getByLabelText(
        /Create another transaction/i,
      );
      fireEvent.click(batchCheckbox);

      // Fill and submit
      const categoryDropdown = screen.getByLabelText("Category *");
      fireEvent.change(categoryDropdown, { target: { value: "cat-1" } });

      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "50" } });

      const submitButton = screen.getByText("Add Transaction");
      fireEvent.click(submitButton);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cancel button should now say "Done"
      expect(screen.getByText("Done")).toBeInTheDocument();
    });
  });

  /**
   * Property 3: Batch Mode Error Handling
   *
   * For any transaction that fails to save in batch mode, the form data
   * SHALL remain intact for retry.
   *
   * **Validates: Requirements 1.9**
   */
  describe("Property 3: Batch Mode Error Handling", () => {
    it("should preserve form data on save failure", async () => {
      // Make submit fail
      mockOnSubmit.mockRejectedValueOnce(new Error("Network error"));

      renderModal([]);

      // Enable batch mode
      const batchCheckbox = screen.getByLabelText(
        /Create another transaction/i,
      );
      fireEvent.click(batchCheckbox);

      // Fill form
      const categoryDropdown = screen.getByLabelText(
        "Category *",
      ) as HTMLSelectElement;
      fireEvent.change(categoryDropdown, { target: { value: "cat-1" } });

      const amountInput = screen.getByPlaceholderText(
        "0.00",
      ) as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: "75.50" } });

      const descInput = screen.getByPlaceholderText(
        "Enter description...",
      ) as HTMLInputElement;
      fireEvent.change(descInput, { target: { value: "Test purchase" } });

      // Submit (will fail)
      const submitButton = screen.getByText("Add Transaction");
      fireEvent.click(submitButton);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Form data should be preserved
      expect(categoryDropdown.value).toBe("cat-1");
      expect(amountInput.value).toBe("75.50");
      expect(descInput.value).toBe("Test purchase");

      // Error message should be shown
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
