/**
 * Development Helper Component
 *
 * Provides debugging tools and mock data controls for development
 */

import React, { useState } from 'react';
import { initMockAuth, clearMockAuth, isMockAuthActive, getMockUser } from '../../utils/mockAuth';
import { enableMockData, disableMockData, shouldUseMockData } from '../../utils/devApiConfig';
import { authApi } from '../../services/api';

export const DevHelper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mockAuthActive, setMockAuthActive] = useState(isMockAuthActive());
  const [mockDataActive, setMockDataActive] = useState(shouldUseMockData());

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const handleToggleMockAuth = () => {
    if (mockAuthActive) {
      clearMockAuth();
      setMockAuthActive(false);
    } else {
      initMockAuth();
      setMockAuthActive(true);
    }
  };

  const handleToggleMockData = () => {
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
          <h3 className="text-lg font-bold mb-4 text-purple-400">🔧 Dev Helper</h3>

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
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {mockAuthActive ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>Real Auth:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  authApi.isAuthenticated() && !mockAuthActive
                    ? 'bg-green-600'
                    : 'bg-gray-600'
                }`}>
                  {authApi.isAuthenticated() && !mockAuthActive ? 'ON' : 'OFF'}
                </span>
              </div>

              {mockUser && (
                <div className="text-xs text-gray-300 mt-2">
                  <div>User: {mockUser.firstName} {mockUser.lastName}</div>
                  <div>Email: {mockUser.email}</div>
                  <div>Family: {mockUser.familyId}</div>
                </div>
              )}
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
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {mockDataActive ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {mockDataActive
                ? 'Using mock data for API calls'
                : 'Using real API endpoints'
              }
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
            <div>API Base: {import.meta.env.VITE_API_BASE || 'Default'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevHelper;
