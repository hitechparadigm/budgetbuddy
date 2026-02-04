# Pattern Detection Lambda

AI-powered recurring bill pattern detection service for BudgetBuddy.

## Overview

This Lambda function analyzes transaction history to identify recurring payment patterns using AWS Bedrock (Claude 3.5 Sonnet) and algorithmic pattern detection. Detected patterns can be converted into bill reminders for proactive financial management.

## Features

- **AI Pattern Detection**: Uses Claude 3.5 Sonnet to analyze transactions and identify recurring bills
- **Fuzzy Merchant Matching**: Groups similar merchant names using Levenshtein distance
- **Confidence Scoring**: Rates pattern reliability based on timing consistency, amount variance, and occurrence count
- **Manual Pattern Creation**: Allows users to manually mark transactions as recurring
- **Bill Integration**: Approved patterns automatically create bill reminders

## API Endpoints

### POST /patterns/detect

Trigger pattern detection analysis on transaction history.

**Request Body:**

```json
{
  "analysisMonths": 6,
  "minConfidence": 50
}
```

**Response:**

```json
{
  "patterns": [...],
  "analysisDate": "2026-02-03T00:00:00Z",
  "transactionsAnalyzed": 150
}
```

### GET /patterns

Retrieve detected patterns for the authenticated user.

**Query Parameters:**

- `status`: Filter by status (pending, approved, rejected, ignored)

### GET /patterns/{patternId}

Get a specific pattern by ID.

### PUT /patterns/{patternId}

Update a pattern (edit details or change status).

**Request Body:**

```json
{
  "suggestedBillName": "Netflix",
  "averageAmount": 15.99,
  "frequency": "monthly",
  "status": "approved"
}
```

### DELETE /patterns/{patternId}

Delete a detected pattern.

### POST /patterns/manual

Create a pattern manually from a transaction.

**Request Body:**

```json
{
  "transactionId": "txn_123",
  "frequency": "monthly",
  "billName": "Netflix Subscription",
  "createBillReminder": true
}
```

## Pattern Detection Algorithm

1. **Data Retrieval**: Query transactions for past N months (default 6)
2. **Merchant Grouping**: Group transactions by merchant using fuzzy matching (80% similarity threshold)
3. **Frequency Detection**: Identify dominant interval pattern (weekly, bi-weekly, monthly, quarterly, annual)
4. **Amount Analysis**: Calculate mean, median, and standard deviation
5. **Confidence Scoring**: Rate pattern based on timing consistency, amount consistency, occurrence count
6. **AI Enhancement**: Use Bedrock to validate patterns and generate explanations

## Confidence Score Calculation

```
confidenceScore = (
  timingConsistency * 0.4 +
  amountConsistency * 0.3 +
  occurrenceCount * 0.2 +
  merchantClarity * 0.1
) * 100
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name
- `PATTERN_CACHE_BUCKET`: S3 bucket for pattern cache
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level

## IAM Permissions

- DynamoDB: Read/Write access to main table
- S3: Read/Write access to pattern cache bucket
- Bedrock: InvokeModel permission for Claude 3.5 Sonnet

## Testing

```bash
cd backend/functions/pattern-detection
npm test
```

## Related Files

- `pattern-detection-service.js`: Core business logic
- `pattern-detection-repository.js`: Data access layer
- `pattern-detection-algorithm.js`: Pattern detection algorithms
- `fuzzy-matching-utils.js`: Merchant name matching utilities
- `ai-prompt-builder.js`: AI prompt construction
- `bedrock-client.js`: AWS Bedrock integration
