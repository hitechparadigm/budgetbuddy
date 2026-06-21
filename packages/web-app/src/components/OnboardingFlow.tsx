/**
 * Onboarding Flow Component
 * Guides new users through location detection, family size selection,
 * and budget category setup with AI-powered suggestions
 */

import React, { useState, useEffect } from "react";
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
import {
  getAllCities,
  CityExpenseData,
} from "@budget-buddy/shared/src/data/cityExpenseData";
import { CurrencySelector } from "./CurrencySelector";

interface OnboardingFlowProps {
  onComplete: (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[],
    currency: string,
  ) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

type OnboardingStep =
  | "location"
  | "currency"
  | "family-size"
  | "subscriptions"
  | "categories"
  | "review";

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onSkip,
  isSubmitting = false,
}) => {
  const [step, setStep] = useState<OnboardingStep>("location");
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [currency, setCurrency] = useState<string>("USD"); // Default to USD
  const [familySize, setFamilySize] = useState<number>(1);
  const [suggestions, setSuggestions] = useState<OnboardingSuggestions | null>(
    null,
  );
  const [selectedCategories, setSelectedCategories] = useState<
    CategorySuggestion[]
  >([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Subscription step state
  const [hasSubscriptions, setHasSubscriptions] = useState(true);
  const [subscriptionAmount, setSubscriptionAmount] = useState("85");

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
      // Auto-advance to currency selection step
      setTimeout(() => setStep("currency"), 1000);
    }
  };

  const handleManualLocation = () => {
    setShowManualSelection(true);
  };

  const handleCitySelect = (city: CityExpenseData) => {
    // Derive country code from country name
    const getCountryCode = (countryName: string): string => {
      const countryCodeMap: { [key: string]: string } = {
        Canada: "ca",
        "United States": "us",
        "United Kingdom": "gb",
        Germany: "de",
        France: "fr",
        Netherlands: "nl",
        Spain: "es",
        Italy: "it",
        Australia: "au",
      };
      return countryCodeMap[countryName] || "us"; // Default to 'us' if not found
    };

    const countryCode = getCountryCode(city.country);

    console.log("Manual city selection:", {
      city: city.city,
      country: city.country,
      countryCode: countryCode,
      latitude: city.latitude,
      longitude: city.longitude,
    });

    const newLocation = {
      city: city.city,
      country: city.country,
      countryCode: countryCode,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: "",
      success: true,
    };

    setLocation(newLocation);
    setShowManualSelection(false);
    setSearchQuery("");

    // Log the updated location to verify it's set correctly
    console.log("Location updated after manual selection:", newLocation);
  };

  const handleFamilySizeNext = () => {
    if (!location) {
      alert("Please select a location first before continuing.");
      setStep("location");
      return;
    }

    if (!location.city || !location.countryCode) {
      alert(
        `Invalid location data. Missing: ${!location.city ? "city" : ""} ${
          !location.countryCode ? "country code" : ""
        }. Please select a location again.`,
      );
      setStep("location");
      return;
    }

    // Go to subscription step next
    setStep("subscriptions");
  };

  const handleSubscriptionsNext = () => {
    const cityKey = createCityKey(location!.city, location!.countryCode);
    const sug = getSuggestions(cityKey, familySize);

    if (sug) {
      // Override the Subscriptions category amount based on user input
      const subsAmount = hasSubscriptions ? Math.max(0, parseFloat(subscriptionAmount) || 0) : 0;
      const adjustedCategories = sug.categories.map((cat) => {
        if (cat.name === 'Subscriptions') {
          return { ...cat, adjustedAmount: subsAmount };
        }
        return cat;
      });
      // Filter out Subscriptions if user said they have none
      const filteredCategories = hasSubscriptions
        ? adjustedCategories
        : adjustedCategories.filter((c) => c.name !== 'Subscriptions');

      const adjustedSuggestions = { ...sug, categories: filteredCategories };
      setSuggestions(adjustedSuggestions);
      setSelectedCategories(filteredCategories.slice(0, 8));
      setStep("categories");
    } else {
      alert(
        `Sorry, we don't have budget data for ${location!.city}, ${location!.country}. Please try selecting a different city or use "Start from Scratch" instead.`,
      );
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
    if (suggestions && selectedCategories.length > 0) {
      console.log("OnboardingFlow: Calling onComplete with:", {
        suggestions,
        selectedCategoriesCount: selectedCategories.length,
        currency,
      });
      onComplete(suggestions, selectedCategories, currency);
    } else {
      console.error("OnboardingFlow: Cannot complete - missing data:", {
        hasSuggestions: !!suggestions,
        selectedCategoriesCount: selectedCategories.length,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
              Welcome to BudgetBuddy! 🎉
            </h2>
            <button
              onClick={onSkip}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-sm"
            >
              Skip for now
            </button>
          </div>
          <p className="text-[var(--color-muted-foreground)] mt-2">
            Let's set up your budget with personalized suggestions
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {[
              "Location",
              "Currency",
              "Household",
              "Subscriptions",
              "Categories",
            ].map((label, idx) => (
              <div key={label} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    [
                      "location",
                      "currency",
                      "family-size",
                      "subscriptions",
                      "categories",
                    ].indexOf(step) >= idx
                      ? "bg-green-500 text-white"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="ml-1 text-xs text-[var(--color-muted-foreground)] hidden sm:inline">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Location Detection */}
          {step === "location" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                📍 Where are you located?
              </h3>
              <p className="text-[var(--color-muted-foreground)]">
                We'll use your location to provide relevant budget suggestions
              </p>

              {isDetecting && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-4 text-[var(--color-muted-foreground)]">
                    Detecting your location...
                  </p>
                </div>
              )}

              {!isDetecting && location && location.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    ✓ Location detected!
                  </p>
                  <p className="text-green-700 mt-1">
                    {location.city}, {location.country}
                  </p>
                  <div className="mt-4 space-x-2">
                    <button
                      onClick={() => setStep("currency")}
                      className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                    >
                      Continue
                    </button>
                    <button
                      onClick={handleManualLocation}
                      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Change Location
                    </button>
                  </div>
                </div>
              )}

              {!isDetecting && location && !location.success && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium">
                    ⚠️ Couldn't detect location
                  </p>
                  <p className="text-yellow-700 mt-1">{location.error}</p>
                  <div className="mt-4 space-x-2">
                    <button
                      onClick={handleAutoDetect}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleManualLocation}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Select Manually
                    </button>
                  </div>
                </div>
              )}

              {/* Manual City Selection */}
              {showManualSelection && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-[var(--color-foreground)] mb-3">
                    Select Your City
                  </h4>
                  <input
                    type="text"
                    placeholder="Search for your city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
                    {getAllCities()
                      .filter(
                        (city) =>
                          searchQuery.length === 0 ||
                          city.city
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          city.country
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                      )
                      .slice(0, 10)
                      .map((city) => (
                        <button
                          key={`${city.city}-${city.country}`}
                          onClick={() => handleCitySelect(city)}
                          className="w-full text-left px-4 py-2 rounded-lg hover:bg-[var(--color-muted)] border border-[var(--color-border)]"
                        >
                          <div className="font-medium">{city.city}</div>
                          <div className="text-sm text-[var(--color-muted-foreground)]">
                            {city.country}
                          </div>
                        </button>
                      ))}
                  </div>
                  <button
                    onClick={() => {
                      setShowManualSelection(false);
                      setSearchQuery("");
                    }}
                    className="mt-3 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Currency Selection */}
          {step === "currency" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">💱 Select your currency</h3>
              <p className="text-[var(--color-muted-foreground)]">
                Choose the currency you'll use for your budget. This will be
                used for all amounts and transactions.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Tip:</strong> You can change your currency later in
                  Settings, but existing budgets and transactions won't be
                  converted.
                </p>
              </div>

              <div className="mt-6">
                <CurrencySelector
                  value={currency}
                  onChange={setCurrency}
                  required
                  label="Select your currency"
                  showFullName={true}
                />
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep("location")}
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep("family-size")}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Family Size */}
          {step === "family-size" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                👨‍👩‍👧‍👦 How many people in your household?
              </h3>
              <p className="text-[var(--color-muted-foreground)]">
                This helps us adjust budget suggestions for your family size
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
                {[1, 2, 3, 4, 5].map((size) => (
                  <button
                    key={size}
                    onClick={() => setFamilySize(size)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      familySize === size
                        ? "border-green-500 bg-green-50"
                        : "border-[var(--color-border)] hover:border-[var(--color-border)]"
                    }`}
                  >
                    <div className="text-3xl mb-2">
                      {size === 1
                        ? "👤"
                        : size === 2
                          ? "👥"
                          : size === 3
                            ? "👨‍👩‍👧"
                            : size === 4
                              ? "👨‍👩‍👧‍👦"
                              : "👨‍👩‍👧‍👦+"}
                    </div>
                    <div className="font-medium">
                      {size} {size === 1 ? "person" : "people"}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep("currency")}
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  ← Back
                </button>
                <button
                  onClick={handleFamilySizeNext}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Subscriptions */}
          {step === "subscriptions" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold">📺 Streaming & Subscriptions</h3>
                <p className="text-[var(--color-muted-foreground)] mt-1 text-sm">
                  Do you pay for streaming services, software, or other recurring subscriptions?
                </p>
              </div>

              {/* Yes/No toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setHasSubscriptions(true)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    hasSubscriptions
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-[var(--color-border)] hover:border-[var(--color-border)]"
                  }`}
                >
                  <div className="text-2xl mb-1">✅</div>
                  <div className="font-medium text-sm text-[var(--color-foreground)]">Yes</div>
                  <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">I have subscriptions</div>
                </button>
                <button
                  onClick={() => setHasSubscriptions(false)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    !hasSubscriptions
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] hover:border-[var(--color-border)]"
                  }`}
                >
                  <div className="text-2xl mb-1">❌</div>
                  <div className="font-medium text-sm text-[var(--color-foreground)]">No</div>
                  <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Skip this category</div>
                </button>
              </div>

              {/* Amount input — shown only when Yes */}
              {hasSubscriptions && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                    How much do you spend on subscriptions monthly?
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] font-medium">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={subscriptionAmount}
                      onChange={e => setSubscriptionAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 text-lg font-semibold border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="85"
                    />
                  </div>
                  {/* Common examples */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      { label: "Basic (Netflix only)", amount: "18" },
                      { label: "Standard (Netflix + Spotify)", amount: "28" },
                      { label: "Full suite", amount: "85" },
                      { label: "Family bundle", amount: "120" },
                    ].map(preset => (
                      <button
                        key={preset.amount}
                        onClick={() => setSubscriptionAmount(preset.amount)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                          subscriptionAmount === preset.amount
                            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                            : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        }`}
                      >
                        {preset.label} · ${preset.amount}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
                    Common services: Netflix ($18), Spotify ($10), Disney+ ($8), Amazon Prime ($9), Apple TV+ ($10)
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setStep("family-size")}
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubscriptionsNext}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Category Selection */}
          {step === "categories" && suggestions && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                💰 Select your budget categories
              </h3>
              <p className="text-[var(--color-muted-foreground)]">
                Based on {suggestions.city}, we suggest these categories. Select
                the ones you want to track.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Tip:</strong> You can always add, edit, or remove
                  categories later
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {suggestions.categories.map((category) => {
                  const isSelected = selectedCategories.find(
                    (c) => c.name === category.name,
                  );
                  return (
                    <button
                      key={category.name}
                      onClick={() => toggleCategory(category)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-green-500 bg-green-50"
                          : "border-[var(--color-border)] hover:border-[var(--color-border)]"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{category.icon}</span>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-sm text-[var(--color-muted-foreground)] mt-1">
                            {category.reason}
                          </div>
                          <div className="text-lg font-semibold text-green-600 mt-2">
                            ${category.adjustedAmount}/mo
                          </div>
                        </div>
                        <div className="ml-2">
                          {isSelected && (
                            <span className="text-green-500 text-xl">✓</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep("subscriptions")}
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={selectedCategories.length === 0 || isSubmitting}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Creating Budget..."
                    : `Create Budget (${selectedCategories.length} categories)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
