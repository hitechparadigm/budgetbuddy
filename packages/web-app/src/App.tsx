import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BudgetProvider } from "./contexts/BudgetContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Skeleton } from "./components/ui";

// ─── Critical-path pages — eagerly loaded ────────────────────────────────────
import { AuthPage } from "./pages/AuthPage";
import { BudgetPage } from "./pages/BudgetPage";
import { OverviewPage } from "./pages/OverviewPage";
import { LandingPage } from "./pages/LandingPage";
import { OnboardingPage } from "./pages/OnboardingPage";

// ─── Secondary pages — lazy loaded for better initial bundle ──────────────────
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const AIBudgetGenerationPage = lazy(() => import("./pages/AIBudgetGenerationPage").then(m => ({ default: m.AIBudgetGenerationPage })));
const AcceptInvitationPage = lazy(() => import("./pages/AcceptInvitationPage").then(m => ({ default: m.AcceptInvitationPage })));
const AccountsPage = lazy(() => import("./pages/AccountsPage").then(m => ({ default: m.AccountsPage })));
const BudgetMembersPage = lazy(() => import("./pages/BudgetMembersPage").then(m => ({ default: m.BudgetMembersPage })));
const TipsFeedPage = lazy(() => import("./pages/TipsFeedPage").then(m => ({ default: m.TipsFeedPage })));
const InsightsPage = lazy(() => import("./pages/InsightsPage").then(m => ({ default: m.InsightsPage })));
const BillsPage = lazy(() => import("./pages/BillsPage").then(m => ({ default: m.BillsPage })));
const BillFormPage = lazy(() => import("./pages/BillFormPage").then(m => ({ default: m.BillFormPage })));
const GoalsPage = lazy(() => import("./pages/GoalsPage").then(m => ({ default: m.GoalsPage })));
const GoalFormPage = lazy(() => import("./pages/GoalFormPage").then(m => ({ default: m.GoalFormPage })));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const SubscriptionFormPage = lazy(() => import("./pages/SubscriptionFormPage"));
const DebtPayoffPage = lazy(() => import("./pages/DebtPayoffPage"));
const DebtFormPage = lazy(() => import("./pages/DebtFormPage"));
const CreditScorePage = lazy(() => import("./pages/CreditScorePage"));
const InvestmentsPage = lazy(() => import("./pages/InvestmentsPage"));
const LearnPage = lazy(() => import("./pages/LearnPage").then(m => ({ default: m.LearnPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then(m => ({ default: m.AboutPage })));
const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage").then(m => ({ default: m.HelpCenterPage })));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage").then(m => ({ default: m.TermsOfServicePage })));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage").then(m => ({ default: m.PrivacyPolicyPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));
const NetWorthPage = lazy(() => import("./pages/NetWorthPage").then(m => ({ default: m.NetWorthPage })));
const PricingPage = lazy(() => import("./pages/PricingPage"));

/** Suspense fallback — full-page skeleton while lazy chunks load */
const PageSkeleton: React.FC = () => (
  <div className="p-8 max-w-4xl mx-auto space-y-4">
    <Skeleton className="h-8 w-48 rounded" />
    <Skeleton className="h-64 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
  </div>
);


const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BudgetProvider>
            <Router>
              <div className="App">
                <Suspense fallback={<PageSkeleton />}>
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
                    path="/overview"
                    element={
                      <ProtectedLayout>
                        <OverviewPage />
                      </ProtectedLayout>
                    }
                  />
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
                  {/* Net Worth Page */}
                  <Route
                    path="/net-worth"
                    element={
                      <ProtectedLayout>
                        <NetWorthPage />
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
                  {/* Pricing Page */}
                  <Route path="/pricing" element={<PricingPage />} />
                  {/* Landing page for unauthenticated users, redirect to budget for authenticated */}
                  <Route path="/" element={<LandingPage />} />
                  {/* Catch all - show 404 page */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
                </Suspense>
              </div>
            </Router>
          </BudgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
