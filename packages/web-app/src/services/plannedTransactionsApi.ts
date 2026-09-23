/**
 * Planned Transactions API service
 *
 * Planned transactions (recurring + one-time future transactions) live on
 * the extended features API gateway.
 */

import { config } from '../config/environment';

const API_BASE = config.extendedFeaturesApiUrl;

function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface PlannedTransaction {
  planId: string;
  budgetId: string;
  transactionType: 'income' | 'expense';
  amount: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string | null;
  isRecurring: boolean;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | null;
  nextOccurrence: string | null;
  endDate: string | null;
  isExecuted: boolean;
  executedTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlannedTransactionInput {
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  date: string;
  time?: string;
  notes?: string;
  isRecurring?: boolean;
  frequency?: PlannedTransaction['frequency'];
  endDate?: string;
}

export async function getPlannedTransactions(params?: {
  type?: 'income' | 'expense';
  startDate?: string;
  endDate?: string;
  includeExecuted?: boolean;
}): Promise<PlannedTransaction[]> {
  const q = new URLSearchParams();
  if (params?.type) q.set('type', params.type);
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  if (params?.includeExecuted) q.set('includeExecuted', 'true');

  const res = await fetch(`${API_BASE}/transaction-planning?${q}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load planned transactions');
  const data = await res.json();
  return (data.data?.plans ?? data.plans ?? data.data ?? []) as PlannedTransaction[];
}

export async function createPlannedTransaction(input: CreatePlannedTransactionInput): Promise<PlannedTransaction> {
  const res = await fetch(`${API_BASE}/transaction-planning`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to create planned transaction');
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function updatePlannedTransaction(
  planId: string,
  input: Partial<CreatePlannedTransactionInput>
): Promise<PlannedTransaction> {
  const res = await fetch(`${API_BASE}/transaction-planning/${planId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update planned transaction');
  const data = await res.json();
  return data.data ?? data;
}

export async function deletePlannedTransaction(planId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/transaction-planning/${planId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete planned transaction');
}

export async function executePlannedTransaction(planId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/transaction-planning/execute`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ planId }),
  });
  if (!res.ok) throw new Error('Failed to execute planned transaction');
}
