/**
 * ForgotPasswordScreen tests
 *
 * The screen and services/passwordReset are real; only fetch and the
 * navigation props are mocked. Asserts the exact requests the web reset flow
 * sends, the reset-required entry point, client-side checks, and that the
 * code and password never reach the console.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ForgotPasswordScreen } from "../ForgotPasswordScreen";
import { apiBaseUrl } from "../../../config/api";

const EMAIL = "reset-user@example.com";
const CODE = "135790";
const NEW_PASSWORD = "fake-new-pass-1";

const fetchMock = jest.fn();
const navigate = jest.fn();

const renderScreen = (params?: { email?: string; resetRequired?: boolean }) =>
  render(
    <ForgotPasswordScreen
      navigation={{ navigate } as never}
      route={{ key: "ForgotPassword", name: "ForgotPassword", params } as never}
    />,
  );

const respond = (status: number, body: unknown = {}) =>
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });

const bodyOf = (call: unknown[]) => JSON.parse((call[1] as { body: string }).body);

let logSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  const logged = JSON.stringify([...logSpy.mock.calls, ...errorSpy.mock.calls]);
  expect(logged).not.toContain(CODE);
  expect(logged).not.toContain(NEW_PASSWORD);
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

async function enterCodeAndPassword(
  screen: ReturnType<typeof renderScreen>,
  password = NEW_PASSWORD,
) {
  fireEvent.changeText(screen.getByTestId("forgot-code-input"), CODE);
  fireEvent.changeText(screen.getByTestId("forgot-new-password-input"), password);
  fireEvent.press(screen.getByTestId("forgot-submit"));
}

describe("ForgotPasswordScreen", () => {
  it("sends the reset code request and moves to the code step", async () => {
    respond(200, { message: "sent" });
    const screen = renderScreen();
    fireEvent.changeText(screen.getByTestId("forgot-email-input"), ` ${EMAIL} `);
    fireEvent.press(screen.getByTestId("forgot-send-code"));

    await waitFor(() => expect(screen.getByTestId("forgot-code-input")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${apiBaseUrl}/auth/forgot-password`);
    expect(init.method).toBe("POST");
    expect(bodyOf(fetchMock.mock.calls[0])).toEqual({ email: EMAIL });
  });

  it("requires an email before sending", () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByTestId("forgot-send-code"));
    expect(screen.getByTestId("forgot-error")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("confirms the reset and returns to sign in", async () => {
    respond(200);
    respond(200, { message: "reset" });
    const screen = renderScreen({ email: EMAIL });
    fireEvent.press(screen.getByTestId("forgot-send-code"));
    await waitFor(() => expect(screen.getByTestId("forgot-code-input")).toBeTruthy());

    await enterCodeAndPassword(screen);
    await waitFor(() => expect(screen.getByTestId("forgot-done-signin")).toBeTruthy());

    const [url] = fetchMock.mock.calls[1];
    expect(url).toBe(`${apiBaseUrl}/auth/confirm-forgot-password`);
    expect(bodyOf(fetchMock.mock.calls[1])).toEqual({
      email: EMAIL,
      code: CODE,
      newPassword: NEW_PASSWORD,
    });

    fireEvent.press(screen.getByTestId("forgot-done-signin"));
    expect(navigate).toHaveBeenCalledWith("Login");
  });

  it("shows the server's message when the confirm fails", async () => {
    respond(400, { message: "Invalid verification code" });
    const screen = renderScreen({ email: EMAIL, resetRequired: true });
    await enterCodeAndPassword(screen);
    await waitFor(() =>
      expect(screen.getByText("Invalid verification code")).toBeTruthy(),
    );
    expect(screen.queryByTestId("forgot-done-signin")).toBeNull();
  });

  it("starts on the code step with a banner when a reset is required", () => {
    const screen = renderScreen({ email: EMAIL, resetRequired: true });
    expect(screen.getByTestId("forgot-reset-required-banner")).toBeTruthy();
    expect(screen.getByTestId("forgot-code-input")).toBeTruthy();
    expect(screen.queryByTestId("forgot-email-input")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters without a request", async () => {
    const screen = renderScreen({ email: EMAIL, resetRequired: true });
    await enterCodeAndPassword(screen, "short-7");
    expect(screen.getByTestId("forgot-error")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("goes back to the email step from 'Send a new code'", () => {
    const screen = renderScreen({ email: EMAIL, resetRequired: true });
    fireEvent.press(screen.getByTestId("forgot-resend-link"));
    expect(screen.getByTestId("forgot-email-input")).toBeTruthy();
  });
});
