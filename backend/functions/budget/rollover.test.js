/**
 * BudgetBuddy Budget Rollover Feature Tests
 *
 * Tests for rollover budget functionality including:
 * - rolloverEnabled, rolloverAmount, rolloverCap fields
 * - Category normalization with rollover defaults
 * - Total rollover calculation
 *
 * Validates: Requirements 40.1, 40.2 (Competitive Features)
 */

// Enable manual mocks for Lambda layers
jest.mock("/opt/nodejs/utils");
jest.mock("/opt/nodejs/shared");

// Now require the handler after mocks are set up
const { handler } = require("./index");

describe("Budget Rollover Feature", () => {
  const mockContext = {
    awsRequestId: "test-request-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";

    // Reset shared mock
    const shared = require("/opt/nodejs/shared");
    shared.checkPermission.mockReturnValue(null);
  });

  describe("Rollover Fields in Budget Creation", () => {
    /**
     * **Validates: Requirement 40.1** - Enable rollover per category
     * **Validates: Requirement 40.2** - Rollover enabled/disabled per category
     */
    test("should accept rollover fields when creating budget with categories", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");
      dynamoHelpers.getItem.mockResolvedValue(null); // No existing budget
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [
              {
                id: "group_housing",
                name: "Housing",
                categories: [
                  {
                    id: "cat_rent",
                    name: "Rent",
                    plannedAmount: 1500,
                    rolloverEnabled: true,
                    rolloverAmount: 100,
                    rolloverCap: 500,
                  },
                  {
                    id: "cat_utilities",
                    name: "Utilities",
                    plannedAmount: 200,
                    rolloverEnabled: false,
                  },
                ],
              },
            ],
          },
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify putItem was called with rollover fields
      expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: expect.objectContaining({
            expenses: expect.arrayContaining([
              expect.objectContaining({
                categories: expect.arrayContaining([
                  expect.objectContaining({
                    id: "cat_rent",
                    rolloverEnabled: true,
                    rolloverAmount: 100,
                    rolloverCap: 500,
                  }),
                  expect.objectContaining({
                    id: "cat_utilities",
                    rolloverEnabled: false,
                    rolloverAmount: 0,
                  }),
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    /**
     * **Validates: Requirement 40.2** - Default rollover values
     */
    test("should set default rollover values for categories without rollover fields", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");
      dynamoHelpers.getItem.mockResolvedValue(null);
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [
              {
                id: "group_food",
                name: "Food",
                categories: [
                  {
                    id: "cat_groceries",
                    name: "Groceries",
                    plannedAmount: 500,
                    // No rollover fields provided
                  },
                ],
              },
            ],
          },
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify default rollover values are set
      expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: expect.objectContaining({
            expenses: expect.arrayContaining([
              expect.objectContaining({
                categories: expect.arrayContaining([
                  expect.objectContaining({
                    id: "cat_groceries",
                    rolloverEnabled: false,
                    rolloverAmount: 0,
                  }),
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    /**
     * **Validates: Requirement 40.9** - Total rollover across categories
     */
    test("should calculate totalRollover in budget response", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");
      dynamoHelpers.getItem.mockResolvedValue(null);
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [
              {
                id: "group_savings",
                name: "Savings",
                categories: [
                  {
                    id: "cat_emergency",
                    name: "Emergency Fund",
                    plannedAmount: 500,
                    rolloverEnabled: true,
                    rolloverAmount: 200,
                  },
                ],
              },
            ],
            expenses: [
              {
                id: "group_food",
                name: "Food",
                categories: [
                  {
                    id: "cat_groceries",
                    name: "Groceries",
                    plannedAmount: 400,
                    rolloverEnabled: true,
                    rolloverAmount: 50,
                  },
                  {
                    id: "cat_dining",
                    name: "Dining Out",
                    plannedAmount: 100,
                    rolloverEnabled: true,
                    rolloverAmount: 25,
                  },
                ],
              },
            ],
          },
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Total rollover should be 200 + 50 + 25 = 275
      expect(body.data.totalRollover).toBe(275);
    });
  });

  describe("Rollover Fields in Budget Update", () => {
    /**
     * **Validates: Requirement 40.1, 40.2** - Update rollover settings
     */
    test("should update rollover fields when updating budget", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      // Existing budget without rollover
      const existingBudget = {
        budgetId: "budget_123",
        familyId: "family_123",
        month: "2026-02",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValue(existingBudget);
      dynamoHelpers.updateItem.mockImplementation((pk, sk, updates) => {
        return Promise.resolve({
          ...existingBudget,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      });

      const event = {
        httpMethod: "PUT",
        path: "/budget/budget_123",
        pathParameters: { budgetId: "budget_123" },
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [
              {
                id: "group_food",
                name: "Food",
                categories: [
                  {
                    id: "cat_groceries",
                    name: "Groceries",
                    plannedAmount: 500,
                    rolloverEnabled: true,
                    rolloverAmount: 75,
                    rolloverCap: 300,
                  },
                ],
              },
            ],
          },
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify updateItem was called with rollover fields
      expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
        "FAMILY#family_123",
        "BUDGET#2026-02",
        expect.objectContaining({
          groups: expect.objectContaining({
            expenses: expect.arrayContaining([
              expect.objectContaining({
                categories: expect.arrayContaining([
                  expect.objectContaining({
                    rolloverEnabled: true,
                    rolloverAmount: 75,
                    rolloverCap: 300,
                  }),
                ]),
              }),
            ]),
          }),
          totalRollover: 75,
        }),
      );
    });
  });

  describe("Rollover Fields in Budget Retrieval", () => {
    /**
     * **Validates: Requirement 40.3** - Display rollover amount separately
     */
    test("should include totalRollover in budget retrieval response", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      const mockBudget = {
        budgetId: "budget_123",
        familyId: "family_123",
        month: "2026-02",
        totalIncome: 5000,
        totalSavings: 500,
        totalExpenses: 2000,
        remainingBalance: 2500,
        totalRollover: 150,
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  rolloverEnabled: true,
                  rolloverAmount: 150,
                },
              ],
            },
          ],
        },
        isAIGenerated: false,
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      };

      dynamoHelpers.getItem.mockResolvedValue(mockBudget);

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: { month: "2026-02" },
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      expect(body.data.totalRollover).toBe(150);
      expect(body.data.groups.expenses[0].categories[0].rolloverEnabled).toBe(
        true,
      );
      expect(body.data.groups.expenses[0].categories[0].rolloverAmount).toBe(
        150,
      );
    });

    /**
     * **Validates: Requirement 40.9** - Calculate totalRollover for legacy budgets
     */
    test("should calculate totalRollover for budgets without stored totalRollover", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      // Legacy budget without totalRollover field
      const mockBudget = {
        budgetId: "budget_123",
        familyId: "family_123",
        month: "2026-02",
        totalIncome: 5000,
        totalSavings: 500,
        totalExpenses: 2000,
        remainingBalance: 2500,
        // No totalRollover field
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  rolloverEnabled: true,
                  rolloverAmount: 100,
                },
                {
                  id: "cat_dining",
                  name: "Dining",
                  plannedAmount: 200,
                  rolloverEnabled: true,
                  rolloverAmount: 50,
                },
              ],
            },
          ],
        },
        isAIGenerated: false,
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      };

      dynamoHelpers.getItem.mockResolvedValue(mockBudget);

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: { month: "2026-02" },
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Should calculate totalRollover from categories: 100 + 50 = 150
      expect(body.data.totalRollover).toBe(150);
    });
  });

  describe("Rollover Cap Handling", () => {
    /**
     * **Validates: Requirement 40.8** - Rollover cap support
     */
    test("should preserve rolloverCap when set", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");
      dynamoHelpers.getItem.mockResolvedValue(null);
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [
              {
                id: "group_food",
                name: "Food",
                categories: [
                  {
                    id: "cat_groceries",
                    name: "Groceries",
                    plannedAmount: 500,
                    rolloverEnabled: true,
                    rolloverAmount: 100,
                    rolloverCap: 250,
                  },
                ],
              },
            ],
          },
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify rolloverCap is preserved
      expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: expect.objectContaining({
            expenses: expect.arrayContaining([
              expect.objectContaining({
                categories: expect.arrayContaining([
                  expect.objectContaining({
                    rolloverCap: 250,
                  }),
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    /**
     * **Validates: Requirement 40.8** - Optional rolloverCap
     */
    test("should not include rolloverCap when not set", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");
      dynamoHelpers.getItem.mockResolvedValue(null);

      let savedBudget = null;
      dynamoHelpers.putItem.mockImplementation((item) => {
        savedBudget = item;
        return Promise.resolve({});
      });

      const event = {
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [
              {
                id: "group_food",
                name: "Food",
                categories: [
                  {
                    id: "cat_groceries",
                    name: "Groceries",
                    plannedAmount: 500,
                    rolloverEnabled: true,
                    rolloverAmount: 100,
                    // No rolloverCap
                  },
                ],
              },
            ],
          },
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify rolloverCap is not present when not set
      const category = savedBudget.groups.expenses[0].categories[0];
      expect(category.rolloverEnabled).toBe(true);
      expect(category.rolloverAmount).toBe(100);
      expect(category).not.toHaveProperty("rolloverCap");
    });
  });

  describe("Rollover in Month Transition", () => {
    /**
     * **Validates: Requirement 40.4** - Calculate rollover: rollover + (planned - spent)
     * **Validates: Requirement 40.5** - Handle overspent categories (negative rollover)
     */
    test("should calculate rollover correctly when creating budget from previous month", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      // No current month budget
      dynamoHelpers.getItem.mockResolvedValueOnce(null);

      // Previous month budget with rollover settings
      // Rollover calculation: newRollover = previousRollover + (planned - spent)
      // = 50 + (500 - 450) = 50 + 50 = 100
      const previousBudget = {
        budgetId: "budget_prev",
        familyId: "family_123",
        month: "2026-01",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  spentAmount: 450,
                  rolloverEnabled: true,
                  rolloverAmount: 50,
                  rolloverCap: 200,
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValueOnce(previousBudget);

      let savedBudget = null;
      dynamoHelpers.putItem.mockImplementation((item) => {
        savedBudget = item;
        return Promise.resolve({});
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: { month: "2026-02" },
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify rollover is calculated correctly
      // newRollover = 50 + (500 - 450) = 100
      const newCategory = savedBudget.groups.expenses[0].categories[0];
      expect(newCategory.rolloverEnabled).toBe(true);
      expect(newCategory.rolloverAmount).toBe(100); // Calculated rollover
      expect(newCategory.rolloverCap).toBe(200);
      expect(newCategory.spentAmount).toBe(0); // Reset for new month
    });

    /**
     * **Validates: Requirement 40.5** - Overspent categories have negative rollover
     */
    test("should handle overspent categories with negative rollover", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      // No current month budget
      dynamoHelpers.getItem.mockResolvedValueOnce(null);

      // Previous month budget - overspent category
      // Rollover calculation: newRollover = 0 + (500 - 600) = -100
      const previousBudget = {
        budgetId: "budget_prev",
        familyId: "family_123",
        month: "2026-01",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  spentAmount: 600, // Overspent by 100
                  rolloverEnabled: true,
                  rolloverAmount: 0,
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValueOnce(previousBudget);

      let savedBudget = null;
      dynamoHelpers.putItem.mockImplementation((item) => {
        savedBudget = item;
        return Promise.resolve({});
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: { month: "2026-02" },
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify negative rollover for overspent category
      // newRollover = 0 + (500 - 600) = -100
      const newCategory = savedBudget.groups.expenses[0].categories[0];
      expect(newCategory.rolloverEnabled).toBe(true);
      expect(newCategory.rolloverAmount).toBe(-100); // Negative rollover (debt)
      expect(newCategory.spentAmount).toBe(0);
    });

    /**
     * **Validates: Requirement 40.8** - Rollover respects cap
     */
    test("should cap rollover at rolloverCap when set", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      // No current month budget
      dynamoHelpers.getItem.mockResolvedValueOnce(null);

      // Previous month budget - would exceed cap
      // Rollover calculation: newRollover = 150 + (500 - 200) = 450
      // But cap is 200, so should be capped at 200
      const previousBudget = {
        budgetId: "budget_prev",
        familyId: "family_123",
        month: "2026-01",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  spentAmount: 200, // Underspent by 300
                  rolloverEnabled: true,
                  rolloverAmount: 150,
                  rolloverCap: 200, // Cap at 200
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValueOnce(previousBudget);

      let savedBudget = null;
      dynamoHelpers.putItem.mockImplementation((item) => {
        savedBudget = item;
        return Promise.resolve({});
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: { month: "2026-02" },
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify rollover is capped
      // Uncapped would be: 150 + (500 - 200) = 450
      // But cap is 200, so should be 200
      const newCategory = savedBudget.groups.expenses[0].categories[0];
      expect(newCategory.rolloverEnabled).toBe(true);
      expect(newCategory.rolloverAmount).toBe(200); // Capped at 200
      expect(newCategory.rolloverCap).toBe(200);
    });

    /**
     * **Validates: Requirement 40.2** - Rollover disabled returns 0
     */
    test("should return 0 rollover when rolloverEnabled is false", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      // No current month budget
      dynamoHelpers.getItem.mockResolvedValueOnce(null);

      // Previous month budget - rollover disabled
      const previousBudget = {
        budgetId: "budget_prev",
        familyId: "family_123",
        month: "2026-01",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  spentAmount: 300, // Underspent by 200
                  rolloverEnabled: false, // Disabled
                  rolloverAmount: 100, // Should be ignored
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValueOnce(previousBudget);

      let savedBudget = null;
      dynamoHelpers.putItem.mockImplementation((item) => {
        savedBudget = item;
        return Promise.resolve({});
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: { month: "2026-02" },
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify rollover is 0 when disabled
      const newCategory = savedBudget.groups.expenses[0].categories[0];
      expect(newCategory.rolloverEnabled).toBe(false);
      expect(newCategory.rolloverAmount).toBe(0); // No rollover when disabled
    });

    /**
     * **Validates: Requirement 40.10** - Year-end rollover (December to January)
     */
    test("should handle year-end rollover correctly (December to January)", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      // No current month budget (January 2027)
      dynamoHelpers.getItem.mockResolvedValueOnce(null);

      // Previous month budget (December 2026)
      const previousBudget = {
        budgetId: "budget_prev",
        familyId: "family_123",
        month: "2026-12",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  spentAmount: 400,
                  rolloverEnabled: true,
                  rolloverAmount: 75,
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValueOnce(previousBudget);

      let savedBudget = null;
      dynamoHelpers.putItem.mockImplementation((item) => {
        savedBudget = item;
        return Promise.resolve({});
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: { month: "2027-01" },
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify year-end rollover works correctly
      // newRollover = 75 + (500 - 400) = 175
      const newCategory = savedBudget.groups.expenses[0].categories[0];
      expect(newCategory.rolloverEnabled).toBe(true);
      expect(newCategory.rolloverAmount).toBe(175);
      expect(savedBudget.month).toBe("2027-01");
    });
  });
});

describe("Rollover API Endpoints", () => {
  const mockContext = {
    awsRequestId: "test-request-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";

    // Reset shared mock
    const shared = require("/opt/nodejs/shared");
    shared.checkPermission.mockReturnValue(null);
  });

  describe("PUT /budget/categories/{categoryId}/rollover", () => {
    /**
     * **Validates: Requirement 40.7** - Enable rollover for a category
     */
    test("should enable rollover for a category", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      const existingBudget = {
        budgetId: "budget_123",
        familyId: "family_123",
        month: "2026-02",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  rolloverEnabled: false,
                  rolloverAmount: 0,
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValue(existingBudget);
      dynamoHelpers.updateItem.mockImplementation((pk, sk, updates) => {
        return Promise.resolve({
          ...existingBudget,
          ...updates,
          totalRollover: 0,
        });
      });

      const event = {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover",
        body: JSON.stringify({
          month: "2026-02",
          groupType: "expenses",
          rolloverEnabled: true,
          rolloverCap: 200,
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.categoryId).toBe("cat_groceries");
      expect(body.data.rolloverEnabled).toBe(true);
      expect(body.data.rolloverCap).toBe(200);

      // Verify updateItem was called with correct data
      expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
        "FAMILY#family_123",
        "BUDGET#2026-02",
        expect.objectContaining({
          groups: expect.objectContaining({
            expenses: expect.arrayContaining([
              expect.objectContaining({
                categories: expect.arrayContaining([
                  expect.objectContaining({
                    id: "cat_groceries",
                    rolloverEnabled: true,
                    rolloverCap: 200,
                  }),
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    /**
     * **Validates: Requirement 40.7** - Disable rollover for a category
     */
    test("should disable rollover and reset amount to 0", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      const existingBudget = {
        budgetId: "budget_123",
        familyId: "family_123",
        month: "2026-02",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  rolloverEnabled: true,
                  rolloverAmount: 150,
                  rolloverCap: 200,
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValue(existingBudget);

      let savedUpdates = null;
      dynamoHelpers.updateItem.mockImplementation((pk, sk, updates) => {
        savedUpdates = updates;
        return Promise.resolve({
          ...existingBudget,
          ...updates,
          totalRollover: 0,
        });
      });

      const event = {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover",
        body: JSON.stringify({
          month: "2026-02",
          groupType: "expenses",
          rolloverEnabled: false,
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify rolloverAmount is reset to 0 when disabled
      const updatedCategory = savedUpdates.groups.expenses[0].categories[0];
      expect(updatedCategory.rolloverEnabled).toBe(false);
      expect(updatedCategory.rolloverAmount).toBe(0);
      expect(updatedCategory).not.toHaveProperty("rolloverCap");
    });

    test("should return 400 for missing month", async () => {
      const {
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      const event = {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover",
        body: JSON.stringify({
          groupType: "expenses",
          rolloverEnabled: true,
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("Month is required");
    });

    test("should return 400 for invalid groupType", async () => {
      const {
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      const event = {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover",
        body: JSON.stringify({
          month: "2026-02",
          groupType: "invalid",
          rolloverEnabled: true,
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("groupType must be one of");
    });

    test("should return 404 for non-existent category", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      const existingBudget = {
        budgetId: "budget_123",
        familyId: "family_123",
        month: "2026-02",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValue(existingBudget);

      const event = {
        httpMethod: "PUT",
        path: "/budget/categories/non_existent_cat/rollover",
        body: JSON.stringify({
          month: "2026-02",
          groupType: "expenses",
          rolloverEnabled: true,
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("not found");
    });
  });

  describe("PUT /budget/categories/{categoryId}/rollover/reset", () => {
    /**
     * **Validates: Requirement 40.7** - Reset rollover to 0
     */
    test("should reset rollover amount to 0", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      const existingBudget = {
        budgetId: "budget_123",
        familyId: "family_123",
        month: "2026-02",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "group_food",
              name: "Food",
              categories: [
                {
                  id: "cat_groceries",
                  name: "Groceries",
                  plannedAmount: 500,
                  rolloverEnabled: true,
                  rolloverAmount: 175,
                },
              ],
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValue(existingBudget);

      let savedUpdates = null;
      dynamoHelpers.updateItem.mockImplementation((pk, sk, updates) => {
        savedUpdates = updates;
        return Promise.resolve({
          ...existingBudget,
          ...updates,
          totalRollover: 0,
        });
      });

      const event = {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover/reset",
        body: JSON.stringify({
          month: "2026-02",
          groupType: "expenses",
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.categoryId).toBe("cat_groceries");
      expect(body.data.previousRollover).toBe(175);
      expect(body.data.newRollover).toBe(0);

      // Verify rolloverAmount is reset to 0
      const updatedCategory = savedUpdates.groups.expenses[0].categories[0];
      expect(updatedCategory.rolloverAmount).toBe(0);
      // rolloverEnabled should remain unchanged
      expect(updatedCategory.rolloverEnabled).toBe(true);
    });

    test("should return 400 for missing groupType", async () => {
      const {
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");

      const event = {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover/reset",
        body: JSON.stringify({
          month: "2026-02",
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("groupType is required");
    });

    test("should return 404 for non-existent budget", async () => {
      const {
        dynamoHelpers,
        getUserFromEvent,
        FamilyIdResolver,
      } = require("/opt/nodejs/utils");

      getUserFromEvent.mockReturnValue({
        userId: "user_123",
        familyId: "family_123",
        familyRole: "primary",
      });

      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family_123");
      dynamoHelpers.getItem.mockResolvedValue(null);

      const event = {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover/reset",
        body: JSON.stringify({
          month: "2026-02",
          groupType: "expenses",
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123",
              email: "test@example.com",
            },
          },
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("Budget not found");
    });
  });
});
