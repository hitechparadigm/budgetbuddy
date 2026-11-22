/**
 * AuthProvider tests: onboarding routing after sign-in.
 *
 * The provider is real; authService is mocked. After a successful sign-in the
 * provider reads GET /auth/profile (authService.getProfile) and routes to
 * onboarding unless onboardingCompleted is true. A failed profile call must
 * not block entry.
 */
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../AuthContext";
import { authService } from "../../services/auth";

jest.mock("../../services/auth", () => ({
  authService: {
    isAuthenticated: jest.fn(() => Promise.resolve(false)),
    getCurrentUser: jest.fn(() => Promise.resolve(null)),
    getCurrentTokens: jest.fn(() => Promise.resolve(null)),
    getMFAStatus: jest.fn(() => Promise.resolve({ enabled: false })),
    signInUser: jest.fn(),
    getProfile: jest.fn(),
    signOutUser: jest.fn(() => Promise.resolve()),
    refreshTokens: jest.fn(),
  },
}));

const mocked = authService as unknown as Record<string, jest.Mock>;

const CREDENTIALS = { email: "user@example.com", password: "not-a-real-password" };

const Probe: React.FC = () => {
  const { signIn, isAuthenticated, needsOnboarding } = useAuth();
  return (
    <>
      <TouchableOpacity onPress={() => signIn(CREDENTIALS)}>
        <Text>sign in</Text>
      </TouchableOpacity>
      <Text testID="state">
        {`${isAuthenticated ? "in" : "out"}:${needsOnboarding ? "onboard" : "app"}`}
      </Text>
    </>
  );
};

const signInAndRead = async (): Promise<string> => {
  const screen = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(mocked.isAuthenticated).toHaveBeenCalled());
  fireEvent.press(screen.getByText("sign in"));
  await waitFor(() =>
    expect(String(screen.getByTestId("state").props.children)).toMatch(/^in:/),
  );
  return String(screen.getByTestId("state").props.children);
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.signInUser.mockResolvedValue({
    user: { id: "user_test", email: CREDENTIALS.email, emailVerified: true, createdAt: "" },
    tokens: { accessToken: "<TOKEN>", refreshToken: "<TOKEN>", idToken: "<TOKEN>" },
  });
});

describe("AuthProvider onboarding check", () => {
  it("routes to onboarding when the profile has not completed it", async () => {
    mocked.getProfile.mockResolvedValue({ onboardingCompleted: false });
    expect(await signInAndRead()).toBe("in:onboard");
    expect(mocked.getProfile).toHaveBeenCalledTimes(1);
  });

  it("routes to the app when onboarding is complete", async () => {
    mocked.getProfile.mockResolvedValue({ onboardingCompleted: true });
    expect(await signInAndRead()).toBe("in:app");
  });

  it("does not block entry when the profile call fails", async () => {
    mocked.getProfile.mockRejectedValue(new Error("Server error"));
    expect(await signInAndRead()).toBe("in:app");
  });

  it("does not read the profile while restoring a session", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(mocked.isAuthenticated).toHaveBeenCalled());
    expect(mocked.getProfile).not.toHaveBeenCalled();
  });
});
