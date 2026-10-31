/**
 * Unit tests for Restore Service
 */

// The common layer mounts at /opt/nodejs only inside Lambda. Use the real
// layer (so getUserFromEvent is exercised as deployed) with dynamoHelpers
// replaced by mocks.
jest.mock(
  "/opt/nodejs/utils",
  () => {
    const actual = jest.requireActual("../../layers/common/nodejs/utils");
    return {
      ...actual,
      dynamoHelpers: { getItem: jest.fn(), putItem: jest.fn() },
    };
  },
  { virtual: true },
);

const { dynamoHelpers } = require("/opt/nodejs/utils");
const { handler } = require("./index");

/** Request that has passed the API Gateway Cognito authorizer */
const authorizedRequest = (body) => ({
  httpMethod: "POST",
  headers: {},
  requestContext: { authorizer: { claims: { sub: "user123" } } },
  body,
});

const mockProfile = () =>
  dynamoHelpers.getItem.mockResolvedValue({
    userId: "user123",
    familyId: "family123",
  });

describe("Restore Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.TABLE_NAME = "test-table";
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty("Access-Control-Allow-Origin");
    });
  });

  describe("Authentication", () => {
    it("should return 401 for missing authorization header", async () => {
      // No authorizer context at all: the request never passed Cognito
      const event = {
        httpMethod: "POST",
        headers: {},
        body: JSON.stringify({}),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toHaveProperty("error");
    });

    it("should return 401 for invalid token format", async () => {
      // Authorizer context present but carrying no claims
      const event = {
        httpMethod: "POST",
        headers: {
          Authorization: "InvalidToken",
        },
        requestContext: { authorizer: {} },
        body: JSON.stringify({}),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
    });
  });

  describe("Backup Data Validation", () => {
    beforeEach(() => {
      mockProfile();
    });

    it("should return 400 for invalid JSON", async () => {
      const response = await handler(authorizedRequest("invalid json"));

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe(
        "Invalid JSON in request body",
      );
    });

    it("should return 400 for missing version field", async () => {
      const response = await handler(
        authorizedRequest(
          JSON.stringify({
            data: {
              budgets: [],
              transactions: [],
            },
          }),
        ),
      );

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe("Invalid backup data");
      expect(JSON.parse(response.body).details).toContain(
        "Missing version field",
      );
    });

    it("should return 400 for missing budgets array", async () => {
      const response = await handler(
        authorizedRequest(
          JSON.stringify({
            version: "1.0.0",
            data: {
              transactions: [],
            },
          }),
        ),
      );

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).details).toContain(
        "Missing or invalid budgets array",
      );
    });

    it("should return 400 for budget missing month field", async () => {
      const response = await handler(
        authorizedRequest(
          JSON.stringify({
            version: "1.0.0",
            data: {
              budgets: [
                {
                  categories: [],
                },
              ],
              transactions: [],
            },
          }),
        ),
      );

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).details).toContain(
        "Budget 0: Missing month field",
      );
    });

    it("should return 400 for transaction missing required fields", async () => {
      const response = await handler(
        authorizedRequest(
          JSON.stringify({
            version: "1.0.0",
            data: {
              budgets: [],
              transactions: [
                {
                  // Missing date, category, amount, type
                },
              ],
            },
          }),
        ),
      );

      expect(response.statusCode).toBe(400);
      const details = JSON.parse(response.body).details;
      expect(details).toContain("Transaction 0: Missing date field");
      expect(details).toContain("Transaction 0: Missing category field");
      expect(details).toContain("Transaction 0: Missing amount field");
      expect(details).toContain("Transaction 0: Missing type field");
    });
  });

  // Restore writes the retired FAMILY# key layout, so the handler refuses valid
  // backups with 501 until the budget-key migration lands. These cases cover
  // that guard: valid input is accepted up to the write and nothing is written.
  describe("Data Restoration", () => {
    beforeEach(() => {
      mockProfile();
      dynamoHelpers.putItem.mockResolvedValue(undefined);
    });

    it("should refuse a valid backup with 501 and write nothing", async () => {
      const validBackup = {
        version: "1.0.0",
        data: {
          budgets: [
            {
              budgetId: "budget1",
              month: "2026-01",
              categories: [
                { name: "Groceries", plannedAmount: 500, type: "expense" },
              ],
              totalIncome: 5000,
              totalSavings: 1000,
              totalExpenses: 3000,
            },
          ],
          transactions: [
            {
              transactionId: "trans1",
              date: "2026-01-15",
              category: "Groceries",
              description: "Walmart",
              amount: 150,
              type: "expense",
              budgetMonth: "2026-01",
            },
          ],
        },
      };

      const response = await handler(authorizedRequest(JSON.stringify(validBackup)));

      expect(response.statusCode).toBe(501);
      expect(JSON.parse(response.body).error).toBe(
        "Restore is disabled pending the budget-key migration",
      );
      expect(dynamoHelpers.putItem).not.toHaveBeenCalled();
    });

    it("should refuse multiple budgets and transactions without writing any", async () => {
      const validBackup = {
        version: "1.0.0",
        data: {
          budgets: [
            {
              month: "2026-01",
              categories: [],
              totalIncome: 5000,
            },
            {
              month: "2026-02",
              categories: [],
              totalIncome: 5000,
            },
          ],
          transactions: [
            {
              date: "2026-01-15",
              category: "Groceries",
              amount: 150,
              type: "expense",
              budgetMonth: "2026-01",
            },
            {
              date: "2026-01-20",
              category: "Gas",
              amount: 50,
              type: "expense",
              budgetMonth: "2026-01",
            },
            {
              date: "2026-02-05",
              category: "Salary",
              amount: 5000,
              type: "income",
              budgetMonth: "2026-02",
            },
          ],
        },
      };

      const response = await handler(authorizedRequest(JSON.stringify(validBackup)));

      expect(response.statusCode).toBe(501);
      expect(dynamoHelpers.putItem).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockProfile();
    });

    it("should not reach DynamoDB writes even when put would fail", async () => {
      dynamoHelpers.putItem.mockRejectedValue(new Error("DynamoDB error"));

      const validBackup = {
        version: "1.0.0",
        data: {
          budgets: [
            {
              month: "2026-01",
              categories: [],
            },
          ],
          transactions: [],
        },
      };

      const response = await handler(authorizedRequest(JSON.stringify(validBackup)));

      expect(response.statusCode).toBe(501);
      expect(dynamoHelpers.putItem).not.toHaveBeenCalled();
    });

    it("should return 500 if user profile not found", async () => {
      dynamoHelpers.getItem.mockResolvedValue(null);

      const validBackup = {
        version: "1.0.0",
        data: {
          budgets: [],
          transactions: [],
        },
      };

      const response = await handler(authorizedRequest(JSON.stringify(validBackup)));

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).message).toContain(
        "User profile not found",
      );
    });
  });
});
