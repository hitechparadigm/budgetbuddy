# Subscriptions Lambda Function

Handles subscription tracking, automatic detection from transaction patterns, and renewal management.

## Endpoints

| Method | Path                                     | Description                            |
| ------ | ---------------------------------------- | -------------------------------------- |
| GET    | `/subscriptions`                         | Get all subscriptions                  |
| GET    | `/subscriptions/summary`                 | Get subscription summary with totals   |
| GET    | `/subscriptions/detect`                  | Detect subscriptions from transactions |
| POST   | `/subscriptions`                         | Create a new subscription              |
| PUT    | `/subscriptions/{subscriptionId}`        | Update a subscription                  |
| PUT    | `/subscriptions/{subscriptionId}/status` | Quick status update                    |
| DELETE | `/subscriptions/{subscriptionId}`        | Delete a subscription                  |
| GET    | `/subscriptions/health`                  | Health check                           |

## Features

### Automatic Detection

- Analyzes 6 months of transaction history
- Groups transactions by merchant
- Detects recurring patterns (weekly, monthly, quarterly, yearly)
- Checks interval consistency (within 20% variance)
- Checks amount consistency (within 10% variance)
- Calculates confidence score

### Subscription Management

- Track active, paused, and cancelled subscriptions
- Review status: keep, review, cancel
- Category assignment with auto-suggestion
- Monthly cost normalization

### Summary Statistics

- Total monthly/yearly cost
- Breakdown by status and category
- Upcoming renewals (next 7 days)

## Data Model

```json
{
  "subscriptionId": "sub_abc123",
  "name": "Netflix",
  "merchant": "Netflix",
  "amount": 15.99,
  "frequency": "monthly",
  "category": "Streaming",
  "nextBillingDate": "2026-02-15",
  "status": "active",
  "reviewStatus": "keep",
  "notes": null
}
```

## Frequency Options

- `weekly` - Every 7 days
- `monthly` - Every month
- `quarterly` - Every 3 months
- `yearly` - Every 12 months

## Status Options

- `active` - Currently being charged
- `paused` - Temporarily paused
- `cancelled` - No longer active

## Review Status Options

- `keep` - Keep this subscription
- `review` - Needs review
- `cancel` - Should be cancelled

## Version

1.0.0
