/**
 * Budget Service
 *
 * Replaces familyService.ts. Wraps all /budgets/* API calls.
 * Handles budget management, member management, invitation management,
 * and budget lifecycle operations.
 *
 * **Validates: REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-15**
 */

import { config } from '../config/environment';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BudgetType = 'personal' | 'family' | 'shared';
export type MemberRole = 'owner' | 'partner' | 'household_member' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'expired' | 'revoked' | 'left';
export type BudgetStatus = 'active' | 'archived' | 'deleted';

export interface Budget {
  budgetId: string;
  name: string;
  budgetType: BudgetType;
  status: BudgetStatus;
  role: MemberRole;
  accessLabel: string | null;
  expiresAt: string | null;
}

export interface BudgetMember {
  userId: string;
  email: string | null;
  name: string | null;
  role: MemberRole;
  status: MemberStatus;
  accessLabel: string | null;
  joinedAt: string;
  expiresAt: string | null;
}

export interface Invitation {
  invitationId: string;
  email: string;
  role: MemberRole;
  accessLabel: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  viewerExpiresAt: string | null;
}

export interface AcceptInvitationResult {
  budgetId: string;
  role: MemberRole;
  message: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the base URL for the budgets API.
 * Prefers `config.budgetsApiUrl` when available; falls back to `config.familyApiUrl`
 * for backward compatibility during the migration period.
 */
function getBaseUrl(): string {
  // config may gain budgetsApiUrl in a future env update; fall back gracefully
  const cfg = config as unknown as Record<string, string>;
  return cfg['budgetsApiUrl'] ?? config.familyApiUrl;
}

/** Read the Cognito id_token from localStorage — same key used across all services. */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('budgetbuddy_id_token');
}

/** Build common request headers, throwing if no auth token is present. */
function buildHeaders(): Headers {
  const token = getToken();
  if (!token) {
    throw new BudgetServiceError('Please sign in to continue.', 401);
  }
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class BudgetServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BudgetServiceError';
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function budgetFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers = buildHeaders();

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let details: unknown = null;
    try {
      details = await response.json();
      if (
        details !== null &&
        typeof details === 'object' &&
        'message' in (details as object)
      ) {
        errorMessage = (details as { message: string }).message;
      }
    } catch {
      // Response body is not JSON — keep the default message
    }
    throw new BudgetServiceError(errorMessage, response.status, details);
  }

  // 204 No Content — return undefined cast to T
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Response envelope helpers
// ---------------------------------------------------------------------------

interface ApiEnvelope<T> {
  data?: T;
  [key: string]: unknown;
}

/** Unwrap `{ data: T }` envelope, or return the raw response if no envelope. */
function unwrap<T>(response: ApiEnvelope<T>): T {
  if (response.data !== undefined) return response.data;
  return response as unknown as T;
}

// ---------------------------------------------------------------------------
// Budget Service
// ---------------------------------------------------------------------------

export const budgetService = {
  // -------------------------------------------------------------------------
  // Budget management
  // -------------------------------------------------------------------------

  /** List all budgets the current user is a member of. */
  async getBudgets(): Promise<Budget[]> {
    const response = await budgetFetch<ApiEnvelope<{ budgets: Budget[] }>>('/budgets');
    const data = unwrap(response);
    return (data as { budgets: Budget[] }).budgets ?? (data as unknown as Budget[]);
  },

  /** Set the user's active (default) budget. */
  async setActiveBudget(budgetId: string): Promise<void> {
    await budgetFetch<void>('/budgets/active', {
      method: 'PUT',
      body: JSON.stringify({ budgetId }),
    });
  },

  /** Create a new budget. */
  async createBudget(name: string, budgetType: BudgetType, currency: string): Promise<Budget> {
    const response = await budgetFetch<ApiEnvelope<{ budget: Budget }>>('/budgets', {
      method: 'POST',
      body: JSON.stringify({ name, budgetType, currency }),
    });
    const data = unwrap(response);
    return (data as { budget: Budget }).budget ?? (data as unknown as Budget);
  },

  // -------------------------------------------------------------------------
  // Member management
  // -------------------------------------------------------------------------

  /**
   * Invite a new member to a budget.
   *
   * @param viewerExpiresAt - ISO date string for viewer membership expiry (optional)
   * @param accessLabel     - Human-readable label for the viewer (e.g. "Financial Advisor")
   */
  async inviteMember(
    budgetId: string,
    email: string,
    role: MemberRole,
    viewerExpiresAt?: string | null,
    accessLabel?: string | null
  ): Promise<Invitation> {
    const body: Record<string, unknown> = { email, role };
    if (viewerExpiresAt !== undefined) body['viewerExpiresAt'] = viewerExpiresAt;
    if (accessLabel !== undefined) body['accessLabel'] = accessLabel;

    const response = await budgetFetch<ApiEnvelope<{ invitation: Invitation }>>(
      `/budgets/${budgetId}/invite`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    const data = unwrap(response);
    return (data as { invitation: Invitation }).invitation ?? (data as unknown as Invitation);
  },

  /** List all members of a budget. */
  async getMembers(budgetId: string): Promise<BudgetMember[]> {
    const response = await budgetFetch<ApiEnvelope<{ members: BudgetMember[] }>>(
      `/budgets/${budgetId}/members`
    );
    const data = unwrap(response);
    return (data as { members: BudgetMember[] }).members ?? (data as unknown as BudgetMember[]);
  },

  /** Update a member's role within a budget. */
  async updateMemberRole(budgetId: string, userId: string, role: MemberRole): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  /** Remove a member from a budget (owner action). */
  async removeMember(budgetId: string, userId: string): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  /** Leave a budget (non-owner action). */
  async leaveBudget(budgetId: string): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}/leave`, {
      method: 'POST',
    });
  },

  /** Extend a viewer member's access expiry date. */
  async extendViewerAccess(budgetId: string, userId: string, expiresAt: string): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}/members/${userId}/extend`, {
      method: 'PUT',
      body: JSON.stringify({ expiresAt }),
    });
  },

  // -------------------------------------------------------------------------
  // Invitation management
  // -------------------------------------------------------------------------

  /** Accept a budget invitation by token. */
  async acceptInvitation(token: string): Promise<AcceptInvitationResult> {
    const response = await budgetFetch<ApiEnvelope<AcceptInvitationResult>>(
      '/budgets/accept-invitation',
      { method: 'POST', body: JSON.stringify({ token }) }
    );
    return unwrap(response);
  },

  /** List all pending invitations for a budget. */
  async getInvitations(budgetId: string): Promise<Invitation[]> {
    const response = await budgetFetch<ApiEnvelope<{ invitations: Invitation[] }>>(
      `/budgets/${budgetId}/invitations`
    );
    const data = unwrap(response);
    return (data as { invitations: Invitation[] }).invitations ?? (data as unknown as Invitation[]);
  },

  /** Resend an invitation email. */
  async resendInvitation(budgetId: string, invitationId: string): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  },

  /** Revoke a pending invitation. */
  async revokeInvitation(budgetId: string, invitationId: string): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  },

  // -------------------------------------------------------------------------
  // Budget lifecycle
  // -------------------------------------------------------------------------

  /** Archive a budget (makes it read-only). */
  async archiveBudget(budgetId: string): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}/archive`, {
      method: 'PUT',
    });
  },

  /** Restore an archived budget to active status. */
  async restoreBudget(budgetId: string): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}/restore`, {
      method: 'PUT',
    });
  },

  /** Permanently delete a budget. */
  async deleteBudget(budgetId: string): Promise<void> {
    await budgetFetch<void>(`/budgets/${budgetId}`, {
      method: 'DELETE',
    });
  },
};

export default budgetService;
