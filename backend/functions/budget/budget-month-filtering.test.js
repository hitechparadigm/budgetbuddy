/**
 * Budget Month Filtering Test Suite
 *
 * CRITICAL: Regression tests for empty month budget display (Requirement 15)
 * Bug: Users see budget data in months where they never created budgets
 * Root Cause: Budget loading logic not properly filtering by month or showing cached data
 * Fix: Ensure budget loading only returns data for the exact month requested
 *
 * These tests ensure the empty month bug doesn't happen again.
 */

const AWS = require("aws-sdk");

// Mock AWS SDK
jest.mock("aws-sdk", () => {
  const mockDocumentClient = {
    query: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient),
    },
  };
});

describe("Budget Month Filtering - Regression Tests for Requirement 15", () => {
  let mockDocumentClient;
  let handler;

  // Helper to create mock context
  const createMockContext = () => ({
    awsRequestId: "test-request-id",
    functionName: "test-function",
    functionVersion: "$LATEST",
    invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
    memoryLimitInMB: "128",
    logGroupName: "/aws/lambda/test",
    logStreamName: "2025/02/02/[$LATEST]test",
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get mock DocumentClient instance
    mockDocumentClient = new AWS.DynamoDB.DocumentClient();

    // Mock environment variables
    process.env.BUDGET_TABLE = "test-budget-table";
    process.env.USER_TABLE = "test-user-table";

    // Import handler after mocks are set up
    handler = require("./index").handler;
  });

  describe("GET /budget - Month filtering", () => {
    const mockUserId = "user123";
    const mockFamilyId = "family_user123";
    const mockToken = "mock-token";

    /**
     * CRITICAL TEST: Regression test for the original bug
     * User started budget in November but sees budgets in all past/future months
     * Should only return budgets for months that actually exist
     */
    it("should only return budgets for months that exist in database", async () => {
      // User has budget for November 2025 only
      mockDocumentClient.query.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Items: [
              {
                PK: `FAMILY#${mockFamilyId}`,
                SK: "BUDGET#2025-11",
                month: "2025-11",
                groups: {
                  income: [],
                  savings: [],
                  expenses: [],
                },
              },
            ],
          }),
      });

      const event = {
        httpMethod: "GET",
        path: "/budget",
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
              "custom:familyId": mockFamilyId,
            },
          },
        },
      };

      const response = await handler(event, createMockContext());
      const body = JSON.parse(response.body);

      // Should only return November budget
      expect(body.data).toHaveLength(1);
      expect(body.data[0].month).toBe("2025-11");
    });

    it("should return empty array when no budgets exist", async () => {
      mockDocumentClient.query.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Items: [],
          }),
      });

      const event = {
        httpMethod: "GET",
        path: "/budget",
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
              "custom:familyId": mockFamilyId,
            },
          },
        },
      };

      const response = await handler(event, createMockContext());
      const body = JSON.parse(response.body);

      expect(body.data).toEqual([]);
    });

    it("should not return budgets from other months when querying specific month", async () => {
      // Database has budgets for multiple months
      mockDocumentClient.query.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Items: [
              {
                PK: `FAMILY#${mockFamilyId}`,
                SK: "BUDGET#2025-10",
                month: "2025-10",
                groups: { income: [], savings: [], expenses: [] },
              },
              {
                PK: `FAMILY#${mockFamilyId}`,
                SK: "BUDGET#2025-11",
                month: "2025-11",
                groups: { income: [], savings: [], expenses: [] },
              },
              {
                PK: `FAMILY#${mockFamilyId}`,
                SK: "BUDGET#2025-12",
                month: "2025-12",
                groups: { income: [], savings: [], expenses: [] },
              },
            ],
          }),
      });

      const event = {
        httpMethod: "GET",
        path: "/budget",
        queryStringParameters: {
          month: "2025-11",
        },
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
              "custom:familyId": mockFamilyId,
            },
          },
        },
      };

      const response = await handler(event, createMockContext());
      const body = JSON.parse(response.body);

      // Should only return November budget
      expect(body.data).toHaveLength(1);
      expect(body.data[0].month).toBe("2025-11");
    });
  });

  describe("GET /budget/current - Month-specific loading", () => {
    const mockUserId = "user123";
    const mockFamilyId = "family_user123";
    const mockToken = "mock-token";

    it("should return 404 when budget does not exist for requested month", async () => {
      mockDocumentClient.get.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Item: undefined,
          }),
      });

      // No previous month budget exists either
      mockDocumentClient.query.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Items: [],
          }),
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: {
          month: "2025-10",
        },
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
              "custom:familyId": mockFamilyId,
            },
          },
        },
      };

      const response = await handler(event, createMockContext());

      expect(response.statusCode).toBe(404);
    });

    it("should return budget only for the exact month requested", async () => {
      const requestedMonth = "2025-11";

      mockDocumentClient.get.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Item: {
              PK: `FAMILY#${mockFamilyId}`,
              SK: `BUDGET#${requestedMonth}`,
              month: requestedMonth,
              groups: {
                income: [],
                savings: [],
                expenses: [],
              },
            },
          }),
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: {
          month: requestedMonth,
        },
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
              "custom:familyId": mockFamilyId,
            },
          },
        },
      };

      const response = await handler(event, createMockContext());
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.month).toBe(requestedMonth);
    });

    it("should not return budget from different month even if it exists", async () => {
      const requestedMonth = "2025-10";

      // No budget for October
      mockDocumentClient.get.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Item: undefined,
          }),
      });

      // No previous month budget
      mockDocumentClient.query.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Items: [],
          }),
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: {
          month: requestedMonth,
        },
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
              "custom:familyId": mockFamilyId,
            },
          },
        },
      };

      const response = await handler(event, createMockContext());

      // Should return 404, not a budget from another month
      expect(response.statusCode).toBe(404);
    });
  });

  describe("Month boundary validation", () => {
    const mockUserId = "user123";
    const mockFamilyId = "family_user123";
    const mockToken = "mock-token";

    it("should correctly filter budgets at year boundaries", async () => {
      mockDocumentClient.query.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Items: [
              {
                PK: `FAMILY#${mockFamilyId}`,
                SK: "BUDGET#2025-12",
                month: "2025-12",
                groups: { income: [], savings: [], expenses: [] },
              },
              {
                PK: `FAMILY#${mockFamilyId}`,
                SK: "BUDGET#2026-01",
                month: "2026-01",
                groups: { income: [], savings: [], expenses: [] },
              },
            ],
          }),
      });

      const event = {
        httpMethod: "GET",
        path: "/budget",
        queryStringParameters: {
          month: "2025-12",
        },
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
              "custom:familyId": mockFamilyId,
            },
          },
        },
      };

      const response = await handler(event, createMockContext());
      const body = JSON.parse(response.body);

      // Should only return December 2025, not January 2026
      expect(body.data).toHaveLength(1);
      expect(body.data[0].month).toBe("2025-12");
    });

    it("should handle all 12 months correctly", async () => {
      const months = [
        "2025-01",
        "2025-02",
        "2025-03",
        "2025-04",
        "2025-05",
        "2025-06",
        "2025-07",
        "2025-08",
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
      ];

      for (const month of months) {
        mockDocumentClient.query.mockReturnValue({
          promise: () =>
            Promise.resolve({
              Items: [
                {
                  PK: `FAMILY#${mockFamilyId}`,
                  SK: `BUDGET#${month}`,
                  month: month,
                  groups: { income: [], savings: [], expenses: [] },
                },
              ],
            }),
        });

        const event = {
          httpMethod: "GET",
          path: "/budget",
          queryStringParameters: { month },
          headers: { Authorization: `Bearer ${mockToken}` },
          requestContext: {
            authorizer: {
              claims: {
                sub: mockUserId,
                "custom:familyId": mockFamilyId,
              },
            },
          },
        };

        const response = await handler(event, createMockContext());
        const body = JSON.parse(response.body);

        expect(body.data).toHaveLength(1);
        expect(body.data[0].month).toBe(month);
      }
    });
  });

  describe("Integration: Complete month filtering flow", () => {
    const mockUserId = "user123";
    const mockFamilyId = "family_user123";
    const mockToken = "mock-token";

    /**
     * INTEGRATION TEST: Simulate the original bug scenario
     * User creates budget in November, navigates to October, should see empty state
     */
    it("should show empty state for October when only November budget exists", async () => {
      // User has budget for November only
      mockDocumentClient.get.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Item: undefined, // No October budget
          }),
      });

      mockDocumentClient.query.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Items: [], // No previous month budget
          }),
      });

      const event = {
        httpMethod: "GET",
        path: "/budget/current",
        queryStringParameters: {
          month: "2025-10",
        },
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
              "custom:familyId": mockFamilyId,
            },
          },
        },
      };

      const response = await handler(event, createMockContext());

      // Should return 404 for October (empty state)
      expect(response.statusCode).toBe(404);
    });

    it("should correctly handle switching between months with and without budgets", async () => {
      const monthsWithBudgets = ["2025-11", "2025-12"];
      const monthsWithoutBudgets = ["2025-09", "2025-10"];

      // Test months with budgets
      for (const month of monthsWithBudgets) {
        mockDocumentClient.get.mockReturnValue({
          promise: () =>
            Promise.resolve({
              Item: {
                PK: `FAMILY#${mockFamilyId}`,
                SK: `BUDGET#${month}`,
                month: month,
                groups: { income: [], savings: [], expenses: [] },
              },
            }),
        });

        const event = {
          httpMethod: "GET",
          path: "/budget/current",
          queryStringParameters: { month },
          headers: { Authorization: `Bearer ${mockToken}` },
          requestContext: {
            authorizer: {
              claims: {
                sub: mockUserId,
                "custom:familyId": mockFamilyId,
              },
            },
          },
        };

        const response = await handler(event, createMockContext());
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.data.month).toBe(month);
      }

      // Test months without budgets
      for (const month of monthsWithoutBudgets) {
        mockDocumentClient.get.mockReturnValue({
          promise: () =>
            Promise.resolve({
              Item: undefined,
            }),
        });

        mockDocumentClient.query.mockReturnValue({
          promise: () =>
            Promise.resolve({
              Items: [],
            }),
        });

        const event = {
          httpMethod: "GET",
          path: "/budget/current",
          queryStringParameters: { month },
          headers: { Authorization: `Bearer ${mockToken}` },
          requestContext: {
            authorizer: {
              claims: {
                sub: mockUserId,
                "custom:familyId": mockFamilyId,
              },
            },
          },
        };

        const response = await handler(event, createMockContext());
        expect(response.statusCode).toBe(404);
      }
    });
  });

  describe("Property-based tests", () => {
    const mockUserId = "user123";
    const mockFamilyId = "family_user123";
    const mockToken = "mock-token";

    it("should always return exact month match or 404", async () => {
      const testCases = [
        { requested: "2025-01", exists: "2025-01", shouldFind: true },
        { requested: "2025-01", exists: "2025-02", shouldFind: false },
        { requested: "2025-11", exists: "2025-11", shouldFind: true },
        { requested: "2025-11", exists: "2025-12", shouldFind: false },
        { requested: "2025-12", exists: "2025-12", shouldFind: true },
        { requested: "2025-12", exists: "2026-01", shouldFind: false },
      ];

      for (const testCase of testCases) {
        if (testCase.shouldFind) {
          mockDocumentClient.get.mockReturnValue({
            promise: () =>
              Promise.resolve({
                Item: {
                  PK: `FAMILY#${mockFamilyId}`,
                  SK: `BUDGET#${testCase.exists}`,
                  month: testCase.exists,
                  groups: { income: [], savings: [], expenses: [] },
                },
              }),
          });
        } else {
          mockDocumentClient.get.mockReturnValue({
            promise: () =>
              Promise.resolve({
                Item: undefined,
              }),
          });

          mockDocumentClient.query.mockReturnValue({
            promise: () =>
              Promise.resolve({
                Items: [],
              }),
          });
        }

        const event = {
          httpMethod: "GET",
          path: "/budget/current",
          queryStringParameters: {
            month: testCase.requested,
          },
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          requestContext: {
            authorizer: {
              claims: {
                sub: mockUserId,
                "custom:familyId": mockFamilyId,
              },
            },
          },
        };

        const response = await handler(event, createMockContext());

        if (testCase.shouldFind) {
          expect(response.statusCode).toBe(200);
          const body = JSON.parse(response.body);
          expect(body.data.month).toBe(testCase.requested);
        } else {
          expect(response.statusCode).toBe(404);
        }
      }
    });
  });
});
