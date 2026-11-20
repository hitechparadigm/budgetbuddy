/**
 * API Gateway configuration
 *
 * The backend is four separate API Gateways, not one. A call sent to the wrong
 * gateway gets `403 Missing Authentication Token` (API Gateway's response for
 * an unknown route), which looks like an auth failure and is not.
 *
 * Route ownership, from the CDK `root.addResource` calls:
 *
 *   main      (q0zoob6728)  /auth /users /budget /transactions /export /restore
 *                           /payments /webhooks /bills /goals /accounts /email
 *                           /ai /notifications          — api-stack.ts
 *   features  (0poeu07vth)  /investments /plaid /reconcile /admin /comparison
 *                           /tips /learn /subscriptions /debts /credit-score
 *                                                       — api-features-stack.ts
 *   extended  (hkjzroedjf)  /insights /receipt /patterns /budget-planning
 *                           /transaction-planning /rules /net-worth
 *                                              — api-features-extended-stack.ts
 *   budgets   (jcl39tq8x0)  /budgets             — api-budgets-stack.ts
 *
 * Mirrors packages/web-app/src/config/environment.ts. The defaults are the
 * real DEV gateways so the app works without a .env file.
 */

/** Main gateway: auth, budget, transactions, accounts, goals, bills, ai. */
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

/** Features gateway: investments, plaid, tips, learn, subscriptions, debts, credit-score. */
export const featuresApiUrl =
  process.env.EXPO_PUBLIC_FEATURES_API_URL ||
  'https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1';

/** Extended features gateway: insights, receipt, patterns, transaction-planning, rules, net-worth. */
export const extendedFeaturesApiUrl =
  process.env.EXPO_PUBLIC_EXTENDED_FEATURES_API_URL ||
  'https://hkjzroedjf.execute-api.us-east-1.amazonaws.com/v1';

/** Budgets gateway: budget collaboration, members, invitations. */
export const budgetsApiUrl =
  process.env.EXPO_PUBLIC_BUDGETS_API_URL ||
  'https://jcl39tq8x0.execute-api.us-east-1.amazonaws.com/v1';

export const apiConfig = {
  apiBaseUrl,
  featuresApiUrl,
  extendedFeaturesApiUrl,
  budgetsApiUrl,
} as const;
