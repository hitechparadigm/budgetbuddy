/**
 * AuthPage: Google sign-in is gated by VITE_ENABLE_GOOGLE_SIGNIN (config.enableGoogleSignIn).
 * Off (the default): no Google button and no Google Identity Services script, on either tab.
 * On: the button renders and the GIS script is injected.
 *
 * The flag is read when the config module loads, so each case loads a fresh module
 * registry (jest.resetModules) after setting the Vite env shim.
 */

import "@testing-library/jest-dom";

// @testing-library/react is required inside each test (fresh registry), where it may
// not register hooks; this file cleans up itself and sets the act environment.
process.env.RTL_SKIP_AUTO_CLEANUP = "true";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: jest.fn(),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    loading: false,
    error: null,
    clearError: jest.fn(),
  }),
}));

type Rtl = typeof import("@testing-library/react");

const GSI_SCRIPT = 'script[src*="accounts.google.com/gsi"]';

let rtl: Rtl | null = null;

/** Render the real AuthPage from a fresh registry with the given flag value. */
function renderAuthPage(flag: string | undefined): Rtl {
  (globalThis as any).__viteEnv = flag === undefined ? {} : { VITE_ENABLE_GOOGLE_SIGNIN: flag };

  // resetModules (not isolateModules): the lazy import('./GoogleSignInButton') resolves
  // after render, and must load from the same registry as this React.
  jest.resetModules();
  const React = require("react");
  const { MemoryRouter } = require("react-router-dom");
  const { AuthPage } = require("./AuthPage");
  const fresh = require("@testing-library/react") as Rtl;
  rtl = fresh;
  fresh.render(React.createElement(MemoryRouter, null, React.createElement(AuthPage)));
  return fresh;
}

describe("AuthPage Google sign-in flag", () => {
  afterEach(() => {
    rtl?.cleanup();
    rtl = null;
    document.querySelectorAll(GSI_SCRIPT).forEach((el) => el.remove());
    (globalThis as any).__viteEnv = {};
  });

  it.each([
    ["unset", undefined],
    ["'false'", "false"],
  ])("hides the Google button and loads no GIS script when the flag is %s", async (_label, flag) => {
    const { screen, fireEvent } = renderAuthPage(flag);

    // Sign In tab
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
    expect(screen.queryByText("Or continue with email")).not.toBeInTheDocument();

    // Sign Up tab
    fireEvent.click(screen.getByRole("tab", { name: "Sign Up" }));
    expect(await screen.findByLabelText("First Name")).toBeInTheDocument();
    expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
    expect(screen.queryByText("Or sign up with email")).not.toBeInTheDocument();

    expect(document.querySelector(GSI_SCRIPT)).toBeNull();
  });

  it("shows the Google button and injects the GIS script when the flag is 'true'", async () => {
    const { screen, fireEvent, waitFor } = renderAuthPage("true");

    expect(await screen.findByTestId("google-signin")).toBeInTheDocument();
    expect(screen.getByText("Or continue with email")).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(GSI_SCRIPT)).not.toBeNull());

    fireEvent.click(screen.getByRole("tab", { name: "Sign Up" }));
    expect(await screen.findByText("Or sign up with email")).toBeInTheDocument();
    expect(await screen.findByTestId("google-signin")).toBeInTheDocument();
  });
});
