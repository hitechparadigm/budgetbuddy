/**
 * Navigation Structure Test
 *
 * Tests that the bottom tab navigation is properly configured
 * and all screens are accessible.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '../navigation/RootNavigator';

// Mock the screens to avoid dependency issues
jest.mock('../screens/BudgetScreen', () => {
  const { View, Text } = require('react-native');
  return function MockBudgetScreen() {
    return (
      <View testID="budget-screen">
        <Text>Budget Screen</Text>
      </View>
    );
  };
});

jest.mock('../screens/TransactionsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockTransactionsScreen() {
    return (
      <View testID="transactions-screen">
        <Text>Transactions Screen</Text>
      </View>
    );
  };
});

jest.mock('../screens/SummaryScreen', () => {
  const { View, Text } = require('react-native');
  return function MockSummaryScreen() {
    return (
      <View testID="summary-screen">
        <Text>Summary Screen</Text>
      </View>
    );
  };
});

jest.mock('../screens/SettingsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockSettingsScreen() {
    return (
      <View testID="settings-screen">
        <Text>Settings Screen</Text>
      </View>
    );
  };
});

describe('Navigation Structure', () => {
  it('should render bottom tab navigator with all tabs', () => {
    const { getByText } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );

    // Check that tab labels are present
    expect(getByText('Budget')).toBeTruthy();
    expect(getByText('Transactions')).toBeTruthy();
    expect(getByText('Summary')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });

  it('should render the default screen (Budget)', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );

    // Budget screen should be rendered by default
    expect(getByTestId('budget-screen')).toBeTruthy();
  });
});
