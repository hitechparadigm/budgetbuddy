/**
 * Investments Screen
 *
 * Displays investment portfolio tracking with holdings, performance, and allocation.
 * Features:
 * - Portfolio overview with total value, gain/loss, and day change
 * - Holdings list with CRUD operations
 * - Asset allocation by account type
 * - Pull-to-refresh
 *
 * **Validates: Requirement 45**
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  investmentsService,
  PortfolioSummary,
  Holding,
  CreateHoldingRequest,
  UpdateHoldingRequest,
} from "../services/investments";

const ACCOUNT_TYPES = [
  { value: "brokerage", label: "Brokerage" },
  { value: "401k", label: "401(k)" },
  { value: "ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "hsa", label: "HSA" },
  { value: "crypto", label: "Cryptocurrency" },
];

export const InvestmentsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showHoldingModal, setShowHoldingModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  // Form state
  const [holdingForm, setHoldingForm] = useState<CreateHoldingRequest>({
    symbol: "",
    name: "",
    shares: 0,
    costBasis: 0,
    currentPrice: 0,
    accountType: "brokerage",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const portfolioData = await investmentsService.getPortfolio();
      setPortfolio(portfolioData);
    } catch (err: any) {
      console.error("Error loading portfolio:", err);
      setError(err.message || "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getAccountTypeLabel = (type: string) => {
    return ACCOUNT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const handleAddHolding = () => {
    setEditingHolding(null);
    setHoldingForm({
      symbol: "",
      name: "",
      shares: 0,
      costBasis: 0,
      currentPrice: 0,
      accountType: "brokerage",
    });
    setShowHoldingModal(true);
  };

  const handleEditHolding = (holding: Holding) => {
    setEditingHolding(holding);
    setHoldingForm({
      symbol: holding.symbol,
      name: holding.name,
      shares: holding.shares,
      costBasis: holding.costBasis,
      currentPrice: holding.currentPrice,
      accountType: holding.accountType,
    });
    setShowHoldingModal(true);
  };

  const handleSaveHolding = async () => {
    try {
      if (editingHolding) {
        const updateData: UpdateHoldingRequest = {
          shares: holdingForm.shares,
          costBasis: holdingForm.costBasis,
          currentPrice: holdingForm.currentPrice,
          accountType: holdingForm.accountType,
        };
        await investmentsService.updateHolding(
          editingHolding.holdingId,
          updateData,
        );
      } else {
        await investmentsService.createHolding(holdingForm);
      }
      setShowHoldingModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save holding");
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    Alert.alert(
      "Delete Holding",
      "Are you sure you want to delete this holding?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await investmentsService.deleteHolding(holdingId);
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete holding");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading portfolio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Investments</Text>
          <Text style={styles.headerSubtitle}>Track your portfolio</Text>
        </View>

        {/* Portfolio Summary Cards */}
        {portfolio && (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Value</Text>
                <Text style={styles.summaryEmoji}>📈</Text>
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(portfolio.totalValue)}
              </Text>
              <Text style={styles.summarySubtext}>
                {portfolio.holdings.length} holdings
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Gain/Loss</Text>
                <Text
                  style={[
                    styles.statValue,
                    portfolio.totalGainLoss >= 0
                      ? styles.positive
                      : styles.negative,
                  ]}
                >
                  {formatCurrency(portfolio.totalGainLoss)}
                </Text>
                <Text
                  style={[
                    styles.statPercent,
                    portfolio.totalGainLossPercent >= 0
                      ? styles.positive
                      : styles.negative,
                  ]}
                >
                  {formatPercent(portfolio.totalGainLossPercent)}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Day Change</Text>
                <Text
                  style={[
                    styles.statValue,
                    portfolio.dayChange >= 0
                      ? styles.positive
                      : styles.negative,
                  ]}
                >
                  {formatCurrency(portfolio.dayChange)}
                </Text>
                <Text
                  style={[
                    styles.statPercent,
                    portfolio.dayChangePercent >= 0
                      ? styles.positive
                      : styles.negative,
                  ]}
                >
                  {formatPercent(portfolio.dayChangePercent)}
                </Text>
              </View>
            </View>

            {/* Holdings List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Holdings</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddHolding}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {portfolio.holdings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No holdings yet. Add your first investment to start
                    tracking.
                  </Text>
                </View>
              ) : (
                portfolio.holdings.map((holding) => {
                  const value = holding.shares * holding.currentPrice;
                  const costBasis = holding.shares * holding.costBasis;
                  const gainLoss = value - costBasis;
                  const gainLossPercent =
                    costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

                  return (
                    <View key={holding.holdingId} style={styles.holdingCard}>
                      <View style={styles.holdingHeader}>
                        <View style={styles.holdingInfo}>
                          <Text style={styles.holdingSymbol}>
                            {holding.symbol}
                          </Text>
                          <Text style={styles.holdingName}>{holding.name}</Text>
                        </View>
                        <View style={styles.holdingActions}>
                          <TouchableOpacity
                            onPress={() => handleEditHolding(holding)}
                          >
                            <Text style={styles.actionIcon}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              handleDeleteHolding(holding.holdingId)
                            }
                          >
                            <Text style={styles.actionIcon}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.holdingDetails}>
                        <View style={styles.holdingDetailRow}>
                          <Text style={styles.holdingDetailLabel}>Shares:</Text>
                          <Text style={styles.holdingDetailValue}>
                            {holding.shares.toFixed(4)}
                          </Text>
                        </View>
                        <View style={styles.holdingDetailRow}>
                          <Text style={styles.holdingDetailLabel}>Price:</Text>
                          <Text style={styles.holdingDetailValue}>
                            {formatCurrency(holding.currentPrice)}
                          </Text>
                        </View>
                        <View style={styles.holdingDetailRow}>
                          <Text style={styles.holdingDetailLabel}>Value:</Text>
                          <Text style={styles.holdingDetailValue}>
                            {formatCurrency(value)}
                          </Text>
                        </View>
                        <View style={styles.holdingDetailRow}>
                          <Text style={styles.holdingDetailLabel}>
                            Gain/Loss:
                          </Text>
                          <Text
                            style={[
                              styles.holdingDetailValue,
                              gainLoss >= 0 ? styles.positive : styles.negative,
                            ]}
                          >
                            {formatCurrency(gainLoss)} (
                            {formatPercent(gainLossPercent)})
                          </Text>
                        </View>
                        <View style={styles.holdingDetailRow}>
                          <Text style={styles.holdingDetailLabel}>
                            Account:
                          </Text>
                          <Text style={styles.holdingDetailValue}>
                            {getAccountTypeLabel(holding.accountType)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Asset Allocation */}
            {portfolio.allocation.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Asset Allocation</Text>
                <View style={styles.allocationGrid}>
                  {portfolio.allocation.map((item, i) => (
                    <View key={i} style={styles.allocationCard}>
                      <Text style={styles.allocationEmoji}>
                        {item.type === "brokerage"
                          ? "💼"
                          : item.type === "401k"
                            ? "🏢"
                            : item.type === "ira"
                              ? "🏦"
                              : item.type === "roth_ira"
                                ? "💎"
                                : item.type === "hsa"
                                  ? "🏥"
                                  : "₿"}
                      </Text>
                      <Text style={styles.allocationLabel}>
                        {getAccountTypeLabel(item.type)}
                      </Text>
                      <Text style={styles.allocationPercent}>
                        {item.percent.toFixed(1)}%
                      </Text>
                      <Text style={styles.allocationValue}>
                        {formatCurrency(item.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Holding Modal */}
      <Modal visible={showHoldingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingHolding ? "Edit Holding" : "Add Holding"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Symbol (e.g., AAPL)"
              value={holdingForm.symbol}
              onChangeText={(text) =>
                setHoldingForm({ ...holdingForm, symbol: text.toUpperCase() })
              }
              editable={!editingHolding}
            />

            <TextInput
              style={styles.input}
              placeholder="Name (e.g., Apple Inc.)"
              value={holdingForm.name}
              onChangeText={(text) =>
                setHoldingForm({ ...holdingForm, name: text })
              }
              editable={!editingHolding}
            />

            <TextInput
              style={styles.input}
              placeholder="Shares"
              value={holdingForm.shares.toString()}
              onChangeText={(text) =>
                setHoldingForm({
                  ...holdingForm,
                  shares: parseFloat(text) || 0,
                })
              }
              keyboardType="decimal-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Cost Basis"
              value={holdingForm.costBasis.toString()}
              onChangeText={(text) =>
                setHoldingForm({
                  ...holdingForm,
                  costBasis: parseFloat(text) || 0,
                })
              }
              keyboardType="decimal-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Current Price"
              value={holdingForm.currentPrice.toString()}
              onChangeText={(text) =>
                setHoldingForm({
                  ...holdingForm,
                  currentPrice: parseFloat(text) || 0,
                })
              }
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowHoldingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveHolding}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#DBEAFE",
  },
  summaryEmoji: {
    fontSize: 24,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  summarySubtext: {
    fontSize: 12,
    color: "#DBEAFE",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statPercent: {
    fontSize: 12,
    marginTop: 4,
  },
  positive: {
    color: "#10B981",
  },
  negative: {
    color: "#EF4444",
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  addButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    padding: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  holdingCard: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
  },
  holdingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  holdingName: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  holdingActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionIcon: {
    fontSize: 20,
  },
  holdingDetails: {
    gap: 8,
  },
  holdingDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  holdingDetailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  holdingDetailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  allocationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  allocationCard: {
    width: "30%",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
  },
  allocationEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  allocationLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 4,
  },
  allocationPercent: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3B82F6",
  },
  allocationValue: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
