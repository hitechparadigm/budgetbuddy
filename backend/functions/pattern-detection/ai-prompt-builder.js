/**
 * AI Prompt Builder
 *
 * Constructs prompts for AWS Bedrock (Claude 3.5 Sonnet) for pattern detection
 * and budget planning with structured JSON output schemas.
 */

/**
 * Build pattern detection prompt for AWS Bedrock
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} options - Prompt options
 * @returns {string} Formatted prompt for pattern detection
 */
function buildPatternDetectionPrompt(transactions, options = {}) {
  const { analysisMonths = 6 } = options;

  // Format transactions for the prompt
  const transactionsJson = JSON.stringify(
    transactions.map((t) => ({
      date: t.date,
      merchantName: t.merchantName || t.description,
      amount: Math.abs(t.amount),
      categoryId: t.categoryId,
      transactionId: t.transactionId || t.id,
    })),
    null,
    2,
  );

  const prompt = `You are a financial analysis assistant. Analyze the following transaction history to identify recurring payment patterns.

Transaction History (last ${analysisMonths} months):
${transactionsJson}

Instructions:
1. Identify transactions that occur at regular intervals (weekly, bi-weekly, monthly, quarterly, annual)
2. Group similar transactions by merchant name (use fuzzy matching for variations like "Netflix" and "NETFLIX INC")
3. Calculate average amount and frequency for each pattern
4. Assign confidence score (0-100) based on:
   - Consistency of timing (higher score for regular intervals)
   - Consistency of amount (higher score for similar amounts)
   - Number of occurrences (higher score for more data points)
   - Merchant name clarity (higher score for recognizable merchants)
5. Only include patterns with at least 3 occurrences
6. Provide explanation for each detected pattern

Return JSON array with this exact structure:
[
  {
    "merchantName": "string",
    "suggestedBillName": "string",
    "averageAmount": number,
    "amountStdDev": number,
    "frequency": "weekly|bi-weekly|monthly|quarterly|annual",
    "confidenceScore": number,
    "occurrences": [
      {"date": "YYYY-MM-DD", "amount": number, "transactionId": "string"}
    ],
    "explanation": "string"
  }
]

Example output:
[
  {
    "merchantName": "Netflix",
    "suggestedBillName": "Netflix Subscription",
    "averageAmount": 15.99,
    "amountStdDev": 0.0,
    "frequency": "monthly",
    "confidenceScore": 95,
    "occurrences": [
      {"date": "2024-01-01", "amount": 15.99, "transactionId": "txn_001"},
      {"date": "2024-02-01", "amount": 15.99, "transactionId": "txn_002"},
      {"date": "2024-03-01", "amount": 15.99, "transactionId": "txn_003"}
    ],
    "explanation": "Consistent monthly charge of $15.99 on the 1st of each month. High confidence due to regular timing and consistent amount."
  }
]

Focus on common recurring bills: rent, mortgage, insurance, utilities, subscriptions, loan payments.

IMPORTANT: Return ONLY the JSON array, no additional text or explanation outside the JSON.`;

  return prompt;
}

/**
 * Build budget planning prompt for AWS Bedrock
 * @param {Object} data - Budget planning data
 * @param {string} targetMonth - Target month (YYYY-MM)
 * @returns {string} Formatted prompt for budget planning
 */
function buildBudgetPlanningPrompt(data, targetMonth) {
  const { bills = [], spendingHistory = [] } = data;

  // Format target month
  const [year, month] = targetMonth.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthName = monthNames[parseInt(month, 10) - 1];

  // Format bills for the prompt
  const billsJson = JSON.stringify(
    bills.map((b) => ({
      billName: b.billName || b.name,
      amount: b.amount,
      frequency: b.frequency,
      dueDate: b.dueDate,
      categoryId: b.categoryId,
      categoryName: b.categoryName,
    })),
    null,
    2,
  );

  // Format spending history for the prompt
  const spendingJson = JSON.stringify(
    spendingHistory.map((s) => ({
      month: s.month,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      totalSpent: s.totalSpent,
      transactionCount: s.transactionCount,
    })),
    null,
    2,
  );

  const prompt = `You are a budget planning assistant. Based on the user's transaction history and recurring bills, suggest budget allocations for ${monthName} ${year}.

Historical Data:
- Recurring Bills: ${billsJson}
- Past 3 Months Spending by Category: ${spendingJson}
- Target Month: ${monthName} ${year}

Instructions:
1. For each budget category, suggest an amount based on:
   - Recurring bills in that category
   - Historical average spending
   - Seasonal adjustments (if applicable, e.g., higher heating in winter, higher cooling in summer)
2. Account for payment frequency:
   - Bi-weekly: Calculate if 2 or 3 occurrences in target month (check calendar)
   - Monthly: 1 occurrence
   - Quarterly/Annual: Prorate if due in target month
3. Assign confidence score (0-100) based on data consistency
4. Provide brief explanation for each suggestion

Return JSON with this exact structure:
{
  "suggestions": [
    {
      "categoryId": "string",
      "categoryName": "string",
      "suggestedAmount": number,
      "confidenceScore": number,
      "breakdown": [
        {"item": "string", "amount": number, "type": "recurring|average"}
      ],
      "explanation": "string"
    }
  ],
  "totalSuggested": number
}

Example output:
{
  "suggestions": [
    {
      "categoryId": "cat_housing",
      "categoryName": "Housing",
      "suggestedAmount": 1500.00,
      "confidenceScore": 95,
      "breakdown": [
        {"item": "Rent", "amount": 1200.00, "type": "recurring"},
        {"item": "Utilities (avg)", "amount": 300.00, "type": "average"}
      ],
      "explanation": "Based on fixed rent of $1,200 and average utilities of $300 over past 3 months."
    },
    {
      "categoryId": "cat_entertainment",
      "categoryName": "Entertainment",
      "suggestedAmount": 45.98,
      "confidenceScore": 90,
      "breakdown": [
        {"item": "Netflix", "amount": 15.99, "type": "recurring"},
        {"item": "Spotify", "amount": 9.99, "type": "recurring"},
        {"item": "Other (avg)", "amount": 20.00, "type": "average"}
      ],
      "explanation": "Includes recurring subscriptions ($25.98) plus average discretionary spending ($20)."
    }
  ],
  "totalSuggested": 1545.98
}

IMPORTANT: Return ONLY the JSON object, no additional text or explanation outside the JSON.`;

  return prompt;
}

/**
 * Validate pattern detection prompt has all required fields
 * @param {string} prompt - The prompt to validate
 * @returns {Object} Validation result
 */
function validatePatternDetectionPrompt(prompt) {
  const requiredFields = [
    "Transaction History",
    "Instructions",
    "merchantName",
    "suggestedBillName",
    "averageAmount",
    "frequency",
    "confidenceScore",
    "occurrences",
    "explanation",
    "Example output",
  ];

  const missingFields = requiredFields.filter(
    (field) => !prompt.includes(field),
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate budget planning prompt has all required fields
 * @param {string} prompt - The prompt to validate
 * @returns {Object} Validation result
 */
function validateBudgetPlanningPrompt(prompt) {
  const requiredFields = [
    "Historical Data",
    "Recurring Bills",
    "Past 3 Months Spending",
    "Target Month",
    "Instructions",
    "categoryId",
    "categoryName",
    "suggestedAmount",
    "confidenceScore",
    "breakdown",
    "explanation",
    "Example output",
  ];

  const missingFields = requiredFields.filter(
    (field) => !prompt.includes(field),
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Extract JSON from AI response (handles cases where AI adds extra text)
 * @param {string} response - Raw AI response
 * @returns {Object|Array} Parsed JSON
 */
function extractJsonFromResponse(response) {
  // Try to parse as-is first
  try {
    return JSON.parse(response);
  } catch (e) {
    // If that fails, try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to find JSON array or object
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }

    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error("Could not extract valid JSON from AI response");
  }
}

module.exports = {
  buildPatternDetectionPrompt,
  buildBudgetPlanningPrompt,
  validatePatternDetectionPrompt,
  validateBudgetPlanningPrompt,
  extractJsonFromResponse,
};
