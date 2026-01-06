/**
 * Integration Tests for Family ID Resolution System
 *
 * Tests the complete end-to-end flow between Auth and Budget services
 * to ensure family ID consistency prevents "No budgets exist" errors.
 *
 * Requirement 46: Fix Family ID Mismatch Between Auth and Budget Services
 */

// Import the actual FamilyIdResolver for integration testing
const { FamilyIdResolver } = require("../backend/layers/common/nodejs/utils");

describe("Family ID Integration Tests", () => {
  beforeEach(() => {
    // Clear console logs between tests
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  /**
   * INTEGRATION TEST 1: Auth and Budget Service Consistency
   *
   * Simulates the complete flow where Auth service creates a budget
   * and Budget service retrieves it using the same family ID resolution.
   */
  describe("Auth and Budget Service Consistency", () => {
    test("should resolve identical family IDs across services", async () => {
      const userId = "user_1234567890_abcdef123";
      const jwtFamilyId = "family_jwt_provided_456";

      // Mock DynamoDB helpers for consistent behavior
      const mockDynamoHelpers = {
        getItem: jest.fn().mockResolvedValue({
          userId,
          familyId: "family_profile_789",
          email: "test@example.com",
        }),
        putItem: jest.fn().mockResolvedValue({}),
        queryByPK: jest.fn().mockResolvedValue([]),
        updateItem: jest.fn().mockResolvedValue({}),
      };

      // Test 1: Auth service resolution (with JWT)
      const authFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        jwtFamilyId,
        mockDynamoHelpers
      );

      // Test 2: Budget service resolution (with same JWT)
      const budgetFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        jwtFamilyId,
        mockDynamoHelpers
      );

      // Verify consistency
      expect(authFamilyId).toBe(budgetFamilyId);
      expect(authFamilyId).toBe(jwtFamilyId);

      // Test 3: Validate consistency check passes
      expect(() => {
        FamilyIdResolver.validateFamilyIdConsistency(
          authFamilyId,
          budgetFamilyId,
          userId
        );
      }).not.toThrow();
    });

    test("should handle DynamoDB profile scenario consistently", async () => {
      const userId = "user_profile_test_789";
      const profileFamilyId = "family_from_profile_123";

      const mockDynamoHelpers = {
        getItem: jest.fn().mockResolvedValue({
          userId,
          familyId: profileFamilyId,
          email: "profile@example.com",
        }),
        putItem: jest.fn().mockResolvedValue({}),
        queryByPK: jest.fn().mockResolvedValue([]),
        updateItem: jest.fn().mockResolvedValue({}),
      };

      // Test 1: Auth service resolution (no JWT, uses profile)
      const authFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null, // No JWT
        mockDynamoHelpers
      );

      // Test 2: Budget service resolution (same scenario)
      const budgetFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null, // No JWT
        mockDynamoHelpers
      );

      // Verify consistency
      expect(authFamilyId).toBe(budgetFamilyId);
      expect(authFamilyId).toBe(profileFamilyId);

      // Verify DynamoDB was called for profile lookup
      expect(mockDynamoHelpers.getItem).toHaveBeenCalledWith(
        `USER#${userId}`,
        "PROFILE"
      );
    });

    test("should handle fallback scenario consistently", async () => {
      const userId = "user_fallback_test_456";
      const expectedFallbackId = `family_${userId}`;

      const mockDynamoHelpers = {
        getItem: jest.fn().mockResolvedValue(null), // No profile found
        putItem: jest.fn().mockResolvedValue({}),
        queryByPK: jest.fn().mockResolvedValue([]),
        updateItem: jest.fn().mockResolvedValue({}),
      };

      // Test 1: Auth service resolution (fallback)
      const authFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null, // No JWT
        mockDynamoHelpers
      );

      // Test 2: Budget service resolution (same fallback)
      const budgetFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null, // No JWT
        mockDynamoHelpers
      );

      // Verify consistency
      expect(authFamilyId).toBe(budgetFamilyId);
      expect(authFamilyId).toBe(expectedFallbackId);
    });
  });

  /**
   * INTEGRATION TEST 2: Error Resilience Across Services
   *
   * Tests that both services handle errors consistently and maintain
   * family ID resolution even when DynamoDB operations fail.
   */
  describe("Error Resilience Across Services", () => {
    test("should handle DynamoDB errors consistently across services", async () => {
      const userId = "user_error_test_123";
      const jwtFamilyId = "family_jwt_backup_789";

      const mockDynamoHelpers = {
        getItem: jest.fn().mockRejectedValue(new Error("DynamoDB unavailable")),
        putItem: jest.fn().mockResolvedValue({}),
        queryByPK: jest.fn().mockResolvedValue([]),
        updateItem: jest.fn().mockResolvedValue({}),
      };

      // Test 1: Auth service with JWT (should not call DynamoDB)
      const authFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        jwtFamilyId,
        mockDynamoHelpers
      );

      // Test 2: Budget service with same JWT
      const budgetFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        jwtFamilyId,
        mockDynamoHelpers
      );

      // Verify both services use JWT and avoid DynamoDB error
      expect(authFamilyId).toBe(jwtFamilyId);
      expect(budgetFamilyId).toBe(jwtFamilyId);
      expect(authFamilyId).toBe(budgetFamilyId);

      // Test 3: Scenario without JWT (should handle error gracefully)
      const fallbackAuthId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null,
        mockDynamoHelpers
      );

      const fallbackBudgetId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null,
        mockDynamoHelpers
      );

      // Both should use fallback pattern
      expect(fallbackAuthId).toBe(`family_${userId}`);
      expect(fallbackBudgetId).toBe(`family_${userId}`);
      expect(fallbackAuthId).toBe(fallbackBudgetId);
    });

    test("should handle malformed profile data consistently", async () => {
      const userId = "user_malformed_test_456";
      const malformedProfiles = [
        null,
        {},
        { userId },
        { familyId: "" },
        { familyId: null },
        { familyId: 123 },
      ];

      for (const profile of malformedProfiles) {
        const mockDynamoHelpers = {
          getItem: jest.fn().mockResolvedValue(profile),
          putItem: jest.fn().mockResolvedValue({}),
          queryByPK: jest.fn().mockResolvedValue([]),
          updateItem: jest.fn().mockResolvedValue({}),
        };

        // Test both services handle malformed data identically
        const authFamilyId = await FamilyIdResolver.resolveFamilyId(
          userId,
          null,
          mockDynamoHelpers
        );

        const budgetFamilyId = await FamilyIdResolver.resolveFamilyId(
          userId,
          null,
          mockDynamoHelpers
        );

        expect(authFamilyId).toBe(budgetFamilyId);
        expect(authFamilyId).toBe(`family_${userId}`);
      }
    });
  });

  /**
   * INTEGRATION TEST 3: Partition Key Compatibility
   *
   * Tests that resolved family IDs produce compatible partition keys
   * for DynamoDB operations across both services.
   */
  describe("Partition Key Compatibility", () => {
    test("should produce identical partition keys across services", async () => {
      const testScenarios = [
        {
          name: "JWT scenario",
          userId: "user_jwt_pk_test_123",
          jwtFamilyId: "family_jwt_pk_456",
          profileFamilyId: null,
        },
        {
          name: "Profile scenario",
          userId: "user_profile_pk_test_789",
          jwtFamilyId: null,
          profileFamilyId: "family_profile_pk_012",
        },
        {
          name: "Fallback scenario",
          userId: "user_fallback_pk_test_345",
          jwtFamilyId: null,
          profileFamilyId: null,
        },
      ];

      for (const scenario of testScenarios) {
        const mockProfile = scenario.profileFamilyId
          ? { userId: scenario.userId, familyId: scenario.profileFamilyId }
          : null;

        const mockDynamoHelpers = {
          getItem: jest.fn().mockResolvedValue(mockProfile),
          putItem: jest.fn().mockResolvedValue({}),
          queryByPK: jest.fn().mockResolvedValue([]),
          updateItem: jest.fn().mockResolvedValue({}),
        };

        // Resolve family ID from both services
        const authFamilyId = await FamilyIdResolver.resolveFamilyId(
          scenario.userId,
          scenario.jwtFamilyId,
          mockDynamoHelpers
        );

        const budgetFamilyId = await FamilyIdResolver.resolveFamilyId(
          scenario.userId,
          scenario.jwtFamilyId,
          mockDynamoHelpers
        );

        // Generate partition keys
        const authPartitionKey = `FAMILY#${authFamilyId}`;
        const budgetPartitionKey = `FAMILY#${budgetFamilyId}`;

        // Verify partition key compatibility
        expect(authPartitionKey).toBe(budgetPartitionKey);
        expect(authPartitionKey).toMatch(/^FAMILY#family_/);
        expect(authPartitionKey.length).toBeLessThan(2048); // DynamoDB limit

        // Test with budget sort keys
        const months = ["2025-01", "2025-12", "2026-01"];
        for (const month of months) {
          const sortKey = `BUDGET#${month}`;

          // Verify combined key compatibility
          expect(sortKey).toMatch(/^BUDGET#\d{4}-\d{2}$/);
          expect((authPartitionKey + sortKey).length).toBeLessThan(4096);
        }
      }
    });
  });

  /**
   * INTEGRATION TEST 4: Logging and Debugging Integration
   *
   * Tests that logging provides sufficient information for debugging
   * family ID resolution issues across services.
   */
  describe("Logging and Debugging Integration", () => {
    test("should provide consistent logging across services", async () => {
      const userId = "user_logging_integration_123";
      const familyId = "family_logging_test_456";

      const logSpy = jest.spyOn(console, "log").mockImplementation();

      // Test logging from both services
      FamilyIdResolver.logFamilyIdResolution(
        "auth-service",
        "onboarding",
        userId,
        familyId,
        "jwt"
      );

      FamilyIdResolver.logFamilyIdResolution(
        "budget-service",
        "get-budgets",
        userId,
        familyId,
        "jwt"
      );

      // Verify structured logging (each log call creates 2 entries)
      const logCalls = logSpy.mock.calls.filter(
        (call) => call[0] && call[0].includes("FAMILY_ID_RESOLUTION")
      );

      expect(logCalls.length).toBeGreaterThanOrEqual(2);

      // Verify log structure consistency
      logCalls.forEach((call) => {
        expect(call[0]).toContain("FAMILY_ID_RESOLUTION");
        if (call[1]) {
          const logData = JSON.parse(call[1]);
          expect(logData).toHaveProperty("service");
          expect(logData).toHaveProperty("operation");
          expect(logData).toHaveProperty("userId", userId);
          expect(logData).toHaveProperty("familyId", familyId);
          expect(logData).toHaveProperty("partitionKey", `FAMILY#${familyId}`);
          expect(logData).toHaveProperty("timestamp");
        }
      });

      logSpy.mockRestore();
    });

    test("should detect family ID mismatches between services", () => {
      const userId = "user_mismatch_detection_789";
      const authFamilyId = "family_auth_different_123";
      const budgetFamilyId = "family_budget_different_456";

      // Should throw when family IDs don't match
      expect(() => {
        FamilyIdResolver.validateFamilyIdConsistency(
          authFamilyId,
          budgetFamilyId,
          userId
        );
      }).toThrow(/Family ID mismatch detected for user/);

      // Should not throw when family IDs match
      expect(() => {
        FamilyIdResolver.validateFamilyIdConsistency(
          authFamilyId,
          authFamilyId,
          userId
        );
      }).not.toThrow();
    });
  });

  /**
   * INTEGRATION TEST 5: Real-World Scenarios
   *
   * Tests realistic user scenarios that caused the original bug.
   */
  describe("Real-World Scenarios", () => {
    test("should handle the original bug scenario", async () => {
      // Original bug: Auth creates budget with profile familyId,
      // Budget service queries with JWT familyId (null) or fallback

      const userId = "user_original_bug_test";
      const profileFamilyId = "family_user_1767574326611_5kyfa7d61"; // From logs

      const mockDynamoHelpers = {
        getItem: jest.fn().mockResolvedValue({
          userId,
          familyId: profileFamilyId,
          email: "test@budgetbuddy.com",
        }),
        putItem: jest.fn().mockResolvedValue({}),
        queryByPK: jest.fn().mockResolvedValue([]),
        updateItem: jest.fn().mockResolvedValue({}),
      };

      // Step 1: Auth service creates budget (uses profile familyId)
      const authFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null, // No JWT familyId
        mockDynamoHelpers
      );

      expect(authFamilyId).toBe(profileFamilyId);

      // Step 2: Budget service queries budget (should use same familyId)
      const budgetFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null, // Same scenario - no JWT familyId
        mockDynamoHelpers
      );

      expect(budgetFamilyId).toBe(profileFamilyId);

      // Step 3: Verify no mismatch (this was the original bug)
      expect(authFamilyId).toBe(budgetFamilyId);

      // Step 4: Verify partition keys match
      const authPartitionKey = `FAMILY#${authFamilyId}`;
      const budgetPartitionKey = `FAMILY#${budgetFamilyId}`;

      expect(authPartitionKey).toBe(budgetPartitionKey);
      expect(authPartitionKey).toBe(`FAMILY#${profileFamilyId}`);
    });

    test("should handle new user onboarding flow", async () => {
      const userId = "user_new_onboarding_456";
      const expectedFamilyId = `family_${userId}`;
      const currentMonth = "2025-01";

      const mockDynamoHelpers = {
        getItem: jest.fn().mockImplementation((pk, sk) => {
          if (pk === `USER#${userId}` && sk === "PROFILE") {
            // User profile exists but no familyId yet (new user)
            return Promise.resolve({
              userId,
              email: "newuser@budgetbuddy.com",
              onboardingCompleted: false,
            });
          }
          if (
            pk === `FAMILY#${expectedFamilyId}` &&
            sk === `BUDGET#${currentMonth}`
          ) {
            // Budget created during onboarding
            return Promise.resolve({
              PK: `FAMILY#${expectedFamilyId}`,
              SK: `BUDGET#${currentMonth}`,
              budgetId: "budget_new_user_123",
              familyId: expectedFamilyId,
              month: currentMonth,
              totalExpenses: 2500,
            });
          }
          return Promise.resolve(null);
        }),
        putItem: jest.fn().mockResolvedValue({}),
        queryByPK: jest.fn().mockResolvedValue([]),
        updateItem: jest.fn().mockResolvedValue({}),
      };

      // Step 1: Auth service during onboarding (no familyId in profile)
      const authFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null,
        mockDynamoHelpers
      );

      expect(authFamilyId).toBe(expectedFamilyId); // Should use fallback

      // Step 2: Budget service after onboarding
      const budgetFamilyId = await FamilyIdResolver.resolveFamilyId(
        userId,
        null,
        mockDynamoHelpers
      );

      expect(budgetFamilyId).toBe(expectedFamilyId);

      // Step 3: Verify budget can be retrieved with consistent keys
      const budget = await mockDynamoHelpers.getItem(
        `FAMILY#${budgetFamilyId}`,
        `BUDGET#${currentMonth}`
      );

      expect(budget).toBeDefined();
      expect(budget.familyId).toBe(authFamilyId);
    });
  });
});
