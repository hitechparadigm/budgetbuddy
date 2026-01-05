/**
 * Security Configuration Manager
 *
 * Centralized security configuration and environment detection system
 * Provides security configuration based on deployment environment
 */

export interface SecurityConfig {
  isProduction(): boolean;
  isDevelopment(): boolean;
  getAllowedMockAuth(): boolean;
  getSecurityLevel(): SecurityLevel;
  validateEnvironment(): SecurityValidationResult;
}

export interface SecurityLevel {
  name: 'strict' | 'development' | 'testing';
  enforceHTTPS: boolean;
  requireTokenValidation: boolean;
  enableAuditLogging: boolean;
  blockInsecureOperations: boolean;
}

export interface SecurityValidationResult {
  isValid: boolean;
  violations: SecurityViolation[];
  warnings: SecurityWarning[];
  recommendations: SecurityRecommendation[];
  timestamp: Date;
}

export interface SecurityViolation {
  type: 'EXPOSED_CREDENTIAL' | 'MOCK_AUTH_IN_PROD' | 'DEV_TOOL_IN_PROD' | 'DEPENDENCY_VULN';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  location?: string;
  remediation: string;
}

export interface SecurityWarning {
  type: string;
  message: string;
  location?: string;
}

export interface SecurityRecommendation {
  category: string;
  suggestion: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class SecurityConfigManager implements SecurityConfig {
  private environment: string;
  private securityLevel: SecurityLevel;

  constructor() {
    this.environment = this.detectEnvironment();
    this.securityLevel = this.determineSecurityLevel();
  }

  private detectEnvironment(): string {
    // Check various environment indicators
    if (typeof window !== 'undefined') {
      // Browser environment
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'development';
      }
      if (window.location.hostname.includes('staging')) {
        return 'staging';
      }
      if (window.location.protocol === 'https:' && !window.location.hostname.includes('dev')) {
        return 'production';
      }
    }

    // Node.js environment
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const stage = process.env.STAGE?.toLowerCase();

    if (nodeEnv === 'production' || stage === 'prod' || stage === 'production') {
      return 'production';
    }

    if (nodeEnv === 'test' || stage === 'test') {
      return 'testing';
    }

    if (stage === 'staging') {
      return 'staging';
    }

    // Default to development for safety
    return 'development';
  }

  private determineSecurityLevel(): SecurityLevel {
    switch (this.environment) {
      case 'production':
        return {
          name: 'strict',
          enforceHTTPS: true,
          requireTokenValidation: true,
          enableAuditLogging: true,
          blockInsecureOperations: true
        };

      case 'staging':
        return {
          name: 'strict',
          enforceHTTPS: true,
          requireTokenValidation: true,
          enableAuditLogging: true,
          blockInsecureOperations: false // Allow some flexibility for testing
        };

      case 'testing':
        return {
          name: 'testing',
          enforceHTTPS: false,
          requireTokenValidation: false,
          enableAuditLogging: true,
          blockInsecureOperations: false
        };

      default: // development
        return {
          name: 'development',
          enforceHTTPS: false,
          requireTokenValidation: false,
          enableAuditLogging: false,
          blockInsecureOperations: false
        };
    }
  }

  isProduction(): boolean {
    return this.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  getAllowedMockAuth(): boolean {
    // Mock auth is only allowed in development and testing environments
    return this.environment === 'development' || this.environment === 'testing';
  }

  getSecurityLevel(): SecurityLevel {
    return this.securityLevel;
  }

  validateEnvironment(): SecurityValidationResult {
    const violations: SecurityViolation[] = [];
    const warnings: SecurityWarning[] = [];
    const recommendations: SecurityRecommendation[] = [];

    // Check for production security requirements
    if (this.isProduction()) {
      // Validate HTTPS enforcement
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
        violations.push({
          type: 'MOCK_AUTH_IN_PROD',
          severity: 'CRITICAL',
          description: 'Production environment must use HTTPS',
          location: 'Protocol detection',
          remediation: 'Ensure all production traffic uses HTTPS protocol'
        });
      }

      // Check for development tools in production
      if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        warnings.push({
          type: 'DEV_TOOLS_DETECTED',
          message: 'React DevTools detected in production environment',
          location: 'Browser environment'
        });
      }
    }

    // Environment-specific recommendations
    if (this.isDevelopment()) {
      recommendations.push({
        category: 'Security',
        suggestion: 'Enable security logging for better debugging',
        priority: 'MEDIUM'
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Get current environment name
   */
  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Check if current environment allows insecure operations
   */
  allowsInsecureOperations(): boolean {
    return !this.securityLevel.blockInsecureOperations;
  }

  /**
   * Log security event if audit logging is enabled
   */
  logSecurityEvent(event: SecurityViolation | SecurityWarning): void {
    if (this.securityLevel.enableAuditLogging) {
      console.warn('[SECURITY]', {
        timestamp: new Date().toISOString(),
        environment: this.environment,
        event
      });
    }
  }
}

// Singleton instance for global access
export const securityConfig = new SecurityConfigManager();
