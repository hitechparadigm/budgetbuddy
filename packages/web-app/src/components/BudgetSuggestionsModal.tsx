/**
 * BudgetSuggestionsModal Component
 * Displays AI-generated budget suggestions for user review and application
 *
 * Requirements: 3.7
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  budgetPlanningApi,
  BudgetSuggestion,
  GenerateSuggestionsResponse,
} from "../services/budgetPlanningApi";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

interface BudgetSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMonth?: string; // YYYY-MM format
  onSuggestionsApplied?: () => void;
  currency?: string;
}

const getConfidenceColor = (score: number): string => {
  if (score >= 80) return "text-green-600 bg-green-100";
  if (score >= 60) return "text-yellow-600 bg-yellow-100";
  return "text-orange-600 bg-orange-100";
};

const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const BudgetSuggestionsModal: React.FC<BudgetSuggestionsModalProps> = ({
  isOpen,
  onClose,
  targetMonth,
  onSuggestionsApplied,
  currency = "USD",
}) => {
  const [suggestions, setSuggestions] =
    useState<GenerateSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Get current month in YYYY-MM format
  const getCurrentMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const month = targetMonth || getCurrentMonth();

  // Load existing suggestions
  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { suggestions: data } =
        await budgetPlanningApi.getSuggestions(month);
      const pending = data.find((s) => s.status === "pending");
      if (pending) {
        setSuggestions(pending);
        setSelectedCategories(
          new Set(pending.suggestions.map((s) => s.categoryId)),
        );
      }
    } catch (err) {
      console.error("Failed to load suggestions:", err);
      // Not an error if no suggestions exist
    } finally {
      setLoading(false);
    }
  }, [month]);

  // Generate new suggestions
  const handleGenerateSuggestions = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await budgetPlanningApi.generateSuggestions({
        targetMonth: month,
        includeRecurringBills: true,
        includeHistoricalAverage: true,
      });
      setSuggestions(result);
      setSelectedCategories(
        new Set(result.suggestions.map((s) => s.categoryId)),
      );
    } catch (err) {
      console.error("Failed to generate suggestions:", err);
      setError("Failed to generate budget suggestions. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Apply selected suggestions
  const handleApplySuggestions = async () => {
    if (!suggestions) return;
    setApplying(true);
    setError(null);
    try {
      await budgetPlanningApi.applySuggestions({
        suggestionId: suggestions.suggestionId,
        selectedCategories: Array.from(selectedCategories),
      });
      onSuggestionsApplied?.();
      onClose();
    } catch (err) {
      console.error("Failed to apply suggestions:", err);
      setError("Failed to apply suggestions. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Select/deselect all
  const toggleAll = () => {
    if (!suggestions) return;
    if (selectedCategories.size === suggestions.suggestions.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(
        new Set(suggestions.suggestions.map((s) => s.categoryId)),
      );
    }
  };

  // Calculate selected total
  const selectedTotal =
    suggestions?.suggestions
      .filter((s) => selectedCategories.has(s.categoryId))
      .reduce((sum, s) => sum + s.suggestedAmount, 0) || 0;

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, loadSuggestions]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="budget-suggestions-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-2xl bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3
                id="budget-suggestions-title"
                className="text-lg font-semibold text-white"
              >
                🤖 AI Budget Suggestions for {formatMonth(month)}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-500"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Generate Button */}
            {!suggestions && (
              <div className="mb-4">
                <button
                  onClick={handleGenerateSuggestions}
                  disabled={generating}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Analyzing your spending...
                    </>
                  ) : (
                    <>✨ Generate AI Suggestions</>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  AI will analyze your bills and spending history to suggest
                  budget amounts
                </p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2" />
                <p className="text-gray-500">Loading suggestions...</p>
              </div>
            ) : suggestions ? (
              <>
                {/* Summary */}
                <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-purple-600">Selected Total</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {formatCurrency(selectedTotal, currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-purple-600">Categories</p>
                      <p className="text-lg font-medium text-purple-900">
                        {selectedCategories.size} /{" "}
                        {suggestions.suggestions.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Select All */}
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={toggleAll}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    {selectedCategories.size === suggestions.suggestions.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                  <button
                    onClick={handleGenerateSuggestions}
                    disabled={generating}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    🔄 Regenerate
                  </button>
                </div>

                {/* Suggestions List */}
                <div className="space-y-2">
                  {suggestions.suggestions.map((suggestion) => (
                    <div
                      key={suggestion.categoryId}
                      className={`border rounded-lg transition-colors ${
                        selectedCategories.has(suggestion.categoryId)
                          ? "border-purple-300 bg-purple-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => toggleCategory(suggestion.categoryId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedCategories.has(
                                suggestion.categoryId,
                              )}
                              onChange={() =>
                                toggleCategory(suggestion.categoryId)
                              }
                              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {suggestion.categoryName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConfidenceColor(suggestion.confidenceScore)}`}
                                >
                                  {suggestion.confidenceScore}% confidence
                                </span>
                                {suggestion.currentAmount !== undefined &&
                                  suggestion.currentAmount !==
                                    suggestion.suggestedAmount && (
                                    <span className="text-xs text-gray-500">
                                      Current:{" "}
                                      {formatCurrency(
                                        suggestion.currentAmount,
                                        currency,
                                      )}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(
                                suggestion.suggestedAmount,
                                currency,
                              )}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCategory(
                                  expandedCategory === suggestion.categoryId
                                    ? null
                                    : suggestion.categoryId,
                                );
                              }}
                              className="text-xs text-purple-600 hover:text-purple-800"
                            >
                              {expandedCategory === suggestion.categoryId
                                ? "Hide details"
                                : "Show details"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedCategory === suggestion.categoryId && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="mt-3 p-3 bg-white rounded-lg">
                            <p className="text-sm text-gray-600 mb-3">
                              {suggestion.explanation}
                            </p>
                            {suggestion.breakdown.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-500 uppercase">
                                  Breakdown
                                </p>
                                {suggestion.breakdown.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between text-sm"
                                  >
                                    <span className="text-gray-600">
                                      {item.item}
                                      <span className="ml-2 text-xs text-gray-400">
                                        ({item.type})
                                      </span>
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(item.amount, currency)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">💡</span>
                <p className="text-gray-500">No suggestions yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Generate AI suggestions to get started
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {suggestions && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Generated {new Date(suggestions.generatedAt).toLocaleString()}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySuggestions}
                  disabled={applying || selectedCategories.size === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium"
                >
                  {applying
                    ? "Applying..."
                    : `Apply ${selectedCategories.size} Suggestions`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetSuggestionsModal;
