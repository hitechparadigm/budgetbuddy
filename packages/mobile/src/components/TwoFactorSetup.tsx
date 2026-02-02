/**
 * TwoFactorSetup Component
 *
 * Step-by-step wizard for setting up two-factor authentication on mobile:
 * 1. Introduction - Explain 2FA benefits
 * 2. QR Code - Display QR code for authenticator app
 * 3. Verify - Enter code to verify setup
 * 4. Backup Codes - Display and save backup codes
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

type SetupStep = "intro" | "qr" | "verify" | "backup";

interface MFASetupData {
  secretCode: string;
  qrCodeUrl: string;
}

interface TwoFactorSetupProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function TwoFactorSetup({
  visible,
  onClose,
  onComplete,
}: TwoFactorSetupProps) {
  const { colors } = useTheme();
  const { tokens } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<SetupStep>("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaData, setMfaData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep("intro");
      setError(null);
      setMfaData(null);
      setVerificationCode("");
      setBackupCodes([]);
      setCopiedSecret(false);
      setCopiedBackup(false);
    }
  }, [visible]);

  const handleStartSetup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!tokens?.idToken) {
        setError("Please log in to continue");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/mfa/setup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.idToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to start MFA setup");
      }

      const data = await response.json();
      setMfaData({
        secretCode: data.data?.secretCode || data.secretCode,
        qrCodeUrl: data.data?.qrCodeUrl || data.qrCodeUrl,
      });
      setStep("qr");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Error starting MFA setup:", err);
      setError(err instanceof Error ? err.message : "Failed to start setup");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  const handleVerifyCode = useCallback(async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!tokens?.idToken) {
        setError("Please log in to continue");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/mfa/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Invalid verification code");
      }

      const data = await response.json();
      setBackupCodes(data.data?.backupCodes || data.backupCodes || []);
      setStep("backup");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Error verifying MFA code:", err);
      setError(err instanceof Error ? err.message : "Verification failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [tokens, verificationCode]);

  const handleCopySecret = useCallback(async () => {
    if (mfaData?.secretCode) {
      await Clipboard.setStringAsync(mfaData.secretCode);
      setCopiedSecret(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  }, [mfaData]);

  const handleCopyBackupCodes = useCallback(async () => {
    const codesText = backupCodes.join("\n");
    await Clipboard.setStringAsync(codesText);
    setCopiedBackup(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopiedBackup(false), 2000);
  }, [backupCodes]);

  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
    onClose();
  }, [onComplete, onClose]);

  const getStepIndex = (s: SetupStep): number => {
    const steps: SetupStep[] = ["intro", "qr", "verify", "backup"];
    return steps.indexOf(s);
  };

  const renderIntroStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepIcon}>🔐</Text>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Secure Your Account
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Two-factor authentication adds an extra layer of security. You'll need
        your phone to sign in.
      </Text>

      <View
        style={[styles.infoBox, { backgroundColor: colors.primary + "15" }]}
      >
        <Text style={[styles.infoTitle, { color: colors.primary }]}>
          What you'll need:
        </Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>📱</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            An authenticator app (Google Authenticator, Authy, etc.)
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>⏱️</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            About 2 minutes to complete setup
          </Text>
        </View>
      </View>

      <View
        style={[styles.infoBox, { backgroundColor: colors.success + "15" }]}
      >
        <Text style={[styles.infoTitle, { color: colors.success }]}>
          Benefits:
        </Text>
        <Text style={[styles.benefitItem, { color: colors.text }]}>
          ✓ Protect your financial data
        </Text>
        <Text style={[styles.benefitItem, { color: colors.text }]}>
          ✓ Prevent unauthorized access
        </Text>
        <Text style={[styles.benefitItem, { color: colors.text }]}>
          ✓ Get notified of login attempts
        </Text>
      </View>

      <Button
        title={loading ? "Setting up..." : "Get Started"}
        onPress={handleStartSetup}
        disabled={loading}
        style={styles.primaryButton}
      />
    </View>
  );

  const renderQRStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Scan QR Code
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Open your authenticator app and scan this QR code
      </Text>

      {mfaData && (
        <>
          <View style={[styles.qrContainer, { borderColor: colors.border }]}>
            <Image
              source={{ uri: mfaData.qrCodeUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.secretBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.secretLabel, { color: colors.textSecondary }]}>
              Can't scan? Enter this code manually:
            </Text>
            <View style={styles.secretRow}>
              <Text
                style={[styles.secretCode, { color: colors.text }]}
                selectable
              >
                {mfaData.secretCode}
              </Text>
              <Pressable
                onPress={handleCopySecret}
                style={[
                  styles.copyButton,
                  { backgroundColor: colors.primary + "15" },
                ]}
                accessibilityLabel="Copy secret code"
              >
                <Ionicons
                  name={copiedSecret ? "checkmark" : "copy-outline"}
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          </View>
        </>
      )}

      <Button
        title="I've Scanned the Code"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setStep("verify");
        }}
        style={styles.primaryButton}
      />
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Verify Setup
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Enter the 6-digit code from your authenticator app
      </Text>

      <TextInput
        style={[
          styles.codeInput,
          {
            borderColor: error ? colors.error : colors.border,
            color: colors.text,
          },
        ]}
        value={verificationCode}
        onChangeText={(text) => {
          setVerificationCode(text.replace(/\D/g, "").slice(0, 6));
          setError(null);
        }}
        placeholder="000000"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        accessibilityLabel="Verification code"
      />
      <Text style={[styles.codeHint, { color: colors.textSecondary }]}>
        The code changes every 30 seconds
      </Text>

      <Button
        title={loading ? "Verifying..." : "Verify Code"}
        onPress={handleVerifyCode}
        disabled={loading || verificationCode.length !== 6}
        style={styles.primaryButton}
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setStep("qr");
        }}
        style={styles.backButton}
      >
        <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
          ← Back to QR Code
        </Text>
      </Pressable>
    </View>
  );

  const renderBackupStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepIcon}>✅</Text>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        2FA Enabled!
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Save these backup codes in a safe place
      </Text>

      <View
        style={[styles.warningBox, { backgroundColor: colors.warning + "15" }]}
      >
        <Text style={[styles.warningText, { color: colors.warning }]}>
          ⚠️ These codes can be used to access your account if you lose your
          phone. Each code can only be used once.
        </Text>
      </View>

      <View style={[styles.codesGrid, { backgroundColor: colors.surface }]}>
        {backupCodes.map((code, index) => (
          <View
            key={index}
            style={[styles.codeBox, { borderColor: colors.border }]}
          >
            <Text style={[styles.backupCode, { color: colors.text }]}>
              {code}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={handleCopyBackupCodes}
        style={[styles.copyCodesButton, { borderColor: colors.border }]}
      >
        <Ionicons
          name={copiedBackup ? "checkmark" : "copy-outline"}
          size={20}
          color={colors.text}
        />
        <Text style={[styles.copyCodesText, { color: colors.text }]}>
          {copiedBackup ? "Copied!" : "Copy Backup Codes"}
        </Text>
      </Pressable>

      <Button
        title="Done"
        onPress={handleComplete}
        style={[styles.primaryButton, { backgroundColor: colors.success }]}
      />
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case "intro":
        return renderIntroStep();
      case "qr":
        return renderQRStep();
      case "verify":
        return renderVerifyStep();
      case "backup":
        return renderBackupStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={step !== "backup" ? onClose : undefined}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>🔐</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Two-Factor Authentication
            </Text>
          </View>
          {step !== "backup" && (
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSteps}>
            {(["intro", "qr", "verify", "backup"] as SetupStep[]).map(
              (s, index) => (
                <React.Fragment key={s}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          getStepIndex(step) > index
                            ? colors.success
                            : step === s
                              ? colors.primary
                              : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.progressDotText}>
                      {getStepIndex(step) > index ? "✓" : index + 1}
                    </Text>
                  </View>
                  {index < 3 && (
                    <View
                      style={[
                        styles.progressLine,
                        {
                          backgroundColor:
                            getStepIndex(step) > index
                              ? colors.success
                              : colors.border,
                        },
                      ]}
                    />
                  )}
                </React.Fragment>
              ),
            )}
          </View>
          <View style={styles.progressLabels}>
            <Text
              style={[styles.progressLabel, { color: colors.textSecondary }]}
            >
              Intro
            </Text>
            <Text
              style={[styles.progressLabel, { color: colors.textSecondary }]}
            >
              Scan
            </Text>
            <Text
              style={[styles.progressLabel, { color: colors.textSecondary }]}
            >
              Verify
            </Text>
            <Text
              style={[styles.progressLabel, { color: colors.textSecondary }]}
            >
              Done
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: colors.error + "15" },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  progressLabel: {
    fontSize: 11,
    textAlign: "center",
    width: 40,
  },
  errorContainer: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  stepContent: {
    alignItems: "center",
  },
  stepIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  infoBox: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  infoEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  benefitItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  primaryButton: {
    width: "100%",
    marginTop: 16,
  },
  qrContainer: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  secretBox: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  secretLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  secretRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secretCode: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 14,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
  },
  codeInput: {
    width: "100%",
    fontSize: 32,
    textAlign: "center",
    letterSpacing: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 8,
  },
  codeHint: {
    fontSize: 12,
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 14,
  },
  warningBox: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  codesGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  codeBox: {
    width: "48%",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
  backupCode: {
    fontFamily: "monospace",
    fontSize: 14,
  },
  copyCodesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  copyCodesText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
