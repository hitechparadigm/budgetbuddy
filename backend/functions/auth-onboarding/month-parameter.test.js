/**
 * Regression Tests for Onboarding Month Mismatch Bug (Requirement 42)
 *
 * Bug: Budget created for wrong month during onboarding
 * Root Cause: Month parameter not validated or preserved correctly
 *
 * These tests validate that:
 * 1. Budget is created for the exact month specified in request
 * 2. Month parameter is preserved throughout onboarding flow
 * 3. No timezone-related month shifts occur
 */

const { handler } = require("./index");

// Mock AWS SDK
jest.mock("@aws-sdk/client-dynamodb");
const {
  DynamoDBClient,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");

// Mock shared utilities
jest.mock("/opt/nodejs/shared/cors", () => ({
  getCorsHeaders: jest.fn(() => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  })),
}));

jest.mock("/opt/nodejs/shared/token-parser", () => ({
  parseIdToken: jest.fn(() => ({
    sub: "user123",
    "custom:userId": "user123",
    "custom:familyId": "family123",
  })),
}));

jest.mock("/opt/nodejs/shared/validators", () => ({
  validateOnboardingInput: jest.fn(() => []), // No validation errors
}));

jest.mock("/opt/nodejs/shared/errors", () => ({
  formatErrorResponse: jest.fn((error, origin) => ({
    statusCode: error.statusCode || 400,
    headers: { "Access-Control-Allow-Origin": origin },
    body: JSON.stringify({ error: error.message }),
  })),
  ValidationError: class ValidationError extends Error {
    constructor(errors) {
      super(errors.join(", "));
      this.statusCode = 400;
    }
  },
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message) {
      super(message);
      this.statusCode = 401;
    }
  },
}));

// Mock local utilities
jest.mock("./utils/dynamo-helpers");
const dynamoHelpers = require("./utils/dynamo-helpers");

jest.mock("./utils/family-id-resolver");
const FamilyIdResolver = require("./utils/family-id-resolver");

describe("Onboarding Month Parameter Preservation (Req 42)", () => {
  let mockSend;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DynamoDB send
    mockSend = jest.fn().mockResolvedValue({
      Attributes: {
        PK: { S: "USER#user123" },
        SK: { S: "PROFILE" },
        onboardingCompleted: { BOOL: true },
      },
    });
    DynamoDBClient.prototype.send = mockSend;

    // Mock dynamo helpers
    dynamoHelpers.putItem = jest.fn().mockResolvedValue({});
    dynamoHelpers.getItem = jest.fn().mockResolvedValue({
      PK: "FAMILY#family123",
      SK: "BUDGET#2025-11",
      budgetId: "budget123",
    });

    // Mock FamilyIdResolver
    FamilyIdResolver.resolveFamilyId = jest.fn().mockResolvedValue("family123");
    FamilyIdResolver.logFamilyIdResolution = jest.fn();
  });

  test("should create budget for exact month specified in request", async () => {
    const event = {
      httpMethod: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        city: "New York",
        country: "United States",
        familySize: 2,
        currentMonth: "2025-11", // November 2025
        selectedCategories: [
          { name: "Groceries", icon: "🛒", adjustedAmount: 500 },
        ],
        currency: "USD",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify budget was created with exact month from request
    expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        month: "2025-11", // Must match request exactly
        SK: "BUDGET#2025-11",
      }),
    );
  });

  test("should preserve month parameter across different timezones", async () => {
    // Simulate user in EST timezone requesting November budget
    const event = {
      httpMethod: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        city: "New York",
        country: "United States",
        familySize: 2,
        currentMonth: "2025-11", // November (EST)
        selectedCategories: [
          { name: "Rent", icon: "🏠", adjustedAmount: 1500 },
        ],
        currency: "USD",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.month).toBe("2025-11"); // Must return exact month from request
    expect(body.debugInfo.sortKey).toBe("BUDGET#2025-11");
  });

  test("should create budget for December when specified, not November", async () => {
    const event = {
      httpMethod: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        city: "Los Angeles",
        country: "United States",
        familySize: 1,
        currentMonth: "2025-12", // December 2025
        selectedCategories: [{ name: "Food", icon: "🍔", adjustedAmount: 400 }],
        currency: "USD",
      }),
    };

    // Mock verification to return December budget
    dynamoHelpers.getItem = jest.fn().mockResolvedValue({
      PK: "FAMILY#family123",
      SK: "BUDGET#2025-12",
      budgetId: "budget123",
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify budget created for December, not November
    expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        month: "2025-12",
        SK: "BUDGET#2025-12",
      }),
    );

    // Verify verification checked December budget
    expect(dynamoHelpers.getItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "BUDGET#2025-12",
    );
  });

  test("should handle month parameter at end of month correctly", async () => {
    // Simulate onboarding on Nov 30, 2025 at 11:59 PM EST
    const event = {
      httpMethod: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        city: "Boston",
        country: "United States",
        familySize: 3,
        currentMonth: "2025-11", // Still November in user's timezone
        selectedCategories: [
          { name: "Utilities", icon: "⚡", adjustedAmount: 200 },
        ],
        currency: "USD",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Must create budget for November, not December
    expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        month: "2025-11",
        SK: "BUDGET#2025-11",
      }),
    );
  });

  test("should return month parameter in response for frontend validation", async () => {
    const event = {
      httpMethod: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        city: "Seattle",
        country: "United States",
        familySize: 2,
        currentMonth: "2025-11",
        selectedCategories: [
          { name: "Transportation", icon: "🚗", adjustedAmount: 300 },
        ],
        currency: "USD",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);

    // Response must include month for frontend to verify
    expect(body.month).toBe("2025-11");
    expect(body.debugInfo.sortKey).toBe("BUDGET#2025-11");
  });
});
