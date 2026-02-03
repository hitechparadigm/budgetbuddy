/**
 * Unit Tests for FamilySettings Component
 *
 * Tests error handling, loading states, and user feedback.
 *
 * **Validates: Requirements 6.1, 6.6**
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock localStorage
const mockLocalStorage: Record<string, string | null> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockLocalStorage).forEach(
      (key) => delete mockLocalStorage[key],
    );
  }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

// Import component after mocks
import { FamilySettings } from "./FamilySettings";

describe("FamilySettings Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorage).forEach(
      (key) => delete mockLocalStorage[key],
    );
    mockLocalStorage["budgetbuddy_id_token"] = "mock-token";
    mockLocalStorage["budgetbuddy_user"] = JSON.stringify({
      userId: "user-123",
    });
  });

  describe("Token Handling", () => {
    it("should show error when token is missing", async () => {
      delete mockLocalStorage["budgetbuddy_id_token"];

      await act(async () => {
        render(<FamilySettings />);
      });

      // Component should show authentication error - "Please log in to view family members"
      await waitFor(() => {
        expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
      });
    });

    it("should use id_token for API calls", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { members: [], familyId: "test-family" },
            members: [],
          }),
      });

      await act(async () => {
        render(<FamilySettings />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Verify Authorization header uses the token
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe("Bearer mock-token");
    });
  });

  describe("API Error Display", () => {
    it("should display error message on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            success: false,
            message: "Server error occurred",
          }),
      });

      await act(async () => {
        render(<FamilySettings />);
      });

      // Component shows "Failed to load family members" on error
      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load family members/i),
        ).toBeInTheDocument();
      });
    });

    it("should display network error message", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await act(async () => {
        render(<FamilySettings />);
      });

      // Component shows the error message from the TypeError
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
      });
    });
  });

  describe("Success Message Display", () => {
    it("should display success message after sending invitation", async () => {
      // Mock initial members fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            members: [],
            pendingInvitations: [],
          }),
      });

      await act(async () => {
        render(<FamilySettings />);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Click the Invite Member button to show the form
      const inviteButton = screen.getByRole("button", {
        name: /Invite Member/i,
      });
      await act(async () => {
        fireEvent.click(inviteButton);
      });

      // Find and fill the email input
      const emailInput = screen.getByPlaceholderText(/partner@example.com/i);
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      });

      // Mock invitation send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { invitationId: "inv-123", email: "test@example.com" },
            message: "Invitation sent successfully!",
          }),
      });

      // Mock members refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            members: [],
            pendingInvitations: [],
          }),
      });

      // Find and click the send button
      const sendButton = screen.getByRole("button", {
        name: /Send Invitation/i,
      });
      await act(async () => {
        fireEvent.click(sendButton);
      });

      // Wait for success message
      await waitFor(() => {
        expect(
          screen.getByText(/Invitation sent to test@example.com/i),
        ).toBeInTheDocument();
      });
    });

    it("should display success message after removing member", async () => {
      // Mock initial members fetch with one member
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            members: [
              {
                userId: "user-456",
                email: "member@example.com",
                name: "Test Member",
                role: "spouse",
                joinedAt: new Date().toISOString(),
              },
            ],
            pendingInvitations: [],
          }),
      });

      await act(async () => {
        render(<FamilySettings />);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("member@example.com")).toBeInTheDocument();
      });

      // Mock confirm dialog
      mockConfirm.mockReturnValueOnce(true);

      // Mock member removal
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { removedUserId: "user-456" },
            message: "Member removed successfully",
          }),
      });

      // Mock members refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            members: [],
            pendingInvitations: [],
          }),
      });

      // Find and click the remove button
      const removeButton = screen.getByRole("button", { name: /Remove/i });
      await act(async () => {
        fireEvent.click(removeButton);
      });

      // Wait for success message
      await waitFor(() => {
        expect(
          screen.getByText(/has been removed from your family/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading spinner while fetching members", async () => {
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(fetchPromise);

      await act(async () => {
        render(<FamilySettings />);
      });

      // Should show loading spinner (animate-spin class)
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();

      // Resolve the fetch
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              members: [],
              pendingInvitations: [],
            }),
        });
      });

      // Loading spinner should disappear
      await waitFor(() => {
        expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
      });
    });
  });
});
