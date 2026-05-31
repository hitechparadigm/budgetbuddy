/**
 * Admin Dashboard Page
 *
 * Main dashboard for BudgetBuddy administrators.
 * Displays key metrics, user statistics, and quick actions.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ADMIN_API_URL =
  `${import.meta.env.VITE_API_BASE_URL || "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1"}/admin`;

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  newUsersToday: number;
  totalTransactions: number;
  totalBudgets: number;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("budgetbuddy_admin_token");
      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await fetch(`${ADMIN_API_URL}/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      console.error("Failed to load stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("budgetbuddy_admin_token");
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">
                🛡️ BudgetBuddy Admin
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin/users")}
                className="text-gray-300 hover:text-white px-3 py-2"
              >
                Users
              </button>
              <button
                onClick={() => navigate("/admin/content")}
                className="text-gray-300 hover:text-white px-3 py-2"
              >
                Content
              </button>
              <button
                onClick={() => navigate("/admin/audit")}
                className="text-gray-300 hover:text-white px-3 py-2"
              >
                Audit Log
              </button>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 px-3 py-2"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon="👥"
            color="blue"
          />
          <StatCard
            title="Active Users (30d)"
            value={stats?.activeUsers || 0}
            icon="📈"
            color="green"
          />
          <StatCard
            title="Premium Users"
            value={stats?.premiumUsers || 0}
            icon="⭐"
            color="yellow"
          />
          <StatCard
            title="New Users Today"
            value={stats?.newUsersToday || 0}
            icon="🆕"
            color="purple"
          />
          <StatCard
            title="Total Transactions"
            value={stats?.totalTransactions || 0}
            icon="💳"
            color="cyan"
          />
          <StatCard
            title="Total Budgets"
            value={stats?.totalBudgets || 0}
            icon="📊"
            color="pink"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/admin/users")}
              className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="text-white font-medium">Manage Users</div>
              <div className="text-gray-400 text-sm">
                Search, view, and manage user accounts
              </div>
            </button>
            <button
              onClick={() => navigate("/admin/content")}
              className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="text-white font-medium">Content Management</div>
              <div className="text-gray-400 text-sm">
                Create and manage educational content
              </div>
            </button>
            <button
              onClick={() => navigate("/admin/audit")}
              className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="text-white font-medium">Audit Log</div>
              <div className="text-gray-400 text-sm">
                View admin actions and system events
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-900/50 border-blue-700",
    green: "bg-green-900/50 border-green-700",
    yellow: "bg-yellow-900/50 border-yellow-700",
    purple: "bg-purple-900/50 border-purple-700",
    cyan: "bg-cyan-900/50 border-cyan-700",
    pink: "bg-pink-900/50 border-pink-700",
  };

  return (
    <div
      className={`p-6 rounded-lg border ${colorClasses[color] || colorClasses.blue}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
