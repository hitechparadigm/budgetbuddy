# Debt Payoff Calculator Lambda Function

Handles debt tracking, payoff calculations using snowball and avalanche methods, and provides payoff timeline projections.

## Endpoints

| Method | Path                      | Description                              |
| ------ | ------------------------- | ---------------------------------------- |
| GET    | `/debts`                  | Get all debts                            |
| GET    | `/debts/summary`          | Get debt summary with payoff projections |
| GET    | `/debts/payoff-plan`      | Get detailed payoff plan                 |
| POST   | `/debts`                  | Create a new debt                        |
| PUT    | `/debts/{debtId}`         | Update a debt                            |
| POST   | `/debts/{debtId}/payment` | Record a payment                         |
| DELETE | `/debts/{debtId}`         | Delete a debt                            |
| GET    | `/debts/health`           | Health check                             |

## Payoff Strategies

### Snowball Method

- Pay off smallest balance first
- Psychological wins from quick payoffs
- May pay more interest overall

### Avalanche Method

- Pay off highest interest rate first
- Mathematically optimal (least interest)
- May take longer to see progress

## Query Parameters

### GET /debts/payoff-plan

- `strategy`: `snowball` or `avalanche` (default: snowball)
- `extraPayment`: Additional monthly payment amount (default: 0)

## Data Model

```json
{
  "debtId": "debt_abc123",
  "name": "Credit Card",
  "type": "credit_card",
  "originalBalance": 5000,
  "currentBalance": 3500,
  "interestRate": 18.99,
  "minimumPayment": 100,
  "dueDay": 15,
  "status": "active",
  "progressPercent": 30,
  "monthsToPayoff": 42
}
```

## Debt Types

- `credit_card` - Credit cards
- `student_loan` - Student loans
- `auto_loan` - Auto loans
- `mortgage` - Mortgages
- `personal_loan` - Personal loans
- `medical` - Medical debt
- `other` - Other debts

## Status Options

- `active` - Currently being paid
- `paid_off` - Fully paid off
- `deferred` - Payments deferred

## Calculations

### Months to Payoff

Uses the formula: `n = -log(1 - (r * P) / M) / log(1 + r)`

- P = principal (current balance)
- r = monthly interest rate
- M = monthly payment

### Total Interest

Calculated by simulating monthly payments with compound interest.

## Version

1.0.0
