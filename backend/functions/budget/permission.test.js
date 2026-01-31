/**
 * Permission System Tests
 *
 * Comprehensive test suite for role-based permission enforcement
 * across budget operations.
 *
 * Tests cover:
 * - Primary role permissions (full access)
 * - Spouse role permissions (limited access)
 * - Viewer role permissions (read-only)
 * - Permission violations and 403 responses
 */

// Enable manual mocks for Lambda layers
jest.mock("/opt/nodejs/utils");
jest.mock("/opt/nodejs/shared");

const { handler } = require("./index");
const shared = require("/opt/nodejs/shared");

describe("Permission System - Budget Lambda", () => {
  const mockContext = {
    awsRequestId: "test-request-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";

    // Reset permission check to allow by default
    shared.checkPermission.mockReturnValue(null);
  });

  describe("Primary Role Permissions", () => {
    const primaryEvent = {
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123",
            "custom:familyId": "FAMILY#user_123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    test("should allow primary to create budget", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [],
          },
        }),
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "budget:create",
      );
    });

    test("should allow primary to update budget", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "PUT",
        path: "/budget/2026-02",
        pathParameters: { budgetId: "2026-02" },
        body: JSON.stringify({
          groups: {
            income: [],
            savings: [],
            expenses: [],
          },
        }),
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(event, "budget:edit");
    });

    test("should allow primary to delete budget", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "DELETE",
        path: "/budget/2026-02",
        pathParameters: { budgetId: "2026-02" },
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "budget:delete",
      );
    });

    test("should allow primary to view budgets", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "GET",
        path: "/budget",
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(event, "budget:view");
    });
  });

  describe("Spouse Role Permissions", () => {
    const spouseEvent = {
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_456",
            "custom:familyId": "FAMILY#user_123",
            "custom:familyRole": "spouse",
          },
        },
      },
    };

    test("should allow spouse to create budget", async () => {
      const event = {
        ...spouseEvent,
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [],
          },
        }),
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "budget:create",
      );
    });

    test("should allow spouse to update budget", async () => {
      const event = {
        ...spouseEvent,
        httpMethod: "PUT",
        path: "/budget/2026-02",
        pathParameters: { budgetId: "2026-02" },
        body: JSON.stringify({
          groups: {
            income: [],
            savings: [],
            expenses: [],
          },
        }),
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(event, "budget:edit");
    });

    test("should deny spouse from deleting budget", async () => {
      const event = {
        ...spouseEvent,
        httpMethod: "DELETE",
        path: "/budget/2026-02",
        pathParameters: { budgetId: "2026-02" },
      };

      // Mock permission denial
      shared.checkPermission.mockReturnValue({
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
          message:
            "Role 'spouse' does not have permission to perform action 'budget:delete'",
        }),
      });

      const result = await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "budget:delete",
      );
      expect(result.statusCode).toBe(403);
    });

    test("should allow spouse to view budgets", async () => {
      const event = {
        ...spouseEvent,
        httpMethod: "GET",
        path: "/budget",
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(event, "budget:view");
    });
  });

  describe("Viewer Role Permissions", () => {
    const viewerEvent = {
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_789",
            "custom:familyId": "FAMILY#user_123",
            "custom:familyRole": "viewer",
          },
        },
      },
    };

    test("should deny viewer from creating budget", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [],
          },
        }),
      };

      // Mock permission denial
      shared.checkPermission.mockReturnValue({
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
          message:
            "Role 'viewer' does not have permission to perform action 'budget:create'",
        }),
      });

      const result = await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "budget:create",
      );
      expect(result.statusCode).toBe(403);
    });

    test("should deny viewer from updating budget", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "PUT",
        path: "/budget/2026-02",
        pathParameters: { budgetId: "2026-02" },
        body: JSON.stringify({
          groups: {
            income: [],
            savings: [],
            expenses: [],
          },
        }),
      };

      // Mock permission denial
      shared.checkPermission.mockReturnValue({
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
          message:
            "Role 'viewer' does not have permission to perform action 'budget:edit'",
        }),
      });

      const result = await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(event, "budget:edit");
      expect(result.statusCode).toBe(403);
    });

    test("should deny viewer from deleting budget", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "DELETE",
        path: "/budget/2026-02",
        pathParameters: { budgetId: "2026-02" },
      };

      // Mock permission denial
      shared.checkPermission.mockReturnValue({
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
          message:
            "Role 'viewer' does not have permission to perform action 'budget:delete'",
        }),
      });

      const result = await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "budget:delete",
      );
      expect(result.statusCode).toBe(403);
    });

    test("should allow viewer to view budgets", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "GET",
        path: "/budget",
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(event, "budget:view");
    });
  });

  describe("Permission Violation Logging", () => {
    test("should log permission violations", async () => {
      const utils = require("/opt/nodejs/utils");

      // Mock getUserFromEvent to return the viewer user
      utils.getUserFromEvent.mockReturnValue({
        userId: "user_789",
        familyId: "FAMILY#user_123",
        familyRole: "viewer",
      });

      const viewerEvent = {
        requestContext: {
          authorizer: {
            claims: {
              "custom:userId": "user_789",
              "custom:familyId": "FAMILY#user_123",
              "custom:familyRole": "viewer",
            },
          },
        },
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-02",
          groups: {
            income: [],
            savings: [],
            expenses: [],
          },
        }),
      };

      // Mock permission denial
      shared.checkPermission.mockReturnValue({
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
        }),
      });

      await handler(viewerEvent, mockContext);

      // Verify that logger.warn was called for permission denial
      expect(utils.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Permission denied"),
        expect.objectContaining({
          userId: "user_789",
          role: "viewer",
        }),
      );
    });
  });
});
