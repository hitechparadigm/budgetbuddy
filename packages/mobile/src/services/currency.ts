/**
 * Currency Service
 * Handles currency selection, formatting, and conversion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  decimalPlaces: number;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

export interface CurrencyConversion {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  timestamp: number;
}

const STORAGE_KEYS = {
  SELECTED_CURRENCY: 'selected_currency',
  EXCHANGE_RATES: 'exchange_rates',
  LAST_RATE_UPDATE: 'last_rate_update',
} as const;

// Supported currencies with their formatting information
export const SUPPORTED_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    decimalPlaces: 2,
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'de-DE',
    decimalPlaces: 2,
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    locale: 'en-GB',
    decimalPlaces: 2,
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    locale: 'en-CA',
    decimalPlaces: 2,
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    locale: 'en-AU',
    decimalPlaces: 2,
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    locale: 'ja-JP',
    decimalPlaces: 0,
  },
  {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    locale: 'de-CH',
    decimalPlaces: 2,
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    locale: 'zh-CN',
    decimalPlaces: 2,
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    locale: 'en-IN',
    decimalPlaces: 2,
  },
  {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    locale: 'pt-BR',
    decimalPlaces: 2,
  },
];

// Default exchange rates (fallback when API is unavailable)
const DEFAULT_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: {
    EUR: 0.85,
    GBP: 0.73,
    CAD: 1.25,
    AUD: 1.35,
    JPY: 110.0,
    CHF: 0.92,
    CNY: 6.45,
    INR: 74.5,
    BRL: 5.2,
  },
  EUR: {
    USD: 1.18,
    GBP: 0.86,
    CAD: 1.47,
    AUD: 1.59,
    JPY: 129.4,
    CHF: 1.08,
    CNY: 7.6,
    INR: 87.8,
    BRL: 6.1,
  },
  // Add more base currencies as needed
};

class CurrencyService {
  private selectedCurrency: Currency = SUPPORTED_CURRENCIES[0]; // Default to USD
  private exchangeRates: Map<string, ExchangeRate[]> = new Map();
  private lastRateUpdate: number = 0;
  private readonly RATE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Initialize currency service
   */
  async initialize(): Promise<void> {
    try {
      await this.loadSelectedCurrency();
      await this.loadExchangeRates();

      // Update rates if they're stale
      if (this.shouldUpdateRates()) {
        await this.updateExchangeRates();
      }
    } catch (error) {
      console.error('Failed to initialize currency service:', error);
    }
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return SUPPORTED_CURRENCIES;
  }

  /**
   * Get currently selected currency
   */
  getSelectedCurrency(): Currency {
    return this.selectedCurrency;
  }

  /**
   * Set selected currency
   */
  async setSelectedCurrency(currencyCode: string): Promise<void> {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) {
      throw new Error(`Unsupported currency: ${currencyCode}`);
    }

    this.selectedCurrency = currency;
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CURRENCY, currencyCode);
  }

  /**
   * Format amount in the selected currency
   */
  formatAmount(amount: number, currencyCode?: string): string {
    const currency = currencyCode
      ? SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || this.selectedCurrency
      : this.selectedCurrency;

    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: currency.decimalPlaces,
        maximumFractionDigits: currency.decimalPlaces,
      }).format(amount);
    } catch (error) {
      // Fallback formatting if Intl.NumberFormat fails
      const formattedAmount = currency.decimalPlaces > 0
        ? amount.toFixed(currency.decimalPlaces)
        : Math.round(amount).toString();
      return `${currency.symbol}${formattedAmount}`;
    }
  }

  /**
   * Format amount with explicit currency display
   */
  formatAmountWithCurrency(amount: number, currencyCode?: string): string {
    const currency = currencyCode
      ? SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || this.selectedCurrency
      : this.selectedCurrency;

    const formattedAmount = this.formatAmount(amount, currencyCode);
    return `${formattedAmount} (${currency.code})`;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> {
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: amount,
        convertedCurrency: toCurrency,
        exchangeRate: 1,
        timestamp: Date.now(),
      };
    }

    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate.rate;

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      convertedCurrency: toCurrency,
      exchangeRate: exchangeRate.rate,
      timestamp: exchangeRate.timestamp,
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    // Same currency should always return rate of 1
    if (fromCurrency === toCurrency) {
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: 1,
        timestamp: Date.now(),
      };
    }

    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const rates = this.exchangeRates.get(fromCurrency) || [];
    const cachedRate = rates.find(r => r.to === toCurrency);

    // Return cached rate if it's still fresh
    if (cachedRate && !this.isRateStale(cachedRate.timestamp)) {
      return cachedRate;
    }

    // Try to fetch fresh rate
    try {
      const freshRate = await this.fetchExchangeRate(fromCurrency, toCurrency);
      this.cacheExchangeRate(freshRate);
      return freshRate;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);

      // Return cached rate even if stale, or fallback rate
      if (cachedRate) {
        return cachedRate;
      }

      return this.getFallbackExchangeRate(fromCurrency, toCurrency);
    }
  }

  /**
   * Update all exchange rates
   */
  async updateExchangeRates(): Promise<void> {
    try {
      const baseCurrency = this.selectedCurrency.code;
      const targetCurrencies = SUPPORTED_CURRENCIES
        .filter(c => c.code !== baseCurrency)
        .map(c => c.code);

      const updatePromises = targetCurrencies.map(async (targetCurrency) => {
        try {
          const rate = await this.fetchExchangeRate(baseCurrency, targetCurrency);
          this.cacheExchangeRate(rate);
        } catch (error) {
          console.error(`Failed to update rate for ${baseCurrency}-${targetCurrency}:`, error);
        }
      });

      await Promise.allSettled(updatePromises);
      this.lastRateUpdate = Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_RATE_UPDATE, this.lastRateUpdate.toString());
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
    }
  }

  /**
   * Get currency by code
   */
  getCurrencyByCode(code: string): Currency | undefined {
    return SUPPORTED_CURRENCIES.find(c => c.code === code);
  }

  /**
   * Check if amount is in a different currency than selected
   */
  isDifferentCurrency(currencyCode: string): boolean {
    return currencyCode !== this.selectedCurrency.code;
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currencyCode?: string): string {
    const currency = currencyCode
      ? SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)
      : this.selectedCurrency;
    return currency?.symbol || '$';
  }

  /**
   * Load selected currency from storage
   */
  private async loadSelectedCurrency(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CURRENCY);
      if (stored) {
        const currency = SUPPORTED_CURRENCIES.find(c => c.code === stored);
        if (currency) {
          this.selectedCurrency = currency;
        }
      }
    } catch (error) {
      console.error('Failed to load selected currency:', error);
    }
  }

  /**
   * Load exchange rates from storage
   */
  private async loadExchangeRates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES);
      const lastUpdate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_RATE_UPDATE);

      if (stored) {
        const ratesData = JSON.parse(stored);
        this.exchangeRates = new Map(Object.entries(ratesData));
      }

      if (lastUpdate) {
        this.lastRateUpdate = parseInt(lastUpdate, 10);
      }
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
    }
  }

  /**
   * Save exchange rates to storage
   */
  private async saveExchangeRates(): Promise<void> {
    try {
      const ratesData = Object.fromEntries(this.exchangeRates);
      await AsyncStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(ratesData));
    } catch (error) {
      console.error('Failed to save exchange rates:', error);
    }
  }

  /**
   * Fetch exchange rate from API (mock implementation)
   */
  private async fetchExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    // In a real implementation, this would call an exchange rate API
    // For now, we'll simulate an API call with default rates
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

    const rate = this.getFallbackExchangeRate(fromCurrency, toCurrency);

    // Add some realistic variation to the rate (±2%)
    const variation = (Math.random() - 0.5) * 0.04; // -2% to +2%
    const adjustedRate = rate.rate * (1 + variation);

    return {
      from: fromCurrency,
      to: toCurrency,
      rate: adjustedRate,
      timestamp: Date.now(),
    };
  }

  /**
   * Get fallback exchange rate from default rates
   */
  private getFallbackExchangeRate(fromCurrency: string, toCurrency: string): ExchangeRate {
    const baseRates = DEFAULT_EXCHANGE_RATES[fromCurrency];
    let rate = 1;

    if (baseRates && baseRates[toCurrency]) {
      rate = baseRates[toCurrency];
    } else if (DEFAULT_EXCHANGE_RATES[toCurrency] && DEFAULT_EXCHANGE_RATES[toCurrency][fromCurrency]) {
      // Try reverse rate
      rate = 1 / DEFAULT_EXCHANGE_RATES[toCurrency][fromCurrency];
    } else {
      // Cross-currency conversion through USD
      const fromToUsd = fromCurrency === 'USD' ? 1 : (DEFAULT_EXCHANGE_RATES.USD[fromCurrency] ? 1 / DEFAULT_EXCHANGE_RATES.USD[fromCurrency] : 1);
      const usdToTarget = toCurrency === 'USD' ? 1 : (DEFAULT_EXCHANGE_RATES.USD[toCurrency] || 1);
      rate = fromToUsd * usdToTarget;
    }

    return {
      from: fromCurrency,
      to: toCurrency,
      rate,
      timestamp: Date.now() - this.RATE_CACHE_DURATION, // Mark as stale to encourage updates
    };
  }

  /**
   * Cache exchange rate
   */
  private cacheExchangeRate(rate: ExchangeRate): void {
    const rates = this.exchangeRates.get(rate.from) || [];
    const existingIndex = rates.findIndex(r => r.to === rate.to);

    if (existingIndex >= 0) {
      rates[existingIndex] = rate;
    } else {
      rates.push(rate);
    }

    this.exchangeRates.set(rate.from, rates);
    this.saveExchangeRates();
  }

  /**
   * Check if rates should be updated
   */
  private shouldUpdateRates(): boolean {
    return Date.now() - this.lastRateUpdate > this.RATE_CACHE_DURATION;
  }

  /**
   * Check if a rate is stale
   */
  private isRateStale(timestamp: number): boolean {
    return Date.now() - timestamp > this.RATE_CACHE_DURATION;
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();
export default currencyService;
