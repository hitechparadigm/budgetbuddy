/**
 * Google Sign-In Button Component
 * Handles Google OAuth 2.0 authentication for web app
 */

import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// ============================================================================
// Google Sign-In Button Component
// ============================================================================

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError
}) => {
  const { loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsProcessing(true);

      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      // Send credential to backend for verification and user creation/linking
      const { loginWithGoogle } = useAuth();
      await loginWithGoogle(credentialResponse.credential);

      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google Sign-In failed';
      console.error('[GoogleSignIn] Error:', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = () => {
    const errorMessage = 'Google Sign-In failed. Please try again.';
    console.error('[GoogleSignIn] Error:', errorMessage);
    onError?.(errorMessage);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="w-full opacity-100" style={{ opacity: loading || isProcessing ? 0.6 : 1 }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        text="signin_with"
        width="100%"
      />
    </div>
  );
};
