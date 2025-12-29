/**
 * Quick Actions Service
 * Manages quick actions, shortcuts, and transaction templates for faster user workflows
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Budget } from '../types';

export interface QuickTransaction {
  id: string;
  description: string;
  merchant?: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  frequency: number; // How often this transaction is used
  lastUsed: string;
  isTemplate: boolean;
}

export interface TransactionTemplate {
  id: string;
  name: string;
  description: string;
  merchant?: string;
  amount?: number; // Optional for templates
  categoryId: string;
  categoryName: string;
  tags?: string[];
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  usageCount: number;
}

export interface FavoriteCategory {
  categoryId: string;
  categoryName: string;
  icon: string;
  usageCount: number;
  lastUsed: string;
  averageAmount: number;
}

export interface QuickActionsPreferences {
  maxRecentTransactions: number;
  maxFavoriteCategories: number;
  maxTemplates: number;
  enableQuickAdd: boolean;
  enableSwipeActions: boolean;
  enableBulkOperations: boolean;
}

const STORAGE_KEYS = {
  RECENT_TRANSACTIONS: 'quick_recent_transactions',
  TRANSACTION_TEMPLATES: 'quick_transaction_templates',
  FAVORITE_CATEGORIES: 'quick_favorite_categories',
  PREFERENCES: 'quick_actions_preferences',
} as const;

const DEFAULT_PREFERENCES: QuickActionsPreferences = {
  maxRecentTransactions: 10,
  maxFavoriteCategories: 6,
  maxTemplates: 20,
  enableQuickAdd: true,
  enableSwipeActions: true,
  enableBulkOperations: true,
};

class QuickActionsService {
  private recentTransactions: QuickTransaction[] = [];
  private transactionTemplates: TransactionTemplate[] = [];
  private favoriteCategories: FavoriteCategory[] = [];
  private preferences: QuickActionsPreferences = DEFAULT_PREFERENCES;

  /**
   * Initialize quick actions service
   */
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.loadRecentTransactions(),
        this.loadTransactionTemplates(),
        this.loadFavoriteCategories(),
        this.loadPreferences(),
      ]);
    } catch (error) {
      console.error('Failed to initialize quick actions service:', error);
    }
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.recentTransactions = [];
    this.transactionTemplates = [];
    this.favoriteCategories = [];
    this.preferences = { ...DEFAULT_PREFERENCES };
  }

  /**
   * Record a transaction for quick actions tracking
   */
  async recordTransaction(transaction: Transaction, categoryName: string): Promise<void> {
    try {
      // Update recent transactions
      await this.updateRecentTransactions(transaction, categoryName);

      // Update favorite categories
      await this.updateFavoriteCategories(transaction.categoryId, categoryName, transaction.amount);

      // Check if this should become a template (used 3+ times)
      await this.checkForTemplateCreation(transaction, categoryName);
    } catch (error) {
      console.error('Failed to record transaction for quick actions:', error);
    }
  }

  /**
   * Get recent transactions for quick add
   */
  getRecentTransactions(): QuickTransaction[] {
    return this.recentTransactions
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, this.preferences.maxRecentTransactions);
  }

  /**
   * Get favorite categories
   */
  getFavoriteCategories(): FavoriteCategory[] {
    return this.favoriteCategories
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, this.preferences.maxFavoriteCategories);
  }

  /**
   * Get transaction templates
   */
  getTransactionTemplates(): TransactionTemplate[] {
    return this.transactionTemplates
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Create a new transaction template
   */
  async createTemplate(template: Omit<TransactionTemplate, 'id' | 'createdAt' | 'usageCount'>): Promise<TransactionTemplate> {
    const newTemplate: TransactionTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.transactionTemplates.push(newTemplate);
    await this.saveTransactionTemplates();

    return newTemplate;
  }

  /**
   * Use a transaction template
   */
  async useTemplate(templateId: string): Promise<TransactionTemplate | null> {
    const template = this.transactionTemplates.find(t => t.id === templateId);
    if (!template) return null;

    template.usageCount++;
    await this.saveTransactionTemplates();

    return template;
  }

  /**
   * Delete a transaction template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    this.transactionTemplates = this.transactionTemplates.filter(t => t.id !== templateId);
    await this.saveTransactionTemplates();
  }

  /**
   * Create transaction from quick action
   */
  createTransactionFromQuick(quickTransaction: QuickTransaction): Partial<Transaction> {
    return {
      description: quickTransaction.description,
      merchant: quickTransaction.merchant,
      amount: quickTransaction.amount,
      categoryId: quickTransaction.categoryId,
      date: new Date().toISOString().split('T')[0], // Today's date
    };
  }

  /**
   * Create transaction from template
   */
  createTransactionFromTemplate(template: TransactionTemplate): Partial<Transaction> {
    return {
      description: template.description,
      merchant: template.merchant,
      amount: template.amount || 0,
      categoryId: template.categoryId,
      date: new Date().toISOString().split('T')[0], // Today's date
    };
  }

  /**
   * Get bulk operation suggestions
   */
  getBulkOperationSuggestions(transactions: Transaction[]): Array<{
    type: 'category_change' | 'merchant_update' | 'duplicate_removal';
    description: string;
    transactionIds: string[];
    suggestedAction: any;
  }> {
    const suggestions = [];

    // Find transactions with similar descriptions that might need category changes
    const descriptionGroups = new Map<string, Transaction[]>();
    transactions.forEach(t => {
      const key = t.description.toLowerCase().trim();
      if (!descriptionGroups.has(key)) {
        descriptionGroups.set(key, []);
      }
      descriptionGroups.get(key)!.push(t);
    });

    // Suggest category changes for similar transactions
    descriptionGroups.forEach((group, description) => {
      if (group.length > 1) {
        const categories = new Set(group.map(t => t.categoryId));
        if (categories.size > 1) {
          suggestions.push({
            type: 'category_change' as const,
            description: `Standardize category for "${description}"`,
            transactionIds: group.map(t => t.id),
            suggestedAction: {
              mostCommonCategory: this.getMostCommonCategory(group),
            },
          });
        }
      }
    });

    // Find potential duplicates
    const duplicates = this.findPotentialDuplicates(transactions);
    if (duplicates.length > 0) {
      suggestions.push({
        type: 'duplicate_removal' as const,
        description: `Remove ${duplicates.length} potential duplicate transactions`,
        transactionIds: duplicates.map(t => t.id),
        suggestedAction: { duplicates },
      });
    }

    return suggestions;
  }

  /**
   * Update preferences
   */
  async updatePreferences(newPreferences: Partial<QuickActionsPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...newPreferences };
    await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));
  }

  /**
   * Get current preferences
   */
  getPreferences(): QuickActionsPreferences {
    return { ...this.preferences };
  }

  // Private methods

  private async updateRecentTransactions(transaction: Transaction, categoryName: string): Promise<void> {
    const existingIndex = this.recentTransactions.findIndex(
      rt => rt.description === transaction.description &&
        rt.merchant === transaction.merchant &&
        rt.categoryId === transaction.categoryId
    );

    if (existingIndex >= 0) {
      // Update existing
      this.recentTransactions[existingIndex].frequency++;
      this.recentTransactions[existingIndex].lastUsed = new Date().toISOString();
      this.recentTransactions[existingIndex].amount = transaction.amount; // Update to latest amount
    } else {
      // Add new
      const quickTransaction: QuickTransaction = {
        id: `quick_${Date.now()}`,
        description: transaction.description,
        merchant: transaction.merchant,
        amount: transaction.amount,
        categoryId: transaction.categoryId,
        categoryName,
        frequency: 1,
        lastUsed: new Date().toISOString(),
        isTemplate: false,
      };
      this.recentTransactions.push(quickTransaction);
    }

    // Keep only the most recent/frequent ones
    this.recentTransactions = this.recentTransactions
      .sort((a, b) => {
        const scoreA = a.frequency * 0.7 + (Date.now() - new Date(a.lastUsed).getTime()) * -0.3;
        const scoreB = b.frequency * 0.7 + (Date.now() - new Date(b.lastUsed).getTime()) * -0.3;
        return scoreB - scoreA;
      })
      .slice(0, this.preferences.maxRecentTransactions * 2); // Keep extra for better sorting

    await this.saveRecentTransactions();
  }

  private async updateFavoriteCategories(categoryId: string, categoryName: string, amount: number): Promise<void> {
    const existingIndex = this.favoriteCategories.findIndex(fc => fc.categoryId === categoryId);

    if (existingIndex >= 0) {
      const existing = this.favoriteCategories[existingIndex];
      existing.usageCount++;
      existing.lastUsed = new Date().toISOString();
      // Update rolling average
      existing.averageAmount = (existing.averageAmount * (existing.usageCount - 1) + amount) / existing.usageCount;
    } else {
      const favoriteCategory: FavoriteCategory = {
        categoryId,
        categoryName,
        icon: '💰', // Default icon, should be updated from budget data
        usageCount: 1,
        lastUsed: new Date().toISOString(),
        averageAmount: amount,
      };
      this.favoriteCategories.push(favoriteCategory);
    }

    await this.saveFavoriteCategories();
  }

  private async checkForTemplateCreation(transaction: Transaction, categoryName: string): Promise<void> {
    const similar = this.recentTransactions.find(
      rt => rt.description === transaction.description &&
        rt.merchant === transaction.merchant &&
        rt.categoryId === transaction.categoryId &&
        rt.frequency >= 3 &&
        !rt.isTemplate
    );

    if (similar) {
      // Auto-create template for frequently used transactions
      await this.createTemplate({
        name: `${transaction.description} Template`,
        description: transaction.description,
        merchant: transaction.merchant,
        amount: transaction.amount,
        categoryId: transaction.categoryId,
        categoryName,
        isRecurring: true,
        recurringFrequency: 'monthly', // Default frequency
      });

      // Mark as template
      similar.isTemplate = true;
      await this.saveRecentTransactions();
    }
  }

  private getMostCommonCategory(transactions: Transaction[]): string {
    const categoryCount = new Map<string, number>();
    transactions.forEach(t => {
      categoryCount.set(t.categoryId, (categoryCount.get(t.categoryId) || 0) + 1);
    });

    let mostCommon = '';
    let maxCount = 0;
    categoryCount.forEach((count, categoryId) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = categoryId;
      }
    });

    return mostCommon;
  }

  private findPotentialDuplicates(transactions: Transaction[]): Transaction[] {
    const duplicates: Transaction[] = [];
    const seen = new Set<string>();

    transactions.forEach(t => {
      const key = `${t.description}_${t.amount}_${t.date}_${t.categoryId}`;
      if (seen.has(key)) {
        duplicates.push(t);
      } else {
        seen.add(key);
      }
    });

    return duplicates;
  }

  // Storage methods

  private async loadRecentTransactions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_TRANSACTIONS);
      if (stored) {
        this.recentTransactions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
    }
  }

  private async saveRecentTransactions(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_TRANSACTIONS, JSON.stringify(this.recentTransactions));
    } catch (error) {
      console.error('Failed to save recent transactions:', error);
    }
  }

  private async loadTransactionTemplates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTION_TEMPLATES);
      if (stored) {
        this.transactionTemplates = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load transaction templates:', error);
    }
  }

  private async saveTransactionTemplates(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTION_TEMPLATES, JSON.stringify(this.transactionTemplates));
    } catch (error) {
      console.error('Failed to save transaction templates:', error);
    }
  }

  private async loadFavoriteCategories(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_CATEGORIES);
      if (stored) {
        this.favoriteCategories = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load favorite categories:', error);
    }
  }

  private async saveFavoriteCategories(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_CATEGORIES, JSON.stringify(this.favoriteCategories));
    } catch (error) {
      console.error('Failed to save favorite categories:', error);
    }
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load quick actions preferences:', error);
    }
  }
}

// Export singleton instance
export const quickActionsService = new QuickActionsService();
export default quickActionsService;
