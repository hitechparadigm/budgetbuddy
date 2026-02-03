/**
 * ProtectedLayout Component
 *
 * Combines ProtectedRoute authentication check with AppLayout.
 * Provides user info from AuthContext to the sidebar.
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { AppLayout } from "./AppLayout";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({
  children,
}) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Get user display info
  const userName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"
    : "User";
  const userEmail = user?.email || "";

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      {children}
    </AppLayout>
  );
};

export default ProtectedLayout;
