/**
 * Unit tests for Family Lambda Function
 */

// Mock AWS SDK v3 before requiring the handler
const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend,
    })),
  },
  GetCommand: jest.fn((params) => ({ type: "Get", params })),
  PutCommand: jest.fn((params) => ({ type: "Put", params })),
  UpdateCommand: jest.fn((params) => ({ type: "Update", params })),
  DeleteCommand: jest.fn((params) => ({ type: "Delete", params })),
  QueryCommand: jest.fn((params) => ({ type: "Query", params })),
  ScanCommand: jest.fn((params) => ({ type: "Scan", params })),
}));

const { handler } = require("./index");

describe("Family Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return 200 for health check without authentication", async () => {
      const event = {
        httpMethod: "GET",
        path: "/family/health",
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        status: "healthy",
        service: "family",
      });
    });

    it("should handle /v1/family/health path", async () => {
      const event = {
        httpMethod: "GET",
        path: "/v1/family/health",
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        status: "healthy",
        service: "family",
      });
    });
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS requests", async () => {
      const event = {
        httpMethod: "OPTIONS",
        path: "/family/invite",
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("Authentication", () => {
    it("should return 401 if no user context", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/invite",
        body: JSON.stringify({ email: "test@example.com", role: "spouse" }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error).toContain("Unauthorized");
    });
  });

  describe("Invite Endpoint", () => {
    const mockUser = {
      "custom:userId": "user123",
      "custom:familyId": "family123",
      "custom:familyRole": "primary",
    };

    it("should send invitation successfully", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/invite",
        body: JSON.stringify({ email: "partner@example.com", role: "spouse" }),
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      // Mock Get (family metadata)
      mockSend.mockResolvedValueOnce({
        Item: {
          familyId: "family123",
          memberCount: 1,
        },
      });

      // Mock Query (existing invitations)
      mockSend.mockResolvedValueOnce({
        Items: [],
      });

      // Mock Put (create invitation)
      mockSend.mockResolvedValueOnce({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.email).toBe("partner@example.com");
      expect(body.role).toBe("spouse");
      expect(body.status).toBe("pending");
      expect(body.token).toBeDefined();
    });

    it("should reject invitation if not primary user", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/invite",
        body: JSON.stringify({ email: "partner@example.com", role: "spouse" }),
        requestContext: {
          authorizer: {
            claims: {
              ...mockUser,
              "custom:familyRole": "spouse",
            },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error).toContain("Only primary user");
    });

    it("should reject invitation if family is full", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/invite",
        body: JSON.stringify({ email: "partner@example.com", role: "spouse" }),
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      mockSend.mockResolvedValueOnce({
        Item: {
          familyId: "family123",
          memberCount: 2,
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(409);
      expect(JSON.parse(result.body).error).toContain("Family is full");
    });

    it("should reject invalid email", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/invite",
        body: JSON.stringify({ email: "invalid-email", role: "spouse" }),
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain("Invalid email");
    });

    it("should reject invalid role", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/invite",
        body: JSON.stringify({ email: "partner@example.com", role: "admin" }),
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain("Invalid role");
    });
  });

  describe("Accept Invitation Endpoint", () => {
    const mockUser = {
      "custom:userId": "user456",
      "custom:familyId": "family456",
      "custom:familyRole": "primary",
    };

    it("should accept invitation successfully", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/accept-invitation",
        body: JSON.stringify({ token: "valid-token" }),
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();

      // Mock Scan (find invitation)
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: "INVITATION#inv123",
            SK: "METADATA",
            invitationId: "inv123",
            familyId: "family123",
            role: "spouse",
            status: "pending",
            expiresAt: futureDate,
            invitedBy: "user123",
          },
        ],
      });

      // Mock Get (family metadata)
      mockSend.mockResolvedValueOnce({
        Item: {
          familyId: "family123",
          memberCount: 1,
          primaryUserId: "user123",
          subscriptionTier: "free",
        },
      });

      // Mock Put (add member)
      mockSend.mockResolvedValueOnce({});
      // Mock Update (member count)
      mockSend.mockResolvedValueOnce({});
      // Mock Update (invitation status)
      mockSend.mockResolvedValueOnce({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.familyId).toBe("family123");
      expect(body.role).toBe("spouse");
    });

    it("should reject expired invitation", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/accept-invitation",
        body: JSON.stringify({ token: "expired-token" }),
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Mock Scan (find invitation)
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: "INVITATION#inv123",
            SK: "METADATA",
            invitationId: "inv123",
            familyId: "family123",
            role: "spouse",
            status: "pending",
            expiresAt: pastDate,
          },
        ],
      });

      // Mock Update (set expired status)
      mockSend.mockResolvedValueOnce({});

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain("expired");
    });
  });

  describe("Get Members Endpoint", () => {
    const mockUser = {
      "custom:userId": "user123",
      "custom:familyId": "family123",
      "custom:familyRole": "primary",
    };

    it("should return family members", async () => {
      const event = {
        httpMethod: "GET",
        path: "/family/members",
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      // Mock Query (family members)
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            userId: "user123",
            role: "primary",
            joinedAt: "2026-01-01T00:00:00Z",
          },
        ],
      });

      // Mock Get (user profile)
      mockSend.mockResolvedValueOnce({
        Item: {
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.members).toHaveLength(1);
      expect(body.members[0].email).toBe("user@example.com");
    });
  });

  describe("Update Role Endpoint", () => {
    const mockUser = {
      "custom:userId": "user123",
      "custom:familyId": "family123",
      "custom:familyRole": "primary",
    };

    it("should update member role successfully", async () => {
      const event = {
        httpMethod: "PUT",
        path: "/family/members/user456",
        pathParameters: { userId: "user456" },
        body: JSON.stringify({ role: "viewer" }),
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      // Mock Get (member exists)
      mockSend.mockResolvedValueOnce({
        Item: {
          userId: "user456",
          role: "spouse",
        },
      });

      // Mock Update (role)
      mockSend.mockResolvedValueOnce({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.role).toBe("viewer");
    });

    it("should reject if not primary user", async () => {
      const event = {
        httpMethod: "PUT",
        path: "/family/members/user456",
        pathParameters: { userId: "user456" },
        body: JSON.stringify({ role: "viewer" }),
        requestContext: {
          authorizer: {
            claims: {
              ...mockUser,
              "custom:familyRole": "spouse",
            },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
    });
  });

  describe("Remove Member Endpoint", () => {
    const mockUser = {
      "custom:userId": "user123",
      "custom:familyId": "family123",
      "custom:familyRole": "primary",
    };

    it("should remove member successfully", async () => {
      const event = {
        httpMethod: "DELETE",
        path: "/family/members/user456",
        pathParameters: { userId: "user456" },
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      // Mock Get (member exists)
      mockSend.mockResolvedValueOnce({
        Item: {
          userId: "user456",
          role: "spouse",
        },
      });

      // Mock Delete (member)
      mockSend.mockResolvedValueOnce({});
      // Mock Update (member count)
      mockSend.mockResolvedValueOnce({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toContain("removed successfully");
    });

    it("should prevent removing self", async () => {
      const event = {
        httpMethod: "DELETE",
        path: "/family/members/user123",
        pathParameters: { userId: "user123" },
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain("Cannot remove yourself");
    });
  });

  describe("Leave Family Endpoint", () => {
    const mockUser = {
      "custom:userId": "user456",
      "custom:familyId": "family123",
      "custom:familyRole": "spouse",
    };

    it("should leave family successfully", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/leave",
        requestContext: {
          authorizer: {
            claims: mockUser,
          },
        },
      };

      // Mock Put (new family metadata)
      mockSend.mockResolvedValueOnce({});
      // Mock Put (new family member)
      mockSend.mockResolvedValueOnce({});
      // Mock Delete (old family member)
      mockSend.mockResolvedValueOnce({});
      // Mock Update (old family member count)
      mockSend.mockResolvedValueOnce({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toContain("Left family successfully");
      expect(body.newFamilyId).toBeDefined();
    });

    it("should prevent primary user from leaving", async () => {
      const event = {
        httpMethod: "POST",
        path: "/family/leave",
        requestContext: {
          authorizer: {
            claims: {
              ...mockUser,
              "custom:familyRole": "primary",
            },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error).toContain(
        "Primary user cannot leave",
      );
    });
  });
});
