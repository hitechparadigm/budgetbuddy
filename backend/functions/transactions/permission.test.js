/**
 * Permission System Tests - Transactions Lambda
 *
 * Comprehensive test suite for role-based permission enforcement
 * across transaction operations.
 *
 * Tests cover:
 * - Primary role permissions (full access)
 * - Spouse role permissions (full access)
 * - Viewer role permissions (read-only)
 * - Permission violations and 403 responses
 */

// Enable manual mocks for Lambda layers
jest.mock("/opt/nodejs/utils");
jest.mock("/opt/nodejs/shared");

const { handler } = require("./index");
const shared = require("/opt/nodejs/shared");

describe("Permission System - Transactions Lambda", () => {
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

    test("should allow primary to create transaction", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "POST",
        path: "/transactions",
        body: JSON.stringify({
          amount: 50.0,
          type: "expense",
          categoryId: "cat_groceries",
          description: "Groceries",
          date: "2026-02-01",
        }),
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:create",
      );
    });

    test("should allow primary to update transaction", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "PUT",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
        body: JSON.stringify({
          amount: 75.0,
          description: "Updated groceries",
        }),
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:edit",
      );
    });

    test("should allow primary to delete transaction", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "DELETE",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:delete",
      );
    });

    test("should allow primary to view transactions", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "GET",
        path: "/transactions",
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:view",
      );
    });

    test("should allow primary to view specific transaction", async () => {
      const event = {
        ...primaryEvent,
        httpMethod: "GET",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:view",
      );
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

    test("should allow spouse to create transaction", async () => {
      const event = {
        ...spouseEvent,
        httpMethod: "POST",
        path: "/transactions",
        body: JSON.stringify({
          amount: 50.0,
          type: "expense",
          categoryId: "cat_groceries",
          description: "Groceries",
          date: "2026-02-01",
        }),
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:create",
      );
    });

    test("should allow spouse to update transaction", async () => {
      const event = {
        ...spouseEvent,
        httpMethod: "PUT",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
        body: JSON.stringify({
          amount: 75.0,
        }),
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:edit",
      );
    });

    test("should allow spouse to delete transaction", async () => {
      const event = {
        ...spouseEvent,
        httpMethod: "DELETE",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:delete",
      );
    });

    test("should allow spouse to view transactions", async () => {
      const event = {
        ...spouseEvent,
        httpMethod: "GET",
        path: "/transactions",
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:view",
      );
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

    test("should deny viewer from creating transaction", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "POST",
        path: "/transactions",
        body: JSON.stringify({
          amount: 50.0,
          type: "expense",
          categoryId: "cat_groceries",
          description: "Groceries",
          date: "2026-02-01",
        }),
      };

      // Mock permission denial
      shared.checkPermission.mockReturnValue({
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
          message:
            "Role 'viewer' does not have permission to perform action 'transaction:create'",
        }),
      });

      const result = await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:create",
      );
      expect(result.statusCode).toBe(403);
    });

    test("should deny viewer from updating transaction", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "PUT",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
        body: JSON.stringify({
          amount: 75.0,
        }),
      };

      // Mock permission denial
      shared.checkPermission.mockReturnValue({
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
          message:
            "Role 'viewer' does not have permission to perform action 'transaction:edit'",
        }),
      });

      const result = await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:edit",
      );
      expect(result.statusCode).toBe(403);
    });

    test("should deny viewer from deleting transaction", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "DELETE",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
      };

      // Mock permission denial
      shared.checkPermission.mockReturnValue({
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
          message:
            "Role 'viewer' does not have permission to perform action 'transaction:delete'",
        }),
      });

      const result = await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:delete",
      );
      expect(result.statusCode).toBe(403);
    });

    test("should allow viewer to view transactions", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "GET",
        path: "/transactions",
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:view",
      );
    });

    test("should allow viewer to view specific transaction", async () => {
      const event = {
        ...viewerEvent,
        httpMethod: "GET",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
      };

      await handler(event, mockContext);

      expect(shared.checkPermission).toHaveBeenCalledWith(
        event,
        "transaction:view",
      );
    });
  });

  describe("Permission Violation Logging", () => {
    test("should log permission violations for transaction creation", async () => {
      const utils = require("/opt/nodejs/utils");
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
        path: "/transactions",
        body: JSON.stringify({
          amount: 50.0,
          type: "expense",
          categoryId: "cat_groceries",
          description: "Groceries",
          date: "2026-02-01",
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
          role: "viewer",
        }),
      );
    });

    test("should log permission violations for transaction updates", async () => {
      const utils = require("/opt/nodejs/utils");
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
        httpMethod: "PUT",
        path: "/transactions/txn_123",
        pathParameters: { transactionId: "txn_123" },
        body: JSON.stringify({
          amount: 75.0,
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
          role: "viewer",
          transactionId: "txn_123",
        }),
      );
    });
  });
});
