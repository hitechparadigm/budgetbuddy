/**
 * Authentication Service for React Native
 *
 * Handles user authentication using AWS Cognito with secure token storage
 * using Expo SecureStore for JWT tokens and user session management.
 */

import { signIn, signUp, confirmSignUp, resendSignUpCode, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { googleAuthService, GoogleAuthResult, GoogleUser } from './googleAuth';

// Secure storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  ID_TOKEN: 'auth_id_token',
  USER_DATA: 'auth_user_data',
  GOOGLE_ACCESS_TOKEN: 'auth_google_access_token',
  GOOGLE_ID_TOKEN: 'auth_google_id_token',
} as const;

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
  name?: string;
}

export interface AuthError {
  code: string;
  message: string;
}

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
   * Sign in user with email and password
   */
  async signInUser(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: credentials.email,
        password: credentials.password,
      });

      if (!isSignedIn) {
        throw new Error('Sign in failed');
      }

      // Get current session
      const session = await fetchAuthSession();
      const tokens: AuthTokens = {
        accessToken: session.tokens?.accessToken?.toString() || '',
        refreshToken: '', // Refresh token not directly accessible in Amplify v6
        idToken: session.tokens?.idToken?.toString() || '',
      };

      // Get user info
      const currentUser = await getCurrentUser();
      const user: User = {
        id: currentUser.userId,
        email: credentials.email,
        name: currentUser.username,
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };

      // Store tokens securely
      await this.storeTokens(tokens);
      await this.storeUserData(user);

      return { user, tokens };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Register new user
   */
  async signUpUser(credentials: RegisterCredentials): Promise<{ user: User; needsVerification: boolean }> {
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: credentials.email,
        password: credentials.password,
        options: {
          userAttributes: {
            email: credentials.email,
            name: credentials.name || '',
          },
        },
      });

      const user: User = {
        id: credentials.email,
        email: credentials.email,
        name: credentials.name,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      };

      return {
        user,
        needsVerification: !isSignUpComplete,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Confirm user registration with verification code
   */
  async confirmSignUpUser(email: string, code: string): Promise<void> {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Resend verification code
   */
  async resendConfirmationCode(email: string): Promise<void> {
    try {
      await resendSignUpCode({
        username: email,
      });
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out user and clear stored tokens
   */
  async signOutUser(): Promise<void> {
    try {
      await signOut();
      await this.clearStoredData();
    } catch (error: any) {
      // Even if Cognito sign out fails, clear local data
      await this.clearStoredData();
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        return null;
      }

      return {
        id: currentUser.userId,
        email: currentUser.username,
        name: currentUser.username,
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await getCurrentUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current session tokens
   */
  async getCurrentTokens(): Promise<AuthTokens | null> {
    try {
      const session = await fetchAuthSession();
      return {
        accessToken: session.tokens?.accessToken?.toString() || '',
        refreshToken: '', // Refresh token not directly accessible in Amplify v6
        idToken: session.tokens?.idToken?.toString() || '',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<AuthTokens> {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const tokens: AuthTokens = {
        accessToken: session.tokens?.accessToken?.toString() || '',
        refreshToken: '', // Refresh token not directly accessible in Amplify v6
        idToken: session.tokens?.idToken?.toString() || '',
      };

      await this.storeTokens(tokens);
      return tokens;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
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
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    if (Platform.OS === 'web') {
      // For web platform, use localStorage as fallback
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      localStorage.setItem(STORAGE_KEYS.ID_TOKEN, tokens.idToken);
    } else {
      // For mobile platforms, use SecureStore
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.ID_TOKEN, tokens.idToken);
    }
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
