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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        isMobile={isMobile}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header with hamburger menu */}
        {isMobile && (
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleCollapse}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
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
                <span className="font-semibold text-gray-900">BudgetBuddy</span>
              </div>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
