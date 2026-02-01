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

  /**
   * Integration Tests - Task 9.1: Test Invitation Flow
   * Tests the complete end-to-end flows for invitation system
   * Requirements: US-1, US-2, FR-1
   */
  describe("Integration: Invitation Flow (Task 9.1)", () => {
    const crypto = require("crypto");
    const primaryUser = {
      "custom:userId": "primary-user-123",
      "custom:familyId": "family-456",
      "custom:familyRole": "primary",
    };
    const invitedEmail = "partner@example.com";

    describe("Step 1: Send Invitation", () => {
      it("should successfully send invitation as primary user", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/invite",
          body: JSON.stringify({ email: invitedEmail, role: "spouse" }),
          requestContext: {
            authorizer: { claims: primaryUser },
          },
        };

        // Mock Get (family metadata)
        mockSend.mockResolvedValueOnce({
          Item: { familyId: "family-456", memberCount: 1 },
        });
        // Mock Query (existing invitations)
        mockSend.mockResolvedValueOnce({ Items: [] });
        // Mock Put (create invitation)
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(201);
        expect(body.email).toBe(invitedEmail);
        expect(body.role).toBe("spouse");
        expect(body.status).toBe("pending");
        expect(body.token).toBeDefined();
        expect(body.expiresAt).toBeDefined();
      });

      it("should reject duplicate pending invitation", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/invite",
          body: JSON.stringify({ email: invitedEmail, role: "spouse" }),
          requestContext: {
            authorizer: { claims: primaryUser },
          },
        };

        // Mock Get (family metadata)
        mockSend.mockResolvedValueOnce({
          Item: { familyId: "family-456", memberCount: 1 },
        });
        // Mock Query (existing pending invitation)
        mockSend.mockResolvedValueOnce({
          Items: [{ invitationId: "existing-inv", status: "pending" }],
        });

        const result = await handler(event);

        expect(result.statusCode).toBe(409);
        expect(JSON.parse(result.body).error).toContain(
          "Pending invitation already exists",
        );
      });
    });

    describe("Step 2: Accept Invitation", () => {
      const validToken = "valid-token-xyz";
      const hashedValidToken = crypto
        .createHash("sha256")
        .update(validToken)
        .digest("hex");
      const acceptingUser = {
        "custom:userId": "accepting-user-999",
        "custom:familyId": "temp-family",
        "custom:familyRole": "primary",
      };

      it("should successfully accept valid invitation", async () => {
        const futureDate = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const event = {
          httpMethod: "POST",
          path: "/family/accept-invitation",
          body: JSON.stringify({ token: validToken }),
          requestContext: {
            authorizer: { claims: acceptingUser },
          },
        };

        // Mock Scan (find invitation)
        mockSend.mockResolvedValueOnce({
          Items: [
            {
              PK: "INVITATION#inv-123",
              SK: "METADATA",
              familyId: "family-456",
              role: "spouse",
              token: hashedValidToken,
              status: "pending",
              expiresAt: futureDate,
              invitedBy: "primary-user-123",
            },
          ],
        });
        // Mock Get (family metadata)
        mockSend.mockResolvedValueOnce({
          Item: {
            familyId: "family-456",
            memberCount: 1,
            primaryUserId: "primary-user-123",
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
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body.familyId).toBe("family-456");
        expect(body.role).toBe("spouse");
        expect(body.family.memberCount).toBe(2);
      });

      it("should reject expired invitation", async () => {
        const pastDate = new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString();

        const event = {
          httpMethod: "POST",
          path: "/family/accept-invitation",
          body: JSON.stringify({ token: validToken }),
          requestContext: {
            authorizer: { claims: acceptingUser },
          },
        };

        // Mock Scan (find expired invitation)
        mockSend.mockResolvedValueOnce({
          Items: [
            {
              PK: "INVITATION#inv-expired",
              SK: "METADATA",
              familyId: "family-456",
              token: hashedValidToken,
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

      it("should reject invalid token", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/accept-invitation",
          body: JSON.stringify({ token: "invalid-token" }),
          requestContext: {
            authorizer: { claims: acceptingUser },
          },
        };

        // Mock Scan (no matching invitation)
        mockSend.mockResolvedValueOnce({ Items: [] });

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body).error).toContain("not found");
      });

      it("should reject when family is full", async () => {
        const futureDate = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const event = {
          httpMethod: "POST",
          path: "/family/accept-invitation",
          body: JSON.stringify({ token: validToken }),
          requestContext: {
            authorizer: { claims: acceptingUser },
          },
        };

        // Mock Scan (find invitation)
        mockSend.mockResolvedValueOnce({
          Items: [
            {
              PK: "INVITATION#inv-123",
              SK: "METADATA",
              familyId: "family-456",
              role: "spouse",
              token: hashedValidToken,
              status: "pending",
              expiresAt: futureDate,
            },
          ],
        });
        // Mock Get (family already full)
        mockSend.mockResolvedValueOnce({
          Item: {
            familyId: "family-456",
            memberCount: 2,
          },
        });

        const result = await handler(event);

        expect(result.statusCode).toBe(409);
        expect(JSON.parse(result.body).error).toContain("full");
      });
    });

    describe("Step 3: Verify Family Membership", () => {
      it("should show members in family list after acceptance", async () => {
        const event = {
          httpMethod: "GET",
          path: "/family/members",
          requestContext: {
            authorizer: { claims: primaryUser },
          },
        };

        // Mock Query (family members)
        mockSend.mockResolvedValueOnce({
          Items: [
            {
              userId: "primary-user-123",
              role: "primary",
              joinedAt: "2026-01-01T00:00:00Z",
            },
            {
              userId: "spouse-user",
              role: "spouse",
              joinedAt: "2026-01-31T12:00:00Z",
            },
          ],
        });
        // Mock Get (primary user profile)
        mockSend.mockResolvedValueOnce({
          Item: {
            email: "primary@example.com",
            firstName: "John",
            lastName: "Doe",
          },
        });
        // Mock Get (spouse user profile)
        mockSend.mockResolvedValueOnce({
          Item: { email: invitedEmail, firstName: "Jane", lastName: "Doe" },
        });

        const result = await handler(event);
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body.members).toHaveLength(2);
        expect(body.members[0].role).toBe("primary");
        expect(body.members[1].role).toBe("spouse");
      });
    });
  });

  /**
   * Integration Tests - Task 9.2: Test Permission Enforcement
   * Tests role-based access control for all family operations
   * Requirements: US-3, FR-3
   */
  describe("Integration: Permission Enforcement (Task 9.2)", () => {
    const primaryUser = {
      "custom:userId": "primary-user-123",
      "custom:familyId": "family-456",
      "custom:familyRole": "primary",
    };
    const spouseUser = {
      "custom:userId": "spouse-user-456",
      "custom:familyId": "family-456",
      "custom:familyRole": "spouse",
    };
    const viewerUser = {
      "custom:userId": "viewer-user-789",
      "custom:familyId": "family-456",
      "custom:familyRole": "viewer",
    };

    describe("Primary User Permissions", () => {
      it("should allow primary to send invitations", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/invite",
          body: JSON.stringify({ email: "new@example.com", role: "spouse" }),
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({
          Item: { familyId: "family-456", memberCount: 1 },
        });
        mockSend.mockResolvedValueOnce({ Items: [] });
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        expect(result.statusCode).toBe(201);
      });

      it("should allow primary to update member roles", async () => {
        const event = {
          httpMethod: "PUT",
          path: "/family/members/spouse-user-456",
          pathParameters: { userId: "spouse-user-456" },
          body: JSON.stringify({ role: "viewer" }),
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({
          Item: { userId: "spouse-user-456", role: "spouse" },
        });
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
      });

      it("should allow primary to remove members", async () => {
        const event = {
          httpMethod: "DELETE",
          path: "/family/members/spouse-user-456",
          pathParameters: { userId: "spouse-user-456" },
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({
          Item: { userId: "spouse-user-456", role: "spouse" },
        });
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
      });
    });

    describe("Spouse Permissions", () => {
      it("should deny spouse from sending invitations", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/invite",
          body: JSON.stringify({ email: "new@example.com", role: "viewer" }),
          requestContext: { authorizer: { claims: spouseUser } },
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(403);
        expect(JSON.parse(result.body).error).toContain("Only primary user");
      });

      it("should deny spouse from updating member roles", async () => {
        const event = {
          httpMethod: "PUT",
          path: "/family/members/viewer-user-789",
          pathParameters: { userId: "viewer-user-789" },
          body: JSON.stringify({ role: "spouse" }),
          requestContext: { authorizer: { claims: spouseUser } },
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(403);
        expect(JSON.parse(result.body).error).toContain("Only primary user");
      });

      it("should deny spouse from removing members", async () => {
        const event = {
          httpMethod: "DELETE",
          path: "/family/members/viewer-user-789",
          pathParameters: { userId: "viewer-user-789" },
          requestContext: { authorizer: { claims: spouseUser } },
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(403);
        expect(JSON.parse(result.body).error).toContain("Only primary user");
      });

      it("should allow spouse to view members", async () => {
        const event = {
          httpMethod: "GET",
          path: "/family/members",
          requestContext: { authorizer: { claims: spouseUser } },
        };

        mockSend.mockResolvedValueOnce({
          Items: [{ userId: "primary-user-123", role: "primary" }],
        });
        mockSend.mockResolvedValueOnce({
          Item: { email: "primary@example.com", firstName: "John" },
        });

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
      });

      it("should allow spouse to leave family", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/leave",
          requestContext: { authorizer: { claims: spouseUser } },
        };

        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).newFamilyId).toBeDefined();
      });
    });

    describe("Viewer Permissions", () => {
      it("should deny viewer from sending invitations", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/invite",
          body: JSON.stringify({ email: "new@example.com", role: "viewer" }),
          requestContext: { authorizer: { claims: viewerUser } },
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(403);
      });

      it("should deny viewer from updating member roles", async () => {
        const event = {
          httpMethod: "PUT",
          path: "/family/members/spouse-user-456",
          pathParameters: { userId: "spouse-user-456" },
          body: JSON.stringify({ role: "viewer" }),
          requestContext: { authorizer: { claims: viewerUser } },
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(403);
      });

      it("should deny viewer from removing members", async () => {
        const event = {
          httpMethod: "DELETE",
          path: "/family/members/spouse-user-456",
          pathParameters: { userId: "spouse-user-456" },
          requestContext: { authorizer: { claims: viewerUser } },
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(403);
      });

      it("should allow viewer to view members", async () => {
        const event = {
          httpMethod: "GET",
          path: "/family/members",
          requestContext: { authorizer: { claims: viewerUser } },
        };

        mockSend.mockResolvedValueOnce({
          Items: [{ userId: "primary-user-123", role: "primary" }],
        });
        mockSend.mockResolvedValueOnce({
          Item: { email: "primary@example.com", firstName: "John" },
        });

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
      });

      it("should allow viewer to leave family", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/leave",
          requestContext: { authorizer: { claims: viewerUser } },
        };

        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
      });
    });
  });

  /**
   * Integration Tests - Task 9.3: Test Member Management
   * Tests role changes, member removal, and leave family functionality
   * Requirements: US-5, US-6
   */
  describe("Integration: Member Management (Task 9.3)", () => {
    const primaryUser = {
      "custom:userId": "primary-user-123",
      "custom:familyId": "family-456",
      "custom:familyRole": "primary",
    };

    describe("Role Changes", () => {
      it("should change spouse to viewer", async () => {
        const event = {
          httpMethod: "PUT",
          path: "/family/members/spouse-user",
          pathParameters: { userId: "spouse-user" },
          body: JSON.stringify({ role: "viewer" }),
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({
          Item: { userId: "spouse-user", role: "spouse" },
        });
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body.role).toBe("viewer");
        expect(body.updatedAt).toBeDefined();
      });

      it("should change viewer to spouse", async () => {
        const event = {
          httpMethod: "PUT",
          path: "/family/members/viewer-user",
          pathParameters: { userId: "viewer-user" },
          body: JSON.stringify({ role: "spouse" }),
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({
          Item: { userId: "viewer-user", role: "viewer" },
        });
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body.role).toBe("spouse");
      });

      it("should reject changing own role", async () => {
        const event = {
          httpMethod: "PUT",
          path: "/family/members/primary-user-123",
          pathParameters: { userId: "primary-user-123" },
          body: JSON.stringify({ role: "viewer" }),
          requestContext: { authorizer: { claims: primaryUser } },
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toContain(
          "Cannot change your own role",
        );
      });

      it("should reject invalid role value", async () => {
        const event = {
          httpMethod: "PUT",
          path: "/family/members/spouse-user",
          pathParameters: { userId: "spouse-user" },
          body: JSON.stringify({ role: "admin" }),
          requestContext: { authorizer: { claims: primaryUser } },
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toContain("Invalid role");
      });

      it("should reject role change for non-existent member", async () => {
        const event = {
          httpMethod: "PUT",
          path: "/family/members/non-existent",
          pathParameters: { userId: "non-existent" },
          body: JSON.stringify({ role: "viewer" }),
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({ Item: null });

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body).error).toContain("Member not found");
      });
    });

    describe("Member Removal", () => {
      it("should remove spouse from family", async () => {
        const event = {
          httpMethod: "DELETE",
          path: "/family/members/spouse-user",
          pathParameters: { userId: "spouse-user" },
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({
          Item: { userId: "spouse-user", role: "spouse" },
        });
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body.message).toContain("removed successfully");
        expect(body.userId).toBe("spouse-user");
      });

      it("should remove viewer from family", async () => {
        const event = {
          httpMethod: "DELETE",
          path: "/family/members/viewer-user",
          pathParameters: { userId: "viewer-user" },
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({
          Item: { userId: "viewer-user", role: "viewer" },
        });
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
      });

      it("should reject removing non-existent member", async () => {
        const event = {
          httpMethod: "DELETE",
          path: "/family/members/non-existent",
          pathParameters: { userId: "non-existent" },
          requestContext: { authorizer: { claims: primaryUser } },
        };

        mockSend.mockResolvedValueOnce({ Item: null });

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
      });
    });

    describe("Leave Family", () => {
      it("should create new family when leaving", async () => {
        const spouseUser = {
          "custom:userId": "spouse-user",
          "custom:familyId": "family-456",
          "custom:familyRole": "spouse",
        };

        const event = {
          httpMethod: "POST",
          path: "/family/leave",
          requestContext: { authorizer: { claims: spouseUser } },
        };

        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);
        const body = JSON.parse(result.body);

        expect(result.statusCode).toBe(200);
        expect(body.message).toContain("Left family successfully");
        expect(body.newFamilyId).toBeDefined();
        expect(body.newFamilyId).not.toBe("family-456");
      });

      it("should prevent primary from leaving", async () => {
        const event = {
          httpMethod: "POST",
          path: "/family/leave",
          requestContext: { authorizer: { claims: primaryUser } },
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(403);
        expect(JSON.parse(result.body).error).toContain(
          "Primary user cannot leave",
        );
      });

      it("should allow viewer to leave", async () => {
        const viewerUser = {
          "custom:userId": "viewer-user",
          "custom:familyId": "family-456",
          "custom:familyRole": "viewer",
        };

        const event = {
          httpMethod: "POST",
          path: "/family/leave",
          requestContext: { authorizer: { claims: viewerUser } },
        };

        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});
        mockSend.mockResolvedValueOnce({});

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
      });
    });
  });
});
