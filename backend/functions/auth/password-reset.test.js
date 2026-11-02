/**
 * Password reset routing: POST /auth/forgot-password, /auth/confirm-forgot-password
 * and its /auth/reset-password alias must reach their Cognito branches. A generic
 * "other POST" 200 response used to sit above them, so they never ran.
 */

const mockCognitoClient = { send: jest.fn() };

jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => mockCognitoClient),
  AdminCreateUserCommand: jest.fn(),
  AdminSetUserPasswordCommand: jest.fn(),
  InitiateAuthCommand: jest.fn(),
  AdminGetUserCommand: jest.fn(),
  ForgotPasswordCommand: jest.fn((input) => ({ type: "ForgotPassword", input })),
  ConfirmForgotPasswordCommand: jest.fn((input) => ({ type: "ConfirmForgotPassword", input })),
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
const VALID_RESET = { email: EMAIL, code: "000000", newPassword: "NotReal1Pass" };

function post(path, body) {
  return { httpMethod: "POST", path, headers: {}, body: body === undefined ? undefined : JSON.stringify(body) };
}

async function call(path, body) {
  const result = await handler(post(path, body), {});
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
}

function cognitoError(name) {
  const err = new Error(`raw cognito message for ${name}`);
  err.name = name;
  return err;
}

describe("password reset routes", () => {
  beforeEach(() => {
    mockCognitoClient.send.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test("forgot-password with no email returns 400 from its own branch", async () => {
    const { statusCode, body } = await call("/auth/forgot-password", {});

    expect(statusCode).toBe(400);
    expect(body.message).toBe("Email is required");
    expect(mockCognitoClient.send).not.toHaveBeenCalled();
  });

  test("forgot-password sends ForgotPassword to Cognito", async () => {
    mockCognitoClient.send.mockResolvedValueOnce({});

    const { statusCode } = await call("/auth/forgot-password", { email: EMAIL });

    expect(statusCode).toBe(200);
    expect(mockCognitoClient.send).toHaveBeenCalledTimes(1);
    expect(mockCognitoClient.send.mock.calls[0][0].type).toBe("ForgotPassword");
  });

  test.each(["/auth/confirm-forgot-password", "/auth/reset-password"])(
    "%s with an empty body returns 400 validation error",
    async (path) => {
      const { statusCode, body } = await call(path, {});

      expect(statusCode).toBe(400);
      expect(body.error).toBe("Validation Error");
      expect(mockCognitoClient.send).not.toHaveBeenCalled();
    },
  );

  test.each(["/auth/confirm-forgot-password", "/auth/reset-password"])(
    "%s sends ConfirmForgotPassword to Cognito",
    async (path) => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const { statusCode } = await call(path, VALID_RESET);

      expect(statusCode).toBe(200);
      const command = mockCognitoClient.send.mock.calls[0][0];
      expect(command.type).toBe("ConfirmForgotPassword");
      expect(command.input.Username).toBe(EMAIL);
    },
  );

  test("CodeMismatchException maps to 400 Invalid Code", async () => {
    mockCognitoClient.send.mockRejectedValueOnce(cognitoError("CodeMismatchException"));

    const { statusCode, body } = await call("/auth/confirm-forgot-password", VALID_RESET);

    expect(statusCode).toBe(400);
    expect(body.error).toBe("Invalid Code");
  });

  test("an unimplemented POST route still gets the placeholder 200", async () => {
    const { statusCode, body } = await call("/auth/confirm", {});

    expect(statusCode).toBe(200);
    expect(body.note).toBe("This endpoint is not yet implemented");
  });
});
