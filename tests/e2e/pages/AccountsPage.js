/**
 * Accounts Page Object Model
 *
 * Provides methods for interacting with the bank accounts page:
 * - View connected accounts
 * - Add new account via Plaid
 * - Sync account transactions
 * - Disconnect account
 * - Handle Plaid Link flow
 *
 * Uses data-testid selectors for stability.
 */

class AccountsPage {
  constructor(page) {
    this.page = page;

    // Selectors using data-testid
    this.selectors = {
      // Accounts list
      accountItem: '[data-testid="account-item"]',
      accountName: '[data-testid="account-name"]',
      accountBalance: '[data-testid="account-balance"]',
      accountType: '[data-testid="account-type"]',
      accountLastSync: '[data-testid="account-last-sync"]',

      // Actions
      addAccountButton: '[data-testid="accounts-add-button"]',
      syncAccountButton: '[data-testid="account-sync-button"]',
      disconnectAccountButton: '[data-testid="account-disconnect-button"]',

      // Plaid Link
      plaidLinkButton: '[data-testid="plaid-link-button"]',
      plaidModal: '[data-testid="plaid-modal"]',

      // Transactions
      importedTransactionsCount: '[data-testid="imported-transactions-count"]',
      transactionItem: '[data-testid="imported-transaction-item"]',
      categorizeButton: '[data-testid="transaction-categorize-button"]',

      // Error handling
      errorMessage: '[data-testid="accounts-error-message"]',
    };
  }

  /**
   * Navigate to accounts page
   * @param {string} baseUrl - Base URL of the application
   * @returns {Promise<void>}
   */
  async navigate(baseUrl) {
    await this.page.goto(`${baseUrl}/accounts`);
    await this.page.waitForSelector(this.selectors.addAccountButton);
  }

  /**
   * Click add account button
   * @returns {Promise<void>}
   */
  async clickAddAccount() {
    await this.page.click(this.selectors.addAccountButton);
  }

  /**
   * Wait for Plaid Link to open
   * @returns {Promise<void>}
   */
  async waitForPlaidLink() {
    await this.page.waitForSelector(this.selectors.plaidModal, {
      timeout: 10000,
    });
  }

  /**
   * Enter bank credentials in Plaid sandbox
   * @param {string} username - Bank username (use 'user_good' for sandbox)
   * @param {string} password - Bank password (use 'pass_good' for sandbox)
   * @returns {Promise<void>}
   */
  async enterPlaidCredentials(username, password) {
    // Wait for Plaid iframe
    const plaidFrame = await this.page.frameLocator('iframe[title*="Plaid"]');

    // Select institution (use first one in sandbox)
    await plaidFrame.locator('button:has-text("First Platypus Bank")').click();

    // Enter credentials
    await plaidFrame.locator('input[name="username"]').fill(username);
    await plaidFrame.locator('input[name="password"]').fill(password);

    // Submit
    await plaidFrame.locator('button[type="submit"]').click();
  }

  /**
   * Select accounts in Plaid Link
   * @param {Array<string>} accountNames - Account names to select
   * @returns {Promise<void>}
   */
  async selectPlaidAccounts(accountNames = []) {
    const plaidFrame = await this.page.frameLocator('iframe[title*="Plaid"]');

    if (accountNames.length > 0) {
      for (const accountName of accountNames) {
        await plaidFrame
          .locator(`input[type="checkbox"][value*="${accountName}"]`)
          .check();
      }
    }

    // Continue
    await plaidFrame.locator('button:has-text("Continue")').click();
  }

  /**
   * Complete Plaid Link flow
   * @returns {Promise<void>}
   */
  async completePlaidLink() {
    const plaidFrame = await this.page.frameLocator('iframe[title*="Plaid"]');
    await plaidFrame.locator('button:has-text("Continue")').click();

    // Wait for modal to close
    await this.page.waitForSelector(this.selectors.plaidModal, {
      state: "hidden",
      timeout: 10000,
    });
  }

  /**
   * Connect bank account via Plaid (full flow)
   * @param {string} username - Bank username
   * @param {string} password - Bank password
   * @param {Array<string>} accountNames - Account names to select
   * @returns {Promise<void>}
   */
  async connectBankAccount(username, password, accountNames = []) {
    await this.clickAddAccount();
    await this.waitForPlaidLink();
    await this.enterPlaidCredentials(username, password);
    await this.selectPlaidAccounts(accountNames);
    await this.completePlaidLink();
  }

  /**
   * Get account count
   * @returns {Promise<number>}
   */
  async getAccountCount() {
    const accounts = await this.page.locator(this.selectors.accountItem);
    return await accounts.count();
  }

  /**
   * Get account balance
   * @param {string} accountName - Account name
   * @returns {Promise<number>}
   */
  async getAccountBalance(accountName) {
    const accountItem = await this.page.locator(
      `${this.selectors.accountItem}:has-text("${accountName}")`,
    );
    const balanceText = await accountItem
      .locator(this.selectors.accountBalance)
      .textContent();
    return parseFloat(balanceText.replace(/[^0-9.]/g, ""));
  }

  /**
   * Sync account transactions
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async syncAccount(accountName) {
    const accountItem = await this.page.locator(
      `${this.selectors.accountItem}:has-text("${accountName}")`,
    );
    await accountItem.locator(this.selectors.syncAccountButton).click();
    await this.page.waitForTimeout(2000); // Wait for sync to complete
  }

  /**
   * Get imported transactions count
   * @returns {Promise<number>}
   */
  async getImportedTransactionsCount() {
    const countText = await this.page.textContent(
      this.selectors.importedTransactionsCount,
    );
    return parseInt(countText.replace(/[^0-9]/g, ""), 10);
  }

  /**
   * Categorize imported transaction
   * @param {number} index - Transaction index (0-based)
   * @param {string} category - Category name
   * @returns {Promise<void>}
   */
  async categorizeTransaction(index, category) {
    const transactions = await this.page.locator(
      this.selectors.transactionItem,
    );
    const transaction = transactions.nth(index);
    await transaction.locator(this.selectors.categorizeButton).click();

    // Select category from dropdown
    await this.page.selectOption('[data-testid="category-select"]', category);
    await this.page.click('[data-testid="category-save-button"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * Disconnect account
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async disconnectAccount(accountName) {
    const accountItem = await this.page.locator(
      `${this.selectors.accountItem}:has-text("${accountName}")`,
    );
    await accountItem.locator(this.selectors.disconnectAccountButton).click();

    // Confirm disconnect
    await this.page.click('[data-testid="confirm-disconnect-button"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get error message
   * @returns {Promise<string|null>}
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
   * Check if error is displayed
   * @returns {Promise<boolean>}
   */
  async hasError() {
    return await this.page.isVisible(this.selectors.errorMessage);
  }
}

module.exports = { AccountsPage };
