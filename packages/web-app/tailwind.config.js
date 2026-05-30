/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design token references via CSS custom properties
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        surface: "var(--color-surface)",
        "surface-foreground": "var(--color-surface-foreground)",
        border: "var(--color-border)",
        muted: "var(--color-muted)",
        "muted-foreground": "var(--color-muted-foreground)",
        accent: "var(--color-accent)",
        "accent-foreground": "var(--color-accent-foreground)",
        destructive: "var(--color-destructive)",
        "destructive-foreground": "var(--color-destructive-foreground)",
        // Semantic colors (still available for gradual migration)
        primary: {
          50: "#eff6ff",
          500: "var(--color-primary)",
          600: "var(--color-primary-hover)",
          700: "#1d4ed8",
          foreground: "var(--color-primary-foreground)",
        },
        success: {
          50: "#f0fdf4",
          500: "var(--color-success)",
          600: "#16a34a",
          700: "#15803d",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
      },
      ringColor: {
        DEFAULT: "var(--color-ring)",
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
