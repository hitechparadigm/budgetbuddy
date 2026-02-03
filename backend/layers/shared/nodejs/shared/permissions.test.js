/**
 * Unit tests for Permission System
 */

const fc = require("fast-check");
const {
  PERMISSION_MATRIX,
  hasPermission,
  checkPermission,
  getRolePermissions,
  getAllowedActions,
} = require("./permissions");

describe("Permission System", () => {
  describe("PERMISSION_MATRIX", () => {
    it("should define permissions for all roles", () => {
      expect(PERMISSION_MATRIX).toHaveProperty("primary");
      expect(PERMISSION_MATRIX).toHaveProperty("spouse");
      expect(PERMISSION_MATRIX).toHaveProperty("viewer");
    });

    it("should have consistent action keys across all roles", () => {
      const primaryActions = Object.keys(PERMISSION_MATRIX.primary);
      const spouseActions = Object.keys(PERMISSION_MATRIX.spouse);
      const viewerActions = Object.keys(PERMISSION_MATRIX.viewer);

      expect(primaryActions.sort()).toEqual(spouseActions.sort());
      expect(primaryActions.sort()).toEqual(viewerActions.sort());
    });

    it("should include account permissions for all roles", () => {
      // Verify account permissions exist
      expect(PERMISSION_MATRIX.primary).toHaveProperty("account:view");
      expect(PERMISSION_MATRIX.primary).toHaveProperty("account:create");
      expect(PERMISSION_MATRIX.primary).toHaveProperty("account:edit");
      expect(PERMISSION_MATRIX.primary).toHaveProperty("account:delete");

      expect(PERMISSION_MATRIX.spouse).toHaveProperty("account:view");
      expect(PERMISSION_MATRIX.spouse).toHaveProperty("account:create");
      expect(PERMISSION_MATRIX.spouse).toHaveProperty("account:edit");
      expect(PERMISSION_MATRIX.spouse).toHaveProperty("account:delete");

      expect(PERMISSION_MATRIX.viewer).toHaveProperty("account:view");
      expect(PERMISSION_MATRIX.viewer).toHaveProperty("account:create");
      expect(PERMISSION_MATRIX.viewer).toHaveProperty("account:edit");
      expect(PERMISSION_MATRIX.viewer).toHaveProperty("account:delete");
    });
  });

  /**
   * Property 4: Permission Matrix Completeness for Account Actions
   *
   * For any account action (view, create, edit, delete) and any role (primary, spouse, viewer),
   * the Permission_Matrix should have a defined boolean value, and the value should match
   * the expected permissions:
   * - primary: all account actions allowed
   * - spouse: all account actions allowed
   * - viewer: only view allowed
   *
   * **Validates: Requirements 2.1-2.12**
   */
  describe("Property 4: Permission Matrix Completeness for Account Actions", () => {
    const accountActions = [
      "account:view",
      "account:create",
      "account:edit",
      "account:delete",
    ];
    const roles = ["primary", "spouse", "viewer"];

    test("all account actions have defined boolean values for all roles", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...roles),
          fc.constantFrom(...accountActions),
          (role, action) => {
            const permission = PERMISSION_MATRIX[role][action];
            // Property: permission must be a boolean
            return typeof permission === "boolean";
          },
        ),
        { numRuns: 100 },
      );
    });

    test("primary role has all account permissions", () => {
      fc.assert(
        fc.property(fc.constantFrom(...accountActions), (action) => {
          // Property: primary role should have all account permissions
          return PERMISSION_MATRIX.primary[action] === true;
        }),
        { numRuns: 100 },
      );
    });

    test("spouse role has all account permissions", () => {
      fc.assert(
        fc.property(fc.constantFrom(...accountActions), (action) => {
          // Property: spouse role should have all account permissions
          return PERMISSION_MATRIX.spouse[action] === true;
        }),
        { numRuns: 100 },
      );
    });

    test("viewer role has only view permission for accounts", () => {
      fc.assert(
        fc.property(fc.constantFrom(...accountActions), (action) => {
          const permission = PERMISSION_MATRIX.viewer[action];
          // Property: viewer should only have account:view permission
          if (action === "account:view") {
            return permission === true;
          }
          return permission === false;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("hasPermission", () => {
    describe("Primary Role", () => {
      it("should allow all budget actions", () => {
        expect(hasPermission("primary", "budget:view")).toBe(true);
        expect(hasPermission("primary", "budget:create")).toBe(true);
        expect(hasPermission("primary", "budget:edit")).toBe(true);
        expect(hasPermission("primary", "budget:delete")).toBe(true);
      });

      it("should allow all transaction actions", () => {
        expect(hasPermission("primary", "transaction:view")).toBe(true);
        expect(hasPermission("primary", "transaction:create")).toBe(true);
        expect(hasPermission("primary", "transaction:edit")).toBe(true);
        expect(hasPermission("primary", "transaction:delete")).toBe(true);
      });

      it("should allow all account actions", () => {
        expect(hasPermission("primary", "account:view")).toBe(true);
        expect(hasPermission("primary", "account:create")).toBe(true);
        expect(hasPermission("primary", "account:edit")).toBe(true);
        expect(hasPermission("primary", "account:delete")).toBe(true);
      });

      it("should allow family management actions", () => {
        expect(hasPermission("primary", "family:invite")).toBe(true);
        expect(hasPermission("primary", "family:remove")).toBe(true);
        expect(hasPermission("primary", "family:change-role")).toBe(true);
      });

      it("should NOT allow leaving family", () => {
        expect(hasPermission("primary", "family:leave")).toBe(false);
      });
    });

    describe("Spouse Role", () => {
      it("should allow all budget actions", () => {
        expect(hasPermission("spouse", "budget:view")).toBe(true);
        expect(hasPermission("spouse", "budget:create")).toBe(true);
        expect(hasPermission("spouse", "budget:edit")).toBe(true);
        expect(hasPermission("spouse", "budget:delete")).toBe(true);
      });

      it("should allow all transaction actions", () => {
        expect(hasPermission("spouse", "transaction:view")).toBe(true);
        expect(hasPermission("spouse", "transaction:create")).toBe(true);
        expect(hasPermission("spouse", "transaction:edit")).toBe(true);
        expect(hasPermission("spouse", "transaction:delete")).toBe(true);
      });

      it("should allow all account actions", () => {
        expect(hasPermission("spouse", "account:view")).toBe(true);
        expect(hasPermission("spouse", "account:create")).toBe(true);
        expect(hasPermission("spouse", "account:edit")).toBe(true);
        expect(hasPermission("spouse", "account:delete")).toBe(true);
      });

      it("should NOT allow family management actions", () => {
        expect(hasPermission("spouse", "family:invite")).toBe(false);
        expect(hasPermission("spouse", "family:remove")).toBe(false);
        expect(hasPermission("spouse", "family:change-role")).toBe(false);
      });

      it("should allow leaving family", () => {
        expect(hasPermission("spouse", "family:leave")).toBe(true);
      });
    });

    describe("Viewer Role", () => {
      it("should allow viewing budgets and transactions", () => {
        expect(hasPermission("viewer", "budget:view")).toBe(true);
        expect(hasPermission("viewer", "transaction:view")).toBe(true);
      });

      it("should allow viewing accounts but not modifying", () => {
        expect(hasPermission("viewer", "account:view")).toBe(true);
        expect(hasPermission("viewer", "account:create")).toBe(false);
        expect(hasPermission("viewer", "account:edit")).toBe(false);
        expect(hasPermission("viewer", "account:delete")).toBe(false);
      });

      it("should NOT allow budget modifications", () => {
        expect(hasPermission("viewer", "budget:create")).toBe(false);
        expect(hasPermission("viewer", "budget:edit")).toBe(false);
        expect(hasPermission("viewer", "budget:delete")).toBe(false);
      });

      it("should NOT allow transaction modifications", () => {
        expect(hasPermission("viewer", "transaction:create")).toBe(false);
        expect(hasPermission("viewer", "transaction:edit")).toBe(false);
        expect(hasPermission("viewer", "transaction:delete")).toBe(false);
      });

      it("should NOT allow family management actions", () => {
        expect(hasPermission("viewer", "family:invite")).toBe(false);
        expect(hasPermission("viewer", "family:remove")).toBe(false);
        expect(hasPermission("viewer", "family:change-role")).toBe(false);
      });

      it("should allow leaving family", () => {
        expect(hasPermission("viewer", "family:leave")).toBe(true);
      });
    });

    describe("Invalid Inputs", () => {
      it("should return false for invalid role", () => {
        expect(hasPermission("admin", "budget:view")).toBe(false);
        expect(hasPermission(null, "budget:view")).toBe(false);
        expect(hasPermission(undefined, "budget:view")).toBe(false);
      });

      it("should return false for invalid action", () => {
        expect(hasPermission("primary", "invalid:action")).toBe(false);
        expect(hasPermission("primary", null)).toBe(false);
        expect(hasPermission("primary", undefined)).toBe(false);
      });
    });
  });

  describe("checkPermission", () => {
    describe("Successful Permission Checks", () => {
      it("should allow primary user to create budget", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user123",
                "custom:familyId": "family123",
                "custom:familyRole": "primary",
              },
            },
          },
        };

        const result = checkPermission(event, "budget:create");
        expect(result).toBeNull();
      });

      it("should allow primary user to view accounts", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user123",
                "custom:familyId": "family123",
                "custom:familyRole": "primary",
              },
            },
          },
        };

        const result = checkPermission(event, "account:view");
        expect(result).toBeNull();
      });

      it("should allow primary user to create accounts", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user123",
                "custom:familyId": "family123",
                "custom:familyRole": "primary",
              },
            },
          },
        };

        const result = checkPermission(event, "account:create");
        expect(result).toBeNull();
      });

      it("should allow spouse to edit transaction", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user456",
                "custom:familyId": "family123",
                "custom:familyRole": "spouse",
              },
            },
          },
        };

        const result = checkPermission(event, "transaction:edit");
        expect(result).toBeNull();
      });

      it("should allow viewer to view budget", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user789",
                "custom:familyId": "family123",
                "custom:familyRole": "viewer",
              },
            },
          },
        };

        const result = checkPermission(event, "budget:view");
        expect(result).toBeNull();
      });

      it("should default to primary role if not specified", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user123",
                "custom:familyId": "family123",
              },
            },
          },
        };

        const result = checkPermission(event, "family:invite");
        expect(result).toBeNull();
      });
    });

    describe("Permission Denied", () => {
      it("should deny viewer from creating budget", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user789",
                "custom:familyId": "family123",
                "custom:familyRole": "viewer",
              },
            },
          },
        };

        const result = checkPermission(event, "budget:create");
        expect(result).not.toBeNull();
        expect(result.statusCode).toBe(403);
        expect(JSON.parse(result.body).error).toBe("Forbidden");
        expect(JSON.parse(result.body).userRole).toBe("viewer");
        expect(JSON.parse(result.body).requiredPermission).toBe(
          "budget:create",
        );
      });

      it("should deny viewer from creating accounts", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user789",
                "custom:familyId": "family123",
                "custom:familyRole": "viewer",
              },
            },
          },
        };

        const result = checkPermission(event, "account:create");
        expect(result).not.toBeNull();
        expect(result.statusCode).toBe(403);
        expect(JSON.parse(result.body).error).toBe("Forbidden");
        expect(JSON.parse(result.body).userRole).toBe("viewer");
        expect(JSON.parse(result.body).requiredPermission).toBe(
          "account:create",
        );
      });

      it("should deny spouse from inviting members", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user456",
                "custom:familyId": "family123",
                "custom:familyRole": "spouse",
              },
            },
          },
        };

        const result = checkPermission(event, "family:invite");
        expect(result).not.toBeNull();
        expect(result.statusCode).toBe(403);
        expect(JSON.parse(result.body).error).toBe("Forbidden");
      });

      it("should deny primary from leaving family", () => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                "custom:userId": "user123",
                "custom:familyId": "family123",
                "custom:familyRole": "primary",
              },
            },
          },
        };

        const result = checkPermission(event, "family:leave");
        expect(result).not.toBeNull();
        expect(result.statusCode).toBe(403);
      });
    });

    describe("Authentication Errors", () => {
      it("should return 401 if no user context", () => {
        const event = {
          requestContext: {},
        };

        const result = checkPermission(event, "budget:create");
        expect(result).not.toBeNull();
        expect(result.statusCode).toBe(401);
        expect(JSON.parse(result.body).error).toBe("Unauthorized");
      });

      it("should return 401 if no authorizer", () => {
        const event = {
          requestContext: {
            authorizer: null,
          },
        };

        const result = checkPermission(event, "budget:create");
        expect(result).not.toBeNull();
        expect(result.statusCode).toBe(401);
      });
    });
  });

  describe("getRolePermissions", () => {
    it("should return all permissions for primary role", () => {
      const permissions = getRolePermissions("primary");
      expect(permissions).toHaveProperty("budget:view", true);
      expect(permissions).toHaveProperty("family:invite", true);
      expect(permissions).toHaveProperty("family:leave", false);
      expect(permissions).toHaveProperty("account:view", true);
      expect(permissions).toHaveProperty("account:create", true);
    });

    it("should return all permissions for spouse role", () => {
      const permissions = getRolePermissions("spouse");
      expect(permissions).toHaveProperty("budget:create", true);
      expect(permissions).toHaveProperty("family:invite", false);
      expect(permissions).toHaveProperty("family:leave", true);
      expect(permissions).toHaveProperty("account:view", true);
      expect(permissions).toHaveProperty("account:create", true);
    });

    it("should return all permissions for viewer role", () => {
      const permissions = getRolePermissions("viewer");
      expect(permissions).toHaveProperty("budget:view", true);
      expect(permissions).toHaveProperty("budget:create", false);
      expect(permissions).toHaveProperty("family:leave", true);
      expect(permissions).toHaveProperty("account:view", true);
      expect(permissions).toHaveProperty("account:create", false);
    });

    it("should return empty object for invalid role", () => {
      expect(getRolePermissions("invalid")).toEqual({});
      expect(getRolePermissions(null)).toEqual({});
      expect(getRolePermissions(undefined)).toEqual({});
    });
  });

  describe("getAllowedActions", () => {
    it("should return all allowed actions for primary role", () => {
      const actions = getAllowedActions("primary");
      expect(actions).toContain("budget:view");
      expect(actions).toContain("budget:create");
      expect(actions).toContain("family:invite");
      expect(actions).toContain("account:view");
      expect(actions).toContain("account:create");
      expect(actions).not.toContain("family:leave");
    });

    it("should return all allowed actions for spouse role", () => {
      const actions = getAllowedActions("spouse");
      expect(actions).toContain("budget:view");
      expect(actions).toContain("transaction:create");
      expect(actions).toContain("family:leave");
      expect(actions).toContain("account:view");
      expect(actions).toContain("account:create");
      expect(actions).not.toContain("family:invite");
    });

    it("should return all allowed actions for viewer role", () => {
      const actions = getAllowedActions("viewer");
      expect(actions).toContain("budget:view");
      expect(actions).toContain("transaction:view");
      expect(actions).toContain("family:leave");
      expect(actions).toContain("account:view");
      expect(actions).not.toContain("budget:create");
      expect(actions).not.toContain("transaction:create");
      expect(actions).not.toContain("account:create");
    });

    it("should return empty array for invalid role", () => {
      expect(getAllowedActions("invalid")).toEqual([]);
      expect(getAllowedActions(null)).toEqual([]);
    });
  });
});
