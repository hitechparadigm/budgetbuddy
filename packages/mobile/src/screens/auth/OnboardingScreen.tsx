/**
 * Onboarding Screen (Mobile)
 * Entry point for new user onboarding with AI-powered suggestions
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { OnboardingFlow } from "../../components/OnboardingFlow";
import {
  OnboardingSuggestions,
  CategorySuggestion,
} from "@budget-buddy/shared/src/services/categorySuggestionService";

interface OnboardingScreenProps {
  /**
   * Called when the user finishes (or skips) onboarding. The caller
   * (App.tsx) is responsible for transitioning away from this screen -
   * this component does not navigate itself, since it is rendered as a
   * top-level branch alongside AuthNavigator/RootNavigator, not as a
   * route inside either of them.
   */
  onFinished: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onFinished,
}) => {
  const handleComplete = async (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[]
  ) => {
    try {
      // TODO: Save onboarding data to user profile
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

      // TODO: Create initial budget categories based on selections
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      onFinished();
    }
  };

  const handleSkip = () => {
    onFinished();
  };

  return (
    <View style={styles.container}>
      <OnboardingFlow onComplete={handleComplete} onSkip={handleSkip} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});