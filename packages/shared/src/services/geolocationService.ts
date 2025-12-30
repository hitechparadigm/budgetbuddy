/**
 * Geolocation Service
 * Provides IP-based geolocation for detecting user's city/country
 * Used for onboarding location detection
 */

export interface GeolocationResult {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  success: boolean;
  error?: string;
}

/**
 * Detect user's location using IP-based geolocation
 * Uses ip-api.com free tier (45 requests/minute)
 * Falls back to manual selection if detection fails
 */
export async function detectUserLocation(): Promise<GeolocationResult> {
  try {
    const response = await fetch('https://ip-api.com/json/?fields=city,country,countryCode,lat,lon,timezone,status,message', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'fail') {
      return {
        city: '',
        country: '',
        countryCode: '',
        latitude: 0,
        longitude: 0,
        timezone: '',
        success: false,
        error: data.message || 'Geolocation detection failed',
      };
    }

    return {
      city: data.city || '',
      country: data.country || '',
      countryCode: data.countryCode || '',
      latitude: data.lat || 0,
      longitude: data.lon || 0,
      timezone: data.timezone || '',
      success: true,
    };
  } catch (error) {
    return {
      city: '',
      country: '',
      countryCode: '',
      latitude: 0,
      longitude: 0,
      timezone: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format geolocation result for display
 */
export function formatLocation(result: GeolocationResult): string {
  if (!result.success) {
    return 'Location detection failed';
  }
  return `${result.city}, ${result.country}`;
}

/**
 * Validate geolocation result
 */
export function isValidGeolocation(result: GeolocationResult): boolean {
  return (
    result.success &&
    result.city.length > 0 &&
    result.country.length > 0 &&
    result.latitude !== 0 &&
    result.longitude !== 0
  );
}

/**
 * Create city key for database lookup
 * Format: "city-countrycode" (lowercase)
 */
export function createCityKey(city: string, countryCode: string): string {
  return `${city.toLowerCase().replace(/\s+/g, '-')}-${countryCode.toLowerCase()}`;
}
