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
const BorrowLendFormPage = lazy(() => import("./pages/BorrowLendFormPage").then(m => ({ default: m.BorrowLendFormPage })));
const PlannedTransactionsPage = lazy(() => import("./pages/PlannedTransactionsPage").then(m => ({ default: m.PlannedTransactionsPage })));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const SubscriptionFormPage = lazy(() => import("./pages/SubscriptionFormPage"));
const DebtPayoffPage = lazy(() => import("./pages/DebtPayoffPage"));
const DebtFormPage = lazy(() => import("./pages/DebtFormPage"));
const CreditScorePage = lazy(() => import("./pages/CreditScorePage"));
const InvestmentsPage = lazy(() => import("./pages/InvestmentsPage"));
const LearnPage = lazy(() => import("./pages/LearnPage").then(m => ({ default: m.LearnPage })));
const ToolsPage = lazy(() => import("./pages/ToolsPage").then(m => ({ default: m.ToolsPage })));
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
                  {/* Tools — public, no auth required (calculators work without login) */}
                  <Route path="/tools" element={<ToolsPage />} />

                  {/* Main Budget App - With Sidebar Layout */}
                  <Route path="/overview" element={<ProtectedLayout><OverviewPage /></ProtectedLayout>} />
                  <Route path="/budget" element={<ProtectedLayout><BudgetPage /></ProtectedLayout>} />
                  <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
                  <Route path="/accounts" element={<ProtectedLayout><AccountsPage /></ProtectedLayout>} />
                  <Route path="/budget/members" element={<ProtectedLayout><BudgetMembersPage /></ProtectedLayout>} />
                  <Route path="/tips" element={<ProtectedLayout><TipsFeedPage /></ProtectedLayout>} />
                  <Route path="/insights" element={<ProtectedLayout><InsightsPage /></ProtectedLayout>} />

                  {/* Bills */}
                  <Route path="/bills" element={<ProtectedLayout><BillsPage /></ProtectedLayout>} />
                  <Route path="/bills/new" element={<ProtectedLayout><BillFormPage /></ProtectedLayout>} />
                  <Route path="/bills/:billId/edit" element={<ProtectedLayout><BillFormPage /></ProtectedLayout>} />

                  {/* Goals — savings goals, borrowed money, lent money */}
                  <Route path="/goals" element={<ProtectedLayout><GoalsPage /></ProtectedLayout>} />
                  <Route path="/goals/new" element={<ProtectedLayout><GoalFormPage /></ProtectedLayout>} />
                  <Route path="/goals/:goalId/edit" element={<ProtectedLayout><GoalFormPage /></ProtectedLayout>} />
                  {/* Borrowed / Lent tracking */}
                  <Route path="/goals/borrow-lend/new" element={<ProtectedLayout><BorrowLendFormPage /></ProtectedLayout>} />
                  <Route path="/goals/borrow-lend/:goalId/edit" element={<ProtectedLayout><BorrowLendFormPage /></ProtectedLayout>} />

                  {/* Planned Transactions (recurring + future) */}
                  <Route path="/planned-transactions" element={<ProtectedLayout><PlannedTransactionsPage /></ProtectedLayout>} />

                  {/* Subscriptions */}
                  <Route path="/subscriptions" element={<ProtectedLayout><SubscriptionsPage /></ProtectedLayout>} />
                  <Route path="/subscriptions/:subscriptionId/edit" element={<ProtectedLayout><SubscriptionFormPage /></ProtectedLayout>} />

                  {/* Debt Payoff */}
                  <Route path="/debts" element={<ProtectedLayout><DebtPayoffPage /></ProtectedLayout>} />
                  <Route path="/debts/new" element={<ProtectedLayout><DebtFormPage /></ProtectedLayout>} />
                  <Route path="/debts/:debtId/edit" element={<ProtectedLayout><DebtFormPage /></ProtectedLayout>} />

                  {/* Financial tracking */}
                  <Route path="/credit-score" element={<ProtectedLayout><CreditScorePage /></ProtectedLayout>} />
                  <Route path="/investments" element={<ProtectedLayout><InvestmentsPage /></ProtectedLayout>} />
                  <Route path="/net-worth" element={<ProtectedLayout><NetWorthPage /></ProtectedLayout>} />

                  {/* Learn / Help */}
                  <Route path="/learn" element={<ProtectedLayout><LearnPage /></ProtectedLayout>} />
                  <Route path="/about" element={<ProtectedLayout><AboutPage /></ProtectedLayout>} />
                  <Route path="/help" element={<ProtectedLayout><HelpCenterPage /></ProtectedLayout>} />

                  {/* Public static */}
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/pricing" element={<PricingPage />} />

                  {/* Root + 404 */}
                  <Route path="/" element={<LandingPage />} />
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
