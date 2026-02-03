/**
 * AccountsPage Tests
 *
 * Tests for account grouping and display logic.
 *
 * **Validates: Requirements 2.6**
 */

import * as fc from "fast-check";

// Account type order for grouping
const ACCOUNT_TYPE_ORDER = [
  "banking",
  "cash",
  "credit_card",
  "investment",
  "loan",
];

// Simple account type for testing
interface TestAccount {
  accountId: string;
  accountType: string;
  nickname: string;
}

// Account grouping function (extracted from AccountsPage)
function groupAccountsByType(
  accounts: TestAccount[],
): Record<string, TestAccount[]> {
  const grouped: Record<string, TestAccount[]> = {};

  ACCOUNT_TYPE_ORDER.forEach((type) => {
    grouped[type] = [];
  });

  accounts.forEach((account) => {
    const type = account.accountType;
    if (grouped[type]) {
      grouped[type].push(account);
    }
  });

  return grouped;
}

describe("AccountsPage - Account Grouping", () => {
  /**
   * Property 6: Account Grouping Consistency
   *
   * For any set of accounts, displaying them on the Accounts page SHALL group
   * them correctly by accountType, with each account appearing in exactly one group.
   *
   * **Validates: Requirements 2.6**
   */
  describe("Property 6: Account Grouping Consistency", () => {
    // Generate random accounts
    const accountArb = fc.record({
      accountId: fc.uuid(),
      accountType: fc.constantFrom(...ACCOUNT_TYPE_ORDER),
      nickname: fc.string({ minLength: 1, maxLength: 50 }),
    });

    const accountsArb = fc.array(accountArb, { minLength: 0, maxLength: 20 });

    it("should place each account in exactly one group", () => {
      fc.assert(
        fc.property(accountsArb, (accounts) => {
          const grouped = groupAccountsByType(accounts);

          // Count total accounts in all groups
          let totalInGroups = 0;
          ACCOUNT_TYPE_ORDER.forEach((type) => {
            totalInGroups += grouped[type].length;
          });

          // Should equal original count
          return totalInGroups === accounts.length;
        }),
        { numRuns: 100 },
      );
    });

    it("should group accounts by their accountType", () => {
      fc.assert(
        fc.property(accountsArb, (accounts) => {
          const grouped = groupAccountsByType(accounts);

          // Each account in a group should have the matching type
          for (const type of ACCOUNT_TYPE_ORDER) {
            for (const account of grouped[type]) {
              if (account.accountType !== type) {
                return false;
              }
            }
          }
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("should preserve all accounts (no duplicates, no missing)", () => {
      fc.assert(
        fc.property(accountsArb, (accounts) => {
          const grouped = groupAccountsByType(accounts);

          // Collect all account IDs from groups
          const groupedIds = new Set<string>();
          ACCOUNT_TYPE_ORDER.forEach((type) => {
            grouped[type].forEach((account) => {
              groupedIds.add(account.accountId);
            });
          });

          // Original account IDs
          const originalIds = new Set(accounts.map((a) => a.accountId));

          // Sets should be equal
          if (groupedIds.size !== originalIds.size) return false;

          for (const id of originalIds) {
            if (!groupedIds.has(id)) return false;
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("should create empty arrays for types with no accounts", () => {
      fc.assert(
        fc.property(accountsArb, (accounts) => {
          const grouped = groupAccountsByType(accounts);

          // All types should have an array (even if empty)
          for (const type of ACCOUNT_TYPE_ORDER) {
            if (!Array.isArray(grouped[type])) {
              return false;
            }
          }
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("should handle empty account list", () => {
      const grouped = groupAccountsByType([]);

      // All groups should be empty arrays
      for (const type of ACCOUNT_TYPE_ORDER) {
        expect(grouped[type]).toEqual([]);
      }
    });

    it("should handle accounts of single type", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ACCOUNT_TYPE_ORDER),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          (type, ids) => {
            const accounts = ids.map((id) => ({
              accountId: id,
              accountType: type,
              nickname: `Account ${id.slice(0, 8)}`,
            }));

            const grouped = groupAccountsByType(accounts);

            // Only the selected type should have accounts
            for (const t of ACCOUNT_TYPE_ORDER) {
              if (t === type) {
                if (grouped[t].length !== accounts.length) return false;
              } else {
                if (grouped[t].length !== 0) return false;
              }
            }
            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
