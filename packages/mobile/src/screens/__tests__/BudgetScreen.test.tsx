/**
 * BudgetScreen on the monthly-period model.
 *
 * The real screen and the real budgetPeriod hooks run inside a real
 * QueryClientProvider. Only the HTTP clients (global mock of services/api),
 * the currency context, offline sync and the QuickAdd modal are stubbed; the
 * stub calls onSubmit with a fixed transaction for the preselected category.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BudgetScreen from "../BudgetScreen";
import { api, budgetsApi } from "../../services/api";
import { monthKey } from "../../services/budgetPeriod";

jest.unmock("@tanstack/react-query");

jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual("react-native");
  return {
    ...jest.requireActual("react-native-safe-area-context"),
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock("../../contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    formatAmount: (amount: number) => `$${amount.toFixed(2)}`,
    formatAmountWithCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  }),
}));

jest.mock("../../hooks/useOfflineSync", () => ({
  useOfflineSync: () => ({
    syncStatus: { isOnline: true, pendingItems: 0 },
    triggerSync: jest.fn(),
  }),
}));

jest.mock("../../components/ConnectionStatus", () => () => null);

jest.mock("../../components/QuickAddTransaction", () => {
  const React = jest.requireActual("react");
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: ({
      visible,
      onSubmit,
      selectedCategoryId,
    }: {
      visible: boolean;
      onSubmit: (data: unknown) => void;
      selectedCategoryId?: string;
    }) =>
      visible
        ? React.createElement(
            Pressable,
            {
              testID: "stub-submit",
              onPress: () =>
                onSubmit({
                  categoryId: selectedCategoryId,
                  amount: 25,
                  description: "Lunch",
                  date: "2026-11-20",
                }),
            },
            React.createElement(Text, null, `stub:${selectedCategoryId}`)
          )
        : null,
  };
});

const mockedApi = api as jest.Mocked<typeof api>;
const mockedBudgetsApi = budgetsApi as jest.Mocked<typeof budgetsApi>;

const now = new Date();
const MONTH = monthKey(now.getFullYear(), now.getMonth() + 1);

const makeBody = () => ({
  success: true,
  data: {
    budgetId: "budget_test",
    month: MONTH,
    totalIncome: 5000,
    totalSavings: 500,
    totalExpenses: 1200,
    remainingBalance: 3300,
    isAIGenerated: false,
    groups: {
      income: [
        { id: "inc", name: "Salary", icon: "I", plannedAmount: 5000, spentAmount: 0, transactions: [] },
      ],
      savings: [
        { id: "sav", name: "Emergency Fund", icon: "S", plannedAmount: 500, spentAmount: 100, transactions: [] },
      ],
      expenses: [
        {
          id: "food",
          name: "Groceries",
          icon: "G",
          plannedAmount: 400,
          spentAmount: 120,
          transactions: [
            {
              id: "transaction_1",
              categoryId: "food",
              amount: 120,
              description: "Weekly shop",
              date: `${MONTH}-02`,
              createdAt: `${MONTH}-02T10:00:00.000Z`,
            },
          ],
          rollover: { enabled: true },
        },
        { id: "rent", name: "Rent", icon: "R", plannedAmount: 800, spentAmount: 800, transactions: [] },
      ],
    },
  },
});

const renderScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BudgetScreen />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.get.mockImplementation(() =>
    Promise.resolve({ status: 200, data: makeBody() })
  );
  mockedApi.post.mockImplementation(() => Promise.resolve({ status: 200, data: {} }));
});

describe("BudgetScreen", () => {
  it("loads the month from GET /budget/current and shows categories with spent amounts", async () => {
    const screen = renderScreen();

    expect(await screen.findByText("Groceries")).toBeTruthy();
    expect(screen.getByText("Salary")).toBeTruthy();
    expect(screen.getByText("Emergency Fund")).toBeTruthy();
    expect(screen.getByText("Rent")).toBeTruthy();
    expect(screen.getByTestId("spent-food").props.children).toBe("$120.00");
    expect(screen.getByTestId("spent-rent").props.children).toBe("$800.00");
    expect(mockedApi.get).toHaveBeenCalledWith("/budget/current", { month: MONTH });
  });

  it("records 25 on a category by posting /budget with only that category changed", async () => {
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId("category-food"));
    fireEvent.press(await screen.findByTestId("stub-submit"));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(1));
    const [endpoint, body] = mockedApi.post.mock.calls[0];
    expect(endpoint).toBe("/budget");
    expect(Object.keys(body).sort()).toEqual(["groups", "isAIGenerated", "month"]);
    expect(body.month).toBe(MONTH);
    expect(body.isAIGenerated).toBe(false);

    const original = makeBody().data.groups;
    const food = body.groups.expenses.find((c: { id: string }) => c.id === "food");
    expect(food.spentAmount).toBe(145);
    expect(food.transactions).toHaveLength(2);
    expect(food.transactions[1]).toMatchObject({
      categoryId: "food",
      amount: 25,
      description: "Lunch",
      date: "2026-11-20",
    });
    expect(food.rollover).toEqual({ enabled: true });
    expect(body.groups.expenses[1]).toEqual(original.expenses[1]);
    expect(body.groups.income).toEqual(original.income);
    expect(body.groups.savings).toEqual(original.savings);

    // The period query is invalidated, so the month is read again.
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledTimes(2));
  });

  it("never calls the budgets (collaboration) gateway", async () => {
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId("category-rent"));
    fireEvent.press(await screen.findByTestId("stub-submit"));
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(1));

    expect(mockedBudgetsApi.get).not.toHaveBeenCalled();
    expect(mockedBudgetsApi.post).not.toHaveBeenCalled();
    expect(mockedBudgetsApi.put).not.toHaveBeenCalled();
    expect(mockedBudgetsApi.delete).not.toHaveBeenCalled();
  });

  it("shows the server message and a Retry button when the month cannot load", async () => {
    mockedApi.get.mockImplementation(() =>
      Promise.reject(new Error("No budget found for this user"))
    );
    const screen = renderScreen();

    expect(await screen.findByText("No budget found for this user")).toBeTruthy();
    fireEvent.press(screen.getByText("Retry"));
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledTimes(2));
  });
});
