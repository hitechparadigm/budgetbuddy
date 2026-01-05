/**
 * Development Tool Controller
 *
 * Controls visibility and functionality of development tools
 * Ensures complete isolation from production environments
 */

import { securityConfig } from './SecurityConfigManager';

export interface DevToolController {
  shouldShowDevTools(): boolean;
  getDevToolsConfig(): DevToolsConfig;
  sanitizeForProduction(): void;
  validateDevToolSafety(): ValidationResult;
}

export interface DevToolsConfig {
  enabled: boolean;
  allowMockAuth: boolean;
  allowMockData: boolean;
  showSecurityWarnings: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export class DevToolControllerImpl implements DevToolController {
  private static instance: DevToolControllerImpl;
  private devToolsDisabled: boolean = false;

  private constructor() {
    // Automatically disable dev tools in production
    if (securityConfig.isProduction()) {
      this.devToolsDisabled = true;
      this.logSecurityEvent('Development tools automatically disabled in production');
    }
  }

  public static getInstance(): DevToolControllerImpl {
    if (!DevToolControllerImpl.instance) {
      DevToolControllerImpl.instance = new DevToolControllerImpl();
    }
    return DevToolControllerImpl.instance;
  }

  shouldShowDevTools(): boolean {
    // Never show dev tools in production
    if (securityConfig.isProduction()) {
      return false;
    }

    // Check if explicitly disabled
    if (this.devToolsDisabled) {
      return false;
    }

    // Check environment variables
    if (process.env.DISABLE_DEV_TOOLS === 'true') {
      return false;
    }

    // Check browser environment for production indicators
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;

      // Don't show on production-like domains
      if (this.isProductionLikeDomain(hostname)) {
        this.logSecurityEvent(`Dev tools hidden on production-like domain: ${hostname}`);
        return false;
      }

      // Don't show on HTTPS unless it's localhost
      if (protocol === 'https:' && !hostname.includes('localhost')) {
        this.logSecurityEvent(`Dev tools hidden on HTTPS non-localhost: ${hostname}`);
        return false;
      }
    }

    // Only show in development environments
    return securityConfig.isDevelopment();
  }

  getDevToolsConfig(): DevToolsConfig {
    const baseConfig: DevToolsConfig = {
      enabled: this.shouldShowDevTools(),
      allowMockAuth: false,
      allowMockData: false,
      showSecurityWarnings: true,
      logLevel: 'warn'
    };

    // Configure based on environment
    if (securityConfig.isDevelopment()) {
      return {
        ...baseConfig,
        allowMockAuth: true,
        allowMockData: true,
        logLevel: 'debug'
      };
    }

    if (securityConfig.getEnvironment() === 'testing') {
      return {
        ...baseConfig,
        allowMockAuth: true,
        allowMockData: true,
        logLevel: 'info'
      };
    }

    // Production or unknown environment - most restrictive
    return {
      ...baseConfig,
      enabled: false,
      showSecurityWarnings: true,
      logLevel: 'error'
    };
  }

  sanitizeForProduction(): void {
    // Disable all development tools
    this.devToolsDisabled = true;

    // Clear any development-related localStorage items
    if (typeof window !== 'undefined') {
      const devKeys = [
        'budgetbuddy_mock_user',
        'dev_mode_enabled',
        'debug_enabled',
        'mock_data_enabled'
      ];

      devKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    }

    // Log sanitization
    this.logSecurityEvent('Development tools sanitized for production');
  }

  validateDevToolSafety(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check if dev tools are enabled in production
    if (securityConfig.isProduction() && this.shouldShowDevTools()) {
      errors.push('Development tools are enabled in production environment');
    }

    // Check for production-like environment indicators
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;

      if (this.isProductionLikeDomain(hostname) && this.shouldShowDevTools()) {
        warnings.push(`Development tools enabled on production-like domain: ${hostname}`);
      }

      if (protocol === 'https:' && !hostname.includes('localhost') && this.shouldShowDevTools()) {
        warnings.push('Development tools enabled on HTTPS non-localhost environment');
      }
    }

    // Check environment variables
    if (process.env.NODE_ENV === 'production' && this.shouldShowDevTools()) {
      errors.push('Development tools enabled with NODE_ENV=production');
    }

    // Provide recommendations
    if (securityConfig.isDevelopment()) {
      recommendations.push('Consider disabling dev tools before deploying to staging');
    }

    if (warnings.length > 0) {
      recommendations.push('Review environment configuration to ensure proper dev tool isolation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Check if a hostname appears to be production-like
   */
  private isProductionLikeDomain(hostname: string): boolean {
    const productionPatterns = [
      'prod',
      'live',
      'app.',
      'api.',
      'www.',
    ];

    const developmentPatterns = [
      'localhost',
      '127.0.0.1',
      'dev',
      'test',
      'staging'
    ];

    // If it matches development patterns, it's not production-like
    if (developmentPatterns.some(pattern => hostname.includes(pattern))) {
      return false;
    }

    // If it matches production patterns, it's production-like
    return productionPatterns.some(pattern => hostname.includes(pattern));
  }

  /**
   * Log security-related events
   */
  private logSecurityEvent(message: string): void {
    if (securityConfig.getSecurityLevel().enableAuditLogging) {
      console.log('[DEV_TOOL_SECURITY]', {
        timestamp: new Date().toISOString(),
        message,
        environment: securityConfig.getEnvironment()
      });
    }
  }

  /**
   * Get current environment information for debugging
   */
  getEnvironmentInfo(): Record<string, any> {
    return {
      environment: securityConfig.getEnvironment(),
      isProduction: securityConfig.isProduction(),
      isDevelopment: securityConfig.isDevelopment(),
      shouldShowDevTools: this.shouldShowDevTools(),
      devToolsDisabled: this.devToolsDisabled,
      securityLevel: securityConfig.getSecurityLevel(),
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A'
    };
  }
}

// Export singleton instance
export const devToolController = DevToolControllerImpl.getInstance();
