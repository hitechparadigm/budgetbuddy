# Credit Score Lambda Function

## Overview

This Lambda function handles credit score monitoring and tracking for BudgetBuddy users. It integrates with credit bureau APIs to fetch and store credit score data, track changes over time, and send notifications for significant score changes.

## Features

- **Credit Score Retrieval**: Get current credit score and rating
- **Score History**: Track credit score changes over time (up to 12 months)
- **Score Refresh**: Manually refresh credit score from credit bureau API
- **Change Notifications**: Automatic notifications for significant changes (±10 points)
- **Settings Management**: Configure credit bureau connection and notification preferences

## API Endpoints

### GET /credit-score

Get the current credit score for the authenticated user.

**Response**:

```json
{
  "score": 750,
  "rating": "Very Good",
  "lastUpdated": "2026-02-05T10:00:00Z",
  "factors": [
    {
      "name": "Payment History",
      "impact": "high",
      "status": "good"
    }
  ],
  "change": 5,
  "changeDirection": "up"
}
```

### GET /credit-score/history

Get credit score history for the last 12 months.

**Response**:

```json
{
  "history": [
    {
      "date": "2026-02-01",
      "score": 750,
      "rating": "Very Good",
      "change": 5
    }
  ]
}
```

### POST /credit-score/refresh

Manually refresh credit score from credit bureau API.

**Response**:

```json
{
  "score": 755,
  "rating": "Very Good",
  "factors": [...],
  "change": 5,
  "changeDirection": "up",
  "lastUpdated": "2026-02-05T10:00:00Z"
}
```

### PUT /credit-score/settings

Update credit score monitoring settings.

**Request Body**:

```json
{
  "connected": true,
  "apiKey": "your-api-key",
  "notificationsEnabled": true
}
```

**Response**:

```json
{
  "message": "Settings updated successfully",
  "settings": {
    "connected": true,
    "notificationsEnabled": true
  }
}
```

## Data Model

### Credit Score Record

```javascript
{
  PK: "FAMILY#<familyId>",
  SK: "CREDIT_SCORE#<date>#<creditScoreId>",
  creditScoreId: "uuid",
  familyId: "family-id",
  userId: "user-id",
  score: 750,
  rating: "Very Good",
  factors: [
    {
      name: "Payment History",
      impact: "high",
      status: "good"
    }
  ],
  date: "2026-02-05",
  lastUpdated: "2026-02-05T10:00:00Z",
  change: 5,
  changeDirection: "up",
  createdAt: "2026-02-05T10:00:00Z"
}
```

### Credit Score Settings

```javascript
{
  PK: "FAMILY#<familyId>",
  SK: "CREDIT_SCORE_SETTINGS",
  familyId: "family-id",
  userId: "user-id",
  connected: true,
  apiKey: "encrypted-api-key",
  notificationsEnabled: true,
  updatedAt: "2026-02-05T10:00:00Z"
}
```

## Credit Score Ratings

- **Excellent**: 800-850
- **Very Good**: 740-799
- **Good**: 670-739
- **Fair**: 580-669
- **Poor**: 300-579

## Notifications

The function automatically sends notifications when:

- Credit score changes by ±10 points or more
- Notification type: `CREDIT_SCORE_CHANGE`

## Credit Bureau Integration

Currently, the function includes a mock implementation of credit bureau API integration. In production, this should be replaced with actual API calls to:

- Experian
- Equifax
- TransUnion
- Or a credit monitoring service like Credit Karma API

### Integration Steps

1. Sign up for credit bureau API access
2. Store API credentials in AWS Secrets Manager
3. Replace `simulateCreditBureauAPI()` with actual API calls
4. Implement proper error handling and rate limiting
5. Add encryption for sensitive data

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: budgetbuddy-dev-main)

## IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:*:*:table/budgetbuddy-*"
    }
  ]
}
```

## Testing

Run unit tests:

```bash
npm test
```

## Security Considerations

1. **API Keys**: Store credit bureau API keys in AWS Secrets Manager, not in DynamoDB
2. **Encryption**: Encrypt sensitive data at rest
3. **Rate Limiting**: Implement rate limiting for API calls to avoid excessive charges
4. **Data Retention**: Consider data retention policies for credit score history
5. **Access Control**: Ensure only authorized users can access their credit score data

## Future Enhancements

- [ ] Integrate with actual credit bureau APIs
- [ ] Add credit score improvement tips based on factors
- [ ] Implement credit score alerts (e.g., score drops below threshold)
- [ ] Add credit report parsing and analysis
- [ ] Implement credit monitoring for identity theft detection
- [ ] Add credit score simulator (what-if scenarios)

## Requirements Validated

- **43.1**: Credit score display
- **43.2**: Credit bureau integration (placeholder)
