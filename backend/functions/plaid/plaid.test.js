/**
 * Plaid Lambda Function Tests
 * Tests for bank account linking and transaction sync functionality
 */

const { handler } = require("./index");

// Mock AWS SDK
jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        client_id: "test-client-id",
        secret: "test-secret",
        environment: "sandbox",
      }),
    }),
  })),
  GetSecretValueCommand: jest.fn(),
}));

// Mock Plaid SDK
jest.mock("plaid", () => ({
  Configuration: jest.fn(),
  PlaidApi: jest.fn().mockImplementation(() => ({
    linkTokenCreate: jest.fn().mockResolvedValue({
      data: {
        link_token: "link-sandbox-test-token",
        expiration: "2026-02-02T00:00:00Z",
      },
    }),
    sandboxPublicTokenCreate: jest.fn().mockResolvedValue({
      data: { public_token: "public-sandbox-test-token" },
    }),
    itemPublicTokenExchange: jest.fn().mockResolvedValue({
      data: {
        access_token: "access-sandbox-test-token",
        item_id: "item-test-id",
      },
    }),
    accountsGet: jest.fn().mockResolvedValue({
      data: {
        accounts: [
          {
            account_id: "acc-123",
            name: "Checking",
            type: "depository",
            subtype: "checking",
            mask: "1234",
            balances: {
              current: 1000,
              available: 900,
              iso_currency_code: "USD",
            },
          },
        ],
        item: { institution_id: "ins_3" },
      },
    }),
    institutionsGetById: jest.fn().mockResolvedValue({
      data: { institution: { name: "Chase" } },
    }),
  })),
  PlaidEnvironments: { sandbox: "https://sandbox.plaid.com" },
  Products: { Transactions: "transactions" },
  CountryCode: { Us: "US", Ca: "CA" },
}));

// Mock shared utilities
jest.mock(
  "/opt/nodejs/utils",
  () => ({
    successResponse: (data, message) => ({
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true, message, data }),
    }),
    errorResponse: {
      badRequest: (msg) => ({
        statusCode: 400,
        body: JSON.stringify({ success: false, message: msg }),
      }),
      unauthorized: (msg) => ({
        statusCode: 401,
        body: JSON.stringify({ success: false, message: msg }),
      }),
      notFound: (msg) => ({
        statusCode: 404,
        body: JSON.stringify({ success: false, message: msg }),
      }),
      internalError: (msg) => ({
        statusCode: 500,
        body: JSON.stringify({ success: false, message: msg }),
      }),
    },
    parseRequestBody: (body) =>
      typeof body === "string" ? JSON.parse(body) : body,
    getUserFromEvent: () => ({ userId: "user-123", familyId: "family-123" }),
    generateId: { custom: (prefix) => `${prefix}-${Date.now()}` },
    dynamoHelpers: {
      putItem: jest.fn().mockResolvedValue({}),
      getItem: jest.fn().mockResolvedValue(null),
      updateItem: jest.fn().mockResolvedValue({}),
      queryByPK: jest.fn().mockResolvedValue([]),
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    FamilyIdResolver: {
      resolveFamilyId: jest.fn().mockResolvedValue("family-123"),
    },
  }),
  { virtual: true },
);

jest.mock(
  "/opt/nodejs/shared",
  () => ({
    checkPermission: jest.fn().mockReturnValue(null),
  }),
  { virtual: true },
);

describe("Plaid Lambda Handler", () => {
  const context = { awsRequestId: "test-request-id" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = { httpMethod: "GET", path: "/plaid/health" };
      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("plaid");
    });
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = { httpMethod: "OPTIONS", path: "/plaid/link-token" };
      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("Link Token Creation", () => {
    it("should create link token successfully", async () => {
      const event = {
        httpMethod: "POST",
        path: "/plaid/link-token",
        requestContext: { authorizer: { claims: { sub: "user-123" } } },
      };

      const response = await handler(event, context);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.linkToken).toBeDefined();
      expect(body.data.environment).toBe("sandbox");
    });
  });
});
