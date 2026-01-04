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
 * Detect user's location using backend proxy endpoint
 * Backend calls ipapi.co to avoid CORS issues
 * Falls back to manual selection if detection fails
 */
export async function detectUserLocation(): Promise<GeolocationResult> {
  try {
    // Call backend proxy endpoint instead of ipapi.co directly
    const API_BASE_URL = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';
    const response = await fetch(`${API_BASE_URL}/auth/geolocation`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if backend returned an error
    if (!data.success) {
      return {
        city: '',
        country: '',
        countryCode: '',
        latitude: 0,
        longitude: 0,
        timezone: '',
        success: false,
        error: data.error || 'Geolocation detection failed',
      };
    }

    return {
      city: data.city || '',
      country: data.country || '',
      countryCode: data.countryCode || '',
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
  if (!city || !countryCode) {
    console.error('createCityKey: Invalid parameters', { city, countryCode });
    return '';
  }
  return `${city.toLowerCase().replace(/\s+/g, '-')}-${countryCode.toLowerCase()}`;
}
