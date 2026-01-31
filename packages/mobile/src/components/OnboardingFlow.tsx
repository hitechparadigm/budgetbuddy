/**
 * Onboarding Flow Component (Mobile)
 * Guides new users through location detection, family size selection,
 * and budget category setup with AI-powered suggestions
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import {
  detectUserLocation,
  createCityKey,
  GeolocationResult,
} from "@budget-buddy/shared/src/services/geolocationService";
import {
  getSuggestions,
  OnboardingSuggestions,
  CategorySuggestion,
} from "@budget-buddy/shared/src/services/categorySuggestionService";
import { getAllCities } from "@budget-buddy/shared/src/data/cityExpenseData";
import { CurrencySelector } from "./CurrencySelector";

interface OnboardingFlowProps {
  onComplete: (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[],
  ) => void;
  onSkip: () => void;
}

type OnboardingStep = "location" | "currency" | "family-size" | "categories";

const { width } = Dimensions.get("window");

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState<OnboardingStep>("location");
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [currency, setCurrency] = useState<string>("USD");
  const [familySize, setFamilySize] = useState<number>(1);
  const [suggestions, setSuggestions] = useState<OnboardingSuggestions | null>(
    null,
  );
  const [selectedCategories, setSelectedCategories] = useState<
    CategorySuggestion[]
  >([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Auto-detect location on mount
  useEffect(() => {
    handleAutoDetect();
  }, []);

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    const result = await detectUserLocation();
    setLocation(result);
    setIsDetecting(false);

    if (result.success) {
      // Auto-advance to currency step after 1 second
      setTimeout(() => setStep("currency"), 1000);
    }
  };

  const handleManualLocation = () => {
    // Use first city as fallback
    const cities = getAllCities();
    if (cities.length > 0) {
      const city = cities[0];
      setLocation({
        city: city.city,
        country: city.country,
        countryCode: "ca",
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: "",
        success: true,
      });
      setStep("currency");
    }
  };

  const handleFamilySizeNext = () => {
    if (!location) return;

    const cityKey = createCityKey(location.city, location.countryCode);
    const sug = getSuggestions(cityKey, familySize);

    if (sug) {
      setSuggestions(sug);
      setSelectedCategories(sug.categories.slice(0, 8)); // Select top 8 by default
      setStep("categories");
    }
  };

  const toggleCategory = (category: CategorySuggestion) => {
    setSelectedCategories((prev) => {
      const exists = prev.find((c) => c.name === category.name);
      if (exists) {
        return prev.filter((c) => c.name !== category.name);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleComplete = () => {
    if (suggestions) {
      onComplete(suggestions, selectedCategories);
    }
  };

  const renderProgressBar = () => {
    const steps = ["location", "currency", "family-size", "categories"];
    const currentIndex = steps.indexOf(step);

    return (
      <View style={styles.progressContainer}>
        {steps.map((s, idx) => (
          <View key={s} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                idx <= currentIndex
                  ? styles.progressDotActive
                  : styles.progressDotInactive,
              ]}
            >
              <Text style={styles.progressDotText}>{idx + 1}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to BudgetBuddy! 🎉</Text>
        <Text style={styles.subtitle}>
          Let's set up your budget with personalized suggestions
        </Text>
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Step 1: Location Detection */}
        {step === "location" && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>📍 Where are you located?</Text>
            <Text style={styles.stepSubtitle}>
              We'll use your location to provide relevant budget suggestions
            </Text>

            {isDetecting && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>
                  Detecting your location...
                </Text>
              </View>
            )}

            {!isDetecting && location && location.success && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✓ Location detected!</Text>
                <Text style={styles.successText}>
                  {location.city}, {location.country}
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setStep("currency")}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isDetecting && location && !location.success && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  ⚠️ Couldn't detect location
                </Text>
                <Text style={styles.errorText}>{location.error}</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleAutoDetect}
                  >
                    <Text style={styles.secondaryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleManualLocation}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Select Manually
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Currency Selection */}
        {step === "currency" && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>💰 Select Your Currency</Text>
            <Text style={styles.stepSubtitle}>
              Choose the currency you'll use for budgeting
            </Text>

            <CurrencySelector
              value={currency}
              onChange={setCurrency}
              label="Currency"
            />

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep("location")}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setStep("family-size")}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Family Size */}
        {step === "family-size" && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>
              👨‍👩‍👧‍👦 How many people in your household?
            </Text>
            <Text style={styles.stepSubtitle}>
              This helps us adjust budget suggestions for your family size
            </Text>

            <View style={styles.familySizeGrid}>
              {[1, 2, 3, 4, 5].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.familySizeButton,
                    familySize === size && styles.familySizeButtonActive,
                  ]}
                  onPress={() => setFamilySize(size)}
                >
                  <Text style={styles.familySizeEmoji}>
                    {size === 1
                      ? "👤"
                      : size === 2
                        ? "👥"
                        : size === 3
                          ? "👨‍👩‍👧"
                          : size === 4
                            ? "👨‍👩‍👧‍👦"
                            : "👨‍👩‍👧‍👦+"}
                  </Text>
                  <Text style={styles.familySizeText}>
                    {size} {size === 1 ? "person" : "people"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep("currency")}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleFamilySizeNext}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Category Selection */}
        {step === "categories" && suggestions && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>
              💰 Select your budget categories
            </Text>
            <Text style={styles.stepSubtitle}>
              Based on {suggestions.city}, we suggest these categories. Select
              the ones you want to track.
            </Text>

            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 <Text style={styles.tipBold}>Tip:</Text> You can always add,
                edit, or remove categories later
              </Text>
            </View>

            <View style={styles.categoriesGrid}>
              {suggestions.categories.map((category) => {
                const isSelected = selectedCategories.find(
                  (c) => c.name === category.name,
                );
                return (
                  <TouchableOpacity
                    key={category.name}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardActive,
                    ]}
                    onPress={() => toggleCategory(category)}
                  >
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryEmoji}>{category.icon}</Text>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      {isSelected && (
                        <Text style={styles.categoryCheck}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.categoryReason}>{category.reason}</Text>
                    <Text style={styles.categoryAmount}>
                      ${category.adjustedAmount}/mo
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep("family-size")}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  selectedCategories.length === 0 &&
                    styles.primaryButtonDisabled,
                ]}
                onPress={handleComplete}
                disabled={selectedCategories.length === 0}
              >
                <Text style={styles.primaryButtonText}>
                  Create Budget ({selectedCategories.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 20,
  },
  skipText: {
    fontSize: 14,
    color: "#6b7280",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  progressStep: {
    marginHorizontal: 8,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  progressDotActive: {
    backgroundColor: "#10b981",
  },
  progressDotInactive: {
    backgroundColor: "#e5e7eb",
  },
  progressDotText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6b7280",
  },
  successBox: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#6ee7b7",
    borderRadius: 8,
    padding: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#065f46",
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    color: "#047857",
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 8,
    padding: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#b45309",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#6b7280",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  familySizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  familySizeButton: {
    width: (width - 64) / 3,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  familySizeButtonActive: {
    borderColor: "#10b981",
    backgroundColor: "#d1fae5",
  },
  familySizeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  familySizeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  tipBox: {
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  tipText: {
    fontSize: 12,
    color: "#1e40af",
  },
  tipBold: {
    fontWeight: "600",
  },
  categoriesGrid: {
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  categoryCardActive: {
    borderColor: "#10b981",
    backgroundColor: "#d1fae5",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  categoryCheck: {
    fontSize: 20,
    color: "#10b981",
  },
  categoryReason: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  categoryAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10b981",
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#6b7280",
  },
});
