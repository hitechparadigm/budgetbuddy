# Net Worth Lambda Function

Handles assets, liabilities, and net worth tracking for BudgetBuddy users.

## Features

- **Asset Management**: Track cash, investments, retirement accounts, real estate, vehicles
- **Liability Management**: Track mortgages, auto loans, student loans, credit cards
- **Net Worth Calculation**: Automatic calculation of net worth (assets - liabilities)
- **History Tracking**: Monthly snapshots for trend analysis
- **Category Grouping**: Organize by asset/liability type

## API Endpoints

### Net Worth Overview

#### GET /net-worth

Get complete net worth with all assets and liabilities.

#### GET /net-worth/summary

Get net worth summary with month-over-month change.

#### GET /net-worth/history

Get historical net worth data for charts.

#### GET /net-worth/categories

Get available asset and liability categories.

### Assets

#### GET /net-worth/assets

List all assets.

#### POST /net-worth/assets

Create a new asset.

**Request:**

```json
{
  "name": "Savings Account",
  "value": 10000,
  "category": "cash",
  "institution": "Chase Bank",
  "notes": "Emergency fund"
}
```

#### PUT /net-worth/assets/{assetId}

Update an asset.

#### DELETE /net-worth/assets/{assetId}

Delete an asset.

### Liabilities

#### GET /net-worth/liabilities

List all liabilities.

#### POST /net-worth/liabilities

Create a new liability.

**Request:**

```json
{
  "name": "Car Loan",
  "balance": 15000,
  "originalBalance": 25000,
  "interestRate": 4.5,
  "minimumPayment": 350,
  "category": "auto_loan",
  "lender": "Capital One"
}
```

#### PUT /net-worth/liabilities/{liabilityId}

Update a liability.

#### DELETE /net-worth/liabilities/{liabilityId}

Delete a liability.

## Asset Categories

| ID           | Name                | Icon |
| ------------ | ------------------- | ---- |
| cash         | Cash & Savings      | 💵   |
| investments  | Investments         | 📈   |
| retirement   | Retirement Accounts | 🏦   |
| real_estate  | Real Estate         | 🏠   |
| vehicles     | Vehicles            | 🚗   |
| other_assets | Other Assets        | 💎   |

## Liability Categories

| ID            | Name           | Icon |
| ------------- | -------------- | ---- |
| mortgage      | Mortgage       | 🏠   |
| auto_loan     | Auto Loan      | 🚗   |
| student_loan  | Student Loans  | 🎓   |
| credit_card   | Credit Cards   | 💳   |
| personal_loan | Personal Loans | 📝   |
| other_debt    | Other Debt     | 📋   |

## Validates

- Requirement 41.1: View net worth
- Requirement 41.2: Add assets and liabilities
- Requirement 41.3: Calculate net worth
- Requirement 41.4: History tracking
- Requirement 41.5: Manual value updates
- Requirement 41.7: Month-over-month change
