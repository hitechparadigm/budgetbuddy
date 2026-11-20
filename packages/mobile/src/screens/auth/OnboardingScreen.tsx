/**
 * Onboarding Screen (Mobile)
 * Entry point for new user onboarding with AI-powered suggestions
 */

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { OnboardingFlow } from "../../components/OnboardingFlow";
import {
  OnboardingSuggestions,
  CategorySuggestion,
} from "@budget-buddy/shared/src/services/categorySuggestionService";
import {
  completeOnboarding,
  currentMonthString,
} from "../../services/onboarding";

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
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const handleComplete = async (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[],
    currency: string
  ) => {
    setSaving(true);
    setError(null);
    try {
      // Same payload the web app sends (apiClient.completeOnboarding), so
      // both clients create the same budget and first period.
      await completeOnboarding({
        city: suggestions.city,
        country: suggestions.country,
        familySize: suggestions.familySize,
        currentMonth: currentMonthString(),
        // The currency must be sent. The backend does not derive it from
        // the country: auth-onboarding reads requestBody.currency with a
        // 'USD' fallback and writes that value to the budget metadata, the
        // first period record and the user profile, so omitting it pins
        // every budget to USD. The web app sends it from the same step.
        currency,
        // The mobile flow has no budget-type step, so there is nothing to
        // forward here - unlike the web app, which collects one.
        budgetType: "personal",
        selectedCategories: selectedCategories.map((c) => ({
          name: c.name,
          icon: c.icon,
          adjustedAmount: c.adjustedAmount,
        })),
      });

      // A 409 resolves rather than throwing: the budget already exists, so
      // moving on is the right outcome.
      onFinished();
    } catch (err) {
      // Previously this only console.logged and then called onFinished
      // regardless, so a user whose budget was never created was dropped into
      // an empty app with no indication anything had gone wrong.
      console.error("Error completing onboarding:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not finish setting up your budget. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * KNOWN GAP (pre-existing, tracked follow-up): skipping does not call
   * POST /auth/onboarding, so the user lands in the app with no budget and
   * every budget-scoped screen fails to resolve one. Fixing it means deciding
   * what a skipped setup should create - a minimal empty budget, or a blocking
   * prompt on the first budget screen - which is a product decision. Left
   * unchanged here rather than altered silently.
   */
  const handleSkip = () => {
    onFinished();
  };

  return (
    <View style={styles.container}>
      <OnboardingFlow onComplete={handleComplete} onSkip={handleSkip} />
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorBanner: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
  },
  savingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});