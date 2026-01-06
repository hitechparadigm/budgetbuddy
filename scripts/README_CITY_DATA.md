# City Expense Data (Historical)

**Note**: This document describes the city expense data generation process that was completed and the script has been removed as part of codebase cleanup.

## Current Status

The city expense data generation is **COMPLETE**. The generated data is available in `packages/shared/src/data/cityExpenseData.ts` and contains expense data for cities across multiple countries.

## Generated Data

The city expense data includes realistic monthly expense estimates for cities in:

- Canada (100 cities)
- USA (100 cities)
- UK (100 cities)
- Germany (25 cities)
- France (25 cities)
- Netherlands (15 cities)
- Spain (15 cities)
- Italy (20 cities)
- Australia (50 cities)

## Usage

The generated data is available through the shared package:

```typescript
import {
  getCityExpenseData,
  getAllCities,
  searchCities,
  findNearestCity,
} from "@budget-buddy/shared/dist/data/cityExpenseData";

// Get data for a specific city
const torontoData = getCityExpenseData("toronto-ca");

// Search cities
const canadianCities = searchCities("canada");

// Find nearest city by coordinates
const nearestCity = findNearestCity(43.6532, -79.3832);
```

## Data Structure

Each city includes:

```typescript
interface CityExpenseData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  population: number;
  classification: "urban" | "suburban" | "rural";
  currency: string;
  expenses: {
    housing: number; // Rent/Mortgage
    homeInsurance: number;
    utilities: number;
    publicTransit: number;
    gas: number;
    carInsurance: number;
    carMaintenance: number;
    parking: number;
    groceries: number;
    diningOut: number;
    healthInsurance: number; // 0 for universal healthcare countries
    doctorVisits: number;
    medicine: number;
    dental: number;
    vision: number;
    entertainment: number;
    childcare: number;
    personal: number;
  };
}
```

## Historical Generation Process

The data was generated using AWS Bedrock AI with the following process:

1. **AI Generation**: Used Claude 3.5 Sonnet to generate realistic expense data
2. **Country Coverage**: Generated data for 9 countries with varying city counts
3. **Quality Assurance**: AI was prompted with specific guidelines for accuracy
4. **Cost Optimization**: Generated once and cached to avoid recurring API costs

### Generation Cost

- Total cost: ~$0.72 for all countries
- Generated: 385 cities total
- One-time generation completed in November 2024

## Future Updates

If city data needs to be updated in the future:

1. **Manual Updates**: Edit `packages/shared/src/data/cityExpenseData.ts` directly
2. **Regeneration**: Would require recreating the generation script
3. **Recommended Schedule**: Update quarterly only if significant economic changes occur

## Data Quality Notes

The generated data is based on:

- Real-world cost of living data (2024/2025)
- Country-specific considerations (universal healthcare, etc.)
- Urban/suburban/rural classifications
- Local currency values
- Regional economic conditions

The data provides realistic estimates suitable for budgeting application onboarding and should be reviewed periodically for accuracy.
