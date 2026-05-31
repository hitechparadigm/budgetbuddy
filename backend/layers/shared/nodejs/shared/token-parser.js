/**
 * Token Parsing Utilities for BudgetBuddy Authentication
 *
 * Provides JWT token parsing and validation for all auth endpoints.
 */

/**
 * Parse Authorization header and extract user ID from JWT token
 *
 * @param {string} authHeader - Authorization header value (e.g., "Bearer eyJ...")
 * @returns {Object} { userId, payload } - User ID and full token payload
 * @throws {Error} If token is invalid or user ID not found
 */
function parseAuthToken(authHeader) {
  if (!authHeader) {
    throw new Error("Authorization header is required");
  }

  const token = authHeader.replace("Bearer ", "");
  const tokenParts = token.split(".");

  if (tokenParts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());

  // Try to get userId from custom attribute, fallback to sub (Cognito user ID)
  const userId = payload["custom:userId"] || payload.sub;

  if (!userId) {
    throw new Error("User ID not found in token");
  }

  return { userId, payload };
}

/**
 * Parse ID token and extract user information
 *
 * @param {string} idToken - JWT ID token
 * @returns {Object} Token payload with user information
 * @throws {Error} If token is invalid
 */
function parseIdToken(idToken) {
  if (!idToken) {
    throw new Error("ID token is required");
  }

  const tokenParts = idToken.split(".");

  if (tokenParts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());

  return payload;
}

/**
 * Parse Google ID token and extract user information
 *
 * Note: This is basic parsing. In production, verify signature with Google's public keys.
 *
 * @param {string} googleIdToken - Google ID token
 * @returns {Object} Token payload with Google user information
 * @throws {Error} If token is invalid
 */
function parseGoogleToken(googleIdToken) {
  if (!googleIdToken) {
    throw new Error("Google ID token is required");
  }

  const tokenParts = googleIdToken.split(".");

  if (tokenParts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());

  // Validate required Google token fields
  if (!payload.email) {
    throw new Error("Email not found in Google token");
  }

  return payload;
}

module.exports = {
  parseAuthToken,
  parseIdToken,
  parseGoogleToken,
  sanitizeFamilyId,
};

/**
 * Sanitize a familyId value from a JWT token claim.
 *
 * Cognito stores custom attributes as strings. When a user hasn't completed
 * onboarding, custom:familyId may be the literal string "undefined", "null",
 * or an empty string — all of which must be treated as absent.
 *
 * @param {any} value - Raw value from JWT claim
 * @returns {string|null} Valid familyId string, or null if absent/invalid
 */
function sanitizeFamilyId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (str === "" || str === "undefined" || str === "null") return null;
  return str;
}
