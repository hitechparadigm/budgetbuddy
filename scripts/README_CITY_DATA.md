# City Expense Data Generator

This script generates realistic monthly expense data for cities using AWS Bedrock AI.

## Purpose

- Generate expense data for onboarding new users
- Data is cached and reusable to reduce API costs
- Easily update countries and city counts
- Run manually by admin when needed

## Configuration

Edit `CITY_CONFIG` in `scripts/generateCityData.ts`:

```typescript
const CITY_CONFIG = {
  'Canada': 100,      // Generate data for 100 Canadian cities
  'USA': 100,         // Generate data for 100 US cities
  'UK': 100,          // Generate data for 100 UK cities
  'Germany': 25,      // Generate data for 25 German cities
  'France': 25,       // etc...
  'Netherlands': 15,
  'Spain': 15,
  'Italy': 20,
  'Australia': 50,
};
```

## Usage

### Prerequisites

1. AWS credentials configured with Bedrock access
2. Node.js and npm installed
3. Dependencies installed: `npm install`

### Generate Data

```bash
npm run generate-city-data
```

This will:
1. Call AWS Bedrock for each country
2. Generate realistic expense data for all cities
3. Write to `packages/shared/src/data/cityExpenseData.ts`
4. Include helper functions for searching and finding cities

### After Generation

1. Review the generated data in `cityExpenseData.ts`
2. Build the shared package: `cd packages/shared && npm run build`
3. Commit the updated file: `git add packages/shared/src/data/cityExpenseData.ts`

## Cost Estimation

- AWS Bedrock Claude 3.5 Sonnet pricing: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- Each country request: ~500 input tokens + ~5000 output tokens = ~$0.08
- Total for 9 countries: ~$0.72 per full generation
- **Recommendation**: Run once, cache results, update quarterly

## Output Format

The generated file includes:

```typescript
export interface CityExpenseData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  population: number;
  classification: 'urban' | 'suburban' | 'rural';
  currency: string;
  expenses: {
    housing: number;
    transportation: number;
    groceries: number;
    utilities: number;
    entertainment: number;
    healthcare: number;
    insurance: number;
    childcare: number;
    dining: number;
    personal: number;
  };
}
```

## Helper Functions

The generated file includes:

- `getCityExpenseData(cityKey)` - Get data for a specific city
- `getAllCities()` - Get all cities
- `searchCities(query)` - Search by city or country name
- `findNearestCity(lat, lon)` - Find nearest city within 200km

## Adding New Countries

1. Edit `CITY_CONFIG` in `generateCityData.ts`
2. Add country code mapping in `getCountryCode()` function
3. Run `npm run generate-city-data`

Example:

```typescript
const CITY_CONFIG = {
  // ... existing countries
  'Japan': 50,        // Add Japan with 50 cities
  'Brazil': 30,       // Add Brazil with 30 cities
};

// Add to getCountryCode():
const codes: Record<string, string> = {
  // ... existing codes
  'Japan': 'jp',
  'Brazil': 'br',
};
```

## Troubleshooting

### AWS Credentials Error

```
Error: Missing credentials in config
```

**Solution**: Configure AWS credentials:
```bash
aws configure
```

### Bedrock Access Denied

```
Error: User is not authorized to perform: bedrock:InvokeModel
```

**Solution**: Add Bedrock permissions to your IAM user/role:
```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "*"
}
```

### Rate Limiting

The script includes 2-second delays between requests to avoid rate limits. If you still hit limits, increase the delay in the `main()` function.

## Maintenance Schedule

**Recommended**: Update city data quarterly (every 3 months) to keep expense estimates current.

**When to update**:
- Significant economic changes (inflation, recession)
- Adding new countries
- User feedback about inaccurate data

## Data Quality

The AI-generated data is based on:
- Real-world cost of living data
- Current economic conditions (2025)
- Local currency values
- Urban/suburban/rural classifications

Always review generated data for accuracy before committing.
