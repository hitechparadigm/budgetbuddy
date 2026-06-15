/**
 * BudgetBuddy Web Application
 * Main application component with routing and authentication
 */

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BudgetProvider } from "./contexts/BudgetContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";
import { AuthPage } from "./pages/AuthPage";
import { BudgetPage } from "./pages/BudgetPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { AIBudgetGenerationPage } from "./pages/AIBudgetGenerationPage";
import { AcceptInvitationPage } from "./pages/AcceptInvitationPage";
import { AccountsPage } from "./pages/AccountsPage";
import { BudgetMembersPage } from "./pages/BudgetMembersPage";
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
import CreditScorePage from "./pages/CreditScorePage";
import InvestmentsPage from "./pages/InvestmentsPage";
import { LearnPage } from "./pages/LearnPage";
import { AboutPage } from "./pages/AboutPage";
import { HelpCenterPage } from "./pages/HelpCenterPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LandingPage } from "./pages/LandingPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

const App: React.FC = () => {
  return (
    <ErrorBoundary>
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
                    path="/budgets/accept"
                    element={<AcceptInvitationPage />}
                  />
                  {/* Main Budget App - With Sidebar Layout */}
                  <Route
                    path="/budget"
                    element={
                      <ProtectedLayout>
                        <BudgetPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Settings Page */}
                  <Route
                    path="/settings"
                    element={
                      <ProtectedLayout>
                        <SettingsPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Bank Accounts Page */}
                  <Route
                    path="/accounts"
                    element={
                      <ProtectedLayout>
                        <AccountsPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Budget Members Page — manage members, invitations, budget settings */}
                  <Route
                    path="/budget/members"
                    element={
                      <ProtectedLayout>
                        <BudgetMembersPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Tips Feed Page */}
                  <Route
                    path="/tips"
                    element={
                      <ProtectedLayout>
                        <TipsFeedPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Insights Page */}
                  <Route
                    path="/insights"
                    element={
                      <ProtectedLayout>
                        <InsightsPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Bills Page */}
                  <Route
                    path="/bills"
                    element={
                      <ProtectedLayout>
                        <BillsPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Bill Form - New/Edit */}
                  <Route
                    path="/bills/new"
                    element={
                      <ProtectedLayout>
                        <BillFormPage />
                      </ProtectedLayout>
                    }
                  />
                  <Route
                    path="/bills/:billId/edit"
                    element={
                      <ProtectedLayout>
                        <BillFormPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Goals Pages */}
                  <Route
                    path="/goals"
                    element={
                      <ProtectedLayout>
                        <GoalsPage />
                      </ProtectedLayout>
                    }
                  />
                  <Route
                    path="/goals/new"
                    element={
                      <ProtectedLayout>
                        <GoalFormPage />
                      </ProtectedLayout>
                    }
                  />
                  <Route
                    path="/goals/:goalId/edit"
                    element={
                      <ProtectedLayout>
                        <GoalFormPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Subscriptions Pages */}
                  <Route
                    path="/subscriptions"
                    element={
                      <ProtectedLayout>
                        <SubscriptionsPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* /subscriptions/new is removed — detection is the entry point */}
                  {/* Keep edit route for any deep-linked bookmarks */}
                  <Route
                    path="/subscriptions/:subscriptionId/edit"
                    element={
                      <ProtectedLayout>
                        <SubscriptionFormPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Debt Payoff Pages */}
                  <Route
                    path="/debts"
                    element={
                      <ProtectedLayout>
                        <DebtPayoffPage />
                      </ProtectedLayout>
                    }
                  />
                  <Route
                    path="/debts/new"
                    element={
                      <ProtectedLayout>
                        <DebtFormPage />
                      </ProtectedLayout>
                    }
                  />
                  <Route
                    path="/debts/:debtId/edit"
                    element={
                      <ProtectedLayout>
                        <DebtFormPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Credit Score Page */}
                  <Route
                    path="/credit-score"
                    element={
                      <ProtectedLayout>
                        <CreditScorePage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Investments Page */}
                  <Route
                    path="/investments"
                    element={
                      <ProtectedLayout>
                        <InvestmentsPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Learn Page - Educational Content */}
                  <Route
                    path="/learn"
                    element={
                      <ProtectedLayout>
                        <LearnPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* About Page */}
                  <Route
                    path="/about"
                    element={
                      <ProtectedLayout>
                        <AboutPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Help Center Page */}
                  <Route
                    path="/help"
                    element={
                      <ProtectedLayout>
                        <HelpCenterPage />
                      </ProtectedLayout>
                    }
                  />
                  {/* Terms of Service Page */}
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  {/* Privacy Policy Page */}
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  {/* Landing page for unauthenticated users, redirect to budget for authenticated */}
                  <Route path="/" element={<LandingPage />} />
                  {/* Catch all - show 404 page */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </div>
            </Router>
          </BudgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
