/**
 * Color constants for light and dark themes
 */

export const Colors = {
  light: {
    // Primary colors
    primary: '#10b981',
    primaryDark: '#059669',
    secondary: '#6b7280',

    // Background colors
    background: '#ffffff',
    backgroundSecondary: '#f9fafb',
    surface: '#ffffff',

    // Text colors
    text: '#1f2937',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',

    // Border colors
    border: '#e5e7eb',
    borderFocus: '#10b981',

    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Income/Expense colors
    income: '#10b981',
    expense: '#ef4444',

    // Shadow
    shadow: '#000000',
  },

  dark: {
    // Primary colors
    primary: '#10b981',
    primaryDark: '#059669',
    secondary: '#9ca3af',

    // Background colors
    background: '#111827',
    backgroundSecondary: '#1f2937',
    surface: '#374151',

    // Text colors
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',

    // Border colors
    border: '#4b5563',
    borderFocus: '#10b981',

    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Income/Expense colors
    income: '#10b981',
    expense: '#ef4444',

    // Shadow
    shadow: '#000000',
  },
};

export type ColorScheme = keyof typeof Colors;
export type ColorName = keyof typeof Colors.light;
