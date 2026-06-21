/**
 * AI-Powered Onboarding Page
 *
 * Provides location-based budget suggestions with AI-powered category recommendations.
 * Includes a budget type selection step (REQ-12) before the main onboarding flow.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Users, Home } from "lucide-react";
import { OnboardingFlow } from "../components/OnboardingFlow";
import {
  OnboardingSuggestions,
  CategorySuggestion,
} from "@budget-buddy/shared/src/services/categorySuggestionService";
import { apiClient } from "../utils/apiClient";
import { getCurrentMonthString } from "../utils/monthHelpers";

import type { LucideIcon } from "lucide-react";

type BudgetType = "personal" | "family" | "shared";

type OnboardingPageStep = "budget-type" | "budget-setup";

const BUDGET_TYPE_OPTIONS: {
  value: BudgetType;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "personal",
    label: "Personal Budget",
    description: "just for me",
    icon: User,
  },
  {
    value: "family",
    label: "Family Budget",
    description: "for me and my spouse/partner",
    icon: Users,
  },
  {
    value: "shared",
    label: "Shared Budget",
    description: "for roommates or shared expenses",
    icon: Home,
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
    // No separate disclosure modal — family budget info is shown inline
    setPageStep("budget-setup");
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

      // Navigate to overview page (the default dashboard)
      navigate("/overview");
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
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-3">
              👫 Family Budget — Full Transparency
            </h3>
            <p className="text-[var(--color-foreground)] leading-relaxed">{FAMILY_BUDGET_DISCLOSURE}</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowFamilyDisclosure(false)}
                className="px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)]"
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

      {/* Step 1: Budget type selection — inline descriptions, no extra modal */}
      {pageStep === "budget-type" && (
        <div className="min-h-screen bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent flex items-center justify-center px-4 py-12">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Step progress indicator */}
            <div className="bg-[var(--color-primary)]/8 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        s === 1
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-gray-200 text-[var(--color-muted-foreground)]'
                      }`}
                    >
                      {s}
                    </div>
                    {s < 4 && <div className="w-6 h-0.5 bg-gray-200" aria-hidden="true" />}
                  </div>
                ))}
              </div>
              <button
                onClick={handleSkip}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-sm"
              >
                Skip
              </button>
            </div>

            <div className="p-8">
              <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-1">
                Who are you budgeting for?
              </h2>
              <p className="text-[var(--color-muted-foreground)] text-sm mb-6">
                Choose the option that best fits your household. You can change this later.
              </p>

              <div
                role="radiogroup"
                aria-label="Budget type"
                className="space-y-3"
              >
                {BUDGET_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    role="radio"
                    aria-checked={selectedBudgetType === option.value}
                    onClick={() => setSelectedBudgetType(option.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                      selectedBudgetType === option.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border)] hover:bg-[var(--color-background)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <option.icon
                        className={`w-6 h-6 shrink-0 mt-0.5 ${
                          selectedBudgetType === option.value
                            ? 'text-[var(--color-primary)]'
                            : 'text-[var(--color-muted-foreground)]'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-[var(--color-foreground)]">{option.label}</div>
                        <div className="text-sm text-[var(--color-muted-foreground)] mt-0.5">{option.description}</div>
                        {/* Show transparency note inline — no extra modal needed */}
                        {option.value === 'family' && (
                          <p className="text-xs text-[var(--color-primary)] mt-1.5 leading-relaxed">
                            Both partners will see all income, expenses, accounts, and goals. Fully shared.
                          </p>
                        )}
                        {option.value === 'shared' && (
                          <p className="text-xs text-blue-600 mt-1.5">
                            Great for roommates splitting household expenses.
                          </p>
                        )}
                      </div>
                      {selectedBudgetType === option.value && (
                        <span className="text-[var(--color-primary)] text-xl shrink-0" aria-hidden="true">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleBudgetTypeNext}
                className="mt-8 w-full bg-[var(--color-primary)] text-white py-3 rounded-xl hover:bg-[var(--color-primary-hover)] font-semibold text-sm transition-colors"
              >
                Continue — Step 2 of 4
              </button>
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
