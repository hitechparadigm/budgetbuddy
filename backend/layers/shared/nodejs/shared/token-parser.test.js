/**
 * Unit tests for token parsing utilities
 */

const {
  parseAuthToken,
  parseIdToken,
  parseGoogleToken,
} = require("./token-parser");

// Helper to create a mock JWT token
function createMockToken(payload) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64");
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = "mock-signature";
  return `${header}.${payloadBase64}.${signature}`;
}

describe("parseAuthToken", () => {
  test("should parse valid token with custom:userId", () => {
    const payload = { "custom:userId": "user_123", sub: "cognito_sub_456" };
    const token = createMockToken(payload);
    const authHeader = `Bearer ${token}`;

    const result = parseAuthToken(authHeader);

    expect(result.userId).toBe("user_123");
    expect(result.payload["custom:userId"]).toBe("user_123");
  });

  test("should fallback to sub when custom:userId is missing", () => {
    const payload = { sub: "cognito_sub_456", email: "test@example.com" };
    const token = createMockToken(payload);
    const authHeader = `Bearer ${token}`;

    const result = parseAuthToken(authHeader);

    expect(result.userId).toBe("cognito_sub_456");
    expect(result.payload.sub).toBe("cognito_sub_456");
  });

  test("should throw error for missing Authorization header", () => {
    expect(() => parseAuthToken(null)).toThrow(
      "Authorization header is required"
    );
    expect(() => parseAuthToken("")).toThrow(
      "Authorization header is required"
    );
  });

  test("should throw error for invalid token format", () => {
    expect(() => parseAuthToken("Bearer invalid-token")).toThrow(
      "Invalid token format"
    );
    expect(() => parseAuthToken("Bearer part1.part2")).toThrow(
      "Invalid token format"
    );
  });

  test("should throw error when userId not found", () => {
    const payload = { email: "test@example.com" }; // No userId or sub
    const token = createMockToken(payload);
    const authHeader = `Bearer ${token}`;

    expect(() => parseAuthToken(authHeader)).toThrow(
      "User ID not found in token"
    );
  });

  test("should handle Bearer prefix correctly", () => {
    const payload = { "custom:userId": "user_123" };
    const token = createMockToken(payload);
    const authHeader = `Bearer ${token}`;

    const result = parseAuthToken(authHeader);
    expect(result.userId).toBe("user_123");
  });
});

describe("parseIdToken", () => {
  test("should parse valid ID token", () => {
    const payload = {
      sub: "user_123",
      email: "test@example.com",
      given_name: "John",
      family_name: "Doe",
    };
    const token = createMockToken(payload);

    const result = parseIdToken(token);

    expect(result.sub).toBe("user_123");
    expect(result.email).toBe("test@example.com");
    expect(result.given_name).toBe("John");
    expect(result.family_name).toBe("Doe");
  });

  test("should throw error for missing token", () => {
    expect(() => parseIdToken(null)).toThrow("ID token is required");
    expect(() => parseIdToken("")).toThrow("ID token is required");
  });

  test("should throw error for invalid token format", () => {
    expect(() => parseIdToken("invalid-token")).toThrow("Invalid token format");
  });
});

describe("parseGoogleToken", () => {
  test("should parse valid Google token", () => {
    const payload = {
      email: "test@gmail.com",
      name: "John Doe",
      picture: "https://example.com/photo.jpg",
      sub: "google_123",
    };
    const token = createMockToken(payload);

    const result = parseGoogleToken(token);

    expect(result.email).toBe("test@gmail.com");
    expect(result.name).toBe("John Doe");
    expect(result.picture).toBe("https://example.com/photo.jpg");
  });

  test("should throw error for missing token", () => {
    expect(() => parseGoogleToken(null)).toThrow("Google ID token is required");
    expect(() => parseGoogleToken("")).toThrow("Google ID token is required");
  });

  test("should throw error for invalid token format", () => {
    expect(() => parseGoogleToken("invalid-token")).toThrow(
      "Invalid token format"
    );
  });

  test("should throw error when email is missing", () => {
    const payload = { name: "John Doe", sub: "google_123" }; // No email
    const token = createMockToken(payload);

    expect(() => parseGoogleToken(token)).toThrow(
      "Email not found in Google token"
    );
  });
});
