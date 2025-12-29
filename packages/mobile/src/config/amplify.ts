/**
 * AWS Amplify Configuration for React Native
 *
 * This configuration connects the mobile app to the existing AWS backend
 * infrastructure including Cognito User Pool for authentication.
 */

import { Amplify } from 'aws-amplify';

// Simplified configuration for AWS Amplify v6
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_USER_POOL_ID || 'us-east-1_example',
      userPoolClientId: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID || 'example-client-id',
    },
  },
};

// Configure Amplify
Amplify.configure(amplifyConfig);

export default amplifyConfig;
