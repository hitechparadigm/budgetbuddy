/**
 * TransactionsScreen — every POST /transactions create carries `type`.
 *
 * The real screen runs; the create mutation, the budgets query and the heavy
 * child components are stubbed. The receipt-confirmation and transaction-form
 * stubs call the screen's real onSave/onSubmit handlers, so the assertions see
 * exactly what the screen hands to createTransaction.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import TransactionsScreen from "../TransactionsScreen";

const mockCreate = jest.fn();

jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual("react-native");
  return {
    ...jest.requireActual("react-native-safe-area-context"),
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock("../../services/transaction", () => ({
  ...jest.requireActual("../../services/transaction"),
  useTransactions: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
  useCreateTransaction: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateTransaction: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteTransaction: () => ({ mutate: jest.fn() }),
}));

// Category ids come from budgets (category id === budget id).
jest.mock("../../services/budget", () => ({
  useBudgets: () => ({
    data: [
      { id: "b_food", name: "Food", type: "expense", frequency: "monthly", amount: 400 },
      { id: "b_salary", name: "Salary", type: "income", frequency: "monthly", amount: 5000 },
    ],
  }),
}));

/** A stub whose button calls `props[prop](payload)` on the screen's handler. */
function mockStubCalling(testID: string, prop: string, payload: Record<string, unknown>) {
  const React = jest.requireActual("react");
  const { Pressable } = jest.requireActual("react-native");
  return (props: Record<string, (data: unknown) => void>) =>
    React.createElement(Pressable, { testID, onPress: () => props[prop](payload) });
}

jest.mock("../../components/ReceiptConfirmation", () => ({
  ReceiptConfirmation: mockStubCalling("stub-receipt-save", "onSave", {
    merchant: "Corner Store",
    date: "2026-11-20",
    amount: 42.5,
    categoryId: "b_food",
  }),
}));
jest.mock("../../components/TransactionForm", () => ({
  __esModule: true,
  default: mockStubCalling("stub-form-submit", "onSubmit", {
    categoryId: "b_salary",
    amount: 5000,
    description: "Paycheck",
    date: "2026-11-20",
  }),
}));
jest.mock("../../components/ReceiptScanner", () => ({ ReceiptScanner: () => null }));
jest.mock("../../components/TransactionTemplateModal", () => () => null);
jest.mock("../../components/TransactionList", () => () => null);
jest.mock("../../components/SearchBar", () => () => null);
jest.mock("../../components/FilterSheet", () => ({
  __esModule: true,
  default: () => null,
  DEFAULT_FILTERS: jest.requireActual("../../components/FilterSheet").DEFAULT_FILTERS,
}));

beforeEach(() => {
  mockCreate.mockClear();
});

describe("TransactionsScreen creates", () => {
  it("files a scanned receipt as an expense", () => {
    const screen = render(<TransactionsScreen />);
    fireEvent.press(screen.getByTestId("stub-receipt-save"));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      categoryId: "b_food",
      type: "expense",
      amount: 42.5,
      merchant: "Corner Store",
    });
  });

  it("derives the form create's type from the chosen category's group", () => {
    const screen = render(<TransactionsScreen />);
    fireEvent.press(screen.getByTestId("stub-form-submit"));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      categoryId: "b_salary",
      type: "income",
    });
  });
});
