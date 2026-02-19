/**
 * Login Page Object Model
 *
 * Provides methods for interacting with the login page:
 * - Navigate to login page
 * - Fill login form
 * - Submit login
 * - Handle errors
 *
 * Uses data-testid selectors for stability.
 */

class LoginPage {
  constructor(page) {
    this.page = page;

    // Selectors using data-testid
    this.selectors = {
      emailInput: '[data-testid="login-email-input"]',
      passwordInput: '[data-testid="login-password-input"]',
      submitButton: '[data-testid="login-submit-button"]',
      errorMessage: '[data-testid="login-error-message"]',
      forgotPasswordLink: '[data-testid="login-forgot-password-link"]',
      registerLink: '[data-testid="login-register-link"]',
    };
  }

  /**
   * Navigate to login page
   * @param {string} baseUrl - Base URL of the application
   * @returns {Promise<void>}
   */
  async navigate(baseUrl) {
    await this.page.goto(`${baseUrl}/login`);
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
   * Click submit button
   * @returns {Promise<void>}
   */
  async clickSubmit() {
    await this.page.click(this.selectors.submitButton);
  }

  /**
   * Login with credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<void>}
   */
  async login(email, password) {
    await this.fillEmail(email);
    await this.fillPassword(password);
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
   * Click forgot password link
   * @returns {Promise<void>}
   */
  async clickForgotPassword() {
    await this.page.click(this.selectors.forgotPasswordLink);
  }

  /**
   * Click register link
   * @returns {Promise<void>}
   */
  async clickRegister() {
    await this.page.click(this.selectors.registerLink);
  }

  /**
   * Wait for navigation after successful login
   * @param {string} expectedUrl - Expected URL after login (e.g., '/dashboard')
   * @returns {Promise<void>}
   */
  async waitForSuccessfulLogin(expectedUrl) {
    await this.page.waitForURL(`**${expectedUrl}`, { timeout: 10000 });
  }
}

module.exports = { LoginPage };
