/**
 * Unit tests for Restore Service
 */

const { handler } = require("./index");

// Mock AWS SDK
jest.mock("aws-sdk", () => {
  const mockDocumentClient = {
    get: jest.fn(),
    put: jest.fn(),
  };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        get: (params) => ({
          promise: () => mockDocumentClient.get(params),
        }),
        put: (params) => ({
          promise: () => mockDocumentClient.put(params),
        }),
      })),
    },
    __mockDocumentClient: mockDocumentClient,
  };
});

const AWS = require("aws-sdk");
const mockDocumentClient = AWS.__mockDocumentClient;

describe("Restore Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
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
      const event = {
        httpMethod: "POST",
        headers: {
          Authorization: "InvalidToken",
        },
        body: JSON.stringify({}),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
    });
  });

  describe("Backup Data Validation", () => {
    beforeEach(() => {
      // Mock user profile lookup
      mockDocumentClient.get.mockResolvedValue({
        Item: {
          userId: "user123",
          familyId: "family123",
        },
      });
    });

    it("should return 400 for invalid JSON", async () => {
      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: "invalid json",
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe(
        "Invalid JSON in request body",
      );
    });

    it("should return 400 for missing version field", async () => {
      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: JSON.stringify({
          data: {
            budgets: [],
            transactions: [],
          },
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe("Invalid backup data");
      expect(JSON.parse(response.body).details).toContain(
        "Missing version field",
      );
    });

    it("should return 400 for missing budgets array", async () => {
      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: JSON.stringify({
          version: "1.0.0",
          data: {
            transactions: [],
          },
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).details).toContain(
        "Missing or invalid budgets array",
      );
    });

    it("should return 400 for budget missing month field", async () => {
      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: JSON.stringify({
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
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).details).toContain(
        "Budget 0: Missing month field",
      );
    });

    it("should return 400 for transaction missing required fields", async () => {
      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: JSON.stringify({
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
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const details = JSON.parse(response.body).details;
      expect(details).toContain("Transaction 0: Missing date field");
      expect(details).toContain("Transaction 0: Missing category field");
      expect(details).toContain("Transaction 0: Missing amount field");
      expect(details).toContain("Transaction 0: Missing type field");
    });
  });

  describe("Data Restoration", () => {
    beforeEach(() => {
      // Mock user profile lookup
      mockDocumentClient.get.mockResolvedValue({
        Item: {
          userId: "user123",
          familyId: "family123",
        },
      });

      // Mock successful put operations
      mockDocumentClient.put.mockResolvedValue({});
    });

    it("should successfully restore valid backup data", async () => {
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

      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: JSON.stringify(validBackup),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.restored.budgets).toBe(1);
      expect(body.restored.transactions).toBe(1);

      // Verify DynamoDB put was called for budgets and transactions
      expect(mockDocumentClient.put).toHaveBeenCalledTimes(2);
    });

    it("should restore multiple budgets and transactions", async () => {
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

      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: JSON.stringify(validBackup),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.restored.budgets).toBe(2);
      expect(body.restored.transactions).toBe(3);

      // Verify DynamoDB put was called for all items
      expect(mockDocumentClient.put).toHaveBeenCalledTimes(5);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      // Mock user profile lookup
      mockDocumentClient.get.mockResolvedValue({
        Item: {
          userId: "user123",
          familyId: "family123",
        },
      });
    });

    it("should return 500 if DynamoDB put fails", async () => {
      mockDocumentClient.put.mockRejectedValue(new Error("DynamoDB error"));

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

      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: JSON.stringify(validBackup),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toBe("Failed to restore data");
    });

    it("should return 500 if user profile not found", async () => {
      mockDocumentClient.get.mockResolvedValue({});

      const validBackup = {
        version: "1.0.0",
        data: {
          budgets: [],
          transactions: [],
        },
      };

      const event = {
        httpMethod: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test",
        },
        body: JSON.stringify(validBackup),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).message).toContain(
        "User profile not found",
      );
    });
  });
});
