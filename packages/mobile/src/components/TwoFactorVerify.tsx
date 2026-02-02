/**
 * TwoFactorVerify Component
 *
 * Displays during login when MFA is required.
 * Features:
 * - 6-digit code input with auto-submit
 * - Backup code option
 * - Error handling
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";
import { Button } from "./ui";

interface TwoFactorVerifyProps {
  onVerify: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export default function TwoFactorVerify({
  onVerify,
  onCancel,
  loading = false,
  error = null,
}: TwoFactorVerifyProps) {
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [useBackupCode]);

  // Auto-submit when 6 digits entered (for TOTP codes)
  useEffect(() => {
    if (!useBackupCode && code.length === 6 && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onVerify(code, false);
    }
  }, [code, useBackupCode, loading, onVerify]);

  const handleCodeChange = useCallback(
    (value: string) => {
      if (useBackupCode) {
        // Backup codes can have different formats
        setCode(value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
      } else {
        // TOTP codes are numeric only
        setCode(value.replace(/\D/g, "").slice(0, 6));
      }
    },
    [useBackupCode],
  );

  const handleSubmit = useCallback(() => {
    if (code && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onVerify(code, useBackupCode);
    }
  }, [code, loading, onVerify, useBackupCode]);

  const toggleBackupCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUseBackupCode(!useBackupCode);
    setCode("");
  }, [useBackupCode]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Two-Factor Authentication
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {useBackupCode
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </Text>

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

          {useBackupCode ? (
            <View style={styles.inputContainer}>
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Backup Code
              </Text>
              <TextInput
                ref={inputRef}
                style={[
                  styles.backupInput,
                  {
                    borderColor: error ? colors.error : colors.border,
                    color: colors.text,
                  },
                ]}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="XXXX-XXXX-XXXX"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
                accessibilityLabel="Backup code"
              />
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Verification Code
              </Text>
              <TextInput
                ref={inputRef}
                style={[
                  styles.codeInput,
                  {
                    borderColor: error ? colors.error : colors.border,
                    color: colors.text,
                  },
                ]}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
                accessibilityLabel="Verification code"
              />
              <Text style={[styles.codeHint, { color: colors.textSecondary }]}>
                Code refreshes every 30 seconds
              </Text>
            </View>
          )}

          <Button
            title={loading ? "Verifying..." : "Verify"}
            onPress={handleSubmit}
            disabled={loading || !code}
            style={styles.verifyButton}
          />

          <View style={[styles.divider, { borderTopColor: colors.border }]}>
            <Pressable onPress={toggleBackupCode} disabled={loading}>
              <Text style={[styles.toggleText, { color: colors.primary }]}>
                {useBackupCode
                  ? "Use authenticator app instead"
                  : "Use a backup code instead"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onCancel}
            disabled={loading}
            style={styles.cancelButton}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel and sign in with a different account
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  codeInput: {
    width: "100%",
    fontSize: 32,
    textAlign: "center",
    letterSpacing: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 12,
  },
  backupInput: {
    width: "100%",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 2,
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 12,
    fontFamily: "monospace",
  },
  codeHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  verifyButton: {
    width: "100%",
    marginTop: 8,
  },
  divider: {
    width: "100%",
    borderTopWidth: 1,
    marginTop: 24,
    paddingTop: 16,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 16,
    padding: 8,
  },
  cancelText: {
    fontSize: 14,
    textAlign: "center",
  },
});
