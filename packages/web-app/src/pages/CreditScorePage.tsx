/**
 * Credit Score Page
 *
 * Displays current credit score, history, and factors affecting score
 * Requirements: 43.1, 43.3, 43.5, 43.6, 43.7
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCreditScore,
  getCreditScoreHistory,
  refreshCreditScore,
  CreditScore,
  CreditScoreHistory,
} from "../services/creditScoreApi";

const CreditScorePage: React.FC = () => {
  const navigate = useNavigate();
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [history, setHistory] = useState<CreditScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCreditScoreData();
  }, []);

  const loadCreditScoreData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [scoreData, historyData] = await Promise.all([
        getCreditScore(),
        getCreditScoreHistory(),
      ]);

      setCreditScore(scoreData);
      setHistory(historyData.history);
    } catch (err: any) {
      console.error("Error loading credit score:", err);
      setError(
        err.response?.data?.message || "Failed to load credit score data",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const updatedScore = await refreshCreditScore();
      setCreditScore(updatedScore);

      // Reload history to include new score
      const historyData = await getCreditScoreHistory();
      setHistory(historyData.history);
    } catch (err: any) {
      console.error("Error refreshing credit score:", err);
      setError(err.response?.data?.message || "Failed to refresh credit score");
    } finally {
      setRefreshing(false);
    }
  };

  const getRatingColor = (rating: string): string => {
    switch (rating.toLowerCase()) {
      case "excellent":
        return "text-green-600";
      case "very good":
        return "text-blue-600";
      case "good":
        return "text-yellow-600";
      case "fair":
        return "text-orange-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getImprovementTips = (): string[] => {
    if (!creditScore || !creditScore.score) return [];

    const tips: string[] = [];

    if (creditScore.score < 670) {
      tips.push(
        "Pay all bills on time - payment history is the most important factor",
      );
      tips.push("Keep credit card balances below 30% of your credit limit");
      tips.push("Avoid opening multiple new credit accounts in a short period");
    } else if (creditScore.score < 740) {
      tips.push(
        "Continue making on-time payments to build a strong payment history",
      );
      tips.push(
        "Pay down credit card balances to improve your credit utilization ratio",
      );
      tips.push(
        "Keep old credit accounts open to maintain a longer credit history",
      );
    } else {
      tips.push("Maintain your excellent payment history");
      tips.push("Keep credit utilization low across all accounts");
      tips.push("Monitor your credit report regularly for errors");
    }

    return tips;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Credit Score</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {refreshing ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh Score
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Current Score Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {creditScore?.score ? (
            <>
              <div className="text-center mb-6">
                <div className="text-6xl font-bold text-gray-900 mb-2">
                  {creditScore.score}
                </div>
                <div
                  className={`text-2xl font-semibold ${getRatingColor(creditScore.rating)}`}
                >
                  {creditScore.rating}
                </div>
                {creditScore.change !== 0 && (
                  <div
                    className={`mt-2 flex items-center justify-center gap-1 ${creditScore.changeDirection === "up" ? "text-green-600" : "text-red-600"}`}
                  >
                    {creditScore.changeDirection === "up" ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    )}
                    <span className="font-semibold">
                      {Math.abs(creditScore.change)} points
                    </span>
                  </div>
                )}
              </div>

              {/* Score Range Indicator */}
              <div className="relative h-3 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500 rounded-full mb-2">
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-4 border-gray-900 rounded-full shadow-lg"
                  style={{
                    left: `${((creditScore.score - 300) / 550) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>300</span>
                <span>850</span>
              </div>

              <div className="mt-4 text-center text-sm text-gray-600">
                Last updated:{" "}
                {new Date(creditScore.lastUpdated).toLocaleDateString()}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <svg
                className="h-16 w-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Credit Score Data
              </h3>
              <p className="text-gray-600 mb-4">
                Connect your credit bureau account to start monitoring your
                credit score
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Connect Account
              </button>
            </div>
          )}
        </div>

        {creditScore?.score && (
          <>
            {/* Factors Affecting Score */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Factors Affecting Your Score
              </h2>
              <div className="space-y-3">
                {creditScore.factors.map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {factor.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {factor.status}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getImpactColor(factor.impact)}`}
                    >
                      {factor.impact} impact
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score History Chart */}
            {history.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Score History
                </h2>
                <div className="space-y-2">
                  {history.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                          {new Date(entry.date).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="font-semibold text-gray-900">
                          {entry.score}
                        </div>
                        <div
                          className={`text-sm ${getRatingColor(entry.rating)}`}
                        >
                          {entry.rating}
                        </div>
                      </div>
                      {entry.change !== 0 && (
                        <div
                          className={`flex items-center gap-1 text-sm ${entry.change > 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {entry.change > 0 ? "+" : ""}
                          {entry.change}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Tips */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Tips to Improve Your Score
              </h2>
              <div className="space-y-3">
                {getImprovementTips().map((tip, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <svg
                      className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-gray-700">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreditScorePage;
