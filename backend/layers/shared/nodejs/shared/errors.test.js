/**
 * Unit tests for error handling utilities
 */

const {
  formatErrorResponse,
  handleError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
} = require("./errors");

describe("formatErrorResponse", () => {
  test("should format error response without details", () => {
    const response = formatErrorResponse(
      400,
      "Bad Request",
      "Invalid input",
      null,
      "http://localhost:3000"
    );

    expect(response.statusCode).toBe(400);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:3000"
    );

    const body = JSON.parse(response.body);
    expect(body.error).toBe("Bad Request");
    expect(body.message).toBe("Invalid input");
    expect(body.details).toBeUndefined();
  });

  test("should format error response with details", () => {
    const response = formatErrorResponse(
      400,
      "Validation Error",
      "Request validation failed",
      ["Email is required", "Password is too short"],
      "http://localhost:3000"
    );

    const body = JSON.parse(response.body);
    expect(body.details).toEqual([
      "Email is required",
      "Password is too short",
    ]);
  });

  test("should include CORS headers", () => {
    const response = formatErrorResponse(
      500,
      "Internal Server Error",
      "Something went wrong",
      null,
      "http://localhost:3000"
    );

    expect(response.headers["Content-Type"]).toBe("application/json");
    expect(response.headers["Access-Control-Allow-Credentials"]).toBe("true");
  });
});

describe("ValidationError", () => {
  test("should create validation error with errors array", () => {
    const errors = ["Email is required", "Password is too short"];
    const error = new ValidationError("Validation failed", errors);

    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("Validation failed");
    expect(error.errors).toEqual(errors);
    expect(error.statusCode).toBe(400);
  });

  test("should create validation error without errors array", () => {
    const error = new ValidationError("Validation failed");

    expect(error.errors).toEqual([]);
  });
});

describe("AuthenticationError", () => {
  test("should create authentication error", () => {
    const error = new AuthenticationError("Invalid credentials");

    expect(error.name).toBe("AuthenticationError");
    expect(error.message).toBe("Invalid credentials");
    expect(error.statusCode).toBe(401);
  });
});

describe("NotFoundError", () => {
  test("should create not found error", () => {
    const error = new NotFoundError("User not found");

    expect(error.name).toBe("NotFoundError");
    expect(error.message).toBe("User not found");
    expect(error.statusCode).toBe(404);
  });
});

describe("ConflictError", () => {
  test("should create conflict error", () => {
    const error = new ConflictError("User already exists");

    expect(error.name).toBe("ConflictError");
    expect(error.message).toBe("User already exists");
    expect(error.statusCode).toBe(409);
  });
});

describe("handleError", () => {
  test("should handle ValidationError", () => {
    const error = new ValidationError("Validation failed", [
      "Email is required",
    ]);
    const response = handleError(error, "http://localhost:3000");

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Validation Error");
    expect(body.details).toEqual(["Email is required"]);
  });

  test("should handle AuthenticationError", () => {
    const error = new AuthenticationError("Invalid credentials");
    const response = handleError(error, "http://localhost:3000");

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Authentication Error");
  });

  test("should handle NotFoundError", () => {
    const error = new NotFoundError("User not found");
    const response = handleError(error, "http://localhost:3000");

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Not Found");
  });

  test("should handle ConflictError", () => {
    const error = new ConflictError("User already exists");
    const response = handleError(error, "http://localhost:3000");

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Conflict");
  });

  test("should handle Cognito UsernameExistsException", () => {
    const error = new Error("User exists");
    error.name = "UsernameExistsException";
    const response = handleError(error, "http://localhost:3000");

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("User Already Exists");
  });

  test("should handle Cognito NotAuthorizedException", () => {
    const error = new Error("Not authorized");
    error.name = "NotAuthorizedException";
    const response = handleError(error, "http://localhost:3000");

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Authentication Failed");
  });

  test("should handle generic errors", () => {
    const error = new Error("Something went wrong");
    const response = handleError(error, "http://localhost:3000");

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Internal Server Error");
    expect(body.details).toBe("Something went wrong");
  });
});
