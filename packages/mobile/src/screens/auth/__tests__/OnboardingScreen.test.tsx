/**
 * OnboardingScreen tests
 *
 * The screen and services/onboarding are both real here; only OnboardingFlow
 * is stubbed, standing in for the user walking the four steps and pressing
 * "Create Budget" with CAD selected, or pressing "Skip for now" before a
 * location was detected. What is asserted is the payload that reaches
 * POST /auth/onboarding: the currency used to be dropped between the flow and
 * the request, which pinned every budget to USD, and skipping used to create
 * no budget at all.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { getLocales } from "expo-localization";
import { OnboardingScreen } from "../OnboardingScreen";
import { api } from "../../../services/api";

// The factory runs while OnboardingScreen is being imported, i.e. before this
// module's own top-level consts exist, so everything it needs is declared
// inside it.
jest.mock("../../../components/OnboardingFlow", () => {
  // require, not import: a jest.mock factory runs before this module's own
  // imports are evaluated.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const React2 = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  const suggestions = {
    city: "Toronto",
    country: "Canada",
    familySize: 3,
    classification: "high",
    categories: [],
    totalMonthlyBudget: 4200,
  };
  const selected = [{ name: "Housing", icon: "H", adjustedAmount: 1800 }];

  return {
    OnboardingFlow: ({
      onComplete,
      onSkip,
    }: {
      onComplete: (s: unknown, c: unknown, currency: string) => void;
      onSkip: (context: { location: null }) => void;
    }) =>
      React2.createElement(
        React2.Fragment,
        null,
        React2.createElement(
          TouchableOpacity,
          { onPress: () => onComplete(suggestions, selected, "CAD") },
          React2.createElement(Text, null, "finish"),
        ),
        React2.createElement(
          TouchableOpacity,
          { onPress: () => onSkip({ location: null }) },
          React2.createElement(Text, null, "skip"),
        ),
      ),
  };
});

const postMock = api.post as jest.Mock;
const getLocalesMock = getLocales as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  postMock.mockResolvedValue({ data: {}, status: 200 });
  getLocalesMock.mockReturnValue([{ languageTag: "en-US", currencyCode: "USD" }]);
});

describe("OnboardingScreen", () => {
  it("sends the currency the user selected", async () => {
    const onFinished = jest.fn();
    const { getByText } = render(<OnboardingScreen onFinished={onFinished} />);

    fireEvent.press(getByText("finish"));

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));

    const [endpoint, body] = postMock.mock.calls[0];
    expect(endpoint).toBe("/auth/onboarding");
    expect(body.currency).toBe("CAD");
    expect(body).toMatchObject({
      city: "Toronto",
      country: "Canada",
      familySize: 3,
      budgetType: "personal",
    });
    await waitFor(() => expect(onFinished).toHaveBeenCalled());
  });

  it("surfaces a failure instead of pretending the budget exists", async () => {
    const onFinished = jest.fn();
    postMock.mockRejectedValue(
      Object.assign(new Error("Server error"), { status: 500 }),
    );

    const { getByText } = render(<OnboardingScreen onFinished={onFinished} />);
    fireEvent.press(getByText("finish"));

    await waitFor(() => expect(getByText("Server error")).toBeTruthy());
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("treats a 409 as done, because the budget already exists", async () => {
    const onFinished = jest.fn();
    postMock.mockRejectedValue(
      Object.assign(new Error("Budget already exists"), { status: 409 }),
    );

    const { getByText } = render(<OnboardingScreen onFinished={onFinished} />);
    fireEvent.press(getByText("finish"));

    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
  });

  describe("Skip for now", () => {
    it("creates a default personal budget in the device currency", async () => {
      getLocalesMock.mockReturnValue([{ languageTag: "en-CA", currencyCode: "CAD" }]);
      const onFinished = jest.fn();
      const { getByText } = render(<OnboardingScreen onFinished={onFinished} />);

      fireEvent.press(getByText("skip"));

      await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
      const [endpoint, body] = postMock.mock.calls[0];
      expect(endpoint).toBe("/auth/onboarding");
      expect(body).toMatchObject({
        familySize: 1,
        budgetType: "personal",
        currency: "CAD",
      });
      expect(body.currentMonth).toMatch(/^\d{4}-\d{2}$/);
      expect(body.selectedCategories.length).toBeGreaterThanOrEqual(1);
      expect(typeof body.city).toBe("string");
      await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    });

    it("treats a 409 as done", async () => {
      postMock.mockRejectedValue(
        Object.assign(new Error("Budget already exists"), { status: 409 }),
      );
      const onFinished = jest.fn();
      const { getByText } = render(<OnboardingScreen onFinished={onFinished} />);

      fireEvent.press(getByText("skip"));

      await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    });

    it("shows the error and stays on onboarding when the request fails", async () => {
      postMock.mockRejectedValue(
        Object.assign(new Error("Server error"), { status: 500 }),
      );
      const onFinished = jest.fn();
      const { getByText } = render(<OnboardingScreen onFinished={onFinished} />);

      fireEvent.press(getByText("skip"));

      await waitFor(() => expect(getByText("Server error")).toBeTruthy());
      expect(onFinished).not.toHaveBeenCalled();
    });

    it("sends USD when the device currency is not supported", async () => {
      getLocalesMock.mockReturnValue([{ languageTag: "xx-XX", currencyCode: "XXX" }]);
      const { getByText } = render(<OnboardingScreen onFinished={jest.fn()} />);

      fireEvent.press(getByText("skip"));

      await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
      expect(postMock.mock.calls[0][1].currency).toBe("USD");
    });
  });
});
