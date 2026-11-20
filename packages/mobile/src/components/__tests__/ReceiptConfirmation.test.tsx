/**
 * ReceiptConfirmation Component Tests
 *
 * Renders the REAL component. These cases are about the category path: the
 * sheet used to offer a hardcoded nine-name list unrelated to the user's
 * budget, and its caller then matched that name against the budget and fell
 * back to the first category on a miss, so a receipt could be filed under
 * whatever category happened to come first.
 */
import React from "react";
import { Alert } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import { ReceiptConfirmation } from "../ReceiptConfirmation";
import type { ExtractedReceiptData } from "../../services/receipt";

const CATEGORIES = [
  { id: "cat_food", name: "Food & Dining" },
  { id: "cat_transit", name: "Transit" },
  { id: "cat_groceries", name: "Groceries" },
];

function extracted(
  overrides: Partial<ExtractedReceiptData> = {},
): ExtractedReceiptData {
  return {
    merchant: "Corner Store",
    date: "2026-05-17",
    total: 42.5,
    confidence: 0.9,
    suggestedCategory: "Groceries",
    ...overrides,
  } as ExtractedReceiptData;
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe("ReceiptConfirmation category handling", () => {
  it("offers the budget's own categories, not a fixed list", () => {
    const { getByText, queryByText } = render(
      <ReceiptConfirmation
        visible
        extractedData={extracted()}
        categories={CATEGORIES}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );

    fireEvent.press(getByText("Groceries"));

    expect(getByText("Food & Dining")).toBeTruthy();
    expect(getByText("Transit")).toBeTruthy();
    // Names from the old hardcoded list that this budget does not have.
    expect(queryByText("Healthcare")).toBeNull();
    expect(queryByText("Utilities")).toBeNull();
  });

  it("preselects the OCR suggestion when it matches a real category", () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ReceiptConfirmation
        visible
        extractedData={extracted({ suggestedCategory: "Transit" })}
        categories={CATEGORIES}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.press(getByText("Save"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      categoryId: "cat_transit",
      merchant: "Corner Store",
      amount: 42.5,
    });
  });

  it("requires a pick when the OCR suggestion matches nothing", () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ReceiptConfirmation
        visible
        extractedData={extracted({ suggestedCategory: "Entertainment" })}
        categories={CATEGORIES}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    expect(getByText("Select a category")).toBeTruthy();

    fireEvent.press(getByText("Save"));

    // The old behaviour saved into categories[0] and fired a success haptic.
    expect(onSave).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Choose a category",
      expect.stringContaining("Select which budget category"),
    );
  });

  it("saves the id of the category the user picks", () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ReceiptConfirmation
        visible
        extractedData={extracted({ suggestedCategory: "Entertainment" })}
        categories={CATEGORIES}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.press(getByText("Select a category"));
    fireEvent.press(getByText("Food & Dining"));
    fireEvent.press(getByText("Save"));

    expect(onSave.mock.calls[0][0].categoryId).toBe("cat_food");
  });

  it("matches the suggestion case-insensitively", () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ReceiptConfirmation
        visible
        extractedData={extracted({ suggestedCategory: "  groceries " })}
        categories={CATEGORIES}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.press(getByText("Save"));

    expect(onSave.mock.calls[0][0].categoryId).toBe("cat_groceries");
  });

  it("keeps the user's edits when the parent re-renders with a new categories array", () => {
    const onSave = jest.fn();
    const data = extracted({ suggestedCategory: "Transit" });
    const { getByText, getByPlaceholderText, getByDisplayValue, rerender } =
      render(
        <ReceiptConfirmation
          visible
          extractedData={data}
          categories={CATEGORIES}
          onClose={jest.fn()}
          onSave={onSave}
        />,
      );

    // The user corrects what the OCR misread and picks a different category.
    fireEvent.changeText(getByDisplayValue("42.5"), "19.99");
    fireEvent.changeText(getByDisplayValue("Corner Store"), "Bodega");
    fireEvent.changeText(getByPlaceholderText("Add any notes..."), "lunch");
    fireEvent.press(getByText("Transit"));
    fireEvent.press(getByText("Groceries"));

    // A background refetch re-renders the parent, which rebuilds `categories`
    // into an equal-but-new array. The same `extractedData` is still open.
    rerender(
      <ReceiptConfirmation
        visible
        extractedData={data}
        categories={CATEGORIES.map((c) => ({ ...c }))}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.press(getByText("Save"));

    // Reverting these to the OCR values would submit an amount the user never
    // entered, without complaint.
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      merchant: "Bodega",
      amount: 19.99,
      categoryId: "cat_groceries",
      notes: "lunch",
    });
  });

  it("says so rather than saving when the budget has no categories", () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ReceiptConfirmation
        visible
        extractedData={extracted()}
        categories={[]}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.press(getByText("Save"));

    expect(onSave).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Choose a category",
      expect.stringContaining("Add a budget category"),
    );
  });
});
