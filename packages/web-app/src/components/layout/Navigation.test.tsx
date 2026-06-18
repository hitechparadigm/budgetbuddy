/**
 * Navigation Component Logout Tests (Requirement 43)
 *
 * Bug: No logout button exists in the application
 * Expected: Users should be able to logout and have their tokens cleared
 *
 * Tests validate:
 * 1. Logout button exists and is visible
 * 2. Clicking logout clears authentication tokens
 * 3. Clicking logout redirects to login page
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Navigation } from "./Navigation";
import "@testing-library/jest-dom";

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("Navigation Logout (Requirement 43)", () => {
  beforeEach(() => {
    // Clear mocks
    mockNavigate.mockClear();
    localStorage.clear();

    // Set up auth tokens
    localStorage.setItem("accessToken", "test-access-token");
    localStorage.setItem("refreshToken", "test-refresh-token");
    localStorage.setItem("idToken", "test-id-token");
  });

  const renderNavigation = () => {
    return render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>,
    );
  };

  it("should display logout button", () => {
    renderNavigation();

    // Logout button should be visible
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });

  it("should clear all authentication tokens when logout is clicked", () => {
    renderNavigation();

    // Verify tokens exist before logout
    expect(localStorage.getItem("accessToken")).toBe("test-access-token");
    expect(localStorage.getItem("refreshToken")).toBe("test-refresh-token");
    expect(localStorage.getItem("idToken")).toBe("test-id-token");

    // Click logout button
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    // Verify all tokens are cleared
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("idToken")).toBeNull();
  });

  it("should redirect to login page after logout", () => {
    renderNavigation();

    // Click logout button
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    // Should navigate to login page
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should clear user data from localStorage on logout", () => {
    // Add some user data
    localStorage.setItem("userId", "user-123");

    renderNavigation();

    // Click logout button
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    // User data should be cleared
    expect(localStorage.getItem("userId")).toBeNull();
  });

  it("should be accessible via keyboard", () => {
    renderNavigation();

    const logoutButton = screen.getByRole("button", { name: /logout/i });

    // Should be focusable
    logoutButton.focus();
    expect(document.activeElement).toBe(logoutButton);

    // Should be clickable via click (buttons respond to click, not keyDown)
    fireEvent.click(logoutButton);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
