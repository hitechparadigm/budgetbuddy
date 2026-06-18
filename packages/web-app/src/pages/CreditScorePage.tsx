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
import { PageHeader } from "../components/ui";

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

  const getImprovementTips = (): { category: string; tips: string[] }[] => {
    if (!creditScore || !creditScore.score) return [];

    const tipsByCategory: { category: string; tips: string[] }[] = [];

    // Analyze factors to provide personalized tips
    const hasPaymentIssues = creditScore.factors.some(
      (f) =>
        f.name.toLowerCase().includes("payment") &&
        f.status.toLowerCase().includes("negative"),
    );
    const hasUtilizationIssues = creditScore.factors.some(
      (f) =>
        f.name.toLowerCase().includes("utilization") &&
        f.status.toLowerCase().includes("negative"),
    );
    const hasCreditAgeIssues = creditScore.factors.some(
      (f) =>
        (f.name.toLowerCase().includes("age") ||
          f.name.toLowerCase().includes("history")) &&
        f.status.toLowerCase().includes("negative"),
    );
    const hasInquiryIssues = creditScore.factors.some(
      (f) =>
        f.name.toLowerCase().includes("inquir") &&
        f.status.toLowerCase().includes("negative"),
    );

    // Payment History Tips
    if (hasPaymentIssues || creditScore.score < 670) {
      tipsByCategory.push({
        category: "Payment History (35% of score)",
        tips: [
          "Set up automatic payments for all bills to never miss a due date",
          "If you have late payments, focus on making on-time payments for the next 6-12 months",
          "Contact creditors about payment plans if you're struggling - it's better than missing payments",
          "Consider setting up payment reminders 3-5 days before due dates",
        ],
      });
    }

    // Credit Utilization Tips
    if (hasUtilizationIssues || creditScore.score < 740) {
      tipsByCategory.push({
        category: "Credit Utilization (30% of score)",
        tips: [
          "Keep credit card balances below 30% of your limit (under 10% is ideal)",
          "Pay down high-balance cards first to quickly improve utilization",
          "Consider making multiple payments per month to keep balances low",
          "Request credit limit increases on cards with good payment history",
          "Avoid closing old credit cards - it reduces your total available credit",
        ],
      });
    }

    // Credit Age Tips
    if (hasCreditAgeIssues) {
      tipsByCategory.push({
        category: "Length of Credit History (15% of score)",
        tips: [
          "Keep your oldest credit accounts open and active",
          "Use old cards occasionally for small purchases to keep them active",
          "Avoid closing accounts unless there's a compelling reason (high fees, etc.)",
          "Be patient - credit age improves naturally over time",
        ],
      });
    }

    // New Credit / Inquiries Tips
    if (hasInquiryIssues) {
      tipsByCategory.push({
        category: "New Credit & Inquiries (10% of score)",
        tips: [
          "Avoid applying for multiple credit cards or loans in a short period",
          "Space out credit applications by at least 6 months when possible",
          "Shop for rates within a 14-45 day window - multiple inquiries count as one",
          "Only apply for credit when you truly need it",
        ],
      });
    }

    // Credit Mix Tips (if score is good but could be excellent)
    if (creditScore.score >= 670 && creditScore.score < 800) {
      tipsByCategory.push({
        category: "Credit Mix (10% of score)",
        tips: [
          "Having different types of credit (cards, loans, mortgage) can help",
          "Don't open accounts just for mix - only if you need them",
          "Installment loans (auto, personal) show you can handle different payment types",
        ],
      });
    }

    // General Tips for All Scores
    tipsByCategory.push({
      category: "General Best Practices",
      tips: [
        "Check your credit report annually for errors at AnnualCreditReport.com",
        "Dispute any inaccuracies you find on your credit report",
        "Monitor your credit regularly - checking your own score doesn't hurt it",
        "Be patient - significant score improvements typically take 3-6 months",
        creditScore.score >= 740
          ? "You're doing great! Maintain these habits to keep your excellent score"
          : "Small consistent improvements add up - stay focused on your goals",
      ],
    });

    return tipsByCategory;
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
        {/* Simulation disclaimer — remove when real credit bureau integration is live */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <span className="text-amber-600 mt-0.5">⚠️</span>
          <p className="text-sm text-amber-800">
            <strong>Demonstration only.</strong> The credit score and history shown here are
            simulated data for illustration purposes. This feature requires a credit bureau
            partnership and is not connected to any real credit reporting agency.
          </p>
        </div>

        {/* Header */}
        <PageHeader
          title="Credit Score"
          action={
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
          }
        />

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
                Personalized Tips to Improve Your Score
              </h2>
              <p className="text-gray-600 mb-6">
                Based on your current score and factors, here are specific
                actions you can take:
              </p>
              <div className="space-y-6">
                {getImprovementTips().map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {section.category}
                    </h3>
                    <div className="space-y-2 ml-7">
                      {section.tips.map((tip, tipIndex) => (
                        <div
                          key={tipIndex}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <svg
                            className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
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
                          <p className="text-gray-700 text-sm">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Resources */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-6 w-6 text-blue-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">
                      Want to Learn More?
                    </h4>
                    <p className="text-blue-800 text-sm mb-2">
                      Check out our educational content for in-depth guides on
                      improving your credit score and financial health.
                    </p>
                    <button
                      onClick={() => navigate("/learn")}
                      className="text-blue-600 hover:text-blue-700 font-semibold text-sm underline"
                    >
                      Browse Learning Resources →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreditScorePage;
