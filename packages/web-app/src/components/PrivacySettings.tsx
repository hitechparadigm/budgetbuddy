/**
 * Privacy Settings Component
 *
 * Allows users to manage their data sharing and privacy preferences.
 */

import React, { useState, useEffect } from "react";

interface PrivacyPreferences {
  shareAnonymousData: boolean;
  participateInComparison: boolean;
  allowAnalytics: boolean;
  showInLeaderboards: boolean;
  receiveMarketingEmails: boolean;
  receiveProductUpdates: boolean;
}

interface PrivacySettingsProps {
  onSave?: (preferences: PrivacyPreferences) => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ onSave }) => {
  const STORAGE_KEY = "budgetbuddy_privacy_preferences";

  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    shareAnonymousData: true,
    participateInComparison: true,
    allowAnalytics: true,
    showInLeaderboards: false,
    receiveMarketingEmails: false,
    receiveProductUpdates: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load saved preferences
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load privacy preferences:", error);
    }
  }, []);

  const handleToggle = (key: keyof PrivacyPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      // Call onSave callback if provided (for API sync)
      if (onSave) {
        await onSave(preferences);
      }

      setSaveMessage("Privacy settings saved successfully");
    } catch (error) {
      console.error("Failed to save privacy preferences:", error);
      setSaveMessage("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: () => void;
    label: string;
    description: string;
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-start justify-between py-4 border-b border-[var(--color-border)] dark:border-gray-700 last:border-0">
      <div className="flex-1 pr-4">
        <h4 className="text-sm font-medium text-[var(--color-foreground)] dark:text-white">
          {label}
        </h4>
        <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mt-1">
          {description}
        </p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
          enabled ? "bg-green-600" : "bg-gray-200 dark:bg-gray-600"
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--color-surface)] shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="bg-[var(--color-surface)] dark:bg-gray-800 rounded-lg shadow-sm border border-[var(--color-border)] dark:border-gray-700">
      <div className="p-6 border-b border-[var(--color-border)] dark:border-gray-700">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)] dark:text-white">
          Privacy Settings
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mt-1">
          Control how your data is used and shared
        </p>
      </div>

      <div className="p-6">
        {/* Data Sharing Section */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[var(--color-foreground)] dark:text-gray-300 uppercase tracking-wider mb-4">
            Data Sharing
          </h4>

          <ToggleSwitch
            enabled={preferences.shareAnonymousData}
            onChange={() => handleToggle("shareAnonymousData")}
            label="Share Anonymous Usage Data"
            description="Help us improve BudgetBuddy by sharing anonymous usage statistics. No personal financial data is shared."
          />

          <ToggleSwitch
            enabled={preferences.participateInComparison}
            onChange={() => handleToggle("participateInComparison")}
            label="Participate in Peer Comparison"
            description="Allow your anonymized spending data to be included in peer comparison features. Requires 50+ users in your comparison group."
          />

          <ToggleSwitch
            enabled={preferences.allowAnalytics}
            onChange={() => handleToggle("allowAnalytics")}
            label="Allow Analytics"
            description="Enable analytics to help us understand how you use the app and improve your experience."
          />
        </div>

        {/* Visibility Section */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[var(--color-foreground)] dark:text-gray-300 uppercase tracking-wider mb-4">
            Visibility
          </h4>

          <ToggleSwitch
            enabled={preferences.showInLeaderboards}
            onChange={() => handleToggle("showInLeaderboards")}
            label="Show in Leaderboards"
            description="Allow your savings achievements to appear in anonymous community leaderboards."
          />
        </div>

        {/* Communication Section */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[var(--color-foreground)] dark:text-gray-300 uppercase tracking-wider mb-4">
            Communication
          </h4>

          <ToggleSwitch
            enabled={preferences.receiveMarketingEmails}
            onChange={() => handleToggle("receiveMarketingEmails")}
            label="Marketing Emails"
            description="Receive promotional emails about new features, tips, and special offers."
          />

          <ToggleSwitch
            enabled={preferences.receiveProductUpdates}
            onChange={() => handleToggle("receiveProductUpdates")}
            label="Product Updates"
            description="Receive emails about important product updates, security notices, and policy changes."
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] dark:border-gray-700">
          {saveMessage && (
            <p
              className={`text-sm ${
                saveMessage.includes("success")
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {saveMessage}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </div>

      {/* Privacy Info */}
      <div className="px-6 py-4 bg-[var(--color-background)] dark:bg-gray-700/50 rounded-b-lg">
        <div className="flex items-start space-x-3">
          <svg
            className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)] dark:text-gray-300">
              Your privacy is important to us. We never sell your personal data.
              Read our{" "}
              <a
                href="/privacy"
                className="text-green-600 dark:text-green-400 hover:underline"
              >
                Privacy Policy
              </a>{" "}
              to learn more about how we protect your information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
