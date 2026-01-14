"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
class AuthStack extends cdk.Stack {
    constructor(scope, id, props) {
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
                .withCustomAttributes('userId', 'familyId', 'familyRole', 'accountType', 'subscriptionTier', 'onboardingCompleted', 'country'),
            writeAttributes: new cognito.ClientAttributes()
                .withStandardAttributes({
                email: true,
                givenName: true,
                familyName: true,
                address: true,
            })
                .withCustomAttributes('userId', 'familyId', 'familyRole', 'accountType', 'subscriptionTier', 'onboardingCompleted', 'country'),
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
        /**
         * Shared Lambda Layer for authentication utilities
         *
         * Contains common code used across all auth Lambda functions:
         * - CORS handling (cors.js)
         * - Token parsing (token-parser.js)
         * - Input validation (validators.js)
         * - Error formatting (errors.js)
         */
        this.authSharedLayer = new lambda.LayerVersion(this, 'AuthSharedLayer', {
            code: lambda.Code.fromAsset('../backend/layers/shared'),
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            description: 'Shared authentication utilities for BudgetBuddy auth Lambda functions',
            layerVersionName: 'budgetbuddy-auth-shared',
            removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep old versions for rollback
        });
        // Add comprehensive cost allocation tags
        cdk.Tags.of(this.userPool).add('Component', 'Authentication');
        cdk.Tags.of(this.userPool).add('Service', 'Cognito');
        cdk.Tags.of(this.userPool).add('CostCenter', 'BudgetBuddy-Auth');
        cdk.Tags.of(this.userPool).add('UserType', 'Application-Users');
        cdk.Tags.of(this.userPool).add('SecurityLevel', 'High');
        // Add tags to Lambda Layer
        cdk.Tags.of(this.authSharedLayer).add('Component', 'Authentication');
        cdk.Tags.of(this.authSharedLayer).add('Service', 'Lambda-Layer');
        cdk.Tags.of(this.authSharedLayer).add('CostCenter', 'BudgetBuddy-Auth');
        // Output Lambda Layer ARN for reference
        new cdk.CfnOutput(this, 'AuthSharedLayerArn', {
            value: this.authSharedLayer.layerVersionArn,
            description: 'Lambda Layer ARN for shared authentication utilities',
            exportName: 'budgetbuddy-auth-shared-layer-arn',
        });
    }
}
exports.AuthStack = AuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7O0dBYUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBR2pELE1BQWEsU0FBVSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBbUJ0QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCOzs7OztXQUtHO1FBQ0gsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ2hFLFlBQVksRUFBRSxtQkFBbUI7WUFFakMsaURBQWlEO1lBQ2pELGFBQWEsRUFBRTtnQkFDYixLQUFLLEVBQUUsSUFBSTtnQkFDWCxRQUFRLEVBQUUsS0FBSyxFQUFFLGtDQUFrQzthQUNwRDtZQUVELG1EQUFtRDtZQUNuRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUVELGlEQUFpRDtZQUNqRCxrQkFBa0IsRUFBRTtnQkFDbEIsS0FBSyxFQUFFO29CQUNMLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJLEVBQUUsOEJBQThCO2lCQUM5QztnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsVUFBVSxFQUFFO29CQUNWLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxRQUFRLEVBQUUsS0FBSyxFQUFFLDBDQUEwQztvQkFDM0QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsT0FB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RyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNyRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNqRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXhFLHdDQUF3QztRQUN4QyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWU7WUFDM0MsV0FBVyxFQUFFLHNEQUFzRDtZQUNuRSxVQUFVLEVBQUUsbUNBQW1DO1NBQ2hELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXpTRCw4QkF5U0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQXV0aGVudGljYXRpb24gU3RhY2sgZm9yIEJ1ZGdldEJ1ZGR5IEFwcGxpY2F0aW9uXHJcbiAqXHJcbiAqIENyZWF0ZXMgQW1hem9uIENvZ25pdG8gVXNlciBQb29sIGFuZCBVc2VyIFBvb2wgQ2xpZW50IGZvciBoYW5kbGluZ1xyXG4gKiB1c2VyIGF1dGhlbnRpY2F0aW9uLCByZWdpc3RyYXRpb24sIGFuZCBhdXRob3JpemF0aW9uLiBDb25maWd1cmVkIHdpdGhcclxuICogY3VzdG9tIGF0dHJpYnV0ZXMgZm9yIGZhbWlseSByZWxhdGlvbnNoaXBzIGFuZCBhY2NvdW50IHR5cGVzLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gRW1haWwtYmFzZWQgYXV0aGVudGljYXRpb24gd2l0aCB2ZXJpZmljYXRpb25cclxuICogLSBDdXN0b20gYXR0cmlidXRlcyBmb3IgZmFtaWx5IGFuZCBzdWJzY3JpcHRpb24gZGF0YVxyXG4gKiAtIFBhc3N3b3JkIHBvbGljaWVzIGZvciBzZWN1cml0eVxyXG4gKiAtIE1GQSBzdXBwb3J0IChvcHRpb25hbClcclxuICogLSBMYW1iZGEgdHJpZ2dlcnMgZm9yIGN1c3RvbSBhdXRoZW50aWNhdGlvbiBmbG93c1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEF1dGhTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqXHJcbiAgICogQ29nbml0byBVc2VyIFBvb2wgZm9yIHVzZXIgbWFuYWdlbWVudFxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG5cclxuICAvKipcclxuICAgKiBVc2VyIFBvb2wgQ2xpZW50IGZvciBhcHBsaWNhdGlvbiBhdXRoZW50aWNhdGlvblxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xyXG5cclxuICAvKipcclxuICAgKiBMYW1iZGEgTGF5ZXIgd2l0aCBzaGFyZWQgYXV0aGVudGljYXRpb24gdXRpbGl0aWVzXHJcbiAgICogRXhwb3NlZCBhcyBwdWJsaWMgcHJvcGVydHkgZm9yIHVzZSBpbiBBUEkgc3RhY2tcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgYXV0aFNoYXJlZExheWVyOiBsYW1iZGEuTGF5ZXJWZXJzaW9uO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE1haW4gVXNlciBQb29sIGZvciBCdWRnZXRCdWRkeSBhcHBsaWNhdGlvblxyXG4gICAgICpcclxuICAgICAqIEhhbmRsZXMgdXNlciByZWdpc3RyYXRpb24sIGF1dGhlbnRpY2F0aW9uLCBhbmQgcHJvZmlsZSBtYW5hZ2VtZW50XHJcbiAgICAgKiB3aXRoIGN1c3RvbSBhdHRyaWJ1dGVzIHNwZWNpZmljIHRvIGJ1ZGdldGluZyBhcHBsaWNhdGlvbiBuZWVkcy5cclxuICAgICAqL1xyXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdCdWRnZXRCdWRkeVVzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6ICdidWRnZXRidWRkeS11c2VycycsXHJcblxyXG4gICAgICAvLyBFbWFpbC1iYXNlZCBzaWduLWluIGZvciBiZXR0ZXIgdXNlciBleHBlcmllbmNlXHJcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcclxuICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICB1c2VybmFtZTogZmFsc2UsIC8vIERpc2FibGUgdXNlcm5hbWUgdG8gc2ltcGxpZnkgVVhcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEF1dG8tdmVyaWZ5IGVtYWlsIGFkZHJlc3NlcyBmb3IgYWNjb3VudCBzZWN1cml0eVxyXG4gICAgICBhdXRvVmVyaWZ5OiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTdGFuZGFyZCBhdHRyaWJ1dGVzIHJlcXVpcmVkIGZvciB1c2VyIHByb2ZpbGVzXHJcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgIGVtYWlsOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsIC8vIEFsbG93IHVzZXJzIHRvIGNoYW5nZSBlbWFpbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2l2ZW5OYW1lOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYW1pbHlOYW1lOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBiaXJ0aGRhdGU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSwgLy8gV2UgY29sbGVjdCBhZ2Ugc2VwYXJhdGVseSBpbiBvbmJvYXJkaW5nXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYWRkcmVzczoge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLCAvLyBXZSBjb2xsZWN0IGxvY2F0aW9uIGluIG9uYm9hcmRpbmdcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEN1c3RvbSBhdHRyaWJ1dGVzIHNwZWNpZmljIHRvIEJ1ZGdldEJ1ZGR5XHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAvLyBVbmlxdWUgdXNlciBpZGVudGlmaWVyIGZvciBEeW5hbW9EQiBpbnRlZ3JhdGlvblxyXG4gICAgICAgIHVzZXJJZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogNTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiBmYWxzZSwgLy8gVXNlciBJRCBzaG91bGQgbm90IGNoYW5nZSBvbmNlIHNldFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBGYW1pbHkgYWNjb3VudCBhc3NvY2lhdGlvblxyXG4gICAgICAgIGZhbWlseUlkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiA1MCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIFVzZXIgcm9sZSB3aXRoaW4gZmFtaWx5IChwcmltYXJ5LCBzcG91c2UsIHZpZXdlcilcclxuICAgICAgICBmYW1pbHlSb2xlOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAyMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIEFjY291bnQgdHlwZSAoc2luZ2xlIG9yIGZhbWlseSlcclxuICAgICAgICBhY2NvdW50VHlwZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMjAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBTdWJzY3JpcHRpb24gdGllciAoZnJlZSBvciBwcmVtaXVtKVxyXG4gICAgICAgIHN1YnNjcmlwdGlvblRpZXI6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDIwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gT25ib2FyZGluZyBjb21wbGV0aW9uIHN0YXR1c1xyXG4gICAgICAgIG9uYm9hcmRpbmdDb21wbGV0ZWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDEwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gVXNlcidzIGNvdW50cnkgZm9yIHJlZ2lvbmFsIGZlYXR1cmVzXHJcbiAgICAgICAgY291bnRyeTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU3Ryb25nIHBhc3N3b3JkIHBvbGljeSBmb3Igc2VjdXJpdHlcclxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLCAvLyBLZWVwIGl0IHVzZXItZnJpZW5kbHlcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEFjY291bnQgcmVjb3Zlcnkgb3B0aW9uc1xyXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcblxyXG4gICAgICAvLyBFbWFpbCBjb25maWd1cmF0aW9uIGZvciB2ZXJpZmljYXRpb24gYW5kIG5vdGlmaWNhdGlvbnNcclxuICAgICAgZW1haWw6IGNvZ25pdG8uVXNlclBvb2xFbWFpbC53aXRoQ29nbml0bygnbm9yZXBseUBidWRnZXRidWRkeS5jb20nKSxcclxuXHJcbiAgICAgIC8vIFNlbGYtc2VydmljZSBhY2NvdW50IG1hbmFnZW1lbnRcclxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIHVzZXJWZXJpZmljYXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIEJ1ZGdldEJ1ZGR5IC0gVmVyaWZ5IHlvdXIgZW1haWwnLFxyXG4gICAgICAgIGVtYWlsQm9keTogJ1dlbGNvbWUgdG8gQnVkZ2V0QnVkZHkhIFBsZWFzZSBjbGljayB0aGUgbGluayBiZWxvdyB0byB2ZXJpZnkgeW91ciBlbWFpbCBhZGRyZXNzOiB7IyNWZXJpZnkgRW1haWwjI30nLFxyXG4gICAgICAgIGVtYWlsU3R5bGU6IGNvZ25pdG8uVmVyaWZpY2F0aW9uRW1haWxTdHlsZS5MSU5LLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXV0b21hdGljIGNsZWFudXAgb2YgdW52ZXJpZmllZCBhY2NvdW50cyBhZnRlciA3IGRheXNcclxuICAgICAgdXNlckludml0YXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIEJ1ZGdldEJ1ZGR5JyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdIZWxsbyB7dXNlcm5hbWV9LCB5b3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gam9pbiBCdWRnZXRCdWRkeS4gWW91ciB0ZW1wb3JhcnkgcGFzc3dvcmQgaXMgeyMjIyN9JyxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIERldmljZSB0cmFja2luZyBmb3Igc2VjdXJpdHkgKG9wdGlvbmFsKVxyXG4gICAgICBkZXZpY2VUcmFja2luZzoge1xyXG4gICAgICAgIGNoYWxsZW5nZVJlcXVpcmVkT25OZXdEZXZpY2U6IGZhbHNlLCAvLyBLZWVwIFVYIHNpbXBsZSBmb3IgTVZQXHJcbiAgICAgICAgZGV2aWNlT25seVJlbWVtYmVyZWRPblVzZXJQcm9tcHQ6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBdXRvbWF0aWMgZGVsZXRpb24gd2hlbiBzdGFjayBpcyBkZXN0cm95ZWQgKGZvciBkZXYgZW52aXJvbm1lbnRzKVxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVc2VyIFBvb2wgQ2xpZW50IGZvciB3ZWIgYW5kIG1vYmlsZSBhcHBsaWNhdGlvbnNcclxuICAgICAqXHJcbiAgICAgKiBDb25maWd1cmVzIGF1dGhlbnRpY2F0aW9uIGZsb3dzIGFuZCB0b2tlbiBzZXR0aW5ncyBmb3IgdGhlXHJcbiAgICAgKiBCdWRnZXRCdWRkeSBjbGllbnQgYXBwbGljYXRpb25zICh3ZWIsIGlPUywgQW5kcm9pZCkuXHJcbiAgICAgKi9cclxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnQnVkZ2V0QnVkZHlVc2VyUG9vbENsaWVudCcsIHtcclxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXHJcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogJ2J1ZGdldGJ1ZGR5LWNsaWVudCcsXHJcblxyXG4gICAgICAvLyBFbmFibGUgYXV0aGVudGljYXRpb24gZmxvd3MgbmVlZGVkIGZvciB0aGUgYXBwbGljYXRpb25cclxuICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgdXNlclNycDogdHJ1ZSwgLy8gU2VjdXJlIFJlbW90ZSBQYXNzd29yZCBmb3Igd2ViL21vYmlsZVxyXG4gICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSwgLy8gQWxsb3cgdXNlcm5hbWUvcGFzc3dvcmQgYXV0aFxyXG4gICAgICAgIGFkbWluVXNlclBhc3N3b3JkOiBmYWxzZSwgLy8gRGlzYWJsZSBhZG1pbiBhdXRoIGZvciBzZWN1cml0eVxyXG4gICAgICAgIGN1c3RvbTogZmFsc2UsIC8vIE5vIGN1c3RvbSBhdXRoIGZsb3dzIGZvciBNVlBcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFRva2VuIGNvbmZpZ3VyYXRpb24gZm9yIHNlY3VyaXR5IGFuZCBVWCBiYWxhbmNlXHJcbiAgICAgIGFjY2Vzc1Rva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSwgLy8gU2hvcnQtbGl2ZWQgZm9yIHNlY3VyaXR5XHJcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLCAvLyBBbGxvdyBzdGF5aW5nIGxvZ2dlZCBpblxyXG5cclxuICAgICAgLy8gUHJldmVudCB1c2VyIGV4aXN0ZW5jZSBlcnJvcnMgZm9yIHNlY3VyaXR5XHJcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxyXG5cclxuICAgICAgLy8gT0F1dGggY29uZmlndXJhdGlvbiBmb3IgZnV0dXJlIHNvY2lhbCBsb2dpbiBpbnRlZ3JhdGlvblxyXG4gICAgICBvQXV0aDoge1xyXG4gICAgICAgIGZsb3dzOiB7XHJcbiAgICAgICAgICBhdXRob3JpemF0aW9uQ29kZUdyYW50OiB0cnVlLFxyXG4gICAgICAgICAgaW1wbGljaXRDb2RlR3JhbnQ6IGZhbHNlLCAvLyBMZXNzIHNlY3VyZSwgYXZvaWQgZm9yIHByb2R1Y3Rpb25cclxuICAgICAgICB9LFxyXG4gICAgICAgIHNjb3BlczogW1xyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLFxyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCxcclxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5QUk9GSUxFLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgY2FsbGJhY2tVcmxzOiBbXHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwL2F1dGgvY2FsbGJhY2snLCAvLyBMb2NhbCBkZXZlbG9wbWVudFxyXG4gICAgICAgICAgJ2h0dHBzOi8vYXBwLmJ1ZGdldGJ1ZGR5LmNvbS9hdXRoL2NhbGxiYWNrJywgLy8gUHJvZHVjdGlvbiB3ZWJcclxuICAgICAgICBdLFxyXG4gICAgICAgIGxvZ291dFVybHM6IFtcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXV0aC9sb2dvdXQnLFxyXG4gICAgICAgICAgJ2h0dHBzOi8vYXBwLmJ1ZGdldGJ1ZGR5LmNvbS9hdXRoL2xvZ291dCcsXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSByZWFkaW5nIGFuZCB3cml0aW5nIGFsbCBjdXN0b20gYXR0cmlidXRlc1xyXG4gICAgICByZWFkQXR0cmlidXRlczogbmV3IGNvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpXHJcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBnaXZlbk5hbWU6IHRydWUsXHJcbiAgICAgICAgICBmYW1pbHlOYW1lOiB0cnVlLFxyXG4gICAgICAgICAgYWRkcmVzczogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcyhcclxuICAgICAgICAgICd1c2VySWQnLFxyXG4gICAgICAgICAgJ2ZhbWlseUlkJyxcclxuICAgICAgICAgICdmYW1pbHlSb2xlJyxcclxuICAgICAgICAgICdhY2NvdW50VHlwZScsXHJcbiAgICAgICAgICAnc3Vic2NyaXB0aW9uVGllcicsXHJcbiAgICAgICAgICAnb25ib2FyZGluZ0NvbXBsZXRlZCcsXHJcbiAgICAgICAgICAnY291bnRyeSdcclxuICAgICAgICApLFxyXG5cclxuICAgICAgd3JpdGVBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcclxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgICBhZGRyZXNzOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKFxyXG4gICAgICAgICAgJ3VzZXJJZCcsXHJcbiAgICAgICAgICAnZmFtaWx5SWQnLFxyXG4gICAgICAgICAgJ2ZhbWlseVJvbGUnLFxyXG4gICAgICAgICAgJ2FjY291bnRUeXBlJyxcclxuICAgICAgICAgICdzdWJzY3JpcHRpb25UaWVyJyxcclxuICAgICAgICAgICdvbmJvYXJkaW5nQ29tcGxldGVkJyxcclxuICAgICAgICAgICdjb3VudHJ5J1xyXG4gICAgICAgICksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIElEIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQgZm9yIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhdXRoZW50aWNhdGlvbiBjb25maWd1cmF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIENsaWVudCBJRCBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCBmb3IgQnVkZ2V0QnVkZHkgd2ViIGFuZCBtb2JpbGUgYXBwbGljYXRpb25zJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1jbGllbnQtaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IFVzZXIgUG9vbCBBUk4gZm9yIElBTSBwb2xpY2llc1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBBUk4gZm9yIEJ1ZGdldEJ1ZGR5IElBTSBwb2xpY3kgY29uZmlndXJhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS11c2VyLXBvb2wtYXJuJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2hhcmVkIExhbWJkYSBMYXllciBmb3IgYXV0aGVudGljYXRpb24gdXRpbGl0aWVzXHJcbiAgICAgKlxyXG4gICAgICogQ29udGFpbnMgY29tbW9uIGNvZGUgdXNlZCBhY3Jvc3MgYWxsIGF1dGggTGFtYmRhIGZ1bmN0aW9uczpcclxuICAgICAqIC0gQ09SUyBoYW5kbGluZyAoY29ycy5qcylcclxuICAgICAqIC0gVG9rZW4gcGFyc2luZyAodG9rZW4tcGFyc2VyLmpzKVxyXG4gICAgICogLSBJbnB1dCB2YWxpZGF0aW9uICh2YWxpZGF0b3JzLmpzKVxyXG4gICAgICogLSBFcnJvciBmb3JtYXR0aW5nIChlcnJvcnMuanMpXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYXV0aFNoYXJlZExheWVyID0gbmV3IGxhbWJkYS5MYXllclZlcnNpb24odGhpcywgJ0F1dGhTaGFyZWRMYXllcicsIHtcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2xheWVycy9zaGFyZWQnKSxcclxuICAgICAgY29tcGF0aWJsZVJ1bnRpbWVzOiBbbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1hdLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NoYXJlZCBhdXRoZW50aWNhdGlvbiB1dGlsaXRpZXMgZm9yIEJ1ZGdldEJ1ZGR5IGF1dGggTGFtYmRhIGZ1bmN0aW9ucycsXHJcbiAgICAgIGxheWVyVmVyc2lvbk5hbWU6ICdidWRnZXRidWRkeS1hdXRoLXNoYXJlZCcsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiwgLy8gS2VlcCBvbGQgdmVyc2lvbnMgZm9yIHJvbGxiYWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSBjb3N0IGFsbG9jYXRpb24gdGFnc1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdDb21wb25lbnQnLCAnQXV0aGVudGljYXRpb24nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudXNlclBvb2wpLmFkZCgnU2VydmljZScsICdDb2duaXRvJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ0Nvc3RDZW50ZXInLCAnQnVkZ2V0QnVkZHktQXV0aCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdVc2VyVHlwZScsICdBcHBsaWNhdGlvbi1Vc2VycycpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdTZWN1cml0eUxldmVsJywgJ0hpZ2gnKTtcclxuXHJcbiAgICAvLyBBZGQgdGFncyB0byBMYW1iZGEgTGF5ZXJcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYXV0aFNoYXJlZExheWVyKS5hZGQoJ0NvbXBvbmVudCcsICdBdXRoZW50aWNhdGlvbicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hdXRoU2hhcmVkTGF5ZXIpLmFkZCgnU2VydmljZScsICdMYW1iZGEtTGF5ZXInKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYXV0aFNoYXJlZExheWVyKS5hZGQoJ0Nvc3RDZW50ZXInLCAnQnVkZ2V0QnVkZHktQXV0aCcpO1xyXG5cclxuICAgIC8vIE91dHB1dCBMYW1iZGEgTGF5ZXIgQVJOIGZvciByZWZlcmVuY2VcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBdXRoU2hhcmVkTGF5ZXJBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmF1dGhTaGFyZWRMYXllci5sYXllclZlcnNpb25Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTGFtYmRhIExheWVyIEFSTiBmb3Igc2hhcmVkIGF1dGhlbnRpY2F0aW9uIHV0aWxpdGllcycsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hdXRoLXNoYXJlZC1sYXllci1hcm4nLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==