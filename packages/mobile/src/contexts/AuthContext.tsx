/**
 * Authentication Context for React Native
 *
 * Provides authentication state management across the mobile app
 * with automatic token refresh, session persistence, and MFA support.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  authService,
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  AuthError,
} from "../services/auth";

// MFA Challenge types
interface MFAChallenge {
  type: "SOFTWARE_TOKEN_MFA" | "SMS_MFA";
  session: string;
  email: string;
}

interface AuthContextType {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mfaChallenge: MFAChallenge | null;
  mfaEnabled: boolean;

  // Actions
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (
    credentials: RegisterCredentials,
  ) => Promise<{ needsVerification: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;

  // MFA Actions
  verifyMFA: (code: string) => Promise<void>;
  verifyMFAWithBackupCode: (code: string) => Promise<void>;
  setupMFA: () => Promise<{ secretCode: string; qrCodeUrl: string }>;
  confirmMFASetup: (code: string) => Promise<void>;
  disableMFA: () => Promise<void>;
  getBackupCodes: () => Promise<string[]>;
  cancelMFAChallenge: () => void;
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
  const [mfaChallenge, setMfaChallenge] = useState<MFAChallenge | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Initialize authentication state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (isAuthenticated && tokens) {
      const refreshInterval = setInterval(
        async () => {
          try {
            await handleRefreshTokens();
          } catch (error) {
            console.warn("Failed to refresh tokens:", error);
            // If refresh fails, sign out user
            await handleSignOut();
          }
        },
        45 * 60 * 1000,
      ); // Refresh every 45 minutes

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

          // Check if MFA is enabled for this user
          try {
            const mfaStatus = await authService.getMFAStatus?.();
            setMfaEnabled(mfaStatus?.enabled || false);
          } catch {
            // MFA status check failed, assume disabled
            setMfaEnabled(false);
          }
        } else {
          // Clear invalid state
          await handleSignOut();
        }
      }
    } catch (error) {
      console.warn("Failed to initialize auth:", error);
      await handleSignOut();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in user - handles MFA challenges
   */
  const handleSignIn = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await authService.signInUser(credentials);

      // Check if MFA challenge is required
      if (
        result.challengeName === "SOFTWARE_TOKEN_MFA" ||
        result.challengeName === "SMS_MFA"
      ) {
        setMfaChallenge({
          type: result.challengeName,
          session: result.session || "",
          email: credentials.email,
        });
        return; // Don't complete sign-in yet, wait for MFA verification
      }

      // No MFA required, complete sign-in
      setUser(result.user);
      setTokens(result.tokens);
      setIsAuthenticated(true);
      setMfaChallenge(null);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify MFA code during sign-in
   */
  const handleVerifyMFA = async (code: string): Promise<void> => {
    if (!mfaChallenge) {
      throw new Error("No MFA challenge in progress");
    }

    try {
      setIsLoading(true);
      const result = await authService.respondToMFAChallenge?.(
        mfaChallenge.email,
        code,
        mfaChallenge.session,
        mfaChallenge.type,
      );

      if (result) {
        setUser(result.user);
        setTokens(result.tokens);
        setIsAuthenticated(true);
        setMfaChallenge(null);
        setMfaEnabled(true);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify MFA with backup code
   */
  const handleVerifyMFAWithBackupCode = async (code: string): Promise<void> => {
    if (!mfaChallenge) {
      throw new Error("No MFA challenge in progress");
    }

    try {
      setIsLoading(true);
      // Backup codes are typically handled the same way as TOTP codes
      // but may have different validation on the backend
      const result = await authService.respondToMFAChallenge?.(
        mfaChallenge.email,
        code.replace(/-/g, ""), // Remove dashes from backup code
        mfaChallenge.session,
        "SOFTWARE_TOKEN_MFA",
      );

      if (result) {
        setUser(result.user);
        setTokens(result.tokens);
        setIsAuthenticated(true);
        setMfaChallenge(null);
        setMfaEnabled(true);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel MFA challenge and return to login
   */
  const handleCancelMFAChallenge = (): void => {
    setMfaChallenge(null);
    setIsLoading(false);
  };

  /**
   * Set up MFA for the current user
   */
  const handleSetupMFA = async (): Promise<{
    secretCode: string;
    qrCodeUrl: string;
  }> => {
    if (!user) {
      throw new Error("User must be authenticated to set up MFA");
    }

    try {
      const result = await authService.setupMFA?.();
      if (!result) {
        throw new Error("MFA setup not supported");
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Confirm MFA setup with verification code
   */
  const handleConfirmMFASetup = async (code: string): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.confirmMFASetup?.(code);
      setMfaEnabled(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Disable MFA for the current user
   */
  const handleDisableMFA = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.disableMFA?.();
      setMfaEnabled(false);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get backup codes for MFA
   */
  const handleGetBackupCodes = async (): Promise<string[]> => {
    try {
      const codes = await authService.getBackupCodes?.();
      return codes || [];
    } catch (error) {
      throw error;
    }
  };

  /**
   * Sign up new user
   */
  const handleSignUp = async (
    credentials: RegisterCredentials,
  ): Promise<{ needsVerification: boolean }> => {
    try {
      setIsLoading(true);
      const result = await authService.signUpUser(credentials);

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
  const handleConfirmSignUp = async (
    email: string,
    code: string,
  ): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.confirmSignUpUser(email, code);

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
      await authService.signOutUser();
    } catch (error) {
      console.warn("Sign out error:", error);
      // Continue with local cleanup even if remote sign out fails
    } finally {
      // Clear local state
      setUser(null);
      setTokens(null);
      setIsAuthenticated(false);
      setMfaChallenge(null);
      setMfaEnabled(false);
      setIsLoading(false);
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
    mfaChallenge,
    mfaEnabled,

    // Actions
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendConfirmationCode: handleResendConfirmationCode,
    signOut: handleSignOut,
    refreshTokens: handleRefreshTokens,

    // MFA Actions
    verifyMFA: handleVerifyMFA,
    verifyMFAWithBackupCode: handleVerifyMFAWithBackupCode,
    setupMFA: handleSetupMFA,
    confirmMFASetup: handleConfirmMFASetup,
    disableMFA: handleDisableMFA,
    getBackupCodes: handleGetBackupCodes,
    cancelMFAChallenge: handleCancelMFAChallenge,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default AuthContext;
