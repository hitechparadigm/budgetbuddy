import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootTabParamList, BudgetStackParamList, TransactionStackParamList } from '@/types';
import BudgetScreen from '@/screens/BudgetScreen';
import TransactionsScreen from '@/screens/TransactionsScreen';
import SummaryScreen from '@/screens/SummaryScreen';
import GoalsScreen from '@/screens/GoalsScreen';
import MoreScreen from '@/screens/MoreScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import BillsScreen from '@/screens/BillsScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { BankSyncScreen } from '@/screens/BankSyncScreen';
import { CreditScoreScreen } from '@/screens/CreditScoreScreen';
import DebtPayoffScreen from '@/screens/DebtPayoffScreen';
import { InvestmentsScreen } from '@/screens/InvestmentsScreen';
import { NetWorthScreen } from '@/screens/NetWorthScreen';
import SubscriptionsScreen from '@/screens/SubscriptionsScreen';
import TipsScreen from '@/screens/TipsScreen';
import SyncSettingsScreen from '@/screens/SyncSettingsScreen';
import OfflineSettingsScreen from '@/screens/OfflineSettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const BudgetStack = createStackNavigator<BudgetStackParamList>();
const TransactionStack = createStackNavigator<TransactionStackParamList>();

/**
 * More tab's stack - hub menu (MoreScreen) plus every screen that was
 * previously built but had zero navigator route (see mobile-app spec task 6.4).
 */
export type MoreStackParamList = {
  MoreMenu: undefined;
  Bills: undefined;
  Insights: undefined;
  BankSync: undefined;
  CreditScore: undefined;
  DebtPayoff: undefined;
  Investments: undefined;
  NetWorth: undefined;
  Subscriptions: undefined;
  Tips: undefined;
  SyncSettings: undefined;
  OfflineSettings: undefined;
  Settings: undefined;
};

const MoreStack = createStackNavigator<MoreStackParamList>();

const stackHeaderOptions = {
  headerStyle: {
    backgroundColor: '#10b981',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: 'bold' as const,
  },
};

function BudgetStackNavigator() {
  return (
    <BudgetStack.Navigator screenOptions={stackHeaderOptions}>
      <BudgetStack.Screen
        name="BudgetList"
        component={BudgetScreen}
        options={{ title: 'Budget' }}
      />
    </BudgetStack.Navigator>
  );
}

function TransactionStackNavigator() {
  return (
    <TransactionStack.Navigator screenOptions={stackHeaderOptions}>
      <TransactionStack.Screen
        name="TransactionList"
        component={TransactionsScreen}
        options={{ title: 'Transactions' }}
      />
    </TransactionStack.Navigator>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={stackHeaderOptions}>
      <MoreStack.Screen
        name="MoreMenu"
        component={MoreScreen}
        options={{ title: 'More' }}
      />
      <MoreStack.Screen name="Bills" component={BillsScreen} options={{ title: 'Bills' }} />
      <MoreStack.Screen name="Insights" component={InsightsScreen} options={{ title: 'Insights' }} />
      <MoreStack.Screen name="BankSync" component={BankSyncScreen} options={{ title: 'Accounts' }} />
      <MoreStack.Screen name="CreditScore" component={CreditScoreScreen} options={{ title: 'Credit Score' }} />
      <MoreStack.Screen name="DebtPayoff" component={DebtPayoffScreen} options={{ title: 'Debt Payoff' }} />
      <MoreStack.Screen name="Investments" component={InvestmentsScreen} options={{ title: 'Investments' }} />
      <MoreStack.Screen name="NetWorth" component={NetWorthScreen} options={{ title: 'Net Worth' }} />
      <MoreStack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: 'Subscriptions' }} />
      <MoreStack.Screen name="Tips" component={TipsScreen} options={{ title: 'Tips' }} />
      <MoreStack.Screen name="SyncSettings" component={SyncSettingsScreen} options={{ title: 'Sync Settings' }} />
      <MoreStack.Screen name="OfflineSettings" component={OfflineSettingsScreen} options={{ title: 'Offline Settings' }} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </MoreStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Budget') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Goals') {
            iconName = focused ? 'flag' : 'flag-outline';
          } else if (route.name === 'Summary') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Budget" component={BudgetStackNavigator} />
      <Tab.Screen name="Transactions" component={TransactionStackNavigator} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Summary" component={SummaryScreen} />
      <Tab.Screen name="More" component={MoreStackNavigator} />
    </Tab.Navigator>
  );
}