/**
 * POST /auth/login error mapping.
 *
 * Cognito errors from InitiateAuth must map to 4xx responses with fixed messages:
 * never a 500 for a known error, never the raw Cognito message, and wrong password
 * and unknown user must be indistinguishable.
 */

const util = require("util");

const mockCognitoClient = { send: jest.fn() };

jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => mockCognitoClient),
  AdminCreateUserCommand: jest.fn(),
  AdminSetUserPasswordCommand: jest.fn(),
  InitiateAuthCommand: jest.fn((input) => ({ input })),
  AdminGetUserCommand: jest.fn(),
  ForgotPasswordCommand: jest.fn(),
  ConfirmForgotPasswordCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({ send: jest.fn() })),
  TransactWriteItemsCommand: jest.fn(),
  GetItemCommand: jest.fn(),
  UpdateItemCommand: jest.fn(),
  PutItemCommand: jest.fn(),
}));

const { handler } = require("./index");

const EMAIL = "reset-user@example.com";
const PASSWORD = "not-a-real-password";

function loginEvent() {
  return {
    httpMethod: "POST",
    path: "/auth/login",
    headers: {},
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  };
}

function cognitoError(name) {
  const err = new Error(`raw cognito message for ${name}`);
  err.name = name;
  return err;
}

describe("POST /auth/login Cognito error mapping", () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    mockCognitoClient.send.mockReset();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  async function loginFailingWith(name) {
    mockCognitoClient.send.mockRejectedValueOnce(cognitoError(name));
    const result = await handler(loginEvent(), {});
    return { statusCode: result.statusCode, body: JSON.parse(result.body), raw: result.body };
  }

  test("PasswordResetRequiredException returns 403 PASSWORD_RESET_REQUIRED", async () => {
    const { statusCode, body } = await loginFailingWith("PasswordResetRequiredException");

    expect(statusCode).toBe(403);
    expect(body).toEqual({
      error: "PASSWORD_RESET_REQUIRED",
      message: "Your password must be reset. Check your email for a code.",
    });
  });

  test("wrong password and unknown user return identical 401 responses", async () => {
    const wrongPassword = await loginFailingWith("NotAuthorizedException");
    const unknownUser = await loginFailingWith("UserNotFoundException");

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownUser.statusCode).toBe(401);
    expect(unknownUser.raw).toBe(wrongPassword.raw);
    expect(wrongPassword.body).toEqual({
      error: "Authentication Failed",
      message: "Invalid email or password",
    });
  });

  test("UserNotConfirmedException returns 403 USER_NOT_CONFIRMED", async () => {
    const { statusCode, body } = await loginFailingWith("UserNotConfirmedException");

    expect(statusCode).toBe(403);
    expect(body.error).toBe("USER_NOT_CONFIRMED");
  });

  test("TooManyRequestsException returns 429", async () => {
    const { statusCode, body } = await loginFailingWith("TooManyRequestsException");

    expect(statusCode).toBe(429);
    expect(body.error).toBe("Too Many Requests");
  });

  test("an unexpected error returns 500 without the raw Cognito message", async () => {
    const { statusCode, body } = await loginFailingWith("InternalErrorException");

    expect(statusCode).toBe(500);
    expect(body).toEqual({
      error: "Login Failed",
      message: "An error occurred during authentication",
    });
  });

  test.each([
    "PasswordResetRequiredException",
    "NotAuthorizedException",
    "UserNotFoundException",
    "UserNotConfirmedException",
    "TooManyRequestsException",
    "InternalErrorException",
  ])("%s response and logs carry no raw message, email or password", async (name) => {
    const { raw } = await loginFailingWith(name);

    const logged = [...logSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((arg) => (typeof arg === "string" ? arg : util.inspect(arg, { depth: 5 })))
      .join("\n");

    for (const text of [raw, logged]) {
      expect(text).not.toContain("raw cognito message");
      expect(text).not.toContain(EMAIL);
      expect(text).not.toContain(PASSWORD);
    }
  });

  test("sends InitiateAuth USER_PASSWORD_AUTH to Cognito", async () => {
    await loginFailingWith("PasswordResetRequiredException");

    expect(mockCognitoClient.send).toHaveBeenCalledTimes(1);
    const command = mockCognitoClient.send.mock.calls[0][0];
    expect(command.input.AuthFlow).toBe("USER_PASSWORD_AUTH");
  });
});
