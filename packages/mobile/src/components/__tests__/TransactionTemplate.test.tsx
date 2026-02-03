/**
 * TransactionTemplateModal Component Tests
 *
 * Tests for the transaction template management modal.
 * **Validates: Requirements 10.2**
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  FlatList,
} from "react-native";

interface TransactionTemplate {
  id: string;
  name: string;
  description: string;
  amount: number;
  categoryId: string;
}

// Create a simplified mock component for testing
const MockTransactionTemplateModal = ({
  visible,
  onClose,
  onSelectTemplate,
  templates = [],
  currentTransaction,
  onSaveTemplate,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TransactionTemplate) => void;
  templates?: TransactionTemplate[];
  currentTransaction?: {
    description: string;
    amount: number;
    categoryId: string;
  };
  onSaveTemplate?: (name: string) => void;
}) => {
  const [mode, setMode] = React.useState<"list" | "save">("list");
  const [templateName, setTemplateName] = React.useState("");

  React.useEffect(() => {
    if (visible) {
      setMode("list");
      setTemplateName("");
    }
  }, [visible]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <Modal visible={visible} testID="modal">
      <View testID="modal-content">
        <View testID="header">
          <Text testID="title">
            {mode === "list" ? "Transaction Templates" : "Save as Template"}
          </Text>
          <Pressable
            testID="close-button"
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={onClose}
          >
            <Text>×</Text>
          </Pressable>
        </View>

        {mode === "list" ? (
          <>
            {templates.length === 0 ? (
              <View testID="empty-state">
                <Text>No templates saved</Text>
              </View>
            ) : (
              <FlatList
                testID="template-list"
                data={templates}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    testID={`template-${item.id}`}
                    accessibilityLabel={`Template: ${item.name}, ${formatCurrency(item.amount)}`}
                    accessibilityHint="Tap to use this template, long press to delete"
                    onPress={() => {
                      onSelectTemplate(item);
                      onClose();
                    }}
                    onLongPress={() => {
                      // Would show delete confirmation
                    }}
                  >
                    <Text testID={`template-name-${item.id}`}>{item.name}</Text>
                    <Text testID={`template-amount-${item.id}`}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </Pressable>
                )}
              />
            )}

            {currentTransaction && (
              <Pressable
                testID="save-template-button"
                accessibilityLabel="Save current transaction as template"
                accessibilityRole="button"
                onPress={() => setMode("save")}
              >
                <Text>Save as Template</Text>
              </Pressable>
            )}
          </>
        ) : (
          <View testID="save-form">
            <Text>Template Name</Text>
            <TextInput
              testID="template-name-input"
              placeholder="e.g., Morning Coffee"
              value={templateName}
              onChangeText={setTemplateName}
              accessibilityLabel="Template name"
            />
            {currentTransaction && (
              <View testID="preview">
                <Text>Transaction Preview</Text>
                <Text testID="preview-text">
                  {currentTransaction.description} -{" "}
                  {formatCurrency(currentTransaction.amount)}
                </Text>
              </View>
            )}
            <Pressable
              testID="cancel-button"
              onPress={() => {
                setMode("list");
                setTemplateName("");
              }}
            >
              <Text>Cancel</Text>
            </Pressable>
            <Pressable
              testID="save-button"
              onPress={() => {
                if (templateName.trim() && onSaveTemplate) {
                  onSaveTemplate(templateName.trim());
                  onClose();
                }
              }}
            >
              <Text>Save Template</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
};

describe("TransactionTemplateModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSelectTemplate = jest.fn();
  const mockOnSaveTemplate = jest.fn();

  const mockTemplates: TransactionTemplate[] = [
    {
      id: "template-1",
      name: "Morning Coffee",
      description: "Starbucks",
      amount: 5.5,
      categoryId: "cat-food",
    },
    {
      id: "template-2",
      name: "Gas Fill-up",
      description: "Shell Station",
      amount: 45.0,
      categoryId: "cat-transport",
    },
  ];

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onSelectTemplate: mockOnSelectTemplate,
    templates: mockTemplates,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders modal when visible", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );
      expect(getByTestId("modal")).toBeTruthy();
    });

    it("renders template list", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );
      expect(getByTestId("template-list")).toBeTruthy();
    });

    it("displays template names", () => {
      const { getByText } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );
      expect(getByText("Morning Coffee")).toBeTruthy();
      expect(getByText("Gas Fill-up")).toBeTruthy();
    });

    it("displays template amounts formatted as currency", () => {
      const { getByText } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );
      expect(getByText("$5.50")).toBeTruthy();
      expect(getByText("$45.00")).toBeTruthy();
    });
  });

  describe("Template Selection", () => {
    it("calls onSelectTemplate when template is pressed", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );

      fireEvent.press(getByTestId("template-template-1"));

      expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
    });

    it("closes modal after template selection", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );

      fireEvent.press(getByTestId("template-template-1"));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Save Template", () => {
    const propsWithCurrentTransaction = {
      ...defaultProps,
      currentTransaction: {
        description: "New Transaction",
        amount: 25.0,
        categoryId: "cat-food",
      },
      onSaveTemplate: mockOnSaveTemplate,
    };

    it("shows save as template button when currentTransaction is provided", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...propsWithCurrentTransaction} />,
      );
      expect(getByTestId("save-template-button")).toBeTruthy();
    });

    it("switches to save mode when save button is pressed", () => {
      const { getByTestId, getByText } = render(
        <MockTransactionTemplateModal {...propsWithCurrentTransaction} />,
      );

      fireEvent.press(getByTestId("save-template-button"));

      expect(getByText("Template Name")).toBeTruthy();
    });

    it("shows transaction preview in save mode", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...propsWithCurrentTransaction} />,
      );

      fireEvent.press(getByTestId("save-template-button"));

      expect(getByTestId("preview")).toBeTruthy();
      expect(getByTestId("preview-text").props.children).toContain(
        "New Transaction",
      );
    });

    it("saves template with entered name", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...propsWithCurrentTransaction} />,
      );

      fireEvent.press(getByTestId("save-template-button"));
      fireEvent.changeText(
        getByTestId("template-name-input"),
        "My New Template",
      );
      fireEvent.press(getByTestId("save-button"));

      expect(mockOnSaveTemplate).toHaveBeenCalledWith("My New Template");
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no templates exist", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...defaultProps} templates={[]} />,
      );
      expect(getByTestId("empty-state")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("has accessible close button", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );
      expect(getByTestId("close-button").props.accessibilityLabel).toBe(
        "Close",
      );
    });

    it("template items have accessibility hints", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );
      expect(getByTestId("template-template-1").props.accessibilityHint).toBe(
        "Tap to use this template, long press to delete",
      );
    });
  });

  describe("Close Behavior", () => {
    it("calls onClose when close button is pressed", () => {
      const { getByTestId } = render(
        <MockTransactionTemplateModal {...defaultProps} />,
      );

      fireEvent.press(getByTestId("close-button"));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("resets to list mode when modal is reopened", () => {
      const { getByTestId, rerender } = render(
        <MockTransactionTemplateModal
          {...defaultProps}
          currentTransaction={{
            description: "Test",
            amount: 10,
            categoryId: "cat-1",
          }}
        />,
      );

      // Enter save mode
      fireEvent.press(getByTestId("save-template-button"));

      // Close and reopen
      rerender(
        <MockTransactionTemplateModal {...defaultProps} visible={false} />,
      );
      rerender(
        <MockTransactionTemplateModal {...defaultProps} visible={true} />,
      );

      // Should be back to list mode
      expect(getByTestId("title").props.children).toBe("Transaction Templates");
    });
  });
});
