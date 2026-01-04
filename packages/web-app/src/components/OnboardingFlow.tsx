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
import { getAllCities } from "@budget-buddy/shared/src/data/cityExpenseData";

interface OnboardingFlowProps {
  onComplete: (
    suggestions: OnboardingSuggestions,
    selectedCategories: CategorySuggestion[]
  ) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

type OnboardingStep = "location" | "family-size" | "categories" | "review";

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onSkip,
  isSubmitting = false,
}) => {
  const [step, setStep] = useState<OnboardingStep>("location");
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [familySize, setFamilySize] = useState<number>(1);
  const [suggestions, setSuggestions] = useState<OnboardingSuggestions | null>(
    null
  );
  const [selectedCategories, setSelectedCategories] = useState<
    CategorySuggestion[]
  >([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      // Auto-advance to next step
      setTimeout(() => setStep("family-size"), 1000);
    }
  };

  const handleManualLocation = () => {
    setShowManualSelection(true);
  };

  const handleCitySelect = (city: {
    city: string;
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
  }) => {
    setLocation({
      city: city.city,
      country: city.country,
      countryCode: city.countryCode,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: "",
      success: true,
    });
    setShowManualSelection(false);
    setSearchQuery("");
  };

  const handleFamilySizeNext = () => {
    if (!location) {
      console.error("No location data available");
      return;
    }

    // Debug: Log the location object
    console.log("Location data:", location);

    // Ensure we have valid location data
    if (!location.city || !location.countryCode) {
      console.error("Invalid location data:", location);
      console.error("Missing fields:", {
        hasCity: !!location.city,
        hasCountryCode: !!location.countryCode,
        city: location.city,
        countryCode: location.countryCode,
      });
      return;
    }

    const cityKey = createCityKey(location.city, location.countryCode);
    console.log("Generated city key:", cityKey);

    const sug = getSuggestions(cityKey, familySize);

    if (sug) {
      console.log("Found suggestions for:", sug.city, sug.country);
      setSuggestions(sug);
      setSelectedCategories(sug.categories.slice(0, 8)); // Select top 8 by default
      setStep("categories");
    } else {
      console.error("No suggestions found for city key:", cityKey);
      // Show error message to user
      alert(
        `Sorry, we don't have budget data for ${location.city}. Please try selecting a different city or use "Start from Scratch" instead.`
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
      });
      onComplete(suggestions, selectedCategories);
    } else {
      console.error("OnboardingFlow: Cannot complete - missing data:", {
        hasSuggestions: !!suggestions,
        selectedCategoriesCount: selectedCategories.length,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome to BudgetBuddy! 🎉
            </h2>
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip for now
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Let's set up your budget with personalized suggestions
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {["Location", "Family Size", "Categories", "Review"].map(
              (label, idx) => (
                <div key={label} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      [
                        "location",
                        "family-size",
                        "categories",
                        "review",
                      ].indexOf(step) >= idx
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="ml-2 text-sm text-gray-600 hidden sm:inline">
                    {label}
                  </span>
                </div>
              )
            )}
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
              <p className="text-gray-600">
                We'll use your location to provide relevant budget suggestions
              </p>

              {isDetecting && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">
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
                      onClick={() => setStep("family-size")}
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
                <div className="bg-white border border-gray-300 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Select Your City
                  </h4>
                  <input
                    type="text"
                    placeholder="Search for your city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                            .includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((city) => (
                        <button
                          key={`${city.city}-${city.country}`}
                          onClick={() => handleCitySelect(city)}
                          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 border border-gray-200"
                        >
                          <div className="font-medium">{city.city}</div>
                          <div className="text-sm text-gray-600">
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
                    className="mt-3 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Family Size */}
          {step === "family-size" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                👨‍👩‍👧‍👦 How many people in your household?
              </h3>
              <p className="text-gray-600">
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
                        : "border-gray-200 hover:border-gray-300"
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
                  onClick={() => setStep("location")}
                  className="text-gray-600 hover:text-gray-800"
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

          {/* Step 3: Category Selection */}
          {step === "categories" && suggestions && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                💰 Select your budget categories
              </h3>
              <p className="text-gray-600">
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
                    (c) => c.name === category.name
                  );
                  return (
                    <button
                      key={category.name}
                      onClick={() => toggleCategory(category)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{category.icon}</span>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
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
                  onClick={() => setStep("family-size")}
                  className="text-gray-600 hover:text-gray-800"
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
