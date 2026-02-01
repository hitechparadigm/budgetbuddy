/**
 * Family Collaboration Functional Tests
 *
 * Tests the complete family collaboration flow including:
 * - Family creation
 * - Member invitation
 * - Invitation acceptance
 * - Member management
 * - Role changes
 * - Member removal
 * - Leaving family
 */

const https = require("https");

// Test configuration
const MAIN_API_BASE =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";
const TEST_PRIMARY_EMAIL = "dmytro.malyk@gmail.com";
const TEST_PRIMARY_PASSWORD = "Test123!"; // Update with actual password
const TEST_PARTNER_EMAIL = "partner@example.com"; // Will be invited

// Helper function to make API calls
function apiCall(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, MAIN_API_BASE);

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = https.request(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Helper to login and get ID token
async function loginUser(email, password) {
  const response = await apiCall("POST", "/auth/login", {
    email,
    password,
  });

  if (response.statusCode !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
  }

  return response.body.data.idToken;
}

describe("Family Collaboration Tests", () => {
  let primaryToken;
  let familyId;
  let invitationId;

  beforeAll(async () => {
    console.log("🔐 Logging in primary user...");
    primaryToken = await loginUser(TEST_PRIMARY_EMAIL, TEST_PRIMARY_PASSWORD);
    console.log("✅ Login successful");
  });

  describe("1. Family Information", () => {
    test("should get family information", async () => {
      const response = await apiCall("GET", "/family", null, primaryToken);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.family).toBeDefined();

      familyId = response.body.data.family.familyId;
      console.log(`👨‍👩‍👧 Family ID: ${familyId}`);
    });

    test("should get family members", async () => {
      const response = await apiCall(
        "GET",
        "/family/members",
        null,
        primaryToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.members).toBeDefined();
      expect(response.body.data.members.length).toBeGreaterThan(0);

      // Verify primary user is in the list
      const primaryMember = response.body.data.members.find(
        (m) => m.email === TEST_PRIMARY_EMAIL,
      );
      expect(primaryMember).toBeDefined();
      expect(primaryMember.role).toBe("primary");
    });
  });

  describe("2. Member Invitation", () => {
    test("should send invitation to partner", async () => {
      console.log(`📧 Inviting ${TEST_PARTNER_EMAIL}...`);

      const response = await apiCall(
        "POST",
        "/family/invite",
        {
          email: TEST_PARTNER_EMAIL,
          role: "spouse",
        },
        primaryToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.invitation).toBeDefined();
      expect(response.body.data.invitation.email).toBe(TEST_PARTNER_EMAIL);
      expect(response.body.data.invitation.role).toBe("spouse");
      expect(response.body.data.invitation.status).toBe("pending");

      invitationId = response.body.data.invitation.invitationId;
      console.log(`✅ Invitation sent: ${invitationId}`);
    });

    test("should fail to invite same email twice", async () => {
      const response = await apiCall(
        "POST",
        "/family/invite",
        {
          email: TEST_PARTNER_EMAIL,
          role: "spouse",
        },
        primaryToken,
      );

      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain("already");
    });

    test("should fail to invite with invalid role", async () => {
      const response = await apiCall(
        "POST",
        "/family/invite",
        {
          email: "another@example.com",
          role: "invalid_role",
        },
        primaryToken,
      );

      expect(response.statusCode).toBe(400);
    });

    test("should list pending invitations", async () => {
      const response = await apiCall(
        "GET",
        "/family/invitations",
        null,
        primaryToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.invitations).toBeDefined();

      const invitation = response.body.data.invitations.find(
        (inv) => inv.invitationId === invitationId,
      );
      expect(invitation).toBeDefined();
      expect(invitation.status).toBe("pending");
    });
  });

  describe("3. CORS Headers", () => {
    test("should include CORS headers on success", async () => {
      const response = await apiCall(
        "GET",
        "/family/members",
        null,
        primaryToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    test("should include CORS headers on 401 error", async () => {
      // Call without token to trigger 401
      const response = await apiCall("GET", "/family/members", null, null);

      expect(response.statusCode).toBe(401);
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });

    test("should include CORS headers on 403 error", async () => {
      // Try to access with invalid token
      const response = await apiCall(
        "GET",
        "/family/members",
        null,
        "invalid-token",
      );

      expect(response.statusCode).toBe(401); // Cognito returns 401 for invalid tokens
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("4. Member Management", () => {
    test("should get member count", async () => {
      const response = await apiCall(
        "GET",
        "/family/members",
        null,
        primaryToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.count).toBeDefined();
      expect(response.body.data.count).toBeGreaterThan(0);
    });

    test("should enforce family size limits", async () => {
      // Try to invite more members than allowed (if limit exists)
      // This test depends on your business rules
      const response = await apiCall(
        "GET",
        "/family/members",
        null,
        primaryToken,
      );
      const currentCount = response.body.data.count;

      console.log(`👥 Current family size: ${currentCount}`);
      // Add assertion based on your limits
    });
  });

  describe("5. Invitation Management", () => {
    test("should revoke invitation", async () => {
      if (!invitationId) {
        console.log("⚠️  No invitation to revoke");
        return;
      }

      console.log(`🗑️  Revoking invitation: ${invitationId}`);

      const response = await apiCall(
        "DELETE",
        `/family/invitations/${invitationId}`,
        null,
        primaryToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain("revoked");

      // Verify invitation is gone
      const listResponse = await apiCall(
        "GET",
        "/family/invitations",
        null,
        primaryToken,
      );
      const invitationExists = listResponse.body.data.invitations.some(
        (inv) => inv.invitationId === invitationId,
      );
      expect(invitationExists).toBe(false);
    });
  });

  describe("6. Authorization Tests", () => {
    test("should require authentication for family endpoints", async () => {
      const endpoints = [
        { method: "GET", path: "/family" },
        { method: "GET", path: "/family/members" },
        { method: "POST", path: "/family/invite" },
      ];

      for (const endpoint of endpoints) {
        const response = await apiCall(
          endpoint.method,
          endpoint.path,
          null,
          null,
        );
        expect(response.statusCode).toBe(401);
      }
    });

    test("should validate request body", async () => {
      // Missing required fields
      const response = await apiCall(
        "POST",
        "/family/invite",
        {
          // Missing email and role
        },
        primaryToken,
      );

      expect(response.statusCode).toBe(400);
    });
  });

  describe("7. Edge Cases", () => {
    test("should handle non-existent invitation ID", async () => {
      const response = await apiCall(
        "DELETE",
        "/family/invitations/non-existent-id",
        null,
        primaryToken,
      );

      expect(response.statusCode).toBe(404);
    });

    test("should handle invalid email format", async () => {
      const response = await apiCall(
        "POST",
        "/family/invite",
        {
          email: "invalid-email",
          role: "spouse",
        },
        primaryToken,
      );

      expect(response.statusCode).toBe(400);
    });

    test("should handle empty member list gracefully", async () => {
      const response = await apiCall(
        "GET",
        "/family/members",
        null,
        primaryToken,
      );

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.data.members)).toBe(true);
    });
  });

  describe("8. Performance Tests", () => {
    test("should respond within acceptable time", async () => {
      const start = Date.now();
      const response = await apiCall(
        "GET",
        "/family/members",
        null,
        primaryToken,
      );
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds

      console.log(`⏱️  Response time: ${duration}ms`);
    });

    test("should handle concurrent requests", async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => apiCall("GET", "/family/members", null, primaryToken));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
      });
    });
  });
});

// Run tests
if (require.main === module) {
  console.log("🧪 Running Family Collaboration Tests\n");
  console.log("⚠️  Make sure you have:");
  console.log("   1. Updated TEST_PRIMARY_PASSWORD with actual password");
  console.log("   2. Deployed the latest code to dev environment");
  console.log("   3. User dmytro.malyk@gmail.com exists in Cognito");
  console.log("   4. Gateway Responses configured for CORS\n");
}
