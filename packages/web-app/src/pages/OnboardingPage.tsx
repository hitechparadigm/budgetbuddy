/**
 * AI-Powered Onboarding Page
 *
 * Provides location-based budget suggestions with AI-powered category recommendations.
 * Includes a budget type selection step (REQ-12) before the main onboarding flow.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingFlow } from "../components/OnboardingFlow";
import {
  OnboardingSuggestions,
  CategorySuggestion,
} from "@budget-buddy/shared/src/services/categorySuggestionService";
import { apiClient } from "../utils/apiClient";
import { getCurrentMonthString } from "../utils/monthHelpers";

type BudgetType = "personal" | "family" | "shared";

type OnboardingPageStep = "budget-type" | "budget-setup";

const BUDGET_TYPE_OPTIONS: {
  value: BudgetType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "personal",
    label: "Personal Budget",
    description: "just for me",
    icon: "👤",
  },
  {
    value: "family",
    label: "Family Budget",
    description: "for me and my spouse/partner",
    icon: "👫",
  },
  {
    value: "shared",
    label: "Shared Budget",
    description: "for roommates or shared expenses",
    icon: "🏠",
  },
];

const FAMILY_BUDGET_DISCLOSURE =
  "A Family Budget is a fully transparent household budget. Both partners will see all income, expenses, accounts, debts, savings goals, and transactions. There are no hidden categories or private sections.";

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [pageStep, setPageStep] = useState<OnboardingPageStep>("budget-type");
  const [selectedBudgetType, setSelectedBudgetType] =
    useState<BudgetType>("personal");
  const [showFamilyDisclosure, setShowFamilyDisclosure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Called when the user clicks Continue on the budget-type step. */
  const handleBudgetTypeNext = () => {
    if (selectedBudgetType === "family") {
      setShowFamilyDisclosure(true);
    } else {
      setPageStep("budget-setup");
    }
  };

  /** Called when the user confirms the Family Budget disclosure. */
  const handleFamilyDisclosureConfirm = () => {
    setShowFamilyDisclosure(false);
    setPageStep("budget-setup");
  };

  const handleComplete = async (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[],
    currency: string,
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log("OnboardingPage: Starting onboarding completion...");
      console.log("OnboardingPage: Data to send:", {
        city: suggestions.city,
        country: suggestions.country,
        familySize: suggestions.familySize,
        currentMonth: getCurrentMonthString(),
        selectedCategoriesCount: selectedCategories.length,
        currency,
        budgetType: selectedBudgetType,
      });

      console.log(
        "OnboardingPage: CRITICAL DEBUG - currentMonth being sent:",
        getCurrentMonthString(),
      );

      // Save onboarding data and create initial budget categories
      const result = await apiClient.completeOnboarding({
        city: suggestions.city,
        country: suggestions.country,
        familySize: suggestions.familySize,
        currentMonth: getCurrentMonthString(), // Send timezone-aware current month
        currency, // Pass currency to backend
        budgetType: selectedBudgetType, // Pass budget type to backend (REQ-12)
        selectedCategories: selectedCategories.map((c) => ({
          name: c.name,
          icon: c.icon,
          adjustedAmount: c.adjustedAmount,
        })),
      });

      console.log("OnboardingPage: Onboarding completed successfully");
      console.log("OnboardingPage: Response data:", result);

      // Log debug info if available
      if (result.debugInfo) {
        console.log("OnboardingPage: Budget creation debug info:", {
          budgetCreated: result.budgetCreated,
          budgetId: result.budgetId,
          month: result.month,
          partitionKey: result.debugInfo.partitionKey,
          sortKey: result.debugInfo.sortKey,
          budgetVerified: result.debugInfo.budgetVerified,
          lambdaFunction: result.debugInfo.lambdaFunction,
        });
      }

      // Navigate to budget page
      navigate("/budget");
    } catch (error) {
      console.error("OnboardingPage: Error completing onboarding:", error);

      // 409 means onboarding already completed (budget already exists).
      // Treat this as success — navigate to budget rather than showing an error.
      if (
        error instanceof Error &&
        (error.message.includes("Onboarding already completed") ||
          error.message.includes("Budget already exists"))
      ) {
        console.log(
          "OnboardingPage: Budget already exists (409) — navigating to budget page",
        );
        navigate("/budget");
        return;
      }

      // Enhanced error handling
      let errorMessage = "Failed to complete onboarding. Please try again.";

      if (error instanceof Error) {
        console.error("OnboardingPage: Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });

        if (error.message.includes("User profile not found")) {
          errorMessage =
            "User profile not found. Please try logging out and logging back in.";
        } else if (error.message.includes("Network error")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("CORS")) {
          errorMessage =
            "Connection error. Please wait a moment and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Skip onboarding and go to budget page
    navigate("/budget");
  };

  return (
    <>
      {error && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Family Budget transparency disclosure modal */}
      {showFamilyDisclosure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              👫 Family Budget — Full Transparency
            </h3>
            <p className="text-gray-700 leading-relaxed">{FAMILY_BUDGET_DISCLOSURE}</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowFamilyDisclosure(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={handleFamilyDisclosureConfirm}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Budget type selection */}
      {pageStep === "budget-type" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Welcome to BudgetBuddy! 🎉
                </h2>
                <button
                  onClick={handleSkip}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Skip for now
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                Let's set up your budget with personalized suggestions
              </p>
            </div>

            <div className="p-6">
              <h3 id="budget-type-label" className="text-xl font-semibold text-gray-900 mb-2">
                What kind of budget are you creating?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Choose the option that best fits your household.
              </p>

              <div
                role="radiogroup"
                aria-labelledby="budget-type-label"
                className="space-y-3"
              >
                {BUDGET_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    role="radio"
                    aria-checked={selectedBudgetType === option.value}
                    onClick={() => setSelectedBudgetType(option.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                      selectedBudgetType === option.value
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">{option.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          — {option.description}
                        </div>
                      </div>
                      {selectedBudgetType === option.value && (
                        <span className="ml-auto text-green-500 text-xl" aria-hidden="true">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleBudgetTypeNext}
                  className="bg-green-500 text-white px-8 py-2 rounded-lg hover:bg-green-600 font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Main onboarding flow (location, currency, family size, categories) */}
      {pageStep === "budget-setup" && (
        <OnboardingFlow
          onComplete={handleComplete}
          onSkip={handleSkip}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
};

export default OnboardingPage;
