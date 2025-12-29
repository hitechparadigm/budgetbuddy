/**
 * Authentication Context for React Native
 *
 * Provides authentication state management across the mobile app
 * with automatic token refresh and session persistence.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User, AuthTokens, LoginCredentials, RegisterCredentials, AuthError } from '../services/auth';

interface AuthContextType {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<{ needsVerification: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshTokens: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize authentication state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (isAuthenticated && tokens) {
      const refreshInterval = setInterval(async () => {
        try {
          await refreshTokens();
        } catch (error) {
          console.warn('Failed to refresh tokens:', error);
          // If refresh fails, sign out user
          await handleSignOut();
        }
      }, 45 * 60 * 1000); // Refresh every 45 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [isAuthenticated, tokens]);

  /**
   * Initialize authentication state from stored data
   */
  const initializeAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Check if user is authenticated
      const authenticated = await authService.isAuthenticated();

      if (authenticated) {
        // Get current user and tokens
        const [currentUser, currentTokens] = await Promise.all([
          authService.getCurrentUser(),
          authService.getCurrentTokens(),
        ]);

        if (currentUser && currentTokens) {
          setUser(currentUser);
          setTokens(currentTokens);
          setIsAuthenticated(true);
        } else {
          // Clear invalid state
          await handleSignOut();
        }
      }
    } catch (error) {
      console.warn('Failed to initialize auth:', error);
      await handleSignOut();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in user
   */
  const handleSignIn = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      const { user: signedInUser, tokens: authTokens } = await authService.signIn(credentials);

      setUser(signedInUser);
      setTokens(authTokens);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign up new user
   */
  const handleSignUp = async (credentials: RegisterCredentials): Promise<{ needsVerification: boolean }> => {
    try {
      setIsLoading(true);
      const result = await authService.signUp(credentials);

      // Don't set user as authenticated until email is verified
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Confirm user registration
   */
  const handleConfirmSignUp = async (email: string, code: string): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.confirmSignUp(email, code);

      // After confirmation, user needs to sign in
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resend confirmation code
   */
  const handleResendConfirmationCode = async (email: string): Promise<void> => {
    try {
      await authService.resendConfirmationCode(email);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Sign out user
   */
  const handleSignOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.signOut();
    } catch (error) {
      console.warn('Sign out error:', error);
      // Continue with local cleanup even if remote sign out fails
    } finally {
      // Clear local state
      setUser(null);
      setTokens(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  /**
   * Request password reset
   */
  const handleForgotPassword = async (email: string): Promise<void> => {
    try {
      await authService.forgotPassword(email);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Confirm password reset
   */
  const handleConfirmForgotPassword = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> => {
    try {
      await authService.confirmForgotPassword(email, code, newPassword);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Refresh authentication tokens
   */
  const handleRefreshTokens = async (): Promise<void> => {
    try {
      const refreshedTokens = await authService.refreshTokens();
      setTokens(refreshedTokens);
    } catch (error) {
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    // State
    user,
    tokens,
    isLoading,
    isAuthenticated,

    // Actions
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendConfirmationCode: handleResendConfirmationCode,
    signOut: handleSignOut,
    forgotPassword: handleForgotPassword,
    confirmForgotPassword: handleConfirmForgotPassword,
    refreshTokens: handleRefreshTokens,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;
