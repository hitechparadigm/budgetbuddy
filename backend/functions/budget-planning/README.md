# Budget Planning Lambda

AI-powered budget suggestion service for BudgetBuddy.

## Overview

This Lambda function generates intelligent budget suggestions by analyzing recurring bills, transaction history, and spending patterns. It uses AWS Bedrock (Claude 3.5 Sonnet) to provide personalized budget recommendations with confidence scores and explanations.

## Features

- **AI Budget Suggestions**: Generates category-wise budget recommendations
- **Recurring Bill Integration**: Accounts for detected recurring bills
- **Historical Analysis**: Uses past spending patterns to inform suggestions
- **Bi-weekly Calculations**: Handles 2 vs 3 occurrence months for bi-weekly expenses
- **Seasonal Adjustments**: Adjusts for seasonal spending patterns
- **Confidence Scoring**: Rates suggestion reliability

## API Endpoints

### POST /budget-planning/suggestions

Generate AI budget suggestions for a target month.

**Request Body:**

```json
{
  "targetMonth": "2026-03",
  "includeRecurringBills": true,
  "includeHistoricalAverage": true
}
```

**Response:**

```json
{
  "suggestionId": "sug_123",
  "targetMonth": "2026-03",
  "suggestions": [
    {
      "categoryId": "cat_utilities",
      "categoryName": "Utilities",
      "suggestedAmount": 250.0,
      "confidenceScore": 85,
      "breakdown": [
        { "item": "Electric Bill", "amount": 120, "type": "recurring" },
        { "item": "Water Bill", "amount": 50, "type": "recurring" },
        { "item": "Historical Average", "amount": 80, "type": "average" }
      ],
      "explanation": "Based on your recurring utility bills and 3-month average spending"
    }
  ],
  "totalSuggested": 3500.0,
  "generatedAt": "2026-02-03T00:00:00Z",
  "status": "pending"
}
```

### GET /budget-planning/suggestions

Get existing suggestions for a month.

**Query Parameters:**

- `targetMonth`: Target month in YYYY-MM format

### POST /budget-planning/apply

Apply approved suggestions to budget.

**Request Body:**

```json
{
  "suggestionId": "sug_123",
  "selectedCategories": ["cat_utilities", "cat_groceries"]
}
```

## Suggestion Generation Algorithm

1. **Retrieve Data**: Get active bill reminders and transaction history
2. **Categorize Bills**: Group recurring bills by budget category
3. **Calculate Averages**: Compute historical spending averages per category
4. **Bi-weekly Adjustment**: Calculate occurrences for bi-weekly items in target month
5. **Seasonal Analysis**: Detect and apply seasonal patterns
6. **AI Enhancement**: Use Bedrock to refine suggestions and generate explanations
7. **Confidence Scoring**: Rate each suggestion based on data quality

## Bi-weekly Calculation

For bi-weekly expenses, the system calculates whether 2 or 3 occurrences fall within the target month:

```javascript
// Example: $100 bi-weekly expense
// February 2026 (28 days): 2 occurrences = $200
// March 2026 (31 days): 3 occurrences = $300
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level

## IAM Permissions

- DynamoDB: Read/Write access to main table
- Bedrock: InvokeModel permission for Claude 3.5 Sonnet

## Testing

```bash
cd backend/functions/budget-planning
npm test
```

## Related Files

- `budget-planning-service.js`: Core business logic
- `index.js`: Lambda handler and API routes
