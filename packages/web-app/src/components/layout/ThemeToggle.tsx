import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}
      `}
      aria-label="Toggle theme"
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-[var(--color-surface)] transition-transform
          ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
      <span className="sr-only">
        {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </button>
  );
};

export default ThemeToggle;
