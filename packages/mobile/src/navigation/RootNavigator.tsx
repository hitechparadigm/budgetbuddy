import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootTabParamList, BudgetStackParamList, TransactionStackParamList } from '@/types';
import BudgetScreen from '@/screens/BudgetScreen';
import TransactionsScreen from '@/screens/TransactionsScreen';
import SummaryScreen from '@/screens/SummaryScreen';
import SettingsScreen from '@/screens/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const BudgetStack = createStackNavigator<BudgetStackParamList>();
const TransactionStack = createStackNavigator<TransactionStackParamList>();

function BudgetStackNavigator() {
  return (
    <BudgetStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#10b981',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
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
    <TransactionStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#10b981',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <TransactionStack.Screen
        name="TransactionList"
        component={TransactionsScreen}
        options={{ title: 'Transactions' }}
      />
    </TransactionStack.Navigator>
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
          } else if (route.name === 'Summary') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
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
      <Tab.Screen name="Summary" component={SummaryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
