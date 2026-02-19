/**
 * Budget Page Object Model
 *
 * Provides methods for interacting with the budget management page:
 * - View budget overview
 * - Add/edit/delete transactions
 * - Edit budget amounts
 * - Navigate between months
 * - View category details
 *
 * Uses data-testid selectors for stability.
 */

class BudgetPage {
  constructor(page) {
    this.page = page;

    // Selectors using data-testid
    this.selectors = {
      // Budget overview
      budgetTotal: '[data-testid="budget-total"]',
      spentTotal: '[data-testid="budget-spent-total"]',
      remainingTotal: '[data-testid="budget-remaining-total"]',

      // Month navigation
      previousMonthButton: '[data-testid="budget-previous-month"]',
      nextMonthButton: '[data-testid="budget-next-month"]',
      currentMonth: '[data-testid="budget-current-month"]',

      // Categories
      categoryItem: '[data-testid="budget-category-item"]',
      categoryName: '[data-testid="budget-category-name"]',
      categoryAmount: '[data-testid="budget-category-amount"]',
      categorySpent: '[data-testid="budget-category-spent"]',
      categoryRemaining: '[data-testid="budget-category-remaining"]',

      // Transactions
      addTransactionButton: '[data-testid="budget-add-transaction"]',
      transactionItem: '[data-testid="budget-transaction-item"]',
      transactionAmount: '[data-testid="budget-transaction-amount"]',
      transactionDescription: '[data-testid="budget-transaction-description"]',
      transactionDate: '[data-testid="budget-transaction-date"]',
      editTransactionButton: '[data-testid="budget-edit-transaction"]',
      deleteTransactionButton: '[data-testid="budget-delete-transaction"]',

      // Transaction form
      transactionCategorySelect: '[data-testid="transaction-category-select"]',
      transactionAmountInput: '[data-testid="transaction-amount-input"]',
      transactionDescriptionInput:
        '[data-testid="transaction-description-input"]',
      transactionDateInput: '[data-testid="transaction-date-input"]',
      transactionSubmitButton: '[data-testid="transaction-submit-button"]',
      transactionCancelButton: '[data-testid="transaction-cancel-button"]',

      // Edit budget amount
      editBudgetButton: '[data-testid="budget-edit-amount"]',
      budgetAmountInput: '[data-testid="budget-amount-input"]',
      saveBudgetButton: '[data-testid="budget-save-amount"]',
    };
  }

  /**
   * Navigate to budget page
   * @param {string} baseUrl - Base URL of the application
   * @returns {Promise<void>}
   */
  async navigate(baseUrl) {
    await this.page.goto(`${baseUrl}/budget`);
    await this.page.waitForSelector(this.selectors.budgetTotal);
  }

  /**
   * Get budget total
   * @returns {Promise<number>}
   */
  async getBudgetTotal() {
    const text = await this.page.textContent(this.selectors.budgetTotal);
    return parseFloat(text.replace(/[^0-9.]/g, ""));
  }

  /**
   * Get spent total
   * @returns {Promise<number>}
   */
  async getSpentTotal() {
    const text = await this.page.textContent(this.selectors.spentTotal);
    return parseFloat(text.replace(/[^0-9.]/g, ""));
  }

  /**
   * Get remaining total
   * @returns {Promise<number>}
   */
  async getRemainingTotal() {
    const text = await this.page.textContent(this.selectors.remainingTotal);
    return parseFloat(text.replace(/[^0-9.]/g, ""));
  }

  /**
   * Navigate to previous month
   * @returns {Promise<void>}
   */
  async goToPreviousMonth() {
    await this.page.click(this.selectors.previousMonthButton);
    await this.page.waitForTimeout(500); // Wait for data to load
  }

  /**
   * Navigate to next month
   * @returns {Promise<void>}
   */
  async goToNextMonth() {
    await this.page.click(this.selectors.nextMonthButton);
    await this.page.waitForTimeout(500); // Wait for data to load
  }

  /**
   * Get current month display
   * @returns {Promise<string>}
   */
  async getCurrentMonth() {
    return await this.page.textContent(this.selectors.currentMonth);
  }

  /**
   * Click on a category to view details
   * @param {string} categoryName - Category name
   * @returns {Promise<void>}
   */
  async clickCategory(categoryName) {
    await this.page.click(
      `${this.selectors.categoryItem}:has-text("${categoryName}")`,
    );
  }

  /**
   * Get category remaining amount
   * @param {string} categoryName - Category name
   * @returns {Promise<number>}
   */
  async getCategoryRemaining(categoryName) {
    const categoryItem = await this.page.locator(
      `${this.selectors.categoryItem}:has-text("${categoryName}")`,
    );
    const remainingText = await categoryItem
      .locator(this.selectors.categoryRemaining)
      .textContent();
    return parseFloat(remainingText.replace(/[^0-9.]/g, ""));
  }

  /**
   * Add a transaction
   * @param {string} category - Category name
   * @param {number} amount - Transaction amount
   * @param {string} description - Transaction description
   * @param {string} date - Transaction date (YYYY-MM-DD)
   * @returns {Promise<void>}
   */
  async addTransaction(category, amount, description, date = null) {
    await this.page.click(this.selectors.addTransactionButton);
    await this.page.selectOption(
      this.selectors.transactionCategorySelect,
      category,
    );
    await this.page.fill(
      this.selectors.transactionAmountInput,
      amount.toString(),
    );
    await this.page.fill(
      this.selectors.transactionDescriptionInput,
      description,
    );
    if (date) {
      await this.page.fill(this.selectors.transactionDateInput, date);
    }
    await this.page.click(this.selectors.transactionSubmitButton);
    await this.page.waitForTimeout(500); // Wait for transaction to be saved
  }

  /**
   * Edit a transaction
   * @param {string} description - Original transaction description
   * @param {number} newAmount - New amount
   * @param {string} newDescription - New description
   * @returns {Promise<void>}
   */
  async editTransaction(description, newAmount, newDescription) {
    const transactionItem = await this.page.locator(
      `${this.selectors.transactionItem}:has-text("${description}")`,
    );
    await transactionItem.locator(this.selectors.editTransactionButton).click();
    await this.page.fill(
      this.selectors.transactionAmountInput,
      newAmount.toString(),
    );
    await this.page.fill(
      this.selectors.transactionDescriptionInput,
      newDescription,
    );
    await this.page.click(this.selectors.transactionSubmitButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Delete a transaction
   * @param {string} description - Transaction description
   * @returns {Promise<void>}
   */
  async deleteTransaction(description) {
    const transactionItem = await this.page.locator(
      `${this.selectors.transactionItem}:has-text("${description}")`,
    );
    await transactionItem
      .locator(this.selectors.deleteTransactionButton)
      .click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get transaction count
   * @returns {Promise<number>}
   */
  async getTransactionCount() {
    const transactions = await this.page.locator(
      this.selectors.transactionItem,
    );
    return await transactions.count();
  }

  /**
   * Edit budget amount for a category
   * @param {string} categoryName - Category name
   * @param {number} newAmount - New budget amount
   * @returns {Promise<void>}
   */
  async editCategoryBudget(categoryName, newAmount) {
    const categoryItem = await this.page.locator(
      `${this.selectors.categoryItem}:has-text("${categoryName}")`,
    );
    await categoryItem.locator(this.selectors.editBudgetButton).click();
    await this.page.fill(
      this.selectors.budgetAmountInput,
      newAmount.toString(),
    );
    await this.page.click(this.selectors.saveBudgetButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Verify budget totals match sum of categories
   * @returns {Promise<boolean>}
   */
  async verifyBudgetTotals() {
    const budgetTotal = await this.getBudgetTotal();
    const spentTotal = await this.getSpentTotal();
    const remainingTotal = await this.getRemainingTotal();

    // Verify: remaining = budget - spent
    const calculatedRemaining = budgetTotal - spentTotal;
    return Math.abs(calculatedRemaining - remainingTotal) < 0.01; // Allow for rounding
  }
}

module.exports = { BudgetPage };
