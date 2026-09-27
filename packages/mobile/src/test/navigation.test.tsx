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

jest.mock('../screens/GoalsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockGoalsScreen() {
    return (
      <View testID="goals-screen">
        <Text>Goals Screen</Text>
      </View>
    );
  };
});

jest.mock('../screens/MoreScreen', () => {
  const { View, Text } = require('react-native');
  return function MockMoreScreen() {
    return (
      <View testID="more-screen">
        <Text>More Screen</Text>
      </View>
    );
  };
});

// The More tab's stack navigator imports every screen it can push to
// (see RootNavigator.tsx MoreStackNavigator) even though only MoreMenu
// renders by default. Several of these screens import AuthContext, which
// transitively pulls in native Expo/Amplify modules unavailable in Jest,
// so each needs a lightweight mock here too.
function mockScreen(testId: string, label: string) {
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return (
      <View testID={testId}>
        <Text>{label}</Text>
      </View>
    );
  };
}

jest.mock('../screens/BillsScreen', () => mockScreen('bills-screen', 'Bills Screen'));
jest.mock('../screens/InsightsScreen', () => ({
  InsightsScreen: mockScreen('insights-screen', 'Insights Screen'),
}));
jest.mock('../screens/BankSyncScreen', () => ({
  BankSyncScreen: mockScreen('banksync-screen', 'BankSync Screen'),
}));
jest.mock('../screens/CreditScoreScreen', () => ({
  CreditScoreScreen: mockScreen('creditscore-screen', 'CreditScore Screen'),
}));
jest.mock('../screens/DebtPayoffScreen', () => mockScreen('debtpayoff-screen', 'DebtPayoff Screen'));
jest.mock('../screens/InvestmentsScreen', () => ({
  InvestmentsScreen: mockScreen('investments-screen', 'Investments Screen'),
}));
jest.mock('../screens/NetWorthScreen', () => ({
  NetWorthScreen: mockScreen('networth-screen', 'NetWorth Screen'),
}));
jest.mock('../screens/SubscriptionsScreen', () => mockScreen('subscriptions-screen', 'Subscriptions Screen'));
jest.mock('../screens/TipsScreen', () => mockScreen('tips-screen', 'Tips Screen'));
jest.mock('../screens/SyncSettingsScreen', () => mockScreen('syncsettings-screen', 'SyncSettings Screen'));
jest.mock('../screens/OfflineSettingsScreen', () => mockScreen('offlinesettings-screen', 'OfflineSettings Screen'));

describe('Navigation Structure', () => {
  it('should render bottom tab navigator with all tabs', () => {
    const { getAllByText, getByText } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );

    // "Budget" and "Transactions" each render twice: once as the tab bar
    // label, once as the stack navigator's header title (BudgetStackNavigator/
    // TransactionStackNavigator set their own header via stackHeaderOptions).
    expect(getAllByText('Budget').length).toBeGreaterThan(0);
    expect(getAllByText('Transactions').length).toBeGreaterThan(0);
    expect(getByText('Goals')).toBeTruthy();
    expect(getByText('Summary')).toBeTruthy();
    expect(getByText('More')).toBeTruthy();
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
