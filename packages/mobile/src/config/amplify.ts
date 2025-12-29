/**
 * AWS Amplify Configuration for React Native
 *
 * This configuration connects the mobile app to the existing AWS backend
 * infrastructure including Cognito User Pool for authentication.
 */

import { Amplify } from 'aws-amplify';

// Configuration for AWS Amplify
// These values should match your existing AWS backend configuration
const amplifyConfig = {
  Auth: {
    // AWS Cognito User Pool configuration
    region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
    userPoolId: process.env.EXPO_PUBLIC_USER_POOL_ID || '',
    userPoolWebClientId: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID || '',

    // Optional: Cognito Identity Pool for AWS service access
    identityPoolId: process.env.EXPO_PUBLIC_IDENTITY_POOL_ID || '',

    // Authentication flow configuration
    authenticationFlowType: 'USER_SRP_AUTH',

    // Password policy (should match your Cognito configuration)
    passwordPolicy: {
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
    },
  },

  API: {
    endpoints: [
      {
        name: 'budgetbuddy-api',
        endpoint: process.env.EXPO_PUBLIC_API_URL || 'https://api.budgetbuddy.com',
        region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
      },
    ],
  },
};

// Configure Amplify
Amplify.configure(amplifyConfig);

export default amplifyConfig;
