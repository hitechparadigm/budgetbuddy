/**
 * Family Settings Component (Mobile)
 *
 * Allows users to manage family members, send invitations, and configure family roles
 * Native mobile implementation with touch-optimized UI
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Card, Button } from "./ui";
import { useTheme } from "../hooks/useTheme";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

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

interface FamilySettingsProps {
  onClose?: () => void;
}

export const FamilySettings: React.FC<FamilySettingsProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"spouse" | "viewer">("spouse");
  const [inviting, setInviting] = useState(false);

  // Current user info
  const [currentUserRole, setCurrentUserRole] = useState<
    "primary" | "spouse" | "viewer"
  >("primary");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const styles = createStyles(colors);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      // Use id_token for API Gateway Cognito authorizer
      // Try SecureStore first (preferred), then AsyncStorage as fallback
      const { default: SecureStore } = await import("expo-secure-store");
      const token = await SecureStore.getItemAsync("auth_id_token");
      if (token) return token;
      // Fallback to AsyncStorage for backwards compatibility
      return await AsyncStorage.getItem("auth_id_token");
    } catch {
      return null;
    }
  };

  const loadFamilyMembers = useCallback(async () => {
    setError(null);

    try {
      const token = await getAuthToken();
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

      // Get current user info
      const userData = await AsyncStorage.getItem("user_data");
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.userId);
        const currentUser = data.members.find(
          (m: FamilyMember) => m.userId === user.userId,
        );
        if (currentUser) {
          setCurrentUserRole(currentUser.role);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load family members",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    setInviting(true);
    setError(null);

    try {
      const token = await getAuthToken();
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
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send invitation");
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Invitation sent to ${inviteEmail}!`);
      setInviteEmail("");
      setShowInviteForm(false);
      await loadFamilyMembers();
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
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
    try {
      const token = await getAuthToken();
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

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Role updated successfully");
      await loadFamilyMembers();
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update role",
      );
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberName} from your family?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) {
                throw new Error("Not authenticated");
              }

              const response = await fetch(
                `${API_BASE}/family/members/${userId}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to remove member");
              }

              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert("Success", "Member removed successfully");
              await loadFamilyMembers();
            } catch (err) {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error,
              );
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to remove member",
              );
            }
          },
        },
      ],
    );
  };

  const handleLeaveFamily = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      "Leave Family",
      "Are you sure you want to leave this family? You will lose access to shared budgets and transactions. A new personal family will be created for you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Family",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getAuthToken();
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

              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert(
                "Success",
                "You have left the family. A new personal family has been created for you.",
              );
              await loadFamilyMembers();
            } catch (err) {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error,
              );
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to leave family",
              );
            }
          },
        },
      ],
    );
  };

  const showRoleOptions = (member: FamilyMember) => {
    if (currentUserRole !== "primary" || member.role === "primary") return;

    Alert.alert(
      "Change Role",
      `Select a new role for ${member.name || member.email}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Spouse (Full Access)",
          onPress: () => handleChangeRole(member.userId, "spouse"),
        },
        {
          text: "Viewer (Read Only)",
          onPress: () => handleChangeRole(member.userId, "viewer"),
        },
      ],
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "primary":
        return colors.primary;
      case "spouse":
        return colors.success;
      case "viewer":
        return colors.warning;
      default:
        return colors.textMuted;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading family members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Family Settings</Text>
          <Text style={styles.subtitle}>
            Manage your family members and invitations
          </Text>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current Role Badge */}
        <Card style={styles.roleCard}>
          <Text style={styles.roleLabel}>Your Role</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRoleBadgeColor(currentUserRole) },
            ]}
          >
            <Text style={styles.roleBadgeText}>
              {currentUserRole.charAt(0).toUpperCase() +
                currentUserRole.slice(1)}
            </Text>
          </View>
        </Card>

        {/* Error Message */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          </Card>
        )}

        {/* Invite Button (Primary only) */}
        {currentUserRole === "primary" && !showInviteForm && (
          <Button
            title="+ Invite Family Member"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowInviteForm(true);
            }}
            style={styles.inviteButton}
          />
        )}

        {/* Invite Form */}
        {showInviteForm && (
          <Card style={styles.inviteForm}>
            <Text style={styles.formTitle}>Invite Family Member</Text>

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor={colors.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  inviteRole === "spouse" && styles.roleOptionSelected,
                ]}
                onPress={() => setInviteRole("spouse")}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    inviteRole === "spouse" && styles.roleOptionTextSelected,
                  ]}
                >
                  Spouse
                </Text>
                <Text style={styles.roleOptionDesc}>
                  Full access to budgets
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  inviteRole === "viewer" && styles.roleOptionSelected,
                ]}
                onPress={() => setInviteRole("viewer")}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    inviteRole === "viewer" && styles.roleOptionTextSelected,
                  ]}
                >
                  Viewer
                </Text>
                <Text style={styles.roleOptionDesc}>Read-only access</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowInviteForm(false);
                  setInviteEmail("");
                }}
                style={styles.cancelButton}
              />
              <Button
                title={inviting ? "Sending..." : "Send Invitation"}
                onPress={handleSendInvitation}
                disabled={inviting || !inviteEmail.trim()}
                style={styles.sendButton}
              />
            </View>
          </Card>
        )}

        {/* Family Members List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Family Members ({members.length})
          </Text>

          {members.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No family members yet</Text>
            </Card>
          ) : (
            members.map((member) => (
              <Card key={member.userId} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.name || member.email}
                  </Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  <Text style={styles.memberJoined}>
                    Joined {formatDate(member.joinedAt)}
                  </Text>
                </View>

                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={[
                      styles.memberRoleBadge,
                      { backgroundColor: getRoleBadgeColor(member.role) },
                    ]}
                    onPress={() => showRoleOptions(member)}
                    disabled={
                      currentUserRole !== "primary" || member.role === "primary"
                    }
                  >
                    <Text style={styles.memberRoleText}>
                      {member.role.charAt(0).toUpperCase() +
                        member.role.slice(1)}
                    </Text>
                  </TouchableOpacity>

                  {currentUserRole === "primary" &&
                    member.role !== "primary" && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() =>
                          handleRemoveMember(
                            member.userId,
                            member.name || member.email,
                          )
                        }
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Invitations ({pendingInvitations.length})
            </Text>

            {pendingInvitations.map((invitation) => (
              <Card key={invitation.invitationId} style={styles.invitationCard}>
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationEmail}>{invitation.email}</Text>
                  <Text style={styles.invitationRole}>
                    Role:{" "}
                    {invitation.role.charAt(0).toUpperCase() +
                      invitation.role.slice(1)}
                  </Text>
                  <Text style={styles.invitationExpires}>
                    Expires: {formatDate(invitation.expiresAt)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pendingBadge,
                    { backgroundColor: colors.warning },
                  ]}
                >
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Leave Family Button (Non-primary only) */}
        {currentUserRole !== "primary" && (
          <View style={styles.dangerSection}>
            <Button
              title="Leave Family"
              variant="outline"
              onPress={handleLeaveFamily}
              style={styles.leaveButton}
              textStyle={{ color: colors.error }}
            />
            <Text style={styles.leaveWarning}>
              You will lose access to shared budgets and transactions
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.textSecondary,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    closeButton: {
      position: "absolute",
      top: 0,
      right: 0,
      padding: 8,
    },
    closeButtonText: {
      fontSize: 24,
      color: colors.textMuted,
    },
    roleCard: {
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    roleLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    roleBadge: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    roleBadgeText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 14,
    },
    errorCard: {
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
    },
    inviteButton: {
      marginBottom: 16,
    },
    inviteForm: {
      padding: 16,
      marginBottom: 16,
    },
    formTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: 16,
    },
    roleSelector: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    roleOption: {
      flex: 1,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      alignItems: "center",
    },
    roleOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    roleOptionText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    roleOptionTextSelected: {
      color: colors.primary,
    },
    roleOptionDesc: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    formButtons: {
      flexDirection: "row",
      gap: 12,
    },
    cancelButton: {
      flex: 1,
    },
    sendButton: {
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    emptyCard: {
      padding: 24,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
    },
    memberCard: {
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    memberEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    memberJoined: {
      fontSize: 12,
      color: colors.textMuted,
    },
    memberActions: {
      alignItems: "flex-end",
      gap: 8,
    },
    memberRoleBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    memberRoleText: {
      color: "#fff",
      fontWeight: "500",
      fontSize: 12,
    },
    removeButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    removeButtonText: {
      color: colors.error,
      fontSize: 12,
      fontWeight: "500",
    },
    invitationCard: {
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    invitationInfo: {
      flex: 1,
    },
    invitationEmail: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    invitationRole: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    invitationExpires: {
      fontSize: 12,
      color: colors.textMuted,
    },
    pendingBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    pendingBadgeText: {
      color: "#fff",
      fontWeight: "500",
      fontSize: 12,
    },
    dangerSection: {
      marginTop: 24,
      alignItems: "center",
    },
    leaveButton: {
      borderColor: colors.error,
      marginBottom: 8,
    },
    leaveWarning: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
  });

export default FamilySettings;
