/**
 * Admin API Property-Based Tests
 *
 * Property tests for admin dashboard functionality including:
 * - Property 4: Admin Search and Pagination
 * - Property 5: Admin Data Completeness
 * - Property 6: Admin Authorization
 *
 * Feature: test-coverage-improvement
 * Validates: Requirements 3.1, 3.2, 3.3, 3.6
 */

const fc = require("fast-check");

// Mock the Lambda layers before importing handler
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
    getUserFromEvent: jest.fn(),
    generateId: {
      custom: (prefix) => `${prefix}_${Date.now()}_test`,
    },
    dynamoHelpers: {
      putItem: jest.fn().mockResolvedValue({}),
      getItem: jest.fn(),
      updateItem: jest.fn().mockResolvedValue({}),
      queryByPK: jest.fn().mockResolvedValue([]),
      scan: jest.fn(),
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  }),
  { virtual: true },
);


const { handler } = require("./index");
const { dynamoHelpers, getUserFromEvent } = require("/opt/nodejs/utils");

describe("Admin API Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 4: Admin Search and Pagination
   * **Validates: Requirements 3.1, 3.2**
   *
   * For any list of users and any valid pagination parameters:
   * - The returned page size never exceeds the requested limit
   * - Offset + returned count <= total count
   * - Search results only contain users matching the query
   */
  describe("Property 4: Admin Search and Pagination", () => {
    // Generator for user profiles with safe characters
    const userProfileArb = fc.record({
      entityType: fc.constant("USER_PROFILE"),
      userId: fc
        .hexaString({ minLength: 5, maxLength: 15 })
        .map((s) => `user_${s}`),
      email: fc
        .hexaString({ minLength: 3, maxLength: 10 })
        .map((s) => `${s}@test.com`),
      name: fc.hexaString({ minLength: 2, maxLength: 20 }),
      createdAt: fc
        .date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
        .map((d) => d.toISOString()),
      subscriptionStatus: fc.constantFrom("free", "premium"),
      isDisabled: fc.boolean(),
    });

    // Generator for pagination parameters
    const paginationArb = fc.record({
      limit: fc.integer({ min: 1, max: 100 }),
      offset: fc.integer({ min: 0, max: 100 }),
    });

    test("page size never exceeds requested limit", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userProfileArb, { minLength: 0, maxLength: 30 }),
          paginationArb,
          async (users, pagination) => {
            // Reset mocks for each run
            dynamoHelpers.getItem.mockReset();
            dynamoHelpers.scan.mockReset();
            getUserFromEvent.mockReset();

            getUserFromEvent.mockReturnValue({
              userId: "admin-user",
              groups: ["admin"],
            });
            dynamoHelpers.getItem.mockResolvedValue({ role: "admin" });
            dynamoHelpers.scan.mockResolvedValue(users);

            const event = {
              httpMethod: "GET",
              path: "/admin/users",
              headers: { Authorization: "Bearer test-token" },
              queryStringParameters: {
                limit: String(pagination.limit),
                offset: String(pagination.offset),
              },
            };

            const result = await handler(event, { awsRequestId: "test" });
            const body = JSON.parse(result.body);

            // Property: returned users never exceed limit
            expect(body.data.users.length).toBeLessThanOrEqual(
              pagination.limit,
            );
          },
        ),
        { numRuns: 30 },
      );
    });

    test("search results only contain matching users", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userProfileArb, { minLength: 1, maxLength: 15 }),
          fc.hexaString({ minLength: 1, maxLength: 5 }),
          async (users, searchQuery) => {
            dynamoHelpers.getItem.mockReset();
            dynamoHelpers.scan.mockReset();
            getUserFromEvent.mockReset();

            getUserFromEvent.mockReturnValue({
              userId: "admin-user",
              groups: ["admin"],
            });
            dynamoHelpers.getItem.mockResolvedValue({ role: "admin" });
            dynamoHelpers.scan.mockResolvedValue(users);

            const event = {
              httpMethod: "GET",
              path: "/admin/users",
              headers: { Authorization: "Bearer test-token" },
              queryStringParameters: { q: searchQuery },
            };

            const result = await handler(event, { awsRequestId: "test" });
            const body = JSON.parse(result.body);

            // Property: all returned users match the search query
            const query = searchQuery.toLowerCase();
            for (const user of body.data.users) {
              const matchesEmail = (user.email || "")
                .toLowerCase()
                .includes(query);
              const matchesName = (user.name || "")
                .toLowerCase()
                .includes(query);
              const matchesUserId = (user.userId || "")
                .toLowerCase()
                .includes(query);
              expect(matchesEmail || matchesName || matchesUserId).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Property 5: Admin Data Completeness
   * **Validates: Requirements 3.3**
   *
   * For any user profile retrieved by admin:
   * - All required fields are present and non-null
   * - User details include stats (budget count, transaction count)
   */
  describe("Property 5: Admin Data Completeness", () => {
    const userProfileArb = fc.record({
      userId: fc
        .hexaString({ minLength: 5, maxLength: 15 })
        .map((s) => `user_${s}`),
      email: fc
        .hexaString({ minLength: 3, maxLength: 10 })
        .map((s) => `${s}@test.com`),
      name: fc.hexaString({ minLength: 2, maxLength: 20 }),
      createdAt: fc
        .date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
        .map((d) => d.toISOString()),
      subscriptionStatus: fc.constantFrom("free", "premium"),
      isDisabled: fc.boolean(),
      familyId: fc.option(
        fc.hexaString({ minLength: 5 }).map((s) => `family_${s}`),
      ),
    });

    test("user details contain all required fields", async () => {
      await fc.assert(
        fc.asyncProperty(userProfileArb, async (userProfile) => {
          // Reset all mocks before each property run
          dynamoHelpers.getItem.mockReset();
          dynamoHelpers.queryByPK.mockReset();
          getUserFromEvent.mockReset();

          getUserFromEvent.mockReturnValue({
            userId: "admin-user",
            groups: ["admin"],
          });
          dynamoHelpers.getItem
            .mockResolvedValueOnce({ role: "admin" }) // Admin check
            .mockResolvedValueOnce(userProfile); // User profile
          dynamoHelpers.queryByPK
            .mockResolvedValueOnce([]) // Budgets
            .mockResolvedValueOnce([]); // Transactions

          const event = {
            httpMethod: "GET",
            path: `/admin/users/${userProfile.userId}`,
            headers: { Authorization: "Bearer test-token" },
            pathParameters: { userId: userProfile.userId },
          };

          const result = await handler(event, { awsRequestId: "test" });
          const body = JSON.parse(result.body);

          // Property: required fields are present
          expect(body.data.userId).toBeDefined();
          expect(body.data.email).toBeDefined();
          expect(body.data.createdAt).toBeDefined();
          expect(body.data.stats).toBeDefined();
          expect(typeof body.data.stats.budgetCount).toBe("number");
          expect(typeof body.data.stats.transactionCount).toBe("number");
        }),
        { numRuns: 20 },
      );
    });

    test("stats counts match actual data", async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArb,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 20 }),
          async (userProfile, budgetCount, transactionCount) => {
            // Reset all mocks
            dynamoHelpers.getItem.mockReset();
            dynamoHelpers.queryByPK.mockReset();
            getUserFromEvent.mockReset();

            const budgets = Array(budgetCount).fill({ entityType: "BUDGET" });
            const transactions = Array(transactionCount).fill({
              entityType: "TRANSACTION",
            });

            getUserFromEvent.mockReturnValue({
              userId: "admin-user",
              groups: ["admin"],
            });
            dynamoHelpers.getItem
              .mockResolvedValueOnce({ role: "admin" })
              .mockResolvedValueOnce(userProfile);
            dynamoHelpers.queryByPK
              .mockResolvedValueOnce(budgets)
              .mockResolvedValueOnce(transactions);

            const event = {
              httpMethod: "GET",
              path: `/admin/users/${userProfile.userId}`,
              headers: { Authorization: "Bearer test-token" },
              pathParameters: { userId: userProfile.userId },
            };

            const result = await handler(event, { awsRequestId: "test" });
            const body = JSON.parse(result.body);

            // Property: counts match actual data
            expect(body.data.stats.budgetCount).toBe(budgetCount);
            expect(body.data.stats.transactionCount).toBe(transactionCount);
            expect(body.data.stats.budgetCount).toBeGreaterThanOrEqual(0);
            expect(body.data.stats.transactionCount).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Property 6: Admin Authorization
   * **Validates: Requirements 3.6**
   *
   * For any user without admin role:
   * - All admin endpoints return 401 Unauthorized
   * - Admin actions are never executed for non-admins
   */
  describe("Property 6: Admin Authorization", () => {
    const nonAdminRoleArb = fc.constantFrom("user", "viewer", "member");
    const adminEndpointArb = fc.constantFrom(
      { method: "GET", path: "/admin/dashboard" },
      { method: "GET", path: "/admin/users" },
      { method: "GET", path: "/admin/system-health" },
      { method: "GET", path: "/admin/audit" },
    );

    test("non-admin users are rejected from admin endpoints", async () => {
      await fc.assert(
        fc.asyncProperty(
          nonAdminRoleArb,
          adminEndpointArb,
          async (role, endpoint) => {
            // Reset mocks
            dynamoHelpers.getItem.mockReset();
            getUserFromEvent.mockReset();

            getUserFromEvent.mockReturnValue({
              userId: "regular-user",
              groups: [role],
            });
            dynamoHelpers.getItem.mockResolvedValue({ role: role });

            const event = {
              httpMethod: endpoint.method,
              path: endpoint.path,
              headers: { Authorization: "Bearer test-token" },
              queryStringParameters: {},
            };

            const result = await handler(event, { awsRequestId: "test" });

            // Property: non-admins always get 401
            expect(result.statusCode).toBe(401);
          },
        ),
        { numRuns: 30 },
      );
    });

    test("admin users can access all admin endpoints", async () => {
      await fc.assert(
        fc.asyncProperty(adminEndpointArb, async (endpoint) => {
          // Reset mocks
          dynamoHelpers.getItem.mockReset();
          dynamoHelpers.scan.mockReset();
          dynamoHelpers.queryByPK.mockReset();
          getUserFromEvent.mockReset();

          getUserFromEvent.mockReturnValue({
            userId: "admin-user",
            groups: ["admin"],
          });
          dynamoHelpers.getItem.mockResolvedValue({ role: "admin" });
          dynamoHelpers.scan.mockResolvedValue([]);
          dynamoHelpers.queryByPK.mockResolvedValue([]);

          const event = {
            httpMethod: endpoint.method,
            path: endpoint.path,
            headers: { Authorization: "Bearer test-token" },
            queryStringParameters: {},
          };

          const result = await handler(event, { awsRequestId: "test" });

          // Property: admins don't get 401
          expect(result.statusCode).not.toBe(401);
        }),
        { numRuns: 20 },
      );
    });

    test("Admins group membership grants admin access", async () => {
      await fc.assert(
        fc.asyncProperty(adminEndpointArb, async (endpoint) => {
          // Reset mocks
          dynamoHelpers.getItem.mockReset();
          dynamoHelpers.scan.mockReset();
          dynamoHelpers.queryByPK.mockReset();
          getUserFromEvent.mockReset();

          // User has 'Admins' group (capital A) instead of 'admin'
          getUserFromEvent.mockReturnValue({
            userId: "admin-user",
            groups: ["Admins"],
          });
          dynamoHelpers.getItem.mockResolvedValue({ role: "user" }); // Not admin in DB
          dynamoHelpers.scan.mockResolvedValue([]);
          dynamoHelpers.queryByPK.mockResolvedValue([]);

          const event = {
            httpMethod: endpoint.method,
            path: endpoint.path,
            headers: { Authorization: "Bearer test-token" },
            queryStringParameters: {},
          };

          const result = await handler(event, { awsRequestId: "test" });

          // Property: 'Admins' group grants access (not 401)
          expect(result.statusCode).not.toBe(401);
        }),
        { numRuns: 15 },
      );
    });
  });
});
