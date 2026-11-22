/**
 * AccountsScreen: GET /accounts results, including the onboarding Cash
 * account. The real screen and useAccounts hook run inside a real
 * QueryClientProvider; services/api is the global mock from setup.ts.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AccountsScreen from "../AccountsScreen";
import { api } from "../../services/api";

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
    formatAmountWithCurrency: (amount: number, code?: string) =>
      `${amount.toFixed(2)} ${code ?? ""}`.trim(),
  }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

const renderScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AccountsScreen />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AccountsScreen", () => {
  it("renders the onboarding Cash account", async () => {
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        data: {
          accounts: [
            {
              accountId: "acc_cash",
              accountType: "cash",
              nickname: "Cash",
              currentBalance: 0,
              currency: "USD",
            },
          ],
          count: 1,
        },
      },
    });

    const screen = renderScreen();

    expect(await screen.findByText("Cash")).toBeTruthy();
    expect(screen.getByText("0.00 USD")).toBeTruthy();
    expect(mockedApi.get).toHaveBeenCalledWith("/accounts");
  });

  it("shows credit card balances as negative", async () => {
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: {
        accounts: [
          {
            accountId: "acc_card",
            accountType: "credit_card",
            nickname: "Visa",
            institutionName: "Example Bank",
            currentBalance: 250,
            currency: "CAD",
          },
        ],
      },
    });

    const screen = renderScreen();

    expect(await screen.findByText("Visa")).toBeTruthy();
    expect(screen.getByText("Example Bank")).toBeTruthy();
    expect(screen.getByText("-250.00 CAD")).toBeTruthy();
  });

  it("shows the empty state when there are no accounts", async () => {
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: { success: true, data: { accounts: [], count: 0 } },
    });

    const screen = renderScreen();

    expect(
      await screen.findByText("No accounts yet. Accounts you add on the web appear here.")
    ).toBeTruthy();
  });
});
