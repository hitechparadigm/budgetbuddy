/**
 * BudgetMembersPage
 *
 * Replaces FamilySettings.tsx. Full budget membership management page.
 * Supports member list, invite form, pending invitations, budget settings,
 * and leave-budget action.
 *
 * **Validates: REQ-5, REQ-7, REQ-15**
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  budgetService,
  Budget,
  BudgetMember,
  Invitation,
  MemberRole,
  BudgetServiceError,
} from '../services/budgetService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  partner: 'Partner',
  household_member: 'Household Member',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<MemberRole, string> = {
  owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  partner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  household_member: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  viewer: 'bg-[var(--color-muted)] text-[var(--color-foreground)] dark:bg-gray-700 dark:text-gray-300',
};

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BudgetMembersPageProps {
  /** The active budget. If omitted the page fetches it from budgetService. */
  budget?: Budget;
  /** Called after a successful leave or delete so the parent can redirect. */
  onBudgetLeft?: () => void;
  onBudgetDeleted?: () => void;
}

// ---------------------------------------------------------------------------
// Invite form state type
// ---------------------------------------------------------------------------

type ViewerExpiry = '30' | '60' | '90' | 'none';

interface InviteForm {
  email: string;
  role: MemberRole;
  viewerExpiry: ViewerExpiry;
  accessLabel: string;
}

const DEFAULT_INVITE_FORM: InviteForm = {
  email: '',
  role: 'partner',
  viewerExpiry: '30',
  accessLabel: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BudgetMembersPage: React.FC<BudgetMembersPageProps> = ({
  budget: budgetProp,
  onBudgetLeft,
  onBudgetDeleted,
}) => {
  const navigate = useNavigate();

  // ---- data state ----
  const [budget, setBudget] = useState<Budget | null>(budgetProp ?? null);
  const [members, setMembers] = useState<BudgetMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  // Start loading=false if no budgetProp — we'll set it true when we fetch
  const [loading, setLoading] = useState(budgetProp != null);

  // ---- UI state ----
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>(DEFAULT_INVITE_FORM);
  const [inviting, setInviting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // ---- derived ----
  const isOwner = budget?.role === 'owner';
  const budgetId = budget?.budgetId ?? '';

  // ---- load data ----
  const loadData = useCallback(async (bid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [membersData, invitationsData] = await Promise.all([
        budgetService.getMembers(bid),
        budgetService.getInvitations(bid).catch(() => [] as Invitation[]),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (err) {
      setError(err instanceof BudgetServiceError ? err.message : 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (budgetProp) {
      setBudget(budgetProp);
    }
  }, [budgetProp]);

  // When no budget prop is passed, auto-fetch the user's active budget
  useEffect(() => {
    if (!budgetProp) {
      setLoading(true);
      budgetService.getBudgets()
        .then((budgets) => {
          if (budgets.length > 0) {
            setBudget(budgets[0]);
          } else {
            setError('No budget found. Please complete onboarding first.');
            setLoading(false);
          }
        })
        .catch(() => {
          setError('Could not load your active budget.');
          setLoading(false);
        });
    }
  }, [budgetProp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (budgetId) {
      loadData(budgetId);
    }
  }, [budgetId, loadData]);

  // ---- helpers ----
  const showError = (msg: string) => { setError(msg); setSuccess(null); };
  const showSuccess = (msg: string) => { setSuccess(msg); setError(null); };

  // ---- invite ----
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      let viewerExpiresAt: string | null = null;
      if (inviteForm.role === 'viewer' && inviteForm.viewerExpiry !== 'none') {
        viewerExpiresAt = addDays(parseInt(inviteForm.viewerExpiry, 10));
      }
      const accessLabel =
        inviteForm.role === 'viewer' && inviteForm.accessLabel.trim()
          ? inviteForm.accessLabel.trim()
          : null;

      await budgetService.inviteMember(
        budgetId,
        inviteForm.email,
        inviteForm.role,
        viewerExpiresAt,
        accessLabel,
      );

      showSuccess(`Invitation sent to ${inviteForm.email}.`);
      setInviteForm(DEFAULT_INVITE_FORM);
      setShowInviteForm(false);
      await loadData(budgetId);
    } catch (err) {
      showError(err instanceof BudgetServiceError ? err.message : 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  // ---- revoke member ----
  const handleRevokeMember = async (member: BudgetMember) => {
    if (!confirm(`Remove ${member.name ?? member.email} from this budget?`)) return;
    setActionInProgress(`revoke-${member.userId}`);
    try {
      await budgetService.removeMember(budgetId, member.userId);
      showSuccess(`${member.name ?? member.email} has been removed.`);
      await loadData(budgetId);
    } catch (err) {
      showError(err instanceof BudgetServiceError ? err.message : 'Failed to remove member.');
    } finally {
      setActionInProgress(null);
    }
  };

  // ---- extend viewer ----
  const handleExtendViewer = async (member: BudgetMember) => {
    const newExpiry = addDays(30);
    setActionInProgress(`extend-${member.userId}`);
    try {
      await budgetService.extendViewerAccess(budgetId, member.userId, newExpiry);
      showSuccess(`Access extended for ${member.name ?? member.email} by 30 days.`);
      await loadData(budgetId);
    } catch (err) {
      showError(err instanceof BudgetServiceError ? err.message : 'Failed to extend access.');
    } finally {
      setActionInProgress(null);
    }
  };

  // ---- invitation actions ----
  const handleResendInvitation = async (inv: Invitation) => {
    setActionInProgress(`resend-${inv.invitationId}`);
    try {
      await budgetService.resendInvitation(budgetId, inv.invitationId);
      showSuccess(`Invitation resent to ${inv.email}.`);
    } catch (err) {
      showError(err instanceof BudgetServiceError ? err.message : 'Failed to resend invitation.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelInvitation = async (inv: Invitation) => {
    if (!confirm(`Cancel invitation to ${inv.email}?`)) return;
    setActionInProgress(`cancel-${inv.invitationId}`);
    try {
      await budgetService.revokeInvitation(budgetId, inv.invitationId);
      showSuccess(`Invitation to ${inv.email} cancelled.`);
      await loadData(budgetId);
    } catch (err) {
      showError(err instanceof BudgetServiceError ? err.message : 'Failed to cancel invitation.');
    } finally {
      setActionInProgress(null);
    }
  };

  // ---- budget lifecycle ----
  const handleArchive = async () => {
    if (!confirm('Archive this budget? It will become read-only.')) return;
    setActionInProgress('archive');
    try {
      await budgetService.archiveBudget(budgetId);
      showSuccess('Budget archived.');
    } catch (err) {
      showError(err instanceof BudgetServiceError ? err.message : 'Failed to archive budget.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this budget? This cannot be undone.')) return;
    setActionInProgress('delete');
    try {
      await budgetService.deleteBudget(budgetId);
      showSuccess('Budget deleted.');
      onBudgetDeleted?.();
      navigate('/budget');
    } catch (err) {
      showError(err instanceof BudgetServiceError ? err.message : 'Failed to delete budget.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this budget? You will lose access.')) return;
    setActionInProgress('leave');
    try {
      await budgetService.leaveBudget(budgetId);
      showSuccess('You have left the budget.');
      onBudgetLeft?.();
      navigate('/budget');
    } catch (err) {
      showError(err instanceof BudgetServiceError ? err.message : 'Failed to leave budget.');
    } finally {
      setActionInProgress(null);
    }
  };

  // ---- loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-[var(--color-muted-foreground)] mb-2">{error || 'No budget found. Please complete onboarding first.'}</p>
        <button
          onClick={() => navigate('/budget')}
          className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
        >
          Go to Budget
        </button>
      </div>
    );
  }

  // ---- render ----
  return (
    <div className="min-h-screen bg-[var(--color-background)] dark:bg-gray-900">
      {/* Page header */}
      <div className="bg-[var(--color-surface)] dark:bg-gray-800 border-b border-[var(--color-border)] dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] dark:text-[var(--color-muted-foreground)] dark:hover:text-gray-100"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-foreground)] dark:text-gray-100">
              {budget.name}
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">Members &amp; Settings</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
            {success}
          </div>
        )}

        {/* ---- Members section ---- */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] dark:text-gray-100">Members</h2>
            {isOwner && (
              <button
                onClick={() => setShowInviteForm((v) => !v)}
                className="flex items-center space-x-1 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Invite Member</span>
              </button>
            )}
          </div>

          {/* Invite form */}
          {showInviteForm && isOwner && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-base font-medium text-[var(--color-foreground)] dark:text-gray-100 mb-4">Invite a Member</h3>
              <form onSubmit={handleInvite} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="invite-email" className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1">
                    Email address
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="colleague@example.com"
                    className="w-full px-3 py-2 border border-[var(--color-border)] dark:border-gray-600 rounded-md bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-foreground)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="invite-role" className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    id="invite-role"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as MemberRole }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] dark:border-gray-600 rounded-md bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-foreground)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="partner">Partner — full edit access</option>
                    <option value="household_member">Household Member — can add transactions</option>
                    <option value="viewer">Viewer — read-only access</option>
                  </select>
                </div>

                {/* Viewer-only fields */}
                {inviteForm.role === 'viewer' && (
                  <>
                    <div>
                      <label htmlFor="invite-expiry" className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1">
                        Access expires
                      </label>
                      <select
                        id="invite-expiry"
                        value={inviteForm.viewerExpiry}
                        onChange={(e) => setInviteForm((f) => ({ ...f, viewerExpiry: e.target.value as ViewerExpiry }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] dark:border-gray-600 rounded-md bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-foreground)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="none">No expiry</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="invite-label" className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1">
                        Access label <span className="text-[var(--color-muted-foreground)] font-normal">(optional)</span>
                      </label>
                      <input
                        id="invite-label"
                        type="text"
                        value={inviteForm.accessLabel}
                        onChange={(e) => setInviteForm((f) => ({ ...f, accessLabel: e.target.value }))}
                        placeholder="e.g. Financial Advisor"
                        className="w-full px-3 py-2 border border-[var(--color-border)] dark:border-gray-600 rounded-md bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-foreground)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowInviteForm(false); setInviteForm(DEFAULT_INVITE_FORM); }}
                    className="flex-1 px-4 py-2 border border-[var(--color-border)] dark:border-gray-600 text-[var(--color-foreground)] dark:text-gray-300 rounded-lg hover:bg-[var(--color-background)] dark:hover:bg-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-[var(--color-muted)] disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm"
                  >
                    {inviting ? 'Sending…' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Member list */}
          <div className="bg-[var(--color-surface)] dark:bg-gray-800 border border-[var(--color-border)] dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            {members.length === 0 ? (
              <p className="p-6 text-center text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">No members yet.</p>
            ) : (
              members.map((member) => (
                <div key={member.userId} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Name + role badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--color-foreground)] dark:text-gray-100 truncate">
                        {member.name ?? member.email ?? 'Unknown'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[member.role]}`}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>
                    {/* Email */}
                    {member.email && (
                      <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mt-0.5 truncate">{member.email}</p>
                    )}
                    {/* Viewer extras */}
                    {member.role === 'viewer' && (
                      <div className="mt-1 space-y-0.5">
                        {member.accessLabel && (
                          <p className="text-xs text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
                            Label: <span className="font-medium">{member.accessLabel}</span>
                          </p>
                        )}
                        {member.expiresAt && (
                          <p className="text-xs text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
                            Expires: <span className="font-medium">{formatDate(member.expiresAt)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Owner actions for viewers */}
                  {isOwner && member.role === 'viewer' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleExtendViewer(member)}
                        disabled={actionInProgress === `extend-${member.userId}`}
                        className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                      >
                        {actionInProgress === `extend-${member.userId}` ? '…' : 'Extend'}
                      </button>
                      <button
                        onClick={() => handleRevokeMember(member)}
                        disabled={actionInProgress === `revoke-${member.userId}`}
                        className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        {actionInProgress === `revoke-${member.userId}` ? '…' : 'Revoke'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* ---- Pending invitations ---- */}
        {invitations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] dark:text-gray-100 mb-4">
              Pending Invitations
            </h2>
            <div className="bg-[var(--color-surface)] dark:bg-gray-800 border border-[var(--color-border)] dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
              {invitations.map((inv) => (
                <div key={inv.invitationId} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--color-foreground)] dark:text-gray-100 truncate">{inv.email}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[inv.role]}`}>
                        {ROLE_LABELS[inv.role]}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Pending
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mt-1">
                      Sent {formatDate(inv.createdAt)} · Expires {formatDate(inv.expiresAt)}
                    </p>
                    {inv.accessLabel && (
                      <p className="text-xs text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mt-0.5">
                        Label: <span className="font-medium">{inv.accessLabel}</span>
                      </p>
                    )}
                  </div>

                  {isOwner && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleResendInvitation(inv)}
                        disabled={actionInProgress === `resend-${inv.invitationId}`}
                        className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                      >
                        {actionInProgress === `resend-${inv.invitationId}` ? '…' : 'Resend'}
                      </button>
                      <button
                        onClick={() => handleCancelInvitation(inv)}
                        disabled={actionInProgress === `cancel-${inv.invitationId}`}
                        className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        {actionInProgress === `cancel-${inv.invitationId}` ? '…' : 'Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Budget settings (owner only) ---- */}
        {isOwner && (
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] dark:text-gray-100 mb-4">
              Budget Settings
            </h2>
            <div className="bg-[var(--color-surface)] dark:bg-gray-800 border border-[var(--color-border)] dark:border-gray-700 rounded-lg p-6 space-y-4">
              {/* Archive */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--color-foreground)] dark:text-gray-100">Archive Budget</p>
                  <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
                    Makes the budget read-only. You can restore it later.
                  </p>
                </div>
                <button
                  onClick={handleArchive}
                  disabled={actionInProgress === 'archive'}
                  className="flex-shrink-0 px-4 py-2 border border-[var(--color-border)] dark:border-gray-600 text-[var(--color-foreground)] dark:text-gray-300 rounded-lg hover:bg-[var(--color-background)] dark:hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
                >
                  {actionInProgress === 'archive' ? 'Archiving…' : 'Archive Budget'}
                </button>
              </div>

              <hr className="border-gray-100 dark:border-gray-700" />

              {/* Delete */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">Delete Budget</p>
                  <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
                    {budget.budgetType === 'personal'
                      ? 'Personal budgets cannot be deleted.'
                      : 'Permanently deletes the budget and all its data. This cannot be undone.'}
                  </p>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={actionInProgress === 'delete' || budget.budgetType === 'personal'}
                  title={budget.budgetType === 'personal' ? 'Personal budgets cannot be deleted' : undefined}
                  className="flex-shrink-0 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {actionInProgress === 'delete' ? 'Deleting…' : 'Delete Budget'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ---- Leave budget (non-owners) ---- */}
        {!isOwner && (
          <section className="pt-2 border-t border-[var(--color-border)] dark:border-gray-700">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[var(--color-foreground)] dark:text-gray-100">Leave Budget</p>
                <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
                  You will lose access to this budget. A new personal budget will be created for you if needed.
                </p>
              </div>
              <button
                onClick={handleLeave}
                disabled={actionInProgress === 'leave'}
                className="flex-shrink-0 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium disabled:opacity-50"
              >
                {actionInProgress === 'leave' ? 'Leaving…' : 'Leave Budget'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BudgetMembersPage;
