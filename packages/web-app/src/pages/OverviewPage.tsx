/**
 * Overview Page — Financial Dashboard
 *
 * The home page for authenticated users. Provides a financial snapshot
 * answering "How am I doing right now?" without requiring navigation to
 * individual sections.
 *
 * Sections:
 * 1. Financial Health Bar — income assigned / spent / remaining
 * 2. Net Worth Trend — 6-month sparkline
 * 3. Top Spending Categories — 5 categories vs budget bar chart
 * 4. Upcoming Bills — next 7 days
 * 5. Active Goals — top 3 compact progress
 * 6. AI Insight of the Day
 * 7. Quick Add Transaction — inline form
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Wallet,
  FileText,
  Sparkles,
  Plus,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from 'lucide-react';
import { PageHeader, StatCard, Badge, Skeleton, SkeletonCard, PremiumGate } from '../components/ui';
import { Button } from '../components/ui';
import { apiClient } from '../utils/apiClient';
import { getCurrentMonthString } from '../utils/monthHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetPeriod {
  totalIncome: { planned: number; actual: number; remaining: number };
  totalSavings: { planned: number; actual: number; remaining: number };
  totalExpenses: { planned: number; actual: number; remaining: number };
  remainingBalance: number;
  groups?: {
    income?: { categories?: CategoryData[] };
    savings?: { categories?: CategoryData[] };
    expenses?: { categories?: CategoryData[] };
  };
}

interface CategoryData {
  name: string;
  plannedAmount: number;
  spentAmount: number;
}

interface GoalData {
  goalId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

interface BillData {
  billId: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

interface NetWorthPoint {
  month: string;
  netWorth: number;
}

interface WeeklyInsight {
  summary?: string;
  highlights?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Simple SVG sparkline — no external charting library needed */
const Sparkline: React.FC<{ data: number[]; width?: number; height?: number }> = ({
  data,
  width = 120,
  height = 40,
}) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const trend = data[data.length - 1] >= data[0];

  return (
    <svg
      width={width}
      height={height}
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={trend ? '#22c55e' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FinancialHealthBar: React.FC<{
  period: BudgetPeriod | null;
  loading: boolean;
  currency: string;
}> = ({ period, loading, currency }) => {
  if (loading) return <Skeleton className="h-20 w-full rounded-xl" />;
  if (!period) return null;

  const income = period.totalIncome.actual;
  const assigned = income - Math.max(period.remainingBalance, 0);
  const spent = period.totalExpenses.actual + period.totalSavings.actual;
  const remaining = period.remainingBalance;
  const pct = income > 0 ? Math.min((spent / income) * 100, 100) : 0;
  const isOver = remaining < 0;

  return (
    <div
      className="card p-5"
      role="region"
      aria-label="Financial health summary"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Budget Health — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        {isOver ? (
          <Badge variant="danger">Over budget</Badge>
        ) : (
          <Badge variant="success">On track</Badge>
        )}
      </div>
      <div className="flex gap-6 mb-3">
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Income</p>
          <p className="text-lg font-semibold tabular-nums">{formatCurrency(income, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Spent</p>
          <p className="text-lg font-semibold tabular-nums">{formatCurrency(spent, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Remaining</p>
          <p className={`text-lg font-semibold tabular-nums ${isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatCurrency(Math.abs(remaining), currency)}
            {isOver ? ' over' : ''}
          </p>
        </div>
        {Math.max(period.remainingBalance, 0) > 0 && (
          <div>
            <p className="text-xs text-[var(--color-muted-foreground)]">Unassigned</p>
            <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(period.remainingBalance, currency)}
            </p>
          </div>
        )}
      </div>
      <div
        className="h-2.5 bg-[var(--color-muted)] rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(pct)}% of income spent`}
      >
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
        {Math.round(pct)}% of income spent
        {assigned !== spent && ` · ${formatCurrency(assigned, currency)} assigned`}
      </p>
    </div>
  );
};

const TopCategories: React.FC<{
  categories: CategoryData[];
  loading: boolean;
  currency: string;
}> = ({ categories, loading, currency }) => {
  if (loading) return <SkeletonCard />;
  if (!categories.length) return null;

  const top5 = categories
    .filter((c) => c.plannedAmount > 0)
    .sort((a, b) => b.spentAmount - a.spentAmount)
    .slice(0, 5);

  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium text-[var(--color-muted-foreground)] mb-4">
        Top Spending Categories
      </h2>
      <div className="space-y-3">
        {top5.map((cat) => {
          const pct = cat.plannedAmount > 0
            ? Math.min((cat.spentAmount / cat.plannedAmount) * 100, 100)
            : 0;
          const isOver = cat.spentAmount > cat.plannedAmount;
          return (
            <div key={cat.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--color-foreground)] font-medium truncate">{cat.name}</span>
                <span className={`tabular-nums shrink-0 ml-2 ${isOver ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-muted-foreground)]'}`}>
                  {formatCurrency(cat.spentAmount, currency)} / {formatCurrency(cat.plannedAmount, currency)}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const UpcomingBills: React.FC<{
  bills: BillData[];
  loading: boolean;
  currency: string;
  onViewAll: () => void;
}> = ({ bills, loading, currency, onViewAll }) => {
  if (loading) return <SkeletonCard />;

  const upcoming = bills
    .filter((b) => !b.isPaid && daysUntil(b.dueDate) <= 7 && daysUntil(b.dueDate) >= 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Upcoming Bills (7 days)
        </h2>
        <Button variant="ghost" size="sm" onClick={onViewAll} rightIcon={<ChevronRight className="w-3 h-3" />}>
          View all
        </Button>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">No bills due in the next 7 days.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((bill) => {
            const days = daysUntil(bill.dueDate);
            return (
              <div key={bill.billId} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[var(--color-muted-foreground)] shrink-0" aria-hidden="true" />
                  <span className="text-sm text-[var(--color-foreground)] truncate">{bill.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={days === 0 ? 'danger' : days <= 2 ? 'warning' : 'neutral'}>
                    {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                  </Badge>
                  <span className="text-sm tabular-nums font-medium">
                    {formatCurrency(bill.amount, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ActiveGoals: React.FC<{
  goals: GoalData[];
  loading: boolean;
  currency: string;
  onViewAll: () => void;
}> = ({ goals, loading, currency, onViewAll }) => {
  if (loading) return <SkeletonCard />;

  const top3 = goals
    .filter((g) => g.currentAmount < g.targetAmount)
    .slice(0, 3);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[var(--color-muted-foreground)]">Active Goals</h2>
        <Button variant="ghost" size="sm" onClick={onViewAll} rightIcon={<ChevronRight className="w-3 h-3" />}>
          View all
        </Button>
      </div>
      {top3.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-[var(--color-muted-foreground)] mb-3">No active goals yet.</p>
          <Button variant="outline" size="sm" onClick={onViewAll} leftIcon={<Plus className="w-4 h-4" />}>
            Add a goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {top3.map((goal) => {
            const pct = goal.targetAmount > 0
              ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
              : 0;
            return (
              <div key={goal.goalId}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[var(--color-foreground)] font-medium flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                    {goal.name}
                  </span>
                  <span className="text-[var(--color-muted-foreground)] tabular-nums">
                    {Math.round(pct)}%
                  </span>
                </div>
                <div
                  className="h-2 bg-[var(--color-muted)] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.name}: ${Math.round(pct)}% complete`}
                >
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-[var(--color-muted-foreground)]">
                  <span>{formatCurrency(goal.currentAmount, currency)} saved</span>
                  <span>of {formatCurrency(goal.targetAmount, currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AIInsightCard: React.FC<{
  insight: string | null;
  loading: boolean;
}> = ({ insight, loading }) => {
  if (loading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (!insight) return null;

  return (
    <div className="card p-4 flex items-start gap-3 bg-[var(--color-accent)] border-[var(--color-accent-foreground)]/20">
      <Sparkles className="w-5 h-5 text-[var(--color-accent-foreground)] shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-[var(--color-accent-foreground)]">{insight}</p>
    </div>
  );
};

const QuickAddTransaction: React.FC<{
  onSuccess?: () => void;
}> = () => {
  const navigate = useNavigate();

  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium text-[var(--color-muted-foreground)] mb-3">
        Quick Add
      </h2>
      <Button
        variant="primary"
        fullWidth
        leftIcon={<Plus className="w-4 h-4" />}
        onClick={() => navigate('/budget')}
      >
        Add Transaction
      </Button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const currentMonth = getCurrentMonthString();

  // Data state
  const [period, setPeriod] = useState<BudgetPeriod | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [bills, setBills] = useState<BillData[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<number[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');

  // Loading state per section
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingNetWorth, setLoadingNetWorth] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(true);

  const loadBudget = useCallback(async () => {
    try {
      const data = await apiClient.get(`/budget/current?month=${currentMonth}`);
      setPeriod(data);
      if (data?.currency) setCurrency(data.currency);
    } catch {
      // silent — section shows empty state
    } finally {
      setLoadingBudget(false);
    }
  }, [currentMonth]);

  const loadGoals = useCallback(async () => {
    try {
      const data = await apiClient.get('/goals');
      setGoals(data?.goals || data || []);
    } catch {
      // silent
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  const loadBills = useCallback(async () => {
    try {
      const data = await apiClient.get('/bills?upcoming=true');
      setBills(data?.bills || data || []);
    } catch {
      // silent
    } finally {
      setLoadingBills(false);
    }
  }, []);

  const loadNetWorth = useCallback(async () => {
    try {
      const data = await apiClient.get('/net-worth/history?months=6');
      const history: NetWorthPoint[] = data?.history || data || [];
      setNetWorthHistory(history.map((p) => p.netWorth));
    } catch {
      // silent
    } finally {
      setLoadingNetWorth(false);
    }
  }, []);

  const loadInsight = useCallback(async () => {
    try {
      const data = await apiClient.get('/insights/summary');
      const insight: WeeklyInsight = data;
      setAiInsight(
        insight?.summary ||
        (insight?.highlights && insight.highlights[0]) ||
        null
      );

      // Also try to load today's spending nudge
      try {
        const today = new Date().toISOString().split('T')[0];
        const nudgeData = await apiClient.get(`/nudges/${today}`);
        if (nudgeData?.nudges?.[0]?.message && !insight?.summary) {
          setAiInsight(nudgeData.nudges[0].message);
        }
      } catch {
        // nudges endpoint not available yet — use summary only
      }
    } catch {
      // silent
    } finally {
      setLoadingInsight(false);
    }
  }, []);

  useEffect(() => {
    // Load all sections in parallel — failures are isolated
    loadBudget();
    loadGoals();
    loadBills();
    loadNetWorth();
    loadInsight();
  }, [loadBudget, loadGoals, loadBills, loadNetWorth, loadInsight]);

  // Extract top spending categories from budget period
  const topCategories: CategoryData[] = React.useMemo(() => {
    if (!period?.groups) return [];
    const cats: CategoryData[] = [];
    const groups = period.groups;
    if (groups.expenses?.categories) cats.push(...groups.expenses.categories);
    if (groups.savings?.categories) cats.push(...groups.savings.categories);
    return cats;
  }, [period]);

  // Net worth trend label
  const netWorthTrend = React.useMemo(() => {
    if (netWorthHistory.length < 2) return null;
    const delta = netWorthHistory[netWorthHistory.length - 1] - netWorthHistory[0];
    const direction: 'up' | 'down' | 'neutral' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
    return {
      value: formatCurrency(Math.abs(delta), currency),
      direction,
      label: `${delta >= 0 ? '+' : '-'}${formatCurrency(Math.abs(delta), currency)} over 6 months`,
    };
  }, [netWorthHistory, currency]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Overview"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        action={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/budget')}
          >
            Add Transaction
          </Button>
        }
      />

      {/* AI Insight */}
      <AIInsightCard insight={aiInsight} loading={loadingInsight} />

      {/* Financial Health Bar — full width */}
      <FinancialHealthBar period={period} loading={loadingBudget} currency={currency} />

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Income"
          value={loadingBudget ? '—' : formatCurrency(period?.totalIncome.planned || 0, currency)}
          icon={DollarSign}
          iconColor="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          loading={loadingBudget}
          onClick={() => navigate('/budget')}
        />
        <StatCard
          label="Total Spent"
          value={loadingBudget ? '—' : formatCurrency(period?.totalExpenses.actual || 0, currency)}
          icon={ArrowUpRight}
          iconColor="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          loading={loadingBudget}
          onClick={() => navigate('/budget')}
        />
        <StatCard
          label="Total Saved"
          value={loadingBudget ? '—' : formatCurrency(period?.totalSavings.actual || 0, currency)}
          icon={ArrowDownRight}
          iconColor="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          loading={loadingBudget}
          onClick={() => navigate('/goals')}
        />
        <StatCard
          label="Net Worth"
          value={
            loadingNetWorth
              ? '—'
              : netWorthHistory.length
              ? formatCurrency(netWorthHistory[netWorthHistory.length - 1], currency)
              : 'Connect accounts'
          }
          icon={Wallet}
          iconColor="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
          trend={netWorthTrend?.label}
          trendDirection={netWorthTrend?.direction}
          loading={loadingNetWorth}
          onClick={() => navigate('/net-worth')}
        />
      </div>

      {/* Net Worth Sparkline — only if data exists */}
      {!loadingNetWorth && netWorthHistory.length >= 2 && (
        <div className="card p-5 flex items-center gap-6">
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-1">Net Worth Trend (6 months)</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(netWorthHistory[netWorthHistory.length - 1], currency)}
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <Sparkline data={netWorthHistory} width={200} height={50} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/net-worth')}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Details
          </Button>
        </div>
      )}

      {/* Bottom grid — categories, bills, goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopCategories
          categories={topCategories}
          loading={loadingBudget}
          currency={currency}
        />
        <UpcomingBills
          bills={bills}
          loading={loadingBills}
          currency={currency}
          onViewAll={() => navigate('/bills')}
        />
        <ActiveGoals
          goals={goals}
          loading={loadingGoals}
          currency={currency}
          onViewAll={() => navigate('/goals')}
        />
      </div>

      {/* Budget Health Score — Premium gate */}
      <PremiumGate
        feature="Budget Health Score"
        description="A single score (0–100) showing your savings rate, budget adherence, and goal progress. See month-over-month history."
        blurChildren={false}
      />

      {/* Quick Add */}
      <QuickAddTransaction />
    </div>
  );
};

export default OverviewPage;
