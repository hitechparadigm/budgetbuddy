/**
 * ThemeToggle Component
 *
 * A toggle component for switching between light, dark, and system themes.
 * Shows current theme mode with visual indicator.
 */

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = true,
  className = "",
}) => {
  const { mode, theme, setMode } = useTheme();

  const modes = [
    { value: "light" as const, icon: "☀️", label: "Light" },
    { value: "dark" as const, icon: "🌙", label: "Dark" },
    { value: "system" as const, icon: "💻", label: "System" },
  ];

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300">
            Theme
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
            Currently: {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </span>
        </div>
      )}

      <div className="flex gap-2 p-1 bg-[var(--color-muted)] dark:bg-gray-800 rounded-lg">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              mode === m.value
                ? "bg-[var(--color-surface)] dark:bg-gray-700 text-[var(--color-foreground)] dark:text-white shadow-sm"
                : "text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] dark:hover:text-white"
            }`}
            aria-pressed={mode === m.value}
            aria-label={`Set theme to ${m.label}`}
          >
            <span>{m.icon}</span>
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeToggle;
