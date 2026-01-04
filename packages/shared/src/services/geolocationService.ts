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
 * Uses ipapi.co free tier (1000 requests/day, no API key required)
 * Falls back to manual selection if detection fails
 */
export async function detectUserLocation(): Promise<GeolocationResult> {
  try {
    // Try ipapi.co first (more reliable, no CORS issues)
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if we got an error response
    if (data.error) {
      throw new Error(data.reason || 'Geolocation detection failed');
    }

    return {
      city: data.city || '',
      country: data.country_name || '',
      countryCode: (data.country_code || '').toLowerCase(),
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      timezone: data.timezone || '',
      success: true,
    };
  } catch (error) {
    console.error('Geolocation detection error:', error);
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
