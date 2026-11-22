/**
 * Authentication Service for React Native
 *
 * Signs in through the backend's POST /auth/login (the same route the web app uses;
 * the auth Lambda talks to Cognito) and keeps the session in secure storage: Expo
 * SecureStore on native, localStorage on web. No Amplify: its native module is not
 * part of Expo Go.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { googleAuthService, GoogleAuthResult, GoogleUser } from './googleAuth';
import { api, API_CONFIG } from './api';
import { STORAGE_KEYS } from './storage-keys';

// Secure storage keys live in their own import-free module so that callers which only
// need a key (e.g. services/plaid.ts) do not pull in Google-auth side effects.
// Re-exported here so existing deep imports keep working.
export { STORAGE_KEYS } from './storage-keys';

export interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  createdAt: string;
  authProvider?: 'cognito' | 'google';
  googleId?: string;
  picture?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** @deprecated kept for back-compat with callers that still pass a single display name */
  name?: string;
}

/** The fields of GET /auth/profile this app reads. */
export interface UserProfile {
  onboardingCompleted?: boolean;
  [key: string]: unknown;
}

export interface AuthError {
  code: string;
  message: string;
}

/** Refresh only when the stored session has less than this left. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Absolute expiry (ms since epoch) for an `expiresIn` in seconds; 1 hour if absent. */
const expiresAtFrom = (expiresIn: unknown): number =>
  Date.now() + (Number(expiresIn) || 3600) * 1000;

/**
 * Map a failed POST /auth/login response to the error codes handleAuthError knows.
 * Status and error codes come from backend/functions/auth/index.js.
 */
const loginError = (status: number, data: { error?: string; message?: string }) => {
  if (status === 401) return { name: 'NotAuthorizedException' };
  if (status === 403 && data.error === 'PASSWORD_RESET_REQUIRED') {
    return { name: 'PasswordResetRequiredException' };
  }
  if (status === 403 && data.error === 'USER_NOT_CONFIRMED') {
    return { name: 'UserNotConfirmedException' };
  }
  if (status === 429) return { name: 'LimitExceededException' };
  return { name: 'LoginError', message: data.message || 'Sign in failed. Please try again' };
};

class AuthService {
  /**
   * Initialize Google Auth
   */
  initializeGoogleAuth(clientId: string, clientSecret?: string): void {
    googleAuthService.initialize({ clientId, clientSecret });
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const googleResult = await googleAuthService.signIn();

      if (googleResult.type !== 'success' || !googleResult.user) {
        throw new Error(googleResult.error || 'Google Sign-In failed');
      }

      // Create user object from Google data
      const user: User = {
        id: googleResult.user.id,
        email: googleResult.user.email,
        name: googleResult.user.name,
        emailVerified: googleResult.user.verified_email,
        createdAt: new Date().toISOString(),
        authProvider: 'google',
        googleId: googleResult.user.id,
        picture: googleResult.user.picture,
      };

      // Create tokens object (Google tokens, not Cognito)
      const tokens: AuthTokens = {
        accessToken: googleResult.accessToken || '',
        refreshToken: '', // Google refresh tokens are handled differently
        idToken: googleResult.idToken || '',
      };

      // Store Google tokens separately
      await this.storeGoogleTokens(googleResult.accessToken, googleResult.idToken);
      await this.storeUserData(user);

      // TODO: Integrate with backend to create/link user account
      // This would involve calling your backend API to:
      // 1. Check if user exists by Google ID or email
      // 2. Create new user account if doesn't exist
      // 3. Link Google account to existing account if needed
      // 4. Return backend JWT tokens for API access

      return { user, tokens };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(): Promise<{ user: User; linked: boolean }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const googleResult = await googleAuthService.signIn();

      if (googleResult.type !== 'success' || !googleResult.user) {
        throw new Error(googleResult.error || 'Google Sign-In failed');
      }

      // Update user with Google information
      const updatedUser: User = {
        ...currentUser,
        authProvider: 'cognito', // Keep original provider
        googleId: googleResult.user.id,
        picture: googleResult.user.picture,
      };

      // Store Google tokens
      await this.storeGoogleTokens(googleResult.accessToken, googleResult.idToken);
      await this.storeUserData(updatedUser);

      // TODO: Call backend API to link Google account
      // This would update the user record to include Google ID

      return { user: updatedUser, linked: true };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Unlink Google account
   */
  async unlinkGoogleAccount(): Promise<{ user: User; unlinked: boolean }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Get Google access token for revocation
      const googleAccessToken = await this.getGoogleAccessToken();

      // Revoke Google tokens if available
      if (googleAccessToken) {
        await googleAuthService.signOut(googleAccessToken);
      }

      // Update user to remove Google information
      const updatedUser: User = {
        ...currentUser,
        googleId: undefined,
        picture: undefined,
      };

      // Clear Google tokens
      await this.clearGoogleTokens();
      await this.storeUserData(updatedUser);

      // TODO: Call backend API to unlink Google account
      // This would remove Google ID from user record

      return { user: updatedUser, unlinked: true };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }
  /**
   * Sign in user with email and password through POST /auth/login on the main
   * gateway, as the web app does. The request is unauthenticated and does not go
   * through the shared `apiRequest` helper. Nothing here logs the body or tokens.
   *
   * The Cognito User Pool has no MFA, so `challengeName`/`session` are always
   * `undefined`; they stay on the return type so AuthContext's MFA branch compiles.
   */
  async signInUser(credentials: LoginCredentials): Promise<{
    user: User;
    tokens: AuthTokens;
    challengeName?: 'SOFTWARE_TOKEN_MFA' | 'SMS_MFA';
    session?: string;
  }> {
    try {
      let response: Response;
      try {
        response = await fetch(`${API_CONFIG.baseURL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });
      } catch {
        throw { name: 'NetworkError' };
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw loginError(response.status, data);
      }
      if (!data.accessToken || !data.idToken) {
        throw { name: 'LoginError', message: 'Sign in failed. Please try again' };
      }

      const tokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || '',
        idToken: data.idToken,
      };
      const user: User = {
        id: data.user?.userId,
        email: data.user?.email || credentials.email,
        name: [data.user?.firstName, data.user?.lastName].filter(Boolean).join(' '),
        emailVerified: true,
        createdAt: new Date().toISOString(),
        authProvider: 'cognito',
      };

      await this.storeTokens(tokens, expiresAtFrom(data.expiresIn));
      await this.storeUserData(user);

      return { user, tokens };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Fetch the signed-in user's profile (GET /auth/profile on the main gateway).
   * The backend returns the profile at the JSON root; `onboardingCompleted`
   * decides whether onboarding is shown, as in the web AuthPage.
   */
  async getProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/auth/profile');
    return response.data;
  }

  /**
   * Register new user through the backend.
   *
   * Cognito self sign-up is disabled: the pool only accepts server-side AdminCreateUser,
   * which is what prevents a caller from choosing their own custom:userId. Registration
   * therefore goes to POST /auth/register, the same route the web app uses. This request
   * is unauthenticated on purpose and must not go through the shared `apiRequest` helper,
   * which attaches an auth token and an offline cache.
   *
   * The backend creates a CONFIRMED user with a permanent password, so there is never a
   * confirmation step and `needsVerification` is always false.
   */
  async signUpUser(credentials: RegisterCredentials): Promise<{ user: User; needsVerification: boolean }> {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          firstName: credentials.firstName,
          lastName: credentials.lastName,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw {
          name: response.status === 409 ? 'UsernameExistsException' : 'RegistrationError',
          message: data.message || 'Registration failed. Please try again',
        };
      }

      const user: User = {
        id: data.userId || credentials.email,
        email: data.email || credentials.email,
        name: [credentials.firstName, credentials.lastName].filter(Boolean).join(' '),
        emailVerified: false,
        createdAt: new Date().toISOString(),
        authProvider: 'cognito',
      };

      return {
        user,
        needsVerification: false,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Confirm user registration with verification code
   *
   * Not applicable: accounts are created already confirmed by POST /auth/register.
   */
  async confirmSignUpUser(_email: string, _code: string): Promise<void> {
    throw new Error('Email confirmation is not used: accounts are created already confirmed');
  }

  /**
   * Resend verification code
   *
   * Not applicable: accounts are created already confirmed by POST /auth/register.
   */
  async resendConfirmationCode(_email: string): Promise<void> {
    throw new Error('Email confirmation is not used: accounts are created already confirmed');
  }

  /**
   * Sign out user and clear stored tokens
   */
  async signOutUser(): Promise<void> {
    // The session lives only in local storage; there is no server-side sign-out call.
    await this.clearStoredData();
  }

  /**
   * Get current authenticated user (the profile stored at sign-in)
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await this.readItem(STORAGE_KEYS.USER_DATA);
      return userData ? (JSON.parse(userData) as User) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated: an ID token is stored and has not expired
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const idToken = await this.readItem(STORAGE_KEYS.ID_TOKEN);
      const expiresAt = Number(await this.readItem(STORAGE_KEYS.EXPIRES_AT));
      return !!idToken && expiresAt > Date.now();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current session tokens from storage
   */
  async getCurrentTokens(): Promise<AuthTokens | null> {
    try {
      const [accessToken, refreshToken, idToken] = await Promise.all([
        this.readItem(STORAGE_KEYS.ACCESS_TOKEN),
        this.readItem(STORAGE_KEYS.REFRESH_TOKEN),
        this.readItem(STORAGE_KEYS.ID_TOKEN),
      ]);
      if (!idToken) {
        return null;
      }
      return {
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        idToken,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh authentication tokens
   *
   * Returns the stored tokens while more than 5 minutes remain. Otherwise it
   * POSTs /auth/refresh as the web app does. That route is not deployed yet, so
   * near expiry this throws and AuthContext signs the user out, the same as the web.
   */
  async refreshTokens(): Promise<AuthTokens> {
    try {
      const tokens = await this.getCurrentTokens();
      const expiresAt = Number(await this.readItem(STORAGE_KEYS.EXPIRES_AT));
      if (tokens && expiresAt - Date.now() > REFRESH_MARGIN_MS) {
        return tokens;
      }
      if (!tokens?.refreshToken) {
        throw { name: 'SessionExpired' };
      }

      let response: Response;
      try {
        response = await fetch(`${API_CONFIG.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      } catch {
        throw { name: 'NetworkError' };
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.accessToken || !data.idToken) {
        throw { name: 'SessionExpired' };
      }

      const refreshed: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || tokens.refreshToken,
        idToken: data.idToken,
      };
      await this.storeTokens(refreshed, expiresAtFrom(data.expiresIn));
      return refreshed;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * MFA methods
   *
   * The Cognito User Pool backing this app has no MFA configuration
   * (see infrastructure/lib/auth-stack.ts - `mfa` is never set, so it
   * defaults to OFF), and there is no `/auth/mfa/*` backend route. These
   * methods exist so AuthContext.tsx and the Settings/Login screens that
   * already have 2FA UI (TwoFactorSetup, TwoFactorVerify) compile against a
   * real API shape, but they intentionally reject rather than pretend to
   * succeed. Enabling MFA for real requires a CDK change to the live User
   * Pool plus a real challenge/response implementation - tracked as future
   * work, not part of this fix.
   */
  async getMFAStatus(): Promise<{ enabled: boolean }> {
    return { enabled: false };
  }

  async respondToMFAChallenge(
    _email: string,
    _code: string,
    _session: string,
    _challengeType: 'SOFTWARE_TOKEN_MFA' | 'SMS_MFA',
  ): Promise<{ user: User; tokens: AuthTokens } | null> {
    throw new Error('MFA is not enabled for this account');
  }

  async setupMFA(): Promise<{ secretCode: string; qrCodeUrl: string }> {
    throw new Error('MFA setup is not supported yet');
  }

  async confirmMFASetup(_code: string): Promise<void> {
    throw new Error('MFA setup is not supported yet');
  }

  async disableMFA(): Promise<void> {
    throw new Error('MFA is not enabled for this account');
  }

  async getBackupCodes(): Promise<string[]> {
    throw new Error('MFA is not enabled for this account');
  }

  /**
   * Store Google authentication tokens securely
   */
  private async storeGoogleTokens(accessToken?: string, idToken?: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (accessToken) localStorage.setItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN, accessToken);
      if (idToken) localStorage.setItem(STORAGE_KEYS.GOOGLE_ID_TOKEN, idToken);
    } else {
      if (accessToken) await SecureStore.setItemAsync(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN, accessToken);
      if (idToken) await SecureStore.setItemAsync(STORAGE_KEYS.GOOGLE_ID_TOKEN, idToken);
    }
  }

  /**
   * Get Google access token
   */
  private async getGoogleAccessToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN);
    } else {
      return await SecureStore.getItemAsync(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN);
    }
  }

  /**
   * Clear Google tokens
   */
  private async clearGoogleTokens(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_ID_TOKEN);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN).catch(() => { });
      await SecureStore.deleteItemAsync(STORAGE_KEYS.GOOGLE_ID_TOKEN).catch(() => { });
    }
  }
  private async storeTokens(tokens: AuthTokens, expiresAt: number): Promise<void> {
    if (Platform.OS === 'web') {
      // For web platform, use localStorage as fallback
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      localStorage.setItem(STORAGE_KEYS.ID_TOKEN, tokens.idToken);
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));
    } else {
      // For mobile platforms, use SecureStore
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.ID_TOKEN, tokens.idToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));
    }
  }

  /**
   * Read one stored auth value (SecureStore on native, localStorage on web)
   */
  private async readItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  }

  /**
   * Store user data securely
   */
  private async storeUserData(user: User): Promise<void> {
    const userData = JSON.stringify(user);

    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, userData);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, userData);
    }
  }

  /**
   * Clear all stored authentication data
   */
  private async clearStoredData(): Promise<void> {
    if (Platform.OS === 'web') {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } else {
      await Promise.all(
        Object.values(STORAGE_KEYS).map(key =>
          SecureStore.deleteItemAsync(key).catch(() => {
            // Ignore errors when deleting non-existent keys
          })
        )
      );
    }
  }

  /**
   * Handle and normalize authentication errors
   */
  private handleAuthError(error: any): AuthError {
    const errorCode = error.name || error.code || 'UNKNOWN_ERROR';
    let message = error.message || 'An unknown error occurred';

    // Normalize common error messages for better UX
    switch (errorCode) {
      case 'UserNotConfirmedException':
        message = 'Please verify your email address before signing in';
        break;
      case 'NotAuthorizedException':
        message = 'Invalid email or password';
        break;
      case 'PasswordResetRequiredException':
        message = 'Your password must be reset. Enter the code we emailed you.';
        break;
      case 'SessionExpired':
        message = 'Your session has expired. Please sign in again';
        break;
      case 'UserNotFoundException':
        message = 'No account found with this email address';
        break;
      case 'UsernameExistsException':
        message = 'An account with this email already exists';
        break;
      case 'InvalidPasswordException':
        message = 'Password does not meet requirements';
        break;
      case 'CodeMismatchException':
        message = 'Invalid verification code';
        break;
      case 'ExpiredCodeException':
        message = 'Verification code has expired';
        break;
      case 'LimitExceededException':
        message = 'Too many attempts. Please try again later';
        break;
      case 'NetworkError':
        message = 'Network error. Please check your connection';
        break;
    }

    return {
      code: errorCode,
      message,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
