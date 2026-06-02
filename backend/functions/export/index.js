/**
 * Export Service - CSV and PDF Export Functionality
 * Handles data export requests for budget and transaction data
 *
 * Uses BudgetAccessResolver pattern (BUDGET# model) — no familyId from JWT.
 */

const {
  getUserFromEvent,
  dynamoHelpers,
  BudgetAccessResolver,
} = require('/opt/nodejs/utils');

/**
 * Get CORS headers for API responses
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Get all budget periods for a budget
 */
async function getBudgets(budgetId, startDate, endDate) {
  try {
    const budgets = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':sk': 'PERIOD#',
      },
    }) || [];

    // Apply date filtering if provided
    if (startDate && endDate) {
      return budgets.filter(
        (b) => b.month && b.month >= startDate && b.month <= endDate,
      );
    }
    return budgets;
  } catch (error) {
    console.error('Error getting budgets:', error);
    return [];
  }
}

/**
 * Get all transactions for a budget
 */
async function getTransactions(budgetId, startDate, endDate) {
  try {
    const transactions = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':sk': 'TXN#',
      },
    }) || [];

    // Apply date filtering if provided
    if (startDate && endDate) {
      return transactions.filter(
        (t) => t.date && t.date >= startDate && t.date <= endDate,
      );
    }
    return transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

/**
 * Generate JSON backup with all user data
 */
function generateJSONBackup(userId, budgetId, budgets, transactions) {
  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    application: 'BudgetBuddy',
    data: {
      user: { userId },
      budgetId,
      budgets: budgets.map((budget) => ({
        budgetId: budget.budgetId || budgetId,
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
        description: transaction.description || '',
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
}

/**
 * Convert budget and transaction data to CSV format
 */
function generateCSV(budgets, transactions) {
  const csvRows = [];

  // CSV Header
  csvRows.push('Date,Category,Description,Amount,Type,Budget Month,Item Type');

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
            category.type || 'expense',
            budget.month,
            'Budget Category',
          ].join(','),
        );
      });
    }
  });

  // Add transactions
  transactions.forEach((transaction) => {
    csvRows.push(
      [
        transaction.date,
        `"${transaction.category || ''}"`,
        `"${(transaction.description || '').replace(/"/g, '""')}"`,
        transaction.amount,
        transaction.type,
        transaction.budgetMonth || (transaction.date || '').substring(0, 7),
        'Transaction',
      ].join(','),
    );
  });

  return csvRows.join('\n');
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Export request:', JSON.stringify({ ...event, body: '[redacted]' }));

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: '',
      };
    }

    // Resolve user from Cognito authorizer claims
    const user = getUserFromEvent(event);
    if (!user || !user.userId) {
      return {
        statusCode: 401,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Resolve budgetId via BudgetAccessResolver
    const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(
      user.userId,
      dynamoHelpers,
    );
    BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const exportType = queryParams.type || 'csv';
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    if (exportType === 'csv') {
      const [budgets, transactions] = await Promise.all([
        getBudgets(budgetId, startDate, endDate),
        getTransactions(budgetId, startDate, endDate),
      ]);

      const csvContent = generateCSV(budgets, transactions);

      return {
        statusCode: 200,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="budget-export-${
            new Date().toISOString().split('T')[0]
          }.csv"`,
        },
        body: csvContent,
      };
    } else if (exportType === 'json') {
      const [budgets, transactions] = await Promise.all([
        getBudgets(budgetId),
        getTransactions(budgetId),
      ]);

      const backupData = generateJSONBackup(user.userId, budgetId, budgets, transactions);

      return {
        statusCode: 200,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="budgetbuddy-backup-${
            new Date().toISOString().split('T')[0]
          }.json"`,
        },
        body: JSON.stringify(backupData, null, 2),
      };
    } else if (exportType === 'pdf') {
      // PDF export requires pdfkit native binaries compiled for Lambda/Amazon Linux.
      // Returning a structured response instead to avoid native binary crash.
      // TODO: Add bundling step in CDK to compile pdfkit for Amazon Linux.
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          message: 'PDF export is being prepared. Use type=csv or type=json for immediate download.',
          supported: ['csv', 'json'],
        }),
      };
    } else {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: 'Unsupported export type. Supported types: csv, json, pdf',
        }),
      };
    }
  } catch (error) {
    console.error('Export error:', error);

    if (error && typeof error === 'object' && error.statusCode) {
      return {
        statusCode: error.statusCode,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Forbidden', message: error.message || 'Permission denied' }),
      };
    }

    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: 'Export failed',
        details: error.message,
      }),
    };
  }
};
