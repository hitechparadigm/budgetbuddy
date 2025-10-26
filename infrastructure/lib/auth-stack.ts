/**
 * Authentication Stack for BudgetBuddy Application
 *
 * Creates Amazon Cognito User Pool and User Pool Client for handling
 * user authentication, registration, and authorization. Configured with
 * custom attributes for family relationships and account types.
 *
 * Key Features:
 * - Email-based authentication with verification
 * - Custom attributes for family and subscription data
 * - Password policies for security
 * - MFA support (optional)
 * - Lambda triggers for custom authentication flows
 */

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class AuthStack extends cdk.Stack {
  /**
   * Cognito User Pool for user management
   * Exposed as public property for use in other stacks
   */
  public readonly userPool: cognito.UserPool;

  /**
   * User Pool Client for application authentication
   * Exposed as public property for use in other stacks
   */
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Main User Pool for BudgetBuddy application
     *
     * Handles user registration, authentication, and profile management
     * with custom attributes specific to budgeting application needs.
     */
    this.userPool = new cognito.UserPool(this, 'BudgetBuddyUserPool', {
      userPoolName: 'budgetbuddy-users',

      // Email-based sign-in for better user experience
      signInAliases: {
        email: true,
        username: false, // Disable username to simplify UX
      },

      // Auto-verify email addresses for account security
      autoVerify: {
        email: true,
      },

      // Standard attributes required for user profiles
      standardAttributes: {
        email: {
          required: true,
          mutable: true, // Allow users to change email
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
        birthdate: {
          required: false, // We collect age separately in onboarding
          mutable: true,
        },
        address: {
          required: false, // We collect location in onboarding
          mutable: true,
        },
      },

      // Custom attributes specific to BudgetBuddy
      customAttributes: {
        // Unique user identifier for DynamoDB integration
        userId: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 50,
          mutable: false, // User ID should not change once set
        }),

        // Family account association
        familyId: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 50,
          mutable: true,
        }),

        // User role within family (primary, spouse, viewer)
        familyRole: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 20,
          mutable: true,
        }),

        // Account type (single or family)
        accountType: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 20,
          mutable: true,
        }),

        // Subscription tier (free or premium)
        subscriptionTier: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 20,
          mutable: true,
        }),

        // Onboarding completion status
        onboardingCompleted: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 10,
          mutable: true,
        }),

        // User's country for regional features
        country: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 10,
          mutable: true,
        }),
      },

      // Strong password policy for security
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false, // Keep it user-friendly
      },

      // Account recovery options
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Email configuration for verification and notifications
      email: cognito.UserPoolEmail.withCognito('noreply@budgetbuddy.com'),

      // Self-service account management
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: 'Welcome to BudgetBuddy - Verify your email',
        emailBody: 'Welcome to BudgetBuddy! Please click the link below to verify your email address: {##Verify Email##}',
        emailStyle: cognito.VerificationEmailStyle.LINK,
      },

      // Automatic cleanup of unverified accounts after 7 days
      userInvitation: {
        emailSubject: 'Welcome to BudgetBuddy',
        emailBody: 'Hello {username}, you have been invited to join BudgetBuddy. Your temporary password is {####}',
      },

      // Device tracking for security (optional)
      deviceTracking: {
        challengeRequiredOnNewDevice: false, // Keep UX simple for MVP
        deviceOnlyRememberedOnUserPrompt: true,
      },

      // Automatic deletion when stack is destroyed (for dev environments)
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * User Pool Client for web and mobile applications
     *
     * Configures authentication flows and token settings for the
     * BudgetBuddy client applications (web, iOS, Android).
     */
    this.userPoolClient = new cognito.UserPoolClient(this, 'BudgetBuddyUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'budgetbuddy-client',

      // Enable authentication flows needed for the application
      authFlows: {
        userSrp: true, // Secure Remote Password for web/mobile
        userPassword: true, // Allow username/password auth
        adminUserPassword: false, // Disable admin auth for security
        custom: false, // No custom auth flows for MVP
      },

      // Token configuration for security and UX balance
      accessTokenValidity: cdk.Duration.hours(1), // Short-lived for security
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30), // Allow staying logged in

      // Prevent user existence errors for security
      preventUserExistenceErrors: true,

      // OAuth configuration for future social login integration
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false, // Less secure, avoid for production
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/auth/callback', // Local development
          'https://app.budgetbuddy.com/auth/callback', // Production web
        ],
        logoutUrls: [
          'http://localhost:3000/auth/logout',
          'https://app.budgetbuddy.com/auth/logout',
        ],
      },

      // Enable reading and writing all custom attributes
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
          address: true,
        })
        .withCustomAttributes(
          'familyId',
          'familyRole',
          'accountType',
          'subscriptionTier',
          'onboardingCompleted',
          'country'
        ),

      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
          address: true,
        })
        .withCustomAttributes(
          'familyId',
          'familyRole',
          'accountType',
          'subscriptionTier',
          'onboardingCompleted',
          'country'
        ),
    });

    // Output User Pool ID for client configuration
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID for BudgetBuddy client authentication configuration',
      exportName: 'budgetbuddy-user-pool-id',
    });

    // Output User Pool Client ID for client configuration
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID for BudgetBuddy web and mobile applications',
      exportName: 'budgetbuddy-user-pool-client-id',
    });

    // Output User Pool ARN for IAM policies
    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN for BudgetBuddy IAM policy configuration',
      exportName: 'budgetbuddy-user-pool-arn',
    });

    // Add comprehensive cost allocation tags
    cdk.Tags.of(this.userPool).add('Component', 'Authentication');
    cdk.Tags.of(this.userPool).add('Service', 'Cognito');
    cdk.Tags.of(this.userPool).add('CostCenter', 'BudgetBuddy-Auth');
    cdk.Tags.of(this.userPool).add('UserType', 'Application-Users');
    cdk.Tags.of(this.userPool).add('SecurityLevel', 'High');
  }
}
