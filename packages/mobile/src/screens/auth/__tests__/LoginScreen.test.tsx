/**
 * LoginScreen tests: the routes into the password reset screen.
 *
 * The screen is real; useAuth and the navigation prop are mocked.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "../LoginScreen";

const mockSignIn = jest.fn();

jest.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
    mfaChallenge: null,
    verifyMFA: jest.fn(),
    verifyMFAWithBackupCode: jest.fn(),
    cancelMFAChallenge: jest.fn(),
  }),
}));

const EMAIL = "reset-user@example.com";
const PASSWORD = "not-a-real-password";
const navigate = jest.fn();

const renderScreen = () =>
  render(
    <LoginScreen
      navigation={{ navigate } as never}
      route={{ key: "Login", name: "Login" } as never}
    />,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LoginScreen", () => {
  it("opens the reset code step when sign-in requires a password reset", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockSignIn.mockRejectedValue({
      code: "PasswordResetRequiredException",
      message: "Your password must be reset. Enter the code we emailed you.",
    });
    const screen = renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), EMAIL);
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), PASSWORD);
    fireEvent.press(screen.getByText("Sign In"));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("ForgotPassword", {
        email: EMAIL,
        resetRequired: true,
      }),
    );
    const logged = JSON.stringify([...logSpy.mock.calls, ...errorSpy.mock.calls]);
    expect(logged).not.toContain(PASSWORD);
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("opens the reset screen from the 'Forgot Password?' link", () => {
    const screen = renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), EMAIL);
    fireEvent.press(screen.getByText("Forgot Password?"));
    expect(navigate).toHaveBeenCalledWith("ForgotPassword", { email: EMAIL });
  });

  it("passes no email when the field is empty", () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByText("Forgot Password?"));
    expect(navigate).toHaveBeenCalledWith("ForgotPassword", { email: undefined });
  });
});
