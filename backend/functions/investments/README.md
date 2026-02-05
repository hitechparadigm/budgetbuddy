# Investments Lambda Function

## Overview

Manages investment portfolio tracking including holdings, portfolio calculations, and performance metrics.

## Features

- **Portfolio Overview**: Calculate total value, cost basis, gain/loss, and asset allocation
- **Holdings Management**: CRUD operations for investment holdings
- **Account Types**: Support for brokerage, 401k, IRA, Roth IRA, HSA, and crypto accounts
- **Performance Tracking**: Track portfolio performance over time (future enhancement)

## API Endpoints

### GET /investments

Get portfolio overview with summary statistics.

**Response:**

```json
{
  "totalValue": 50000,
  "totalCostBasis": 40000,
  "totalGainLoss": 10000,
  "totalGainLossPercent": 25,
  "dayChange": 0,
  "dayChangePercent": 0,
  "allocation": [
    { "type": "brokerage", "value": 30000, "percent": 60 },
    { "type": "401k", "value": 20000, "percent": 40 }
  ],
  "holdings": [...]
}
```

### GET /investments/holdings

List all holdings for the user.

**Response:**

```json
{
  "holdings": [
    {
      "holdingId": "uuid",
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "shares": 10,
      "costBasis": 150,
      "currentPrice": 180,
      "accountType": "brokerage",
      "lastUpdated": "2026-02-05T12:00:00Z"
    }
  ]
}
```

### POST /investments/holdings

Add a new holding.

**Request:**

```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "shares": 10,
  "costBasis": 150,
  "currentPrice": 180,
  "accountType": "brokerage"
}
```

**Response:** Created holding object

### PUT /investments/holdings/{id}

Update an existing holding.

**Request:**

```json
{
  "shares": 15,
  "currentPrice": 185
}
```

**Response:** Updated holding object

### DELETE /investments/holdings/{id}

Delete a holding.

**Response:**

```json
{
  "success": true
}
```

### GET /investments/performance

Get portfolio performance over time (placeholder for future implementation).

## Data Model

### Holding

```
PK: USER#<userId>
SK: HOLDING#<holdingId>
Attributes:
  - holdingId: string
  - userId: string
  - symbol: string (uppercase)
  - name: string
  - shares: number
  - costBasis: number (per share)
  - currentPrice: number (per share)
  - accountType: 'brokerage' | '401k' | 'ira' | 'roth_ira' | 'hsa' | 'crypto'
  - lastUpdated: ISO date string
  - createdAt: ISO date string
```

## Calculations

### Portfolio Value

```
totalValue = Σ(shares × currentPrice) for all holdings
```

### Cost Basis

```
totalCostBasis = Σ(shares × costBasis) for all holdings
```

### Gain/Loss

```
totalGainLoss = totalValue - totalCostBasis
totalGainLossPercent = (totalGainLoss / totalCostBasis) × 100
```

### Asset Allocation

```
allocation[type] = Σ(value) for holdings of that account type
percent = (allocation[type] / totalValue) × 100
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: BudgetBuddyTable)

## Future Enhancements

1. **Price Updates**: Integrate with stock price API (Alpha Vantage, Yahoo Finance)
2. **Performance History**: Track portfolio value over time
3. **Dividend Tracking**: Record dividend payments
4. **Real-time Quotes**: Premium feature for real-time price updates
5. **Advanced Analytics**: Sector allocation, risk metrics, correlation analysis

## Testing

Run tests:

```bash
npm test
```

## Deployment

This function is deployed as part of the API Features Extended Stack in CDK.

## Related Requirements

- Requirement 45: Investment Tracking
- Task 12.1: Create investments Lambda function
