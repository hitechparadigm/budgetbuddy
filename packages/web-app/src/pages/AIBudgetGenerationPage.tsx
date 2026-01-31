/**
 * AI Budget Generation Results Page
 *
 * Shows the AI-generated budget based on user onboarding responses
 * and allows users to accept, customize, or regenerate
 */

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  plannedAmount: number;
  description: string;
}

interface GeneratedBudget {
  monthlyIncome: number;
  totalAllocated: number;
  remaining: number;
  currency?: string;
  income: BudgetCategory[];
  savings: BudgetCategory[];
  expenses: BudgetCategory[];
  aiInsights: string[];
  location: string;
  householdSize: number;
}

export const AIBudgetGenerationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<GeneratedBudget | null>(null);
  const [loading, setLoading] = useState(true);

  const onboardingData = location.state?.onboardingData;

  useEffect(() => {
    generateAIBudget();
  }, []);

  const generateAIBudget = async () => {
    setLoading(true);

    // Simulate AI budget generation based on onboarding data
    // In production, this would call AWS Bedrock API
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Mock AI-generated budget based on user responses
    const mockBudget: GeneratedBudget = {
      monthlyIncome: getIncomeEstimate(onboardingData?.monthlyIncome),
      totalAllocated: 0, // Will be calculated
      remaining: 0, // Will be calculated
      location: "Toronto, ON", // Would come from user registration
      householdSize: onboardingData?.householdSize || 2,

      income: [
        {
          id: "salary",
          name: "Salary",
          icon: "💰",
          plannedAmount: getIncomeEstimate(onboardingData?.monthlyIncome),
          description: "Primary employment income",
        },
      ],

      savings: generateSavingsCategories(onboardingData),
      expenses: generateExpenseCategories(onboardingData),

      aiInsights: generateAIInsights(onboardingData),
    };

    // Calculate totals
    const totalSavings = mockBudget.savings.reduce(
      (sum, cat) => sum + cat.plannedAmount,
      0,
    );
    const totalExpenses = mockBudget.expenses.reduce(
      (sum, cat) => sum + cat.plannedAmount,
      0,
    );
    mockBudget.totalAllocated = totalSavings + totalExpenses;
    mockBudget.remaining = mockBudget.monthlyIncome - mockBudget.totalAllocated;

    setBudget(mockBudget);
    setLoading(false);
  };

  const getIncomeEstimate = (incomeRange: string | undefined): number => {
    switch (incomeRange) {
      case "under-2k":
        return 1800;
      case "2k-3k":
        return 2500;
      case "3k-5k":
        return 4000;
      case "5k-8k":
        return 6500;
      case "over-8k":
        return 9000;
      default:
        return 4000;
    }
  };

  const generateSavingsCategories = (data: any): BudgetCategory[] => {
    const categories: BudgetCategory[] = [];
    const income = getIncomeEstimate(data?.monthlyIncome);

    // Emergency fund (always recommended)
    categories.push({
      id: "emergency-fund",
      name: "Emergency Fund",
      icon: "🛡️",
      plannedAmount: Math.round(income * 0.1), // 10% of income
      description: "Build 3-6 months of expenses",
    });

    // Goal-based savings
    if (data?.mainGoal === "retirement") {
      categories.push({
        id: "retirement",
        name: "RRSP/401k",
        icon: "🏖️",
        plannedAmount: Math.round(income * 0.15), // 15% for retirement focus
        description: "Long-term retirement savings",
      });
    } else if (data?.mainGoal === "save-house") {
      categories.push({
        id: "house-fund",
        name: "House Fund",
        icon: "🏠",
        plannedAmount: Math.round(income * 0.2), // 20% for house savings
        description: "Down payment and closing costs",
      });
    } else {
      categories.push({
        id: "retirement",
        name: "RRSP/401k",
        icon: "🏖️",
        plannedAmount: Math.round(income * 0.1), // 10% baseline
        description: "Retirement savings",
      });
    }

    return categories;
  };

  const generateExpenseCategories = (data: any): BudgetCategory[] => {
    const income = getIncomeEstimate(data?.monthlyIncome);
    const householdSize = data?.householdSize || 2;

    const categories: BudgetCategory[] = [];

    // Realistic Toronto Housing Costs
    let housingAmount: number;
    if (data?.housingStatus === "live-with-family") {
      housingAmount = Math.min(income * 0.15, 800); // Contribution to family
    } else if (data?.housingStatus === "rent") {
      // Toronto rental costs based on household size
      if (householdSize <= 2) {
        housingAmount = Math.max(1800, income * 0.35); // 1BR/2BR minimum $1800
      } else if (householdSize <= 4) {
        housingAmount = Math.max(2500, income * 0.4); // 3BR minimum $2500
      } else {
        housingAmount = Math.max(3200, income * 0.45); // 4BR+ minimum $3200
      }
    } else {
      // Mortgage/ownership costs
      if (householdSize <= 2) {
        housingAmount = Math.max(2200, income * 0.35);
      } else if (householdSize <= 4) {
        housingAmount = Math.max(2800, income * 0.4);
      } else {
        housingAmount = Math.max(3500, income * 0.45);
      }
    }

    categories.push({
      id: "housing",
      name: data?.housingStatus === "rent" ? "Rent" : "Housing",
      icon: "🏠",
      plannedAmount: Math.round(housingAmount),
      description:
        data?.housingStatus === "rent"
          ? "Monthly rent payment (Toronto rates)"
          : "Mortgage/housing costs",
    });

    // Realistic Toronto Grocery Costs
    let groceryAmount: number;
    if (householdSize === 1) {
      groceryAmount = 400; // Single person
    } else if (householdSize === 2) {
      groceryAmount = 650; // Couple
    } else if (householdSize === 3) {
      groceryAmount = 900; // Small family
    } else if (householdSize === 4) {
      groceryAmount = 1200; // Family of 4
    } else {
      groceryAmount = 1200 + (householdSize - 4) * 250; // Large family
    }

    categories.push({
      id: "groceries",
      name: "Groceries",
      icon: "🛒",
      plannedAmount: groceryAmount,
      description: `Food for ${householdSize} ${householdSize === 1 ? "person" : "people"} (Toronto prices)`,
    });

    // Transportation (handles multiple methods)
    const transportationMethods = data?.transportation || [];
    let totalTransportAmount = 0;
    const transportCategories: string[] = [];

    // Calculate costs for each transportation method
    transportationMethods.forEach((method: string) => {
      switch (method) {
        case "car-owned":
          totalTransportAmount += 250; // Gas, insurance, maintenance
          transportCategories.push("owned car");
          break;
        case "car-payment":
          totalTransportAmount += 400; // Payment + gas + insurance
          transportCategories.push("car payment");
          break;
        case "public-transit":
          totalTransportAmount += 120; // Monthly passes
          transportCategories.push("public transit");
          break;
        case "rideshare":
          totalTransportAmount += 200; // Uber/Lyft usage
          transportCategories.push("rideshare");
          break;
        case "walk-bike":
          totalTransportAmount += 30; // Minimal costs
          transportCategories.push("walk/bike");
          break;
      }
    });

    // Default if no transportation selected
    if (totalTransportAmount === 0) {
      totalTransportAmount = 200;
      transportCategories.push("general transportation");
    }

    categories.push({
      id: "transportation",
      name: "Transportation",
      icon: "🚗",
      plannedAmount: Math.round(totalTransportAmount),
      description: `${transportCategories.join(", ")} costs`,
    });

    // Realistic Toronto Utilities
    let utilitiesAmount: number;
    if (householdSize <= 2) {
      utilitiesAmount = 180; // Couple/single
    } else if (householdSize <= 4) {
      utilitiesAmount = 250; // Family of 3-4
    } else {
      utilitiesAmount = 300; // Large family
    }

    categories.push({
      id: "utilities",
      name: "Utilities",
      icon: "⚡",
      plannedAmount: utilitiesAmount,
      description: "Electricity, water, internet, phone (Toronto rates)",
    });

    // Entertainment/Personal
    categories.push({
      id: "entertainment",
      name: "Entertainment",
      icon: "🎬",
      plannedAmount: Math.round(income * 0.05), // 5% of income
      description: "Movies, dining out, hobbies",
    });

    // Debt payments (if applicable)
    if (data?.debtSituation && data.debtSituation !== "no-debt") {
      categories.push({
        id: "debt-payment",
        name: "Debt Payment",
        icon: "💳",
        plannedAmount: Math.round(income * 0.15), // 15% for debt payoff
        description: getDebtDescription(data.debtSituation),
      });
    }

    return categories;
  };

  const getDebtDescription = (debtSituation: string): string => {
    switch (debtSituation) {
      case "credit-cards":
        return "Credit card minimum payments";
      case "student-loans":
        return "Student loan payments";
      case "mortgage-only":
        return "Mortgage payment";
      case "multiple-debts":
        return "Various debt payments";
      default:
        return "Debt payments";
    }
  };

  const generateAIInsights = (data: any): string[] => {
    const insights: string[] = [];

    insights.push(
      `Based on your ${data?.familySituation || "family"} situation in Toronto, this budget uses realistic GTA cost-of-living data and prioritizes ${data?.mainGoal?.replace("-", " ") || "financial stability"}.`,
    );

    // Toronto-specific insights
    if (data?.householdSize >= 4) {
      insights.push(
        "Toronto housing costs are high for families. We've allocated realistic amounts based on current rental/ownership rates in the GTA.",
      );
    }

    insights.push(
      "Grocery costs reflect Toronto's higher food prices, especially for families with children.",
    );

    if (data?.householdSize > 2) {
      insights.push(
        `With ${data.householdSize} people in your household, we've scaled grocery and utility costs accordingly.`,
      );
    }

    if (data?.mainGoal === "emergency-fund") {
      insights.push(
        "We've prioritized building your emergency fund - aim for 3-6 months of expenses.",
      );
    }

    if (data?.debtSituation !== "no-debt") {
      insights.push(
        "We've allocated funds for debt payment. Consider the debt snowball method to pay off debts faster.",
      );
    }

    // Transportation insights
    if (data?.transportation && data.transportation.length > 1) {
      insights.push(
        `We've accounted for your ${data.transportation.length} transportation methods to give you a realistic budget.`,
      );
    }

    insights.push(
      "This budget follows the zero-based budgeting principle - every dollar has a purpose.",
    );

    return insights;
  };

  const handleAcceptBudget = () => {
    // Save the AI-generated budget and navigate to main budget page
    localStorage.setItem("ai-generated-budget", JSON.stringify(budget));
    navigate("/budget");
  };

  const handleCustomizeBudget = () => {
    // Navigate to budget customization page
    navigate("/budget/customize", { state: { generatedBudget: budget } });
  };

  const handleStartOver = () => {
    navigate("/onboarding");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Creating your personalized budget... 🤖
          </h2>
          <div className="space-y-2 text-gray-600">
            <p>✨ Analyzing your responses...</p>
            <p>📍 Checking local cost-of-living data...</p>
            <p>🎯 Optimizing for your financial goals...</p>
            <p>💡 Generating smart recommendations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Something went wrong
          </h2>
          <button
            onClick={handleStartOver}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-4">
            <span className="text-blue-600 text-sm font-medium">
              ✨ AI-Generated Budget
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Here's your personalized budget! 🎯
          </h1>
          <p className="text-gray-600">
            Based on your responses and cost-of-living data for{" "}
            {budget.location}
          </p>
        </div>

        {/* Budget Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(budget.monthlyIncome, budget.currency || "USD")}
              </div>
              <div className="text-sm text-gray-600">Monthly Income</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(
                  budget.totalAllocated,
                  budget.currency || "USD",
                )}
              </div>
              <div className="text-sm text-gray-600">Total Allocated</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${budget.remaining >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(
                  Math.abs(budget.remaining),
                  budget.currency || "USD",
                )}
              </div>
              <div className="text-sm text-gray-600">
                {budget.remaining >= 0 ? "Remaining" : "Over Budget"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {budget.householdSize}
              </div>
              <div className="text-sm text-gray-600">Household Size</div>
            </div>
          </div>
        </div>

        {/* Budget Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Income */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center">
              💰 Income
            </h3>
            <div className="space-y-3">
              {budget.income.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{category.icon}</span>
                    <div>
                      <div className="text-gray-900 font-medium">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {category.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-green-600 font-semibold">
                    {formatCurrency(
                      category.plannedAmount,
                      budget.currency || "USD",
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Savings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
              💾 Savings
            </h3>
            <div className="space-y-3">
              {budget.savings.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{category.icon}</span>
                    <div>
                      <div className="text-gray-900 font-medium">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {category.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-blue-600 font-semibold">
                    {formatCurrency(
                      category.plannedAmount,
                      budget.currency || "USD",
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
              💸 Expenses
            </h3>
            <div className="space-y-3">
              {budget.expenses.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{category.icon}</span>
                    <div>
                      <div className="text-gray-900 font-medium">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {category.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-red-600 font-semibold">
                    {formatCurrency(
                      category.plannedAmount,
                      budget.currency || "USD",
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            🤖 AI Insights & Recommendations
          </h3>
          <div className="space-y-3">
            {budget.aiInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3">
                <span className="text-blue-600 mt-1">•</span>
                <p className="text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleAcceptBudget}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            ✅ Use This Budget
          </button>
          <button
            onClick={handleCustomizeBudget}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            ✏️ Customize Budget
          </button>
          <button
            onClick={handleStartOver}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            🔄 Start Over
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIBudgetGenerationPage;
