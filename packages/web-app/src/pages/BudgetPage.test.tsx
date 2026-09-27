/**
 * BudgetPage - AiCoachChip Integration Tests
 *
 * Feature: web-app-followups
 *
 * Verifies AiCoachChip renders when a budget exists for the current month,
 * is absent when no budget exists, and navigates to /insights when clicked.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { BudgetPage } from "./BudgetPage";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const budgetWithCategories = {
  month: "2026-01",
  groups: [
    {
      id: "group-income",
      type: "income",
      name: "Income",
      categories: [
        { id: "cat-income", name: "Salary", plannedAmount: 5000, spentAmount: 0, transactions: [] },
      ],
    },
    {
      id: "group-expense",
      type: "expense",
      name: "Expenses",
      categories: [
        { id: "cat-groceries", name: "Groceries", plannedAmount: 400, spentAmount: 500, transactions: [] },
      ],
    },
  ],
};

function mockFetchResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

beforeEach(() => {
  jest.restoreAllMocks();
  window.localStorage.setItem("budgetbuddy_id_token", "test-token");
});

afterEach(() => {
  window.localStorage.clear();
});

describe("BudgetPage - AiCoachChip integration", () => {
  it("renders the AI Coach chip when a budget is loaded for the current month", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockFetchResponse(200, { success: true, data: budgetWithCategories }),
    );

    render(
      <MemoryRouter>
        <BudgetPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Open AI Coach")).toBeInTheDocument();
    });
  });

  it("does not render a visible AI Coach chip when no budget exists for the current month", async () => {
    global.fetch = jest.fn().mockResolvedValue(mockFetchResponse(404, {}));

    render(
      <MemoryRouter>
        <BudgetPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("Open AI Coach")).not.toBeInTheDocument();
    });
  });

  it("navigates to /insights when the chip is clicked", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockFetchResponse(200, { success: true, data: budgetWithCategories }),
    );

    render(
      <MemoryRouter>
        <BudgetPage />
      </MemoryRouter>,
    );

    const chip = await screen.findByLabelText("Open AI Coach");
    await userEvent.click(chip);

    expect(mockNavigate).toHaveBeenCalledWith("/insights");
  });
});