# Investments Price Updater Lambda

## Overview

Scheduled Lambda function that runs daily to update stock prices for all investment holdings using the Alpha Vantage API.

## Features

- **Automatic Price Updates**: Fetches current prices for all unique stock symbols
- **Rate Limit Handling**: Respects Alpha Vantage free tier limits (5 calls/min, 500 calls/day)
- **Batch Processing**: Updates all holdings for each symbol efficiently
- **Error Handling**: Continues processing even if individual symbols fail
- **Secrets Management**: API key stored securely in AWS Secrets Manager

## Schedule

Runs daily at 6:00 PM EST (after market close) via EventBridge rule.

## API Integration

### Alpha Vantage API

**Endpoint**: `https://www.alphavantage.co/query`

**Function**: `GLOBAL_QUOTE` - Real-time stock quote data

**Rate Limits**:

- Free tier: 5 API calls per minute
- Daily limit: 500 API calls per day

**Response Format**:

```json
{
  "Global Quote": {
    "01. symbol": "AAPL",
    "05. price": "180.50",
    "09. change": "2.50",
    "10. change percent": "1.40%",
    "06. volume": "50000000",
    "07. latest trading day": "2026-02-05"
  }
}
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: BudgetBuddyTable)
- `ALPHA_VANTAGE_SECRET_NAME`: Secrets Manager secret name for API key (default: budgetbuddy/alpha-vantage-api-key)

## Secrets Manager Setup

The Alpha Vantage API key must be stored in AWS Secrets Manager:

```json
{
  "apiKey": "YOUR_ALPHA_VANTAGE_API_KEY"
}
```

**To create the secret**:

```bash
aws secretsmanager create-secret \
  --name budgetbuddy/alpha-vantage-api-key \
  --description "Alpha Vantage API key for stock price updates" \
  --secret-string '{"apiKey":"YOUR_API_KEY_HERE"}'
```

**To get a free API key**:

1. Visit https://www.alphavantage.co/support/#api-key
2. Sign up for a free API key
3. Store in Secrets Manager as shown above

## How It Works

1. **Fetch API Key**: Retrieves Alpha Vantage API key from Secrets Manager (cached for performance)
2. **Scan Holdings**: Scans DynamoDB for all holdings and extracts unique stock symbols
3. **Fetch Prices**: For each symbol:
   - Calls Alpha Vantage API to get current price
   - Waits 12 seconds between calls to respect rate limit (5 calls/min)
4. **Update Holdings**: Updates all holdings with the new price and timestamp
5. **Report Results**: Returns summary of successful and failed updates

## Error Handling

- **Rate Limit Exceeded**: Logs error and continues with next symbol
- **Invalid Symbol**: Logs error and continues with next symbol
- **API Errors**: Logs error and continues with next symbol
- **Network Errors**: Logs error and continues with next symbol

The function is designed to be fault-tolerant and will update as many holdings as possible even if some fail.

## Performance

- **Symbols per run**: Depends on number of unique holdings
- **Time per symbol**: ~12 seconds (rate limit delay)
- **Max symbols per run**: ~41 symbols (500 daily limit / 12 runs per day)
- **Timeout**: 15 minutes (Lambda max)

For portfolios with more than 41 unique symbols, consider:

1. Upgrading to Alpha Vantage premium tier
2. Using multiple API keys with rotation
3. Implementing a priority system (update most-held symbols first)

## Monitoring

**CloudWatch Metrics**:

- Invocations
- Duration
- Errors
- Throttles

**CloudWatch Logs**:

- Symbols processed
- Successful updates
- Failed updates
- Holdings updated count

**Alarms** (recommended):

- Error rate > 10%
- Duration > 10 minutes
- Failed invocations

## Testing

Run tests:

```bash
npm test
```

Manual invocation:

```bash
aws lambda invoke \
  --function-name budgetbuddy-investments-price-updater \
  --payload '{}' \
  response.json
```

## Future Enhancements

1. **Multiple API Sources**: Add fallback to Yahoo Finance or other providers
2. **Crypto Support**: Integrate cryptocurrency price APIs
3. **Real-time Updates**: Premium feature for real-time quotes
4. **Historical Data**: Store price history for performance charts
5. **Smart Scheduling**: Update during market hours for real-time tracking

## Related Requirements

- Requirement 45: Investment Tracking
- Task 12.2: Integrate stock price API
