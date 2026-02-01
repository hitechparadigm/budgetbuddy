/**
 * Family Settings Component
 *
 * Allows users to manage family members, send invitations, and configure family roles
 */

import React, { useState, useEffect } from "react";

const API_BASE = "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

interface FamilyMember {
  userId: string;
  email: string;
  name: string;
  role: "primary" | "spouse" | "viewer";
  joinedAt: string;
}

interface PendingInvitation {
  invitationId: string;
  email: string;
  role: "spouse" | "viewer";
  createdAt: string;
  expiresAt: string;
}

export const FamilySettings: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"spouse" | "viewer">("spouse");
  const [inviting, setInviting] = useState(false);

  // Current user info
  const [currentUserRole, setCurrentUserRole] = useState<
    "primary" | "spouse" | "viewer"
  >("primary");

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("budgetbuddy_access_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/family/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load family members");
      }

      const data = await response.json();
      setMembers(data.members || []);
      setPendingInvitations(data.pendingInvitations || []);

      // Get current user role from token or response
      const userData = localStorage.getItem("budgetbuddy_user");
      const currentUserId = userData ? JSON.parse(userData).userId : null;
      const currentUser = data.members.find(
        (m: FamilyMember) => m.userId === currentUserId,
      );
      if (currentUser) {
        setCurrentUserRole(currentUser.role);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load family members",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("budgetbuddy_access_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/family/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send invitation");
      }

      setSuccess(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail("");
      setShowInviteForm(false);

      // Reload family members to show pending invitation
      await loadFamilyMembers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (
    userId: string,
    newRole: "spouse" | "viewer",
  ) => {
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("budgetbuddy_access_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${API_BASE}/family/members/${userId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update role");
      }

      setSuccess("Role updated successfully!");
      await loadFamilyMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName} from your family? They will lose access to your shared budget.`,
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("budgetbuddy_access_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/family/members/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove member");
      }

      setSuccess(`${memberName} has been removed from your family.`);
      await loadFamilyMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleLeaveFamily = async () => {
    if (
      !confirm(
        "Are you sure you want to leave this family? You will lose access to the shared budget and a new personal budget will be created for you.",
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("budgetbuddy_access_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/family/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to leave family");
      }

      setSuccess(
        "You have left the family. A new personal budget has been created for you.",
      );
      await loadFamilyMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave family");
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "primary":
        return {
          label: "Primary",
          color: "bg-blue-100 text-blue-800",
          description: "Full access",
        };
      case "spouse":
        return {
          label: "Spouse",
          color: "bg-green-100 text-green-800",
          description: "Can edit budgets & transactions",
        };
      case "viewer":
        return {
          label: "Viewer",
          color: "bg-gray-100 text-gray-800",
          description: "Read-only access",
        };
      default:
        return {
          label: role,
          color: "bg-gray-100 text-gray-800",
          description: "",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Family Members</h2>
        {currentUserRole === "primary" && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && currentUserRole === "primary" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Invite Family Member
          </h3>
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div>
              <label
                htmlFor="inviteEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="partner@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="inviteRole"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Role
              </label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "spouse" | "viewer")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="spouse">
                  Spouse - Can edit budgets and transactions
                </option>
                <option value="viewer">Viewer - Read-only access</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                {inviting ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Members */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {members.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No family members yet. Invite someone to share your budget!
          </div>
        ) : (
          members.map((member) => {
            const roleInfo = getRoleDisplay(member.role);
            const userData = localStorage.getItem("budgetbuddy_user");
            const currentUserId = userData ? JSON.parse(userData).userId : null;
            const isCurrentUser = member.userId === currentUserId;

            return (
              <div
                key={member.userId}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {member.name}
                          {isCurrentUser && (
                            <span className="text-gray-500 text-sm ml-1">
                              (You)
                            </span>
                          )}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${roleInfo.color}`}
                        >
                          {roleInfo.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {currentUserRole === "primary" &&
                  !isCurrentUser &&
                  member.role !== "primary" && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleChangeRole(
                            member.userId,
                            e.target.value as "spouse" | "viewer",
                          )
                        }
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="spouse">Spouse</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() =>
                          handleRemoveMember(member.userId, member.name)
                        }
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 border border-red-300 rounded-md"
                      >
                        Remove
                      </button>
                    </div>
                  )}
              </div>
            );
          })
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Pending Invitations
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {pendingInvitations.map((invitation) => {
              const roleInfo = getRoleDisplay(invitation.role);

              return (
                <div
                  key={invitation.invitationId}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {invitation.email}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${roleInfo.color}`}
                      >
                        {roleInfo.label}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Sent {new Date(invitation.createdAt).toLocaleDateString()}{" "}
                      • Expires{" "}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leave Family Button (for non-primary users) */}
      {currentUserRole !== "primary" && (
        <div className="pt-6 border-t border-gray-200">
          <button
            onClick={handleLeaveFamily}
            className="px-4 py-2 text-red-600 hover:bg-red-50 border border-red-300 rounded-lg font-medium"
          >
            Leave Family
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Leaving the family will create a new personal budget for you. You
            will lose access to the shared budget.
          </p>
        </div>
      )}
    </div>
  );
};
