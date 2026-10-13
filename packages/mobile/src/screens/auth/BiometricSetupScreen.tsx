/**
 * Biometric Setup Screen
 *
 * Lets the user turn Face ID / Touch ID / fingerprint unlock on or off.
 * Reachable from Settings > Security ("Biometric Authentication" row) via
 * the More tab stack. This only toggles a local app-unlock convenience
 * layer - it does not change the Cognito session or sign-in flow itself.
 */

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Switch, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui";
import { useTheme } from "../../hooks/useTheme";
import {
  getAvailability,
  isEnabled,
  setEnabled,
  authenticate,
  BiometricAvailability,
} from "../../services/biometric";

export default function BiometricSetupScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [enabled, setEnabledState] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [avail, pref] = await Promise.all([getAvailability(), isEnabled()]);
      setAvailability(avail);
      // If the device no longer has biometrics enrolled (e.g. the user
      // removed their fingerprint in OS settings), reflect that rather than
      // showing an "on" toggle the device can no longer honor.
      setEnabledState(pref && avail.isAvailable);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggle = async (value: boolean) => {
    if (!availability?.isAvailable) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value) {
      // Require a successful biometric check before turning the setting on,
      // so the user confirms it actually works on this device before relying
      // on it.
      setWorking(true);
      const success = await authenticate(`Confirm ${availability.typeLabel} to enable unlock`);
      setWorking(false);

      if (!success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      await setEnabled(true);
      setEnabledState(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await setEnabled(false);
      setEnabledState(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const unavailableReason = !availability?.hasHardware
    ? "This device has no fingerprint or face scanner."
    : !availability?.isEnrolled
      ? "No fingerprint or face data is enrolled in your device settings yet."
      : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + "1A" }]}>
              <Ionicons
                name={availability?.typeLabel === "Face ID" ? "scan-outline" : "finger-print-outline"}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.title, { color: colors.text }]}>
                {availability?.typeLabel && availability.typeLabel !== "None"
                  ? availability.typeLabel
                  : "Biometric Unlock"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Use your device's biometrics to unlock BudgetBuddy
              </Text>
            </View>
            {working ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                disabled={!availability?.isAvailable}
                accessibilityLabel="Toggle biometric unlock"
              />
            )}
          </View>
        </Card>

        {unavailableReason && (
          <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
            {unavailableReason}
          </Text>
        )}

        <Text style={[styles.note, { color: colors.textSecondary }]}>
          This only controls whether BudgetBuddy asks for a quick biometric check when you open
          the app. It does not replace your account password, and you can always sign in with
          your email and password instead.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  card: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 13, marginTop: 2 },
  unavailableText: { fontSize: 13, marginTop: 12, paddingHorizontal: 4 },
  note: { fontSize: 12, marginTop: 24, lineHeight: 18, paddingHorizontal: 4 },
});