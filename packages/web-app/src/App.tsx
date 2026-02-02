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
import { BillsPage } from "./pages/BillsPage";
import { BillFormPage } from "./pages/BillFormPage";
import { GoalsPage } from "./pages/GoalsPage";
import { GoalFormPage } from "./pages/GoalFormPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import SubscriptionFormPage from "./pages/SubscriptionFormPage";
import DebtPayoffPage from "./pages/DebtPayoffPage";
import DebtFormPage from "./pages/DebtFormPage";
import { LearnPage } from "./pages/LearnPage";
import { AboutPage } from "./pages/AboutPage";
import { HelpCenterPage } from "./pages/HelpCenterPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
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
                {/* Bills Page */}
                <Route
                  path="/bills"
                  element={
                    <ProtectedRoute>
                      <BillsPage />
                    </ProtectedRoute>
                  }
                />
                {/* Bill Form - New/Edit */}
                <Route
                  path="/bills/new"
                  element={
                    <ProtectedRoute>
                      <BillFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bills/:billId/edit"
                  element={
                    <ProtectedRoute>
                      <BillFormPage />
                    </ProtectedRoute>
                  }
                />
                {/* Goals Pages */}
                <Route
                  path="/goals"
                  element={
                    <ProtectedRoute>
                      <GoalsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/goals/new"
                  element={
                    <ProtectedRoute>
                      <GoalFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/goals/:goalId/edit"
                  element={
                    <ProtectedRoute>
                      <GoalFormPage />
                    </ProtectedRoute>
                  }
                />
                {/* Subscriptions Pages */}
                <Route
                  path="/subscriptions"
                  element={
                    <ProtectedRoute>
                      <SubscriptionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscriptions/new"
                  element={
                    <ProtectedRoute>
                      <SubscriptionFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscriptions/:subscriptionId/edit"
                  element={
                    <ProtectedRoute>
                      <SubscriptionFormPage />
                    </ProtectedRoute>
                  }
                />
                {/* Debt Payoff Pages */}
                <Route
                  path="/debts"
                  element={
                    <ProtectedRoute>
                      <DebtPayoffPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/debts/new"
                  element={
                    <ProtectedRoute>
                      <DebtFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/debts/:debtId/edit"
                  element={
                    <ProtectedRoute>
                      <DebtFormPage />
                    </ProtectedRoute>
                  }
                />
                {/* Learn Page - Educational Content */}
                <Route
                  path="/learn"
                  element={
                    <ProtectedRoute>
                      <LearnPage />
                    </ProtectedRoute>
                  }
                />
                {/* About Page */}
                <Route
                  path="/about"
                  element={
                    <ProtectedRoute>
                      <AboutPage />
                    </ProtectedRoute>
                  }
                />
                {/* Help Center Page */}
                <Route
                  path="/help"
                  element={
                    <ProtectedRoute>
                      <HelpCenterPage />
                    </ProtectedRoute>
                  }
                />
                {/* Terms of Service Page */}
                <Route path="/terms" element={<TermsOfServicePage />} />
                {/* Privacy Policy Page */}
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
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
