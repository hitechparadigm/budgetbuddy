/**
 * Onboarding Page Object Model
 *
 * Provides methods for interacting with the onboarding flow:
 * - Location detection and city selection
 * - Family size input
 * - AI budget generation
 * - Budget customization
 *
 * Uses data-testid selectors for stability.
 */

class OnboardingPage {
  constructor(page) {
    this.page = page;

    // Selectors using data-testid
    this.selectors = {
      // Location step
      locationInput: '[data-testid="onboarding-location-input"]',
      cityOption: '[data-testid="onboarding-city-option"]',
      locationNextButton: '[data-testid="onboarding-location-next"]',

      // Family size step
      familySizeInput: '[data-testid="onboarding-family-size-input"]',
      familySizeNextButton: '[data-testid="onboarding-family-size-next"]',

      // AI budget generation step
      generateBudgetButton: '[data-testid="onboarding-generate-budget"]',
      budgetLoadingIndicator: '[data-testid="onboarding-budget-loading"]',
      budgetPreview: '[data-testid="onboarding-budget-preview"]',
      budgetNextButton: '[data-testid="onboarding-budget-next"]',

      // Budget customization step
      categoryItem: '[data-testid="onboarding-category-item"]',
      categoryAmountInput: '[data-testid="onboarding-category-amount"]',
      customizeNextButton: '[data-testid="onboarding-customize-next"]',

      // Completion
      completeButton: '[data-testid="onboarding-complete-button"]',
      progressIndicator: '[data-testid="onboarding-progress"]',
    };
  }

  /**
   * Navigate to onboarding page
   * @param {string} baseUrl - Base URL of the application
   * @returns {Promise<void>}
   */
  async navigate(baseUrl) {
    await this.page.goto(`${baseUrl}/onboarding`);
    await this.page.waitForSelector(this.selectors.locationInput);
  }

  /**
   * Select location/city
   * @param {string} city - City name
   * @returns {Promise<void>}
   */
  async selectLocation(city) {
    await this.page.fill(this.selectors.locationInput, city);
    await this.page.waitForSelector(this.selectors.cityOption);
    await this.page.click(`${this.selectors.cityOption}:has-text("${city}")`);
  }

  /**
   * Click next button on location step
   * @returns {Promise<void>}
   */
  async clickLocationNext() {
    await this.page.click(this.selectors.locationNextButton);
  }

  /**
   * Enter family size
   * @param {number} size - Family size
   * @returns {Promise<void>}
   */
  async enterFamilySize(size) {
    await this.page.fill(this.selectors.familySizeInput, size.toString());
  }

  /**
   * Click next button on family size step
   * @returns {Promise<void>}
   */
  async clickFamilySizeNext() {
    await this.page.click(this.selectors.familySizeNextButton);
  }

  /**
   * Trigger AI budget generation
   * @returns {Promise<void>}
   */
  async generateBudget() {
    await this.page.click(this.selectors.generateBudgetButton);
    await this.page.waitForSelector(this.selectors.budgetLoadingIndicator);
    await this.page.waitForSelector(this.selectors.budgetPreview, {
      timeout: 30000,
    });
  }

  /**
   * Click next button on budget generation step
   * @returns {Promise<void>}
   */
  async clickBudgetNext() {
    await this.page.click(this.selectors.budgetNextButton);
  }

  /**
   * Customize budget category amount
   * @param {string} categoryName - Category name
   * @param {number} amount - New amount
   * @returns {Promise<void>}
   */
  async customizeCategoryAmount(categoryName, amount) {
    const categoryItem = await this.page.locator(
      `${this.selectors.categoryItem}:has-text("${categoryName}")`,
    );
    const amountInput = await categoryItem.locator(
      this.selectors.categoryAmountInput,
    );
    await amountInput.fill(amount.toString());
  }

  /**
   * Click next button on customization step
   * @returns {Promise<void>}
   */
  async clickCustomizeNext() {
    await this.page.click(this.selectors.customizeNextButton);
  }

  /**
   * Complete onboarding
   * @returns {Promise<void>}
   */
  async complete() {
    await this.page.click(this.selectors.completeButton);
  }

  /**
   * Get current progress percentage
   * @returns {Promise<number>} Progress percentage (0-100)
   */
  async getProgress() {
    const progressElement = await this.page.locator(
      this.selectors.progressIndicator,
    );
    const progressText = await progressElement.textContent();
    const match = progressText.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Complete full onboarding flow
   * @param {string} city - City name
   * @param {number} familySize - Family size
   * @param {Object} customizations - Category customizations (optional)
   * @returns {Promise<void>}
   */
  async completeOnboarding(city, familySize, customizations = {}) {
    // Step 1: Location
    await this.selectLocation(city);
    await this.clickLocationNext();

    // Step 2: Family size
    await this.enterFamilySize(familySize);
    await this.clickFamilySizeNext();

    // Step 3: Generate budget
    await this.generateBudget();
    await this.clickBudgetNext();

    // Step 4: Customize budget (if provided)
    if (Object.keys(customizations).length > 0) {
      for (const [category, amount] of Object.entries(customizations)) {
        await this.customizeCategoryAmount(category, amount);
      }
    }
    await this.clickCustomizeNext();

    // Step 5: Complete
    await this.complete();
  }

  /**
   * Wait for navigation after onboarding completion
   * @param {string} expectedUrl - Expected URL after onboarding (e.g., '/dashboard')
   * @returns {Promise<void>}
   */
  async waitForCompletion(expectedUrl) {
    await this.page.waitForURL(`**${expectedUrl}`, { timeout: 10000 });
  }
}

module.exports = { OnboardingPage };
