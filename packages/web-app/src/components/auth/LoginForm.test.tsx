/**
 * LoginForm: a PASSWORD_RESET_REQUIRED login (admin-forced reset) goes straight to
 * the forgot-password code step, because Cognito has already emailed the code.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { LoginForm } from "./LoginForm";
import { ApiClientError, apiClient } from "../../utils/apiClient";

const mockLogin = jest.fn();
const mockClearError = jest.fn();

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    loading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

jest.mock("./GoogleSignInButton", () => ({
  GoogleSignInButton: () => null,
}));

const EMAIL = "reset-user@example.com";

jest.setTimeout(15000);

async function submitLogin() {
  // delay: null types without per-keystroke timers; the full suite runs in parallel
  // and real typing delays pushed these tests past the default timeout.
  const user = userEvent.setup({ delay: null });
  render(<LoginForm />);
  await user.type(screen.getByLabelText("Email Address"), EMAIL);
  await user.type(screen.getByLabelText("Password"), "not-a-real-password");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  return user;
}

describe("LoginForm reset-required routing", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    mockLogin.mockReset();
    mockClearError.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("routes PASSWORD_RESET_REQUIRED to the code step without requesting a new code", async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiClientError(
        "Your password must be reset. Check your email for a code.",
        403,
        "PASSWORD_RESET_REQUIRED",
      ),
    );

    await submitLogin();

    expect(await screen.findByPlaceholderText("6-digit code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password (min 8 chars)")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /password must be reset before you can sign in/i,
    );
    expect(screen.queryByRole("button", { name: "Send Code" })).not.toBeInTheDocument();
    expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("offers resend code, which calls POST /auth/forgot-password for the login email", async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiClientError("reset", 403, "PASSWORD_RESET_REQUIRED"),
    );
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const user = await submitLogin();
    await user.click(await screen.findByRole("button", { name: "Resend code" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/forgot-password$/);
    expect(JSON.parse(init.body)).toEqual({ email: EMAIL });
  });

  it("submits the code to POST /auth/confirm-forgot-password for the login email", async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiClientError("reset", 403, "PASSWORD_RESET_REQUIRED"),
    );
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const user = await submitLogin();
    await user.type(await screen.findByPlaceholderText("6-digit code"), "000000");
    await user.type(
      screen.getByPlaceholderText("New password (min 8 chars)"),
      "another-fake-password",
    );
    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/confirm-forgot-password$/);
    expect(JSON.parse(init.body).email).toBe(EMAIL);
    expect(await screen.findByText(/password reset successfully/i)).toBeInTheDocument();
  });

  it("apiClient.login exposes the body's error field as errorCode", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: "PASSWORD_RESET_REQUIRED",
        message: "Your password must be reset. Check your email for a code.",
      }),
    });

    const failure = await apiClient
      .login({ email: EMAIL, password: "not-a-real-password" })
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiClientError);
    expect((failure as ApiClientError).statusCode).toBe(403);
    expect((failure as ApiClientError).errorCode).toBe("PASSWORD_RESET_REQUIRED");
  });

  it("keeps the generic message for a 401 and does not open the reset flow", async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiClientError("Invalid email or password", 401, "Authentication Failed"),
    );

    await submitLogin();

    expect(
      await screen.findByText("Invalid email or password. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("6-digit code")).not.toBeInTheDocument();
  });
});
