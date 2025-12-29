/**
 * Authentication Service for React Native
 *
 * Handles user authentication using AWS Cognito with secure token storage
 * using Expo SecureStore for JWT tokens and user session management.
 */

import { Auth } from 'aws-amplify';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Secure storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  ID_TOKEN: 'auth_id_token',
  USER_DATA: 'auth_user_data',
} as const;

export interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  createdAt: string;
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
   * Sign in user with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const cognitoUser = await Auth.signIn(credentials.email, credentials.password);

      // Get user session and tokens
      const session = await Auth.currentSession();
      const tokens: AuthTokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        idToken: session.getIdToken().getJwtToken(),
      };

      // Get user attributes
      const userAttributes = await Auth.currentUserInfo();
      const user: User = {
        id: cognitoUser.username,
        email: userAttributes.attributes.email,
        name: userAttributes.attributes.name,
        emailVerified: userAttributes.attributes.email_verified === 'true',
        createdAt: userAttributes.attributes.created_at || new Date().toISOString(),
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
  async signUp(credentials: RegisterCredentials): Promise<{ user: User; needsVerification: boolean }> {
    try {
      const { user: cognitoUser } = await Auth.signUp({
        username: credentials.email,
        password: credentials.password,
        attributes: {
          email: credentials.email,
          name: credentials.name || '',
        },
      });

      const user: User = {
        id: cognitoUser.getUsername(),
        email: credentials.email,
        name: credentials.name,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      };

      return {
        user,
        needsVerification: !cognitoUser.isSignUpComplete(),
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Confirm user registration with verification code
   */
  async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      await Auth.confirmSignUp(email, code);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Resend verification code
   */
  async resendConfirmationCode(email: string): Promise<void> {
    try {
      await Auth.resendSignUp(email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out user and clear stored tokens
   */
  async signOut(): Promise<void> {
    try {
      await Auth.signOut();
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
      const cognitoUser = await Auth.currentAuthenticatedUser();
      const userAttributes = await Auth.currentUserInfo();

      if (!cognitoUser || !userAttributes) {
        return null;
      }

      return {
        id: cognitoUser.username,
        email: userAttributes.attributes.email,
        name: userAttributes.attributes.name,
        emailVerified: userAttributes.attributes.email_verified === 'true',
        createdAt: userAttributes.attributes.created_at || new Date().toISOString(),
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
      await Auth.currentAuthenticatedUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current session tokens
   */
  async getCurrentTokens(): Promise<AuthTokens | null> {
    try {
      const session = await Auth.currentSession();
      return {
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        idToken: session.getIdToken().getJwtToken(),
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
      const session = await Auth.currentSession();
      const tokens: AuthTokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        idToken: session.getIdToken().getJwtToken(),
      };

      await this.storeTokens(tokens);
      return tokens;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await Auth.forgotPassword(email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Confirm password reset with code
   */
  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      await Auth.forgotPasswordSubmit(email, code, newPassword);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Store authentication tokens securely
   */
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
    const errorCode = error.code || 'UNKNOWN_ERROR';
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
