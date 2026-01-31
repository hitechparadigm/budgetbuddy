/**
 * AI-Powered Onboarding Page
 *
 * Provides location-based budget suggestions with AI-powered category recommendations
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

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[],
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
          familyId: result.debugInfo.familyId,
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
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md">
          <p className="font-bold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      <OnboardingFlow
        onComplete={handleComplete}
        onSkip={handleSkip}
        isSubmitting={isSubmitting}
      />
    </>
  );
};

export default OnboardingPage;
