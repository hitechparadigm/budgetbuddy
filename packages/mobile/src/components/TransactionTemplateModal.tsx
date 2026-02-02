/**
 * TransactionTemplateModal Component
 * Bottom sheet modal for managing and selecting transaction templates
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHaptics } from "../hooks/useHaptics";
import { useTheme } from "../hooks/useTheme";
import { useTemplates, TransactionTemplate } from "../hooks/useTemplates";
import { Button } from "./ui";

interface TransactionTemplateModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when a template is selected */
  onSelectTemplate: (template: TransactionTemplate) => void;
  /** Optional: Save current transaction as template */
  onSaveTemplate?: (name: string) => void;
  /** Current transaction data for saving as template */
  currentTransaction?: {
    description: string;
    amount: number;
    categoryId: string;
  };
  /** Category name lookup function */
  getCategoryName?: (categoryId: string) => string;
}

type ModalMode = "list" | "save";

export default function TransactionTemplateModal({
  visible,
  onClose,
  onSelectTemplate,
  onSaveTemplate,
  currentTransaction,
  getCategoryName = () => "Unknown",
}: TransactionTemplateModalProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { templates, isLoading, saveTemplate, deleteTemplate } = useTemplates();

  const [mode, setMode] = useState<ModalMode>("list");
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = useCallback(() => {
    setMode("list");
    setTemplateName("");
    onClose();
  }, [onClose]);

  const handleSelectTemplate = useCallback(
    (template: TransactionTemplate) => {
      haptics.medium();
      onSelectTemplate(template);
      handleClose();
    },
    [haptics, onSelectTemplate, handleClose],
  );

  const handleDeleteTemplate = useCallback(
    (template: TransactionTemplate) => {
      Alert.alert(
        "Delete Template",
        `Are you sure you want to delete "${template.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              haptics.medium();
              await deleteTemplate(template.id);
            },
          },
        ],
      );
    },
    [haptics, deleteTemplate],
  );

  const handleSaveAsTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      Alert.alert("Error", "Please enter a template name");
      haptics.error();
      return;
    }

    if (!currentTransaction) {
      Alert.alert("Error", "No transaction data to save");
      haptics.error();
      return;
    }

    setIsSaving(true);
    try {
      await saveTemplate({
        name: templateName.trim(),
        description: currentTransaction.description,
        amount: currentTransaction.amount,
        categoryId: currentTransaction.categoryId,
      });

      haptics.success();

      if (onSaveTemplate) {
        onSaveTemplate(templateName.trim());
      }

      handleClose();
    } catch (error) {
      console.error("Failed to save template:", error);
      Alert.alert("Error", "Failed to save template");
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  }, [
    templateName,
    currentTransaction,
    saveTemplate,
    haptics,
    onSaveTemplate,
    handleClose,
  ]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const renderTemplate = useCallback(
    ({ item }: { item: TransactionTemplate }) => (
      <Pressable
        style={[
          styles.templateItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => handleSelectTemplate(item)}
        onLongPress={() => handleDeleteTemplate(item)}
        accessibilityLabel={`Template: ${item.name}, ${formatCurrency(item.amount)}`}
        accessibilityHint="Tap to use this template, long press to delete"
        accessibilityRole="button"
      >
        <View style={styles.templateInfo}>
          <Text style={[styles.templateName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text
            style={[
              styles.templateDescription,
              { color: colors.textSecondary },
            ]}
          >
            {item.description} • {getCategoryName(item.categoryId)}
          </Text>
        </View>
        <View style={styles.templateAmount}>
          <Text style={[styles.amountText, { color: colors.primary }]}>
            {formatCurrency(item.amount)}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </Pressable>
    ),
    [colors, handleSelectTemplate, handleDeleteTemplate, getCategoryName],
  );

  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "70%",
      paddingBottom: insets.bottom + 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
      textAlign: "center",
    },
    emptyHint: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
    },
    saveSection: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: 8,
    },
    saveForm: {
      padding: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    previewLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    previewValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={dynamicStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <View style={dynamicStyles.container}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.title}>
              {mode === "list" ? "Transaction Templates" : "Save as Template"}
            </Text>
            <Pressable
              style={dynamicStyles.closeButton}
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {mode === "list" ? (
            <>
              {/* Template List */}
              <View style={dynamicStyles.content}>
                {templates.length === 0 ? (
                  <View style={dynamicStyles.emptyState}>
                    <Ionicons
                      name="bookmark-outline"
                      size={48}
                      color={colors.textSecondary}
                    />
                    <Text style={dynamicStyles.emptyText}>
                      No templates saved
                    </Text>
                    <Text style={dynamicStyles.emptyHint}>
                      Save frequently used transactions as templates for quick
                      access
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={templates}
                    renderItem={renderTemplate}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 16 }}
                  />
                )}
              </View>

              {/* Save as Template Button */}
              {currentTransaction && (
                <View style={dynamicStyles.saveSection}>
                  <Pressable
                    style={dynamicStyles.saveButton}
                    onPress={() => {
                      haptics.light();
                      setMode("save");
                    }}
                    accessibilityLabel="Save current transaction as template"
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="bookmark"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={dynamicStyles.saveButtonText}>
                      Save as Template
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            /* Save Template Form */
            <View style={dynamicStyles.saveForm}>
              <Text style={dynamicStyles.inputLabel}>Template Name</Text>
              <TextInput
                style={dynamicStyles.input}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="e.g., Morning Coffee"
                placeholderTextColor={colors.textSecondary}
                autoFocus
                accessibilityLabel="Template name"
              />

              {currentTransaction && (
                <View style={dynamicStyles.previewCard}>
                  <Text style={dynamicStyles.previewLabel}>
                    Transaction Preview
                  </Text>
                  <Text style={dynamicStyles.previewValue}>
                    {currentTransaction.description} -{" "}
                    {formatCurrency(currentTransaction.amount)}
                  </Text>
                </View>
              )}

              <View style={dynamicStyles.buttonRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setMode("list");
                    setTemplateName("");
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Template"
                  onPress={handleSaveAsTemplate}
                  loading={isSaving}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
    marginRight: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
  },
  templateAmount: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 4,
  },
});
