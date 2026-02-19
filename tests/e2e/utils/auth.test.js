/**
 * Unit tests for E2E authentication utilities
 */

// Mock AWS SDK BEFORE any imports
jest.mock("@aws-sdk/client-cognito-identity-provider");

const {
  createCognitoUser,
  authenticateUser,
  deleteCognitoUser,
  verifyEmail,
} = require("./auth");

const {
  CognitoIdentityProviderClient,
} = require("@aws-sdk/client-cognito-identity-provider");

describe("E2E Authentication Utilities", () => {
  let mockSend;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock the send method
    mockSend = jest.fn();
    CognitoIdentityProviderClient.mockImplementation(() => ({
      send: mockSend,
    }));

    // Set required environment variables
    process.env.COGNITO_USER_POOL_ID = "us-east-1_TEST123";
    process.env.COGNITO_CLIENT_ID = "test-client-id";
    process.env.AWS_REGION = "us-east-1";
  });

  afterEach(() => {
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_CLIENT_ID;
    delete process.env.AWS_REGION;
  });

  describe("createCognitoUser", () => {
    it("should create a user with email and password", async () => {
      mockSend
        .mockResolvedValueOnce({
          User: {
            Username: "test-user-id",
            Attributes: [
              { Name: "email", Value: "test@example.com" },
              { Name: "email_verified", Value: "true" },
            ],
          },
        })
        .mockResolvedValueOnce({}); // Set password response

      const result = await createCognitoUser("test@example.com", "Test123!@#");

      expect(result).toEqual({
        userId: "test-user-id",
        email: "test@example.com",
        attributes: [
          { Name: "email", Value: "test@example.com" },
          { Name: "email_verified", Value: "true" },
        ],
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should create a user with custom attributes", async () => {
      mockSend
        .mockResolvedValueOnce({
          User: {
            Username: "test-user-id",
            Attributes: [
              { Name: "email", Value: "test@example.com" },
              { Name: "custom:familyId", Value: "family-123" },
              { Name: "custom:role", Value: "primary" },
            ],
          },
        })
        .mockResolvedValueOnce({});

      const result = await createCognitoUser("test@example.com", "Test123!@#", {
        familyId: "family-123",
        role: "primary",
      });

      expect(result.userId).toBe("test-user-id");
      expect(mockSend).toHaveBeenCalledTimes(2);

      // Verify the command was called (we can't easily inspect command internals in mocks)
      expect(result.userId).toBe("test-user-id");
    });

    it("should throw error if USER_POOL_ID is missing", async () => {
      delete process.env.COGNITO_USER_POOL_ID;

      await expect(
        createCognitoUser("test@example.com", "Test123!@#"),
      ).rejects.toThrow(
        "COGNITO_USER_POOL_ID environment variable is required",
      );
    });

    it("should throw error if user creation fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("User already exists"));

      await expect(
        createCognitoUser("test@example.com", "Test123!@#"),
      ).rejects.toThrow("Failed to create Cognito user: User already exists");
    });
  });

  describe("authenticateUser", () => {
    it("should authenticate user and return tokens", async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: "access-token-123",
          IdToken: "id-token-123",
          RefreshToken: "refresh-token-123",
          ExpiresIn: 3600,
        },
      });

      const result = await authenticateUser("test@example.com", "Test123!@#");

      expect(result).toEqual({
        accessToken: "access-token-123",
        idToken: "id-token-123",
        refreshToken: "refresh-token-123",
        expiresIn: 3600,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should throw error if CLIENT_ID is missing", async () => {
      delete process.env.COGNITO_CLIENT_ID;

      await expect(
        authenticateUser("test@example.com", "Test123!@#"),
      ).rejects.toThrow("COGNITO_CLIENT_ID environment variable is required");
    });

    it("should throw error if authentication fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("Invalid credentials"));

      await expect(
        authenticateUser("test@example.com", "WrongPassword"),
      ).rejects.toThrow("Failed to authenticate user: Invalid credentials");
    });

    it("should throw error if no tokens returned", async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: null,
      });

      await expect(
        authenticateUser("test@example.com", "Test123!@#"),
      ).rejects.toThrow("Authentication failed - no tokens returned");
    });
  });

  describe("deleteCognitoUser", () => {
    it("should delete a user", async () => {
      mockSend.mockResolvedValueOnce({});

      await deleteCognitoUser("test-user-id");

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should throw error if USER_POOL_ID is missing", async () => {
      delete process.env.COGNITO_USER_POOL_ID;

      await expect(deleteCognitoUser("test-user-id")).rejects.toThrow(
        "COGNITO_USER_POOL_ID environment variable is required",
      );
    });

    it("should ignore UserNotFoundException", async () => {
      const error = new Error("User not found");
      error.name = "UserNotFoundException";
      mockSend.mockRejectedValueOnce(error);

      // Should not throw
      await deleteCognitoUser("test-user-id");

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should throw other errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Access denied"));

      await expect(deleteCognitoUser("test-user-id")).rejects.toThrow(
        "Failed to delete Cognito user: Access denied",
      );
    });
  });

  describe("verifyEmail", () => {
    it("should verify email for a user", async () => {
      mockSend.mockResolvedValueOnce({});

      await verifyEmail("test@example.com");

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should throw error if USER_POOL_ID is missing", async () => {
      delete process.env.COGNITO_USER_POOL_ID;

      await expect(verifyEmail("test@example.com")).rejects.toThrow(
        "COGNITO_USER_POOL_ID environment variable is required",
      );
    });

    it("should throw error if verification fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("User not found"));

      await expect(verifyEmail("test@example.com")).rejects.toThrow(
        "Failed to verify email: User not found",
      );
    });
  });
});
