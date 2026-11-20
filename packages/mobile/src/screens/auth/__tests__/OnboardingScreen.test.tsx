/**
 * OnboardingScreen tests
 *
 * The screen and services/onboarding are both real here; only OnboardingFlow
 * is stubbed, standing in for the user walking the four steps and pressing
 * "Create Budget" with CAD selected. What is asserted is the payload that
 * reaches POST /auth/onboarding: the currency used to be dropped between the
 * flow and the request, which pinned every budget to USD.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { OnboardingScreen } from "../OnboardingScreen";
import { api } from "../../../services/api";

// The factory runs while OnboardingScreen is being imported, i.e. before this
// module's own top-level consts exist, so everything it needs is declared
// inside it.
jest.mock("../../../components/OnboardingFlow", () => {
  // require, not import: a jest.mock factory runs before this module's own
  // imports are evaluated.
  /* eslint-disable @typescript-eslint/no-var-requires */
  const React2 = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  /* eslint-enable @typescript-eslint/no-var-requires */

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
      onSkip: () => void;
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
          { onPress: onSkip },
          React2.createElement(Text, null, "skip"),
        ),
      ),
  };
});

const postMock = api.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  postMock.mockResolvedValue({ data: {}, status: 200 });
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

  it("does not create a budget when the user skips (known gap)", () => {
    const onFinished = jest.fn();
    const { getByText } = render(<OnboardingScreen onFinished={onFinished} />);

    fireEvent.press(getByText("skip"));

    // Documents today's behaviour rather than endorsing it: see the comment
    // on handleSkip. A skipping user lands in the app with no budget.
    expect(postMock).not.toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});
