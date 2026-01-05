/**
 * Token Utilities for BudgetBuddy Web App
 * Provides utilities for token validation and error recovery
 */

/**
 * Validate if a JWT token has the expected structure and required fields
 */
export const validateToken = (token: string): { isValid: boolean; error?: string } => {
  try {
    if (!token) {
      return { isValid: false, error: 'Token is empty' };
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return { isValid: false, error: 'Invalid JWT format - token must have 3 parts' };
    }

    // Try to parse the payload
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

    // Check for required fields
    const userId = payload['custom:userId'] || payload.sub;
    if (!userId) {
      return { isValid: false, error: 'Token missing user ID (custom:userId or sub)' };
    }

    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { isValid: false, error: 'Token has expired' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: `Token parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

/**
 * Clear all authentication tokens from localStorage
 */
export const clearAllTokens = (): void => {
  localStorage.removeItem('budgetbuddy_access_token');
  localStorage.removeItem('budgetbuddy_refresh_token');
  localStorage.removeItem('budgetbuddy_id_token');
  localStorage.removeItem('budgetbuddy_expires_at');
  console.log('All authentication tokens cleared');
};

/**
 * Check if user has corrupted tokens and provide recovery guidance
 */
export const checkTokenHealth = (): {
  hasTokens: boolean;
  tokensValid: boolean;
  issues: string[];
  recommendedAction: string;
} => {
  const issues: string[] = [];
  let recommendedAction = 'No action needed';

  // Check if tokens exist
  const accessToken = localStorage.getItem('budgetbuddy_access_token');
  const refreshToken = localStorage.getItem('budgetbuddy_refresh_token');
  const idToken = localStorage.getItem('budgetbuddy_id_token');
  const expiresAt = localStorage.getItem('budgetbuddy_expires_at');

  const hasTokens = !!(accessToken || refreshToken || idToken);

  if (!hasTokens) {
    return {
      hasTokens: false,
      tokensValid: false,
      issues: ['No authentication tokens found'],
      recommendedAction: 'Please log in'
    };
  }

  // Validate ID token if it exists
  let tokensValid = true;
  if (idToken) {
    const validation = validateToken(idToken);
    if (!validation.isValid) {
      issues.push(`ID Token: ${validation.error}`);
      tokensValid = false;
    }
  } else {
    issues.push('ID token is missing');
    tokensValid = false;
  }

  // Check expiration
  if (expiresAt) {
    const expirationTime = parseInt(expiresAt);
    if (Date.now() >= expirationTime) {
      issues.push('Tokens have expired');
      tokensValid = false;
    }
  } else {
    issues.push('Token expiration time is missing');
    tokensValid = false;
  }

  // Determine recommended action
  if (!tokensValid) {
    if (issues.some(issue => issue.includes('expired'))) {
      recommendedAction = 'Tokens expired - please log in again';
    } else if (issues.some(issue => issue.includes('missing user ID'))) {
      recommendedAction = 'Invalid token format - please clear tokens and log in again';
    } else {
      recommendedAction = 'Token validation failed - please log out and log in again';
    }
  }

  return {
    hasTokens,
    tokensValid,
    issues,
    recommendedAction
  };
};
