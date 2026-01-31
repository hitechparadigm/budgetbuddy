/**
 * Currency Selector Component
 * Allows users to select their preferred currency from supported options
 */

import React from "react";
import {
  getSupportedCurrencies,
  CurrencyConfig,
} from "@budget-buddy/shared/src/utils/currency";

export interface CurrencySelectorProps {
  /** Currently selected currency code */
  value: string;
  /** Callback when currency changes */
  onChange: (currencyCode: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether currency selection is required */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Label for the selector */
  label?: string;
  /** Show full currency name in dropdown */
  showFullName?: boolean;
}

/**
 * Currency Selector Component
 *
 * Provides a dropdown for selecting from all supported currencies.
 * Displays currency symbol, code, and optionally the full name.
 *
 * @example
 * ```tsx
 * <CurrencySelector
 *   value="USD"
 *   onChange={(code) => setUserCurrency(code)}
 *   required
 *   label="Select your currency"
 * />
 * ```
 */
export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
  label = "Currency",
  showFullName = true,
}) => {
  const currencies = getSupportedCurrencies();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  const formatCurrencyOption = (currency: CurrencyConfig): string => {
    if (showFullName) {
      return `${currency.symbol} ${currency.code} - ${currency.name}`;
    }
    return `${currency.symbol} ${currency.code}`;
  };

  return (
    <div className={`currency-selector ${className}`}>
      {label && (
        <label htmlFor="currency-select" className="currency-selector-label">
          {label}
          {required && <span className="required-indicator"> *</span>}
        </label>
      )}
      <select
        id="currency-select"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className="currency-selector-dropdown"
        aria-label={label}
      >
        <option value="" disabled>
          Select a currency
        </option>
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {formatCurrencyOption(currency)}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Compact Currency Selector Component
 *
 * A minimal version showing only symbol and code
 */
export const CurrencySelectorCompact: React.FC<CurrencySelectorProps> = (
  props,
) => {
  return <CurrencySelector {...props} showFullName={false} />;
};
