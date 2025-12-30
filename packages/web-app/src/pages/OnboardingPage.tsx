/**
 * AI-Powered Onboarding Page
 *
 * Provides location-based budget suggestions with AI-powered category recommendations
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingFlow } from "../components/OnboardingFlow";
import {
  OnboardingSuggestions,
  CategorySuggestion,
} from "@budget-buddy/shared/src/services/categorySuggestionService";

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = async (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[]
  ) => {
    try {
      // TODO: Save onboarding data and create initial budget categories
      console.log("Onboarding complete:", {
        city: suggestions.city,
        country: suggestions.country,
        familySize: suggestions.familySize,
        selectedCategories: selectedCategories.map((c) => c.name),
        totalBudget: selectedCategories.reduce(
          (sum, c) => sum + c.adjustedAmount,
          0
        ),
      });

      // Navigate to budget page
      navigate("/budget");
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  const handleSkip = () => {
    // Skip onboarding and go to budget page
    navigate("/budget");
  };

  return <OnboardingFlow onComplete={handleComplete} onSkip={handleSkip} />;
};

export default OnboardingPage;
