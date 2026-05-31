/**
 * Admin Users Page
 *
 * User management interface for administrators.
 * Allows searching, viewing, and managing user accounts.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ADMIN_API_URL =
  `${import.meta.env.VITE_API_BASE_URL || "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1"}/admin`;

interface User {
  userId: string;
  email: string;
  name: string;
  status: "active" | "disabled" | "pending";
  accountType: "free" | "premium";
  createdAt: string;
  lastLogin: string | null;
  familyId: string | null;
}

export const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("budgetbuddy_admin_token");
      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await fetch(`${ADMIN_API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load users");
      }

      const data = await response.json();
      setUsers(data.data?.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
      // Demo data for development
      setUsers([
        {
          userId: "user-1",
          email: "john@example.com",
          name: "John Smith",
          status: "active",
          accountType: "premium",
          createdAt: "2026-01-15T10:00:00Z",
          lastLogin: "2026-02-01T14:30:00Z",
          familyId: "family-1",
        },
        {
          userId: "user-2",
          email: "jane@example.com",
          name: "Jane Doe",
          status: "active",
          accountType: "free",
          createdAt: "2026-01-20T08:00:00Z",
          lastLogin: "2026-02-02T09:15:00Z",
          familyId: null,
        },
        {
          userId: "user-3",
          email: "bob@example.com",
          name: "Bob Wilson",
          status: "disabled",
          accountType: "free",
          createdAt: "2026-01-10T12:00:00Z",
          lastLogin: "2026-01-25T16:45:00Z",
          familyId: "family-2",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-900/50 text-green-300 border-green-700",
      disabled: "bg-red-900/50 text-red-300 border-red-700",
      pending: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded border ${styles[status] || styles.pending}`}
      >
        {status}
      </span>
    );
  };

  const getAccountBadge = (type: string) => {
    return type === "premium" ? (
      <span className="px-2 py-1 text-xs rounded bg-yellow-900/50 text-yellow-300 border border-yellow-700">
        ⭐ Premium
      </span>
    ) : (
      <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 border border-gray-600">
        Free
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin")}
                className="text-gray-400 hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-white">
                👥 User Management
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full max-w-md px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
              text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">
                          {user.name}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-6 py-4">
                      {getAccountBadge(user.accountType)}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No users found matching your search
              </div>
            )}
          </div>
        )}
      </main>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-white">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Name</label>
                <p className="text-white">{selectedUser.name}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Email</label>
                <p className="text-white">{selectedUser.email}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">User ID</label>
                <p className="text-white font-mono text-sm">
                  {selectedUser.userId}
                </p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Family ID</label>
                <p className="text-white font-mono text-sm">
                  {selectedUser.familyId || "None"}
                </p>
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedUser.status)}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Account Type</label>
                  <div className="mt-1">
                    {getAccountBadge(selectedUser.accountType)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {selectedUser.status === "active" ? (
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Disable Account
                </button>
              ) : (
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Enable Account
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
