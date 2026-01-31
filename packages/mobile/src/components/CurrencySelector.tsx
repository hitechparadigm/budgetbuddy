/**
 * Mobile Currency Selector Component
 *
 * Touch-optimized currency selector for React Native
 * Supports all 6 currencies with native picker
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  getSupportedCurrencies,
  getCurrencySymbol,
} from "@budget-buddy/shared/src/utils/currency";

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  disabled?: boolean;
  label?: string;
  error?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  label = "Currency",
  error,
}) => {
  const currencies = getSupportedCurrencies();

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.pickerContainer, error && styles.pickerError]}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          enabled={!disabled}
          style={styles.picker}
        >
          {currencies.map((currency) => (
            <Picker.Item
              key={currency.code}
              label={`${getCurrencySymbol(currency.code)} ${currency.code} - ${currency.name}`}
              value={currency.code}
            />
          ))}
        </Picker>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  pickerError: {
    borderColor: "#EF4444",
  },
  picker: {
    height: 50,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
});
