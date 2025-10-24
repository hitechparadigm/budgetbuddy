/**
 * Regional data and configurations
 */

export interface CityData {
  name: string;
  province: string;
  country: string;
  medianIncome: number;
  medianRent2Bed: number;
  avgGroceriesFamily4: number;
  avgUtilities: number;
  avgTransportation: number;
}

// Sample cost of living data for major Canadian cities
export const CANADIAN_CITIES: CityData[] = [
  {
    name: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    medianIncome: 5200,
    medianRent2Bed: 2800,
    avgGroceriesFamily4: 1200,
    avgUtilities: 150,
    avgTransportation: 180,
  },
  {
    name: 'Vancouver',
    province: 'British Columbia',
    country: 'Canada',
    medianIncome: 5000,
    medianRent2Bed: 3200,
    avgGroceriesFamily4: 1300,
    avgUtilities: 120,
    avgTransportation: 170,
  },
  {
    name: 'Montreal',
    province: 'Quebec',
    country: 'Canada',
    medianIncome: 4500,
    medianRent2Bed: 1800,
    avgGroceriesFamily4: 1100,
    avgUtilities: 140,
    avgTransportation: 90,
  },
  {
    name: 'Calgary',
    province: 'Alberta',
    country: 'Canada',
    medianIncome: 5500,
    medianRent2Bed: 1600,
    avgGroceriesFamily4: 1150,
    avgUtilities: 180,
    avgTransportation: 150,
  },
  {
    name: 'Ottawa',
    province: 'Ontario',
    country: 'Canada',
    medianIncome: 5100,
    medianRent2Bed: 2000,
    avgGroceriesFamily4: 1100,
    avgUtilities: 160,
    avgTransportation: 130,
  },
  {
    name: 'Edmonton',
    province: 'Alberta',
    country: 'Canada',
    medianIncome: 5200,
    medianRent2Bed: 1400,
    avgGroceriesFamily4: 1100,
    avgUtilities: 170,
    avgTransportation: 140,
  },
  {
    name: 'Winnipeg',
    province: 'Manitoba',
    country: 'Canada',
    medianIncome: 4200,
    medianRent2Bed: 1200,
    avgGroceriesFamily4: 1000,
    avgUtilities: 150,
    avgTransportation: 120,
  },
  {
    name: 'Quebec City',
    province: 'Quebec',
    country: 'Canada',
    medianIncome: 4000,
    medianRent2Bed: 1300,
    avgGroceriesFamily4: 1000,
    avgUtilities: 130,
    avgTransportation: 80,
  },
];

// Sample cost of living data for major US cities
export const US_CITIES: CityData[] = [
  {
    name: 'New York',
    province: 'New York',
    country: 'United States',
    medianIncome: 6500,
    medianRent2Bed: 4000,
    avgGroceriesFamily4: 1400,
    avgUtilities: 180,
    avgTransportation: 120,
  },
  {
    name: 'Los Angeles',
    province: 'California',
    country: 'United States',
    medianIncome: 6000,
    medianRent2Bed: 3500,
    avgGroceriesFamily4: 1300,
    avgUtilities: 150,
    avgTransportation: 200,
  },
  {
    name: 'Chicago',
    province: 'Illinois',
    country: 'United States',
    medianIncome: 5500,
    medianRent2Bed: 2200,
    avgGroceriesFamily4: 1200,
    avgUtilities: 140,
    avgTransportation: 150,
  },
  {
    name: 'Houston',
    province: 'Texas',
    country: 'United States',
    medianIncome: 5200,
    medianRent2Bed: 1800,
    avgGroceriesFamily4: 1100,
    avgUtilities: 160,
    avgTransportation: 180,
  },
  {
    name: 'Phoenix',
    province: 'Arizona',
    country: 'United States',
    medianIncome: 4800,
    medianRent2Bed: 1600,
    avgGroceriesFamily4: 1000,
    avgUtilities: 140,
    avgTransportation: 160,
  },
  {
    name: 'Philadelphia',
    province: 'Pennsylvania',
    country: 'United States',
    medianIncome: 5000,
    medianRent2Bed: 2000,
    avgGroceriesFamily4: 1150,
    avgUtilities: 130,
    avgTransportation: 120,
  },
  {
    name: 'San Antonio',
    province: 'Texas',
    country: 'United States',
    medianIncome: 4500,
    medianRent2Bed: 1400,
    avgGroceriesFamily4: 1000,
    avgUtilities: 150,
    avgTransportation: 140,
  },
  {
    name: 'San Diego',
    province: 'California',
    country: 'United States',
    medianIncome: 5800,
    medianRent2Bed: 3000,
    avgGroceriesFamily4: 1250,
    avgUtilities: 140,
    avgTransportation: 170,
  },
];

export const getAllCities = (): CityData[] => {
  return [...CANADIAN_CITIES, ...US_CITIES];
};

export const getCitiesByCountry = (country: string): CityData[] => {
  const allCities = getAllCities();
  return allCities.filter(city => 
    city.country.toLowerCase() === country.toLowerCase() ||
    (country.toLowerCase() === 'ca' && city.country === 'Canada') ||
    (country.toLowerCase() === 'us' && city.country === 'United States')
  );
};

export const findClosestCity = (targetCity: string, province: string, country: string): CityData | null => {
  const cities = getCitiesByCountry(country);
  
  // First try exact match
  let match = cities.find(city => 
    city.name.toLowerCase() === targetCity.toLowerCase() &&
    city.province.toLowerCase() === province.toLowerCase()
  );
  
  if (match) return match;
  
  // Then try province match
  match = cities.find(city => 
    city.province.toLowerCase() === province.toLowerCase()
  );
  
  if (match) return match;
  
  // Finally return first city in country
  return cities[0] || null;
};