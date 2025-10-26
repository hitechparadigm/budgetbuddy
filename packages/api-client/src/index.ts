/**
 * BudgetBuddy API Client
 * Centralized API communication layer with authentication
 */

// Main API client
export * from './client';

// Service modules (to be implemented)
// export * from './auth';
// export * from './budget';
// export * from './transactions';
// export * from './family';

// Re-export the default client instance for convenience
export { default as apiClient } from './client';
