/**
 * PatternReviewModal Component
 * Displays detected recurring patterns for user review and approval
 *
 * Requirements: 2.1, 2.2, 5.3, 5.5
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  patternDetectionApi,
  DetectedPattern,
} from "../services/patternDetectionApi";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

interface PatternReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatternApproved?: (pattern: DetectedPattern) => void;
  currency?: string;
}

type ViewMode = "list" | "detail";

const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  "bi-weekly": "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Yearly",
};

const getConfidenceColor = (score: number): string => {
  if (score >= 80) return "text-green-600 bg-green-100";
  if (score >= 60) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
};

const getConfidenceLabel = (score: number): string => {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
};

export const PatternReviewModal: React.FC<PatternReviewModalProps> = ({
  isOpen,
  onClose,
  onPatternApproved,
  currency = "USD",
}) => {
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedPattern, setSelectedPattern] =
    useState<DetectedPattern | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Edit state for pattern details
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedAmount, setEditedAmount] = useState("");
  const [editedFrequency, setEditedFrequency] = useState("");

  // Load existing patterns
  const loadPatterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { patterns: data } =
        await patternDetectionApi.getPatterns("pending");
      setPatterns(data);
    } catch (err) {
      console.error("Failed to load patterns:", err);
      setError("Failed to load patterns");
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger new pattern detection
  const handleDetectPatterns = async () => {
    setDetecting(true);
    setError(null);
    try {
      const result = await patternDetectionApi.detectPatterns({
        analysisMonths: 6,
        minConfidence: 50,
      });
      setPatterns(result.patterns.filter((p) => p.status === "pending"));
    } catch (err) {
      console.error("Failed to detect patterns:", err);
      setError("Failed to analyze transactions. Please try again.");
    } finally {
      setDetecting(false);
    }
  };

  // Approve pattern
  const handleApprove = async (pattern: DetectedPattern) => {
    setProcessingId(pattern.patternId);
    try {
      const updated = await patternDetectionApi.approvePattern(
        pattern.patternId,
      );
      setPatterns((prev) =>
        prev.filter((p) => p.patternId !== pattern.patternId),
      );
      onPatternApproved?.(updated);
      if (selectedPattern?.patternId === pattern.patternId) {
        setSelectedPattern(null);
        setViewMode("list");
      }
    } catch (err) {
      console.error("Failed to approve pattern:", err);
      setError("Failed to approve pattern");
    } finally {
      setProcessingId(null);
    }
  };

  // Reject pattern
  const handleReject = async (pattern: DetectedPattern) => {
    setProcessingId(pattern.patternId);
    try {
      await patternDetectionApi.rejectPattern(pattern.patternId);
      setPatterns((prev) =>
        prev.filter((p) => p.patternId !== pattern.patternId),
      );
      if (selectedPattern?.patternId === pattern.patternId) {
        setSelectedPattern(null);
        setViewMode("list");
      }
    } catch (err) {
      console.error("Failed to reject pattern:", err);
      setError("Failed to reject pattern");
    } finally {
      setProcessingId(null);
    }
  };

  // Save edited pattern
  const handleSaveEdit = async () => {
    if (!selectedPattern) return;
    setProcessingId(selectedPattern.patternId);
    try {
      const updated = await patternDetectionApi.updatePattern(
        selectedPattern.patternId,
        {
          suggestedBillName: editedName,
          averageAmount: parseFloat(editedAmount),
          frequency: editedFrequency,
        },
      );
      setPatterns((prev) =>
        prev.map((p) => (p.patternId === updated.patternId ? updated : p)),
      );
      setSelectedPattern(updated);
      setEditMode(false);
    } catch (err) {
      console.error("Failed to update pattern:", err);
      setError("Failed to save changes");
    } finally {
      setProcessingId(null);
    }
  };

  // View pattern details
  const handleViewDetails = (pattern: DetectedPattern) => {
    setSelectedPattern(pattern);
    setEditedName(pattern.suggestedBillName);
    setEditedAmount(pattern.averageAmount.toString());
    setEditedFrequency(pattern.frequency);
    setViewMode("detail");
    setEditMode(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadPatterns();
    }
  }, [isOpen, loadPatterns]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="pattern-review-title"
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
        <div className="relative inline-block w-full max-w-2xl bg-[var(--color-surface)] rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {viewMode === "detail" && (
                  <button
                    onClick={() => {
                      setViewMode("list");
                      setSelectedPattern(null);
                    }}
                    className="text-white hover:text-blue-200"
                  >
                    ← Back
                  </button>
                )}
                <h3
                  id="pattern-review-title"
                  className="text-lg font-semibold text-white"
                >
                  {viewMode === "list"
                    ? "🔍 AI Pattern Detection"
                    : "📋 Pattern Details"}
                </h3>
              </div>
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

            {viewMode === "list" ? (
              <>
                {/* Detect Button */}
                <div className="mb-4">
                  <button
                    onClick={handleDetectPatterns}
                    disabled={detecting}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                  >
                    {detecting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Analyzing transactions...
                      </>
                    ) : (
                      <>🔍 Scan for Recurring Bills</>
                    )}
                  </button>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-2 text-center">
                    AI will analyze your last 6 months of transactions
                  </p>
                </div>

                {/* Patterns List */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                    <p className="text-[var(--color-muted-foreground)]">Loading patterns...</p>
                  </div>
                ) : patterns.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">📊</span>
                    <p className="text-[var(--color-muted-foreground)]">
                      No pending patterns to review
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                      Click "Scan" to detect recurring bills
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patterns.map((pattern) => (
                      <div
                        key={pattern.patternId}
                        className="border border-[var(--color-border)] rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-[var(--color-foreground)]">
                                {pattern.suggestedBillName}
                              </h4>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConfidenceColor(pattern.confidenceScore)}`}
                              >
                                {getConfidenceLabel(pattern.confidenceScore)} (
                                {pattern.confidenceScore}%)
                              </span>
                            </div>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                              {pattern.merchantName}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-[var(--color-muted-foreground)]">
                              <span>
                                {formatCurrency(
                                  pattern.averageAmount,
                                  currency,
                                )}
                              </span>
                              <span>•</span>
                              <span>{frequencyLabels[pattern.frequency]}</span>
                              <span>•</span>
                              <span>
                                {pattern.occurrences.length} occurrences
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleViewDetails(pattern)}
                              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleApprove(pattern)}
                              disabled={processingId === pattern.patternId}
                              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                            >
                              {processingId === pattern.patternId ? "..." : "✓"}
                            </button>
                            <button
                              onClick={() => handleReject(pattern)}
                              disabled={processingId === pattern.patternId}
                              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              selectedPattern && (
                /* Detail View */
                <div>
                  {/* Pattern Info */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${getConfidenceColor(selectedPattern.confidenceScore)}`}
                      >
                        {getConfidenceLabel(selectedPattern.confidenceScore)}{" "}
                        Confidence ({selectedPattern.confidenceScore}%)
                      </span>
                      {!editMode && (
                        <button
                          onClick={() => setEditMode(true)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>

                    {editMode ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                            Bill Name
                          </label>
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={editedAmount}
                            onChange={(e) => setEditedAmount(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                            Frequency
                          </label>
                          <select
                            value={editedFrequency}
                            onChange={(e) => setEditedFrequency(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          >
                            {Object.entries(frequencyLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={
                              processingId === selectedPattern.patternId
                            }
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditMode(false)}
                            className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-foreground)]">Bill Name</span>
                          <span className="font-medium">
                            {selectedPattern.suggestedBillName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-foreground)]">Merchant</span>
                          <span className="font-medium">
                            {selectedPattern.merchantName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-foreground)]">Amount</span>
                          <span className="font-medium">
                            {formatCurrency(
                              selectedPattern.averageAmount,
                              currency,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-foreground)]">Frequency</span>
                          <span className="font-medium">
                            {frequencyLabels[selectedPattern.frequency]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-foreground)]">Next Expected</span>
                          <span className="font-medium">
                            {new Date(
                              selectedPattern.nextExpectedDate,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Explanation */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">
                      🤖 AI Analysis
                    </h5>
                    <p className="text-sm text-blue-800">
                      {selectedPattern.explanation}
                    </p>
                  </div>

                  {/* Occurrences */}
                  <div className="mb-6">
                    <h5 className="font-medium text-[var(--color-foreground)] mb-3">
                      Transaction History ({selectedPattern.occurrences.length})
                    </h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedPattern.occurrences.map((occ, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-sm py-2 border-b border-gray-100"
                        >
                          <span className="text-[var(--color-muted-foreground)]">
                            {new Date(occ.date).toLocaleDateString()}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(occ.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {!editMode && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedPattern)}
                        disabled={processingId === selectedPattern.patternId}
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                      >
                        ✓ Create Bill Reminder
                      </button>
                      <button
                        onClick={() => handleReject(selectedPattern)}
                        disabled={processingId === selectedPattern.patternId}
                        className="px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternReviewModal;
