/**
 * Simple Security Utilities
 *
 * Essential security functions without over-engineering
 */

/**
 * Environment Detection
 */
export const isDevelopment = (): boolean => {
  // Node.js environment
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Browser environment
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('dev');
  }

  return false;
};

export const isProduction = (): boolean => {
  // Node.js environment
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  // Browser environment
  if (typeof window !== 'undefined') {
    return window.location.protocol === 'https:' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('dev');
  }

  return false;
};

export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

/**
 * Development Tools Control
 */
export const shouldShowDevTools = (): boolean => {
  return isDevelopment();
};

/**
 * Mock Authentication Safety
 */
export const canUseMockAuth = (): boolean => {
  if (isProduction()) {
    console.error('[SECURITY] Mock authentication cannot be used in production');
    return false;
  }

  return isDevelopment() || isTest();
};

/**
 * Simple Security Logging
 */
export const logSecurityEvent = (message: string, level: 'info' | 'warn' | 'error' = 'info'): void => {
  if (isDevelopment() || isTest()) {
    console[level](`[SECURITY] ${message}`);
  }
};

/**
 * Environment Info (for debugging)
 */
export const getEnvironmentInfo = () => {
  return {
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: isTest(),
    nodeEnv: process.env.NODE_ENV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown'
  };
};
