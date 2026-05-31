/**
 * Settings Page
 *
 * Allows users to manage their profile, location, and timezone settings
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  detectUserTimezone,
  formatDateInTimezone,
} from "../utils/timezoneHelpers";
import TokenDiagnostics from "../components/TokenDiagnostics";
import { CurrencySelector } from "../components/CurrencySelector";
import { getCurrencyConfig } from "@budget-buddy/shared/src/utils/currency";
import { NotificationSettings } from "../components/NotificationSettings";
import { FamilySettings } from "../components/FamilySettings";
import { TwoFactorSetup } from "../components/TwoFactorSetup";
import { ThemeToggle } from "../components/ThemeToggle";
import { DeleteAccountModal } from "../components/DeleteAccountModal";
import { profileApi } from "../services/api";

interface LocationForm {
  country: string;
  city: string;
  zipCode: string;
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [showCurrencyConfirm, setShowCurrencyConfirm] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string>("");
  const [locationForm, setLocationForm] = useState<LocationForm>({
    country: "",
    city: "",
    zipCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showTokenDiagnostics, setShowTokenDiagnostics] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    // Load user profile from API
    const loadProfile = async () => {
      try {
        const profile = await profileApi.getProfile();

        // Set timezone from profile or detect
        if (profile.timezone) {
          setTimezone(profile.timezone);
        } else {
          const detectedTimezone = detectUserTimezone();
          setTimezone(detectedTimezone);
        }

        // Set currency from profile
        if (profile.currency) {
          setCurrency(profile.currency);
        }

        // Set location from profile — handle both object and JSON string forms
        if (profile.location) {
          const loc =
            typeof profile.location === "string"
              ? JSON.parse(profile.location)
              : profile.location;
          if (loc && (loc.country || loc.city)) {
            setLocationForm({
              country: loc.country || "",
              city: loc.city || "",
              zipCode: loc.zipCode || "",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        // Fallback to detected timezone
        const detectedTimezone = detectUserTimezone();
        setTimezone(detectedTimezone);
      }
    };

    // Check MFA status
    const checkMfaStatus = async () => {
      try {
        setMfaLoading(true);
        const token = localStorage.getItem("budgetbuddy_id_token");
        if (!token) {
          setMfaLoading(false);
          return;
        }

        const apiUrl =
          "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";
        const response = await fetch(`${apiUrl}/auth/mfa/status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMfaEnabled(data.data?.enabled || data.enabled || false);
        }
      } catch (error) {
        console.error("Failed to check MFA status:", error);
      } finally {
        setMfaLoading(false);
      }
    };

    loadProfile();
    checkMfaStatus();
  }, []);

  const getCurrentLocalTime = () => {
    if (!timezone) return "";
    const now = new Date();
    return formatDateInTimezone(now, timezone, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTimezoneDisplayName = () => {
    if (!timezone) return "";

    // Get timezone abbreviation (e.g., EST, PST)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });

    const parts = formatter.formatToParts(now);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "";

    return `${timezone} (${tzName})`;
  };

  const handleLocationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Save location to backend API
      await profileApi.updateProfile({
        location: locationForm,
        timezone: timezone,
      });

      setMessage({
        type: "success",
        text: "Location updated successfully!",
      });
    } catch (error) {
      console.error("Failed to update location:", error);
      setMessage({
        type: "error",
        text: "Failed to update location. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    if (newCurrency === currency) return;

    // Show confirmation dialog
    setPendingCurrency(newCurrency);
    setShowCurrencyConfirm(true);
  };

  const confirmCurrencyChange = async () => {
    setSaving(true);
    setMessage(null);
    setShowCurrencyConfirm(false);

    try {
      // Save currency to backend API
      await profileApi.updateProfile({ currency: pendingCurrency });

      setCurrency(pendingCurrency);
      setMessage({
        type: "success",
        text: `Currency updated to ${getCurrencyConfig(pendingCurrency).name}. New budgets and transactions will use this currency.`,
      });
    } catch (error) {
      console.error("Failed to update currency:", error);
      setMessage({
        type: "error",
        text: "Failed to update currency. Please try again.",
      });
    } finally {
      setSaving(false);
      setPendingCurrency("");
    }
  };

  const cancelCurrencyChange = () => {
    setShowCurrencyConfirm(false);
    setPendingCurrency("");
  };

  const handleBackupData = async () => {
    setBackupInProgress(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl =
        import.meta.env.VITE_API_URL ||
        "https://your-api-url.execute-api.us-east-1.amazonaws.com/v1";
      const response = await fetch(`${apiUrl}/export?type=json`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      // Download the backup file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budgetbuddy-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({
        type: "success",
        text: "Backup downloaded successfully! Keep this file safe.",
      });
    } catch (error) {
      console.error("Backup error:", error);
      setMessage({
        type: "error",
        text: "Failed to create backup. Please try again.",
      });
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestoreData = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreInProgress(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Read file content
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      const apiUrl =
        import.meta.env.VITE_API_URL ||
        "https://your-api-url.execute-api.us-east-1.amazonaws.com/v1";
      const response = await fetch(`${apiUrl}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(backupData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to restore data");
      }

      const result = await response.json();

      setMessage({
        type: "success",
        text: `Data restored successfully! Restored ${result.restored.budgets} budgets and ${result.restored.transactions} transactions.`,
      });

      // Reset file input
      event.target.value = "";
    } catch (error) {
      console.error("Restore error:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to restore data. Please check the backup file and try again.",
      });
      event.target.value = "";
    } finally {
      setRestoreInProgress(false);
    }
  };

  const handleDisable2FA = async () => {
    if (
      !confirm(
        "Are you sure you want to disable two-factor authentication? This will make your account less secure.",
      )
    ) {
      return;
    }

    setDisabling2FA(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl =
        "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";
      const response = await fetch(`${apiUrl}/auth/mfa/disable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to disable 2FA");
      }

      setMfaEnabled(false);
      setMessage({
        type: "success",
        text: "Two-factor authentication has been disabled.",
      });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to disable 2FA",
      });
    } finally {
      setDisabling2FA(false);
    }
  };

  const handle2FAComplete = () => {
    setMfaEnabled(true);
    setMessage({
      type: "success",
      text: "Two-factor authentication has been enabled successfully!",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/budget")}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Location & Timezone Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Location & Timezone
          </h2>

          {/* Current Timezone Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 text-2xl">🌍</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">
                  Current Timezone
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {getTimezoneDisplayName()}
                </div>
                <div className="text-sm text-gray-500">
                  Local Time: {getCurrentLocalTime()}
                </div>
              </div>
            </div>
          </div>

          {/* Location Form */}
          <form onSubmit={handleLocationUpdate} className="space-y-4">
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Country
              </label>
              <select
                id="country"
                value={locationForm.country}
                onChange={(e) =>
                  setLocationForm((prev) => ({
                    ...prev,
                    country: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                {/* Add more countries as needed */}
              </select>
            </div>

            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                City
              </label>
              <input
                id="city"
                type="text"
                value={locationForm.city}
                onChange={(e) =>
                  setLocationForm((prev) => ({ ...prev, city: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your city"
              />
            </div>

            <div>
              <label
                htmlFor="zipCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Zip / Postal Code
              </label>
              <input
                id="zipCode"
                type="text"
                value={locationForm.zipCode}
                onChange={(e) =>
                  setLocationForm((prev) => ({
                    ...prev,
                    zipCode: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your zip or postal code"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={
                  saving ||
                  !locationForm.country ||
                  !locationForm.city ||
                  !locationForm.zipCode
                }
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {saving ? "Updating..." : "Update Location"}
              </button>
            </div>
          </form>

          {/* Info Note */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> Your timezone is automatically detected
              from your location. Updating your location will adjust your
              timezone accordingly, ensuring all dates and times in the app are
              displayed correctly for your region.
            </p>
          </div>
        </div>

        {/* Currency Settings Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Currency Settings
          </h2>

          {/* Current Currency Display */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-green-600 text-2xl">💱</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">
                  Current Currency
                </div>
                <div className="text-sm text-gray-600">
                  {getCurrencyConfig(currency).symbol} {currency} -{" "}
                  {getCurrencyConfig(currency).name}
                </div>
              </div>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="mb-4">
            <CurrencySelector
              value={currency}
              onChange={handleCurrencyChange}
              disabled={saving}
              label="Change Currency"
              showFullName={true}
            />
          </div>

          {/* Warning Note */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Important</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Changing your currency will not convert existing budget
                  amounts or transactions. Only new budgets and transactions
                  will use the new currency. Existing data will remain in their
                  original currency.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Accounts Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🏦 Connected Bank Accounts
          </h2>
          <p className="text-gray-600 mb-4">
            Link your bank accounts to automatically import transactions and
            track your spending.
          </p>
          <button
            onClick={() => navigate("/accounts")}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors flex items-center space-x-2"
          >
            <span>Manage Bank Accounts</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Profile Section (Placeholder) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
          <p className="text-gray-600">Profile settings coming soon...</p>
        </div>

        {/* Account Section (Placeholder) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
          <p className="text-gray-600">Account settings coming soon...</p>
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🔐 Two-Factor Authentication
          </h2>

          {mfaLoading ? (
            <div className="flex items-center space-x-3 text-gray-500">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Checking 2FA status...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Indicator */}
              <div
                className={`p-4 rounded-lg ${mfaEnabled ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${mfaEnabled ? "bg-green-500" : "bg-gray-400"}`}
                    ></div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {mfaEnabled ? "2FA is enabled" : "2FA is not enabled"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {mfaEnabled
                          ? "Your account is protected with two-factor authentication"
                          : "Add an extra layer of security to your account"}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${mfaEnabled ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}
                  >
                    {mfaEnabled ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {mfaEnabled ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    You'll need to enter a code from your authenticator app each
                    time you sign in.
                  </p>
                  <button
                    onClick={handleDisable2FA}
                    disabled={disabling2FA}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {disabling2FA ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
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
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Disabling...</span>
                      </>
                    ) : (
                      <span>Disable Two-Factor Authentication</span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Recommended:</strong> Enable 2FA to protect your
                      financial data from unauthorized access.
                    </p>
                  </div>
                  <button
                    onClick={() => setShow2FASetup(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>Enable Two-Factor Authentication</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Appearance Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎨 Appearance
          </h2>
          <p className="text-gray-600 mb-4">
            Choose how BudgetBuddy looks to you. Select a theme or let it follow
            your system settings.
          </p>
          <ThemeToggle />
        </div>

        {/* Data Backup & Restore Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Data Backup & Restore
          </h2>

          <div className="space-y-6">
            {/* Backup Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Backup Your Data
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Download a complete backup of all your budgets, transactions,
                and settings in JSON format. Keep this file safe - you can use
                it to restore your data if needed.
              </p>
              <button
                onClick={handleBackupData}
                disabled={backupInProgress}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors flex items-center space-x-2"
              >
                {backupInProgress ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Creating Backup...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                      />
                    </svg>
                    <span>Download Backup</span>
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Restore Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Restore from Backup
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Upload a backup file to restore your data. This will add the
                budgets and transactions from the backup to your account.
                Existing data will not be deleted.
              </p>
              <div className="flex items-center space-x-3">
                <label
                  htmlFor="restore-file"
                  className={`px-4 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md font-medium transition-colors cursor-pointer flex items-center space-x-2 ${
                    restoreInProgress ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {restoreInProgress ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-blue-600"
                        xmlns="http://www.w3.org/2000/svg"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Restoring...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span>Choose Backup File</span>
                    </>
                  )}
                </label>
                <input
                  id="restore-file"
                  type="file"
                  accept=".json"
                  onChange={handleRestoreData}
                  disabled={restoreInProgress}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Only JSON backup files are supported
              </p>
            </div>

            {/* Warning Note */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg
                  className="w-5 h-5 text-yellow-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Important
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Always keep your backup files in a safe place. We recommend
                    storing them in multiple locations (cloud storage, external
                    drive, etc.) to prevent data loss.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <NotificationSettings userId={localStorage.getItem("userId") || ""} />
        </div>

        {/* Family Settings Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <FamilySettings />
        </div>

        {/* Troubleshooting Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Troubleshooting
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Authentication Issues
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                If you're experiencing "User profile not found" errors or login
                issues, use the token diagnostics tool to identify and fix
                authentication problems.
              </p>
              <button
                onClick={() => setShowTokenDiagnostics(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                Run Token Diagnostics
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            ⚠️ Danger Zone
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-red-700 mb-3">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteAccount(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Delete My Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Help & Tutorial Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📚 Help & Tutorial
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                App Tutorial
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Need a refresher on how to use BudgetBuddy? Replay the tutorial
                to learn about key features.
              </p>
              <button
                onClick={() => {
                  // Reset tutorial state and trigger tutorial
                  localStorage.removeItem("budgetbuddy_tutorial_completed");
                  localStorage.removeItem("budgetbuddy_onboarding_completed");
                  setMessage({
                    type: "success",
                    text: "Tutorial reset! Navigate to the Budget page to start the tutorial.",
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Replay Tutorial</span>
              </button>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Keyboard Shortcuts
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Use keyboard shortcuts to navigate faster. Press{" "}
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  /
                </kbd>{" "}
                to see all shortcuts.
              </p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                About BudgetBuddy
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                View app version, legal information, and contact support.
              </p>
              <button
                onClick={() => navigate("/about")}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
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
                <span>About</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Change Confirmation Dialog */}
      {showCurrencyConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Confirm Currency Change
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to change your currency from{" "}
              <strong>{getCurrencyConfig(currency).name}</strong> to{" "}
              <strong>{getCurrencyConfig(pendingCurrency).name}</strong>?
            </p>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Existing budgets and transactions will
                not be converted. They will remain in their original currency.
                Only new budgets and transactions will use{" "}
                {getCurrencyConfig(pendingCurrency).name}.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={cancelCurrencyChange}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmCurrencyChange}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Updating..." : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Diagnostics Modal */}
      {showTokenDiagnostics && (
        <TokenDiagnostics onClose={() => setShowTokenDiagnostics(false)} />
      )}

      {/* Two-Factor Authentication Setup Modal */}
      <TwoFactorSetup
        isOpen={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        onComplete={handle2FAComplete}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onDeleted={() => {
          // Redirect to login page after account deletion
          navigate("/login");
        }}
      />
    </div>
  );
};

export default SettingsPage;
