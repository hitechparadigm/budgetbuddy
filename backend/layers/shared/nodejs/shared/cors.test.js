/**
 * Unit tests for CORS utilities
 */

const { getCorsHeaders, handleCorsPreflightRequest } = require("./cors");

describe("getCorsHeaders", () => {
  test("should return headers with allowed origin", () => {
    const origin = "http://localhost:3000";
    const headers = getCorsHeaders(origin);

    expect(headers).toEqual({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Credentials": "true",
    });
  });

  test("should return headers with CloudFront origin for unknown origin", () => {
    const origin = "https://unknown-origin.com";
    const headers = getCorsHeaders(origin);

    expect(headers).toEqual({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://d1ueeugn9zcx7n.cloudfront.net",
      "Access-Control-Allow-Credentials": "true",
    });
  });

  test("should handle all allowed origins", () => {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://d1ueeugn9zcx7n.cloudfront.net",
      "https://d2ubhx2a13s7gc.cloudfront.net",
      "https://app.budgetbuddy.com",
      "https://admin.budgetbuddy.com",
    ];

    allowedOrigins.forEach((origin) => {
      const headers = getCorsHeaders(origin);
      expect(headers["Access-Control-Allow-Origin"]).toBe(origin);
    });
  });

  test("should handle empty origin", () => {
    const headers = getCorsHeaders("");
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://d1ueeugn9zcx7n.cloudfront.net"
    );
  });

  test("should handle null origin", () => {
    const headers = getCorsHeaders(null);
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://d1ueeugn9zcx7n.cloudfront.net"
    );
  });
});

describe("handleCorsPreflightRequest", () => {
  test("should return 200 status with CORS headers", () => {
    const origin = "http://localhost:3000";
    const response = handleCorsPreflightRequest(origin);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("");
  });

  test("should include preflight headers", () => {
    const origin = "http://localhost:3000";
    const response = handleCorsPreflightRequest(origin);

    expect(response.headers["Access-Control-Allow-Headers"]).toBe(
      "Content-Type,Authorization"
    );
    expect(response.headers["Access-Control-Allow-Methods"]).toBe(
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    expect(response.headers["Access-Control-Max-Age"]).toBe("86400");
  });

  test("should include standard CORS headers", () => {
    const origin = "http://localhost:3000";
    const response = handleCorsPreflightRequest(origin);

    expect(response.headers["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:3000"
    );
    expect(response.headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(response.headers["Content-Type"]).toBe("application/json");
  });
});
