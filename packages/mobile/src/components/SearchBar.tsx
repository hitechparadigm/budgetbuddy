/**
 * SearchBar Component
 * Debounced search input for transaction filtering
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { useHaptics } from "../hooks/useHaptics";

interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes (debounced) */
  onChangeText: (text: string) => void;
  /** Callback when clear button is pressed */
  onClear?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = "Search transactions...",
  debounceMs = 300,
  style,
  autoFocus = false,
}: SearchBarProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChangeText(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChangeText, value]);

  const handleClear = useCallback(() => {
    haptics.light();
    setLocalValue("");
    onChangeText("");
    onClear?.();
  }, [haptics, onChangeText, onClear]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 48,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 8,
      marginRight: 8,
    },
    clearButton: {
      padding: 4,
    },
  });

  return (
    <View style={[dynamicStyles.container, style]}>
      <Ionicons name="search" size={20} color={colors.textSecondary} />
      <TextInput
        style={dynamicStyles.input}
        value={localValue}
        onChangeText={setLocalValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search"
        accessibilityHint="Enter text to search transactions"
      />
      {localValue.length > 0 && (
        <Pressable
          style={dynamicStyles.clearButton}
          onPress={handleClear}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}
