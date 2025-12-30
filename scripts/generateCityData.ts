/**
 * City Expense Data Generator
 * Uses AWS Bedrock to generate realistic expense data for cities
 * Run manually by admin to update city data
 *
 * Usage:
 *   npm run generate-city-data
 *
 * Configuration:
 *   Edit CITY_CONFIG below to add/remove countries or change city counts
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as fs from 'fs';
import * as path from 'path';

// Configuration - easily editable by admin
const CITY_CONFIG = {
  'Canada': 100,
  'USA': 100,
  'UK': 100,
  'Germany': 25,
  'France': 25,
  'Netherlands': 15,
  'Spain': 15,
  'Italy': 20,
  'Australia': 50,
};

const OUTPUT_FILE = path.join(__dirname, '../packages/shared/src/data/cityExpenseData.ts');

// AWS Bedrock client
const client = new BedrockRuntimeClient({ region: 'us-east-1' });

interface CityExpenseData {
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

/**
 * Generate expense data for cities using AWS Bedrock
 */
async function generateCityData(country: string, cityCount: number): Promise<CityExpenseData[]> {
  console.log(`\n🌍 Generating data for ${cityCount} cities in ${country}...`);

  const prompt = `Generate realistic monthly expense data for the ${cityCount} most populous cities in ${country}.

For each city, provide:
1. City name
2. Country
3. Latitude and longitude
4. Population
5. Classification (urban/suburban/rural based on population)
6. Local currency code
7. Typical monthly expenses for a single person in local currency:
   - Housing (rent for 1-bedroom apartment)
   - Transportation (public transit pass or car costs)
   - Groceries
   - Utilities (electricity, water, internet)
   - Entertainment
   - Healthcare
   - Insurance (health, car, home)
   - Childcare (per child)
   - Dining out
   - Personal care

Return ONLY valid JSON array with no markdown formatting. Use this exact structure:
[
  {
    "city": "Toronto",
    "country": "Canada",
    "latitude": 43.6532,
    "longitude": -79.3832,
    "population": 2930000,
    "classification": "urban",
    "currency": "CAD",
    "expenses": {
      "housing": 2200,
      "transportation": 150,
      "groceries": 400,
      "utilities": 180,
      "entertainment": 200,
      "healthcare": 100,
      "insurance": 250,
      "childcare": 1200,
      "dining": 300,
      "personal": 150
    }
  }
]

Ensure all numbers are realistic for ${country} in 2025.`;

  try {
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 10000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const cities: CityExpenseData[] = JSON.parse(jsonMatch[0]);
    console.log(`✅ Generated data for ${cities.length} cities in ${country}`);

    return cities;
  } catch (error) {
    console.error(`❌ Error generating data for ${country}:`, error);
    throw error;
  }
}

/**
 * Generate TypeScript file with all city data
 */
function generateTypeScriptFile(allCities: CityExpenseData[]): string {
  const cityDatabase: Record<string, CityExpenseData> = {};

  // Create city keys (city-countrycode)
  allCities.forEach((city) => {
    const countryCode = getCountryCode(city.country);
    const key = `${city.city.toLowerCase().replace(/\s+/g, '-')}-${countryCode}`;
    cityDatabase[key] = city;
  });

  const fileContent = `/**
 * City Expense Data
 * Generated using AWS Bedrock - ${new Date().toISOString()}
 *
 * This file contains typical monthly expenses for ${allCities.length} cities across multiple countries.
 * Data is reusable and cached to reduce API calls.
 *
 * To update this data, run: npm run generate-city-data
 */

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

export const cityExpenseDatabase: Record<string, CityExpenseData> = ${JSON.stringify(cityDatabase, null, 2)};

/**
 * Get expense data for a city
 */
export function getCityExpenseData(cityKey: string): CityExpenseData | null {
  return cityExpenseDatabase[cityKey.toLowerCase()] || null;
}

/**
 * Get all available cities
 */
export function getAllCities(): CityExpenseData[] {
  return Object.values(cityExpenseDatabase);
}

/**
 * Search cities by name
 */
export function searchCities(query: string): CityExpenseData[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(cityExpenseDatabase).filter(
    (city) =>
      city.city.toLowerCase().includes(lowerQuery) ||
      city.country.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Find nearest city by coordinates
 */
export function findNearestCity(latitude: number, longitude: number): CityExpenseData | null {
  const cities = getAllCities();
  if (cities.length === 0) return null;

  let nearest = cities[0];
  let minDistance = calculateDistance(latitude, longitude, nearest.latitude, nearest.longitude);

  for (const city of cities) {
    const distance = calculateDistance(latitude, longitude, city.latitude, city.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city;
    }
  }

  return minDistance < 200 ? nearest : null; // Within 200km
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
`;

  return fileContent;
}

/**
 * Get country code from country name
 */
function getCountryCode(country: string): string {
  const codes: Record<string, string> = {
    'Canada': 'ca',
    'USA': 'us',
    'UK': 'uk',
    'Germany': 'de',
    'France': 'fr',
    'Netherlands': 'nl',
    'Spain': 'es',
    'Italy': 'it',
    'Australia': 'au',
  };
  return codes[country] || country.toLowerCase().substring(0, 2);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting city expense data generation...');
  console.log(`📊 Configuration: ${Object.entries(CITY_CONFIG).map(([c, n]) => `${c}(${n})`).join(', ')}`);

  const allCities: CityExpenseData[] = [];

  // Generate data for each country
  for (const [country, cityCount] of Object.entries(CITY_CONFIG)) {
    try {
      const cities = await generateCityData(country, cityCount);
      allCities.push(...cities);

      // Rate limiting - wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to generate data for ${country}, skipping...`);
    }
  }

  console.log(`\n✅ Generated data for ${allCities.length} cities total`);

  // Generate TypeScript file
  console.log('\n📝 Writing to file...');
  const fileContent = generateTypeScriptFile(allCities);
  fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');

  console.log(`✅ File written to: ${OUTPUT_FILE}`);
  console.log('\n🎉 City expense data generation complete!');
  console.log('\n📌 Next steps:');
  console.log('   1. Review the generated data');
  console.log('   2. Run: npm run build (in packages/shared)');
  console.log('   3. Commit the updated cityExpenseData.ts file');
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
