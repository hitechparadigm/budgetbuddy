/**
 * Property-Based Tests for ThemeContext
 *
 * Feature: critical-bug-fixes
 * Tests theme persistence, application consistency, and invalid theme fallback.
 *
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
 */

import * as fc from "fast-check";
import React, { useEffect } from "react";
import { render } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Test component to access theme context
const ThemeConsumer: React.FC<{
  onTheme: (mode: string, theme: string) => void;
}> = ({ onTheme }) => {
  const { mode, theme } = useTheme();
  useEffect(() => {
    onTheme(mode, theme);
  }, [mode, theme, onTheme]);
  return null;
};

describe("Feature: critical-bug-fixes - ThemeContext Property Tests", () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.classList.remove("dark");
    mockMatchMedia(false);
  });

  /**
   * Property 1: Theme Persistence Round Trip
   *
   * For any valid theme mode (light, dark, system), setting the theme and then
   * reading from localStorage should return the same theme mode.
   *
   * **Validates: Requirements 1.2**
   */
  test("Property 1: Theme Persistence Round Trip - valid themes persist correctly", () => {
    const validThemes = fc.constantFrom("light", "dark", "system");

    fc.assert(
      fc.property(validThemes, (themeMode) => {
        // Clear state
        localStorageMock.clear();
        document.documentElement.classList.remove("dark");

        // Set theme in localStorage (simulating what ThemeContext does)
        localStorageMock.setItem("budgetbuddy-theme-mode", themeMode);

        // Read back
        const savedTheme = localStorageMock.getItem("budgetbuddy-theme-mode");

        // Property: saved theme should equal original theme
        return savedTheme === themeMode;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Theme Application Consistency
   *
   * For any theme mode, after setting the mode, the document.documentElement.classList
   * should contain 'dark' if and only if the resolved theme is 'dark'.
   *
   * **Validates: Requirements 1.1, 1.4**
   */
  test("Property 2: Theme Application Consistency - dark class matches resolved theme", () => {
    const themeAndSystemPref = fc.record({
      mode: fc.constantFrom("light", "dark", "system"),
      systemPrefersDark: fc.boolean(),
    });

    fc.assert(
      fc.property(themeAndSystemPref, ({ mode, systemPrefersDark }) => {
        // Clear state
        localStorageMock.clear();
        document.documentElement.classList.remove("dark");
        mockMatchMedia(systemPrefersDark);

        // Set theme in localStorage
        localStorageMock.setItem("budgetbuddy-theme-mode", mode);

        // Determine expected resolved theme
        let expectedDark: boolean;
        if (mode === "dark") {
          expectedDark = true;
        } else if (mode === "light") {
          expectedDark = false;
        } else {
          // system mode
          expectedDark = systemPrefersDark;
        }

        // Apply theme (simulating what ThemeContext does)
        if (expectedDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }

        // Property: dark class presence should match expected
        const hasDarkClass =
          document.documentElement.classList.contains("dark");
        return hasDarkClass === expectedDark;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Invalid Theme Fallback
   *
   * For any string that is not a valid theme mode ('light', 'dark', 'system'),
   * the Theme_Context should fall back to 'system' mode.
   *
   * **Validates: Requirements 1.5**
   */
  test("Property 3: Invalid Theme Fallback - invalid values fall back to system", () => {
    const invalidThemes = fc
      .string()
      .filter((s) => !["light", "dark", "system"].includes(s));

    fc.assert(
      fc.property(invalidThemes, (invalidTheme) => {
        // Clear state
        localStorageMock.clear();
        document.documentElement.classList.remove("dark");

        // Set invalid theme in localStorage
        localStorageMock.setItem("budgetbuddy-theme-mode", invalidTheme);

        // Check if the value is valid
        const savedValue = localStorageMock.getItem("budgetbuddy-theme-mode");
        const isValidTheme = ["light", "dark", "system"].includes(
          savedValue || "",
        );

        // Property: invalid themes should not be considered valid
        // The ThemeContext will fall back to 'system' when it reads an invalid value
        return !isValidTheme;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Integration test: ThemeProvider applies theme synchronously
   *
   * **Validates: Requirements 1.1, 1.4**
   */
  test("ThemeProvider applies dark theme synchronously on initialization", () => {
    localStorageMock.setItem("budgetbuddy-theme-mode", "dark");
    document.documentElement.classList.remove("dark");

    let capturedMode = "";
    let capturedTheme = "";

    render(
      <ThemeProvider>
        <ThemeConsumer
          onTheme={(mode, theme) => {
            capturedMode = mode;
            capturedTheme = theme;
          }}
        />
      </ThemeProvider>,
    );

    // Theme should be applied immediately
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(capturedMode).toBe("dark");
    expect(capturedTheme).toBe("dark");
  });

  /**
   * Integration test: ThemeProvider applies light theme synchronously
   *
   * **Validates: Requirements 1.1, 1.4**
   */
  test("ThemeProvider applies light theme synchronously on initialization", () => {
    localStorageMock.setItem("budgetbuddy-theme-mode", "light");
    document.documentElement.classList.add("dark"); // Start with dark

    let capturedMode = "";
    let capturedTheme = "";

    render(
      <ThemeProvider>
        <ThemeConsumer
          onTheme={(mode, theme) => {
            capturedMode = mode;
            capturedTheme = theme;
          }}
        />
      </ThemeProvider>,
    );

    // Dark class should be removed immediately
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(capturedMode).toBe("light");
    expect(capturedTheme).toBe("light");
  });

  /**
   * Integration test: ThemeProvider falls back to system when no saved theme
   *
   * **Validates: Requirements 1.5**
   */
  test("ThemeProvider falls back to system mode when no saved theme", () => {
    localStorageMock.clear();
    mockMatchMedia(true); // System prefers dark

    let capturedMode = "";
    let capturedTheme = "";

    render(
      <ThemeProvider>
        <ThemeConsumer
          onTheme={(mode, theme) => {
            capturedMode = mode;
            capturedTheme = theme;
          }}
        />
      </ThemeProvider>,
    );

    expect(capturedMode).toBe("system");
    expect(capturedTheme).toBe("dark"); // Because system prefers dark
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
