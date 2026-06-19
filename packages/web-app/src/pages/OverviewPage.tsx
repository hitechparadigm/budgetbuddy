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
import { PageHeader, StatCard, Badge, Skeleton, SkeletonCard } from '../components/ui';
import { Button } from '../components/ui';
import { apiClient } from '../utils/apiClient';
import { config } from '../config/environment';
import { getCurrentMonthString } from '../utils/monthHelpers';
import { WelcomeTooltipChain } from '../components/WelcomeTooltipChain';

// ─── Daily insight pool (P5-T8) ──────────────────────────────────────────────
// 30+ rotating insight templates — shown in round-robin by day-of-year

const DAILY_INSIGHT_TEMPLATES = [
  'Set up a "no-spend day" once a week to boost your savings rate by up to 15%.',
  'Subscriptions you don\'t track cost the average household $273/year. Check yours.',
  'Automating savings transfers on payday removes the temptation to spend first.',
  'The avalanche method saves more interest than snowball — but snowball wins psychologically.',
  'Dining out 3 fewer times per month typically saves $80–$120 for a family of two.',
  'A $5/day coffee habit costs $1,825/year. Swapping half to home brew saves $912.',
  'Emergency fund goal: 3–6 months of essential expenses in a high-yield savings account.',
  'Grocery shopping with a list reduces impulse purchases by an average of 23%.',
  'Negotiating one bill per month (insurance, phone, internet) can save $200–$600/year.',
  'The 24-hour rule: wait a day before any non-essential purchase over $50.',
  'Consolidating high-interest debt can cut your interest paid by 30–50%.',
  'Increasing your savings rate by just 1% per year compounds into significant wealth.',
  'Review your budget at the end of every month — it takes less than 5 minutes.',
  'Pre-committing grocery money in cash or a debit envelope reduces overspend by 18%.',
  'Tracking net worth monthly motivates better financial decisions than tracking income alone.',
  'The break-even on a gym membership is using it at least 12 times/month vs. a day pass.',
  'Meal prepping on Sundays saves the average person $120–$200 per month.',
  'Refinancing a $200k mortgage from 7% to 5.5% saves over $200/month.',
  'Zero-based budgeting users report feeling more in control of their money than 70% of savers.',
  'A "fun money" budget category reduces financial stress and increases overall adherence.',
  'Buying generic vs. name-brand groceries saves 20–25% on your grocery bill.',
  'Putting windfalls (tax refunds, bonuses) directly into savings before they hit checking wins.',
  'The best time to buy big-ticket items: holiday weekends and end of model-year.',
  'Checking your credit report every 4 months (rotate 3 bureaus) is free and catches errors early.',
  'Automated round-up savings apps save an average of $600/year with zero behavior change.',
  'The "pay yourself first" principle: treat savings like a bill you can\'t miss.',
  'Carpooling just twice a week can cut commuting costs by 40%.',
  'Your bank may waive annual fees on credit cards — it never hurts to ask.',
  'Shopping insurance annually (auto, home, life) takes 30 minutes and can save hundreds.',
  'Keeping a 1-month buffer in your checking account eliminates most overdraft fees.',
];

/** Get today's insight by cycling through the pool based on day-of-year */
function getDailyInsight(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return DAILY_INSIGHT_TEMPLATES[dayOfYear % DAILY_INSIGHT_TEMPLATES.length];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetPeriod {
  totalIncome: number;
  totalSavings: number;
  totalExpenses: number;
  remainingBalance: number;
  currency?: string;
  groups?: any;
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

  const income = period.totalIncome;
  const spent = period.totalExpenses + period.totalSavings;
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

/** Budget Health Score ring with components breakdown */
const BudgetHealthScore: React.FC<{ month: string }> = ({ month }) => {
  const [data, setData] = React.useState<{
    score: number;
    delta: number | null;
    interpretation: string;
    components: { savingsRate: number; adherence: number; goalProgress: number };
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const raw = await apiClient.get(`/budget/health-score?month=${month}`);
        const d = raw?.data ?? raw;
        if (d?.score != null) setData(d);
      } catch {
        // silent — section is optional
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month]);

  if (loading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (!data) return null;

  const size = 80;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (data.score / 100) * circ;
  const color = data.score >= 80 ? '#22c55e' : data.score >= 60 ? '#3b82f6' : data.score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="card p-5 flex items-center gap-6">
      {/* SVG ring */}
      <div className="shrink-0 relative" aria-hidden="true">
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-[var(--color-muted)]" />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold tabular-nums" style={{ color }}>{data.score}</span>
        </div>
      </div>
      {/* Details */}
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <h2 className="text-sm font-medium text-[var(--color-muted-foreground)]">Budget Health Score</h2>
          <span className="text-xs font-semibold" style={{ color }}>{data.interpretation}</span>
          {data.delta != null && (
            <Badge variant={data.delta >= 0 ? 'success' : 'danger'}>
              {data.delta >= 0 ? '+' : ''}{data.delta} from last month
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Savings rate', value: data.components.savingsRate },
            { label: 'Adherence', value: data.components.adherence },
            { label: 'Goal progress', value: data.components.goalProgress },
          ].map((c) => (
            <div key={c.label}>
              <p className="text-xs text-[var(--color-muted-foreground)]">{c.label}</p>
              <p className="text-sm font-semibold tabular-nums">{c.value}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
      const raw = await apiClient.get(`/budget/current?month=${currentMonth}`);
      // API returns { success, data: { totalIncome, totalSavings, totalExpenses, remainingBalance, groups, currency }, message }
      const data = raw?.data ?? raw;

      if (!data) {
        setLoadingBudget(false);
        return;
      }

      // totalIncome/totalSavings/totalExpenses are plain numbers from calculateBudgetTotals
      const period: BudgetPeriod = {
        totalIncome: Number(data.totalIncome) || 0,
        totalSavings: Number(data.totalSavings) || 0,
        totalExpenses: Number(data.totalExpenses) || 0,
        remainingBalance: Number(data.remainingBalance) || 0,
        currency: data.currency,
        groups: data.groups,
      };

      setPeriod(period);
      if (data.currency) setCurrency(data.currency);
    } catch {
      // silent — section shows empty state
    } finally {
      setLoadingBudget(false);
    }
  }, [currentMonth]);

  const loadGoals = useCallback(async () => {
    try {
      const raw = await apiClient.get('/goals');
      const data = raw?.data ?? raw;
      setGoals(data?.goals || (Array.isArray(data) ? data : []));
    } catch {
      // silent
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  const loadBills = useCallback(async () => {
    try {
      const raw = await apiClient.get('/bills');
      const data = raw?.data ?? raw;
      setBills(data?.bills || (Array.isArray(data) ? data : []));
    } catch {
      // silent
    } finally {
      setLoadingBills(false);
    }
  }, []);

  const loadNetWorth = useCallback(async () => {
    try {
      // Net-worth is on the extended features API (hkjzroedjf)
      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) { setLoadingNetWorth(false); return; }
      const res = await fetch(`${config.extendedFeaturesApiUrl}/net-worth/history?months=6`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setLoadingNetWorth(false); return; }
      const raw = await res.json();
      const data = raw?.data ?? raw;
      const history: NetWorthPoint[] = data?.history || (Array.isArray(data) ? data : []);
      setNetWorthHistory(history.map((p) => p.netWorth));
    } catch {
      // silent
    } finally {
      setLoadingNetWorth(false);
    }
  }, []);

  const loadInsight = useCallback(async () => {
    try {
      // Insights weekly is on the extended features API (hkjzroedjf)
      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) { setLoadingInsight(false); return; }
      const res = await fetch(`${config.extendedFeaturesApiUrl}/insights/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const raw = await res.json();
        const data = raw?.data ?? raw;
        // Extract the first highlight from weekly insights
        const insightText = data?.insights?.[0]?.message ||
          (data?.summary?.totalSpent != null
            ? `This week you spent $${(data.summary.totalSpent ?? 0).toFixed(0)}. Savings rate: ${((data.summary.savingsRate ?? 0)).toFixed(1)}%.`
            : null);
        setAiInsight(insightText ?? getDailyInsight());
      } else {
        // Fall back to daily rotating pool
        setAiInsight(getDailyInsight());
      }
    } catch {
      // Fall back to daily rotating pool on any network error
      setAiInsight(getDailyInsight());
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

    // Handle both array format (from API) and object format
    if (Array.isArray(groups)) {
      for (const group of groups as any[]) {
        if (group.type === 'expense' || group.type === 'savings') {
          for (const cat of (group.categories || [])) {
            cats.push({
              name: cat.name,
              plannedAmount: Number(cat.plannedAmount) || 0,
              spentAmount: Number(cat.spentAmount) || 0,
            });
          }
        }
      }
    } else {
      if ((groups as any).expenses?.categories) cats.push(...(groups as any).expenses.categories);
      if ((groups as any).savings?.categories) cats.push(...(groups as any).savings.categories);
    }
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
      {/* Welcome tooltip chain — shows on first visit */}
      <WelcomeTooltipChain />
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
          value={loadingBudget ? '—' : formatCurrency(period?.totalIncome || 0, currency)}
          icon={DollarSign}
          iconColor="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          loading={loadingBudget}
          onClick={() => navigate('/budget')}
        />
        <StatCard
          label="Total Spent"
          value={loadingBudget ? '—' : formatCurrency(period?.totalExpenses || 0, currency)}
          icon={ArrowUpRight}
          iconColor="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          loading={loadingBudget}
          onClick={() => navigate('/budget')}
        />
        <StatCard
          label="Total Saved"
          value={loadingBudget ? '—' : formatCurrency(period?.totalSavings || 0, currency)}
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

      {/* Budget Health Score — real data with premium gate for history */}
      <BudgetHealthScore month={currentMonth} />


      {/* Quick Add */}
      <QuickAddTransaction />
    </div>
  );
};

export default OverviewPage;
