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

interface LocationForm {
  country: string;
  city: string;
  zipCode: string;
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState<string>("");
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

  useEffect(() => {
    // Detect and set current timezone
    const detectedTimezone = detectUserTimezone();
    setTimezone(detectedTimezone);

    // TODO: Load user profile from API to get saved location
    // For now, just use detected timezone
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
      // TODO: Implement timezone lookup from location
      // For now, just show success message

      // TODO: Save to backend API
      // await updateUserProfile({ location: locationForm, timezone: newTimezone });

      setMessage({
        type: "success",
        text: "Location updated successfully! Timezone will be updated once backend integration is complete.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to update location. Please try again.",
      });
    } finally {
      setSaving(false);
    }
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

        {/* Troubleshooting Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
      </div>

      {/* Token Diagnostics Modal */}
      {showTokenDiagnostics && (
        <TokenDiagnostics onClose={() => setShowTokenDiagnostics(false)} />
      )}
    </div>
  );
};

export default SettingsPage;
