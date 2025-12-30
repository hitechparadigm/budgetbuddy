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
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
const BATCH_SIZE = 10; // Max cities per request (Bedrock limitation)
const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds between requests
const MAX_RETRIES = 3; // Max retries for failed requests

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
    // Housing
    housing: number; // Rent/Mortgage
    homeInsurance: number;
    utilities: number;

    // Transportation
    publicTransit: number;
    gas: number;
    carInsurance: number;
    carMaintenance: number;
    parking: number;

    // Food
    groceries: number;
    diningOut: number;

    // Healthcare
    healthInsurance: number; // 0 for universal healthcare countries
    doctorVisits: number;
    medicine: number;
    dental: number;
    vision: number;

    // Other
    entertainment: number;
    childcare: number;
    personal: number;
  };
}

/**
 * Generate expense data for cities using AWS Bedrock with retry logic
 */
async function generateCityData(
  country: string,
  cityCount: number,
  startRank: number = 1,
  retryCount: number = 0
): Promise<CityExpenseData[]> {
  const endRank = startRank + cityCount - 1;
  console.log(`\n🌍 Generating data for cities ${startRank}-${endRank} in ${country}...`);

  const prompt = `Generate realistic monthly expense data for cities ranked ${startRank} to ${endRank} by population in ${country}.

For each city, provide:
1. City name
2. Country
3. Latitude and longitude
4. Population
5. Classification (urban/suburban/rural based on population)
6. Local currency code
7. Detailed monthly expenses for a single person in local currency:

HOUSING:
- housing: Rent for 1-bedroom apartment or mortgage payment
- homeInsurance: Home or renter's insurance
- utilities: Electricity, water, internet, heating

TRANSPORTATION:
- publicTransit: Monthly transit pass (set to 0 ONLY if city has no public transit system)
- gas: Monthly fuel costs for car owners (typical amount even if some people use transit)
- carInsurance: Auto insurance monthly premium (typical amount for car owners)
- carMaintenance: Car service, repairs, registration (monthly average)
- parking: Monthly parking costs (home + work parking if applicable)

FOOD:
- groceries: Supermarket food shopping
- diningOut: Restaurants, takeout, cafes

HEALTHCARE (IMPORTANT - Country-specific):
- healthInsurance: Monthly health insurance premium (SET TO 0 for Canada, UK, and other universal healthcare countries; USA typically $300-500)
- doctorVisits: Co-pays, out-of-pocket medical costs (SET TO 0 for Canada, UK with full universal healthcare; USA typically $30-100 per visit)
- medicine: Medications, pharmacy (some cost even in universal healthcare countries)
- dental: Dental care (often not covered even in universal healthcare - typical costs)
- vision: Eye care, glasses, contacts (often not covered even in universal healthcare)

OTHER:
- entertainment: Movies, streaming, hobbies, activities
- childcare: Daycare per child (if applicable)
- personal: Haircuts, gym, personal care items

Return ONLY valid JSON array with no markdown formatting. Use this EXACT structure:
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
      "homeInsurance": 150,
      "utilities": 180,
      "publicTransit": 150,
      "gas": 0,
      "carInsurance": 0,
      "carMaintenance": 0,
      "parking": 100,
      "groceries": 400,
      "diningOut": 300,
      "healthInsurance": 0,
      "doctorVisits": 50,
      "medicine": 30,
      "dental": 80,
      "vision": 40,
      "entertainment": 200,
      "childcare": 1200,
      "personal": 150
    }
  }
]

CRITICAL:
- For Canada, UK, and universal healthcare countries: healthInsurance MUST be 0
- For USA: healthInsurance typically $300-500
- Transportation costs should reflect BOTH transit and car ownership (most people have cars even in cities with good transit)
- Only set gas/carInsurance/carMaintenance to 0 in cities where car ownership is truly rare (like dense Asian/European city centers)
- North American cities (Canada, USA): People typically own cars even with good transit - include realistic car costs
- All amounts must be realistic for ${country} in 2025
- Return exactly ${cityCount} cities
`;

  try {
    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
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
    console.log(`✅ Generated data for ${cities.length} cities in ${country} (ranks ${startRank}-${endRank})`);

    return cities;
  } catch (error: any) {
    console.error(`❌ Error generating data for ${country}:`, error.message);

    // Retry logic with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = DELAY_BETWEEN_REQUESTS * Math.pow(2, retryCount);
      console.log(`⏳ Retrying in ${delay / 1000} seconds... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateCityData(country, cityCount, startRank, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Generate TypeScript file with all city data
 */
function generateTypeScriptFile(allCities: CityExpenseData[]): string {
  const cityDatabase: Record<string, CityExpenseData> = {};
  const duplicates: string[] = [];

  // Create city keys (city-countrycode) and check for duplicates
  allCities.forEach((city) => {
    const countryCode = getCountryCode(city.country);
    const key = `${city.city.toLowerCase().replace(/\s+/g, '-')}-${countryCode}`;

    // Check for duplicates
    if (cityDatabase[key]) {
      duplicates.push(`${key} (${city.city}, ${city.country})`);
      console.warn(`⚠️  Duplicate city key detected: ${key} - keeping first occurrence`);
    } else {
      cityDatabase[key] = city;
    }
  });

  // Log duplicate summary
  if (duplicates.length > 0) {
    console.warn(`\n⚠️  Found ${duplicates.length} duplicate cities (skipped):`);
    duplicates.forEach(dup => console.warn(`   - ${dup}`));
  }

  const uniqueCityCount = Object.keys(cityDatabase).length;
  console.log(`\n📊 Unique cities: ${uniqueCityCount} (${allCities.length - uniqueCityCount} duplicates removed)`);

  const fileContent = `/**
 * City Expense Data
 * Generated using AWS Bedrock - ${new Date().toISOString()}
 *
 * This file contains typical monthly expenses for ${uniqueCityCount} cities across multiple countries.
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
    // Housing
    housing: number; // Rent/Mortgage
    homeInsurance: number;
    utilities: number;

    // Transportation
    publicTransit: number;
    gas: number;
    carInsurance: number;
    carMaintenance: number;
    parking: number;

    // Food
    groceries: number;
    diningOut: number;

    // Healthcare
    healthInsurance: number; // 0 for universal healthcare countries
    doctorVisits: number;
    medicine: number;
    dental: number;
    vision: number;

    // Other
    entertainment: number;
    childcare: number;
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

  const totalCities = Object.values(CITY_CONFIG).reduce((sum, count) => sum + count, 0);
  const estimatedRequests = Math.ceil(totalCities / BATCH_SIZE);
  const estimatedTime = (estimatedRequests * DELAY_BETWEEN_REQUESTS) / 1000 / 60;

  console.log(`📈 Total cities to generate: ${totalCities}`);
  console.log(`📊 Estimated requests: ${estimatedRequests}`);
  console.log(`⏱️  Estimated time: ~${Math.ceil(estimatedTime)} minutes`);
  console.log(`💰 Estimated cost: ~$${(estimatedRequests * 0.015).toFixed(2)} (at $0.015 / request)`);
  console.log('\n⚠️  Rate limiting: 3 seconds between requests + exponential backoff on errors');

  // Load existing cities from file if it exists
  let allCities: CityExpenseData[] = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existingContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
      const match = existingContent.match(/export const cityExpenseDatabase: Record<string, CityExpenseData> = ({[\s\S]*?});/);
      if (match) {
        const existingDatabase = eval('(' + match[1] + ')');
        allCities = Object.values(existingDatabase);
        console.log(`\n📂 Loaded ${allCities.length} existing cities from file`);
      }
    } catch (error) {
      console.warn('⚠️  Could not load existing cities, starting fresh');
    }
  }

  let requestCount = 0;

  // Generate data for each country in batches
  for (const [country, cityCount] of Object.entries(CITY_CONFIG)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 Processing ${country} (${cityCount} cities)`);
    console.log(`${'='.repeat(60)}`);

    const batches = Math.ceil(cityCount / BATCH_SIZE);

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * BATCH_SIZE;
      const batchSize = Math.min(BATCH_SIZE, cityCount - batchStart);
      const startRank = batchStart + 1; // Population rank starts at 1

      try {
        console.log(`\n📦 Batch ${batch + 1}/${batches} (cities ${batchStart + 1}-${batchStart + batchSize})`);

        const cities = await generateCityData(country, batchSize, startRank);
        allCities.push(...cities);
        requestCount++;

        console.log(`✅ Progress: ${allCities.length}/${totalCities} cities (${Math.round(allCities.length / totalCities * 100)}%)`);

        // Write incrementally after each batch
        console.log(`💾 Writing ${allCities.length} cities to file...`);
        const fileContent = generateTypeScriptFile(allCities);
        fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
        console.log(`✅ File updated with ${allCities.length} cities`);

        // Rate limiting - wait between requests
        if (batch < batches - 1 || Object.keys(CITY_CONFIG).indexOf(country) < Object.keys(CITY_CONFIG).length - 1) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS / 1000}s before next request...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
      } catch (error) {
        console.error(`❌ Failed batch ${batch + 1} for ${country}, continuing with next batch...`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Generated data for ${allCities.length}/${totalCities} cities total`);
  console.log(`📊 Requests made: ${requestCount}`);
  console.log(`💰 Actual cost: ~$${(requestCount * 0.015).toFixed(2)}`);
  console.log(`${'='.repeat(60)}`);

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
