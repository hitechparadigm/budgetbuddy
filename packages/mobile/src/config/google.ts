/**
 * Google OAuth Configuration
 * Contains Google OAuth 2.0 client credentials for different platforms
 *
 * SETUP INSTRUCTIONS:
 * 1. Web: Already configured with provided credentials
 * 2. iOS: Create OAuth 2.0 Client ID in Google Cloud Console
 *    - Type: iOS
 *    - Bundle ID: com.budgetbuddy.mobile
 *    - Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID environment variable
 * 3. Android: Create OAuth 2.0 Client ID in Google Cloud Console
 *    - Type: Android
 *    - Package name: com.budgetbuddy.mobile
 *    - SHA-1 fingerprint: Get from `eas credentials` or keytool
 *    - Set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID environment variable
 *
 * For development, use: npx eas credentials
 * For production, store credentials in AWS Secrets Manager
 */

import { Platform } from 'react-native';

export interface GoogleConfig {
  clientId: string;
  clientSecret?: string;
}

// Google OAuth Client IDs
// All platforms now have dedicated client IDs from Google Cloud Console
const GOOGLE_CONFIG: Record<string, GoogleConfig> = {
  web: {
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '25096939086-7mii5nkunrtkui0fibv0d5k93mtinrhk.apps.googleusercontent.com',
    clientSecret: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET || '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',
  },
  ios: {
    // iOS OAuth client ID from Google Cloud Console
    clientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '25096939086-2g3q3399qa177vhhl9fdb0oh9e939n1o.apps.googleusercontent.com',
  },
  android: {
    // Android OAuth client ID from Google Cloud Console
    clientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '25096939086-u76379vfuc6keu4enn1d749fuajk1vfq.apps.googleusercontent.com',
  },
};

/**
 * Get Google OAuth configuration for current platform
 */
export const getGoogleConfig = (): GoogleConfig => {
  const platform = Platform.OS === 'web' ? 'web' : Platform.OS;
  return GOOGLE_CONFIG[platform] || GOOGLE_CONFIG.web;
};

/**
 * Initialize Google Auth with platform-specific configuration
 */
export const initializeGoogleAuth = () => {
  const config = getGoogleConfig();

  if (!config.clientId || config.clientId.includes('your-')) {
    console.warn(
      'Google OAuth not configured. Please set up Google OAuth credentials in Google Cloud Console and update the environment variables.'
    );
    return false;
  }

  return config;
};

export default {
  getGoogleConfig,
  initializeGoogleAuth,
};
