/**
 * BudgetBuddy Web Application
 * Main application component with routing and authentication
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BudgetProvider } from './contexts/BudgetContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import TransactionTest from './pages/TransactionTest';
import TransactionsPage from './pages/TransactionsPage';
import BudgetPage from './pages/BudgetPage';
import Layout from './components/layout/Layout';
import DevHelper from './components/dev/DevHelper';
import { initMockAuth } from './utils/mockAuth';
import './styles/layout.css';
import './styles/navigation.css';
import './styles/transactions.css';
import './styles/budget.css';
import './styles/modal-dark-theme.css';

const App: React.FC = () => {
  // Initialize mock authentication for development
  useEffect(() => {
    // Only initialize mock auth in development
    if (import.meta.env.DEV) {
      initMockAuth();
    }
  }, []);

  return (
    <AuthProvider>
      <BudgetProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Budget Management */}
              <Route
                path="/budget"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BudgetPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Transaction Management */}
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TransactionsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Test Routes (for development) */}
              <Route path="/test/transactions" element={<TransactionTest />} />

              {/* Default redirect to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            {/* Development Helper */}
            <DevHelper />
          </div>
        </Router>
      </BudgetProvider>
    </AuthProvider>
  );
};

export default App;
