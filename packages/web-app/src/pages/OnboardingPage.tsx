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

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[]
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Save onboarding data and create initial budget categories
      await apiClient.completeOnboarding({
        city: suggestions.city,
        country: suggestions.country,
        familySize: suggestions.familySize,
        selectedCategories: selectedCategories.map((c) => ({
          name: c.name,
          icon: c.icon,
          adjustedAmount: c.adjustedAmount,
        })),
      });

      console.log("Onboarding completed successfully");

      // Navigate to budget page
      navigate("/budget");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to complete onboarding. Please try again."
      );
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
