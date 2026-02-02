/**
 * Bank Sync Screen
 *
 * Mobile screen for managing bank account connections via Plaid.
 * Allows users to connect accounts, view balances, sync transactions,
 * and approve pending imports.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import {
  LinkedAccount,
  PendingTransaction,
  getLinkedAccounts,
  getPendingTransactions,
  syncAllTransactions,
  syncAccountTransactions,
  unlinkAccount,
  approvePendingTransactions,
  rejectPendingTransactions,
  createSandboxItem,
  createLinkToken,
  openPlaidLink,
} from "../services/plaid";

// Common budget categories
const CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Transportation",
  "Gas & Fuel",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Personal Care",
  "Other",
];

export const BankSyncScreen: React.FC = () => {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedPending, setSelectedPending] = useState<Set<string>>(
    new Set(),
  );
  const [activeTab, setActiveTab] = useState<"accounts" | "pending">(
    "accounts",
  );
  const currency = "USD";

  const loadData = useCallback(async () => {
    try {
      const [accountsData, pendingData] = await Promise.all([
        getLinkedAccounts(),
        getPendingTransactions(),
      ]);
      setAccounts(accountsData);
      setPendingTransactions(pendingData);
      setSelectedPending(new Set(pendingData.map((t) => t.pendingId)));
    } catch (error) {
      console.error("Failed to load data:", error);
      Alert.alert("Error", "Failed to load bank data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleConnectBank = async () => {
    try {
      setConnecting(true);
      const { linkToken } = await createLinkToken();
      await openPlaidLink(linkToken);
      // Reload data after returning from Plaid Link
      await loadData();
    } catch (error) {
      console.error("Failed to connect bank:", error);
      Alert.alert("Error", "Failed to connect bank account");
    } finally {
      setConnecting(false);
    }
  };

  const handleCreateSandbox = async () => {
    try {
      setConnecting(true);
      await createSandboxItem();
      Alert.alert("Success", "Sandbox account created!");
      await loadData();
    } catch (error) {
      console.error("Failed to create sandbox:", error);
      Alert.alert("Error", "Failed to create sandbox account");
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      await syncAllTransactions();
      await loadData();
      Alert.alert("Success", "Transactions synced!");
    } catch (error) {
      console.error("Failed to sync:", error);
      Alert.alert("Error", "Failed to sync transactions");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    try {
      setSyncing(true);
      await syncAccountTransactions(accountId);
      await loadData();
    } catch (error) {
      console.error("Failed to sync account:", error);
      Alert.alert("Error", "Failed to sync account");
    } finally {
      setSyncing(false);
    }
  };

  const handleUnlinkAccount = (accountId: string, accountName: string) => {
    Alert.alert(
      "Unlink Account",
      `Are you sure you want to unlink ${accountName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            try {
              await unlinkAccount(accountId);
              await loadData();
            } catch (error) {
              Alert.alert("Error", "Failed to unlink account");
            }
          },
        },
      ],
    );
  };

  const togglePendingSelection = (pendingId: string) => {
    const newSelected = new Set(selectedPending);
    if (newSelected.has(pendingId)) {
      newSelected.delete(pendingId);
    } else {
      newSelected.add(pendingId);
    }
    setSelectedPending(newSelected);
  };

  const handleApproveSelected = async () => {
    if (selectedPending.size === 0) return;

    try {
      setSyncing(true);
      await approvePendingTransactions(Array.from(selectedPending));
      await loadData();
      Alert.alert("Success", "Transactions approved!");
    } catch (error) {
      console.error("Failed to approve:", error);
      Alert.alert("Error", "Failed to approve transactions");
    } finally {
      setSyncing(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedPending.size === 0) return;

    Alert.alert(
      "Reject Transactions",
      `Reject ${selectedPending.size} transaction(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              setSyncing(true);
              await rejectPendingTransactions(Array.from(selectedPending));
              await loadData();
            } catch (error) {
              Alert.alert("Error", "Failed to reject transactions");
            } finally {
              setSyncing(false);
            }
          },
        },
      ],
    );
  };

  const formatLastSynced = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "depository":
        return "🏦";
      case "credit":
        return "💳";
      case "loan":
        return "📋";
      case "investment":
        return "📈";
      default:
        return "💰";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading bank data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏦 Bank Sync</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncAll}
            disabled={syncing || accounts.length === 0}
          >
            <Text style={styles.syncButtonText}>
              {syncing ? "⏳" : "🔄"} Sync
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnectBank}
            disabled={connecting}
          >
            <Text style={styles.connectButtonText}>
              {connecting ? "..." : "+ Connect"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "accounts" && styles.activeTab]}
          onPress={() => setActiveTab("accounts")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "accounts" && styles.activeTabText,
            ]}
          >
            Accounts ({accounts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.activeTabText,
            ]}
          >
            Pending ({pendingTransactions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === "accounts" ? (
          <>
            {/* Accounts List */}
            {accounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏦</Text>
                <Text style={styles.emptyTitle}>No accounts connected</Text>
                <Text style={styles.emptySubtitle}>
                  Connect your bank to import transactions automatically
                </Text>
                <TouchableOpacity
                  style={styles.sandboxButton}
                  onPress={handleCreateSandbox}
                  disabled={connecting}
                >
                  <Text style={styles.sandboxButtonText}>
                    🧪 Create Test Account
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              accounts.map((account) => (
                <View key={account.accountId} style={styles.accountCard}>
                  <View style={styles.accountHeader}>
                    <Text style={styles.accountIcon}>
                      {getAccountIcon(account.accountType)}
                    </Text>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>
                        {account.accountName}
                      </Text>
                      <Text style={styles.accountInstitution}>
                        {account.institutionName} •••• {account.mask}
                      </Text>
                      <Text style={styles.lastSynced}>
                        Last synced: {formatLastSynced(account.lastSynced)}
                      </Text>
                    </View>
                    <Text style={styles.accountBalance}>
                      {formatCurrency(account.currentBalance, currency)}
                    </Text>
                  </View>
                  <View style={styles.accountActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSyncAccount(account.accountId)}
                    >
                      <Text style={styles.actionButtonText}>Sync</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.unlinkButton]}
                      onPress={() =>
                        handleUnlinkAccount(
                          account.accountId,
                          account.accountName,
                        )
                      }
                    >
                      <Text style={styles.unlinkButtonText}>Unlink</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {/* Pending Transactions */}
            {pendingTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>No pending transactions</Text>
                <Text style={styles.emptySubtitle}>
                  All imported transactions have been processed
                </Text>
              </View>
            ) : (
              <>
                {/* Bulk Actions */}
                <View style={styles.bulkActions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={handleRejectSelected}
                    disabled={selectedPending.size === 0 || syncing}
                  >
                    <Text style={styles.rejectButtonText}>
                      ✗ Reject ({selectedPending.size})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={handleApproveSelected}
                    disabled={selectedPending.size === 0 || syncing}
                  >
                    <Text style={styles.approveButtonText}>
                      ✓ Approve ({selectedPending.size})
                    </Text>
                  </TouchableOpacity>
                </View>

                {pendingTransactions.map((transaction) => (
                  <TouchableOpacity
                    key={transaction.pendingId}
                    style={[
                      styles.transactionCard,
                      selectedPending.has(transaction.pendingId) &&
                        styles.selectedTransaction,
                    ]}
                    onPress={() =>
                      togglePendingSelection(transaction.pendingId)
                    }
                  >
                    <View style={styles.checkbox}>
                      <Text>
                        {selectedPending.has(transaction.pendingId) ? "☑" : "☐"}
                      </Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionMerchant}>
                        {transaction.merchantName || transaction.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.date).toLocaleDateString()} •{" "}
                        {transaction.institutionName}
                      </Text>
                      {transaction.suggestedCategory && (
                        <Text style={styles.suggestedCategory}>
                          Suggested: {transaction.suggestedCategory}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.amount < 0 && styles.incomeAmount,
                      ]}
                    >
                      {transaction.amount < 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(transaction.amount), currency)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  syncButtonText: {
    color: "#374151",
    fontWeight: "500",
  },
  connectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#2563eb",
    borderRadius: 8,
  },
  connectButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  tabText: {
    color: "#6b7280",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2563eb",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  sandboxButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
  },
  sandboxButtonText: {
    color: "#92400e",
    fontWeight: "600",
  },
  accountCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  accountIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  accountInstitution: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  lastSynced: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  accountActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  actionButtonText: {
    color: "#374151",
    fontSize: 14,
  },
  unlinkButton: {
    backgroundColor: "transparent",
  },
  unlinkButtonText: {
    color: "#dc2626",
    fontSize: 14,
  },
  bulkActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
    gap: 8,
  },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 8,
  },
  rejectButtonText: {
    color: "#dc2626",
    fontWeight: "500",
  },
  approveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#16a34a",
    borderRadius: 8,
  },
  approveButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  selectedTransaction: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  checkbox: {
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  transactionDate: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  suggestedCategory: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  incomeAmount: {
    color: "#16a34a",
  },
});

export default BankSyncScreen;
