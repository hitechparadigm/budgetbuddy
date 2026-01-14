/**
 * BudgetBuddy Auth Onboarding Lambda Function
 *
 * Handles user onboarding completion, including:
 * - Marking user profile as onboarded
 * - Creating initial budget for current month
 * - Setting up expense categories based on user selections
 *
 * CRITICAL: All imports at top of file to prevent ReferenceError bugs
 */

// AWS SDK imports (MUST be at top)
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

// Shared utilities from Lambda Layer (MUST be at top)
const { getCorsHeaders } = require("/opt/nodejs/shared/cors");
const { parseIdToken } = require("/opt/nodejs/shared/token-parser");
const { validateOnboardingInput } = require("/opt/nodejs/shared/validators");
const {
  formatErrorResponse,
  ValidationError,
  AuthenticationError,
} = require("/opt/nodejs/shared/errors");

// Local utilities from Lambda Layer (MUST be at top)
const { dynamoHelpers, FamilyIdResolver } = require("/opt/nodejs/utils");

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME;

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Lambda handler for onboarding completion
 */
exports.handler = async (event) => {
  console.log("=== AUTH ONBOARDING LAMBDA ===");
  console.log("Event:", JSON.stringify(event, null, 2));

  const origin = event.headers?.origin || event.headers?.Origin || "*";

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: "",
    };
  }

  try {
    // Extract and validate Authorization header
    const authHeader =
      event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      throw new AuthenticationError("Authorization header is required");
    }

    // Parse ID token to get userId
    const token = authHeader.replace("Bearer ", "");
    const payload = parseIdToken(token);

    // Get userId from custom attribute or fallback to sub
    let userId = payload["custom:userId"];
    if (!userId) {
      console.log("custom:userId not found in token, using sub as fallback");
      userId = payload.sub;
    }

    if (!userId) {
      throw new AuthenticationError("User ID not found in token");
    }

    // Extract familyId from JWT if available
    const jwtFamilyId = payload["custom:familyId"] || null;

    // Parse and validate request body
    if (!event.body) {
      throw new ValidationError(["Request body is required"]);
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      throw new ValidationError(["Invalid JSON format"]);
    }

    // Validate onboarding input
    const validationErrors = validateOnboardingInput(requestBody);
    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors);
    }

    console.log("Onboarding validation passed");
    console.log("  - city:", requestBody.city);
    console.log("  - country:", requestBody.country);
    console.log("  - familySize:", requestBody.familySize);
    console.log("  - currentMonth:", requestBody.currentMonth);
    console.log(
      "  - selectedCategories:",
      requestBody.selectedCategories.length
    );

    // Resolve familyId using centralized resolver
    const familyId = await FamilyIdResolver.resolveFamilyId(
      userId,
      jwtFamilyId,
      dynamoHelpers
    );

    FamilyIdResolver.logFamilyIdResolution(
      "auth-onboarding",
      "onboarding",
      userId,
      familyId,
      jwtFamilyId ? "jwt" : "dynamodb-or-fallback"
    );

    console.log("Family ID resolution:");
    console.log("  - userId:", userId);
    console.log("  - jwtFamilyId:", jwtFamilyId);
    console.log("  - resolved familyId:", familyId);

    const currentTime = new Date().toISOString();

    // Update user profile to mark onboarding as completed
    const updateCommand = new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: `USER#${userId}` },
        SK: { S: "PROFILE" },
      },
      UpdateExpression:
        "SET onboardingCompleted = :completed, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":completed": { BOOL: true },
        ":updatedAt": { S: currentTime },
      },
      ReturnValues: "ALL_NEW",
    });

    await dynamoClient.send(updateCommand);
    console.log("User profile updated - onboarding completed");

    // Create initial budget for current month
    const currentMonth = requestBody.currentMonth;
    const budgetId = `budget_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    // Transform selected categories into budget groups
    const expenseCategories = requestBody.selectedCategories.map((cat) => ({
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: cat.name,
      icon: cat.icon,
      plannedAmount: cat.adjustedAmount,
      spentAmount: 0,
      transactions: [],
      order: 1,
      isRecurring: false,
    }));

    const budgetGroups = {
      income: [],
      savings: [],
      expenses: expenseCategories,
    };

    // Calculate totals
    const totalExpenses = expenseCategories.reduce(
      (sum, cat) => sum + cat.plannedAmount,
      0
    );

    const budget = {
      PK: `FAMILY#${familyId}`,
      SK: `BUDGET#${currentMonth}`,
      GSI2PK: `BUDGET#${currentMonth}`,
      GSI2SK: `FAMILY#${familyId}`,
      entityType: "BUDGET",
      budgetId,
      familyId,
      month: currentMonth,
      totalIncome: 0,
      totalSavings: 0,
      totalExpenses,
      remainingBalance: -totalExpenses,
      groups: budgetGroups,
      isAIGenerated: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    console.log("Creating budget:", {
      familyId,
      month: currentMonth,
      budgetId,
      totalExpenses,
      categoriesCount: expenseCategories.length,
    });

    // Create budget in DynamoDB
    await dynamoHelpers.putItem(budget);
    console.log("Initial budget created from onboarding selections");

    FamilyIdResolver.logFamilyIdResolution(
      "auth-onboarding",
      "budget-creation",
      userId,
      familyId,
      "budget-created"
    );

    // Verify budget was created
    try {
      const verificationBudget = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `BUDGET#${currentMonth}`
      );

      if (verificationBudget) {
        console.log("Budget verification successful");
        FamilyIdResolver.logFamilyIdResolution(
          "auth-onboarding",
          "budget-verification",
          userId,
          familyId,
          "verification-success"
        );
      } else {
        console.error("Budget verification failed - budget not found");
        FamilyIdResolver.logFamilyIdResolution(
          "auth-onboarding",
          "budget-verification",
          userId,
          familyId,
          "verification-failed"
        );

        return {
          statusCode: 500,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Budget Creation Verification Failed",
            message: "Budget was created but could not be verified immediately",
            debugInfo: {
              userId,
              familyId,
              partitionKey: `FAMILY#${familyId}`,
              sortKey: `BUDGET#${currentMonth}`,
              budgetId: budget.budgetId,
            },
          }),
        };
      }
    } catch (verifyError) {
      console.error("Budget verification error:", verifyError);
      FamilyIdResolver.logFamilyIdResolution(
        "auth-onboarding",
        "budget-verification",
        userId,
        familyId,
        "verification-error"
      );
      // Continue with success response despite verification error
    }

    // Return success response
    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        message: "Onboarding completed successfully",
        budgetCreated: true,
        budgetId,
        month: currentMonth,
        totalExpenses,
        categoriesCreated: expenseCategories.length,
        debugInfo: {
          userId,
          familyId,
          jwtFamilyId,
          partitionKey: `FAMILY#${familyId}`,
          sortKey: `BUDGET#${currentMonth}`,
          resolutionSource: jwtFamilyId ? "jwt" : "dynamodb-or-fallback",
        },
      }),
    };
  } catch (error) {
    console.error("Onboarding error:", error);

    // Handle custom errors
    if (
      error instanceof ValidationError ||
      error instanceof AuthenticationError
    ) {
      return formatErrorResponse(error, origin);
    }

    // Handle unexpected errors
    return {
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to complete onboarding",
        details: error.message,
      }),
    };
  }
};
