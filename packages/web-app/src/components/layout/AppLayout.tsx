/**
 * AppLayout Component
 *
 * Main layout wrapper that includes the sidebar navigation.
 * Used for all authenticated pages to provide consistent navigation.
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar, useSidebarCollapse } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

/**
 * Hook to detect mobile viewport
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  userName,
  userEmail,
}) => {
  const isMobile = useIsMobile();
  const [collapsed, toggleCollapse] = useSidebarCollapse(isMobile);
  const location = useLocation();

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile && !collapsed) {
      toggleCollapse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        isMobile={isMobile}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
        {/* Mobile Header with hamburger menu */}
        {isMobile && (
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleCollapse}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Open navigation menu"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">$</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  BudgetBuddy
                </span>
              </div>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className="h-full">{children}</div>

        {/* Mobile app suggestion banner — shown below 768px */}
        <div className="block sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-primary)] text-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">📱</span>
            <p className="text-sm font-medium truncate">
              Get the BudgetBuddy app for the best mobile experience.
            </p>
          </div>
          <a
            href="/about"
            className="shrink-0 text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
          >
            Learn more
          </a>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
