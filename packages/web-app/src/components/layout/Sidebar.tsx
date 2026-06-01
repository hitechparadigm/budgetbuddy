/**
 * Sidebar Navigation Component
 *
 * Persistent sidebar navigation for BudgetBuddy web app.
 * Features:
 * - Collapsible sidebar with icon-only mode
 * - Active state highlighting based on current route
 * - Mobile responsive with overlay mode
 * - User profile section with logout
 * - Collapse state persistence in localStorage
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
  userName?: string;
  userEmail?: string;
}

// Navigation items configuration
export const navItems: NavItem[] = [
  { id: "budget", label: "Budget", icon: "📊", path: "/budget" },
  { id: "accounts", label: "Accounts", icon: "🏦", path: "/accounts" },
  { id: "members", label: "Members", icon: "👥", path: "/budget/members" },
  { id: "goals", label: "Goals", icon: "🎯", path: "/goals" },
  { id: "investments", label: "Investments", icon: "📈", path: "/investments" },
  { id: "insights", label: "Insights", icon: "💡", path: "/insights" },
  { id: "tips", label: "Tips", icon: "💬", path: "/tips" },
  { id: "learn", label: "Learn", icon: "📚", path: "/learn" },
  { id: "bills", label: "Bills", icon: "📋", path: "/bills" },
  {
    id: "subscriptions",
    label: "Subscriptions",
    icon: "🔄",
    path: "/subscriptions",
  },
  { id: "debts", label: "Debt Payoff", icon: "💳", path: "/debts" },
  {
    id: "credit-score",
    label: "Credit Score",
    icon: "🏆",
    path: "/credit-score",
  },
  { id: "settings", label: "Settings", icon: "⚙️", path: "/settings" },
];

// Storage key for collapse state persistence
const SIDEBAR_COLLAPSED_KEY = "budgetbuddy_sidebar_collapsed";

/**
 * Hook to manage sidebar collapse state with localStorage persistence
 */
export function useSidebarCollapse(isMobile: boolean): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    // On mobile, start collapsed
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      return true;
    }
    // On desktop, restore from localStorage
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const newValue = !prev;
      // Only persist on desktop
      if (!isMobile) {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
      }
      return newValue;
    });
  };

  // Reset to collapsed on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  return [collapsed, toggleCollapse];
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  isMobile,
  userName,
  userEmail,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Clear all authentication tokens
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("idToken");
    localStorage.removeItem("userId");
    navigate("/auth");
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (isMobile && !collapsed) {
      onToggleCollapse();
    }
  };

  /**
   * Check if a nav item is active based on current path
   * Matches exact path or path prefix for nested routes
   */
  const isActive = (path: string): boolean => {
    if (path === "/budget") {
      return location.pathname === "/budget" || location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggleCollapse}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`
          ${isMobile && collapsed ? "hidden" : ""}
          ${isMobile && !collapsed ? "fixed inset-y-0 left-0 z-50 w-64" : ""}
          ${!isMobile && collapsed ? "w-16" : ""}
          ${!isMobile && !collapsed ? "w-64" : ""}
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300
        `}
        aria-label="Main navigation"
      >
        {/* Header with logo and collapse toggle */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">$</span>
              </div>
              {!collapsed && (
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  BudgetBuddy
                </span>
              )}
            </div>
            <button
              onClick={onToggleCollapse}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {collapsed ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1" role="menu">
            {navItems.map((item) => (
              <li key={item.id} role="none">
                <button
                  onClick={() => handleNavClick(item.path)}
                  role="menuitem"
                  aria-current={isActive(item.path) ? "page" : undefined}
                  className={`
                    w-full flex items-center py-2 rounded-lg transition-colors
                    ${collapsed && !isMobile ? "justify-center px-2" : "space-x-3 px-3"}
                    ${
                      isActive(item.path)
                        ? "bg-green-50 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-300 font-medium border-l-3 border-green-700 dark:border-emerald-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                    }
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-lg" aria-hidden="true">
                    {item.icon}
                  </span>
                  {(!collapsed || isMobile) && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {item.badge && item.badge > 0 && (!collapsed || isMobile) && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="mt-auto border-t border-gray-200 dark:border-gray-700 p-4">
          {!collapsed && (
            <div className="mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 dark:text-gray-300">👤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {userName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userEmail || ""}
                  </p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors
              ${collapsed && !isMobile ? "justify-center px-2" : "space-x-3 px-3"}
            `}
            title={collapsed ? "Logout" : undefined}
          >
            <span className="text-lg" aria-hidden="true">
              🚪
            </span>
            {(!collapsed || isMobile) && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
