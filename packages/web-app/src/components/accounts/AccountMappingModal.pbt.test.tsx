/**
 * AccountMappingModal Property-Based Tests
 *
 * Property tests for account mapping modal with default tracking.
 * Uses fast-check for property-based testing.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as fc from "fast-check";
import {
  AccountMappingModal,
  DiscoveredAccount,
  AccountMapping,
} from "./AccountMappingModal";
import "@testing-library/jest-dom";

// Mock handlers
const mockOnSave = jest.fn().mockResolvedValue(undefined);
const mockOnClose = jest.fn();

// Create test discovered account
const createDiscoveredAccount = (
  overrides: Partial<DiscoveredAccount> = {},
): DiscoveredAccount => ({
  plaidAccountId: `plaid-${Math.random().toString(36).slice(2, 10)}`,
  name: "Test Account",
  officialName: "Official Test Account",
  mask: "1234",
  type: "depository",
  subtype: "checking",
  currentBalance: 1000,
  currency: "USD",
  institutionName: "Test Bank",
  ...overrides,
});

const renderModal = (accounts: DiscoveredAccount[] = []) => {
  cleanup();
  return render(
    <AccountMappingModal
      isOpen={true}
      accounts={accounts}
      institutionName="Test Bank"
      onSave={mockOnSave}
      onClose={mockOnClose}
    />,
  );
};

describe("AccountMappingModal Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 17: Connected Account Default Tracking
   *
   * For any newly connected account via Plaid, the isTracked field
   * SHALL default to true.
   *
   * **Validates: Requirements 5.3**
   */
  describe("Property 17: Connected Account Default Tracking", () => {
    it("should default all accounts to tracked", () => {
      const accounts = [
        createDiscoveredAccount({ name: "Checking" }),
        createDiscoveredAccount({ name: "Savings" }),
        createDiscoveredAccount({ name: "Credit Card", type: "credit" }),
      ];

      renderModal(accounts);

      // All tracking checkboxes should be checked by default
      const trackingCheckboxes = screen.getAllByRole("checkbox", {
        name: /track this account/i,
      });

      expect(trackingCheckboxes).toHaveLength(accounts.length);
      trackingCheckboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it("should show correct tracked count", () => {
      const accounts = [
        createDiscoveredAccount({ name: "Account 1" }),
        createDiscoveredAccount({ name: "Account 2" }),
        createDiscoveredAccount({ name: "Account 3" }),
      ];

      renderModal(accounts);

      // Should show "3 of 3 accounts will be tracked"
      expect(
        screen.getByText(/3 of 3 accounts will be tracked/i),
      ).toBeInTheDocument();
    });

    it("should update tracked count when toggling", () => {
      const accounts = [
        createDiscoveredAccount({ name: "Account 1" }),
        createDiscoveredAccount({ name: "Account 2" }),
      ];

      renderModal(accounts);

      // Initially 2 of 2
      expect(
        screen.getByText(/2 of 2 accounts will be tracked/i),
      ).toBeInTheDocument();

      // Uncheck first account
      const checkboxes = screen.getAllByRole("checkbox", {
        name: /track this account/i,
      });
      fireEvent.click(checkboxes[0]);

      // Now 1 of 2
      expect(
        screen.getByText(/1 of 2 accounts will be tracked/i),
      ).toBeInTheDocument();
    });

    it("should pass isTracked=true for all accounts when saving without changes", async () => {
      const accounts = [
        createDiscoveredAccount({ plaidAccountId: "acc-1", name: "Checking" }),
        createDiscoveredAccount({ plaidAccountId: "acc-2", name: "Savings" }),
      ];

      renderModal(accounts);

      // Click save
      const saveButton = screen.getByText("Save Accounts");
      fireEvent.click(saveButton);

      // Wait for async
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that onSave was called with isTracked=true for all
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      const savedMappings = mockOnSave.mock.calls[0][0] as AccountMapping[];

      expect(savedMappings).toHaveLength(2);
      savedMappings.forEach((mapping) => {
        expect(mapping.isTracked).toBe(true);
      });
    });

    it("should preserve isTracked=false when user unchecks", async () => {
      const accounts = [
        createDiscoveredAccount({ plaidAccountId: "acc-1", name: "Checking" }),
        createDiscoveredAccount({ plaidAccountId: "acc-2", name: "Savings" }),
      ];

      renderModal(accounts);

      // Uncheck second account
      const checkboxes = screen.getAllByRole("checkbox", {
        name: /track this account/i,
      });
      fireEvent.click(checkboxes[1]);

      // Click save
      const saveButton = screen.getByText("Save Accounts");
      fireEvent.click(saveButton);

      // Wait for async
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check mappings
      const savedMappings = mockOnSave.mock.calls[0][0] as AccountMapping[];

      expect(savedMappings[0].isTracked).toBe(true);
      expect(savedMappings[1].isTracked).toBe(false);
    });
  });

  /**
   * Account type mapping tests
   */
  describe("Account Type Mapping", () => {
    it("should map depository accounts to banking", () => {
      const accounts = [
        createDiscoveredAccount({ type: "depository", subtype: "checking" }),
      ];

      renderModal(accounts);

      const typeSelect = screen.getByRole("combobox") as HTMLSelectElement;
      expect(typeSelect.value).toBe("banking");
    });

    it("should map credit accounts to credit_card", () => {
      const accounts = [
        createDiscoveredAccount({ type: "credit", subtype: "credit card" }),
      ];

      renderModal(accounts);

      const typeSelect = screen.getByRole("combobox") as HTMLSelectElement;
      expect(typeSelect.value).toBe("credit_card");
    });

    it("should map investment accounts to investment", () => {
      const accounts = [
        createDiscoveredAccount({ type: "investment", subtype: "brokerage" }),
      ];

      renderModal(accounts);

      const typeSelect = screen.getByRole("combobox") as HTMLSelectElement;
      expect(typeSelect.value).toBe("investment");
    });

    it("should map loan accounts to loan", () => {
      const accounts = [
        createDiscoveredAccount({ type: "loan", subtype: "mortgage" }),
      ];

      renderModal(accounts);

      const typeSelect = screen.getByRole("combobox") as HTMLSelectElement;
      expect(typeSelect.value).toBe("loan");
    });
  });

  /**
   * Nickname customization tests
   */
  describe("Nickname Customization", () => {
    it("should default nickname to account name", () => {
      const accounts = [
        createDiscoveredAccount({ name: "My Checking Account" }),
      ];

      renderModal(accounts);

      const nicknameInput = screen.getByPlaceholderText(
        "Account nickname",
      ) as HTMLInputElement;
      expect(nicknameInput.value).toBe("My Checking Account");
    });

    it("should allow changing nickname", async () => {
      const accounts = [
        createDiscoveredAccount({
          plaidAccountId: "acc-1",
          name: "Original Name",
        }),
      ];

      renderModal(accounts);

      const nicknameInput = screen.getByPlaceholderText(
        "Account nickname",
      ) as HTMLInputElement;
      fireEvent.change(nicknameInput, { target: { value: "Custom Nickname" } });

      // Save
      const saveButton = screen.getByText("Save Accounts");
      fireEvent.click(saveButton);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const savedMappings = mockOnSave.mock.calls[0][0] as AccountMapping[];
      expect(savedMappings[0].nickname).toBe("Custom Nickname");
    });
  });

  /**
   * Multiple accounts handling
   */
  describe("Multiple Accounts", () => {
    it("should handle property test with random number of accounts", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 5 }), (count) => {
          const accounts = Array.from({ length: count }, (_, i) =>
            createDiscoveredAccount({
              plaidAccountId: `acc-${i}`,
              name: `Account ${i}`,
              officialName: undefined, // Don't set officialName so name is displayed
            }),
          );

          renderModal(accounts);

          // All accounts should be displayed (check nickname input values)
          const nicknameInputs = screen.getAllByPlaceholderText(
            "Account nickname",
          ) as HTMLInputElement[];
          expect(nicknameInputs).toHaveLength(count);

          // All should be tracked by default
          const checkboxes = screen.getAllByRole("checkbox", {
            name: /track this account/i,
          });
          expect(checkboxes).toHaveLength(count);

          return true;
        }),
        { numRuns: 10 },
      );
    });
  });

  /**
   * Modal behavior tests
   */
  describe("Modal Behavior", () => {
    it("should not render when isOpen is false", () => {
      cleanup();
      render(
        <AccountMappingModal
          isOpen={false}
          accounts={[createDiscoveredAccount()]}
          institutionName="Test Bank"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />,
      );

      expect(
        screen.queryByText("Configure Connected Accounts"),
      ).not.toBeInTheDocument();
    });

    it("should call onClose when cancel is clicked", () => {
      renderModal([createDiscoveredAccount()]);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should display institution name", () => {
      cleanup();
      render(
        <AccountMappingModal
          isOpen={true}
          accounts={[createDiscoveredAccount()]}
          institutionName="Chase Bank"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText(/Chase Bank/)).toBeInTheDocument();
    });
  });
});
