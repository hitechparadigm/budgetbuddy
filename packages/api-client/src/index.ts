/**
 * BudgetBuddy API Client
 * Centralized API communication layer with authentication
 */

// Main API client
export * from './client';

// Service modules
// export * from './auth';
// export * from './budget';
export * from './transactions';
// export * from './family';

// Re-export the default client instance for convenience
export { default as apiClient } from './client';

// Create service instances
import { apiClient } from './client';
import TransactionService from './transactions';

export const transactionService = new TransactionService(apiClient);
