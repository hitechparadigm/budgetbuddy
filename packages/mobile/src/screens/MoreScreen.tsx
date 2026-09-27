/**
 * More Screen - Hub for features that don't have their own bottom tab
 *
 * Links out to Bills, Insights, Accounts (BankSync), Credit Score, Debt Payoff,
 * Investments, Net Worth, Subscriptions, Tips, Sync Settings, Offline Settings,
 * and Settings - all of which existed as fully-built screens with zero navigator
 * routes before this change (see .kiro/specs/mobile-app/tasks.md task 6.4).
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Card } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { MoreStackParamList } from "../navigation/RootNavigator";

interface MoreMenuItem {
  id: keyof MoreStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MENU_SECTIONS: { title: string; items: MoreMenuItem[] }[] = [
  {
    title: "Money",
    items: [
      { id: "Bills", title: "Bills", subtitle: "Upcoming and recurring bills", icon: "receipt-outline" },
      { id: "BankSync", title: "Accounts", subtitle: "Linked bank accounts", icon: "card-outline" },
      { id: "Subscriptions", title: "Subscriptions", subtitle: "Recurring subscriptions", icon: "repeat-outline" },
      { id: "DebtPayoff", title: "Debt Payoff", subtitle: "Snowball and avalanche plans", icon: "trending-down-outline" },
    ],
  },
  {
    title: "Insights",
    items: [
      { id: "Insights", title: "Insights", subtitle: "AI spending insights and coach", icon: "star-outline" },
      { id: "NetWorth", title: "Net Worth", subtitle: "Assets minus liabilities over time", icon: "bar-chart-outline" },
      { id: "CreditScore", title: "Credit Score", subtitle: "Score tracking and factors", icon: "shield-checkmark-outline" },
      { id: "Investments", title: "Investments", subtitle: "Portfolio tracking", icon: "trending-up-outline" },
      { id: "Tips", title: "Tips", subtitle: "Budgeting tips and articles", icon: "bulb-outline" },
    ],
  },
  {
    title: "App",
    items: [
      { id: "SyncSettings", title: "Sync Settings", subtitle: "Manual sync and sync status", icon: "sync-outline" },
      { id: "OfflineSettings", title: "Offline Settings", subtitle: "Offline queue and cache", icon: "cloud-offline-outline" },
      { id: "Settings", title: "Settings", subtitle: "Account, security, data, and preferences", icon: "settings-outline" },
    ],
  },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<MoreStackParamList>>();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>More</Text>
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
            <Card style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  <Pressable
                    style={styles.item}
                    onPress={() => navigation.navigate(item.id as any)}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: colors.primary + "1A" }]}>
                      <Ionicons name={item.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Pressable>
                  {index < section.items.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionCard: {
      padding: 0,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      minHeight: 44,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 2,
    },
    itemSubtitle: {
      fontSize: 13,
    },
    separator: {
      height: 1,
      marginLeft: 64,
    },
  });