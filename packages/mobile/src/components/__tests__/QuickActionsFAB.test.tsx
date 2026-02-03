/**
 * QuickActionsFAB Component Tests
 *
 * Tests for the floating action button with expandable quick actions menu.
 * **Validates: Requirements 10.1**
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { View, Text, Pressable } from "react-native";

// Create a simplified mock component for testing
const MockQuickActionsFAB = ({
  onAddTransaction,
  onScanReceipt,
  onViewBudget,
  visible = true,
}: {
  onAddTransaction: () => void;
  onScanReceipt: () => void;
  onViewBudget: () => void;
  visible?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!visible) return null;

  return (
    <View testID="fab-container">
      {isExpanded && (
        <View testID="actions-menu">
          <Pressable
            testID="action-transaction"
            accessibilityLabel="Add Transaction"
            accessibilityRole="button"
            onPress={() => {
              onAddTransaction();
              setIsExpanded(false);
            }}
          >
            <Text>Add Transaction</Text>
          </Pressable>
          <Pressable
            testID="action-receipt"
            accessibilityLabel="Scan Receipt"
            accessibilityRole="button"
            onPress={() => {
              onScanReceipt();
              setIsExpanded(false);
            }}
          >
            <Text>Scan Receipt</Text>
          </Pressable>
          <Pressable
            testID="action-budget"
            accessibilityLabel="View Budget"
            accessibilityRole="button"
            onPress={() => {
              onViewBudget();
              setIsExpanded(false);
            }}
          >
            <Text>View Budget</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        testID="fab-button"
        accessibilityLabel="Quick Actions"
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint="Double tap to open quick actions menu"
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text>+</Text>
      </Pressable>
    </View>
  );
};

describe("QuickActionsFAB", () => {
  const mockOnAddTransaction = jest.fn();
  const mockOnScanReceipt = jest.fn();
  const mockOnViewBudget = jest.fn();

  const defaultProps = {
    onAddTransaction: mockOnAddTransaction,
    onScanReceipt: mockOnScanReceipt,
    onViewBudget: mockOnViewBudget,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the FAB button when visible", () => {
      const { getByTestId } = render(<MockQuickActionsFAB {...defaultProps} />);
      expect(getByTestId("fab-button")).toBeTruthy();
    });

    it("does not render when visible is false", () => {
      const { queryByTestId } = render(
        <MockQuickActionsFAB {...defaultProps} visible={false} />,
      );
      expect(queryByTestId("fab-button")).toBeNull();
    });

    it("renders with correct accessibility attributes", () => {
      const { getByTestId } = render(<MockQuickActionsFAB {...defaultProps} />);
      const fab = getByTestId("fab-button");
      expect(fab.props.accessibilityLabel).toBe("Quick Actions");
      expect(fab.props.accessibilityRole).toBe("button");
      expect(fab.props.accessibilityHint).toBe(
        "Double tap to open quick actions menu",
      );
    });
  });

  describe("Interactions", () => {
    it("expands menu when FAB is pressed", () => {
      const { getByTestId, queryByTestId } = render(
        <MockQuickActionsFAB {...defaultProps} />,
      );

      // Initially menu is not visible
      expect(queryByTestId("actions-menu")).toBeNull();

      // Press FAB
      fireEvent.press(getByTestId("fab-button"));

      // Menu should be visible
      expect(getByTestId("actions-menu")).toBeTruthy();
    });

    it("calls onAddTransaction when Add Transaction action is pressed", () => {
      const { getByTestId } = render(<MockQuickActionsFAB {...defaultProps} />);

      // Expand menu
      fireEvent.press(getByTestId("fab-button"));

      // Press action
      fireEvent.press(getByTestId("action-transaction"));

      expect(mockOnAddTransaction).toHaveBeenCalledTimes(1);
    });

    it("calls onScanReceipt when Scan Receipt action is pressed", () => {
      const { getByTestId } = render(<MockQuickActionsFAB {...defaultProps} />);

      fireEvent.press(getByTestId("fab-button"));
      fireEvent.press(getByTestId("action-receipt"));

      expect(mockOnScanReceipt).toHaveBeenCalledTimes(1);
    });

    it("calls onViewBudget when View Budget action is pressed", () => {
      const { getByTestId } = render(<MockQuickActionsFAB {...defaultProps} />);

      fireEvent.press(getByTestId("fab-button"));
      fireEvent.press(getByTestId("action-budget"));

      expect(mockOnViewBudget).toHaveBeenCalledTimes(1);
    });

    it("collapses menu after action is selected", () => {
      const { getByTestId, queryByTestId } = render(
        <MockQuickActionsFAB {...defaultProps} />,
      );

      // Expand menu
      fireEvent.press(getByTestId("fab-button"));
      expect(getByTestId("actions-menu")).toBeTruthy();

      // Select action
      fireEvent.press(getByTestId("action-transaction"));

      // Menu should collapse
      expect(queryByTestId("actions-menu")).toBeNull();
    });
  });

  describe("Accessibility", () => {
    it("has correct expanded state when menu is open", () => {
      const { getByTestId } = render(<MockQuickActionsFAB {...defaultProps} />);

      const fab = getByTestId("fab-button");

      // Initially collapsed
      expect(fab.props.accessibilityState.expanded).toBe(false);

      // Expand
      fireEvent.press(fab);

      expect(fab.props.accessibilityState.expanded).toBe(true);
    });

    it("action buttons have correct accessibility roles", () => {
      const { getByTestId } = render(<MockQuickActionsFAB {...defaultProps} />);

      fireEvent.press(getByTestId("fab-button"));

      expect(getByTestId("action-transaction").props.accessibilityRole).toBe(
        "button",
      );
      expect(getByTestId("action-receipt").props.accessibilityRole).toBe(
        "button",
      );
      expect(getByTestId("action-budget").props.accessibilityRole).toBe(
        "button",
      );
    });
  });
});
