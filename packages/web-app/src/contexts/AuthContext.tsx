/**
 * Authentication Context for BudgetBuddy Web App
 * Manages user authentication state and provides auth methods
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { apiClient, ApiClientError } from "../utils/apiClient";
import type {
  AuthState,
  User,
  LoginRequest,
  RegisterRequest,
  AuthTokens,
} from "../types";

// ============================================================================
// Types
// ============================================================================

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse user information from JWT ID token
 */
const parseUserFromIdToken = (idToken: string): User | null => {
  try {
    const tokenParts = idToken.split(".");
    if (tokenParts.length !== 3) {
      console.error("Invalid token format - not a valid JWT");
      return null;
    }

    // Decode JWT payload — use atob() (browser-native) not Buffer (Node.js only)
    // JWT uses base64url encoding (- and _ instead of + and /)
    const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    // Extract user information from token payload
    const userId = payload["custom:userId"] || payload.sub;
    if (!userId) {
      console.error("No valid userId found in token");
      return null;
    }

    return {
      userId,
      email: payload.email || "",
      firstName: payload.given_name || "",
      lastName: payload.family_name || "",
      accountType: (payload["custom:accountType"] || "single") as
        | "single"
        | "family",
      subscriptionTier: (payload["custom:subscriptionTier"] || "free") as
        | "free"
        | "premium",
      onboardingCompleted: payload["custom:onboardingCompleted"] === "true",
      timezone:
        payload["custom:timezone"] ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: payload.iat
        ? new Date(payload.iat * 1000).toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to parse user from ID token:", error);
    return null;
  }
};

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

          if (user) {
            setAuthState({
              isAuthenticated: true,
              user,
              tokens,
              loading: false,
              error: null,
            });
          } else {
            // Token parsing failed - invalid token, clear auth state
            console.warn("Token parsing failed, clearing authentication");
            apiClient.clearTokens();
            setAuthState({
              isAuthenticated: false,
              user: null,
              tokens: null,
              loading: false,
              error: "Invalid authentication token. Please log in again.",
            });
          }
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
        console.error("Auth initialization error:", error);
        // Clear potentially corrupted tokens
        apiClient.clearTokens();
        setAuthState({
          isAuthenticated: false,
          user: null,
          tokens: null,
          loading: false,
          error: "Authentication error. Please log in again.",
        });
      }
    };

    initializeAuth();
  }, []);

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  const login = async (credentials: LoginRequest): Promise<void> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const loginResult = await apiClient.login(credentials);

      const user: User = {
        userId: loginResult.user.userId,
        email: loginResult.user.email,
        firstName: loginResult.user.firstName,
        lastName: loginResult.user.lastName,
        accountType: loginResult.user.accountType as "single" | "family",
        subscriptionTier: loginResult.user.subscriptionTier as
          | "free"
          | "premium",
        onboardingCompleted: false, // TODO: Get from API response
        timezone:
          loginResult.user.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
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
      const errorMessage =
        error instanceof ApiClientError
          ? error.message
          : "Login failed. Please try again.";

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await apiClient.register(userData);

      // After successful registration, automatically log in
      await login({
        email: userData.email,
        password: userData.password,
      });
    } catch (error) {
      const errorMessage =
        error instanceof ApiClientError
          ? error.message
          : "Registration failed. Please try again.";

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<void> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Send Google ID token to backend for verification and user creation/linking
      const response = await apiClient.post("/auth/google", { idToken });

      const user: User = {
        userId: response.user.userId,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        accountType: response.user.accountType as "single" | "family",
        subscriptionTier: response.user.subscriptionTier as "free" | "premium",
        onboardingCompleted: false,
        timezone:
          response.user.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const tokens: AuthTokens = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        expiresIn: response.expiresIn,
      };

      // Store tokens via apiClient
      apiClient.setTokens(tokens);

      setAuthState({
        isAuthenticated: true,
        user,
        tokens,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Google Sign-In failed. Please try again.";

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    setAuthState((prev) => ({ ...prev, loading: true }));

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
      console.error("Logout error:", error);
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
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    loginWithGoogle,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// ============================================================================
// Custom Hook
// ============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
