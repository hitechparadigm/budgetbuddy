/**
 * BudgetBuddy Web Application
 * Main application component with routing and authentication
 */

import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BudgetProvider } from "./contexts/BudgetContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { BudgetPage } from "./pages/BudgetPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { AIBudgetGenerationPage } from "./pages/AIBudgetGenerationPage";
import { AcceptInvitationPage } from "./pages/AcceptInvitationPage";
import { AccountsPage } from "./pages/AccountsPage";
import { TipsFeedPage } from "./pages/TipsFeedPage";
import { InsightsPage } from "./pages/InsightsPage";
import { initMockAuth } from "./utils/mockAuth";

const App: React.FC = () => {
  // Initialize mock authentication for development
  useEffect(() => {
    // Only initialize mock auth in development
    if (process.env.NODE_ENV === "development") {
      initMockAuth();
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BudgetProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route
                  path="/ai-budget-generation"
                  element={<AIBudgetGenerationPage />}
                />
                <Route
                  path="/family/accept"
                  element={<AcceptInvitationPage />}
                />

                {/* Main Budget App - No Layout wrapper for clean, focused experience */}
                <Route
                  path="/budget"
                  element={
                    <ProtectedRoute>
                      <BudgetPage />
                    </ProtectedRoute>
                  }
                />

                {/* Settings Page */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Bank Accounts Page */}
                <Route
                  path="/accounts"
                  element={
                    <ProtectedRoute>
                      <AccountsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Tips Feed Page */}
                <Route
                  path="/tips"
                  element={
                    <ProtectedRoute>
                      <TipsFeedPage />
                    </ProtectedRoute>
                  }
                />

                {/* Insights Page */}
                <Route
                  path="/insights"
                  element={
                    <ProtectedRoute>
                      <InsightsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect to budget (main app) */}
                <Route path="/" element={<Navigate to="/budget" replace />} />

                {/* Catch all - redirect to budget */}
                <Route path="*" element={<Navigate to="/budget" replace />} />
              </Routes>
            </div>
          </Router>
        </BudgetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
