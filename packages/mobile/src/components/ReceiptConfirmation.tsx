/**
 * Receipt Confirmation Component
 *
 * Displays extracted receipt data and allows editing before saving.
 * Features:
 * - Display extracted merchant, date, total
 * - Edit fields before saving
 * - Auto-suggested category
 * - Create transaction from receipt
 *
 * **Validates: Requirement 44.4, 44.5**
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { ExtractedReceiptData } from "../services/receipt";

/** The minimum a category needs to be pickable here. */
export interface ReceiptCategoryOption {
  id: string;
  name: string;
}

interface ReceiptConfirmationProps {
  visible: boolean;
  extractedData: ExtractedReceiptData | null;
  /**
   * The categories of the user's own budget. The picker offers exactly these.
   * A fixed nine-name list used to be hardcoded here, which meant the name
   * this sheet returned had no relation to the user's budget and the caller
   * had to guess an id from it.
   */
  categories: ReceiptCategoryOption[];
  onClose: () => void;
  onSave: (data: {
    merchant: string;
    date: string;
    amount: number;
    /** An id from `categories`, never a free-text name. */
    categoryId: string;
    notes?: string;
  }) => void;
}

export const ReceiptConfirmation: React.FC<ReceiptConfirmationProps> = ({
  visible,
  extractedData,
  categories,
  onClose,
  onSave,
}) => {
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // `categories` is read inside the reset effect only to compute the initial
  // preselect, and it must NOT be a dependency of that effect. Callers build
  // the array inline (a `flatMap` over the budgets), so its identity changes
  // on every parent render; depending on it meant any parent re-render while
  // this sheet was open re-ran the reset below and silently reverted the
  // merchant, date, amount, notes and category the user had just typed back
  // to the OCR values. Reading it through a ref keeps the preselect current
  // without making the reset fire on identity changes.
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  // Resets the form from a NEW extraction only. `extractedData` is the one
  // thing that should discard in-progress edits.
  useEffect(() => {
    if (extractedData) {
      setMerchant(extractedData.merchant || "");
      setDate(extractedData.date || new Date().toISOString().split("T")[0]);
      setAmount(extractedData.total?.toString() || "");
      // The OCR suggestion is a name from the receipt processor's own
      // vocabulary, so it is treated as a hint: it preselects a category only
      // when it matches one the user actually has. On a miss nothing is
      // preselected and the user must pick, rather than the transaction
      // landing in whichever category happens to come first.
      const suggested = extractedData.suggestedCategory?.trim().toLowerCase();
      const match = suggested
        ? categoriesRef.current.find(
            (c) => c.name.trim().toLowerCase() === suggested,
          )
        : undefined;
      setCategoryId(match?.id ?? "");
      setNotes("");
    }
  }, [extractedData]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSave = () => {
    if (!merchant.trim()) {
      Alert.alert("Missing Information", "Please enter a merchant name.");
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert("Missing Information", "Please enter a valid amount.");
      return;
    }

    if (!selectedCategory) {
      Alert.alert(
        "Choose a category",
        categories.length === 0
          ? "Add a budget category before saving a receipt."
          : "Select which budget category this receipt belongs to.",
      );
      return;
    }

    onSave({
      merchant: merchant.trim(),
      date: date || new Date().toISOString().split("T")[0],
      amount: parseFloat(amount),
      categoryId: selectedCategory.id,
      notes: notes.trim() || undefined,
    });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "#16a34a";
    if (confidence >= 0.5) return "#ca8a04";
    return "#dc2626";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.5) return "Medium";
    return "Low";
  };

  if (!visible || !extractedData) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Receipt</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Confidence indicator */}
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Extraction Confidence:</Text>
            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor: getConfidenceColor(extractedData.confidence),
                },
              ]}
            >
              <Text style={styles.confidenceText}>
                {getConfidenceLabel(extractedData.confidence)} (
                {Math.round(extractedData.confidence * 100)}%)
              </Text>
            </View>
          </View>

          {/* Merchant */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Merchant</Text>
            <TextInput
              style={styles.input}
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Enter merchant name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Total Amount</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>
            {amount && (
              <Text style={styles.amountPreview}>{formatCurrency(amount)}</Text>
            )}
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text
                style={[
                  styles.categoryText,
                  !selectedCategory && styles.categoryPlaceholder,
                ]}
              >
                {selectedCategory?.name ?? "Select a category"}
              </Text>
              <Text style={styles.categoryArrow}>▼</Text>
            </TouchableOpacity>
            {!selectedCategory && (
              <Text style={styles.categoryHint}>
                {categories.length === 0
                  ? "This budget has no categories yet."
                  : "Pick the category this receipt belongs to."}
              </Text>
            )}
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Extracted items preview */}
          {extractedData.items && extractedData.items.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.itemsTitle}>Extracted Items</Text>
              {extractedData.items.slice(0, 5).map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name || "Unknown item"}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {item.price ? formatCurrency(item.price.toString()) : "-"}
                  </Text>
                </View>
              ))}
              {extractedData.items.length > 5 && (
                <Text style={styles.moreItems}>
                  +{extractedData.items.length - 5} more items
                </Text>
              )}
            </View>
          )}

          {/* Tax and subtotal */}
          {(extractedData.subtotal || extractedData.tax) && (
            <View style={styles.totalsSection}>
              {extractedData.subtotal && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(extractedData.subtotal.toString())}
                  </Text>
                </View>
              )}
              {extractedData.tax && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(extractedData.tax.toString())}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Category Picker Modal */}
        <Modal
          visible={showCategoryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryPicker(false)}
          >
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Select Category</Text>
              {categories.length === 0 && (
                <Text style={styles.pickerEmpty}>
                  No budget categories yet. Add one on the Budget tab first.
                </Text>
              )}
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pickerOption,
                    categoryId === cat.id && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setCategoryId(cat.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      categoryId === cat.id && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {categoryId === cat.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerButton: {
    width: 60,
  },
  cancelText: {
    color: "#6b7280",
    fontSize: 16,
  },
  saveText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginRight: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  currencySymbol: {
    fontSize: 18,
    color: "#6b7280",
    paddingLeft: 12,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 18,
    color: "#111827",
  },
  amountPreview: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  categorySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryText: {
    fontSize: 16,
    color: "#111827",
  },
  categoryPlaceholder: {
    color: "#9ca3af",
  },
  categoryHint: {
    fontSize: 12,
    color: "#b45309",
    marginTop: 6,
  },
  categoryArrow: {
    fontSize: 12,
    color: "#6b7280",
  },
  itemsSection: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: "#4b5563",
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  moreItems: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  totalsSection: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "80%",
    maxHeight: "70%",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerEmpty: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 8,
  },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  pickerOptionSelected: {
    backgroundColor: "#eff6ff",
  },
  pickerOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  pickerOptionTextSelected: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  checkmark: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
});

export default ReceiptConfirmation;
