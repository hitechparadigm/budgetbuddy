/**
 * Development Helper Component
 *
 * Provides debugging tools and mock data controls for development
 */

import React, { useState } from "react";
import {
  initMockAuth,
  clearMockAuth,
  isMockAuthActive,
  getMockUser,
} from "../../utils/mockAuth";
import {
  enableMockData,
  disableMockData,
  shouldUseMockData,
} from "../../utils/devApiConfig";
import { authApi } from "../../services/api";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeToggle from "../layout/ThemeToggle";
import { devToolController } from "@/security/DevToolController";

export const DevHelper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mockAuthActive, setMockAuthActive] = useState(isMockAuthActive());
  const [mockDataActive, setMockDataActive] = useState(shouldUseMockData());
  const { theme } = useTheme();

  // Security check: Only show in development and when dev tools are allowed
  if (!devToolController.shouldShowDevTools() || !import.meta.env.DEV) {
    return null;
  }

  // Get dev tools configuration
  const devConfig = devToolController.getDevToolsConfig();

  // Validate dev tool safety
  const validation = devToolController.validateDevToolSafety();

  // Show security warnings if any
  if (validation.warnings.length > 0 && devConfig.showSecurityWarnings) {
    console.warn("[DEV_HELPER_SECURITY]", validation.warnings);
  }

  const handleToggleMockAuth = () => {
    // Check if mock auth is allowed
    if (!devConfig.allowMockAuth) {
      console.warn("Mock authentication not allowed in current environment");
      return;
    }

    if (mockAuthActive) {
      clearMockAuth();
      setMockAuthActive(false);
    } else {
      initMockAuth();
      setMockAuthActive(true);
    }
  };

  const handleToggleMockData = () => {
    // Check if mock data is allowed
    if (!devConfig.allowMockData) {
      console.warn("Mock data not allowed in current environment");
      return;
    }

    if (mockDataActive) {
      disableMockData();
      setMockDataActive(false);
    } else {
      enableMockData();
      setMockDataActive(true);
    }
  };

  const mockUser = getMockUser();

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors"
        title="Development Helper"
      >
        🔧
      </button>

      {/* Dev Panel */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 bg-gray-900 text-white p-4 rounded-lg shadow-xl w-80 border border-gray-700">
          <h3 className="text-lg font-bold mb-4 text-purple-400">
            🔧 Dev Helper
          </h3>

          {/* Security Warnings */}
          {validation.warnings.length > 0 && devConfig.showSecurityWarnings && (
            <div className="mb-4 p-2 bg-yellow-900 border border-yellow-600 rounded">
              <h4 className="font-semibold text-yellow-400 mb-1">
                ⚠️ Security Warnings
              </h4>
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-xs text-yellow-300">
                  {warning}
                </div>
              ))}
            </div>
          )}

          {/* Environment Info */}
          <div className="mb-4 p-2 bg-blue-900 border border-blue-600 rounded">
            <h4 className="font-semibold text-blue-400 mb-1">🌍 Environment</h4>
            <div className="text-xs text-blue-300">
              <div>
                Mode: {devToolController.getEnvironmentInfo().environment}
              </div>
              <div>Host: {devToolController.getEnvironmentInfo().hostname}</div>
            </div>
          </div>

          {/* Authentication Status */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Authentication</h4>
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span>Mock Auth:</span>
                <button
                  onClick={handleToggleMockAuth}
                  className={`px-2 py-1 rounded text-xs ${
                    mockAuthActive
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {mockAuthActive ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>Real Auth:</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    authApi.isAuthenticated() && !mockAuthActive
                      ? "bg-green-600"
                      : "bg-gray-600"
                  }`}
                >
                  {authApi.isAuthenticated() && !mockAuthActive ? "ON" : "OFF"}
                </span>
              </div>

              {mockUser && (
                <div className="text-xs text-gray-300 mt-2">
                  <div>
                    User: {mockUser.firstName} {mockUser.lastName}
                  </div>
                  <div>Email: {mockUser.email}</div>
                  <div>Family: {mockUser.familyId}</div>
                </div>
              )}
            </div>
          </div>

          {/* Theme Mode */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Theme</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm">Current Theme:</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-300">{theme}</span>
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* API Data Mode */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">API Data</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm">Mock Data:</span>
              <button
                onClick={handleToggleMockData}
                className={`px-2 py-1 rounded text-xs ${
                  mockDataActive
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {mockDataActive ? "ON" : "OFF"}
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {mockDataActive
                ? "Using mock data for API calls"
                : "Using real API endpoints"}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                Reload Page
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Clear All Data
              </button>
            </div>
          </div>

          {/* API Status */}
          <div className="text-xs text-gray-400">
            <div>Environment: {import.meta.env.MODE}</div>
            <div>API Base: {import.meta.env.VITE_API_BASE || "Default"}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevHelper;
