/**
 * Investments Page
 *
 * Displays investment portfolio tracking with holdings, performance, and allocation.
 * Features:
 * - Portfolio overview with total value, gain/loss, and day change
 * - Holdings list with CRUD operations
 * - Performance history chart with period selection
 * - Asset allocation by account type
 *
 * **Validates: Requirement 45.3, 45.4, 45.5**
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  investmentsApi,
  Holding,
  PortfolioSummary,
  PerformanceHistory,
  CreateHoldingRequest,
  UpdateHoldingRequest,
  MarketNewsResponse,
  MarketSignalsResponse,
} from "../services/investmentsApi";
import { TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Newspaper, BarChart3 } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "brokerage", label: "Brokerage" },
  { value: "401k", label: "401(k)" },
  { value: "ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "hsa", label: "HSA" },
  { value: "crypto", label: "Cryptocurrency" },
];

const PERFORMANCE_PERIODS = [
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "6M", label: "6 Months" },
  { value: "1Y", label: "1 Year" },
  { value: "ALL", label: "All Time" },
];

export const InvestmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [performance, setPerformance] = useState<PerformanceHistory | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("1M");
  const [news, setNews] = useState<MarketNewsResponse | null>(null);
  const [signals, setSignals] = useState<MarketSignalsResponse | null>(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingSignals, setLoadingSignals] = useState(false);

  // Modal state
  const [showHoldingModal, setShowHoldingModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  // Form state
  const [holdingForm, setHoldingForm] = useState<CreateHoldingRequest>({
    symbol: "",
    name: "",
    shares: 0,
    costBasis: 0,
    currentPrice: 0,
    accountType: "brokerage",
  });

  useEffect(() => {
    loadData();
    loadNewsAndSignals();
  }, []);

  useEffect(() => {
    loadPerformance();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const portfolioData = await investmentsApi.getPortfolio();
      setPortfolio(portfolioData);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNewsAndSignals = async () => {
    // Load news
    setLoadingNews(true);
    try {
      const newsData = await investmentsApi.getNews(undefined, 'finance,economy,earnings,ipo');
      setNews(newsData);
    } catch (err) {
      console.error('Error loading market news:', err);
    } finally {
      setLoadingNews(false);
    }

    // Load signals
    setLoadingSignals(true);
    try {
      const signalData = await investmentsApi.getSignals();
      setSignals(signalData);
    } catch (err) {
      console.error('Error loading market signals:', err);
    } finally {
      setLoadingSignals(false);
    }
  };

  const loadPerformance = async () => {
    try {
      const performanceData =
        await investmentsApi.getPerformance(selectedPeriod);
      setPerformance(performanceData);
    } catch (error) {
      console.error("Error loading performance data:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getAccountTypeLabel = (type: string) => {
    return ACCOUNT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const handleAddHolding = () => {
    setEditingHolding(null);
    setHoldingForm({
      symbol: "",
      name: "",
      shares: 0,
      costBasis: 0,
      currentPrice: 0,
      accountType: "brokerage",
    });
    setShowHoldingModal(true);
  };

  const handleEditHolding = (holding: Holding) => {
    setEditingHolding(holding);
    setHoldingForm({
      symbol: holding.symbol,
      name: holding.name,
      shares: holding.shares,
      costBasis: holding.costBasis,
      currentPrice: holding.currentPrice,
      accountType: holding.accountType,
    });
    setShowHoldingModal(true);
  };

  const handleSaveHolding = async () => {
    try {
      if (editingHolding) {
        const updateData: UpdateHoldingRequest = {
          shares: holdingForm.shares,
          costBasis: holdingForm.costBasis,
          currentPrice: holdingForm.currentPrice,
          accountType: holdingForm.accountType,
        };
        await investmentsApi.updateHolding(
          editingHolding.holdingId,
          updateData,
        );
      } else {
        await investmentsApi.createHolding(holdingForm);
      }

      setShowHoldingModal(false);
      loadData();
    } catch (error) {
      console.error("Error saving holding:", error);
      alert("Failed to save holding. Please try again.");
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    if (!confirm("Are you sure you want to delete this holding?")) return;

    try {
      await investmentsApi.deleteHolding(holdingId);
      loadData();
    } catch (error) {
      console.error("Error deleting holding:", error);
      alert("Failed to delete holding. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
              <p className="text-gray-600 mt-1">
                Track your investment portfolio
              </p>
            </div>
            <button
              onClick={() => navigate("/budget")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to Budget
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Portfolio Summary Cards */}
        {portfolio && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 shadow-sm text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm">Total Value</span>
                <span className="text-2xl">📈</span>
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(portfolio.totalValue)}
              </div>
              <div className="text-sm text-blue-100 mt-1">
                {portfolio.holdings.length} holdings
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Total Gain/Loss</span>
                <span className="text-2xl">
                  {portfolio.totalGainLoss >= 0 ? "📊" : "📉"}
                </span>
              </div>
              <div
                className={`text-2xl font-bold ${
                  portfolio.totalGainLoss >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(portfolio.totalGainLoss)}
              </div>
              <div
                className={`text-sm mt-1 ${
                  portfolio.totalGainLossPercent >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatPercent(portfolio.totalGainLossPercent)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Day Change</span>
                <span className="text-2xl">
                  {portfolio.dayChange >= 0 ? "⬆️" : "⬇️"}
                </span>
              </div>
              <div
                className={`text-2xl font-bold ${
                  portfolio.dayChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(portfolio.dayChange)}
              </div>
              <div
                className={`text-sm mt-1 ${
                  portfolio.dayChangePercent >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatPercent(portfolio.dayChangePercent)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Cost Basis</span>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(portfolio.totalCostBasis)}
              </div>
              <div className="text-sm text-gray-500 mt-1">Total invested</div>
            </div>
          </div>
        )}

        {/* Performance Chart */}
        {performance && performance.performance.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Portfolio Performance
              </h2>
              <div className="flex gap-2">
                {PERFORMANCE_PERIODS.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      selectedPeriod === period.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-48">
              <svg
                className="w-full h-full"
                viewBox="0 0 800 180"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 45}
                    x2="800"
                    y2={i * 45}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}

                {/* Performance line */}
                {performance.performance.length > 1 && (
                  <polyline
                    points={performance.performance
                      .map((p, i) => {
                        const x =
                          (i / (performance.performance.length - 1)) * 800;
                        const maxValue = Math.max(
                          ...performance.performance.map((p) => p.totalValue),
                        );
                        const minValue = Math.min(
                          ...performance.performance.map((p) => p.totalValue),
                        );
                        const range = maxValue - minValue || 1;
                        const y =
                          160 - ((p.totalValue - minValue) / range) * 140;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                )}
              </svg>

              {/* Date labels */}
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                {performance.performance.map((p, i) => (
                  <span key={i}>{p.date}</span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div>
                <span className="text-gray-600">Total Return: </span>
                <span
                  className={`font-semibold ${
                    performance.totalReturn >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(performance.totalReturn)} (
                  {formatPercent(performance.totalReturnPercent)})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Holdings List */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Holdings</h2>
            <button
              onClick={handleAddHolding}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + Add Holding
            </button>
          </div>

          {portfolio && portfolio.holdings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No holdings yet. Add your first investment to start tracking.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Symbol
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Name
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Shares
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Price
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Value
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Gain/Loss
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Account
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio?.holdings.map((holding) => {
                    const value = holding.shares * holding.currentPrice;
                    const costBasis = holding.shares * holding.costBasis;
                    const gainLoss = value - costBasis;
                    const gainLossPercent =
                      costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

                    return (
                      <tr
                        key={holding.holdingId}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {holding.symbol}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {holding.name}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {holding.shares.toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {formatCurrency(holding.currentPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatCurrency(value)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${
                            gainLoss >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(gainLoss)}
                          <div className="text-xs">
                            {formatPercent(gainLossPercent)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {getAccountTypeLabel(holding.accountType)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleEditHolding(holding)}
                            className="text-gray-400 hover:text-gray-600 mr-2"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteHolding(holding.holdingId)
                            }
                            className="text-gray-400 hover:text-red-600"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Asset Allocation */}
        {portfolio && portfolio.allocation.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Asset Allocation by Account Type
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {portfolio.allocation.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl mb-1">
                    {item.type === "brokerage"
                      ? "💼"
                      : item.type === "401k"
                        ? "🏢"
                        : item.type === "ira"
                          ? "🏦"
                          : item.type === "roth_ira"
                            ? "💎"
                            : item.type === "hsa"
                              ? "🏥"
                              : "₿"}
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {getAccountTypeLabel(item.type)}
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {item.percent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Market News & Signals ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Market News */}
          <div className="bg-white rounded-xl shadow">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                <h2 className="text-base font-semibold text-gray-900">Market News</h2>
              </div>
              <button
                onClick={loadNewsAndSignals}
                disabled={loadingNews}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50"
                aria-label="Refresh news"
              >
                <RefreshCw className={`w-4 h-4 ${loadingNews ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {loadingNews ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : !news || !news.news || news.news.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm">{news?.message || 'No news available right now.'}</p>
                </div>
              ) : (
                news.news.map((article, i) => (
                  <a
                    key={i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    {article.bannerImage ? (
                      <img src={article.bannerImage} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center shrink-0">
                        <Newspaper className="w-5 h-5 text-gray-400" aria-hidden="true" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">{article.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{article.source}</span>
                        {article.publishedAt && (
                          <span className="text-xs text-gray-300">·</span>
                        )}
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          article.sentiment === 'Bullish' || article.sentiment === 'Somewhat-Bullish'
                            ? 'bg-green-50 text-green-700'
                            : article.sentiment === 'Bearish' || article.sentiment === 'Somewhat-Bearish'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}>
                          {article.sentiment === 'Somewhat-Bullish' ? '↑ Bullish' : article.sentiment === 'Somewhat-Bearish' ? '↓ Bearish' : article.sentiment}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Market Signals */}
          <div className="bg-white rounded-xl shadow">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                <h2 className="text-base font-semibold text-gray-900">Market Signals</h2>
              </div>
              {signals?.fetchedAt && (
                <span className="text-xs text-gray-400">
                  {new Date(signals.fetchedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {loadingSignals ? (
              <div className="p-6 space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : !signals ? (
              <div className="p-8 text-center text-gray-500 text-sm">Signals unavailable right now.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {[
                  { title: 'Top Gainers', data: signals.topGainers || [], color: 'text-green-600', icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
                  { title: 'Top Losers', data: signals.topLosers || [], color: 'text-red-600', icon: <TrendingDown className="w-4 h-4 text-red-500" /> },
                  { title: 'Most Active', data: signals.mostActive || [], color: 'text-blue-600', icon: <Minus className="w-4 h-4 text-blue-500 rotate-90" /> },
                ].map(section => (
                  <div key={section.title} className="px-5 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      {section.icon}
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{section.title}</span>
                    </div>
                    <div className="space-y-1.5">
                      {section.data.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm font-mono font-semibold text-gray-900">{s.ticker}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm tabular-nums text-gray-600">${s.price}</span>
                            <span className={`text-xs font-semibold tabular-nums ${section.color}`}>{s.changePercent}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Holding Modal */}
      {showHoldingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingHolding ? "Edit Holding" : "Add Holding"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={holdingForm.symbol}
                  onChange={(e) =>
                    setHoldingForm({
                      ...holdingForm,
                      symbol: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., AAPL"
                  disabled={!!editingHolding}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={holdingForm.name}
                  onChange={(e) =>
                    setHoldingForm({ ...holdingForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Apple Inc."
                  disabled={!!editingHolding}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shares
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={holdingForm.shares}
                    onChange={(e) =>
                      setHoldingForm({
                        ...holdingForm,
                        shares: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Basis
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={holdingForm.costBasis}
                    onChange={(e) =>
                      setHoldingForm({
                        ...holdingForm,
                        costBasis: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={holdingForm.currentPrice}
                  onChange={(e) =>
                    setHoldingForm({
                      ...holdingForm,
                      currentPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={holdingForm.accountType}
                  onChange={(e) =>
                    setHoldingForm({
                      ...holdingForm,
                      accountType: e.target.value as Holding["accountType"],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowHoldingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHolding}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentsPage;
