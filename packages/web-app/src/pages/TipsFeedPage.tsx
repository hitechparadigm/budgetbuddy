/**
 * Tips Feed Page
 *
 * Displays personalized financial tips based on user spending patterns.
 * Features:
 * - Daily tip highlight
 * - Scrollable feed with categories
 * - Save/dismiss actions
 * - Saved tips section
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { tipsApi, Tip } from "../services/tipsApi";

type Category =
  | "all"
  | "budgeting"
  | "saving"
  | "debt"
  | "investing"
  | "general";

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: "all", label: "All Tips", icon: "📚" },
  { value: "budgeting", label: "Budgeting", icon: "💰" },
  { value: "saving", label: "Saving", icon: "🏦" },
  { value: "debt", label: "Debt", icon: "💳" },
  { value: "investing", label: "Investing", icon: "📈" },
  { value: "general", label: "General", icon: "💡" },
];

const DIFFICULTY_COLORS = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

export const TipsFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dailyTip, setDailyTip] = useState<Tip | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [savedTips, setSavedTips] = useState<Tip[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [activeTab, setActiveTab] = useState<"feed" | "saved">("feed");
  const [savingTipId, setSavingTipId] = useState<string | null>(null);
  const [dismissingTipId, setDismissingTipId] = useState<string | null>(null);

  useEffect(() => {
    loadTips();
  }, [selectedCategory]);

  const loadTips = async () => {
    try {
      setLoading(true);

      // Load daily tip (only on first load)
      if (!dailyTip) {
        const dailyResponse = await tipsApi.getDailyTip();
        setDailyTip(dailyResponse.tip);
      }

      // Load tips feed
      const category =
        selectedCategory === "all" ? undefined : selectedCategory;
      const feedResponse = await tipsApi.getFeed(category, 20);
      setTips(feedResponse.tips);

      // Load saved tips
      const savedResponse = await tipsApi.getSavedTips();
      setSavedTips(savedResponse.tips);

      setLoading(false);
    } catch (error) {
      console.error("Error loading tips:", error);
      setLoading(false);
    }
  };

  const handleSaveTip = async (tipId: string) => {
    try {
      setSavingTipId(tipId);
      await tipsApi.saveTip(tipId);

      // Move tip to saved list
      const tip = tips.find((t) => t.id === tipId);
      if (tip) {
        setSavedTips([
          ...savedTips,
          { ...tip, savedAt: new Date().toISOString() },
        ]);
      }

      setSavingTipId(null);
    } catch (error) {
      console.error("Error saving tip:", error);
      setSavingTipId(null);
    }
  };

  const handleDismissTip = async (tipId: string) => {
    try {
      setDismissingTipId(tipId);
      await tipsApi.dismissTip(tipId);

      // Remove tip from feed
      setTips(tips.filter((t) => t.id !== tipId));

      setDismissingTipId(null);
    } catch (error) {
      console.error("Error dismissing tip:", error);
      setDismissingTipId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || "💡";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Financial Tips
              </h1>
              <p className="text-gray-600 mt-1">
                Personalized advice to improve your finances
              </p>
            </div>
            <button
              onClick={() => navigate("/budget")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to Budget
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("feed")}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === "feed"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📚 Tips Feed ({tips.length})
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === "saved"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ⭐ Saved ({savedTips.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "feed" ? (
          <>
            {/* Daily Tip Highlight */}
            {dailyTip && (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-6 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💡</span>
                      <span className="text-sm font-semibold uppercase tracking-wide">
                        Tip of the Day
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">{dailyTip.title}</h2>
                    <p className="text-blue-50">{dailyTip.content}</p>
                  </div>
                  <button
                    onClick={() => handleSaveTip(dailyTip.id)}
                    disabled={
                      savingTipId === dailyTip.id ||
                      savedTips.some((t) => t.id === dailyTip.id)
                    }
                    className="ml-4 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savedTips.some((t) => t.id === dailyTip.id)
                      ? "✓ Saved"
                      : "⭐ Save"}
                  </button>
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === cat.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Tips Feed */}
            <div className="space-y-4">
              {tips.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg">
                  <p className="text-gray-500">
                    No tips available in this category.
                  </p>
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="mt-4 text-blue-600 hover:text-blue-700"
                  >
                    View all tips
                  </button>
                </div>
              ) : (
                tips.map((tip) => (
                  <div
                    key={tip.id}
                    className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">
                            {getCategoryIcon(tip.category)}
                          </span>
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            {tip.category}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${DIFFICULTY_COLORS[tip.difficulty]}`}
                          >
                            {tip.difficulty}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {tip.title}
                        </h3>
                        <p className="text-gray-600">{tip.content}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleSaveTip(tip.id)}
                          disabled={
                            savingTipId === tip.id ||
                            savedTips.some((t) => t.id === tip.id)
                          }
                          className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Save tip"
                        >
                          {savedTips.some((t) => t.id === tip.id) ? "✓" : "⭐"}
                        </button>
                        <button
                          onClick={() => handleDismissTip(tip.id)}
                          disabled={dismissingTipId === tip.id}
                          className="px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                          title="Dismiss tip"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Saved Tips */
          <div className="space-y-4">
            {savedTips.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <span className="text-6xl">⭐</span>
                <p className="text-gray-500 mt-4">No saved tips yet.</p>
                <p className="text-gray-400 text-sm mt-2">
                  Save tips from the feed to access them later.
                </p>
                <button
                  onClick={() => setActiveTab("feed")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Browse Tips
                </button>
              </div>
            ) : (
              savedTips.map((tip) => (
                <div key={tip.id} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">
                          {getCategoryIcon(tip.category)}
                        </span>
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {tip.category}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${DIFFICULTY_COLORS[tip.difficulty]}`}
                        >
                          {tip.difficulty}
                        </span>
                        {tip.savedAt && (
                          <span className="text-xs text-gray-400">
                            Saved {new Date(tip.savedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {tip.title}
                      </h3>
                      <p className="text-gray-600">{tip.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TipsFeedPage;
