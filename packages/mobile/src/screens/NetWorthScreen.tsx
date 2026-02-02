/**
 * Net Worth Screen
 *
 * Displays assets, liabilities, and net worth tracking.
 * Features:
 * - Net worth summary
 * - Asset and liability lists
 * - Add/edit/delete functionality
 * - Net worth history
 *
 * **Validates: Requirement 41**
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  netWorthService,
  Asset,
  Liability,
  NetWorthSummary,
  NetWorthHistory,
} from "../services/netWorth";

const ASSET_TYPES = [
  { value: "cash", label: "Cash & Savings", icon: "💵" },
  { value: "investment", label: "Investments", icon: "📈" },
  { value: "property", label: "Real Estate", icon: "🏠" },
  { value: "vehicle", label: "Vehicles", icon: "🚗" },
  { value: "other", label: "Other", icon: "📦" },
];

const LIABILITY_TYPES = [
  { value: "mortgage", label: "Mortgage", icon: "🏠" },
  { value: "car_loan", label: "Car Loan", icon: "🚗" },
  { value: "student_loan", label: "Student Loan", icon: "🎓" },
  { value: "credit_card", label: "Credit Card", icon: "💳" },
  { value: "personal_loan", label: "Personal Loan", icon: "💰" },
  { value: "other", label: "Other", icon: "📋" },
];

export const NetWorthScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<NetWorthSummary | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [history, setHistory] = useState<NetWorthHistory[]>([]);

  // Modal state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(
    null,
  );

  // Form state
  const [assetForm, setAssetForm] = useState({
    name: "",
    type: "cash" as Asset["type"],
    value: "",
  });
  const [liabilityForm, setLiabilityForm] = useState({
    name: "",
    type: "credit_card" as Liability["type"],
    balance: "",
    interestRate: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, assetsData, liabilitiesData, historyData] =
        await Promise.all([
          netWorthService.getSummary(),
          netWorthService.getAssets(),
          netWorthService.getLiabilities(),
          netWorthService.getHistory(6),
        ]);

      setSummary(summaryData);
      setAssets(assetsData);
      setLiabilities(liabilitiesData);
      setHistory(historyData);
    } catch (error) {
      console.error("Error loading net worth data:", error);
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
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTypeInfo = (type: string, types: typeof ASSET_TYPES) => {
    return types.find((t) => t.value === type) || { label: type, icon: "📦" };
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setAssetForm({ name: "", type: "cash", value: "" });
    setShowAssetModal(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name,
      type: asset.type,
      value: asset.value.toString(),
    });
    setShowAssetModal(true);
  };

  const handleSaveAsset = async () => {
    if (!assetForm.name.trim() || !assetForm.value) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const assetData = {
        name: assetForm.name,
        type: assetForm.type,
        value: parseFloat(assetForm.value),
        currency: "USD",
      };

      if (editingAsset) {
        await netWorthService.updateAsset(editingAsset.assetId, assetData);
      } else {
        await netWorthService.createAsset(assetData);
      }

      setShowAssetModal(false);
      loadData();
    } catch (error) {
      console.error("Error saving asset:", error);
      Alert.alert("Error", "Failed to save asset");
    }
  };

  const handleDeleteAsset = (asset: Asset) => {
    Alert.alert(
      "Delete Asset",
      `Are you sure you want to delete "${asset.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await netWorthService.deleteAsset(asset.assetId);
              loadData();
            } catch (error) {
              console.error("Error deleting asset:", error);
              Alert.alert("Error", "Failed to delete asset");
            }
          },
        },
      ],
    );
  };

  const handleAddLiability = () => {
    setEditingLiability(null);
    setLiabilityForm({
      name: "",
      type: "credit_card",
      balance: "",
      interestRate: "",
    });
    setShowLiabilityModal(true);
  };

  const handleEditLiability = (liability: Liability) => {
    setEditingLiability(liability);
    setLiabilityForm({
      name: liability.name,
      type: liability.type,
      balance: liability.balance.toString(),
      interestRate: liability.interestRate?.toString() || "",
    });
    setShowLiabilityModal(true);
  };

  const handleSaveLiability = async () => {
    if (!liabilityForm.name.trim() || !liabilityForm.balance) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const liabilityData = {
        name: liabilityForm.name,
        type: liabilityForm.type,
        balance: parseFloat(liabilityForm.balance),
        interestRate: liabilityForm.interestRate
          ? parseFloat(liabilityForm.interestRate)
          : undefined,
        currency: "USD",
      };

      if (editingLiability) {
        await netWorthService.updateLiability(
          editingLiability.liabilityId,
          liabilityData,
        );
      } else {
        await netWorthService.createLiability(liabilityData);
      }

      setShowLiabilityModal(false);
      loadData();
    } catch (error) {
      console.error("Error saving liability:", error);
      Alert.alert("Error", "Failed to save liability");
    }
  };

  const handleDeleteLiability = (liability: Liability) => {
    Alert.alert(
      "Delete Liability",
      `Are you sure you want to delete "${liability.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await netWorthService.deleteLiability(liability.liabilityId);
              loadData();
            } catch (error) {
              console.error("Error deleting liability:", error);
              Alert.alert("Error", "Failed to delete liability");
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
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading net worth...</Text>
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
          <Text style={styles.headerTitle}>Net Worth</Text>
          <Text style={styles.headerSubtitle}>
            Track your assets and liabilities
          </Text>
        </View>

        {/* Summary Card */}
        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Your Net Worth</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.netWorth)}
            </Text>
            {history.length > 0 && (
              <Text
                style={[
                  styles.summaryChange,
                  history[0].change >= 0 ? styles.textGreen : styles.textRed,
                ]}
              >
                {formatPercent(history[0].changePercent)} this month
              </Text>
            )}

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Assets</Text>
                <Text style={[styles.summaryItemValue, styles.textGreen]}>
                  {formatCurrency(summary.totalAssets)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Liabilities</Text>
                <Text style={[styles.summaryItemValue, styles.textRed]}>
                  {formatCurrency(summary.totalLiabilities)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Assets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assets</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddAsset}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {assets.length === 0 ? (
            <Text style={styles.emptyText}>
              No assets yet. Add your first asset!
            </Text>
          ) : (
            assets.map((asset) => {
              const typeInfo = getTypeInfo(asset.type, ASSET_TYPES);
              return (
                <TouchableOpacity
                  key={asset.assetId}
                  style={styles.itemCard}
                  onPress={() => handleEditAsset(asset)}
                  onLongPress={() => handleDeleteAsset(asset)}
                >
                  <Text style={styles.itemIcon}>{typeInfo.icon}</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{asset.name}</Text>
                    <Text style={styles.itemType}>{typeInfo.label}</Text>
                  </View>
                  <Text style={[styles.itemValue, styles.textGreen]}>
                    {formatCurrency(asset.value)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Liabilities Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Liabilities</Text>
            <TouchableOpacity
              style={[styles.addButton, styles.addButtonRed]}
              onPress={handleAddLiability}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {liabilities.length === 0 ? (
            <Text style={styles.emptyText}>No liabilities. Great job!</Text>
          ) : (
            liabilities.map((liability) => {
              const typeInfo = getTypeInfo(liability.type, LIABILITY_TYPES);
              return (
                <TouchableOpacity
                  key={liability.liabilityId}
                  style={styles.itemCard}
                  onPress={() => handleEditLiability(liability)}
                  onLongPress={() => handleDeleteLiability(liability)}
                >
                  <Text style={styles.itemIcon}>{typeInfo.icon}</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{liability.name}</Text>
                    <Text style={styles.itemType}>
                      {typeInfo.label}
                      {liability.interestRate &&
                        ` • ${liability.interestRate}%`}
                    </Text>
                  </View>
                  <Text style={[styles.itemValue, styles.textRed]}>
                    {formatCurrency(liability.balance)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Asset Modal */}
      <Modal visible={showAssetModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingAsset ? "Edit Asset" : "Add Asset"}
            </Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={assetForm.name}
              onChangeText={(text) =>
                setAssetForm({ ...assetForm, name: text })
              }
              placeholder="e.g., Savings Account"
            />

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeSelector}>
              {ASSET_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    assetForm.type === type.value && styles.typeOptionSelected,
                  ]}
                  onPress={() =>
                    setAssetForm({
                      ...assetForm,
                      type: type.value as Asset["type"],
                    })
                  }
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Value</Text>
            <TextInput
              style={styles.input}
              value={assetForm.value}
              onChangeText={(text) =>
                setAssetForm({ ...assetForm, value: text })
              }
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAssetModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveAsset}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Liability Modal */}
      <Modal visible={showLiabilityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingLiability ? "Edit Liability" : "Add Liability"}
            </Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={liabilityForm.name}
              onChangeText={(text) =>
                setLiabilityForm({ ...liabilityForm, name: text })
              }
              placeholder="e.g., Credit Card"
            />

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeSelector}>
              {LIABILITY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    liabilityForm.type === type.value &&
                      styles.typeOptionSelected,
                  ]}
                  onPress={() =>
                    setLiabilityForm({
                      ...liabilityForm,
                      type: type.value as Liability["type"],
                    })
                  }
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Balance</Text>
            <TextInput
              style={styles.input}
              value={liabilityForm.balance}
              onChangeText={(text) =>
                setLiabilityForm({ ...liabilityForm, balance: text })
              }
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Interest Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={liabilityForm.interestRate}
              onChangeText={(text) =>
                setLiabilityForm({ ...liabilityForm, interestRate: text })
              }
              placeholder="0.0"
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLiabilityModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, styles.saveButtonRed]}
                onPress={handleSaveLiability}
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
    backgroundColor: "#f3f4f6",
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
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#bfdbfe",
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
  },
  summaryChange: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    marginTop: 16,
    width: "100%",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryItemLabel: {
    fontSize: 12,
    color: "#bfdbfe",
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 2,
  },
  textGreen: {
    color: "#4ade80",
  },
  textRed: {
    color: "#f87171",
  },
  section: {
    margin: 16,
    marginTop: 0,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#16a34a",
    borderRadius: 6,
  },
  addButtonRed: {
    backgroundColor: "#dc2626",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    paddingVertical: 24,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  itemType: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  typeOptionSelected: {
    backgroundColor: "#dbeafe",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  typeIcon: {
    fontSize: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonRed: {
    backgroundColor: "#dc2626",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default NetWorthScreen;
