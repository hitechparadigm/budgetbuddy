/**
 * QuickActionsFAB Component
 *
 * Simplified floating action button with quick actions menu.
 * Provides fast access to transaction entry actions:
 * - Add Income
 * - Add Expense
 * - Scan Receipt
 *
 * Navigation items have been moved to the Sidebar component.
 */

import React, { useState, useEffect, useRef } from "react";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  hoverColor: string;
  onClick: () => void;
  shortcut?: string;
}

interface QuickActionsFABProps {
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onScanReceipt?: () => void;
  className?: string;
  position?: "bottom-right" | "bottom-left";
}

export const QuickActionsFAB: React.FC<QuickActionsFABProps> = ({
  onAddIncome,
  onAddExpense,
  onScanReceipt,
  className = "",
  position = "bottom-right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl+N to open FAB
      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setIsOpen(true);
        return;
      }

      // Ctrl+/ to show shortcuts help
      if (modifier && event.key === "/") {
        event.preventDefault();
        setShowShortcutsHint((prev) => !prev);
        return;
      }

      // When FAB is open, handle action shortcuts
      if (isOpen) {
        switch (event.key.toLowerCase()) {
          case "i":
            event.preventDefault();
            onAddIncome?.();
            setIsOpen(false);
            break;
          case "e":
            event.preventDefault();
            onAddExpense?.();
            setIsOpen(false);
            break;
          case "r":
            if (onScanReceipt) {
              event.preventDefault();
              onScanReceipt();
              setIsOpen(false);
            }
            break;
        }
      }

      // Escape to close
      if (event.key === "Escape") {
        setIsOpen(false);
        setShowShortcutsHint(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onAddIncome, onAddExpense, onScanReceipt]);

  const actions: QuickAction[] = [
    {
      id: "income",
      label: "Add Income",
      icon: "+",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      onClick: () => {
        onAddIncome?.();
        setIsOpen(false);
      },
      shortcut: "I",
    },
    {
      id: "expense",
      label: "Add Expense",
      icon: "-",
      color: "bg-red-500",
      hoverColor: "hover:bg-red-600",
      onClick: () => {
        onAddExpense?.();
        setIsOpen(false);
      },
      shortcut: "E",
    },
  ];

  // Add scan receipt action if handler provided
  if (onScanReceipt) {
    actions.push({
      id: "receipt",
      label: "Scan Receipt",
      icon: "📷",
      color: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-600",
      onClick: () => {
        onScanReceipt();
        setIsOpen(false);
      },
      shortcut: "R",
    });
  }

  const positionClasses =
    position === "bottom-right" ? "right-6 bottom-6" : "left-6 bottom-6";

  return (
    <>
      {/* Shortcuts Help Modal */}
      {showShortcutsHint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                ⌨️ Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutsHint(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close shortcuts help"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Open Quick Actions</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  Ctrl+N
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">
                  Add Income (when FAB open)
                </span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  I
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">
                  Add Expense (when FAB open)
                </span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  E
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">
                  Scan Receipt (when FAB open)
                </span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  R
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Show/Hide Shortcuts</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  Ctrl+/
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Close Menu/Modal</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  Esc
                </kbd>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              💡 Tip: On Mac, use ⌘ (Cmd) instead of Ctrl
            </p>
          </div>
        </div>
      )}

      {/* FAB Container */}
      <div
        ref={fabRef}
        className={`fixed ${positionClasses} z-40 ${className}`}
      >
        {/* Actions Menu */}
        {isOpen && (
          <div
            className="mb-4 space-y-2 animate-fade-in"
            role="menu"
            aria-label="Quick actions menu"
          >
            {actions.map((action, index) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`flex items-center space-x-3 ${action.color} ${action.hoverColor} text-white px-4 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 w-full`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: "slideIn 0.2s ease-out forwards",
                }}
                role="menuitem"
                aria-label={action.label}
              >
                <span className="text-lg w-6 text-center">{action.icon}</span>
                <span className="font-medium flex-1 text-left">
                  {action.label}
                </span>
                {action.shortcut && (
                  <span className="text-xs opacity-75 hidden sm:inline">
                    {action.shortcut}
                  </span>
                )}
              </button>
            ))}

            {/* Shortcuts hint button */}
            <button
              onClick={() => {
                setShowShortcutsHint(true);
                setIsOpen(false);
              }}
              className="flex items-center space-x-3 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-full shadow-lg transition-all w-full text-sm"
              role="menuitem"
              aria-label="Show keyboard shortcuts"
            >
              <span className="text-lg w-6 text-center">⌨️</span>
              <span className="flex-1 text-left">Keyboard Shortcuts</span>
              <kbd className="text-xs opacity-75 hidden sm:inline">Ctrl+/</kbd>
            </button>
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isOpen ? "rotate-45" : ""
          }`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        >
          <svg
            className={`w-6 h-6 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default QuickActionsFAB;
