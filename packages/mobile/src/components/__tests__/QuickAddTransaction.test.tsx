/**
 * QuickAddTransaction — the submitted request carries `type`.
 *
 * POST /transactions requires `type` ('income' | 'expense'). QuickAdd used to
 * omit it, so every create got a 400. Renders the REAL component and checks the
 * type follows the group of the category the user picked.
 */
import React from "react";
import { Alert } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import QuickAddTransaction, { type QuickAddCategory } from "../QuickAddTransaction";

const CATEGORIES: QuickAddCategory[] = [
  { id: "cat_food", name: "Food", type: "expense" },
  { id: "cat_salary", name: "Salary", type: "income" },
  { id: "cat_rainy", name: "Rainy Day", type: "savings" },
];

function submitWith(categoryId: string) {
  const onSubmit = jest.fn();
  const screen = render(
    <QuickAddTransaction
      visible
      onClose={jest.fn()}
      onSubmit={onSubmit}
      categories={CATEGORIES}
      selectedCategoryId={categoryId}
    />,
  );
  fireEvent.changeText(screen.getByPlaceholderText("Custom amount"), "12.50");
  fireEvent.changeText(screen.getByPlaceholderText("Custom description"), "Lunch");
  fireEvent.press(screen.getByText("Add Transaction"));
  return onSubmit;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

describe("QuickAddTransaction submit", () => {
  it("sends type 'expense' for an expense category", () => {
    const onSubmit = submitWith("cat_food");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      categoryId: "cat_food",
      type: "expense",
      amount: 12.5,
      description: "Lunch",
    });
  });

  it("sends type 'income' for an income category", () => {
    const onSubmit = submitWith("cat_salary");
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      categoryId: "cat_salary",
      type: "income",
    });
  });

  it("sends type 'expense' for a savings category (money going out)", () => {
    const onSubmit = submitWith("cat_rainy");
    expect(onSubmit.mock.calls[0][0].type).toBe("expense");
  });
});
