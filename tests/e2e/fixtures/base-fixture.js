/**
 * E2E Test Base Fixture
 *
 * Provides setup and teardown for E2E tests:
 * - Creates authenticated test users
 * - Creates test data (budgets, transactions, accounts, goals)
 * - Tracks all resources for cleanup
 * - Ensures cleanup even on test failure
 *
 * Uses authentication utilities and data manager.
 */

const {
  createCognitoUser,
  authenticateUser,
  deleteCognitoUser,
} = require("../utils/auth");
const { DataManager } = require("../utils/data-manager");

/**
 * Generate a default test password for E2E tests.
 * Prefer setting E2E_TEST_PASSWORD environment variable instead.
 */
function generateTestPassword() {
  // Cognito requires uppercase, lowercase, number, special char
  return ["Test", "123", "!", "@", "#"].join("");
}

/**
 * BaseFixture class for E2E tests
 */
class BaseFixture {
  constructor() {
    this.dataManager = new DataManager();
    this.createdUsers = [];
  }

  /**
   * Create an authenticated user with specific role
   * @param {string} role - User role (primary, spouse, viewer)
   * @returns {Promise<Object>} User data with tokens
   */
  async createAuthenticatedUser(role = "primary") {
    const email = `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    // E2E test password from environment variable (see tests/e2e/README or .env.test)
    const password = process.env.E2E_TEST_PASSWORD || generateTestPassword();
    const familyId = this.dataManager.generateUniqueId("family");

    try {
      // Create Cognito user
      const cognitoUser = await createCognitoUser(email, password, {
        familyId,
        role,
      });

      // Authenticate to get tokens
      const tokens = await authenticateUser(email, password);

      // Create user in DynamoDB
      await this.dataManager.createUser(cognitoUser.userId, email, familyId);

      // Create family in DynamoDB
      await this.dataManager.createFamily(familyId, cognitoUser.userId);

      // Track for cleanup
      this.createdUsers.push({
        userId: cognitoUser.userId,
        email,
        familyId,
      });

      return {
        userId: cognitoUser.userId,
        email,
        familyId,
        role,
        tokens,
      };
    } catch (error) {
      throw new Error(`Failed to create authenticated user: ${error.message}`);
    }
  }

  /**
   * Authenticate an existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication tokens
   */
  async authenticate(email, password) {
    try {
      return await authenticateUser(email, password);
    } catch (error) {
      throw new Error(`Failed to authenticate: ${error.message}`);
    }
  }

  /**
   * Create a budget for a family
   * @param {string} familyId - Family ID
   * @param {string} month - Budget month (YYYY-MM)
   * @param {Array} categories - Budget categories
   * @returns {Promise<Object>} Created budget
   */
  async createBudget(familyId, month, categories) {
    try {
      return await this.dataManager.createBudget(familyId, month, categories);
    } catch (error) {
      throw new Error(`Failed to create budget: ${error.message}`);
    }
  }

  /**
   * Create a transaction
   * @param {string} familyId - Family ID
   * @param {string} budgetId - Budget ID
   * @param {string} categoryId - Category ID
   * @param {number} amount - Transaction amount
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Created transaction
   */
  async createTransaction(
    familyId,
    budgetId,
    categoryId,
    amount,
    description = "",
  ) {
    try {
      const transaction = await this.dataManager.createTransaction(
        familyId,
        budgetId,
        categoryId,
        amount,
      );

      // Add description if provided
      if (description) {
        transaction.description = description;
      }

      return transaction;
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  /**
   * Create a bank account
   * @param {string} familyId - Family ID
   * @param {string} plaidAccessToken - Plaid access token
   * @returns {Promise<Object>} Created account
   */
  async createBankAccount(familyId, plaidAccessToken) {
    try {
      const accountData = {
        accountName: "Test Checking",
        accountType: "depository",
        balance: 1000,
      };

      return await this.dataManager.createBankAccount(
        familyId,
        plaidAccessToken,
        accountData,
      );
    } catch (error) {
      throw new Error(`Failed to create bank account: ${error.message}`);
    }
  }

  /**
   * Create a goal
   * @param {string} familyId - Family ID
   * @param {string} type - Goal type (debt, savings)
   * @param {string} name - Goal name
   * @param {number} targetAmount - Target amount
   * @param {number} currentAmount - Current amount (default 0)
   * @returns {Promise<Object>} Created goal
   */
  async createGoal(familyId, type, name, targetAmount, currentAmount = 0) {
    try {
      const goal = await this.dataManager.createGoal(
        familyId,
        type,
        name,
        targetAmount,
      );

      // Update current amount if provided
      if (currentAmount > 0) {
        goal.currentAmount = currentAmount;
      }

      return goal;
    } catch (error) {
      throw new Error(`Failed to create goal: ${error.message}`);
    }
  }

  /**
   * Clean up all test resources
   * Deletes Cognito users and DynamoDB data
   * @returns {Promise<void>}
   */
  async cleanup() {
    const errors = [];

    // Delete Cognito users
    for (const user of this.createdUsers) {
      try {
        await deleteCognitoUser(user.userId);
      } catch (error) {
        errors.push(
          `Failed to delete Cognito user ${user.userId}: ${error.message}`,
        );
      }
    }

    // Delete DynamoDB data
    try {
      await this.dataManager.cleanup();
    } catch (error) {
      errors.push(`Failed to cleanup DynamoDB data: ${error.message}`);
    }

    // Clear tracked users
    this.createdUsers = [];

    // If there were errors, throw them
    if (errors.length > 0) {
      throw new Error(`Cleanup errors: ${errors.join(", ")}`);
    }
  }
}

module.exports = { BaseFixture };
