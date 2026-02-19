/**
 * Registration Page Object Model
 *
 * Provides methods for interacting with the registration page:
 * - Navigate to registration page
 * - Fill registration form
 * - Submit registration
 * - Handle validation errors
 *
 * Uses data-testid selectors for stability.
 */

class RegistrationPage {
  constructor(page) {
    this.page = page;

    // Selectors using data-testid
    this.selectors = {
      emailInput: '[data-testid="register-email-input"]',
      passwordInput: '[data-testid="register-password-input"]',
      confirmPasswordInput: '[data-testid="register-confirm-password-input"]',
      submitButton: '[data-testid="register-submit-button"]',
      errorMessage: '[data-testid="register-error-message"]',
      loginLink: '[data-testid="register-login-link"]',
      termsCheckbox: '[data-testid="register-terms-checkbox"]',
    };
  }

  /**
   * Navigate to registration page
   * @param {string} baseUrl - Base URL of the application
   * @returns {Promise<void>}
   */
  async navigate(baseUrl) {
    await this.page.goto(`${baseUrl}/register`);
    await this.page.waitForSelector(this.selectors.emailInput);
  }

  /**
   * Fill email input
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async fillEmail(email) {
    await this.page.fill(this.selectors.emailInput, email);
  }

  /**
   * Fill password input
   * @param {string} password - User password
   * @returns {Promise<void>}
   */
  async fillPassword(password) {
    await this.page.fill(this.selectors.passwordInput, password);
  }

  /**
   * Fill confirm password input
   * @param {string} password - Confirm password
   * @returns {Promise<void>}
   */
  async fillConfirmPassword(password) {
    await this.page.fill(this.selectors.confirmPasswordInput, password);
  }

  /**
   * Check terms and conditions checkbox
   * @returns {Promise<void>}
   */
  async acceptTerms() {
    await this.page.check(this.selectors.termsCheckbox);
  }

  /**
   * Click submit button
   * @returns {Promise<void>}
   */
  async clickSubmit() {
    await this.page.click(this.selectors.submitButton);
  }

  /**
   * Register with credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} acceptTerms - Accept terms and conditions (default true)
   * @returns {Promise<void>}
   */
  async register(email, password, acceptTerms = true) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    if (acceptTerms) {
      await this.acceptTerms();
    }
    await this.clickSubmit();
  }

  /**
   * Get error message text
   * @returns {Promise<string|null>} Error message or null if not present
   */
  async getErrorMessage() {
    try {
      const errorElement = await this.page.waitForSelector(
        this.selectors.errorMessage,
        { timeout: 3000 },
      );
      return await errorElement.textContent();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if error message is displayed
   * @returns {Promise<boolean>}
   */
  async hasError() {
    return await this.page.isVisible(this.selectors.errorMessage);
  }

  /**
   * Click login link
   * @returns {Promise<void>}
   */
  async clickLogin() {
    await this.page.click(this.selectors.loginLink);
  }

  /**
   * Wait for navigation after successful registration
   * @param {string} expectedUrl - Expected URL after registration (e.g., '/onboarding')
   * @returns {Promise<void>}
   */
  async waitForSuccessfulRegistration(expectedUrl) {
    await this.page.waitForURL(`**${expectedUrl}`, { timeout: 10000 });
  }
}

module.exports = { RegistrationPage };
