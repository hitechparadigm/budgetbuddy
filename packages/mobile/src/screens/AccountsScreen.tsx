/**
 * Accounts screen (More -> Accounts)
 *
 * Read-only list of the budget's accounts from GET /accounts on the main
 * gateway, including the Cash account onboarding creates. Linking banks is a
 * separate screen (Bank Sync).
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { useCurrency } from "../contexts/CurrencyContext";
import { Account, useAccounts } from "../services/accounts";

const ACCOUNT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: "cash-outline",
  banking: "business-outline",
  credit_card: "card-outline",
  investment: "trending-up-outline",
  loan: "document-text-outline",
};

/** Credit cards and loans are debts; show them as negative, like the web's AccountCard. */
const isLiability = (accountType: string) =>
  accountType === "credit_card" || accountType === "loan";

export default function AccountsScreen() {
  const { colors } = useTheme();
  const { formatAmountWithCurrency } = useCurrency();
  const { data: accounts = [], isLoading, error, refetch } = useAccounts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    list: { padding: 16 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    info: { flex: 1 },
    nickname: { fontSize: 16, fontWeight: "600", color: colors.text },
    institution: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    balance: { fontSize: 16, fontWeight: "600", color: colors.text },
    negative: { color: colors.error },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: "center",
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
  });

  const renderAccount = ({ item }: { item: Account }) => {
    const balance = Number(item.currentBalance) || 0;
    const displayBalance = isLiability(item.accountType)
      ? -Math.abs(balance)
      : balance;
    return (
      <View style={styles.row} testID={`account-${item.accountId}`}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={ACCOUNT_ICONS[item.accountType] ?? "wallet-outline"}
            size={22}
            color={colors.primary}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.nickname}>{item.nickname}</Text>
          {item.institutionName ? (
            <Text style={styles.institution}>{item.institutionName}</Text>
          ) : null}
        </View>
        <Text style={[styles.balance, displayBalance < 0 && styles.negative]}>
          {formatAmountWithCurrency(displayBalance, item.currency)}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <LoadingSpinner size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {error instanceof Error && error.message
              ? error.message
              : "Failed to load accounts."}
          </Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.accountId}
        renderItem={renderAccount}
        contentContainerStyle={accounts.length === 0 ? styles.centered : styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No accounts yet. Accounts you add on the web appear here.
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}
