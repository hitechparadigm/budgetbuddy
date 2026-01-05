/**
 * Mock Authentication Guard
 *
 * Safely isolates mock authentication from production environments
 * Provides security controls and validation for mock authentication usage
 */

import { securityConfig } from './SecurityConfigManager';

export interface MockAuthGuard {
  canInitializeMockAuth(): boolean;
  validateMockAuthSafety(): ValidationResult;
  disableMockAuthInProduction(): void;
  logSecurityViolation(violation: SecurityViolation): void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecurityViolation {
  type: 'MOCK_AUTH_IN_PROD' | 'UNAUTHORIZED_MOCK_INIT' | 'SECURITY_BYPASS_ATTEMPT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  timestamp: Date;
  environment: string;
}

export class MockAuthGuardImpl implements MockAuthGuard {
  private static instance: MockAuthGuardImpl;
  private mockAuthBlocked: boolean = false;

  private constructor() {
    // Initialize based on environment
    if (securityConfig.isProduction()) {
      this.mockAuthBlocked = true;
      this.logSecurityEvent({
        type: 'SECURITY_INITIALIZATION',
        message: 'Mock auth guard initialized in production mode - mock auth blocked',
        severity: 'INFO'
      });
    }
  }

  public static getInstance(): MockAuthGuardImpl {
    if (!MockAuthGuardImpl.instance) {
      MockAuthGuardImpl.instance = new MockAuthGuardImpl();
    }
    return MockAuthGuardImpl.instance;
  }

  canInitializeMockAuth(): boolean {
    // Check if mock auth is allowed in current environment
    if (!securityConfig.getAllowedMockAuth()) {
      this.logSecurityViolation({
        type: 'MOCK_AUTH_IN_PROD',
        severity: 'CRITICAL',
        description: 'Attempt to initialize mock authentication in production environment',
        timestamp: new Date(),
        environment: securityConfig.getEnvironment()
      });
      return false;
    }

    // Check if mock auth has been explicitly blocked
    if (this.mockAuthBlocked) {
      this.logSecurityViolation({
        type: 'UNAUTHORIZED_MOCK_INIT',
        severity: 'HIGH',
        description: 'Mock authentication has been explicitly disabled',
        timestamp: new Date(),
        environment: securityConfig.getEnvironment()
      });
      return false;
    }

    // Additional safety checks
    if (this.isProductionLikeEnvironment()) {
      this.logSecurityViolation({
        type: 'SECURITY_BYPASS_ATTEMPT',
        severity: 'HIGH',
        description: 'Mock auth attempted in production-like environment',
        timestamp: new Date(),
        environment: securityConfig.getEnvironment()
      });
      return false;
    }

    return true;
  }

  validateMockAuthSafety(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check environment safety
    if (securityConfig.isProduction()) {
      errors.push('Mock authentication cannot be used in production environment');
    }

    // Check for production-like indicators
    if (this.isProductionLikeEnvironment()) {
      warnings.push('Environment appears production-like, mock auth may be unsafe');
    }

    // Check for HTTPS in non-development environments
    if (typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      !securityConfig.isDevelopment()) {
      warnings.push('HTTPS detected in non-development environment');
    }

    // Check for production domain patterns
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('prod') ||
        hostname.includes('live') ||
        (!hostname.includes('localhost') && !hostname.includes('dev'))) {
        warnings.push('Domain appears to be production-like');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  disableMockAuthInProduction(): void {
    if (securityConfig.isProduction()) {
      this.mockAuthBlocked = true;

      // Clear any existing mock auth tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('budgetbuddy_mock_user');
        // Clear any auth tokens that might be mock tokens
        const authKeys = ['auth_token', 'access_token', 'jwt_token'];
        authKeys.forEach(key => {
          const token = localStorage.getItem(key);
          if (token && this.isMockToken(token)) {
            localStorage.removeItem(key);
          }
        });
      }

      this.logSecurityEvent({
        type: 'SECURITY_ACTION',
        message: 'Mock authentication disabled in production environment',
        severity: 'INFO'
      });
    }
  }

  logSecurityViolation(violation: SecurityViolation): void {
    // Log to security system
    securityConfig.logSecurityEvent({
      type: violation.type,
      message: violation.description,
      location: violation.environment
    });

    // In production, also log to console for immediate visibility
    if (securityConfig.isProduction()) {
      console.error('[SECURITY VIOLATION]', {
        type: violation.type,
        severity: violation.severity,
        description: violation.description,
        timestamp: violation.timestamp,
        environment: violation.environment
      });
    }

    // In development, provide helpful guidance
    if (securityConfig.isDevelopment()) {
      console.warn('[MOCK AUTH GUARD]', violation.description);
    }
  }

  private isProductionLikeEnvironment(): boolean {
    // Check various indicators that suggest production environment
    const env = process.env.NODE_ENV?.toLowerCase();
    const stage = process.env.STAGE?.toLowerCase();

    if (env === 'production' || stage === 'prod' || stage === 'production') {
      return true;
    }

    // Check browser environment indicators
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;

      // Production-like domain patterns
      if (hostname.includes('prod') ||
        hostname.includes('live') ||
        hostname.includes('app.') ||
        (protocol === 'https:' && !hostname.includes('localhost') && !hostname.includes('dev'))) {
        return true;
      }
    }

    return false;
  }

  private isMockToken(token: string): boolean {
    // Check if token contains mock indicators
    return token.includes('MOCK') ||
      token.includes('TEST') ||
      token.includes('DEVELOPMENT') ||
      token.includes('MOCK_SIGNATURE_FOR_DEVELOPMENT_ONLY');
  }

  private logSecurityEvent(event: { type: string; message: string; severity: string }): void {
    if (securityConfig.getSecurityLevel().enableAuditLogging) {
      console.log('[SECURITY]', {
        timestamp: new Date().toISOString(),
        ...event
      });
    }
  }
}

// Export singleton instance
export const mockAuthGuard = MockAuthGuardImpl.getInstance();
