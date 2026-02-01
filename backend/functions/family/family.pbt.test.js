/**
 * Property-Based Tests for Family Lambda Function
 *
 * Uses fast-check to verify correctness properties across many random inputs.
 *
 * Phase 10 Tasks:
 * - 10.1: Permission matrix - random role/action combinations
 * - 10.2: Invitation expiration - random timestamps, 7-day expiry logic
 * - 10.3: Family size limits - verify family never exceeds 2 members
 * - 10.4: Data isolation - verify users can only access their family data
 */

const fc = require("fast-check");

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

/**
 * Helper to create user claims for testing
 */
function createUserClaims(userId, familyId, role) {
  return {
    "custom:userId": userId,
    "custom:familyId": familyId,
    "custom:familyRole": role,
  };
}

/**
 * Helper to create event with user context
 */
function createEvent(method, path, claims, body = null, pathParams = null) {
  const event = {
    httpMethod: method,
    path,
    requestContext: {
      authorizer: { claims },
    },
  };
  if (body) {
    event.body = JSON.stringify(body);
  }
  if (pathParams) {
    event.pathParameters = pathParams;
  }
  return event;
}

describe("Property-Based Tests: Family Lambda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Task 10.1: Permission Matrix Property Tests
   * **Validates: Requirements US-3, FR-3**
   *
   * Property: For any role and action combination, permissions are enforced correctly
   * - Primary can: invite, update roles, remove members, view members
   * - Spouse can: view members, leave family
   * - Viewer can: view members, leave family
   * - No role can: remove self, change own role
   */
  describe("Task 10.1: Permission Matrix Properties", () => {
    // Define the permission matrix
    const PERMISSION_MATRIX = {
      primary: {
        invite: true,
        updateRole: true,
        removeMember: true,
        viewMembers: true,
        leaveFamily: false, // Primary cannot leave
      },
      spouse: {
        invite: false,
        updateRole: false,
        removeMember: false,
        viewMembers: true,
        leaveFamily: true,
      },
      viewer: {
        invite: false,
        updateRole: false,
        removeMember: false,
        viewMembers: true,
        leaveFamily: true,
      },
    };

    const roleArbitrary = fc.constantFrom("primary", "spouse", "viewer");
    const actionArbitrary = fc.constantFrom(
      "invite",
      "updateRole",
      "removeMember",
      "viewMembers",
      "leaveFamily",
    );

    it("should enforce permission matrix for all role/action combinations", async () => {
      await fc.assert(
        fc.asyncProperty(
          roleArbitrary,
          actionArbitrary,
          fc.uuid(),
          fc.uuid(),
          async (role, action, userId, familyId) => {
            const claims = createUserClaims(userId, familyId, role);
            const expectedAllowed = PERMISSION_MATRIX[role][action];

            let event;
            let result;

            // Reset mocks for each iteration
            mockSend.mockReset();

            switch (action) {
              case "invite":
                event = createEvent("POST", "/family/invite", claims, {
                  email: "test@example.com",
                  role: "spouse",
                });
                if (expectedAllowed) {
                  // Mock successful invite flow
                  mockSend.mockResolvedValueOnce({
                    Item: { familyId, memberCount: 1 },
                  });
                  mockSend.mockResolvedValueOnce({ Items: [] });
                  mockSend.mockResolvedValueOnce({});
                }
                result = await handler(event);
                break;

              case "updateRole":
                event = createEvent(
                  "PUT",
                  "/family/members/target-user",
                  claims,
                  { role: "viewer" },
                  { userId: "target-user" },
                );
                if (expectedAllowed) {
                  mockSend.mockResolvedValueOnce({
                    Item: { userId: "target-user", role: "spouse" },
                  });
                  mockSend.mockResolvedValueOnce({});
                }
                result = await handler(event);
                break;

              case "removeMember":
                event = createEvent(
                  "DELETE",
                  "/family/members/target-user",
                  claims,
                  null,
                  { userId: "target-user" },
                );
                if (expectedAllowed) {
                  mockSend.mockResolvedValueOnce({
                    Item: { userId: "target-user", role: "spouse" },
                  });
                  mockSend.mockResolvedValueOnce({});
                  mockSend.mockResolvedValueOnce({});
                }
                result = await handler(event);
                break;

              case "viewMembers":
                event = createEvent("GET", "/family/members", claims);
                // Always mock successful response for view
                mockSend.mockResolvedValueOnce({ Items: [{ userId, role }] });
                mockSend.mockResolvedValueOnce({
                  Item: { email: "test@example.com", firstName: "Test" },
                });
                result = await handler(event);
                break;

              case "leaveFamily":
                event = createEvent("POST", "/family/leave", claims);
                if (expectedAllowed) {
                  mockSend.mockResolvedValueOnce({});
                  mockSend.mockResolvedValueOnce({});
                  mockSend.mockResolvedValueOnce({});
                  mockSend.mockResolvedValueOnce({});
                }
                result = await handler(event);
                break;
            }

            // Verify permission enforcement
            if (expectedAllowed) {
              expect(result.statusCode).toBeLessThan(400);
            } else {
              expect(result.statusCode).toBe(403);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should never allow any role to remove themselves", async () => {
      await fc.assert(
        fc.asyncProperty(
          roleArbitrary,
          fc.uuid(),
          fc.uuid(),
          async (role, userId, familyId) => {
            // Only primary can attempt removal, but should fail for self
            if (role !== "primary") return true;

            mockSend.mockReset();
            const claims = createUserClaims(userId, familyId, role);
            const event = createEvent(
              "DELETE",
              `/family/members/${userId}`,
              claims,
              null,
              { userId },
            );

            const result = await handler(event);

            // Should always be rejected (400 - Cannot remove yourself)
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toContain(
              "Cannot remove yourself",
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should never allow any role to change their own role", async () => {
      await fc.assert(
        fc.asyncProperty(
          roleArbitrary,
          fc.uuid(),
          fc.uuid(),
          fc.constantFrom("spouse", "viewer"),
          async (role, userId, familyId, newRole) => {
            // Only primary can attempt role change, but should fail for self
            if (role !== "primary") return true;

            mockSend.mockReset();
            const claims = createUserClaims(userId, familyId, role);
            const event = createEvent(
              "PUT",
              `/family/members/${userId}`,
              claims,
              { role: newRole },
              { userId },
            );

            const result = await handler(event);

            // Should always be rejected (400 - Cannot change your own role)
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toContain(
              "Cannot change your own role",
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Task 10.2: Invitation Expiration Property Tests
   * **Validates: Requirements FR-1.2, NFR-2.2**
   *
   * Property: Invitations expire exactly after 7 days
   * - Invitations created < 7 days ago should be valid
   * - Invitations created >= 7 days ago should be expired
   * - Edge case: exactly 7 days should be expired
   */
  describe("Task 10.2: Invitation Expiration Properties", () => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Generate timestamps within reasonable range (past year to now)
    const timestampArbitrary = fc.integer({
      min: Date.now() - 365 * 24 * 60 * 60 * 1000,
      max: Date.now() + 24 * 60 * 60 * 1000,
    });

    it("should accept invitations created less than 7 days ago", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: SEVEN_DAYS_MS - 1000 }), // 1ms to just under 7 days
          fc.uuid(),
          fc.uuid(),
          async (ageMs, userId, familyId) => {
            mockSend.mockReset();

            const createdAt = Date.now() - ageMs;
            const expiresAt = new Date(createdAt + SEVEN_DAYS_MS).toISOString();
            const token = "valid-token-" + userId;
            const hashedToken = require("crypto")
              .createHash("sha256")
              .update(token)
              .digest("hex");

            const claims = createUserClaims(userId, familyId, "primary");
            const event = createEvent(
              "POST",
              "/family/accept-invitation",
              claims,
              { token },
            );

            // Mock finding the invitation
            mockSend.mockResolvedValueOnce({
              Items: [
                {
                  PK: "INVITATION#inv-123",
                  SK: "METADATA",
                  familyId: "target-family",
                  role: "spouse",
                  token: hashedToken,
                  status: "pending",
                  expiresAt,
                  invitedBy: "inviter-user",
                },
              ],
            });
            // Mock family metadata
            mockSend.mockResolvedValueOnce({
              Item: {
                familyId: "target-family",
                memberCount: 1,
                primaryUserId: "inviter-user",
              },
            });
            // Mock add member, update count, update invitation
            mockSend.mockResolvedValueOnce({});
            mockSend.mockResolvedValueOnce({});
            mockSend.mockResolvedValueOnce({});

            const result = await handler(event);

            // Should be accepted (200)
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).familyId).toBe("target-family");

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invitations created 7 or more days ago", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }), // 0 to 30 days past expiry
          fc.uuid(),
          fc.uuid(),
          async (extraMs, userId, familyId) => {
            mockSend.mockReset();

            // Create invitation that expired extraMs ago
            const ageMs = SEVEN_DAYS_MS + extraMs;
            const createdAt = Date.now() - ageMs;
            const expiresAt = new Date(createdAt + SEVEN_DAYS_MS).toISOString();
            const token = "expired-token-" + userId;
            const hashedToken = require("crypto")
              .createHash("sha256")
              .update(token)
              .digest("hex");

            const claims = createUserClaims(userId, familyId, "primary");
            const event = createEvent(
              "POST",
              "/family/accept-invitation",
              claims,
              { token },
            );

            // Mock finding the expired invitation
            mockSend.mockResolvedValueOnce({
              Items: [
                {
                  PK: "INVITATION#inv-expired",
                  SK: "METADATA",
                  familyId: "target-family",
                  role: "spouse",
                  token: hashedToken,
                  status: "pending",
                  expiresAt,
                  invitedBy: "inviter-user",
                },
              ],
            });
            // Mock update invitation status to expired
            mockSend.mockResolvedValueOnce({});

            const result = await handler(event);

            // Should be rejected (400 - expired)
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toContain("expired");

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle edge case: exactly 7 days old invitation", async () => {
      mockSend.mockReset();

      // Exactly 7 days ago
      const createdAt = Date.now() - SEVEN_DAYS_MS;
      const expiresAt = new Date(createdAt + SEVEN_DAYS_MS).toISOString();
      const token = "edge-case-token";
      const hashedToken = require("crypto")
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const claims = createUserClaims("user-123", "family-123", "primary");
      const event = createEvent("POST", "/family/accept-invitation", claims, {
        token,
      });

      // Mock finding the invitation at exactly 7 days
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: "INVITATION#inv-edge",
            SK: "METADATA",
            familyId: "target-family",
            role: "spouse",
            token: hashedToken,
            status: "pending",
            expiresAt,
            invitedBy: "inviter-user",
          },
        ],
      });
      // Mock update invitation status to expired
      mockSend.mockResolvedValueOnce({});

      const result = await handler(event);

      // Should be rejected (400 - expired) - exactly 7 days means expired
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain("expired");
    });
  });

  /**
   * Task 10.3: Family Size Limits Property Tests
   * **Validates: Requirements FR-2.5**
   *
   * Property: Family can never exceed 2 members
   * - Invitations should be rejected when family has 2 members
   * - Accepting invitation should be rejected when family is full
   */
  describe("Task 10.3: Family Size Limits Properties", () => {
    const memberCountArbitrary = fc.integer({ min: 0, max: 10 });

    it("should reject invitations when family has 2 or more members", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }), // 2 to 10 members
          fc.uuid(),
          fc.uuid(),
          fc.emailAddress(),
          async (memberCount, userId, familyId, email) => {
            mockSend.mockReset();

            const claims = createUserClaims(userId, familyId, "primary");
            const event = createEvent("POST", "/family/invite", claims, {
              email,
              role: "spouse",
            });

            // Mock family with memberCount >= 2
            mockSend.mockResolvedValueOnce({
              Item: { familyId, memberCount },
            });

            const result = await handler(event);

            // Should be rejected (409 - Family is full)
            expect(result.statusCode).toBe(409);
            expect(JSON.parse(result.body).error).toContain("full");

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should allow invitations when family has less than 2 members", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1 }), // 0 or 1 member
          fc.uuid(),
          fc.uuid(),
          async (memberCount, userId, familyId) => {
            mockSend.mockReset();

            const claims = createUserClaims(userId, familyId, "primary");
            const event = createEvent("POST", "/family/invite", claims, {
              email: "partner@example.com",
              role: "spouse",
            });

            // Mock family with memberCount < 2
            mockSend.mockResolvedValueOnce({
              Item: { familyId, memberCount },
            });
            // Mock no existing invitations
            mockSend.mockResolvedValueOnce({ Items: [] });
            // Mock put invitation
            mockSend.mockResolvedValueOnce({});

            const result = await handler(event);

            // Should be accepted (201)
            expect(result.statusCode).toBe(201);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject accepting invitation when family is full", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }), // 2 to 10 members
          fc.uuid(),
          fc.uuid(),
          async (memberCount, userId, familyId) => {
            mockSend.mockReset();

            const token = "valid-token-" + userId;
            const hashedToken = require("crypto")
              .createHash("sha256")
              .update(token)
              .digest("hex");
            const futureDate = new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString();

            const claims = createUserClaims(userId, familyId, "primary");
            const event = createEvent(
              "POST",
              "/family/accept-invitation",
              claims,
              { token },
            );

            // Mock finding valid invitation
            mockSend.mockResolvedValueOnce({
              Items: [
                {
                  PK: "INVITATION#inv-123",
                  SK: "METADATA",
                  familyId: "target-family",
                  role: "spouse",
                  token: hashedToken,
                  status: "pending",
                  expiresAt: futureDate,
                },
              ],
            });
            // Mock family already full
            mockSend.mockResolvedValueOnce({
              Item: { familyId: "target-family", memberCount },
            });

            const result = await handler(event);

            // Should be rejected (409 - Family is full)
            expect(result.statusCode).toBe(409);
            expect(JSON.parse(result.body).error).toContain("full");

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Task 10.4: Data Isolation Property Tests
   * **Validates: Requirements NFR-2.4**
   *
   * Property: Users can only access data from their own family
   * - Users should only see members from their family
   * - Users cannot modify members from other families
   * - Cross-family access attempts should be rejected
   */
  describe("Task 10.4: Data Isolation Properties", () => {
    const familyIdArbitrary = fc.uuid();
    const userIdArbitrary = fc.uuid();

    it("should only return members from the user's own family", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (userId, familyId, memberIds) => {
            mockSend.mockReset();

            const claims = createUserClaims(userId, familyId, "primary");
            const event = createEvent("GET", "/family/members", claims);

            // Mock query returns members for THIS family only
            const familyMembers = memberIds.map((id, idx) => ({
              userId: id,
              role: idx === 0 ? "primary" : "spouse",
              joinedAt: new Date().toISOString(),
            }));

            mockSend.mockResolvedValueOnce({ Items: familyMembers });

            // Mock user profiles for each member
            for (const memberId of memberIds) {
              mockSend.mockResolvedValueOnce({
                Item: { email: `${memberId}@example.com`, firstName: "User" },
              });
            }

            const result = await handler(event);
            const body = JSON.parse(result.body);

            // Should return 200 with members
            expect(result.statusCode).toBe(200);
            expect(body.familyId).toBe(familyId);
            expect(body.members.length).toBe(memberIds.length);

            // All returned members should have emails (from our mocks)
            body.members.forEach((member) => {
              expect(member.email).toContain("@example.com");
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not allow modifying members from other families", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (userId, userFamilyId, targetUserId) => {
            mockSend.mockReset();

            // User tries to update a member
            const claims = createUserClaims(userId, userFamilyId, "primary");
            const event = createEvent(
              "PUT",
              `/family/members/${targetUserId}`,
              claims,
              { role: "viewer" },
              { userId: targetUserId },
            );

            // Mock: member not found in user's family (because they're in different family)
            mockSend.mockResolvedValueOnce({ Item: null });

            const result = await handler(event);

            // Should return 404 - member not found (in this family)
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).error).toContain("Member not found");

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not allow removing members from other families", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (userId, userFamilyId, targetUserId) => {
            // Skip if trying to remove self (different error)
            if (userId === targetUserId) return true;

            mockSend.mockReset();

            const claims = createUserClaims(userId, userFamilyId, "primary");
            const event = createEvent(
              "DELETE",
              `/family/members/${targetUserId}`,
              claims,
              null,
              { userId: targetUserId },
            );

            // Mock: member not found in user's family
            mockSend.mockResolvedValueOnce({ Item: null });

            const result = await handler(event);

            // Should return 404 - member not found
            expect(result.statusCode).toBe(404);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should isolate family data across random family/user combinations", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.uuid(),
              familyId: fc.uuid(),
              role: fc.constantFrom("primary", "spouse", "viewer"),
            }),
            { minLength: 2, maxLength: 5 },
          ),
          async (users) => {
            // For each user, verify they can only access their own family
            for (const user of users) {
              mockSend.mockReset();

              const claims = createUserClaims(
                user.userId,
                user.familyId,
                user.role,
              );
              const event = createEvent("GET", "/family/members", claims);

              // Mock returns members for THIS user's family
              mockSend.mockResolvedValueOnce({
                Items: [{ userId: user.userId, role: user.role }],
              });
              mockSend.mockResolvedValueOnce({
                Item: {
                  email: `${user.userId}@example.com`,
                  firstName: "User",
                },
              });

              const result = await handler(event);
              const body = JSON.parse(result.body);

              // Verify response is for the correct family
              expect(result.statusCode).toBe(200);
              expect(body.familyId).toBe(user.familyId);
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
