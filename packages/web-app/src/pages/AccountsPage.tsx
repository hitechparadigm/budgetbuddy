/**
 * AccountsPage
 * Page for managing connected bank accounts via Plaid
 */

import React from "react";
import { Link } from "react-router-dom";
import BankAccounts from "../components/BankAccounts";

export const AccountsPage: React.FC = () => {
  return (
    <div className="accounts-page">
      <nav className="page-nav">
        <Link to="/budget" className="nav-link">
          ← Back to Budget
        </Link>
        <Link to="/settings" className="nav-link">
          Settings
        </Link>
      </nav>

      <BankAccounts />

      <style>{`
        .accounts-page {
          min-height: 100vh;
          background: #f5f5f5;
        }
        .page-nav {
          display: flex;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
        }
        .nav-link {
          color: #2196F3;
          text-decoration: none;
          font-size: 14px;
        }
        .nav-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default AccountsPage;
