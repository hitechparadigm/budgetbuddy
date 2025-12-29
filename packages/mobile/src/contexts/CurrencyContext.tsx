/**
 * Currency Context
 * Provides currency state and functions throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { currencyService, Currency, CurrencyConversion } from '../services/currency';

interface CurrencyContextType {
  selectedCurrency: Currency;
  isLoading: boolean;
  setSelectedCurrency: (currency: Currency) => Promise<void>;
  formatAmount: (amount: number, currencyCode?: string) => string;
  formatAmountWithCurrency: (amount: number, currencyCode?: string) => string;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => Promise<CurrencyConversion>;
  getSupportedCurrencies: () => Currency[];
  getCurrencySymbol: (currencyCode?: string) => string;
  isDifferentCurrency: (currencyCode: string) => boolean;
  updateExchangeRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(currencyService.getSelectedCurrency());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeCurrencyService();
  }, []);

  const initializeCurrencyService = async () => {
    try {
      setIsLoading(true);
      await currencyService.initialize();
      setSelectedCurrencyState(currencyService.getSelectedCurrency());
    } catch (error) {
      console.error('Failed to initialize currency service:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setSelectedCurrency = async (currency: Currency) => {
    try {
      await currencyService.setSelectedCurrency(currency.code);
      setSelectedCurrencyState(currency);
    } catch (error) {
      console.error('Failed to set selected currency:', error);
      throw error;
    }
  };

  const formatAmount = (amount: number, currencyCode?: string): string => {
    return currencyService.formatAmount(amount, currencyCode);
  };

  const formatAmountWithCurrency = (amount: number, currencyCode?: string): string => {
    return currencyService.formatAmountWithCurrency(amount, currencyCode);
  };

  const convertAmount = async (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> => {
    return currencyService.convertAmount(amount, fromCurrency, toCurrency);
  };

  const getSupportedCurrencies = (): Currency[] => {
    return currencyService.getSupportedCurrencies();
  };

  const getCurrencySymbol = (currencyCode?: string): string => {
    return currencyService.getCurrencySymbol(currencyCode);
  };

  const isDifferentCurrency = (currencyCode: string): boolean => {
    return currencyService.isDifferentCurrency(currencyCode);
  };

  const updateExchangeRates = async (): Promise<void> => {
    return currencyService.updateExchangeRates();
  };

  const value: CurrencyContextType = {
    selectedCurrency,
    isLoading,
    setSelectedCurrency,
    formatAmount,
    formatAmountWithCurrency,
    convertAmount,
    getSupportedCurrencies,
    getCurrencySymbol,
    isDifferentCurrency,
    updateExchangeRates,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
