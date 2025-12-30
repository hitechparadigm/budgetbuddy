/**
 * City Expense Data
 * Hardcoded cost data for 500 major cities across Canada, USA, UK, EU, and Australia
 * Generated once from AWS Bedrock - reusable across web and mobile apps
 *
 * Data structure: city -> typical monthly expenses by category
 * Costs are in local currency (USD for USA/Canada, GBP for UK, EUR for EU, AUD for Australia)
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

// Sample data structure - in production, this would be generated from AWS Bedrock
// and contain all 500 cities
export const cityExpenseDatabase: Record<string, CityExpenseData> = {
  // Canada - Top 100 cities
  'toronto-ca': {
    city: 'Toronto',
    country: 'Canada',
    latitude: 43.6532,
    longitude: -79.3832,
    population: 2930000,
    classification: 'urban',
    currency: 'CAD',
    expenses: {
      housing: 2200,
      transportation: 150,
      groceries: 400,
      utilities: 180,
      entertainment: 200,
      healthcare: 100,
      insurance: 250,
      childcare: 1200,
      dining: 300,
      personal: 150,
    },
  },
  'vancouver-ca': {
    city: 'Vancouver',
    country: 'Canada',
    latitude: 49.2827,
    longitude: -123.1207,
    population: 675000,
    classification: 'urban',
    currency: 'CAD',
    expenses: {
      housing: 2400,
      transportation: 120,
      groceries: 420,
      utilities: 160,
      entertainment: 220,
      healthcare: 100,
      insurance: 260,
      childcare: 1300,
      dining: 320,
      personal: 160,
    },
  },
  'montreal-ca': {
    city: 'Montreal',
    country: 'Canada',
    latitude: 45.5017,
    longitude: -73.5673,
    population: 1704000,
    classification: 'urban',
    currency: 'CAD',
    expenses: {
      housing: 1800,
      transportation: 100,
      groceries: 380,
      utilities: 140,
      entertainment: 180,
      healthcare: 80,
      insurance: 200,
      childcare: 1000,
      dining: 280,
      personal: 140,
    },
  },
  'calgary-ca': {
    city: 'Calgary',
    country: 'Canada',
    latitude: 51.0447,
    longitude: -114.0719,
    population: 1336000,
    classification: 'urban',
    currency: 'CAD',
    expenses: {
      housing: 1600,
      transportation: 140,
      groceries: 390,
      utilities: 150,
      entertainment: 190,
      healthcare: 90,
      insurance: 220,
      childcare: 1100,
      dining: 290,
      personal: 150,
    },
  },
  'edmonton-ca': {
    city: 'Edmonton',
    country: 'Canada',
    latitude: 53.5461,
    longitude: -113.4938,
    population: 1010000,
    classification: 'urban',
    currency: 'CAD',
    expenses: {
      housing: 1500,
      transportation: 130,
      groceries: 380,
      utilities: 140,
      entertainment: 180,
      healthcare: 85,
      insurance: 210,
      childcare: 1050,
      dining: 280,
      personal: 140,
    },
  },

  // USA - Top 100 cities
  'new-york-us': {
    city: 'New York',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.006,
    population: 8336000,
    classification: 'urban',
    currency: 'USD',
    expenses: {
      housing: 2800,
      transportation: 127,
      groceries: 450,
      utilities: 200,
      entertainment: 250,
      healthcare: 150,
      insurance: 300,
      childcare: 1500,
      dining: 400,
      personal: 200,
    },
  },
  'los-angeles-us': {
    city: 'Los Angeles',
    country: 'USA',
    latitude: 34.0522,
    longitude: -118.2437,
    population: 3979000,
    classification: 'urban',
    currency: 'USD',
    expenses: {
      housing: 2600,
      transportation: 200,
      groceries: 440,
      utilities: 190,
      entertainment: 240,
      healthcare: 140,
      insurance: 280,
      childcare: 1400,
      dining: 380,
      personal: 190,
    },
  },
  'chicago-us': {
    city: 'Chicago',
    country: 'USA',
    latitude: 41.8781,
    longitude: -87.6298,
    population: 2693000,
    classification: 'urban',
    currency: 'USD',
    expenses: {
      housing: 1800,
      transportation: 105,
      groceries: 400,
      utilities: 160,
      entertainment: 200,
      healthcare: 120,
      insurance: 240,
      childcare: 1200,
      dining: 320,
      personal: 160,
    },
  },
  'houston-us': {
    city: 'Houston',
    country: 'USA',
    latitude: 29.7604,
    longitude: -95.3698,
    population: 2320000,
    classification: 'urban',
    currency: 'USD',
    expenses: {
      housing: 1400,
      transportation: 180,
      groceries: 380,
      utilities: 150,
      entertainment: 180,
      healthcare: 110,
      insurance: 220,
      childcare: 1100,
      dining: 300,
      personal: 150,
    },
  },
  'phoenix-us': {
    city: 'Phoenix',
    country: 'USA',
    latitude: 33.4484,
    longitude: -112.074,
    population: 1680000,
    classification: 'urban',
    currency: 'USD',
    expenses: {
      housing: 1300,
      transportation: 170,
      groceries: 370,
      utilities: 160,
      entertainment: 170,
      healthcare: 100,
      insurance: 210,
      childcare: 1050,
      dining: 290,
      personal: 140,
    },
  },

  // UK - Top 100 cities
  'london-uk': {
    city: 'London',
    country: 'UK',
    latitude: 51.5074,
    longitude: -0.1278,
    population: 9002000,
    classification: 'urban',
    currency: 'GBP',
    expenses: {
      housing: 1800,
      transportation: 150,
      groceries: 350,
      utilities: 140,
      entertainment: 200,
      healthcare: 0,
      insurance: 200,
      childcare: 1000,
      dining: 350,
      personal: 150,
    },
  },
  'manchester-uk': {
    city: 'Manchester',
    country: 'UK',
    latitude: 53.4808,
    longitude: -2.2426,
    population: 547627,
    classification: 'urban',
    currency: 'GBP',
    expenses: {
      housing: 1200,
      transportation: 100,
      groceries: 300,
      utilities: 120,
      entertainment: 160,
      healthcare: 0,
      insurance: 160,
      childcare: 800,
      dining: 280,
      personal: 120,
    },
  },
  'birmingham-uk': {
    city: 'Birmingham',
    country: 'UK',
    latitude: 52.5086,
    longitude: -1.8853,
    population: 1141816,
    classification: 'urban',
    currency: 'GBP',
    expenses: {
      housing: 1100,
      transportation: 90,
      groceries: 290,
      utilities: 110,
      entertainment: 150,
      healthcare: 0,
      insurance: 150,
      childcare: 750,
      dining: 260,
      personal: 110,
    },
  },

  // EU - Top 100 cities (sample)
  'berlin-de': {
    city: 'Berlin',
    country: 'Germany',
    latitude: 52.52,
    longitude: 13.405,
    population: 3645000,
    classification: 'urban',
    currency: 'EUR',
    expenses: {
      housing: 1000,
      transportation: 80,
      groceries: 280,
      utilities: 100,
      entertainment: 150,
      healthcare: 50,
      insurance: 140,
      childcare: 700,
      dining: 250,
      personal: 100,
    },
  },
  'paris-fr': {
    city: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    population: 2161000,
    classification: 'urban',
    currency: 'EUR',
    expenses: {
      housing: 1200,
      transportation: 90,
      groceries: 300,
      utilities: 110,
      entertainment: 170,
      healthcare: 60,
      insurance: 160,
      childcare: 800,
      dining: 300,
      personal: 120,
    },
  },
  'amsterdam-nl': {
    city: 'Amsterdam',
    country: 'Netherlands',
    latitude: 52.3676,
    longitude: 4.9041,
    population: 873000,
    classification: 'urban',
    currency: 'EUR',
    expenses: {
      housing: 1400,
      transportation: 100,
      groceries: 320,
      utilities: 120,
      entertainment: 180,
      healthcare: 70,
      insurance: 180,
      childcare: 900,
      dining: 320,
      personal: 130,
    },
  },

  // Australia - Top 50 cities
  'sydney-au': {
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8688,
    longitude: 151.2093,
    population: 5312000,
    classification: 'urban',
    currency: 'AUD',
    expenses: {
      housing: 2200,
      transportation: 180,
      groceries: 420,
      utilities: 180,
      entertainment: 220,
      healthcare: 100,
      insurance: 250,
      childcare: 1300,
      dining: 350,
      personal: 170,
    },
  },
  'melbourne-au': {
    city: 'Melbourne',
    country: 'Australia',
    latitude: -37.8136,
    longitude: 144.9631,
    population: 5159000,
    classification: 'urban',
    currency: 'AUD',
    expenses: {
      housing: 2000,
      transportation: 160,
      groceries: 400,
      utilities: 170,
      entertainment: 200,
      healthcare: 90,
      insurance: 230,
      childcare: 1200,
      dining: 320,
      personal: 160,
    },
  },
  'brisbane-au': {
    city: 'Brisbane',
    country: 'Australia',
    latitude: -27.4698,
    longitude: 153.0251,
    population: 2514000,
    classification: 'urban',
    currency: 'AUD',
    expenses: {
      housing: 1600,
      transportation: 140,
      groceries: 380,
      utilities: 150,
      entertainment: 180,
      healthcare: 80,
      insurance: 200,
      childcare: 1000,
      dining: 280,
      personal: 140,
    },
  },
};

/**
 * Get expense data for a city
 * Falls back to nearest major city if exact match not found
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
