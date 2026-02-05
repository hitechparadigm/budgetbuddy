const { handler } = require("./index");

// Mock AWS SDK
const mockQuery = jest.fn();
const mockPut = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock("aws-sdk", () => {
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        query: () => ({ promise: mockQuery }),
        put: () => ({ promise: mockPut }),
        update: () => ({ promise: mockUpdate }),
        delete: () => ({ promise: mockDelete }),
      })),
    },
  };
});

describe("Investments Lambda Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "BudgetBuddyTable";
  });

  const mockEvent = (method, path, body = null, userId = "user123") => ({
    httpMethod: method,
    path,
    body: body ? JSON.stringify(body) : null,
    requestContext: {
      authorizer: {
        claims: {
          sub: userId,
        },
      },
    },
  });

  describe("GET /investments - Portfolio Overview", () => {
    it("should return portfolio summary with holdings", async () => {
      const mockHoldings = [
        {
          PK: "USER#user123",
          SK: "HOLDING#1",
          holdingId: "1",
          symbol: "AAPL",
          name: "Apple Inc.",
          shares: 10,
          costBasis: 150,
          currentPrice: 180,
          accountType: "brokerage",
        },
        {
          PK: "USER#user123",
          SK: "HOLDING#2",
          holdingId: "2",
          symbol: "GOOGL",
          name: "Alphabet Inc.",
          shares: 5,
          costBasis: 2000,
          currentPrice: 2200,
          accountType: "401k",
        },
      ];

      mockQuery.mockResolvedValue({
        Items: mockHoldings,
      });

      const event = mockEvent("GET", "/investments");
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.totalValue).toBe(12800); // (10 * 180) + (5 * 2200)
      expect(body.totalCostBasis).toBe(11500); // (10 * 150) + (5 * 2000)
      expect(body.totalGainLoss).toBe(1300);
      expect(body.totalGainLossPercent).toBeCloseTo(11.3, 1);
      expect(body.allocation).toHaveLength(2);
      expect(body.holdings).toHaveLength(2);
    });

    it("should return empty portfolio when no holdings", async () => {
      mockQuery.mockResolvedValue({
        Items: [],
      });

      const event = mockEvent("GET", "/investments");
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.totalValue).toBe(0);
      expect(body.totalCostBasis).toBe(0);
      expect(body.totalGainLoss).toBe(0);
      expect(body.holdings).toHaveLength(0);
    });
  });

  describe("GET /investments/holdings - List Holdings", () => {
    it("should return all holdings for user", async () => {
      const mockHoldings = [
        {
          holdingId: "1",
          symbol: "AAPL",
          shares: 10,
        },
      ];

      mockQuery.mockResolvedValue({
        Items: mockHoldings,
      });

      const event = mockEvent("GET", "/investments/holdings");
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.holdings).toEqual(mockHoldings);
    });
  });

  describe("POST /investments/holdings - Add Holding", () => {
    it("should create a new holding", async () => {
      mockPut.mockResolvedValue({});

      const holdingData = {
        symbol: "aapl",
        name: "Apple Inc.",
        shares: 10,
        costBasis: 150,
        currentPrice: 180,
        accountType: "brokerage",
      };

      const event = mockEvent("POST", "/investments/holdings", holdingData);
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.symbol).toBe("AAPL"); // Should be uppercase
      expect(body.shares).toBe(10);
      expect(body.holdingId).toBeDefined();
      expect(mockPut).toHaveBeenCalled();
    });

    it("should return 400 when missing required fields", async () => {
      const event = mockEvent("POST", "/investments/holdings", {
        symbol: "AAPL",
        // Missing other required fields
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });
  });

  describe("PUT /investments/holdings/{id} - Update Holding", () => {
    it("should update holding fields", async () => {
      mockUpdate.mockResolvedValue({
        Attributes: {
          holdingId: "1",
          shares: 15,
          currentPrice: 185,
        },
      });

      const updates = {
        shares: 15,
        currentPrice: 185,
      };

      const event = mockEvent("PUT", "/investments/holdings/1", updates);
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.shares).toBe(15);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("DELETE /investments/holdings/{id} - Delete Holding", () => {
    it("should delete a holding", async () => {
      mockDelete.mockResolvedValue({});

      const event = mockEvent("DELETE", "/investments/holdings/1");
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("Authorization", () => {
    it("should return 401 when user is not authenticated", async () => {
      const event = {
        httpMethod: "GET",
        path: "/investments",
        requestContext: {},
      };

      const result = await handler(event);
      expect(result.statusCode).toBe(401);
    });
  });

  describe("CORS", () => {
    it("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
        path: "/investments",
      };

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("Portfolio Calculations", () => {
    it("should calculate allocation percentages correctly", async () => {
      const mockHoldings = [
        {
          symbol: "AAPL",
          shares: 10,
          costBasis: 100,
          currentPrice: 150,
          accountType: "brokerage",
        },
        {
          symbol: "GOOGL",
          shares: 5,
          costBasis: 1000,
          currentPrice: 1500,
          accountType: "brokerage",
        },
        {
          symbol: "MSFT",
          shares: 20,
          costBasis: 200,
          currentPrice: 300,
          accountType: "401k",
        },
      ];

      mockQuery.mockResolvedValue({
        Items: mockHoldings,
      });

      const event = mockEvent("GET", "/investments");
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Total value: (10*150) + (5*1500) + (20*300) = 1500 + 7500 + 6000 = 15000
      expect(body.totalValue).toBe(15000);

      // Brokerage: 1500 + 7500 = 9000 (60%)
      // 401k: 6000 (40%)
      const brokerageAlloc = body.allocation.find(
        (a) => a.type === "brokerage",
      );
      const retirement401kAlloc = body.allocation.find(
        (a) => a.type === "401k",
      );

      expect(brokerageAlloc.value).toBe(9000);
      expect(brokerageAlloc.percent).toBe(60);
      expect(retirement401kAlloc.value).toBe(6000);
      expect(retirement401kAlloc.percent).toBe(40);
    });

    it("should handle zero cost basis gracefully", async () => {
      const mockHoldings = [
        {
          symbol: "AAPL",
          shares: 10,
          costBasis: 0,
          currentPrice: 150,
          accountType: "brokerage",
        },
      ];

      mockQuery.mockResolvedValue({
        Items: mockHoldings,
      });

      const event = mockEvent("GET", "/investments");
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(body.totalValue).toBe(1500);
      expect(body.totalCostBasis).toBe(0);
      expect(body.totalGainLossPercent).toBe(0); // Should not divide by zero
    });
  });
});
