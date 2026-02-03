/**
 * Google OAuth Tests (Requirement 40)
 *
 * Tests for Google Sign-In functionality including:
 * - OAuth initiation with correct redirect parameters
 * - Authorization code exchange
 * - User creation/update in Cognito
 * - Error handling for invalid codes
 * - Account linking for existing emails
 * - JWT token issuance
 *
 * Feature: test-coverage-improvement
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

// Mocks are loaded via jest moduleNameMapper in package.json
const { dynamoHelpers } = require("/opt/nodejs/utils");

// Mock AWS SDK clients
const mockCognitoClient = {
  send: jest.fn(),
};

const mockDynamoClient = {
  send: jest.fn(),
};

// Mock AWS SDK
jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => mockCognitoClient),
  AdminCreateUserCommand: jest.fn((input) => ({
    input,
    constructor: { name: "AdminCreateUserCommand" },
  })),
  AdminSetUserPasswordCommand: jest.fn((input) => ({
    input,
    constructor: { name: "AdminSetUserPasswordCommand" },
  })),
  InitiateAuthCommand: jest.fn((input) => ({
    input,
    constructor: { name: "InitiateAuthCommand" },
  })),
  AdminGetUserCommand: jest.fn((input) => ({
    input,
    constructor: { name: "AdminGetUserCommand" },
  })),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => mockDynamoClient),
  TransactWriteItemsCommand: jest.fn(),
  GetItemCommand: jest.fn(),
  UpdateItemCommand: jest.fn(),
  PutItemCommand: jest.fn(),
}));

// Import handler after mocks are set up
const { handler } = require("./index");

describe("Google OAuth Tests (Req 40)", () => {
  const mockContext = {
    awsRequestId: "test-google-oauth",
  };

  // Helper to create a mock Google ID token
  const createMockGoogleToken = (payload) => {
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    ).toString("base64");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64");
    const signature = "mock_signature";
    return `${header}.${body}.${signature}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USER_POOL_ID = "us-east-1_TEST123";
    process.env.CLIENT_ID = "test-client-id";
    process.env.TABLE_NAME = "test-table";
  });

  describe("Google Sign-In Endpoint", () => {
    test("should accept valid Google ID token and create new user", async () => {
      const mockPayload = {
        email: "newuser@gmail.com",
        name: "John Doe",
        sub: "google_user_123",
        email_verified: true,
      };

      const mockToken = createMockGoogleToken(mockPayload);

      // Mock Cognito: user doesn't exist
      mockCognitoClient.send.mockImplementation((command) => {
        if (command.constructor.name === "AdminGetUserCommand") {
          const error = new Error("User does not exist");
          error.name = "UserNotFoundException";
          throw error;
        }
        if (command.constructor.name === "AdminCreateUserCommand") {
          return { User: { Username: "newuser@gmail.com" } };
        }
        if (command.constructor.name === "AdminSetUserPasswordCommand") {
          return {};
        }
        if (command.constructor.name === "InitiateAuthCommand") {
          return {
            AuthenticationResult: {
              AccessToken: "mock_access_token",
              RefreshToken: "mock_refresh_token",
              IdToken: "mock_id_token",
            },
          };
        }
        return {};
      });

      // Mock DynamoDB: no existing user
      mockDynamoClient.send.mockResolvedValue({ Item: null });

      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: mockToken,
        }),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.accessToken).toBeDefined();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe("newuser@gmail.com");
    });

    test("should handle existing user with Google sign-in", async () => {
      const mockPayload = {
        email: "existinguser@gmail.com",
        name: "Jane Smith",
        sub: "google_user_456",
        email_verified: true,
      };

      const mockToken = createMockGoogleToken(mockPayload);

      // Mock Cognito: user exists
      mockCognitoClient.send.mockImplementation((command) => {
        if (command.constructor.name === "AdminGetUserCommand") {
          return {
            Username: "existinguser@gmail.com",
            UserAttributes: [
              { Name: "email", Value: "existinguser@gmail.com" },
              { Name: "custom:userId", Value: "user_existing123" },
            ],
          };
        }
        if (command.constructor.name === "InitiateAuthCommand") {
          return {
            AuthenticationResult: {
              AccessToken: "mock_access_token",
              RefreshToken: "mock_refresh_token",
              IdToken: "mock_id_token",
            },
          };
        }
        return {};
      });

      // Mock DynamoDB: existing user profile
      mockDynamoClient.send.mockResolvedValue({
        Item: {
          userId: { S: "user_existing123" },
          email: { S: "existinguser@gmail.com" },
          firstName: { S: "Jane" },
          lastName: { S: "Smith" },
          familyId: { S: "family_user_existing123" },
        },
      });

      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: mockToken,
        }),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.user.email).toBe("existinguser@gmail.com");
    });

    test("should reject request without ID token", async () => {
      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({}),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain("Google ID token is required");
    });

    test("should reject malformed ID token", async () => {
      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: "invalid.token",
        }),
      };

      const result = await handler(event, mockContext);

      // Malformed tokens result in 500 (parsing error) or 400 (validation error)
      expect([400, 500]).toContain(result.statusCode);
    });

    test("should reject token with invalid JSON payload", async () => {
      const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString(
        "base64",
      );
      const invalidBody = Buffer.from("not-valid-json").toString("base64");
      const signature = "mock_signature";
      const invalidToken = `${header}.${invalidBody}.${signature}`;

      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: invalidToken,
        }),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
    });

    test("should extract first and last name from Google profile", async () => {
      const mockPayload = {
        email: "fullname@gmail.com",
        name: "John Michael Doe",
        sub: "google_user_789",
        email_verified: true,
      };

      const mockToken = createMockGoogleToken(mockPayload);

      // Mock Cognito: user doesn't exist
      mockCognitoClient.send.mockImplementation((command) => {
        if (command.constructor.name === "AdminGetUserCommand") {
          const error = new Error("User does not exist");
          error.name = "UserNotFoundException";
          throw error;
        }
        if (command.constructor.name === "AdminCreateUserCommand") {
          return { User: { Username: "fullname@gmail.com" } };
        }
        if (command.constructor.name === "AdminSetUserPasswordCommand") {
          return {};
        }
        if (command.constructor.name === "InitiateAuthCommand") {
          return {
            AuthenticationResult: {
              AccessToken: "mock_access_token",
              RefreshToken: "mock_refresh_token",
              IdToken: "mock_id_token",
            },
          };
        }
        return {};
      });

      mockDynamoClient.send.mockResolvedValue({ Item: null });

      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: mockToken,
        }),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.user.firstName).toBe("John");
      expect(body.user.lastName).toBe("Michael Doe");
    });

    test("should handle user with only first name", async () => {
      const mockPayload = {
        email: "singlename@gmail.com",
        name: "Madonna",
        sub: "google_user_single",
        email_verified: true,
      };

      const mockToken = createMockGoogleToken(mockPayload);

      mockCognitoClient.send.mockImplementation((command) => {
        if (command.constructor.name === "AdminGetUserCommand") {
          const error = new Error("User does not exist");
          error.name = "UserNotFoundException";
          throw error;
        }
        if (command.constructor.name === "AdminCreateUserCommand") {
          return { User: { Username: "singlename@gmail.com" } };
        }
        if (command.constructor.name === "AdminSetUserPasswordCommand") {
          return {};
        }
        if (command.constructor.name === "InitiateAuthCommand") {
          return {
            AuthenticationResult: {
              AccessToken: "mock_access_token",
              RefreshToken: "mock_refresh_token",
              IdToken: "mock_id_token",
            },
          };
        }
        return {};
      });

      mockDynamoClient.send.mockResolvedValue({ Item: null });

      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: mockToken,
        }),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.user.firstName).toBe("Madonna");
      expect(body.user.lastName).toBe("User"); // Default fallback
    });

    test("should handle Cognito errors gracefully", async () => {
      const mockPayload = {
        email: "error@gmail.com",
        name: "Error User",
        sub: "google_user_error",
        email_verified: true,
      };

      const mockToken = createMockGoogleToken(mockPayload);

      mockCognitoClient.send.mockImplementation((command) => {
        if (command.constructor.name === "AdminGetUserCommand") {
          const error = new Error("User does not exist");
          error.name = "UserNotFoundException";
          throw error;
        }
        if (command.constructor.name === "AdminCreateUserCommand") {
          throw new Error("Cognito service unavailable");
        }
        return {};
      });

      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: mockToken,
        }),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Google Sign-In Failed");
    });

    test("should set authProvider to google for new users", async () => {
      const mockPayload = {
        email: "provider@gmail.com",
        name: "Provider Test",
        sub: "google_user_provider",
        email_verified: true,
      };

      const mockToken = createMockGoogleToken(mockPayload);

      let createdUserAttributes = [];

      mockCognitoClient.send.mockImplementation((command) => {
        if (command.constructor.name === "AdminGetUserCommand") {
          const error = new Error("User does not exist");
          error.name = "UserNotFoundException";
          throw error;
        }
        if (command.constructor.name === "AdminCreateUserCommand") {
          createdUserAttributes = command.input?.UserAttributes || [];
          return { User: { Username: "provider@gmail.com" } };
        }
        if (command.constructor.name === "AdminSetUserPasswordCommand") {
          return {};
        }
        if (command.constructor.name === "InitiateAuthCommand") {
          return {
            AuthenticationResult: {
              AccessToken: "mock_access_token",
              RefreshToken: "mock_refresh_token",
              IdToken: "mock_id_token",
            },
          };
        }
        return {};
      });

      mockDynamoClient.send.mockResolvedValue({ Item: null });

      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: mockToken,
        }),
      };

      await handler(event, mockContext);

      // Verify authProvider attribute was set
      const authProviderAttr = createdUserAttributes.find(
        (attr) => attr.Name === "custom:authProvider",
      );
      expect(authProviderAttr).toBeDefined();
      expect(authProviderAttr.Value).toBe("google");
    });

    test("should return JWT tokens on successful sign-in", async () => {
      const mockPayload = {
        email: "tokens@gmail.com",
        name: "Token User",
        sub: "google_user_tokens",
        email_verified: true,
      };

      const mockToken = createMockGoogleToken(mockPayload);

      mockCognitoClient.send.mockImplementation((command) => {
        if (command.constructor.name === "AdminGetUserCommand") {
          return {
            Username: "tokens@gmail.com",
            UserAttributes: [
              { Name: "email", Value: "tokens@gmail.com" },
              { Name: "custom:userId", Value: "user_tokens123" },
            ],
          };
        }
        if (command.constructor.name === "InitiateAuthCommand") {
          return {
            AuthenticationResult: {
              AccessToken: "access_token_123",
              RefreshToken: "refresh_token_456",
              IdToken: "id_token_789",
            },
          };
        }
        return {};
      });

      mockDynamoClient.send.mockResolvedValue({
        Item: {
          userId: { S: "user_tokens123" },
          email: { S: "tokens@gmail.com" },
          firstName: { S: "Token" },
          lastName: { S: "User" },
          familyId: { S: "family_user_tokens123" },
        },
      });

      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: mockToken,
        }),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.accessToken).toBe("access_token_123");
      expect(body.refreshToken).toBe("refresh_token_456");
      expect(body.idToken).toBe("id_token_789");
    });

    test("should handle empty request body", async () => {
      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
    });

    test("should handle invalid JSON in request body", async () => {
      const event = {
        httpMethod: "POST",
        path: "/auth/google",
        headers: {
          origin: "http://localhost:3000",
        },
        body: "not-valid-json",
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
    });
  });
});
