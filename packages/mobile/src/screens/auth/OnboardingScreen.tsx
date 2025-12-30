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
import { useNavigation } from "@react-navigation/native";

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();

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
      // For now, navigate to main app
      navigation.navigate("Main" as never);
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  const handleSkip = () => {
    // Skip onboarding and go to main app
    navigation.navigate("Main" as never);
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
