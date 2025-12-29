/**
 * Budget Monitoring Service
 * Monitors budget usage and triggers notifications for alerts and reminders
 */

import { Budget, Transaction } from '../types';
import { notificationService, BudgetAlert, BillReminder } from './notification';

export interface BudgetUsage {
  budgetId: string;
  budgetName: string;
  budgetAmount: number;
  currentAmount: number;
  percentage: number;
  isOverBudget: boolean;
  transactions: Transaction[];
}

export interface SpendingSummary {
  totalSpent: number;
  budgetTotal: number;
  savings: number;
  topCategories: Array<{ name: string; amount: number }>;
  period: 'weekly' | 'monthly';
}

class BudgetMonitoringService {
  private lastAlertTimestamps: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Analyze budget usage and trigger appropriate notifications
   */
  async analyzeBudgetUsage(budgets: Budget[], transactions: Transaction[]): Promise<void> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const budgetUsages = this.calculateBudgetUsages(budgets, transactions, currentMonth);

      for (const usage of budgetUsages) {
        await this.checkBudgetAlerts(usage);
      }
    } catch (error) {
      console.error('Failed to analyze budget usage:', error);
    }
  }

  /**
   * Calculate budget usage for each budget
   */
  private calculateBudgetUsages(
    budgets: Budget[],
    transactions: Transaction[],
    month: string
  ): BudgetUsage[] {
    return budgets.map(budget => {
      // Filter transactions for this budget and month
      const budgetTransactions = transactions.filter(transaction => {
        const transactionMonth = transaction.date.slice(0, 7);
        return transaction.categoryId === budget.id && transactionMonth === month;
      });

      const currentAmount = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
      const percentage = budget.amount > 0 ? Math.round((currentAmount / budget.amount) * 100) : 0;

      return {
        budgetId: budget.id,
        budgetName: budget.name,
        budgetAmount: budget.amount,
        currentAmount,
        percentage,
        isOverBudget: currentAmount > budget.amount,
        transactions: budgetTransactions,
      };
    });
  }

  /**
   * Check if budget alerts should be triggered
   */
  private async checkBudgetAlerts(usage: BudgetUsage): Promise<void> {
    const now = Date.now();
    const lastAlert = this.lastAlertTimestamps.get(usage.budgetId) || 0;

    // Don't send alerts too frequently
    if (now - lastAlert < this.ALERT_COOLDOWN) {
      return;
    }

    // Check for different alert thresholds
    const thresholds = [80, 90, 100];

    for (const threshold of thresholds) {
      if (usage.percentage >= threshold) {
        const alert: BudgetAlert = {
          budgetId: usage.budgetId,
          budgetName: usage.budgetName,
          threshold,
          currentAmount: usage.currentAmount,
          budgetAmount: usage.budgetAmount,
          percentage: usage.percentage,
        };

        await notificationService.sendBudgetAlert(alert);
        this.lastAlertTimestamps.set(usage.budgetId, now);
        break; // Only send one alert per budget
      }
    }
  }

  /**
   * Check for upcoming bill reminders
   */
  async checkBillReminders(budgets: Budget[]): Promise<void> {
    try {
      const today = new Date();
      const recurringBudgets = budgets.filter(budget =>
        budget.frequency !== 'one-time' && budget.frequency !== 'monthly'
      );

      for (const budget of recurringBudgets) {
        const daysUntilDue = this.calculateDaysUntilDue(budget, today);

        // Send reminders 3 days before, 1 day before, and on the day
        if ([3, 1, 0].includes(daysUntilDue)) {
          const reminder: BillReminder = {
            budgetId: budget.id,
            budgetName: budget.name,
            amount: budget.amount,
            dueDate: this.getNextDueDate(budget, today).toISOString(),
            daysUntilDue,
          };

          await notificationService.sendBillReminder(reminder);
        }
      }
    } catch (error) {
      console.error('Failed to check bill reminders:', error);
    }
  }

  /**
   * Calculate days until next due date for recurring budget
   */
  private calculateDaysUntilDue(budget: Budget, today: Date): number {
    const nextDueDate = this.getNextDueDate(budget, today);
    const diffTime = nextDueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get next due date for recurring budget
   */
  private getNextDueDate(budget: Budget, today: Date): Date {
    const nextDue = new Date(today);

    switch (budget.frequency) {
      case 'weekly':
        // Assume bills are due on the same day of week as created
        const dayOfWeek = new Date(budget.createdAt).getDay();
        const daysUntilNextWeek = (7 + dayOfWeek - today.getDay()) % 7;
        nextDue.setDate(today.getDate() + (daysUntilNextWeek || 7));
        break;

      case 'bi-weekly':
        // Every 14 days from creation date
        const createdDate = new Date(budget.createdAt);
        const daysSinceCreated = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const cyclesSinceCreated = Math.floor(daysSinceCreated / 14);
        const nextCycleStart = createdDate.getTime() + ((cyclesSinceCreated + 1) * 14 * 24 * 60 * 60 * 1000);
        nextDue.setTime(nextCycleStart);
        break;

      case 'monthly':
        // Same day next month
        nextDue.setMonth(today.getMonth() + 1);
        nextDue.setDate(new Date(budget.createdAt).getDate());
        break;

      case 'quarterly':
        // Same day next quarter
        nextDue.setMonth(today.getMonth() + 3);
        nextDue.setDate(new Date(budget.createdAt).getDate());
        break;

      case 'yearly':
        // Same day next year
        nextDue.setFullYear(today.getFullYear() + 1);
        nextDue.setMonth(new Date(budget.createdAt).getMonth());
        nextDue.setDate(new Date(budget.createdAt).getDate());
        break;

      default:
        // Default to next month for unknown frequencies
        nextDue.setMonth(today.getMonth() + 1);
    }

    return nextDue;
  }

  /**
   * Generate weekly spending summary
   */
  async generateWeeklySummary(budgets: Budget[], transactions: Transaction[]): Promise<void> {
    try {
      const summary = this.calculateSpendingSummary(budgets, transactions, 'weekly');
      await notificationService.sendWeeklySummary(
        summary.totalSpent,
        summary.budgetTotal,
        summary.topCategories
      );
    } catch (error) {
      console.error('Failed to generate weekly summary:', error);
    }
  }

  /**
   * Generate monthly spending summary
   */
  async generateMonthlySummary(budgets: Budget[], transactions: Transaction[]): Promise<void> {
    try {
      const summary = this.calculateSpendingSummary(budgets, transactions, 'monthly');
      await notificationService.sendMonthlySummary(
        summary.totalSpent,
        summary.budgetTotal,
        summary.savings,
        summary.topCategories
      );
    } catch (error) {
      console.error('Failed to generate monthly summary:', error);
    }
  }

  /**
   * Calculate spending summary for a period
   */
  private calculateSpendingSummary(
    budgets: Budget[],
    transactions: Transaction[],
    period: 'weekly' | 'monthly'
  ): SpendingSummary {
    const now = new Date();
    let startDate: Date;

    if (period === 'weekly') {
      // Start of current week (Sunday)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Start of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Filter transactions for the period
    const periodTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= now;
    });

    const totalSpent = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
    const budgetTotal = budgets.reduce((sum, b) => sum + b.amount, 0);

    // Calculate savings (budget total - spent)
    const savings = Math.max(0, budgetTotal - totalSpent);

    // Calculate top categories
    const categorySpending = new Map<string, number>();
    periodTransactions.forEach(transaction => {
      const current = categorySpending.get(transaction.categoryId) || 0;
      categorySpending.set(transaction.categoryId, current + transaction.amount);
    });

    const topCategories = Array.from(categorySpending.entries())
      .map(([categoryId, amount]) => {
        const budget = budgets.find(b => b.id === categoryId);
        return {
          name: budget?.name || 'Unknown Category',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    return {
      totalSpent,
      budgetTotal,
      savings,
      topCategories,
      period,
    };
  }

  /**
   * Schedule periodic monitoring checks
   */
  startPeriodicMonitoring(budgets: Budget[], transactions: Transaction[]): void {
    // Check budget usage every hour
    setInterval(() => {
      this.analyzeBudgetUsage(budgets, transactions);
    }, 60 * 60 * 1000);

    // Check bill reminders twice daily
    setInterval(() => {
      this.checkBillReminders(budgets);
    }, 12 * 60 * 60 * 1000);

    // Send daily expense reminder at user's preferred time
    const checkDailyReminder = () => {
      const now = new Date();
      const preferences = notificationService.getPreferences();

      if (preferences.dailyExpenseReminder) {
        const [hours, minutes] = preferences.dailyReminderTime.split(':');
        const reminderHour = parseInt(hours);
        const reminderMinute = parseInt(minutes);

        if (now.getHours() === reminderHour && now.getMinutes() === reminderMinute) {
          notificationService.sendDailyExpenseReminder();
        }
      }
    };
    setInterval(checkDailyReminder, 60 * 1000); // Check every minute

    // Generate weekly summary on Sundays at 8 PM
    const checkWeeklySummary = () => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 20) { // Sunday at 8 PM
        this.generateWeeklySummary(budgets, transactions);
      }
    };
    setInterval(checkWeeklySummary, 60 * 60 * 1000); // Check every hour

    // Generate monthly summary on the last day of month at 8 PM
    const checkMonthlySummary = () => {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (now.getDate() === lastDayOfMonth && now.getHours() === 20) {
        this.generateMonthlySummary(budgets, transactions);
      }
    };
    setInterval(checkMonthlySummary, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Manually trigger budget analysis (for testing or immediate checks)
   */
  async triggerImmediateAnalysis(budgets: Budget[], transactions: Transaction[]): Promise<void> {
    await this.analyzeBudgetUsage(budgets, transactions);
    await this.checkBillReminders(budgets);
  }

  /**
   * Manually trigger daily expense reminder (for testing)
   */
  async triggerDailyExpenseReminder(): Promise<void> {
    await notificationService.sendDailyExpenseReminder();
  }
}

// Export singleton instance
export const budgetMonitoringService = new BudgetMonitoringService();
export default budgetMonitoringService;
