/**
 * Tools Page — Financial Calculators
 *
 * Pure client-side calculators — no API calls needed.
 * 1. Debt Payoff Calculator — min payment vs extra payment scenarios
 * 2. Compound Interest Calculator — growth over time with compounding
 */

import { useState, useMemo } from 'react';
import { PageHeader } from '../components/ui';
import { formatCurrency } from '@budget-buddy/shared/src/utils/currency';

type Tab = 'debt' | 'compound';

// ─── Debt Payoff Calculator ──────────────────────────────────────────────────

interface DebtScenario {
  label: string;
  extraPayment: number;
  months: number;
  totalInterest: number;
  totalPaid: number;
}

function calcDebtPayoff(balance: number, apr: number, minPayment: number, extra: number): DebtScenario | null {
  if (balance <= 0 || apr <= 0 || minPayment <= 0) return null;
  const monthlyRate = apr / 100 / 12;
  const payment = minPayment + extra;
  // Check payment covers interest
  const monthlyInterest = balance * monthlyRate;
  if (payment <= monthlyInterest) return null;

  let remaining = balance;
  let totalInterest = 0;
  let months = 0;
  const MAX_MONTHS = 600;

  while (remaining > 0.01 && months < MAX_MONTHS) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    const principal = Math.min(payment - interest, remaining);
    remaining -= principal;
    months++;
  }

  return {
    label: extra === 0 ? 'Minimum only' : `+${formatCurrency(extra, 'USD')} extra/mo`,
    extraPayment: extra,
    months,
    totalInterest,
    totalPaid: balance + totalInterest,
  };
}

/**
 * Standard minimum payment formula used by most lenders:
 * max($25, 1% of balance + monthly interest)
 * This ensures the payment always covers interest + a little principal.
 */
function calcMinPayment(balance: number, apr: number): number {
  if (balance <= 0 || apr < 0) return 0;
  const monthlyRate = apr / 100 / 12;
  const monthlyInterest = balance * monthlyRate;
  // 1% of balance + full monthly interest — covers interest and chips away principal
  const computed = Math.ceil(balance * 0.01 + monthlyInterest);
  return Math.max(computed, 25); // $25 minimum floor
}

function DebtCalculator() {
  const [balance, setBalance] = useState('10000');
  const [apr, setApr] = useState('19.99');
  const [minPaymentOverridden, setMinPaymentOverridden] = useState(false);
  const [minPayment, setMinPayment] = useState(() => {
    // Initial auto-calculated value for defaults
    return String(calcMinPayment(10000, 19.99));
  });

  // Auto-recalculate min payment when balance/APR changes — unless user has overridden
  const handleBalanceChange = (val: string) => {
    setBalance(val);
    if (!minPaymentOverridden) {
      const b = parseFloat(val);
      const a = parseFloat(apr);
      if (b > 0 && a >= 0) setMinPayment(String(calcMinPayment(b, a)));
    }
  };

  const handleAprChange = (val: string) => {
    setApr(val);
    if (!minPaymentOverridden) {
      const b = parseFloat(balance);
      const a = parseFloat(val);
      if (b > 0 && a >= 0) setMinPayment(String(calcMinPayment(b, a)));
    }
  };

  const handleMinPaymentChange = (val: string) => {
    setMinPayment(val);
    setMinPaymentOverridden(true);
  };

  const resetMinPayment = () => {
    const b = parseFloat(balance);
    const a = parseFloat(apr);
    setMinPayment(String(calcMinPayment(b, a)));
    setMinPaymentOverridden(false);
  };

  const extraOptions = [0, 50, 100, 200, 500];

  const scenarios = useMemo(() => {
    const b = parseFloat(balance);
    const a = parseFloat(apr);
    const m = parseFloat(minPayment);
    return extraOptions
      .map(extra => calcDebtPayoff(b, a, m, extra))
      .filter(Boolean) as DebtScenario[];
  }, [balance, apr, minPayment]);

  const base = scenarios[0];
  const currency = 'USD';

  const fmtMonths = (m: number) => {
    if (m >= 600) return '50+ years';
    const y = Math.floor(m / 12);
    const mo = m % 12;
    if (y === 0) return `${mo} mo`;
    if (mo === 0) return `${y} yr`;
    return `${y} yr ${mo} mo`;
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="dc-balance" className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
            Current Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">$</span>
            <input
              id="dc-balance"
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={e => handleBalanceChange(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="10000"
              min="0"
            />
          </div>
        </div>
        <div>
          <label htmlFor="dc-apr" className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
            Interest Rate (APR)
          </label>
          <div className="relative">
            <input
              id="dc-apr"
              type="number"
              inputMode="decimal"
              value={apr}
              onChange={e => handleAprChange(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="19.99"
              step="0.01"
              min="0"
              max="100"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">%</span>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="dc-min" className="text-sm font-medium text-[var(--color-foreground)]">
              Minimum Monthly Payment
            </label>
            {minPaymentOverridden ? (
              <button
                type="button"
                onClick={resetMinPayment}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Reset to auto
              </button>
            ) : (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-medium">
                Auto
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">$</span>
            <input
              id="dc-min"
              type="number"
              inputMode="decimal"
              value={minPayment}
              onChange={e => handleMinPaymentChange(e.target.value)}
              className={`w-full pl-8 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-background)] text-[var(--color-foreground)] ${
                minPaymentOverridden ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'
              }`}
              placeholder="auto"
              min="0"
            />
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Calculated as 1% of balance + monthly interest
          </p>
        </div>
      </div>

      {/* Results table */}
      {scenarios.length === 0 ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-xl text-sm text-red-700 dark:text-red-300">
          ⚠️ Your minimum payment doesn't cover the monthly interest. Increase your payment to make progress.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-muted)]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[var(--color-foreground)]">Payment</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--color-foreground)]">Monthly</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--color-foreground)]">Time to payoff</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--color-foreground)]">Total interest</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--color-foreground)]">Interest saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {scenarios.map((s, i) => {
                const saved = base ? base.totalInterest - s.totalInterest : 0;
                const isBest = i > 0 && i === scenarios.length - 1;
                return (
                  <tr key={i} className={`${i === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface)]'} ${isBest ? 'ring-1 ring-[var(--color-primary)] ring-inset' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-foreground)]">{s.label}</span>
                        {isBest && <span className="text-xs px-1.5 py-0.5 bg-[var(--color-primary)] text-white rounded-full font-medium">Best</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-foreground)]">
                      {formatCurrency(parseFloat(minPayment || '0') + s.extraPayment, currency)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${i === 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmtMonths(s.months)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                      {formatCurrency(s.totalInterest, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-600">
                      {i === 0 ? '—' : `+${formatCurrency(saved, currency)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Visual bar */}
      {scenarios.length > 1 && base && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">Time to payoff — relative comparison</p>
          {scenarios.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-36 text-xs text-right text-[var(--color-muted-foreground)] truncate">{s.label}</div>
              <div className="flex-1 h-6 bg-[var(--color-muted)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${i === 0 ? 'bg-red-400' : 'bg-[var(--color-primary)]'}`}
                  style={{ width: `${Math.max(4, (s.months / base.months) * 100)}%` }}
                />
              </div>
              <div className="w-20 text-xs text-[var(--color-foreground)] font-medium">{fmtMonths(s.months)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Compound Interest Calculator ───────────────────────────────────────────

interface CompoundYear {
  year: number;
  balance: number;
  contributions: number;
  interest: number;
}

const COMPOUND_FREQS: { label: string; n: number }[] = [
  { label: 'Annually', n: 1 },
  { label: 'Semi-annually', n: 2 },
  { label: 'Quarterly', n: 4 },
  { label: 'Monthly', n: 12 },
  { label: 'Daily', n: 365 },
];

function CompoundCalculator() {
  const [principal, setPrincipal] = useState('5000');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState('10');
  const [monthly, setMonthly] = useState('100');
  const [freqIndex, setFreqIndex] = useState(3); // Monthly default
  const currency = 'USD';

  const freq = COMPOUND_FREQS[freqIndex];

  const { rows, finalBalance, totalContributions, totalInterest } = useMemo(() => {
    const P = parseFloat(principal) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    const t = Math.min(parseInt(years) || 0, 50);
    const m = parseFloat(monthly) || 0;
    const n = freq.n;

    const rows: CompoundYear[] = [];
    let balance = P;
    let totalContrib = P;

    for (let y = 1; y <= t; y++) {
      // Apply compound interest + monthly contributions for this year
      for (let month = 0; month < 12; month++) {
        balance = balance * (1 + r / n) ** (n / 12) + m;
      }
      totalContrib += m * 12;
      rows.push({
        year: y,
        balance: Math.round(balance * 100) / 100,
        contributions: Math.round(totalContrib * 100) / 100,
        interest: Math.round((balance - totalContrib) * 100) / 100,
      });
    }

    return {
      rows,
      finalBalance: rows[rows.length - 1]?.balance ?? P,
      totalContributions: rows[rows.length - 1]?.contributions ?? P,
      totalInterest: rows[rows.length - 1]?.interest ?? 0,
    };
  }, [principal, rate, years, monthly, freq]);

  const maxBalance = Math.max(...rows.map(r => r.balance), 1);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="ci-principal" className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
            Initial Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">$</span>
            <input id="ci-principal" type="number" inputMode="decimal" value={principal} onChange={e => setPrincipal(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent" />
          </div>
        </div>
        <div>
          <label htmlFor="ci-rate" className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
            Annual Interest Rate
          </label>
          <div className="relative">
            <input id="ci-rate" type="number" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} step="0.1"
              className="w-full pl-4 pr-8 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">%</span>
          </div>
        </div>
        <div>
          <label htmlFor="ci-years" className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
            Time Period
          </label>
          <div className="relative">
            <input id="ci-years" type="number" inputMode="numeric" value={years} onChange={e => setYears(e.target.value)} min="1" max="50"
              className="w-full pl-4 pr-12 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] text-xs">yrs</span>
          </div>
        </div>
        <div>
          <label htmlFor="ci-monthly" className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
            Monthly Contribution
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">$</span>
            <input id="ci-monthly" type="number" inputMode="decimal" value={monthly} onChange={e => setMonthly(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Compounding frequency */}
      <div>
        <p className="text-sm font-medium text-[var(--color-foreground)] mb-2">Compounding Frequency</p>
        <div className="flex flex-wrap gap-2">
          {COMPOUND_FREQS.map((f, i) => (
            <button key={f.label} onClick={() => setFreqIndex(i)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${freqIndex === i ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Final Balance</p>
            <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">{formatCurrency(finalBalance, currency)}</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Total Contributed</p>
            <p className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">{formatCurrency(totalContributions, currency)}</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Interest Earned</p>
            <p className="text-2xl font-bold text-green-600 tabular-nums">{formatCurrency(totalInterest, currency)}</p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      {rows.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide mb-3">Growth Over Time</p>
          <div className="flex items-end gap-1 h-40">
            {rows.map(row => (
              <div key={row.year} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div className="w-full rounded-t" style={{ height: `${(row.balance / maxBalance) * 140}px`, background: 'var(--color-primary)', opacity: 0.8 + (row.year / rows.length) * 0.2 }} />
                {/* Tooltip on hover */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[var(--color-foreground)] text-[var(--color-background)] text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  Yr {row.year}: {formatCurrency(row.balance, currency)}
                </div>
                {(row.year === 1 || row.year % Math.max(1, Math.floor(rows.length / 5)) === 0 || row.year === rows.length) && (
                  <span className="text-[10px] text-[var(--color-muted-foreground)]">{row.year}y</span>
                )}
              </div>
            ))}
          </div>
          {/* Stacked legend: contributions vs interest */}
          <div className="flex gap-4 mt-2 text-xs text-[var(--color-muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--color-primary)] opacity-60 inline-block" />
              Contributions
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
              Interest earned
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>('debt');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title="🔧 Tools"
        subtitle="Financial calculators — no account needed, all computed locally"
      />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-[var(--color-muted)] rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab('debt')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'debt' ? 'bg-[var(--color-surface)] text-[var(--color-foreground)] shadow' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}
        >
          💳 Debt Payoff
        </button>
        <button
          onClick={() => setTab('compound')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'compound' ? 'bg-[var(--color-surface)] text-[var(--color-foreground)] shadow' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}
        >
          📈 Compound Interest
        </button>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
        {tab === 'debt' ? (
          <>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">Debt Payoff Calculator</h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
              See exactly how much faster and cheaper your debt gets with extra monthly payments.
            </p>
            <DebtCalculator />
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">Compound Interest Calculator</h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
              Watch your money grow with the power of compound interest and regular contributions.
            </p>
            <CompoundCalculator />
          </>
        )}
      </div>
    </div>
  );
}

export default ToolsPage;
