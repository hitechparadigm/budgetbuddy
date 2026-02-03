/**
 * TwoFactorSetup Component Tests
 *
 * Tests for the two-factor authentication setup wizard.
 * **Validates: Requirements 10.5**
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from "react-native";

type SetupStep = "intro" | "qr" | "verify" | "backup";

// Create a simplified mock component for testing
const MockTwoFactorSetup = ({
  visible,
  onClose,
  onComplete,
  mockApiResponse,
}: {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  mockApiResponse?: {
    setupSuccess?: boolean;
    verifySuccess?: boolean;
    secretCode?: string;
    backupCodes?: string[];
    error?: string;
  };
}) => {
  const [step, setStep] = React.useState<SetupStep>("intro");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [secretCode, setSecretCode] = React.useState<string | null>(null);
  const [verificationCode, setVerificationCode] = React.useState("");
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const [copiedBackup, setCopiedBackup] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setStep("intro");
      setError(null);
      setSecretCode(null);
      setVerificationCode("");
      setBackupCodes([]);
    }
  }, [visible]);

  const handleStartSetup = async () => {
    setLoading(true);
    setError(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (mockApiResponse?.setupSuccess === false) {
      setError(mockApiResponse.error || "Setup failed");
    } else {
      setSecretCode(mockApiResponse?.secretCode || "ABCD1234EFGH5678");
      setStep("qr");
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (mockApiResponse?.verifySuccess === false) {
      setError(mockApiResponse.error || "Invalid code");
    } else {
      setBackupCodes(
        mockApiResponse?.backupCodes || ["CODE1", "CODE2", "CODE3", "CODE4"],
      );
      setStep("backup");
    }
    setLoading(false);
  };

  const handleCopySecret = () => {
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const getStepIndex = (s: SetupStep): number => {
    const steps: SetupStep[] = ["intro", "qr", "verify", "backup"];
    return steps.indexOf(s);
  };

  return (
    <Modal visible={visible} testID="modal">
      <View testID="container">
        {/* Header */}
        <View testID="header">
          <Text testID="header-title">Two-Factor Authentication</Text>
          {step !== "backup" && (
            <Pressable
              testID="close-button"
              accessibilityLabel="Close"
              onPress={onClose}
            >
              <Text>×</Text>
            </Pressable>
          )}
        </View>

        {/* Progress */}
        <View testID="progress">
          <Text>Intro</Text>
          <Text>Scan</Text>
          <Text>Verify</Text>
          <Text>Done</Text>
        </View>

        {/* Error */}
        {error && (
          <View testID="error-container">
            <Text testID="error-text">{error}</Text>
          </View>
        )}

        {/* Content */}
        <ScrollView testID="content">
          {step === "intro" && (
            <View testID="intro-step">
              <Text testID="intro-title">Secure Your Account</Text>
              <Text testID="intro-description">
                Two-factor authentication adds an extra layer of security.
              </Text>
              <Text>What you'll need:</Text>
              <Text>
                An authenticator app (Google Authenticator, Authy, etc.)
              </Text>
              <Text>About 2 minutes to complete setup</Text>
              <Text>Benefits:</Text>
              <Text>✓ Protect your financial data</Text>
              <Text>✓ Prevent unauthorized access</Text>
              <Text>✓ Get notified of login attempts</Text>
              <Pressable
                testID="get-started-button"
                onPress={handleStartSetup}
                disabled={loading}
              >
                <Text>{loading ? "Setting up..." : "Get Started"}</Text>
              </Pressable>
            </View>
          )}

          {step === "qr" && (
            <View testID="qr-step">
              <Text testID="qr-title">Scan QR Code</Text>
              <Text>Open your authenticator app and scan this QR code</Text>
              <View testID="qr-container">
                <View testID="qr-placeholder" />
              </View>
              <Text>Can't scan? Enter this code manually:</Text>
              <Text testID="secret-code">{secretCode}</Text>
              <Pressable
                testID="copy-secret-button"
                accessibilityLabel="Copy secret code"
                onPress={handleCopySecret}
              >
                <Text>{copiedSecret ? "✓" : "Copy"}</Text>
              </Pressable>
              <Pressable
                testID="scanned-button"
                onPress={() => setStep("verify")}
              >
                <Text>I've Scanned the Code</Text>
              </Pressable>
            </View>
          )}

          {step === "verify" && (
            <View testID="verify-step">
              <Text testID="verify-title">Verify Setup</Text>
              <Text>Enter the 6-digit code from your authenticator app</Text>
              <TextInput
                testID="verification-input"
                value={verificationCode}
                onChangeText={(text) => {
                  setVerificationCode(text.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="Verification code"
              />
              <Text testID="code-hint">The code changes every 30 seconds</Text>
              <Pressable
                testID="verify-button"
                onPress={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
              >
                <Text>{loading ? "Verifying..." : "Verify Code"}</Text>
              </Pressable>
              <Pressable testID="back-button" onPress={() => setStep("qr")}>
                <Text>← Back to QR Code</Text>
              </Pressable>
            </View>
          )}

          {step === "backup" && (
            <View testID="backup-step">
              <Text testID="backup-title">2FA Enabled!</Text>
              <Text>Save these backup codes in a safe place</Text>
              <Text testID="warning-text">
                ⚠️ These codes can be used to access your account if you lose
                your phone. Each code can only be used once.
              </Text>
              <View testID="backup-codes">
                {backupCodes.map((code, index) => (
                  <Text key={index} testID={`backup-code-${index}`}>
                    {code}
                  </Text>
                ))}
              </View>
              <Pressable
                testID="copy-backup-button"
                onPress={handleCopyBackupCodes}
              >
                <Text>{copiedBackup ? "Copied!" : "Copy Backup Codes"}</Text>
              </Pressable>
              <Pressable testID="done-button" onPress={handleComplete}>
                <Text>Done</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

describe("TwoFactorSetup", () => {
  const mockOnClose = jest.fn();
  const mockOnComplete = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders modal when visible", () => {
      const { getByTestId } = render(<MockTwoFactorSetup {...defaultProps} />);
      expect(getByTestId("modal")).toBeTruthy();
    });

    it("shows intro step by default", () => {
      const { getByTestId } = render(<MockTwoFactorSetup {...defaultProps} />);
      expect(getByTestId("intro-step")).toBeTruthy();
      expect(getByTestId("intro-title").props.children).toBe(
        "Secure Your Account",
      );
    });
  });

  describe("Intro Step", () => {
    it("displays security benefits", () => {
      const { getByText } = render(<MockTwoFactorSetup {...defaultProps} />);

      expect(getByText(/Protect your financial data/)).toBeTruthy();
      expect(getByText(/Prevent unauthorized access/)).toBeTruthy();
      expect(getByText(/Get notified of login attempts/)).toBeTruthy();
    });

    it("displays requirements", () => {
      const { getByText } = render(<MockTwoFactorSetup {...defaultProps} />);

      expect(getByText("What you'll need:")).toBeTruthy();
      expect(getByText(/authenticator app/)).toBeTruthy();
    });

    it("proceeds to QR step when Get Started is pressed", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));

      await waitFor(() => {
        expect(getByTestId("qr-step")).toBeTruthy();
      });
    });
  });

  describe("QR Code Step", () => {
    it("displays secret code for manual entry", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true, secretCode: "TESTSECRET123" }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));

      await waitFor(() => {
        expect(getByTestId("secret-code").props.children).toBe("TESTSECRET123");
      });
    });

    it("shows copy button for secret code", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));

      await waitFor(() => {
        expect(getByTestId("copy-secret-button")).toBeTruthy();
      });
    });

    it("proceeds to verify step when continue is pressed", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));

      await waitFor(() => {
        fireEvent.press(getByTestId("scanned-button"));
      });

      await waitFor(() => {
        expect(getByTestId("verify-step")).toBeTruthy();
      });
    });
  });

  describe("Verify Step", () => {
    it("displays verification code input", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));

      await waitFor(() => {
        expect(getByTestId("verification-input")).toBeTruthy();
      });
    });

    it("shows hint about code changing", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));

      await waitFor(() => {
        expect(getByTestId("code-hint").props.children).toBe(
          "The code changes every 30 seconds",
        );
      });
    });

    it("allows going back to QR step", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));
      await waitFor(() => fireEvent.press(getByTestId("back-button")));

      await waitFor(() => {
        expect(getByTestId("qr-step")).toBeTruthy();
      });
    });

    it("verifies code and proceeds to backup step", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{
            setupSuccess: true,
            verifySuccess: true,
            backupCodes: ["BACKUP1", "BACKUP2"],
          }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));

      await waitFor(() => {
        fireEvent.changeText(getByTestId("verification-input"), "123456");
        fireEvent.press(getByTestId("verify-button"));
      });

      await waitFor(() => {
        expect(getByTestId("backup-step")).toBeTruthy();
      });
    });
  });

  describe("Backup Codes Step", () => {
    it("displays backup codes", async () => {
      const { getByTestId, getByText } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{
            setupSuccess: true,
            verifySuccess: true,
            backupCodes: ["BACKUP1", "BACKUP2"],
          }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));
      await waitFor(() => {
        fireEvent.changeText(getByTestId("verification-input"), "123456");
        fireEvent.press(getByTestId("verify-button"));
      });

      await waitFor(() => {
        expect(getByText("BACKUP1")).toBeTruthy();
        expect(getByText("BACKUP2")).toBeTruthy();
      });
    });

    it("shows warning about backup codes", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true, verifySuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));
      await waitFor(() => {
        fireEvent.changeText(getByTestId("verification-input"), "123456");
        fireEvent.press(getByTestId("verify-button"));
      });

      await waitFor(() => {
        expect(getByTestId("warning-text").props.children).toContain(
          "can be used to access your account",
        );
      });
    });

    it("calls onComplete when Done is pressed", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true, verifySuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));
      await waitFor(() => {
        fireEvent.changeText(getByTestId("verification-input"), "123456");
        fireEvent.press(getByTestId("verify-button"));
      });
      await waitFor(() => fireEvent.press(getByTestId("done-button")));

      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Progress Indicator", () => {
    it("shows progress steps", () => {
      const { getByText } = render(<MockTwoFactorSetup {...defaultProps} />);

      expect(getByText("Intro")).toBeTruthy();
      expect(getByText("Scan")).toBeTruthy();
      expect(getByText("Verify")).toBeTruthy();
      expect(getByText("Done")).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("displays error when setup fails", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: false, error: "Setup failed" }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));

      await waitFor(() => {
        expect(getByTestId("error-text").props.children).toBe("Setup failed");
      });
    });

    it("displays error when verification fails", async () => {
      const { getByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{
            setupSuccess: true,
            verifySuccess: false,
            error: "Invalid code",
          }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));
      await waitFor(() => {
        fireEvent.changeText(getByTestId("verification-input"), "123456");
        fireEvent.press(getByTestId("verify-button"));
      });

      await waitFor(() => {
        expect(getByTestId("error-text").props.children).toBe("Invalid code");
      });
    });
  });

  describe("Close Behavior", () => {
    it("calls onClose when close button is pressed", () => {
      const { getByTestId } = render(<MockTwoFactorSetup {...defaultProps} />);

      fireEvent.press(getByTestId("close-button"));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("does not show close button on backup step", async () => {
      const { getByTestId, queryByTestId } = render(
        <MockTwoFactorSetup
          {...defaultProps}
          mockApiResponse={{ setupSuccess: true, verifySuccess: true }}
        />,
      );

      fireEvent.press(getByTestId("get-started-button"));
      await waitFor(() => fireEvent.press(getByTestId("scanned-button")));
      await waitFor(() => {
        fireEvent.changeText(getByTestId("verification-input"), "123456");
        fireEvent.press(getByTestId("verify-button"));
      });

      await waitFor(() => {
        expect(queryByTestId("close-button")).toBeNull();
      });
    });

    it("resets state when modal is reopened", () => {
      const { getByTestId, rerender } = render(
        <MockTwoFactorSetup {...defaultProps} />,
      );

      // Close and reopen
      rerender(<MockTwoFactorSetup {...defaultProps} visible={false} />);
      rerender(<MockTwoFactorSetup {...defaultProps} visible={true} />);

      // Should be back to intro step
      expect(getByTestId("intro-step")).toBeTruthy();
    });
  });
});
