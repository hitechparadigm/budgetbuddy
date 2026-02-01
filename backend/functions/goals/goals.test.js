/**
 * Goals Lambda Function Tests
 * Tests for savings goals CRUD operations and progress tracking
 */

// Mock the Lambda layers
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
      badRequest: (message) => ({
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: false, message }),
      }),
      notFound: (message) => ({
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: false, message }),
      }),
      unauthorized: (message) => ({
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: false, message }),
      }),
      internalError: (message) => ({
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: false, message }),
      }),
    },
    parseRequestBody: (body) => (body ? JSON.parse(body) : {}),
    getUserFromEvent: jest.fn(() => ({
      userId: "test-user-123",
      familyId: "test-family-123",
      email: "test@example.com",
    })),
    generateId: {
      custom: (prefix) => `${prefix}_${Date.now()}_test`,
    },
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
      resolveFamilyId: jest.fn().mockResolvedValue("test-family-123"),
    },
  }),
  { virtual: true },
);

jest.mock(
  "/opt/nodejs/shared",
  () => ({
    checkPermission: jest.fn(() => null),
  }),
  { virtual: true },
);

const { handler } = require("./index");
const { dynamoHelpers } = require("/opt/nodejs/utils");

describe("Goals Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = { httpMethod: "GET", path: "/goals/health" };
      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("goals");
    });
  });

  describe("GET /goals/templates", () => {
    it("should return goal templates", async () => {
      const event = {
        httpMethod: "GET",
        path: "/goals/templates",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.templates).toBeDefined();
      expect(body.data.templates.length).toBeGreaterThan(0);
      expect(body.data.templates[0]).toHaveProperty("id");
      expect(body.data.templates[0]).toHaveProperty("name");
      expect(body.data.templates[0]).toHaveProperty("icon");
    });
  });

  describe("GET /goals", () => {
    it("should return empty list when no goals exist", async () => {
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      const event = {
        httpMethod: "GET",
        path: "/goals",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.goals).toEqual([]);
      expect(body.data.summary.activeGoals).toBe(0);
    });

    it("should return goals sorted by priority", async () => {
      const mockGoals = [
        {
          goalId: "goal-2",
          name: "Vacation",
          targetAmount: 5000,
          currentAmount: 1000,
          priority: 2,
          status: "active",
        },
        {
          goalId: "goal-1",
          name: "Emergency Fund",
          targetAmount: 10000,
          currentAmount: 5000,
          priority: 1,
          status: "active",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockGoals);

      const event = {
        httpMethod: "GET",
        path: "/goals",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.goals.length).toBe(2);
      expect(body.data.goals[0].name).toBe("Emergency Fund");
      expect(body.data.summary.totalTarget).toBe(15000);
      expect(body.data.summary.totalSaved).toBe(6000);
    });
  });

  describe("POST /goals", () => {
    it("should create a new goal", async () => {
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      const event = {
        httpMethod: "POST",
        path: "/goals",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          name: "Emergency Fund",
          targetAmount: 10000,
          icon: "🚨",
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.name).toBe("Emergency Fund");
      expect(body.data.targetAmount).toBe(10000);
      expect(body.data.progressPercent).toBe(0);
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });

    it("should reject goal without name", async () => {
      const event = {
        httpMethod: "POST",
        path: "/goals",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ targetAmount: 10000 }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });

    it("should reject when max goals reached", async () => {
      // Mock 10 existing goals
      dynamoHelpers.queryByPK.mockResolvedValue(
        Array(10).fill({ status: "active" }),
      );

      const event = {
        httpMethod: "POST",
        path: "/goals",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ name: "New Goal", targetAmount: 1000 }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });
  });

  describe("POST /goals/{goalId}/contribute", () => {
    it("should add contribution and update progress", async () => {
      const mockGoal = {
        goalId: "goal-123",
        name: "Emergency Fund",
        targetAmount: 10000,
        currentAmount: 2000,
        status: "active",
        milestones: { 25: { reached: true }, 50: { reached: false } },
        contributions: [],
      };
      dynamoHelpers.getItem.mockResolvedValue(mockGoal);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockGoal,
        currentAmount: 3000,
        progressPercent: 30,
      });

      const event = {
        httpMethod: "POST",
        path: "/goals/goal-123/contribute",
        pathParameters: { goalId: "goal-123" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ amount: 1000 }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.contribution.amount).toBe(1000);
      expect(dynamoHelpers.updateItem).toHaveBeenCalled();
    });

    it("should trigger milestone celebration at 50%", async () => {
      const mockGoal = {
        goalId: "goal-123",
        name: "Emergency Fund",
        targetAmount: 10000,
        currentAmount: 4000,
        status: "active",
        milestones: {
          25: { reached: true },
          50: { reached: false },
          75: { reached: false },
          100: { reached: false },
        },
        contributions: [],
      };
      dynamoHelpers.getItem.mockResolvedValue(mockGoal);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockGoal,
        currentAmount: 5000,
        progressPercent: 50,
      });

      const event = {
        httpMethod: "POST",
        path: "/goals/goal-123/contribute",
        pathParameters: { goalId: "goal-123" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ amount: 1000 }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.newMilestones.length).toBeGreaterThan(0);
      expect(body.data.newMilestones[0].threshold).toBe(50);
    });

    it("should mark goal complete at 100%", async () => {
      const mockGoal = {
        goalId: "goal-123",
        name: "Emergency Fund",
        targetAmount: 10000,
        currentAmount: 9500,
        status: "active",
        milestones: {
          25: { reached: true },
          50: { reached: true },
          75: { reached: true },
          100: { reached: false },
        },
        contributions: [],
      };
      dynamoHelpers.getItem.mockResolvedValue(mockGoal);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockGoal,
        currentAmount: 10000,
        status: "completed",
      });

      const event = {
        httpMethod: "POST",
        path: "/goals/goal-123/contribute",
        pathParameters: { goalId: "goal-123" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ amount: 500 }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.isComplete).toBe(true);
    });
  });

  describe("PUT /goals/reorder", () => {
    it("should reorder goals by priority", async () => {
      const event = {
        httpMethod: "PUT",
        path: "/goals/reorder",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ goalIds: ["goal-2", "goal-1", "goal-3"] }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(200);
      expect(dynamoHelpers.updateItem).toHaveBeenCalledTimes(3);
    });
  });
});
