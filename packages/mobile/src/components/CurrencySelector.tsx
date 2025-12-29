/**
 * Currency Selector Component
 * Allows users to select their preferred currency
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Button } from './ui';
import { useTheme } from '../hooks/useTheme';
import { currencyService, Currency, SUPPORTED_CURRENCIES } from '../services/currency';

interface CurrencySelectorProps {
  visible: boolean;
  onClose: () => void;
  onCurrencySelect: (currency: Currency) => void;
  selectedCurrency?: Currency;
}

export default function CurrencySelector({
  visible,
  onClose,
  onCurrencySelect,
  selectedCurrency,
}: CurrencySelectorProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCurrencies, setFilteredCurrencies] = useState<Currency[]>(SUPPORTED_CURRENCIES);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = SUPPORTED_CURRENCIES.filter(currency =>
        currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCurrencies(filtered);
    } else {
      setFilteredCurrencies(SUPPORTED_CURRENCIES);
    }
  }, [searchQuery]);

  const handleCurrencySelect = async (currency: Currency) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCurrencySelect(currency);
    onClose();
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => {
    const isSelected = selectedCurrency?.code === item.code;

    return (
      <Pressable
        style={[
          dynamicStyles.currencyItem,
          isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
        ]}
        onPress={() => handleCurrencySelect(item)}
      >
        <View style={dynamicStyles.currencyInfo}>
          <View style={dynamicStyles.currencyHeader}>
            <Text style={dynamicStyles.currencySymbol}>{item.symbol}</Text>
            <Text style={dynamicStyles.currencyCode}>{item.code}</Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </View>
          <Text style={dynamicStyles.currencyName}>{item.name}</Text>
          <Text style={dynamicStyles.currencyExample}>
            Example: {currencyService.formatAmount(1234.56, item.code)}
          </Text>
        </View>
      </Pressable>
    );
  };

  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: colors.background,
      borderRadius: 16,
      margin: 20,
      maxHeight: '80%',
      width: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencyList: {
      flex: 1,
      paddingHorizontal: 20,
    },
    currencyItem: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencyInfo: {
      flex: 1,
    },
    currencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    currencySymbol: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
      marginRight: 12,
      minWidth: 32,
    },
    currencyCode: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    currencyName: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
      marginLeft: 44,
    },
    currencyExample: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginLeft: 44,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.overlay}>
        <View style={dynamicStyles.container}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.headerTitle}>Select Currency</Text>
            <Pressable style={dynamicStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={dynamicStyles.searchContainer}>
            <TextInput
              style={dynamicStyles.searchInput}
              placeholder="Search currencies..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Currency List */}
          <FlatList
            style={dynamicStyles.currencyList}
            data={filteredCurrencies}
            renderItem={renderCurrencyItem}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={dynamicStyles.emptyContainer}>
                <Text style={dynamicStyles.emptyText}>
                  No currencies found matching "{searchQuery}"
                </Text>
              </View>
            )}
          />

          {/* Footer */}
          <View style={dynamicStyles.footer}>
            <Text style={dynamicStyles.footerText}>
              Exchange rates are updated daily and may vary from actual market rates.
              {'\n'}Conversion is for reference only.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Currency Display Component
 * Shows current currency with option to change
 */
interface CurrencyDisplayProps {
  currency: Currency;
  onPress: () => void;
  showChangeButton?: boolean;
}

export function CurrencyDisplay({
  currency,
  onPress,
  showChangeButton = true
}: CurrencyDisplayProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    currencySymbol: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
      marginRight: 12,
      minWidth: 28,
    },
    currencyDetails: {
      flex: 1,
    },
    currencyCode: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    currencyName: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    changeButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.primary + '20',
      borderRadius: 6,
    },
    changeButtonText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
  });

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.currencyInfo}>
        <Text style={styles.currencySymbol}>{currency.symbol}</Text>
        <View style={styles.currencyDetails}>
          <Text style={styles.currencyCode}>{currency.code}</Text>
          <Text style={styles.currencyName}>{currency.name}</Text>
        </View>
      </View>
      {showChangeButton && (
        <View style={styles.changeButton}>
          <Text style={styles.changeButtonText}>Change</Text>
        </View>
      )}
    </Pressable>
  );
}
