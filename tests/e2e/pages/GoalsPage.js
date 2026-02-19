/**
 * Goals Page Object Model
 *
 * Provides methods for interacting with the goals page:
 * - View debt and savings goals
 * - Create new goals
 * - Edit existing goals
 * - Delete goals
 * - Make payments toward goals
 * - Track progress
 *
 * Uses data-testid selectors for stability.
 */

class GoalsPage {
  constructor(page) {
    this.page = page;

    // Selectors using data-testid
    this.selectors = {
      // Goals list
      goalItem: '[data-testid="goal-item"]',
      goalName: '[data-testid="goal-name"]',
      goalType: '[data-testid="goal-type"]',
      goalTargetAmount: '[data-testid="goal-target-amount"]',
      goalCurrentAmount: '[data-testid="goal-current-amount"]',
      goalProgress: '[data-testid="goal-progress"]',
      goalProgressBar: '[data-testid="goal-progress-bar"]',
      goalCompletedBadge: '[data-testid="goal-completed-badge"]',

      // Actions
      createGoalButton: '[data-testid="goals-create-button"]',
      editGoalButton: '[data-testid="goal-edit-button"]',
      deleteGoalButton: '[data-testid="goal-delete-button"]',
      makePaymentButton: '[data-testid="goal-make-payment-button"]',

      // Goal form
      goalTypeSelect: '[data-testid="goal-type-select"]',
      goalNameInput: '[data-testid="goal-name-input"]',
      goalTargetAmountInput: '[data-testid="goal-target-amount-input"]',
      goalCurrentAmountInput: '[data-testid="goal-current-amount-input"]',
      goalSubmitButton: '[data-testid="goal-submit-button"]',
      goalCancelButton: '[data-testid="goal-cancel-button"]',

      // Payment form
      paymentAmountInput: '[data-testid="payment-amount-input"]',
      paymentSubmitButton: '[data-testid="payment-submit-button"]',
      paymentCancelButton: '[data-testid="payment-cancel-button"]',

      // Filters
      filterAllButton: '[data-testid="goals-filter-all"]',
      filterDebtButton: '[data-testid="goals-filter-debt"]',
      filterSavingsButton: '[data-testid="goals-filter-savings"]',
      filterActiveButton: '[data-testid="goals-filter-active"]',
      filterCompletedButton: '[data-testid="goals-filter-completed"]',
    };
  }

  /**
   * Navigate to goals page
   * @param {string} baseUrl - Base URL of the application
   * @returns {Promise<void>}
   */
  async navigate(baseUrl) {
    await this.page.goto(`${baseUrl}/goals`);
    await this.page.waitForSelector(this.selectors.createGoalButton);
  }

  /**
   * Click create goal button
   * @returns {Promise<void>}
   */
  async clickCreateGoal() {
    await this.page.click(this.selectors.createGoalButton);
  }

  /**
   * Create a new goal
   * @param {string} type - Goal type ('debt' or 'savings')
   * @param {string} name - Goal name
   * @param {number} targetAmount - Target amount
   * @param {number} currentAmount - Current amount (default 0)
   * @returns {Promise<void>}
   */
  async createGoal(type, name, targetAmount, currentAmount = 0) {
    await this.clickCreateGoal();
    await this.page.selectOption(this.selectors.goalTypeSelect, type);
    await this.page.fill(this.selectors.goalNameInput, name);
    await this.page.fill(
      this.selectors.goalTargetAmountInput,
      targetAmount.toString(),
    );
    if (currentAmount > 0) {
      await this.page.fill(
        this.selectors.goalCurrentAmountInput,
        currentAmount.toString(),
      );
    }
    await this.page.click(this.selectors.goalSubmitButton);
    await this.page.waitForTimeout(500); // Wait for goal to be created
  }

  /**
   * Get goal count
   * @returns {Promise<number>}
   */
  async getGoalCount() {
    const goals = await this.page.locator(this.selectors.goalItem);
    return await goals.count();
  }

  /**
   * Get goal progress percentage
   * @param {string} goalName - Goal name
   * @returns {Promise<number>}
   */
  async getGoalProgress(goalName) {
    const goalItem = await this.page.locator(
      `${this.selectors.goalItem}:has-text("${goalName}")`,
    );
    const progressText = await goalItem
      .locator(this.selectors.goalProgress)
      .textContent();
    const match = progressText.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get goal current amount
   * @param {string} goalName - Goal name
   * @returns {Promise<number>}
   */
  async getGoalCurrentAmount(goalName) {
    const goalItem = await this.page.locator(
      `${this.selectors.goalItem}:has-text("${goalName}")`,
    );
    const amountText = await goalItem
      .locator(this.selectors.goalCurrentAmount)
      .textContent();
    return parseFloat(amountText.replace(/[^0-9.]/g, ""));
  }

  /**
   * Check if goal is completed
   * @param {string} goalName - Goal name
   * @returns {Promise<boolean>}
   */
  async isGoalCompleted(goalName) {
    const goalItem = await this.page.locator(
      `${this.selectors.goalItem}:has-text("${goalName}")`,
    );
    const completedBadge = goalItem.locator(this.selectors.goalCompletedBadge);
    return await completedBadge.isVisible();
  }

  /**
   * Make payment toward goal
   * @param {string} goalName - Goal name
   * @param {number} amount - Payment amount
   * @returns {Promise<void>}
   */
  async makePayment(goalName, amount) {
    const goalItem = await this.page.locator(
      `${this.selectors.goalItem}:has-text("${goalName}")`,
    );
    await goalItem.locator(this.selectors.makePaymentButton).click();
    await this.page.fill(this.selectors.paymentAmountInput, amount.toString());
    await this.page.click(this.selectors.paymentSubmitButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Edit a goal
   * @param {string} goalName - Original goal name
   * @param {Object} updates - Updates to apply (name, targetAmount, currentAmount)
   * @returns {Promise<void>}
   */
  async editGoal(goalName, updates) {
    const goalItem = await this.page.locator(
      `${this.selectors.goalItem}:has-text("${goalName}")`,
    );
    await goalItem.locator(this.selectors.editGoalButton).click();

    if (updates.name) {
      await this.page.fill(this.selectors.goalNameInput, updates.name);
    }
    if (updates.targetAmount) {
      await this.page.fill(
        this.selectors.goalTargetAmountInput,
        updates.targetAmount.toString(),
      );
    }
    if (updates.currentAmount !== undefined) {
      await this.page.fill(
        this.selectors.goalCurrentAmountInput,
        updates.currentAmount.toString(),
      );
    }

    await this.page.click(this.selectors.goalSubmitButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Delete a goal
   * @param {string} goalName - Goal name
   * @returns {Promise<void>}
   */
  async deleteGoal(goalName) {
    const goalItem = await this.page.locator(
      `${this.selectors.goalItem}:has-text("${goalName}")`,
    );
    await goalItem.locator(this.selectors.deleteGoalButton).click();

    // Confirm deletion
    await this.page.click('[data-testid="confirm-delete-button"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter goals by type
   * @param {string} filter - Filter type ('all', 'debt', 'savings', 'active', 'completed')
   * @returns {Promise<void>}
   */
  async filterGoals(filter) {
    const filterMap = {
      all: this.selectors.filterAllButton,
      debt: this.selectors.filterDebtButton,
      savings: this.selectors.filterSavingsButton,
      active: this.selectors.filterActiveButton,
      completed: this.selectors.filterCompletedButton,
    };

    const selector = filterMap[filter];
    if (selector) {
      await this.page.click(selector);
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Verify goal progress calculation
   * @param {string} goalName - Goal name
   * @returns {Promise<boolean>}
   */
  async verifyGoalProgress(goalName) {
    const goalItem = await this.page.locator(
      `${this.selectors.goalItem}:has-text("${goalName}")`,
    );

    const currentText = await goalItem
      .locator(this.selectors.goalCurrentAmount)
      .textContent();
    const targetText = await goalItem
      .locator(this.selectors.goalTargetAmount)
      .textContent();
    const progressText = await goalItem
      .locator(this.selectors.goalProgress)
      .textContent();

    const current = parseFloat(currentText.replace(/[^0-9.]/g, ""));
    const target = parseFloat(targetText.replace(/[^0-9.]/g, ""));
    const progress = parseInt(progressText.match(/(\d+)%/)[1], 10);

    const calculatedProgress = Math.round((current / target) * 100);
    return Math.abs(calculatedProgress - progress) <= 1; // Allow 1% rounding difference
  }
}

module.exports = { GoalsPage };
