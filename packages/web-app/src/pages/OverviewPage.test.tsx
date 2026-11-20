/**
 * OverviewPage: "spent" figures come from the budget period's actual category
 * spentAmount (what BudgetPage's Spent column sums), never from the planned
 * totalExpenses/totalSavings/remainingBalance on the period record.
 */

import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { OverviewPage } from "./OverviewPage";

const mockGet = jest.fn();

jest.mock("../utils/apiClient", () => ({
  ...jest.requireActual("../utils/apiClient"),
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

/** A freshly onboarded period: $3,550 planned across expenses. */
function onboardedPeriod(spent: { housing: number; groceries: number }) {
  return {
    success: true,
    data: {
      month: "2026-11",
      currency: "USD",
      // Plan sums, as calculateBudgetTotals stores them
      totalIncome: 0,
      totalSavings: 0,
      totalExpenses: 3550,
      remainingBalance: -3550,
      // Stored shape: { income, savings, expenses } category arrays
      groups: {
        income: [{ id: "cat_income", name: "Income", plannedAmount: 0, spentAmount: 0 }],
        savings: [],
        expenses: [
          { id: "cat_housing", name: "Housing", plannedAmount: 2000, spentAmount: spent.housing },
          { id: "cat_groceries", name: "Groceries", plannedAmount: 1550, spentAmount: spent.groceries },
        ],
      },
    },
  };
}

function mockApi(budgetResponse: unknown) {
  mockGet.mockImplementation((url: string) =>
    url.startsWith("/budget/current")
      ? Promise.resolve(budgetResponse)
      : Promise.resolve({ success: true, data: {} }),
  );
}

function renderOverview() {
  return render(
    <MemoryRouter>
      <OverviewPage />
    </MemoryRouter>,
  );
}

/** The StatCard / health-bar cell holding a label and its value. */
function cellOf(label: string, scope: HTMLElement = document.body): HTMLElement {
  return within(scope).getByText(label, { selector: "p" }).parentElement as HTMLElement;
}

describe("OverviewPage spending figures", () => {
  beforeEach(() => {
    mockGet.mockReset();
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    localStorage.clear();
    // Skip the first-visit tooltip chain
    localStorage.setItem("budgetbuddy_welcome_seen", "1");
  });

  it("shows $0 Total Spent and no 'Over budget' when planned expenses > 0 and spent = 0", async () => {
    mockApi(onboardedPeriod({ housing: 0, groceries: 0 }));
    renderOverview();

    const health = await screen.findByRole("region", { name: "Financial health summary" });
    expect(await within(cellOf("Total Spent")).findByText("$0")).toBeInTheDocument();
    expect(within(cellOf("Spent", health)).getByText("$0")).toBeInTheDocument();
    expect(within(health).getByText("On track")).toBeInTheDocument();
    expect(screen.queryByText("Over budget")).not.toBeInTheDocument();
    expect(within(health).getByText("0% of income spent")).toBeInTheDocument();
    // The planned $3,550 is not presented as spending anywhere on the page
    expect(screen.queryByText("$3,550")).not.toBeInTheDocument();
  });

  it("uses the categories' actual spentAmount for Total Spent and top categories", async () => {
    mockApi(onboardedPeriod({ housing: 120, groceries: 30 }));
    renderOverview();

    await screen.findByRole("region", { name: "Financial health summary" });
    expect(await within(cellOf("Total Spent")).findByText("$150")).toBeInTheDocument();
    expect(screen.getByText("$120 / $2,000")).toBeInTheDocument();
    expect(screen.getByText("$30 / $1,550")).toBeInTheDocument();
    // Income is $0, so $150 of actual spending is over budget
    expect(screen.getByText("Over budget")).toBeInTheDocument();
  });
});
