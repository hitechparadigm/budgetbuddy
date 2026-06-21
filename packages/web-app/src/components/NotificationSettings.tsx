/**
 * Notification Settings Component
 *
 * Allows users to configure push notification preferences.
 * Uses correct API Gateway URL and Tailwind dark mode classes.
 */

import React, { useState, useEffect } from "react";
import { config } from "../config/environment";

interface NotificationPreferences {
  budgetAlertsEnabled: boolean;
  dailyRemindersEnabled: boolean;
  reminderTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface NotificationSettingsProps {
  userId: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  userId,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    budgetAlertsEnabled: true,
    dailyRemindersEnabled: true,
    reminderTime: "19:00",
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("budgetbuddy_id_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      // Notifications API is on the main API gateway, not the features API
      const response = await fetch(
        `${config.apiBaseUrl}/notifications/preferences?userId=${userId}`,
        { headers: getAuthHeaders() },
      );

      if (response.ok) {
        const data = await response.json();
        const prefs = data.data || data;
        if (prefs && typeof prefs === "object") {
          setPreferences((prev) => ({ ...prev, ...prefs }));
        }
      } else if (response.status === 404) {
        // No preferences saved yet — use defaults silently
      } else {
        setMessage({
          type: "error",
          text: "Failed to load notification preferences",
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      setMessage({
        type: "error",
        text: "Failed to load notification preferences",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setMessage(null);

      if (!isValidTimeFormat(preferences.reminderTime)) {
        setMessage({
          type: "error",
          text: "Invalid reminder time format. Use HH:mm (e.g., 19:00)",
        });
        return;
      }
      if (
        !isValidTimeFormat(preferences.quietHoursStart) ||
        !isValidTimeFormat(preferences.quietHoursEnd)
      ) {
        setMessage({
          type: "error",
          text: "Invalid quiet hours format. Use HH:mm (e.g., 22:00)",
        });
        return;
      }

      const response = await fetch(
        `${config.apiBaseUrl}/notifications/preferences`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ userId, preferences }),
        },
      );

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Notification preferences saved!",
        });
      } else {
        setMessage({ type: "error", text: "Failed to save preferences" });
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage({ type: "error", text: "Failed to save preferences" });
    } finally {
      setSaving(false);
    }
  };

  const isValidTimeFormat = (time: string): boolean =>
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

  const handleToggle = (
    field: "budgetAlertsEnabled" | "dailyRemindersEnabled",
  ) => {
    setPreferences((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleTimeChange = (
    field: "reminderTime" | "quietHoursStart" | "quietHoursEnd",
    value: string,
  ) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-4 text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
        <div className="h-5 w-5 rounded-full border-2 border-[var(--color-border)] border-t-emerald-600 animate-spin" />
        <span className="text-sm">Loading notification preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] dark:text-white">
        Notification Preferences
      </h3>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Budget Alerts */}
      <div className="flex items-start justify-between py-4 border-b border-[var(--color-border)] dark:border-gray-700">
        <div>
          <p className="font-medium text-[var(--color-foreground)] dark:text-white">
            Budget Alerts
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mt-1">
            Receive alerts when spending reaches 80%, 90%, or 100% of your
            budget
          </p>
        </div>
        <button
          role="switch"
          aria-checked={preferences.budgetAlertsEnabled}
          onClick={() => handleToggle("budgetAlertsEnabled")}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            preferences.budgetAlertsEnabled
              ? "bg-emerald-600"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--color-surface)] shadow ring-0 transition duration-200 ${
              preferences.budgetAlertsEnabled
                ? "translate-x-5"
                : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Daily Reminders */}
      <div className="flex items-start justify-between py-4 border-b border-[var(--color-border)] dark:border-gray-700">
        <div>
          <p className="font-medium text-[var(--color-foreground)] dark:text-white">
            Daily Reminders
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mt-1">
            Receive daily reminders to log your expenses
          </p>
        </div>
        <button
          role="switch"
          aria-checked={preferences.dailyRemindersEnabled}
          onClick={() => handleToggle("dailyRemindersEnabled")}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            preferences.dailyRemindersEnabled
              ? "bg-emerald-600"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--color-surface)] shadow ring-0 transition duration-200 ${
              preferences.dailyRemindersEnabled
                ? "translate-x-5"
                : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Reminder Time */}
      {preferences.dailyRemindersEnabled && (
        <div className="py-4 border-b border-[var(--color-border)] dark:border-gray-700">
          <label
            htmlFor="reminderTime"
            className="block font-medium text-[var(--color-foreground)] dark:text-white mb-2"
          >
            Reminder Time
          </label>
          <input
            id="reminderTime"
            type="time"
            value={preferences.reminderTime}
            onChange={(e) => handleTimeChange("reminderTime", e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-foreground)] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
            Time of day to receive daily reminders
          </p>
        </div>
      )}

      {/* Quiet Hours */}
      <div className="py-4">
        <p className="font-medium text-[var(--color-foreground)] dark:text-white mb-2">
          Quiet Hours
        </p>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={preferences.quietHoursStart}
            onChange={(e) =>
              handleTimeChange("quietHoursStart", e.target.value)
            }
            className="px-3 py-2 border border-[var(--color-border)] dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-foreground)] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">to</span>
          <input
            type="time"
            value={preferences.quietHoursEnd}
            onChange={(e) => handleTimeChange("quietHoursEnd", e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-foreground)] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
          No notifications will be sent during these hours
        </p>
      </div>

      <button
        onClick={savePreferences}
        disabled={saving}
        className="w-full px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
};
