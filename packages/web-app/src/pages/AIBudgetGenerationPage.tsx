/**
 * AI Budget Generation Results Page
 *
 * Shows the AI-generated budget based on user onboarding responses
 * and allows users to accept, customize, or regenerate
 */

import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import { config } from "../config/environment";

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
  const [error, setError] = useState<string | null>(null);
  // Multi-step progress animation state
  const [currentStep, setCurrentStep] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PROGRESS_STEPS = [
    { label: 'Analyzing your location and household...', icon: '📍' },
    { label: 'Building your budget categories...', icon: '🏗️' },
    { label: 'Reviewing for your household size...', icon: '👥' },
    { label: 'Applying local cost-of-living data...', icon: '💡' },
    { label: 'Finalizing recommendations...', icon: '✨' },
  ];

  const onboardingData = location.state?.onboardingData;

  useEffect(() => {
    generateAIBudget();
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, []);

  // Advance the step label every ~1.8s while loading
  useEffect(() => {
    if (!loading) return;
    const advanceStep = () => {
      setCurrentStep(prev => {
        if (prev < PROGRESS_STEPS.length - 1) {
          stepTimerRef.current = setTimeout(advanceStep, 1800);
          return prev + 1;
        }
        return prev;
      });
    };
    stepTimerRef.current = setTimeout(advanceStep, 1800);
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, [loading]);

  const generateAIBudget = async () => {
    setLoading(true);
    setCurrentStep(0);
    setError(null);

    try {
      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) {
        navigate('/auth');
        return;
      }

      // Call real Bedrock AI endpoint
      const response = await fetch(`${config.apiBaseUrl}/budget/ai-generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: onboardingData?.city,
          country: onboardingData?.country,
          familySize: onboardingData?.familySize || onboardingData?.householdSize || 2,
          currentMonth: onboardingData?.currentMonth,
          selectedCategories: onboardingData?.selectedCategories,
          budgetType: onboardingData?.budgetType || 'personal',
          currency: onboardingData?.currency || 'USD',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const budgetData = data.data || data;

      // Transform backend response into frontend GeneratedBudget shape
      const groups = budgetData.groups || {};
      const incomeArr = Array.isArray(groups) ? groups.find((g: any) => g.type === 'income')?.categories || [] : groups.income || [];
      const savingsArr = Array.isArray(groups) ? groups.find((g: any) => g.type === 'savings')?.categories || [] : groups.savings || [];
      const expensesArr = Array.isArray(groups) ? groups.find((g: any) => g.type === 'expense' || g.type === 'expenses')?.categories || [] : groups.expenses || [];

      const totalIncome = incomeArr.reduce((s: number, c: any) => s + (Number(c.plannedAmount) || 0), 0);
      const totalSavings = savingsArr.reduce((s: number, c: any) => s + (Number(c.plannedAmount) || 0), 0);
      const totalExpenses = expensesArr.reduce((s: number, c: any) => s + (Number(c.plannedAmount) || 0), 0);

      const transformedBudget: GeneratedBudget = {
        monthlyIncome: totalIncome,
        totalAllocated: totalSavings + totalExpenses,
        remaining: totalIncome - totalSavings - totalExpenses,
        currency: budgetData.currency || onboardingData?.currency || 'USD',
        location: onboardingData?.city ? `${onboardingData.city}, ${onboardingData.country || ''}` : 'Your location',
        householdSize: onboardingData?.familySize || onboardingData?.householdSize || 2,
        income: incomeArr.map((c: any) => ({ id: c.id || c.name, name: c.name, icon: c.icon || '💰', plannedAmount: Number(c.plannedAmount) || 0, description: c.description || '' })),
        savings: savingsArr.map((c: any) => ({ id: c.id || c.name, name: c.name, icon: c.icon || '💾', plannedAmount: Number(c.plannedAmount) || 0, description: c.description || '' })),
        expenses: expensesArr.map((c: any) => ({ id: c.id || c.name, name: c.name, icon: c.icon || '💸', plannedAmount: Number(c.plannedAmount) || 0, description: c.description || '' })),
        aiInsights: budgetData.aiInsights || ['Budget generated with local cost-of-living data.'],
      };

      // Store for BudgetPage to pick up
      localStorage.setItem('ai-generated-budget', JSON.stringify({
        income: incomeArr,
        savings: savingsArr,
        expenses: expensesArr,
      }));

      setBudget(transformedBudget);
    } catch (err) {
      console.error('[AIBudgetGenerationPage] Error calling AI endpoint:', err);
      // Fall back to mock budget so the user isn't stuck
      setError(err instanceof Error ? err.message : 'AI generation failed');
      setBudget(buildFallbackBudget(onboardingData));
    } finally {
      setLoading(false);
    }
  };

  /** Fallback budget when Bedrock is unavailable */
  const buildFallbackBudget = (data: any): GeneratedBudget => {
    const income = getIncomeEstimate(data?.monthlyIncome);
    return {
      monthlyIncome: income,
      totalAllocated: Math.round(income * 0.9),
      remaining: Math.round(income * 0.1),
      currency: data?.currency || 'USD',
      location: data?.city || 'Your location',
      householdSize: data?.familySize || data?.householdSize || 2,
      income: [{ id: 'salary', name: 'Salary', icon: '💰', plannedAmount: income, description: 'Primary income' }],
      savings: [
        { id: 'emergency', name: 'Emergency Fund', icon: '🛡️', plannedAmount: Math.round(income * 0.1), description: '3–6 months of expenses' },
        { id: 'retirement', name: 'Retirement', icon: '🏦', plannedAmount: Math.round(income * 0.05), description: 'Long-term savings' },
      ],
      expenses: [
        { id: 'housing', name: 'Housing', icon: '🏠', plannedAmount: Math.round(income * 0.3), description: 'Rent/mortgage' },
        { id: 'food', name: 'Groceries', icon: '🛒', plannedAmount: Math.round(income * 0.1), description: 'Food & household' },
        { id: 'transport', name: 'Transportation', icon: '🚗', plannedAmount: Math.round(income * 0.1), description: 'Car/transit' },
        { id: 'utilities', name: 'Utilities', icon: '💡', plannedAmount: Math.round(income * 0.05), description: 'Electricity, water, internet' },
        { id: 'healthcare', name: 'Healthcare', icon: '🏥', plannedAmount: Math.round(income * 0.05), description: 'Insurance & medical' },
        { id: 'personal', name: 'Personal', icon: '🎯', plannedAmount: Math.round(income * 0.15), description: 'Clothing, entertainment, misc' },
      ],
      aiInsights: ['This is a template budget. For personalized recommendations, set up your location in Settings.'],
    };
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
    const step = PROGRESS_STEPS[currentStep];
    const progressPct = Math.round(((currentStep + 1) / PROGRESS_STEPS.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          {/* Animated icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-100 absolute inset-0" />
            <div className="w-20 h-20 rounded-full border-4 border-t-emerald-600 border-r-emerald-600 border-b-transparent border-l-transparent animate-spin absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">
              {step.icon}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Building your budget...
          </h2>
          <p className="text-gray-600 mb-6 min-h-[1.5rem] transition-all">
            {step.label}
          </p>

          {/* Progress bar */}
          <div className="h-2 bg-emerald-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2">
            {PROGRESS_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i <= currentStep ? 'bg-emerald-600' : 'bg-emerald-100'
                }`}
              />
            ))}
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
        {/* Fallback notice when AI was unavailable */}
        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <strong>Note:</strong> AI generation encountered an issue ({error}). Showing a template budget — you can customize it.
          </div>
        )}
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
