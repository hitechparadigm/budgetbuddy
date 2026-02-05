// Mock https first before requiring anything else
const mockHttpsGet = jest.fn();
jest.mock("https", () => ({
  get: (...args) => mockHttpsGet(...args),
}));

// Mock AWS SDK
const mockGetSecretValue = jest.fn();
const mockScan = jest.fn();
const mockUpdate = jest.fn();

jest.mock("aws-sdk", () => {
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        scan: () => ({ promise: mockScan }),
        update: () => ({ promise: mockUpdate }),
      })),
    },
    SecretsManager: jest.fn(() => ({
      getSecretValue: () => ({ promise: mockGetSecretValue }),
    })),
  };
});

const { handler } = require("./index");

describe("Investments Price Updater Lambda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "BudgetBuddyTable";
    process.env.ALPHA_VANTAGE_SECRET_NAME = "test-secret";
  });

  describe("API Key Management", () => {
    it("should fetch API key from Secrets Manager", async () => {
      mockGetSecretValue.mockResolvedValue({
        SecretString: JSON.stringify({ apiKey: "test-api-key" }),
      });

      mockScan.mockResolvedValue({
        Items: [],
      });

      await handler({});

      expect(mockGetSecretValue).toHaveBeenCalledWith({
        SecretId: "test-secret",
      });
    });

    it("should handle Secrets Manager errors", async () => {
      mockGetSecretValue.mockRejectedValue(new Error("Secret not found"));

      const result = await handler({});

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBe("Stock price update failed");
    });
  });

  describe("Symbol Collection", () => {
    it("should handle empty holdings", async () => {
      mockGetSecretValue.mockResolvedValue({
        SecretString: JSON.stringify({ apiKey: "test-api-key" }),
      });

      mockScan.mockResolvedValue({
        Items: [],
      });

      const result = await handler({});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.message).toBe("No holdings to update");
      expect(body.symbolsProcessed).toBe(0);
    });
  });

  describe("Price Fetching", () => {
    it("should fetch price from Alpha Vantage", async () => {
      mockGetSecretValue.mockResolvedValue({
        SecretString: JSON.stringify({ apiKey: "test-api-key" }),
      });

      mockScan
        .mockResolvedValueOnce({
          Items: [{ PK: "USER#1", SK: "HOLDING#1", symbol: "AAPL" }],
        })
        .mockResolvedValueOnce({
          Items: [{ PK: "USER#1", SK: "HOLDING#1", symbol: "AAPL" }],
        });

      mockHttpsGet.mockImplementation((url, callback) => {
        expect(url).toContain("AAPL");
        expect(url).toContain("test-api-key");

        const res = {
          on: jest.fn((event, handler) => {
            if (event === "data") {
              handler(
                JSON.stringify({
                  "Global Quote": {
                    "05. price": "180.50",
                    "09. change": "2.50",
                    "10. change percent": "1.40%",
                    "06. volume": "50000000",
                    "07. latest trading day": "2026-02-05",
                  },
                }),
              );
            } else if (event === "end") {
              handler();
            }
            return res;
          }),
        };
        callback(res);
        return { on: jest.fn() };
      });

      mockUpdate.mockResolvedValue({});

      const result = await handler({});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.successful).toBe(1);
      expect(body.results.success[0].symbol).toBe("AAPL");
      expect(body.results.success[0].price).toBe(180.5);
    });

    it("should handle API rate limit errors", async () => {
      mockGetSecretValue.mockResolvedValue({
        SecretString: JSON.stringify({ apiKey: "test-api-key" }),
      });

      mockScan.mockResolvedValue({
        Items: [{ PK: "USER#1", SK: "HOLDING#1", symbol: "AAPL" }],
      });

      mockHttpsGet.mockImplementation((url, callback) => {
        const res = {
          on: jest.fn((event, handler) => {
            if (event === "data") {
              handler(
                JSON.stringify({
                  Note: "Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute.",
                }),
              );
            } else if (event === "end") {
              handler();
            }
            return res;
          }),
        };
        callback(res);
        return { on: jest.fn() };
      });

      const result = await handler({});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.failed).toBe(1);
      expect(body.results.failed[0].error).toContain("rate limit");
    });

    it("should handle invalid symbols", async () => {
      mockGetSecretValue.mockResolvedValue({
        SecretString: JSON.stringify({ apiKey: "test-api-key" }),
      });

      mockScan.mockResolvedValue({
        Items: [{ PK: "USER#1", SK: "HOLDING#1", symbol: "INVALID" }],
      });

      mockHttpsGet.mockImplementation((url, callback) => {
        const res = {
          on: jest.fn((event, handler) => {
            if (event === "data") {
              handler(
                JSON.stringify({
                  "Error Message": "Invalid API call",
                }),
              );
            } else if (event === "end") {
              handler();
            }
            return res;
          }),
        };
        callback(res);
        return { on: jest.fn() };
      });

      const result = await handler({});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.failed).toBe(1);
      expect(body.results.failed[0].error).toContain("Alpha Vantage error");
    });
  });

  describe("Holdings Update", () => {
    it("should update holdings with correct price and timestamp", async () => {
      mockGetSecretValue.mockResolvedValue({
        SecretString: JSON.stringify({ apiKey: "test-api-key" }),
      });

      mockScan
        .mockResolvedValueOnce({
          Items: [{ PK: "USER#1", SK: "HOLDING#1", symbol: "AAPL" }],
        })
        .mockResolvedValueOnce({
          Items: [{ PK: "USER#1", SK: "HOLDING#1", symbol: "AAPL" }],
        });

      mockHttpsGet.mockImplementation((url, callback) => {
        const res = {
          on: jest.fn((event, handler) => {
            if (event === "data") {
              handler(
                JSON.stringify({
                  "Global Quote": {
                    "05. price": "180.50",
                    "09. change": "2.50",
                    "10. change percent": "1.40%",
                    "06. volume": "50000000",
                    "07. latest trading day": "2026-02-05",
                  },
                }),
              );
            } else if (event === "end") {
              handler();
            }
            return res;
          }),
        };
        callback(res);
        return { on: jest.fn() };
      });

      mockUpdate.mockResolvedValue({});

      await handler({});

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: "BudgetBuddyTable",
          Key: {
            PK: "USER#1",
            SK: "HOLDING#1",
          },
          UpdateExpression: "SET currentPrice = :price, lastUpdated = :updated",
          ExpressionAttributeValues: expect.objectContaining({
            ":price": 180.5,
          }),
        }),
      );
    });
  });
});
