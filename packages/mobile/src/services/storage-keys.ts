/**
 * Secure storage keys for the mobile app
 *
 * These are the only keys under which a real session token is ever written:
 * Expo SecureStore on native, `localStorage` on web via the `Platform.OS` branch in
 * `services/auth.ts`. Every reader must import from this module rather than
 * re-declare the literal — a mismatched literal reads an empty token and the request
 * silently goes out unauthenticated.
 *
 * This module is intentionally pure constants with no imports, so importing it pulls in
 * no Amplify or Google-auth side effects.
 */

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  ID_TOKEN: 'auth_id_token',
  USER_DATA: 'auth_user_data',
  GOOGLE_ACCESS_TOKEN: 'auth_google_access_token',
  GOOGLE_ID_TOKEN: 'auth_google_id_token',
} as const;

/** Convenience export for callers that only need the ID token key. */
export const ID_TOKEN_KEY = STORAGE_KEYS.ID_TOKEN;
