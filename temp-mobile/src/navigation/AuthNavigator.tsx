/**
 * Authentication Navigator for React Native
 *
 * Handles navigation between authentication screens including
 * login, registration, email verification, and password reset.
 */

import React from 'react';
import { createStackNavigator, StackScreenProps } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ConfirmSignUpScreen from '../screens/auth/ConfirmSignUpScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ConfirmSignUp: {
    email: string;
  };
  ForgotPassword: undefined;
  ResetPassword: {
    email: string;
  };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#f8f9fa' },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Sign In',
        }}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'Create Account',
        }}
      />

      <Stack.Screen
        name="ConfirmSignUp"
        component={ConfirmSignUpScreen}
        options={{
          title: 'Verify Email',
          gestureEnabled: false, // Prevent going back without verification
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
