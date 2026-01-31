/**
 * Permission System for Family Collaboration
 *
 * Implements role-based access control (RBAC) for family members.
 * Enforces permissions based on user roles: primary, spouse, viewer.
 */

/**
 * Permission matrix defining what each role can do
 *
 * Actions:
 * - budget:view - View budgets
 * - budget:create - Create new budgets
 * - budget:edit - Edit existing budgets
 * - budget:delete - Delete budgets
 * - transaction:view - View transactions
 * - transaction:create - Add new transactions
 * - transaction:edit - Edit existing transactions
 * - transaction:delete - Delete transactions
 * - family:invite - Send family invitations
 * - family:remove - Remove family members
 * - family:change-role - Change member roles
 * - family:leave - Leave family
 */
const PERMISSION_MATRIX = {
  primary: {
    "budget:view": true,
    "budget:create": true,
    "budget:edit": true,
    "budget:delete": true,
    "transaction:view": true,
    "transaction:create": true,
    "transaction:edit": true,
    "transaction:delete": true,
    "family:invite": true,
    "family:remove": true,
    "family:change-role": true,
    "family:leave": false, // Primary cannot leave
  },
  spouse: {
    "budget:view": true,
    "budget:create": true,
    "budget:edit": true,
    "budget:delete": true,
    "transaction:view": true,
    "transaction:create": true,
    "transaction:edit": true,
    "transaction:delete": true,
    "family:invite": false,
    "family:remove": false,
    "family:change-role": false,
    "family:leave": true,
  },
  viewer: {
    "budget:view": true,
    "budget:create": false,
    "budget:edit": false,
    "budget:delete": false,
    "transaction:view": true,
    "transaction:create": false,
    "transaction:edit": false,
    "transaction:delete": false,
    "family:invite": false,
    "family:remove": false,
    "family:change-role": false,
    "family:leave": true,
  },
};

/**
 * Check if a role has permission to perform an action
 *
 * @param {string} role - User role (primary, spouse, viewer)
 * @param {string} action - Action to check (e.g., "budget:create")
 * @returns {boolean} - True if role has permission, false otherwise
 */
function hasPermission(role, action) {
  // Validate role
  if (!role || !PERMISSION_MATRIX[role]) {
    console.warn(`Invalid role: ${role}`);
    return false;
  }

  // Validate action
  if (!action) {
    console.warn("Action is required");
    return false;
  }

  // Check permission
  const rolePermissions = PERMISSION_MATRIX[role];
  const hasAccess = rolePermissions[action] === true;

  console.log(
    `Permission check: role=${role}, action=${action}, allowed=${hasAccess}`,
  );

  return hasAccess;
}

/**
 * Middleware to check permissions before executing Lambda handler
 *
 * Usage:
 * const result = await checkPermission(event, "budget:create");
 * if (result.statusCode === 403) {
 *   return result; // Permission denied
 * }
 * // Continue with handler logic
 *
 * @param {object} event - Lambda event object
 * @param {string} action - Action to check (e.g., "budget:create")
 * @returns {object|null} - Error response if permission denied, null if allowed
 */
function checkPermission(event, action) {
  try {
    // Extract user info from JWT token (added by authorizer)
    const user = event.requestContext?.authorizer?.claims;

    if (!user) {
      return {
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Unauthorized",
          message: "No user context found",
        }),
      };
    }

    // Get user role from JWT claims
    const role = user["custom:familyRole"] || "primary";

    // Check if role has permission
    if (!hasPermission(role, action)) {
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Forbidden",
          message: `Role '${role}' does not have permission to perform action '${action}'`,
          requiredPermission: action,
          userRole: role,
        }),
      };
    }

    // Permission granted
    return null;
  } catch (error) {
    console.error("Error in checkPermission:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to check permissions",
      }),
    };
  }
}

/**
 * Get all permissions for a role
 *
 * @param {string} role - User role (primary, spouse, viewer)
 * @returns {object} - Object with all permissions for the role
 */
function getRolePermissions(role) {
  if (!role || !PERMISSION_MATRIX[role]) {
    return {};
  }
  return { ...PERMISSION_MATRIX[role] };
}

/**
 * Get list of actions a role can perform
 *
 * @param {string} role - User role (primary, spouse, viewer)
 * @returns {string[]} - Array of action names the role can perform
 */
function getAllowedActions(role) {
  const permissions = getRolePermissions(role);
  return Object.keys(permissions).filter((action) => permissions[action]);
}

module.exports = {
  PERMISSION_MATRIX,
  hasPermission,
  checkPermission,
  getRolePermissions,
  getAllowedActions,
};
