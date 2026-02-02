/**
 * TutorialOverlay Component
 *
 * Provides an interactive tutorial overlay that highlights
 * key features and guides new users through the app.
 */

import React, { useState, useEffect, useCallback } from "react";

interface TutorialStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  isOpen,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetPosition = useCallback(() => {
    if (!isOpen || currentStep >= steps.length) return;

    const target = document.querySelector(steps[currentStep].target);
    if (target) {
      setTargetRect(target.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep, steps]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [updateTargetPosition]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 16;
    const position = step.position || "bottom";

    switch (position) {
      case "top":
        return {
          bottom: window.innerHeight - targetRect.top + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + padding,
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: "translateY(-50%)",
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: "translateX(-50%)",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay with spotlight */}
      <div className="absolute inset-0 bg-black bg-opacity-70">
        {targetRect && (
          <div
            className="absolute bg-transparent"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7)",
              borderRadius: "8px",
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="absolute bg-white rounded-lg shadow-xl p-6 max-w-sm z-10"
        style={getTooltipStyle()}
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-1 mb-4">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full ${
                idx <= currentStep ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {step.title}
        </h3>
        <p className="text-gray-600 mb-6">{step.content}</p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip tutorial
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <div className="text-center text-xs text-gray-400 mt-4">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
};

// Default tutorial steps for new users
export const DEFAULT_TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: '[data-tutorial="add-transaction"]',
    title: "Add Your First Transaction",
    content:
      "Click here to add a new transaction. You can track income and expenses to stay on top of your budget.",
    position: "bottom",
  },
  {
    target: '[data-tutorial="budget-categories"]',
    title: "Budget Categories",
    content:
      "Your budget is organized into categories. Each category shows how much you've spent vs. your budget.",
    position: "right",
  },
  {
    target: '[data-tutorial="quick-actions"]',
    title: "Quick Actions",
    content:
      "Use the floating action button for quick access to common actions like adding transactions.",
    position: "top",
  },
  {
    target: '[data-tutorial="settings"]',
    title: "Customize Your Experience",
    content:
      "Visit Settings to customize your currency, theme, and notification preferences.",
    position: "left",
  },
];

export default TutorialOverlay;
