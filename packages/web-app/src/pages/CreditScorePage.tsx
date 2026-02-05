/**
 * Credit Score Page - Credit Score Monitoring and History
 *
 * Displays current credit score, rating, history chart,
 * and factors affecting the score.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL =
  "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";

interface CreditScore {
  score: number;
  rating: string;
  date: string;
  change: number;
  factors: {
    paymentHistory: number;
    creditUtilization: number;
    creditAge: number;
    creditMix: number;
    newCredit: number;
  };
}

interface ScoreHistory {
  date: string;
  score: number;
  change: number;
}

export default function CreditScorePage() {
  const { tokens } = useAuth();
  const token = tokens?.idToken;

  const [currentScore, setCurrentScore] = useState<CreditScore | null>(null);
  const [history, setHistory] = useState<ScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCreditScore = useCallback(async () => {
    try {
      setError(null);
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const [scoreResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/credit-score`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${API_BASE_URL}/credit-score/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!scoreResponse.ok || !historyResponse.ok) {
        throw new Error("Failed to load credit score");
      }

      const scoreData = await scoreResponse.json();
      const historyData = await historyResponse.json();

      setCurrentScore(scoreData.data || null);
      setHistory(historyData.data?.history || []);
    } catch (err) {
      console.error("Error loading credit score:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load credit score",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCreditScore();
  }, [loadCreditScore]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/credit-score/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh credit score");
      }

      await loadCreditScore();
    } catch (err) {
      console.error("Error refreshing credit score:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh credit score",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const getRatingColor = (rating: string) => {
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

  const getScoreColor = (score: number) => {
    if (score >= 800) return "text-green-600";
    if (score >= 740) return "text-blue-600";
    if (score >= 670) return "text-yellow-600";
    if (score >= 580) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading credit score...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Credit Score</h1>
        <p className="mt-2 text-gray-600">
          Monitor your credit score and track changes over time
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Current Score Card */}
      {currentScore && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Current Score
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Refreshing..." : "Refresh Score"}
            </button>
          </div>

          <div className="text-center py-8">
            <div
              className={`text-6xl font-bold ${getScoreColor(currentScore.score)}`}
            >
              {currentScore.score}
            </div>
            <div
              className={`text-2xl font-semibold mt-2 ${getRatingColor(currentScore.rating)}`}
            >
              {currentScore.rating}
            </div>
            {currentScore.change !== 0 && (
              <div
                className={`text-lg mt-2 ${currentScore.change > 0 ? "text-green-600" : "text-red-600"}`}
              >
                {currentScore.change > 0 ? "+" : ""}
                {currentScore.change} points
              </div>
            )}
            <div className="text-sm text-gray-500 mt-2">
              Last updated: {new Date(currentScore.date).toLocaleDateString()}
            </div>
          </div>

          {/* Score Factors */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Factors Affecting Your Score
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Payment History</span>
                  <span className="font-semibold">
                    {currentScore.factors.paymentHistory}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${currentScore.factors.paymentHistory}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Credit Utilization</span>
                  <span className="font-semibold">
                    {currentScore.factors.creditUtilization}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${currentScore.factors.creditUtilization}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Credit Age</span>
                  <span className="font-semibold">
                    {currentScore.factors.creditAge}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${currentScore.factors.creditAge}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Credit Mix</span>
                  <span className="font-semibold">
                    {currentScore.factors.creditMix}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${currentScore.factors.creditMix}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">New Credit</span>
                  <span className="font-semibold">
                    {currentScore.factors.newCredit}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${currentScore.factors.newCredit}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score History */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Score History
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((entry, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${getScoreColor(entry.score)}`}
                    >
                      {entry.score}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm ${entry.change > 0 ? "text-green-600" : entry.change < 0 ? "text-red-600" : "text-gray-600"}`}
                    >
                      {entry.change > 0 ? "+" : ""}
                      {entry.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!currentScore && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 mb-4">No credit score data available</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing ? "Loading..." : "Get Credit Score"}
          </button>
        </div>
      )}
    </div>
  );
}
