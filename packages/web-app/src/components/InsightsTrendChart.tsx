/**
 * InsightsTrendChart
 *
 * Recharts-based spending trend chart for the Insights page.
 * Lazy-loaded to keep the initial bundle small.
 *
 * Features:
 * - Line chart with spending + income lines
 * - Proper axes, tooltips, and responsive container
 * - Category filter to isolate a single category's trend
 * - Accessible chart description for screen readers
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';

interface TrendAnalysis {
  spendingTrend?: string;
  averageSpending?: number;
  [key: string]: unknown;
}

interface InsightsTrendChartProps {
  months: string[];
  spending: number[];
  income: number[];
  analysis?: TrendAnalysis | null;
  /** Optional: per-category series for the category filter */
  categoryData?: Record<string, number[]>;
}

function formatDollar(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

const InsightsTrendChart: React.FC<InsightsTrendChartProps> = ({
  months,
  spending,
  income,
  analysis,
  categoryData,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = categoryData ? Object.keys(categoryData) : [];

  // Build chart data
  const data = months.map((month, i) => {
    const entry: Record<string, string | number> = { month };
    if (selectedCategory === 'all') {
      entry.Spending = spending[i] ?? 0;
      entry.Income = income[i] ?? 0;
    } else if (categoryData?.[selectedCategory]) {
      entry[selectedCategory] = categoryData[selectedCategory][i] ?? 0;
    }
    return entry;
  });

  // Accessible description
  const spendingAvg = spending.length
    ? spending.reduce((a, b) => a + b, 0) / spending.length
    : 0;
  const trendText = analysis?.spendingTrend ?? 'stable';

  return (
    <div>
      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Accessible description for screen readers */}
      <p className="sr-only">
        Spending trend chart showing {months.length} months of data.
        Trend is {trendText}. Average spending: {formatDollar(spendingAvg)} per month.
      </p>

      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatDollar}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            />
            {selectedCategory === 'all' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="Spending"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Income"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: '#22c55e' }}
                  activeDot={{ r: 5 }}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey={selectedCategory}
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#8b5cf6' }}
                activeDot={{ r: 5 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trend analysis summary */}
      {analysis && selectedCategory === 'all' && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Spending Trend:</span>
              <span
                className={`ml-2 font-medium ${
                  analysis.spendingTrend === 'increasing'
                    ? 'text-red-600'
                    : analysis.spendingTrend === 'decreasing'
                    ? 'text-green-600'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {analysis.spendingTrend === 'increasing'
                  ? '📈 Increasing'
                  : analysis.spendingTrend === 'decreasing'
                  ? '📉 Decreasing'
                  : '➡️ Stable'}
              </span>
            </div>
            {analysis.averageSpending != null && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Avg/month:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(analysis.averageSpending as number)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsTrendChart;
