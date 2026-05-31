/**
 * Theme Context
 *
 * Provides theme management with light/dark/system modes.
 * Persists user preference and detects system preference changes.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
};

const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
};

// Safe localStorage helpers — Edge private mode blocks localStorage
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    // Check localStorage for saved theme mode
    const savedMode = safeGetItem("budgetbuddy-theme-mode") as ThemeMode;
    if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
      // Apply theme immediately during initialization to prevent flash
      const resolved = resolveTheme(savedMode);
      if (resolved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return savedMode;
    }
    // Default to system preference - apply immediately
    const systemTheme = getSystemTheme();
    if (systemTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return "system";
  });

  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(mode));

  // Apply theme to document
  const applyTheme = useCallback((resolvedTheme: ResolvedTheme) => {
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Update theme when mode changes
  useEffect(() => {
    const resolved = resolveTheme(mode);
    setTheme(resolved);
    applyTheme(resolved);
    safeSetItem("budgetbuddy-theme-mode", mode);
  }, [mode, applyTheme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light";
      setTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode, applyTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const toggleTheme = () => {
    // Cycle through: light -> dark -> system -> light
    setModeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
