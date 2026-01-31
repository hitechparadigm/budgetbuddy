/**
 * Export Service - CSV and PDF Export Functionality
 * Handles data export requests for budget and transaction data
 */

const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";

/**
 * Get CORS headers for API responses
 */
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Parse and validate JWT token
 */
function parseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error("Invalid JWT token");
  }
}

/**
 * Get user's family ID from their profile
 */
async function getFamilyId(userId) {
  try {
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
        },
      })
      .promise();

    if (!result.Item) {
      throw new Error("User profile not found");
    }

    return result.Item.familyId;
  } catch (error) {
    console.error("Error getting family ID:", error);
    throw error;
  }
}

/**
 * Get all budgets for a family
 */
async function getBudgets(familyId, startDate, endDate) {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :familyId",
      ExpressionAttributeValues: {
        ":familyId": `FAMILY#${familyId}`,
      },
    };

    // Add date filtering if provided
    if (startDate && endDate) {
      params.FilterExpression = "#month BETWEEN :startDate AND :endDate";
      params.ExpressionAttributeNames = {
        "#month": "month",
      };
      params.ExpressionAttributeValues[":startDate"] = startDate;
      params.ExpressionAttributeValues[":endDate"] = endDate;
    }

    const result = await dynamodb.query(params).promise();
    return result.Items.filter((item) => item.SK.startsWith("BUDGET#"));
  } catch (error) {
    console.error("Error getting budgets:", error);
    throw error;
  }
}

/**
 * Get all transactions for a family
 */
async function getTransactions(familyId, startDate, endDate) {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :familyId",
      ExpressionAttributeValues: {
        ":familyId": `FAMILY#${familyId}`,
      },
    };

    // Add date filtering if provided
    if (startDate && endDate) {
      params.FilterExpression = "#date BETWEEN :startDate AND :endDate";
      params.ExpressionAttributeNames = {
        "#date": "date",
      };
      params.ExpressionAttributeValues[":startDate"] = startDate;
      params.ExpressionAttributeValues[":endDate"] = endDate;
    }

    const result = await dynamodb.query(params).promise();
    return result.Items.filter((item) => item.SK.startsWith("TRANSACTION#"));
  } catch (error) {
    console.error("Error getting transactions:", error);
    throw error;
  }
}

/**
 * Get user profile
 */
async function getUserProfile(userId) {
  try {
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
        },
      })
      .promise();

    return result.Item || null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

/**
 * Generate JSON backup with all user data
 */
function generateJSONBackup(userProfile, budgets, transactions) {
  const backup = {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    application: "BudgetBuddy",
    data: {
      user: {
        userId: userProfile?.userId || null,
        email: userProfile?.email || null,
        familyId: userProfile?.familyId || null,
        onboardingCompleted: userProfile?.onboardingCompleted || false,
        createdAt: userProfile?.createdAt || null,
      },
      budgets: budgets.map((budget) => ({
        budgetId: budget.budgetId,
        month: budget.month,
        categories: budget.categories || [],
        totalIncome: budget.totalIncome || 0,
        totalSavings: budget.totalSavings || 0,
        totalExpenses: budget.totalExpenses || 0,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      })),
      transactions: transactions.map((transaction) => ({
        transactionId: transaction.transactionId,
        date: transaction.date,
        category: transaction.category,
        description: transaction.description || "",
        amount: transaction.amount,
        type: transaction.type,
        budgetMonth: transaction.budgetMonth,
        createdAt: transaction.createdAt,
      })),
    },
    metadata: {
      totalBudgets: budgets.length,
      totalTransactions: transactions.length,
      dateRange: {
        earliest:
          transactions.length > 0
            ? transactions.reduce(
                (min, t) => (t.date < min ? t.date : min),
                transactions[0].date,
              )
            : null,
        latest:
          transactions.length > 0
            ? transactions.reduce(
                (max, t) => (t.date > max ? t.date : max),
                transactions[0].date,
              )
            : null,
      },
    },
  };

  return backup;
}

/**
 * Convert budget and transaction data to CSV format
 */
function generateCSV(budgets, transactions) {
  const csvRows = [];

  // CSV Header
  csvRows.push("Date,Category,Description,Amount,Type,Budget Month,Item Type");

  // Add budget categories
  budgets.forEach((budget) => {
    if (budget.categories) {
      budget.categories.forEach((category) => {
        csvRows.push(
          [
            budget.month,
            `"${category.name}"`,
            `"Budget - ${category.name}"`,
            category.plannedAmount || 0,
            category.type || "expense",
            budget.month,
            "Budget Category",
          ].join(","),
        );
      });
    }
  });

  // Add transactions
  transactions.forEach((transaction) => {
    csvRows.push(
      [
        transaction.date,
        `"${transaction.category}"`,
        `"${transaction.description || ""}"`,
        transaction.amount,
        transaction.type,
        transaction.budgetMonth || transaction.date.substring(0, 7), // YYYY-MM format
        "Transaction",
      ].join(","),
    );
  });

  return csvRows.join("\n");
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format month string (YYYY-MM) to readable format
 */
function formatMonth(monthString) {
  const [year, month] = monthString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Generate PDF budget report
 */
async function generatePDF(budgets, transactions) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "LETTER" });
      const chunks = [];

      // Collect PDF data
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Group data by month
      const monthlyData = {};
      budgets.forEach((budget) => {
        if (!monthlyData[budget.month]) {
          monthlyData[budget.month] = {
            budget,
            transactions: [],
          };
        }
        monthlyData[budget.month].budget = budget;
      });

      transactions.forEach((transaction) => {
        const month =
          transaction.budgetMonth || transaction.date.substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { budget: null, transactions: [] };
        }
        monthlyData[month].transactions.push(transaction);
      });

      // Sort months
      const sortedMonths = Object.keys(monthlyData).sort();

      // Title Page
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("BudgetBuddy", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(18)
        .font("Helvetica")
        .text("Budget Report", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        { align: "center" },
      );
      doc.moveDown(2);

      // Generate report for each month
      sortedMonths.forEach((month, index) => {
        if (index > 0) doc.addPage();

        const data = monthlyData[month];
        const budget = data.budget;

        // Month Header
        doc
          .fontSize(20)
          .font("Helvetica-Bold")
          .fillColor("#2563eb")
          .text(formatMonth(month), { align: "center" });
        doc.moveDown(1);
        doc.fillColor("#000000");

        if (budget && budget.groups) {
          // Calculate totals
          let totalIncome = 0;
          let totalSavings = 0;
          let totalExpenses = 0;
          let totalSpent = 0;

          budget.groups.forEach((group) => {
            group.categories.forEach((category) => {
              const planned = category.plannedAmount || 0;
              const spent = category.spentAmount || 0;

              if (group.type === "income") {
                totalIncome += planned;
              } else if (group.type === "savings") {
                totalSavings += planned;
              } else {
                totalExpenses += planned;
              }
              totalSpent += spent;
            });
          });

          const remaining = totalIncome - totalSavings - totalExpenses;

          // Summary Box
          doc.fontSize(14).font("Helvetica-Bold").text("Budget Summary");
          doc.moveDown(0.5);

          const summaryY = doc.y;
          doc
            .fontSize(11)
            .font("Helvetica")
            .text(`Total Income:`, 50, summaryY)
            .text(formatCurrency(totalIncome), 200, summaryY, {
              align: "right",
              width: 350,
            });
          doc
            .text(`Total Savings:`, 50)
            .text(formatCurrency(totalSavings), 200, doc.y - 12, {
              align: "right",
              width: 350,
            });
          doc
            .text(`Total Expenses:`, 50)
            .text(formatCurrency(totalExpenses), 200, doc.y - 12, {
              align: "right",
              width: 350,
            });
          doc
            .text(`Total Spent:`, 50)
            .text(formatCurrency(totalSpent), 200, doc.y - 12, {
              align: "right",
              width: 350,
            });

          doc.moveDown(0.3);
          doc
            .strokeColor("#cccccc")
            .lineWidth(1)
            .moveTo(50, doc.y)
            .lineTo(550, doc.y)
            .stroke();
          doc.moveDown(0.3);

          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(`Remaining:`, 50)
            .fillColor(remaining >= 0 ? "#16a34a" : "#dc2626")
            .text(formatCurrency(remaining), 200, doc.y - 14, {
              align: "right",
              width: 350,
            })
            .fillColor("#000000");

          doc.moveDown(1.5);

          // Budget Categories by Group
          budget.groups.forEach((group) => {
            if (group.categories.length === 0) return;

            doc
              .fontSize(14)
              .font("Helvetica-Bold")
              .text(
                `${group.icon} ${
                  group.name.charAt(0).toUpperCase() + group.name.slice(1)
                }`,
              );
            doc.moveDown(0.5);

            // Table header
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .text("Category", 50, doc.y, { width: 200, continued: true })
              .text("Planned", 250, doc.y, { width: 100, align: "right" })
              .text("Spent", 350, doc.y, { width: 100, align: "right" })
              .text("Remaining", 450, doc.y, { width: 100, align: "right" });

            doc.moveDown(0.3);
            doc
              .strokeColor("#cccccc")
              .lineWidth(0.5)
              .moveTo(50, doc.y)
              .lineTo(550, doc.y)
              .stroke();
            doc.moveDown(0.3);

            // Categories
            group.categories.forEach((category) => {
              const planned = category.plannedAmount || 0;
              const spent = category.spentAmount || 0;
              const remaining = planned - spent;

              const startY = doc.y;

              doc
                .fontSize(10)
                .font("Helvetica")
                .text(`${category.icon} ${category.name}`, 50, startY, {
                  width: 200,
                })
                .text(formatCurrency(planned), 250, startY, {
                  width: 100,
                  align: "right",
                })
                .text(formatCurrency(spent), 350, startY, {
                  width: 100,
                  align: "right",
                })
                .fillColor(remaining >= 0 ? "#16a34a" : "#dc2626")
                .text(formatCurrency(remaining), 450, startY, {
                  width: 100,
                  align: "right",
                })
                .fillColor("#000000");

              doc.moveDown(0.5);
            });

            doc.moveDown(0.5);
          });

          // Transactions Section
          if (data.transactions.length > 0) {
            doc.moveDown(1);
            doc.fontSize(14).font("Helvetica-Bold").text("Transactions");
            doc.moveDown(0.5);

            // Table header
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .text("Date", 50, doc.y, { width: 80, continued: true })
              .text("Category", 130, doc.y, { width: 150 })
              .text("Description", 280, doc.y, { width: 170 })
              .text("Amount", 450, doc.y, { width: 100, align: "right" });

            doc.moveDown(0.3);
            doc
              .strokeColor("#cccccc")
              .lineWidth(0.5)
              .moveTo(50, doc.y)
              .lineTo(550, doc.y)
              .stroke();
            doc.moveDown(0.3);

            // Sort transactions by date
            const sortedTransactions = data.transactions.sort(
              (a, b) => new Date(a.date) - new Date(b.date),
            );

            sortedTransactions.forEach((transaction) => {
              const startY = doc.y;

              // Check if we need a new page
              if (startY > 700) {
                doc.addPage();
                doc.y = 50;
              }

              const formattedDate = new Date(
                transaction.date,
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              doc
                .fontSize(9)
                .font("Helvetica")
                .text(formattedDate, 50, doc.y, { width: 80 })
                .text(transaction.category || "Uncategorized", 130, startY, {
                  width: 150,
                })
                .text(transaction.description || "", 280, startY, {
                  width: 170,
                })
                .fillColor(
                  transaction.type === "income" ? "#16a34a" : "#dc2626",
                )
                .text(formatCurrency(transaction.amount), 450, startY, {
                  width: 100,
                  align: "right",
                })
                .fillColor("#000000");

              doc.moveDown(0.4);
            });
          }
        } else {
          doc
            .fontSize(12)
            .font("Helvetica")
            .text("No budget data available for this month.", {
              align: "center",
            });
        }
      });

      // Footer on last page
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#666666")
        .text(
          "Generated by BudgetBuddy - Your Personal Finance Companion",
          50,
          750,
          { align: "center" },
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log("Export request:", JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: "",
      };
    }

    // Parse and validate token
    const token = parseToken(
      event.headers.Authorization || event.headers.authorization,
    );
    if (!token || !token.sub) {
      return {
        statusCode: 401,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: "Invalid or missing authentication token",
        }),
      };
    }

    const userId = token.sub;

    // Get family ID
    const familyId = await getFamilyId(userId);

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const exportType = queryParams.type || "csv";
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    if (exportType === "csv") {
      // Get data
      const [budgets, transactions] = await Promise.all([
        getBudgets(familyId, startDate, endDate),
        getTransactions(familyId, startDate, endDate),
      ]);

      // Generate CSV
      const csvContent = generateCSV(budgets, transactions);

      // Return CSV response
      return {
        statusCode: 200,
        headers: {
          ...getCorsHeaders(),
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="budget-export-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
        body: csvContent,
      };
    } else if (exportType === "pdf") {
      // Get data
      const [budgets, transactions] = await Promise.all([
        getBudgets(familyId, startDate, endDate),
        getTransactions(familyId, startDate, endDate),
      ]);

      // Generate PDF
      const pdfBuffer = await generatePDF(budgets, transactions);

      // Return PDF response
      return {
        statusCode: 200,
        headers: {
          ...getCorsHeaders(),
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="budget-report-${
            new Date().toISOString().split("T")[0]
          }.pdf"`,
        },
        body: pdfBuffer.toString("base64"),
        isBase64Encoded: true,
      };
    } else if (exportType === "json") {
      // Get all data for backup
      const [budgets, transactions, userProfile] = await Promise.all([
        getBudgets(familyId), // Get all budgets (no date filter)
        getTransactions(familyId), // Get all transactions (no date filter)
        getUserProfile(userId),
      ]);

      // Generate JSON backup
      const backupData = generateJSONBackup(userProfile, budgets, transactions);

      // Return JSON response
      return {
        statusCode: 200,
        headers: {
          ...getCorsHeaders(),
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="budgetbuddy-backup-${
            new Date().toISOString().split("T")[0]
          }.json"`,
        },
        body: JSON.stringify(backupData, null, 2),
      };
    } else {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: "Unsupported export type. Supported types: csv, pdf",
        }),
      };
    }
  } catch (error) {
    console.error("Export error:", error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: "Export failed",
        details: error.message,
      }),
    };
  }
};
