/**
 * E2E Test Data Manager
 *
 * Manages test data creation and cleanup for E2E tests:
 * - Creates users, families, budgets, transactions, accounts, goals
 * - Tracks all created items for cleanup
 * - Provides unique ID generation
 * - Ensures complete cleanup even on test failure
 *
 * Uses AWS SDK v3 for DynamoDB operations.
 */

const {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

/**
 * DataManager class for E2E test data
 */
class DataManager {
  constructor() {
    this.createdItems = [];
    this.client = null;
  }

  /**
   * Get DynamoDB client (lazy initialization)
   * @returns {DynamoDBClient}
   */
  getDynamoDBClient() {
    if (!this.client) {
      const region = process.env.AWS_REGION || "us-east-1";
      this.client = new DynamoDBClient({ region });
    }
    return this.client;
  }

  /**
   * Generate unique ID with prefix
   * @param {string} prefix - ID prefix (e.g., 'user', 'family', 'budget')
   * @returns {string} Unique ID
   */
  generateUniqueId(prefix) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create a user in DynamoDB
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} familyId - Family ID
   * @returns {Promise<Object>} Created user data
   */
  async createUser(userId, email, familyId) {
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      throw new Error("DYNAMODB_TABLE_NAME environment variable is required");
    }

    const user = {
      PK: `USER#${userId}`,
      SK: `PROFILE`,
      userId,
      email,
      familyId,
      createdAt: new Date().toISOString(),
    };

    try {
      const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall(user),
      });

      await this.getDynamoDBClient().send(command);

      // Track for cleanup
      this.createdItems.push({
        PK: user.PK,
        SK: user.SK,
      });

      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Create a family in DynamoDB
   * @param {string} familyId - Family ID
   * @param {string} primaryUserId - Primary user ID
   * @returns {Promise<Object>} Created family data
   */
  async createFamily(familyId, primaryUserId) {
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      throw new Error("DYNAMODB_TABLE_NAME environment variable is required");
    }

    const family = {
      PK: `FAMILY#${familyId}`,
      SK: `METADATA`,
      familyId,
      primaryUserId,
      createdAt: new Date().toISOString(),
    };

    try {
      const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall(family),
      });

      await this.getDynamoDBClient().send(command);

      // Track for cleanup
      this.createdItems.push({
        PK: family.PK,
        SK: family.SK,
      });

      return family;
    } catch (error) {
      throw new Error(`Failed to create family: ${error.message}`);
    }
  }

  /**
   * Create a budget in DynamoDB
   * @param {string} familyId - Family ID
   * @param {string} month - Budget month (YYYY-MM)
   * @param {Array} categories - Budget categories
   * @returns {Promise<Object>} Created budget data
   */
  async createBudget(familyId, month, categories) {
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      throw new Error("DYNAMODB_TABLE_NAME environment variable is required");
    }

    const budgetId = this.generateUniqueId("budget");
    const budget = {
      PK: `FAMILY#${familyId}`,
      SK: `BUDGET#${month}`,
      budgetId,
      familyId,
      month,
      categories: categories || [],
      createdAt: new Date().toISOString(),
    };

    try {
      const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall(budget),
      });

      await this.getDynamoDBClient().send(command);

      // Track for cleanup
      this.createdItems.push({
        PK: budget.PK,
        SK: budget.SK,
      });

      return budget;
    } catch (error) {
      throw new Error(`Failed to create budget: ${error.message}`);
    }
  }

  /**
   * Create a transaction in DynamoDB
   * @param {string} familyId - Family ID
   * @param {string} budgetId - Budget ID
   * @param {string} categoryId - Category ID
   * @param {number} amount - Transaction amount
   * @returns {Promise<Object>} Created transaction data
   */
  async createTransaction(familyId, budgetId, categoryId, amount) {
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      throw new Error("DYNAMODB_TABLE_NAME environment variable is required");
    }

    const transactionId = this.generateUniqueId("transaction");
    const transaction = {
      PK: `FAMILY#${familyId}`,
      SK: `TRANSACTION#${transactionId}`,
      transactionId,
      familyId,
      budgetId,
      categoryId,
      amount,
      createdAt: new Date().toISOString(),
    };

    try {
      const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall(transaction),
      });

      await this.getDynamoDBClient().send(command);

      // Track for cleanup
      this.createdItems.push({
        PK: transaction.PK,
        SK: transaction.SK,
      });

      return transaction;
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  /**
   * Create a bank account in DynamoDB
   * @param {string} familyId - Family ID
   * @param {string} plaidAccessToken - Plaid access token
   * @param {Object} accountData - Account data
   * @returns {Promise<Object>} Created account data
   */
  async createBankAccount(familyId, plaidAccessToken, accountData) {
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      throw new Error("DYNAMODB_TABLE_NAME environment variable is required");
    }

    const accountId = this.generateUniqueId("account");
    const account = {
      PK: `FAMILY#${familyId}`,
      SK: `ACCOUNT#${accountId}`,
      accountId,
      familyId,
      plaidAccessToken,
      ...accountData,
      createdAt: new Date().toISOString(),
    };

    try {
      const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall(account),
      });

      await this.getDynamoDBClient().send(command);

      // Track for cleanup
      this.createdItems.push({
        PK: account.PK,
        SK: account.SK,
      });

      return account;
    } catch (error) {
      throw new Error(`Failed to create bank account: ${error.message}`);
    }
  }

  /**
   * Create a goal in DynamoDB
   * @param {string} familyId - Family ID
   * @param {string} type - Goal type (debt, savings)
   * @param {string} name - Goal name
   * @param {number} targetAmount - Target amount
   * @returns {Promise<Object>} Created goal data
   */
  async createGoal(familyId, type, name, targetAmount) {
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      throw new Error("DYNAMODB_TABLE_NAME environment variable is required");
    }

    const goalId = this.generateUniqueId("goal");
    const goal = {
      PK: `FAMILY#${familyId}`,
      SK: `GOAL#${goalId}`,
      goalId,
      familyId,
      type,
      name,
      targetAmount,
      currentAmount: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall(goal),
      });

      await this.getDynamoDBClient().send(command);

      // Track for cleanup
      this.createdItems.push({
        PK: goal.PK,
        SK: goal.SK,
      });

      return goal;
    } catch (error) {
      throw new Error(`Failed to create goal: ${error.message}`);
    }
  }

  /**
   * Clean up all created test data
   * @returns {Promise<void>}
   */
  async cleanup() {
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      throw new Error("DYNAMODB_TABLE_NAME environment variable is required");
    }

    const errors = [];

    // Delete all tracked items
    for (const item of this.createdItems) {
      try {
        const command = new DeleteItemCommand({
          TableName: tableName,
          Key: marshall({
            PK: item.PK,
            SK: item.SK,
          }),
        });

        await this.getDynamoDBClient().send(command);
      } catch (error) {
        // Collect errors but continue cleanup
        errors.push(`Failed to delete ${item.PK}#${item.SK}: ${error.message}`);
      }
    }

    // Clear tracked items
    this.createdItems = [];

    // If there were errors, throw them
    if (errors.length > 0) {
      throw new Error(`Cleanup errors: ${errors.join(", ")}`);
    }
  }
}

module.exports = { DataManager };
