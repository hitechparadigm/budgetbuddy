/**
 * Plaid Link Button Component
 *
 * Integrates with Plaid Link to allow users to connect their bank accounts.
 * Uses the Plaid Link SDK loaded via script tag for simplicity.
 */

import React, { useState, useCallback, useEffect } from "react";
import { createLinkToken, exchangePublicToken } from "../services/plaidApi";

// Declare Plaid global type
declare global {
  interface Window {
    Plaid?: {
      create: (config: PlaidLinkConfig) => PlaidLinkHandler;
    };
  }
}

interface PlaidLinkConfig {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void;
  onExit: (error: PlaidLinkError | null, metadata: PlaidLinkMetadata) => void;
  onEvent?: (eventName: string, metadata: PlaidLinkMetadata) => void;
}

interface PlaidLinkHandler {
  open: () => void;
  exit: (options?: { force: boolean }) => void;
  destroy: () => void;
}

interface PlaidLinkMetadata {
  institution?: {
    name: string;
    institution_id: string;
  };
  accounts?: Array<{
    id: string;
    name: string;
    mask: string;
    type: string;
    subtype: string;
  }>;
  link_session_id?: string;
}

interface PlaidLinkError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string | null;
}

interface PlaidLinkButtonProps {
  onSuccess?: (accounts: unknown[]) => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

export const PlaidLinkButton: React.FC<PlaidLinkButtonProps> = ({
  onSuccess,
  onError,
  className = "",
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [plaidHandler, setPlaidHandler] = useState<PlaidLinkHandler | null>(
    null,
  );
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Load Plaid SDK script
  useEffect(() => {
    if (window.Plaid) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Plaid SDK");
      onError?.(new Error("Failed to load Plaid SDK"));
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove the script on unmount as other components might need it
    };
  }, [onError]);

  // Handle successful link
  const handleSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkMetadata) => {
      console.log("Plaid Link success", {
        institution: metadata.institution?.name,
        accounts: metadata.accounts?.length,
      });

      try {
        setLoading(true);
        const result = await exchangePublicToken(publicToken);
        onSuccess?.(result.accounts);
      } catch (error) {
        console.error("Failed to exchange token:", error);
        onError?.(
          error instanceof Error ? error : new Error("Failed to link account"),
        );
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError],
  );

  // Handle exit from Plaid Link
  const handleExit = useCallback(
    (error: PlaidLinkError | null, metadata: PlaidLinkMetadata) => {
      console.log("Plaid Link exit", {
        error,
        sessionId: metadata.link_session_id,
      });

      if (error) {
        onError?.(new Error(error.display_message || error.error_message));
      }
    },
    [onError],
  );

  // Initialize Plaid Link when SDK is loaded and we have a token
  useEffect(() => {
    if (!sdkLoaded || !linkToken || !window.Plaid) return;

    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: handleSuccess,
      onExit: handleExit,
      onEvent: (eventName, metadata) => {
        console.log("Plaid Link event:", eventName, metadata);
      },
    });

    setPlaidHandler(handler);

    return () => {
      handler.destroy();
    };
  }, [sdkLoaded, linkToken, handleSuccess, handleExit]);

  // Open Plaid Link
  const openPlaidLink = async () => {
    if (!sdkLoaded) {
      onError?.(new Error("Plaid SDK not loaded"));
      return;
    }

    try {
      setLoading(true);

      // Get a fresh link token
      const { linkToken: token } = await createLinkToken();
      setLinkToken(token);

      // Wait for handler to be created
      setTimeout(() => {
        if (window.Plaid) {
          const handler = window.Plaid.create({
            token,
            onSuccess: handleSuccess,
            onExit: handleExit,
          });
          handler.open();
          setPlaidHandler(handler);
        }
        setLoading(false);
      }, 100);
    } catch (error) {
      console.error("Failed to create link token:", error);
      onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to initialize bank connection"),
      );
      setLoading(false);
    }
  };

  return (
    <button
      onClick={openPlaidLink}
      disabled={loading || !sdkLoaded}
      className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
        disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          Connecting...
        </span>
      ) : (
        children || "🏦 Connect Bank Account"
      )}
    </button>
  );
};

export default PlaidLinkButton;
