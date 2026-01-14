/**
 * CORS Utilities for BudgetBuddy Authentication
 *
 * Provides CORS header generation and preflight handling for all auth endpoints.
 */

/**
 * Generate CORS headers for API responses
 *
 * @param {string} origin - The origin from the request headers
 * @returns {Object} CORS headers object
 */
function getCorsHeaders(origin) {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://d1ueeugn9zcx7n.cloudfront.net",
    "https://d2ubhx2a13s7gc.cloudfront.net",
    "https://app.budgetbuddy.com",
    "https://admin.budgetbuddy.com",
  ];

  const corsOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[2]; // Default to CloudFront

  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Handle CORS preflight requests (OPTIONS)
 *
 * @param {string} origin - The origin from the request headers
 * @returns {Object} API Gateway response for OPTIONS request
 */
function handleCorsPreflightRequest(origin) {
  return {
    statusCode: 200,
    headers: {
      ...getCorsHeaders(origin),
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
    body: "",
  };
}

module.exports = {
  getCorsHeaders,
  handleCorsPreflightRequest,
};
