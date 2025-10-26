/**
 * Authentication Context for BudgetBuddy Web App
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient, ApiClientError } from '../utils/apiClient';
import type {
  AuthState,
  User,
  LoginRequest,
  RegisterRequest,
  AuthTokens
} from '../types';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Auth Provider Component
// ============================================================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    tokens: null,
    loading: true,
    error: null,
  });

  // ============================================================================
  // Initialize Authentication State
  // ============================================================================

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user has valid tokens
        const tokens = apiClient.getTokens();

        if (tokens && apiClient.isAuthenticated()) {
          // Parse user info from ID token
          const user = parseUserFromIdToken(tokens.idToken);

          setAuthState({
            isAuthenticated: true,
            user,
            tokens,
            loading: false,
            error: null,
          });
        } else {
          // No valid authentication
          setAuthState({
            isAuthenticated: false,
            user: null,
            tokens: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          tokens: null,
          loading: false,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initializeAuth();
  }, []);

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  const login = async (credentials: LoginRequest): Promise<void> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const loginResult = await apiClient.login(credentials);

      const user: User = {
        userId: loginResult.user.userId,
        email: loginResult.user.email,
        firstName: loginResult.user.firstName,
        lastName: loginResult.user.lastName,
        accountType: loginResult.user.accountType as 'single' | 'family',
        subscriptionTier: loginResult.user.subscriptionTier as 'free' | 'premium',
        onboardingCompleted: false, // TODO: Get from API response
        createdAt: new Date().toISOString(), // TODO: Get from API response
        updatedAt: new Date().toISOString(), // TODO: Get from API response
      };

      const tokens: AuthTokens = {
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
        idToken: loginResult.idToken,
        expiresIn: loginResult.expiresIn,
      };

      setAuthState({
        isAuthenticated: true,
        user,
        tokens,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiClientError
        ? error.message
        : 'Login failed. Please try again.';

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await apiClient.register(userData);

      // After successful registration, automatically log in
      await login({
        email: userData.email,
        password: userData.password,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiClientError
        ? error.message
        : 'Registration failed. Please try again.';

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, loading: true }));

    try {
      await apiClient.logout();

      setAuthState({
        isAuthenticated: false,
        user: null,
        tokens: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setAuthState({
        isAuthenticated: false,
        user: null,
        tokens: null,
        loading: false,
        error: null,
      });
    }
  };

  const clearError = (): void => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// Custom Hook
// ============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

// ============================================================================
// Utility Functions
// ============================================================================

const parseUserFromIdToken = (idToken: string): User => {
  try {
    // Parse JWT token (basic parsing - in production, use a proper JWT library)
    const payload = JSON.parse(atob(idToken.split('.')[1]));

    return {
      userId: payload['custom:userId'] || payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      accountType: (payload['custom:accountType'] || 'single') as 'single' | 'family',
      subscriptionTier: (payload['custom:subscriptionTier'] || 'free') as 'free' | 'premium',
      onboardingCompleted: payload['custom:onboardingCompleted'] === 'true',
      createdAt: new Date(payload.iat * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error parsing ID token:', error);
    throw new Error('Invalid token format');
  }
};
