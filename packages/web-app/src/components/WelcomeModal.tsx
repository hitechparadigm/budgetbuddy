/**
 * WelcomeModal Component
 *
 * Displays a welcome message after onboarding completion
 * with quick tips and next steps.
 */

import React from "react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTutorial: () => void;
  userName?: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartTutorial,
  userName,
}) => {
  if (!isOpen) return null;

  const quickTips = [
    {
      icon: "💰",
      title: "Track Every Dollar",
      description: "Log transactions as they happen for accurate budgeting",
    },
    {
      icon: "📊",
      title: "Review Weekly",
      description: "Check your spending weekly to stay on track",
    },
    {
      icon: "🎯",
      title: "Set Goals",
      description: "Create savings goals to stay motivated",
    },
    {
      icon: "⌨️",
      title: "Use Shortcuts",
      description: "Press Ctrl+/ to see all keyboard shortcuts",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header with celebration */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-8 text-center text-white">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">
            Welcome{userName ? `, ${userName}` : ""}!
          </h2>
          <p className="text-green-100">
            Your budget is all set up and ready to go
          </p>
        </div>

        {/* Quick Tips */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Tips to Get Started
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {quickTips.map((tip, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">{tip.icon}</div>
                <div className="font-medium text-gray-900 text-sm">
                  {tip.title}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {tip.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={onStartTutorial}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Take a Quick Tour
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Start Budgeting
          </button>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-500">
            You can replay the tutorial anytime from Settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
