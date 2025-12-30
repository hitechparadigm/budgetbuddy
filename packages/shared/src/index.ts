/**
 * BudgetBuddy Shared Components and Utilities
 * This package contains shared types, components, and utilities used across all BudgetBuddy applications
 */

// Export all types and interfaces
export * from './types';

// Export validation schemas and utilities
export * from './validation';

// Export utility functions
export * from './utils';

// Export category system
export * from './data/categoryDefinitions';
export * from './data/cityExpenseData';

// Export services
export * from './services/geolocationService';
export * from './services/categorySuggestionService';
export * from './services/categoryManagementService';

// Package version
export const SHARED_VERSION = '1.0.0';
