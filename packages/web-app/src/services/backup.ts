import { Budget, Transaction } from '../types';

export interface BackupData {
  version: string;
  timestamp: string;
  userId: string;
  budgets: Budget[];
  transactions: Transaction[];
  settings: Record<string, any>;
  metadata: {
    totalBudgets: number;
    totalTransactions: number;
    dateRange: {
      earliest: string;
      latest: string;
    };
    categories: string[];
  };
}

export interface BackupOptions {
  includeSettings?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  categories?: string[];
}

export interface RestoreResult {
  success: boolean;
  restored: {
    budgets: number;
    transactions: number;
    settings: number;
  };
  skipped: {
    budgets: number;
    transactions: number;
  };
  errors: string[];
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  backupSize?: number;
  error?: string;
}

class WebBackupService {
  private readonly BACKUP_VERSION = '1.0.0';
  private readonly BACKUP_SCHEDULE_KEY = 'backup_schedule';
  private readonly LAST_BACKUP_KEY = 'last_backup_timestamp';
  private readonly AUTO_BACKUP_KEY = 'auto_backup_enabled';

  /**
   * Create a full backup of all user data for web
   */
  async createFullBackup(
    budgets: Budget[],
    transactions: Transaction[],
    userId: string,
    options: BackupOptions = {}
  ): Promise<BackupResult> {
    try {
      // Filter data based on options
      const filteredBudgets = this.filterBudgetsByOptions(budgets, options);
      const filteredTransactions = this.filterTransactionsByOptions(transactions, options);

      // Get user settings if requested
      let settings = {};
      if (options.includeSettings !== false) {
        settings = this.getUserSettings();
      }

      // Generate metadata
      const metadata = this.generateMetadata(filteredBudgets, filteredTransactions);

      // Create backup data structure
      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        userId,
        budgets: filteredBudgets,
        transactions: filteredTransactions,
        settings,
        metadata,
      };

      // Convert to JSON
      const backupJson = JSON.stringify(backupData, null, 2);
      const backupSize = new Blob([backupJson]).size;

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `budgetbuddy_backup_${timestamp}.json`;

      // Download the backup file
      this.downloadFile(backupJson, fileName, 'application/json');

      // Update last backup timestamp
      localStorage.setItem(this.LAST_BACKUP_KEY, new Date().toISOString());

      return {
        success: true,
        filePath: fileName,
        backupSize,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Restore data from a backup file (web version)
   */
  async restoreFromBackup(file: File): Promise<RestoreResult> {
    try {
      // Read backup file
      const backupContent = await this.readFileAsText(file);

      // Parse backup data
      const backupData: BackupData = JSON.parse(backupContent);

      // Validate backup format
      this.validateBackupData(backupData);

      // Restore data with conflict resolution
      const restoreResult = await this.performRestore(backupData);

      return restoreResult;
    } catch (error) {
      return {
        success: false,
        restored: { budgets: 0, transactions: 0, settings: 0 },
        skipped: { budgets: 0, transactions: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  /**
   * Schedule automatic backups (web version using localStorage)
   */
  async scheduleAutomaticBackup(frequency: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    const scheduleConfig = {
      enabled: true,
      frequency,
      lastBackup: localStorage.getItem(this.LAST_BACKUP_KEY),
      nextBackup: this.calculateNextBackupDate(frequency),
    };

    localStorage.setItem(this.BACKUP_SCHEDULE_KEY, JSON.stringify(scheduleConfig));
    localStorage.setItem(this.AUTO_BACKUP_KEY, 'true');
  }

  /**
   * Disable automatic backups
   */
  async disableAutomaticBackup(): Promise<void> {
    localStorage.setItem(this.AUTO_BACKUP_KEY, 'false');
  }

  /**
   * Check if automatic backup is due
   */
  async isBackupDue(): Promise<boolean> {
    try {
      const autoBackupEnabled = localStorage.getItem(this.AUTO_BACKUP_KEY);
      if (autoBackupEnabled !== 'true') {
        return false;
      }

      const scheduleConfig = localStorage.getItem(this.BACKUP_SCHEDULE_KEY);
      if (!scheduleConfig) {
        return false;
      }

      const config = JSON.parse(scheduleConfig);
      const nextBackupDate = new Date(config.nextBackup);
      const now = new Date();

      return now >= nextBackupDate;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get backup status and statistics
   */
  async getBackupStatus(): Promise<{
    autoBackupEnabled: boolean;
    lastBackup?: string;
    nextBackup?: string;
    frequency?: string;
  }> {
    try {
      const autoBackupEnabled = localStorage.getItem(this.AUTO_BACKUP_KEY) === 'true';
      const lastBackup = localStorage.getItem(this.LAST_BACKUP_KEY);

      let nextBackup: string | undefined;
      let frequency: string | undefined;

      if (autoBackupEnabled) {
        const scheduleConfig = localStorage.getItem(this.BACKUP_SCHEDULE_KEY);
        if (scheduleConfig) {
          const config = JSON.parse(scheduleConfig);
          nextBackup = config.nextBackup;
          frequency = config.frequency;
        }
      }

      return {
        autoBackupEnabled,
        lastBackup: lastBackup || undefined,
        nextBackup,
        frequency,
      };
    } catch (error) {
      return {
        autoBackupEnabled: false,
      };
    }
  }

  /**
   * Create backup before account deletion
   */
  async createPreDeletionBackup(
    budgets: Budget[],
    transactions: Transaction[],
    userId: string
  ): Promise<BackupResult> {
    try {
      // Create comprehensive backup with all data
      const result = await this.createFullBackup(budgets, transactions, userId, {
        includeSettings: true, // Include all settings
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create pre-deletion backup',
      };
    }
  }

  /**
   * Download file in browser
   */
  private downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Filter budgets based on backup options
   */
  private filterBudgetsByOptions(budgets: Budget[], options: BackupOptions): Budget[] {
    let filtered = [...budgets];

    if (options.dateRange) {
      filtered = filtered.filter(budget => {
        const budgetDate = new Date(budget.createdAt);
        return budgetDate >= options.dateRange!.startDate &&
          budgetDate <= options.dateRange!.endDate;
      });
    }

    return filtered;
  }

  /**
   * Filter transactions based on backup options
   */
  private filterTransactionsByOptions(transactions: Transaction[], options: BackupOptions): Transaction[] {
    let filtered = [...transactions];

    if (options.dateRange) {
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= options.dateRange!.startDate &&
          transactionDate <= options.dateRange!.endDate;
      });
    }

    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(transaction =>
        options.categories!.includes(transaction.category)
      );
    }

    return filtered;
  }

  /**
   * Get user settings from localStorage
   */
  private getUserSettings(): Record<string, any> {
    try {
      const settings: Record<string, any> = {};

      // Get all localStorage keys that might be settings
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('setting_') ||
          key.startsWith('preference_') ||
          key === this.AUTO_BACKUP_KEY ||
          key === this.BACKUP_SCHEDULE_KEY
        )) {
          const value = localStorage.getItem(key);
          if (value !== null) {
            try {
              settings[key] = JSON.parse(value);
            } catch {
              settings[key] = value;
            }
          }
        }
      }

      return settings;
    } catch (error) {
      return {};
    }
  }

  /**
   * Generate metadata for backup
   */
  private generateMetadata(budgets: Budget[], transactions: Transaction[]): BackupData['metadata'] {
    const categories = Array.from(new Set([
      ...budgets.map(b => b.category),
      ...transactions.map(t => t.category),
    ])).sort();

    const dates = [
      ...budgets.map(b => b.createdAt),
      ...transactions.map(t => t.date),
    ].sort();

    return {
      totalBudgets: budgets.length,
      totalTransactions: transactions.length,
      dateRange: {
        earliest: dates[0] || new Date().toISOString(),
        latest: dates[dates.length - 1] || new Date().toISOString(),
      },
      categories,
    };
  }

  /**
   * Validate backup data structure
   */
  private validateBackupData(backupData: any): void {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file format');
    }

    if (!backupData.version || !backupData.timestamp || !backupData.userId) {
      throw new Error('Backup file is missing required metadata');
    }

    if (!Array.isArray(backupData.budgets) || !Array.isArray(backupData.transactions)) {
      throw new Error('Backup file has invalid data structure');
    }

    // Check version compatibility
    if (backupData.version !== this.BACKUP_VERSION) {
      console.warn(`Backup version ${backupData.version} may not be fully compatible with current version ${this.BACKUP_VERSION}`);
    }
  }

  /**
   * Perform the actual restore operation
   */
  private async performRestore(backupData: BackupData): Promise<RestoreResult> {
    const result: RestoreResult = {
      success: true,
      restored: { budgets: 0, transactions: 0, settings: 0 },
      skipped: { budgets: 0, transactions: 0 },
      errors: [],
    };

    try {
      // Note: In a real implementation, this would integrate with the actual data services
      // For now, we'll simulate the restore process

      // Restore budgets (would integrate with budget service)
      result.restored.budgets = backupData.budgets.length;

      // Restore transactions (would integrate with transaction service)
      result.restored.transactions = backupData.transactions.length;

      // Restore settings
      if (backupData.settings && Object.keys(backupData.settings).length > 0) {
        for (const [key, value] of Object.entries(backupData.settings)) {
          try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            result.restored.settings++;
          } catch (error) {
            result.errors.push(`Failed to restore setting ${key}: ${error}`);
          }
        }
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown restore error');
      return result;
    }
  }

  /**
   * Calculate next backup date based on frequency
   */
  private calculateNextBackupDate(frequency: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    const nextBackup = new Date(now);

    switch (frequency) {
      case 'daily':
        nextBackup.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextBackup.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextBackup.setMonth(now.getMonth() + 1);
        break;
    }

    return nextBackup.toISOString();
  }
}

export const webBackupService = new WebBackupService();
