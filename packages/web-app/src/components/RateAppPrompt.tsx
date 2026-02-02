/**
 * Rate App Prompt Component
 *
 * A modal that prompts users to rate the app after positive interactions.
 * Shows after certain milestones (e.g., 10 transactions, 1 month usage).
 */

import React, { useState, useEffect } from "react";

interface RateAppPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onRate: () => void;
  onRemindLater: () => void;
  onNeverAsk: () => void;
}

export const RateAppPrompt: React.FC<RateAppPromptProps> = ({
  isOpen,
  onClose,
  onRate,
  onRemindLater,
  onNeverAsk,
}) => {
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedRating(0);
      setHoveredRating(0);
      setShowFeedback(false);
      setFeedback("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    if (rating >= 4) {
      // High rating - redirect to app store
      onRate();
    } else {
      // Low rating - show feedback form
      setShowFeedback(true);
    }
  };

  const handleSubmitFeedback = () => {
    // In a real app, this would send feedback to the backend
    console.log("Feedback submitted:", feedback);
    onClose();
  };

  const getRatingLabel = (rating: number): string => {
    switch (rating) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Great";
      case 5:
        return "Excellent";
      default:
        return "";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {!showFeedback ? (
          <>
            {/* Header */}
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">💰</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Enjoying BudgetBuddy?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your feedback helps us improve and helps others discover the
                app!
              </p>
            </div>

            {/* Star Rating */}
            <div className="px-6 pb-4">
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                    aria-label={`Rate ${star} stars`}
                  >
                    <svg
                      className={`w-10 h-10 ${
                        star <= (hoveredRating || selectedRating)
                          ? "text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      } transition-colors`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              {(hoveredRating || selectedRating) > 0 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {getRatingLabel(hoveredRating || selectedRating)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={onRemindLater}
                className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Remind me later
              </button>
              <button
                onClick={onNeverAsk}
                className="w-full py-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-sm transition-colors"
              >
                Don't ask again
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Feedback Form */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                We'd love your feedback
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                What could we do better? Your feedback helps us improve.
              </p>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you think..."
                className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                aria-label="Feedback"
              />

              <div className="flex space-x-3 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.trim()}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Hook to manage rate app prompt state
 */
export const useRateAppPrompt = () => {
  const STORAGE_KEY = "budgetbuddy_rate_app";
  const REMIND_DELAY_DAYS = 7;
  const MIN_TRANSACTIONS = 10;
  const MIN_DAYS_USED = 7;

  const [isOpen, setIsOpen] = useState(false);

  const getStoredState = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const setStoredState = (state: {
    neverAsk?: boolean;
    remindAfter?: string;
    rated?: boolean;
  }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const shouldShowPrompt = (transactionCount: number, firstUseDate: Date) => {
    const state = getStoredState();

    // Never show if user opted out or already rated
    if (state?.neverAsk || state?.rated) {
      return false;
    }

    // Check remind later date
    if (state?.remindAfter) {
      const remindDate = new Date(state.remindAfter);
      if (new Date() < remindDate) {
        return false;
      }
    }

    // Check minimum requirements
    const daysSinceFirstUse = Math.floor(
      (Date.now() - firstUseDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return (
      transactionCount >= MIN_TRANSACTIONS && daysSinceFirstUse >= MIN_DAYS_USED
    );
  };

  const showPrompt = () => setIsOpen(true);
  const hidePrompt = () => setIsOpen(false);

  const handleRate = () => {
    setStoredState({ rated: true });
    // Open app store in new tab (placeholder URLs)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const storeUrl = isIOS
      ? "https://apps.apple.com/app/budgetbuddy"
      : "https://play.google.com/store/apps/details?id=com.budgetbuddy";
    window.open(storeUrl, "_blank");
    hidePrompt();
  };

  const handleRemindLater = () => {
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + REMIND_DELAY_DAYS);
    setStoredState({ remindAfter: remindDate.toISOString() });
    hidePrompt();
  };

  const handleNeverAsk = () => {
    setStoredState({ neverAsk: true });
    hidePrompt();
  };

  return {
    isOpen,
    showPrompt,
    hidePrompt,
    shouldShowPrompt,
    handleRate,
    handleRemindLater,
    handleNeverAsk,
  };
};

export default RateAppPrompt;
