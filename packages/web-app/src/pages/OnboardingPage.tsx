/**
 * AI-Powered Onboarding Page
 *
 * Collects user information through smart questions to generate
 * a personalized budget using AWS Bedrock AI
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface OnboardingData {
  // Family & Household
  familySituation: 'single' | 'couple' | 'family' | 'other';
  householdSize: number;

  // Income & Work
  monthlyIncome: 'under-2k' | '2k-3k' | '3k-5k' | '5k-8k' | 'over-8k' | 'prefer-not-to-say';

  // Housing & Lifestyle
  housingStatus: 'rent' | 'own' | 'live-with-family' | 'other';
  transportation: string[]; // Changed to array to support multiple selections

  // Financial Goals
  mainGoal: 'emergency-fund' | 'pay-debt' | 'save-house' | 'retirement' | 'vacation';
  debtSituation: 'no-debt' | 'credit-cards' | 'student-loans' | 'mortgage-only' | 'multiple-debts';
}

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [loading, setLoading] = useState(false);

  const totalSteps = 7;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // TODO: Send onboarding data to AI budget generation service
      console.log('Onboarding data:', onboardingData);

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to AI budget generation results
      navigate('/ai-budget-generation', { state: { onboardingData } });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateData = (field: keyof OnboardingData, value: any) => {
    setOnboardingData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTransportation = (value: string) => {
    setOnboardingData(prev => {
      const currentTransportation = prev.transportation || [];
      const isSelected = currentTransportation.includes(value);

      if (isSelected) {
        // Remove the value
        return {
          ...prev,
          transportation: currentTransportation.filter(item => item !== value)
        };
      } else {
        // Add the value
        return {
          ...prev,
          transportation: [...currentTransportation, value]
        };
      }
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's personalize your budget! 🎯</h2>
              <p className="text-gray-600">What's your family situation?</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { value: 'single', label: '👤 Single', desc: 'Just me' },
                { value: 'couple', label: '👫 Couple', desc: 'Me and my partner' },
                { value: 'family', label: '👨‍👩‍👧‍👦 Family', desc: 'We have kids' },
                { value: 'other', label: '🏠 Other', desc: 'Different situation' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateData('familySituation', option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    onboardingData.familySituation === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How many people in your household? 🏠</h2>
              <p className="text-gray-600">Including yourself</p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                <button
                  key={size}
                  onClick={() => updateData('householdSize', size)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    onboardingData.householdSize === size
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xl font-bold text-gray-900">{size}</div>
                  <div className="text-xs text-gray-600">{size === 8 ? '8+' : 'people'}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your monthly income range? 💰</h2>
              <p className="text-gray-600">This helps us scale your budget appropriately</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { value: 'under-2k', label: 'Under $2,000', desc: 'Starting out or part-time' },
                { value: '2k-3k', label: '$2,000 - $3,000', desc: 'Building up' },
                { value: '3k-5k', label: '$3,000 - $5,000', desc: 'Comfortable range' },
                { value: '5k-8k', label: '$5,000 - $8,000', desc: 'Good income' },
                { value: 'over-8k', label: 'Over $8,000', desc: 'High earner' },
                { value: 'prefer-not-to-say', label: 'Prefer not to say', desc: 'We\'ll use average estimates' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateData('monthlyIncome', option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    onboardingData.monthlyIncome === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your housing situation? 🏠</h2>
              <p className="text-gray-600">This affects a big part of your budget</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { value: 'rent', label: '🏢 Rent', desc: 'I pay monthly rent' },
                { value: 'own', label: '🏡 Own', desc: 'I have a mortgage or own outright' },
                { value: 'live-with-family', label: '👨‍👩‍👧‍👦 Live with family', desc: 'Staying with family/friends' },
                { value: 'other', label: '🏠 Other', desc: 'Different arrangement' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateData('housingStatus', option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    onboardingData.housingStatus === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How do you get around? 🚗</h2>
              <p className="text-gray-600">Select all that apply - many families use multiple options</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { value: 'car-owned', label: '🚗 Own a car', desc: 'Paid off vehicle (gas, insurance, maintenance)' },
                { value: 'car-payment', label: '🚙 Car payment', desc: 'Monthly loan or lease payment' },
                { value: 'public-transit', label: '🚌 Public transit', desc: 'Buses, trains, subway passes' },
                { value: 'rideshare', label: '🚕 Rideshare/Taxi', desc: 'Uber, Lyft, taxis' },
                { value: 'walk-bike', label: '🚶‍♂️ Walk/Bike', desc: 'Minimal transportation costs' }
              ].map(option => {
                const isSelected = onboardingData.transportation?.includes(option.value) || false;
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleTransportation(option.value)}
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-500">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {onboardingData.transportation && onboardingData.transportation.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Selected: {onboardingData.transportation.length} transportation method{onboardingData.transportation.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your main financial goal? 🎯</h2>
              <p className="text-gray-600">This helps us prioritize your budget categories</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { value: 'emergency-fund', label: '🛡️ Build emergency fund', desc: '3-6 months of expenses saved' },
                { value: 'pay-debt', label: '💳 Pay off debt', desc: 'Get rid of credit cards, loans' },
                { value: 'save-house', label: '🏠 Save for a house', desc: 'Down payment and closing costs' },
                { value: 'retirement', label: '🏖️ Retirement savings', desc: 'Long-term financial security' },
                { value: 'vacation', label: '✈️ Save for vacation', desc: 'Travel and experiences' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateData('mainGoal', option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    onboardingData.mainGoal === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your current debt situation? 💳</h2>
              <p className="text-gray-600">Last question! This helps us plan your debt payoff strategy</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { value: 'no-debt', label: '✅ No debt', desc: 'Debt-free lifestyle' },
                { value: 'credit-cards', label: '💳 Credit card debt', desc: 'Working on paying off cards' },
                { value: 'student-loans', label: '🎓 Student loans', desc: 'Education debt to manage' },
                { value: 'mortgage-only', label: '🏠 Mortgage only', desc: 'Just the house payment' },
                { value: 'multiple-debts', label: '📊 Multiple debts', desc: 'Various loans and payments' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateData('debtSituation', option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    onboardingData.debtSituation === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return onboardingData.familySituation;
      case 2: return onboardingData.householdSize;
      case 3: return onboardingData.monthlyIncome;
      case 4: return onboardingData.housingStatus;
      case 5: return onboardingData.transportation && onboardingData.transportation.length > 0;
      case 6: return onboardingData.mainGoal;
      case 7: return onboardingData.debtSituation;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Creating your personalized budget... 🤖</h2>
          <p className="text-gray-600">Our AI is analyzing your responses and local cost-of-living data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-4">
            <span className="text-blue-600 text-sm font-medium">✨ AI-Powered Setup</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Let's create your perfect budget! 🎯
          </h1>
          <p className="text-gray-600">
            Answer a few quick questions so we can personalize your budget
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-600">{Math.round((currentStep / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              canProceed()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {currentStep === totalSteps ? 'Generate My Budget 🤖' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
