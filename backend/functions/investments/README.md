# Investments Lambda Function

## Overview

Manages investment portfolio tracking including holdings, portfolio calculations, and performance metrics.

## Features

- **Portfolio Overview**: Calculate total value, cost basis, gain/loss, and asset allocation
- **Holdings Management**: CRUD operations for investment holdings
- **Account Types**: Support for brokerage, 401k, IRA, Roth IRA, HSA, and crypto accounts
- **Performance Tracking**: Track portfolio performance over time with historical snapshots
- **Day Change Tracking**: Calculate daily portfolio value changes

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
  "dayChange": 150,
  "dayChangePercent": 0.3,
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
      "previousPrice": 178,
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

Get portfolio performance over time.

**Query Parameters:**

- `period`: Time period for performance data (1M, 3M, 6M, 1Y, ALL) - default: 1M

**Response:**

```json
{
  "performance": [
    {
      "date": "2026-01-01",
      "totalValue": 48000,
      "totalGainLoss": 8000,
      "totalGainLossPercent": 20
    },
    {
      "date": "2026-02-01",
      "totalValue": 50000,
      "totalGainLoss": 10000,
      "totalGainLossPercent": 25
    }
  ],
  "totalReturn": 2000,
  "totalReturnPercent": 4.17,
  "period": "1M"
}
```

### POST /investments/snapshot

Save current portfolio snapshot for performance tracking.

**Response:**

```json
{
  "date": "2026-02-05",
  "totalValue": 50000,
  "totalCostBasis": 40000,
  "totalGainLoss": 10000,
  "totalGainLossPercent": 25,
  "allocation": [...],
  "createdAt": "2026-02-05T12:00:00Z"
}
```

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
  - previousPrice: number (optional, for day change calculation)
  - accountType: 'brokerage' | '401k' | 'ira' | 'roth_ira' | 'hsa' | 'crypto'
  - lastUpdated: ISO date string
  - createdAt: ISO date string
```

### Portfolio Snapshot

```
PK: USER#<userId>
SK: PORTFOLIO_SNAPSHOT#<YYYY-MM-DD>
Attributes:
  - userId: string
  - date: string (YYYY-MM-DD)
  - totalValue: number
  - totalCostBasis: number
  - totalGainLoss: number
  - totalGainLossPercent: number
  - allocation: array of { type, value, percent }
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

### Day Change

```
dayChange = Σ(shares × (currentPrice - previousPrice)) for all holdings with previousPrice
previousValue = totalValue - dayChange
dayChangePercent = (dayChange / previousValue) × 100
```

### Asset Allocation

```
allocation[type] = Σ(value) for holdings of that account type
percent = (allocation[type] / totalValue) × 100
```

### Performance Return

```
totalReturn = lastSnapshot.totalValue - firstSnapshot.totalValue
totalReturnPercent = (totalReturn / firstSnapshot.totalValue) × 100
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: BudgetBuddyTable)

## Integration

### Price Updates

The `investments-price-updater` Lambda function automatically updates holding prices daily:

1. Fetches latest prices from Alpha Vantage API
2. Updates `currentPrice` and `previousPrice` fields
3. Respects API rate limits (5 calls/min)
4. Handles errors gracefully per symbol

### Snapshot Creation

Portfolio snapshots should be created:

1. **Daily**: Via scheduled Lambda (recommended)
2. **On-demand**: Via `POST /investments/snapshot` endpoint
3. **After price updates**: To capture daily performance

## Future Enhancements

1. **Dividend Tracking**: Record dividend payments
2. **Real-time Quotes**: Premium feature for real-time price updates
3. **Advanced Analytics**: Sector allocation, risk metrics, correlation analysis
4. **Tax Loss Harvesting**: Identify opportunities for tax optimization
5. **Rebalancing Suggestions**: AI-powered portfolio rebalancing recommendations

## Testing

Run tests:

```bash
npm test
```

Coverage: 15 tests covering all CRUD operations, portfolio calculations, and performance tracking.

## Deployment

This function is deployed as part of the API Features Extended Stack in CDK.

## Related Requirements

- Requirement 45: Investment Tracking
- Task 12.1: Create investments Lambda function ✅
- Task 12.2: Integrate stock price API ✅
- Task 12.3: Add portfolio performance calculation ✅
