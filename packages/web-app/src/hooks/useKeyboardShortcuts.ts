/**
 * useKeyboardShortcuts Hook
 *
 * Provides keyboard shortcut functionality for the application.
 * Handles Ctrl/Cmd key detection and prevents conflicts with browser shortcuts.
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts?: ShortcutConfig[];
}

// Default shortcuts for the application
export const DEFAULT_SHORTCUTS: Omit<ShortcutConfig, 'action'>[] = [
  { key: 'n', ctrl: true, description: 'New transaction' },
  { key: 'b', ctrl: true, description: 'Go to Budget' },
  { key: 's', ctrl: true, description: 'Go to Settings' },
  { key: '/', ctrl: true, description: 'Show keyboard shortcuts' },
  { key: 'Escape', description: 'Close modal/menu' },
];

/**
 * Hook to register and handle keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, shortcuts = [] } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to work even in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    // Detect if Mac or Windows/Linux
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    // Check custom shortcuts first
    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? modifier : !modifier;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        return;
      }
    }
  }, [enabled, shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    isMac: typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0,
  };
}

/**
 * Hook to create navigation shortcuts
 */
export function useNavigationShortcuts(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'b',
      ctrl: true,
      description: 'Go to Budget',
      action: () => navigate('/budget'),
    },
    {
      key: 's',
      ctrl: true,
      description: 'Go to Settings',
      action: () => navigate('/settings'),
    },
    {
      key: 'g',
      ctrl: true,
      description: 'Go to Goals',
      action: () => navigate('/goals'),
    },
    {
      key: 'i',
      ctrl: true,
      description: 'Go to Insights',
      action: () => navigate('/insights'),
    },
  ];

  return useKeyboardShortcuts({ enabled, shortcuts });
}

/**
 * Get the modifier key label based on platform
 */
export function getModifierKey(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Format a shortcut for display
 */
export function formatShortcut(shortcut: Omit<ShortcutConfig, 'action'>): string {
  const parts: string[] = [];
  const modKey = getModifierKey();

  if (shortcut.ctrl) parts.push(modKey);
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
}

export default useKeyboardShortcuts;
