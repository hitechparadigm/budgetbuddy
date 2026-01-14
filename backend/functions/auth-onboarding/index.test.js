/**
 * Unit tests for auth-onboarding Lambda function
 */

// Mock AWS SDK before requiring the handler
jest.mock("@aws-sdk/client-dynamodb");

// Mock local utilities
jest.mock("./utils/dynamo-helpers");
jest.mock("./utils/family-id-resolver");

const { handler } = require("./index");
const { parseIdToken } = require("/opt/nodejs/shared/token-parser");
const { validateOnboardingInput } = require("/opt/nodejs/shared/validators");
const dynamoHelpers = require("./utils/dynamo-helpers");
const FamilyIdResolver = require("./utils/family-id-resolver");

describe("Auth Onboarding Lambda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    process.env.AWS_REGION = "us-east-1";
  });

  describe("CORS preflight", () => {
    test("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
        headers: { origin: "http://localhost:3000" },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe("");
    });
  });

  describe("Authentication", () => {
    test("should return 401 if Authorization header is missing", async () => {
      const event = {
        httpMethod: "POST",
        headers: {},
        body: JSON.stringify({}),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(401); // AuthenticationError
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    test("should parse JWT token and extract userId", async () => {
      parseIdToken.mockReturnValue({
        "custom:userId": "user-123",
        "custom:familyId": "family-123",
      });

      validateOnboardingInput.mockReturnValue([]);
      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family-123");
      dynamoHelpers.putItem.mockResolvedValue();
      dynamoHelpers.getItem.mockResolvedValue({ budgetId: "budget-123" });

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          city: "New York",
          country: "United States",
          familySize: 2,
          currentMonth: "2026-01",
          selectedCategories: [
            { name: "Groceries", icon: "🛒", adjustedAmount: 500 },
          ],
        }),
      };

      await handler(event);

      expect(parseIdToken).toHaveBeenCalledWith("valid-token");
    });
  });

  describe("Validation", () => {
    test("should return 400 if request body is missing", async () => {
      parseIdToken.mockReturnValue({
        "custom:userId": "user-123",
      });

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: null,
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    test("should return 400 if JSON is invalid", async () => {
      parseIdToken.mockReturnValue({
        "custom:userId": "user-123",
      });

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: "invalid-json",
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    test("should return 400 if validation fails", async () => {
      parseIdToken.mockReturnValue({
        "custom:userId": "user-123",
      });

      validateOnboardingInput.mockReturnValue([
        "City is required",
        "Family size must be between 1 and 20",
      ]);

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          city: "",
          country: "United States",
          familySize: 0,
          currentMonth: "2026-01",
          selectedCategories: [],
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(validateOnboardingInput).toHaveBeenCalled();
    });
  });

  describe("Successful onboarding", () => {
    test("should complete onboarding and create budget", async () => {
      parseIdToken.mockReturnValue({
        "custom:userId": "user-123",
        "custom:familyId": "family-123",
      });

      validateOnboardingInput.mockReturnValue([]);
      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family-123");
      dynamoHelpers.putItem.mockResolvedValue();
      dynamoHelpers.getItem.mockResolvedValue({
        budgetId: "budget-123",
        month: "2026-01",
      });

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          city: "New York",
          country: "United States",
          familySize: 2,
          currentMonth: "2026-01",
          selectedCategories: [
            { name: "Groceries", icon: "🛒", adjustedAmount: 500 },
            { name: "Rent", icon: "🏠", adjustedAmount: 2000 },
          ],
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Onboarding completed successfully");
      expect(body.budgetCreated).toBe(true);
      expect(body.totalExpenses).toBe(2500);
      expect(body.categoriesCreated).toBe(2);
    });

    test("should use familyId from JWT if available", async () => {
      parseIdToken.mockReturnValue({
        "custom:userId": "user-123",
        "custom:familyId": "family-from-jwt",
      });

      validateOnboardingInput.mockReturnValue([]);
      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family-from-jwt");
      dynamoHelpers.putItem.mockResolvedValue();
      dynamoHelpers.getItem.mockResolvedValue({ budgetId: "budget-123" });

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          city: "New York",
          country: "United States",
          familySize: 2,
          currentMonth: "2026-01",
          selectedCategories: [
            { name: "Groceries", icon: "🛒", adjustedAmount: 500 },
          ],
        }),
      };

      await handler(event);

      expect(FamilyIdResolver.resolveFamilyId).toHaveBeenCalledWith(
        "user-123",
        "family-from-jwt",
        dynamoHelpers
      );
    });

    test("should fallback to sub if custom:userId not in token", async () => {
      parseIdToken.mockReturnValue({
        sub: "cognito-sub-123",
      });

      validateOnboardingInput.mockReturnValue([]);
      FamilyIdResolver.resolveFamilyId.mockResolvedValue(
        "family-cognito-sub-123"
      );
      dynamoHelpers.putItem.mockResolvedValue();
      dynamoHelpers.getItem.mockResolvedValue({ budgetId: "budget-123" });

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          city: "New York",
          country: "United States",
          familySize: 2,
          currentMonth: "2026-01",
          selectedCategories: [
            { name: "Groceries", icon: "🛒", adjustedAmount: 500 },
          ],
        }),
      };

      await handler(event);

      expect(FamilyIdResolver.resolveFamilyId).toHaveBeenCalledWith(
        "cognito-sub-123",
        null,
        dynamoHelpers
      );
    });
  });

  describe("Budget creation", () => {
    test("should create budget with correct structure", async () => {
      parseIdToken.mockReturnValue({
        "custom:userId": "user-123",
        "custom:familyId": "family-123",
      });

      validateOnboardingInput.mockReturnValue([]);
      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family-123");
      dynamoHelpers.putItem.mockResolvedValue();
      dynamoHelpers.getItem.mockResolvedValue({ budgetId: "budget-123" });

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          city: "New York",
          country: "United States",
          familySize: 2,
          currentMonth: "2026-01",
          selectedCategories: [
            { name: "Groceries", icon: "🛒", adjustedAmount: 500 },
          ],
        }),
      };

      await handler(event);

      expect(dynamoHelpers.putItem).toHaveBeenCalled();
      const budgetArg = dynamoHelpers.putItem.mock.calls[0][0];
      expect(budgetArg.PK).toBe("FAMILY#family-123");
      expect(budgetArg.SK).toBe("BUDGET#2026-01");
      expect(budgetArg.month).toBe("2026-01");
      expect(budgetArg.totalExpenses).toBe(500);
      expect(budgetArg.groups.expenses).toHaveLength(1);
    });

    test("should return 500 if budget verification fails", async () => {
      parseIdToken.mockReturnValue({
        "custom:userId": "user-123",
        "custom:familyId": "family-123",
      });

      validateOnboardingInput.mockReturnValue([]);
      FamilyIdResolver.resolveFamilyId.mockResolvedValue("family-123");
      dynamoHelpers.putItem.mockResolvedValue();
      dynamoHelpers.getItem.mockResolvedValue(null); // Budget not found

      const event = {
        httpMethod: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          city: "New York",
          country: "United States",
          familySize: 2,
          currentMonth: "2026-01",
          selectedCategories: [
            { name: "Groceries", icon: "🛒", adjustedAmount: 500 },
          ],
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Budget Creation Verification Failed");
    });
  });

  describe("Import availability", () => {
    test("should have all imports available at runtime", () => {
      // This test verifies that all imports are at the top of the file
      // and available when the handler is called
      const handler = require("./index").handler;
      expect(handler).toBeDefined();
      expect(typeof handler).toBe("function");
    });
  });
});
