/**
 * TransactionTemplateModal Component Tests
 *
 * Tests for the transaction template management modal.
 * **Validates: Requirements 10.2**
 *
 * These render the REAL component. An earlier version of this file declared a
 * `MockTransactionTemplateModal` inside the test and asserted against that, so
 * it passed without exercising a single line of shipped code.
 *
 * Only the component's two dependencies are stubbed: useTemplates (which talks
 * to AsyncStorage) and useHaptics (native).
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import TransactionTemplateModal from "../TransactionTemplateModal";
import {
  useTemplates,
  type TransactionTemplate,
} from "../../hooks/useTemplates";

// The component reads useSafeAreaInsets, which throws outside a provider.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../hooks/useTemplates");
jest.mock("../../hooks/useHaptics", () => ({
  useHaptics: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    selection: jest.fn(),
  }),
}));

const useTemplatesMock = useTemplates as jest.Mock;

const TEMPLATES: TransactionTemplate[] = [
  {
    id: "tpl_1",
    name: "Morning Coffee",
    description: "Latte",
    amount: 4.5,
    categoryId: "cat_food",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_2",
    name: "Monthly Transit",
    description: "Transit pass",
    amount: 120,
    categoryId: "cat_transport",
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

const saveTemplate = jest.fn();
const deleteTemplate = jest.fn();

function mockTemplates(templates: TransactionTemplate[], isLoading = false) {
  useTemplatesMock.mockReturnValue({
    templates,
    isLoading,
    saveTemplate,
    deleteTemplate,
    incrementUseCount: jest.fn(),
    recentCategories: [],
    addRecentCategory: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTemplates(TEMPLATES);
});

describe("TransactionTemplateModal", () => {
  it("lists every saved template by name", () => {
    const { getByText } = render(
      <TransactionTemplateModal
        visible
        onClose={jest.fn()}
        onSelectTemplate={jest.fn()}
      />,
    );

    expect(getByText("Morning Coffee")).toBeTruthy();
    expect(getByText("Monthly Transit")).toBeTruthy();
  });

  it("shows the list title", () => {
    const { getByText } = render(
      <TransactionTemplateModal
        visible
        onClose={jest.fn()}
        onSelectTemplate={jest.fn()}
      />,
    );

    expect(getByText("Transaction Templates")).toBeTruthy();
  });

  it("reports an empty state when nothing is saved", () => {
    mockTemplates([]);

    const { getByText } = render(
      <TransactionTemplateModal
        visible
        onClose={jest.fn()}
        onSelectTemplate={jest.fn()}
      />,
    );

    expect(getByText(/No templates saved/i)).toBeTruthy();
  });

  it("passes the selected template back to the caller", () => {
    const onSelectTemplate = jest.fn();
    const { getByText } = render(
      <TransactionTemplateModal
        visible
        onClose={jest.fn()}
        onSelectTemplate={onSelectTemplate}
      />,
    );

    fireEvent.press(getByText("Morning Coffee"));

    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
    expect(onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "tpl_1", name: "Morning Coffee" }),
    );
  });

  it("resolves category names through getCategoryName", () => {
    const getCategoryName = jest.fn((id: string) =>
      id === "cat_food" ? "Food" : "Transport",
    );

    render(
      <TransactionTemplateModal
        visible
        onClose={jest.fn()}
        onSelectTemplate={jest.fn()}
        getCategoryName={getCategoryName}
      />,
    );

    expect(getCategoryName).toHaveBeenCalledWith("cat_food");
    expect(getCategoryName).toHaveBeenCalledWith("cat_transport");
  });

  it("offers the save affordance only when a current transaction is supplied", () => {
    const withoutDraft = render(
      <TransactionTemplateModal
        visible
        onClose={jest.fn()}
        onSelectTemplate={jest.fn()}
      />,
    );
    expect(withoutDraft.queryByText("Save as Template")).toBeNull();

    const withDraft = render(
      <TransactionTemplateModal
        visible
        onClose={jest.fn()}
        onSelectTemplate={jest.fn()}
        currentTransaction={{
          description: "Latte",
          amount: 4.5,
          categoryId: "cat_food",
        }}
      />,
    );
    expect(withDraft.getByText("Save as Template")).toBeTruthy();
  });

  it("accepts a name for a template saved from the current transaction", async () => {
    const { getByText, getByPlaceholderText } = render(
      <TransactionTemplateModal
        visible
        onClose={jest.fn()}
        onSelectTemplate={jest.fn()}
        currentTransaction={{
          description: "Latte",
          amount: 4.5,
          categoryId: "cat_food",
        }}
      />,
    );

    fireEvent.press(getByText("Save as Template"));

    const input = getByPlaceholderText("e.g., Morning Coffee");
    fireEvent.changeText(input, "Afternoon Latte");

    await waitFor(() => {
      expect(input.props.value).toBe("Afternoon Latte");
    });
  });

  it("renders nothing interactive when not visible", () => {
    const { queryByText } = render(
      <TransactionTemplateModal
        visible={false}
        onClose={jest.fn()}
        onSelectTemplate={jest.fn()}
      />,
    );

    expect(queryByText("Morning Coffee")).toBeNull();
  });
});
