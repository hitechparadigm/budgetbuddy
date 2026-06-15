/**
 * Environment Configuration
 *
 * Centralized environment variables for the web application.
 * All API URLs and environment-specific settings should be accessed through this module.
 */

export const config = {
  /** Main API Gateway URL (auth, budget, transactions, family) */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1',

  /** Features API Gateway URL (learn, tips, comparison, plaid, debts) */
  featuresApiUrl: import.meta.env.VITE_FEATURES_API_URL || 'https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1',

  /**
   * Extended Features API Gateway URL — AI-powered features.
   * Hosts: /insights/*, /patterns/*, /budget-planning/*, /receipt/*
   */
  extendedFeaturesApiUrl: import.meta.env.VITE_EXTENDED_FEATURES_API_URL || 'https://hkjzroedjf.execute-api.us-east-1.amazonaws.com/v1',

  /** Family API Gateway URL (separate stack to avoid circular dependencies) */
  familyApiUrl: import.meta.env.VITE_FAMILY_API_URL || 'https://gp8jspfboa.execute-api.us-east-1.amazonaws.com/v1',

  /**
   * Budgets API Gateway URL — /budgets/* routes live on the dedicated budgets API gateway.
   * budgetService.ts uses this for all budget collaboration, member, and invitation calls.
   */
  budgetsApiUrl: import.meta.env.VITE_BUDGETS_API_URL || 'https://jcl39tq8x0.execute-api.us-east-1.amazonaws.com/v1',

  /** Google OAuth Web Client ID */
  googleClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '',

  /** Current environment */
  appEnv: import.meta.env.VITE_APP_ENV || 'development',

  /** Whether the app is running in production */
  isProduction: import.meta.env.VITE_APP_ENV === 'production',

  /** Whether the app is running in development */
  isDevelopment: import.meta.env.DEV,
} as const;
