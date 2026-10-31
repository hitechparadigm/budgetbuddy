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
 *
 * Last Updated: 2026-01-31 - Redeployment to fix UPDATE_ROLLBACK_COMPLETE state
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
const data_protection_1 = require("./config/data-protection");
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
                // Legacy: family account association — kept because Cognito schema attributes
                // cannot be deleted once created. Must NOT be required; not written during
                // registration. Budget membership is now resolved from DynamoDB via
                // BudgetAccessResolver, not from Cognito attributes.
                familyId: new cognito.StringAttribute({
                    minLen: 0,
                    maxLen: 50,
                    mutable: true, // optional — never set during registration
                }),
                // Legacy: user role within family — kept because Cognito schema attributes
                // cannot be deleted once created. Must NOT be required; not written during
                // registration. Role is now resolved from DynamoDB via BudgetAccessResolver.
                familyRole: new cognito.StringAttribute({
                    minLen: 0,
                    maxLen: 20,
                    mutable: true, // optional — never set during registration
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
            // Self-service account management: disabled. Accounts are created only by the
            // server through AdminCreateUser (backend/functions/auth POST /auth/register), which
            // is what prevents a caller from choosing their own custom:userId at SignUp time.
            selfSignUpEnabled: false,
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
            // Protected by default: the dev pool holds the real users (see config/data-protection.ts).
            // Opt out only for a throwaway stack with --context dataProtection=false.
            deletionProtection: (0, data_protection_1.isDataProtected)(this),
            removalPolicy: (0, data_protection_1.isDataProtected)(this) ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
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
            // Write attributes: identity and entitlement attributes (userId, accountType,
            // subscriptionTier, onboardingCompleted) are deliberately NOT client-writable. They are
            // written exclusively by the server through AdminCreateUser /
            // AdminUpdateUserAttributes, which do not consult client write permission. Granting
            // them here would let a caller populate custom:userId with a victim's ID at SignUp and
            // inherit that victim's budgets, because getUserFromEvent trusts the claim.
            // familyId and familyRole stay excluded for the same reason they always were: budget
            // membership and role are resolved from DynamoDB via BudgetAccessResolver.
            writeAttributes: new cognito.ClientAttributes()
                .withStandardAttributes({
                email: true,
                givenName: true,
                familyName: true,
                address: true,
            })
                .withCustomAttributes('country'),
        });
        // Output User Pool ID for client configuration
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'Cognito User Pool ID for BudgetBuddy client authentication configuration',
            exportName: 'budgetbuddy-user-pool-id',
        });
        /**
         * Admin User Group
         *
         * Users in this group have access to the admin dashboard and
         * administrative functions like user management and system monitoring.
         */
        this.adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Admins',
            description: 'Administrative users with access to admin dashboard and user management',
            precedence: 1, // Higher precedence (lower number) for admin role
        });
        // Output Admin Group name for reference
        new cdk.CfnOutput(this, 'AdminGroupName', {
            value: this.adminGroup.groupName || 'Admins',
            description: 'Cognito Admin Group name for administrative user management',
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
        cdk.Tags.of(this.userPool).add('LastDeployment', '2026-01-31');
        // Add tags to Lambda Layer
        cdk.Tags.of(this.authSharedLayer).add('Component', 'Authentication');
        cdk.Tags.of(this.authSharedLayer).add('Service', 'Lambda-Layer');
        cdk.Tags.of(this.authSharedLayer).add('CostCenter', 'BudgetBuddy-Auth');
        // Output Lambda Layer ARN for reference (no export to avoid cross-stack dependency issues)
        new cdk.CfnOutput(this, 'AuthSharedLayerArn', {
            value: this.authSharedLayer.layerVersionArn,
            description: 'Lambda Layer ARN for shared authentication utilities',
            // Removed exportName to avoid cross-stack dependency issues when layer updates
        });
    }
}
exports.AuthStack = AuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLGlFQUFtRDtBQUNuRCwrREFBaUQ7QUFDakQsOERBQTJEO0FBRzNELE1BQWEsU0FBVSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBeUJ0QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCOzs7OztXQUtHO1FBQ0gsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ2hFLFlBQVksRUFBRSxtQkFBbUI7WUFFakMsaURBQWlEO1lBQ2pELGFBQWEsRUFBRTtnQkFDYixLQUFLLEVBQUUsSUFBSTtnQkFDWCxRQUFRLEVBQUUsS0FBSyxFQUFFLGtDQUFrQzthQUNwRDtZQUVELG1EQUFtRDtZQUNuRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUVELGlEQUFpRDtZQUNqRCxrQkFBa0IsRUFBRTtnQkFDbEIsS0FBSyxFQUFFO29CQUNMLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJLEVBQUUsOEJBQThCO2lCQUM5QztnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsVUFBVSxFQUFFO29CQUNWLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxRQUFRLEVBQUUsS0FBSyxFQUFFLDBDQUEwQztvQkFDM0QsT0FBTyxFQUFFLElBQUk7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LEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNqRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXhFLDJGQUEyRjtRQUMzRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWU7WUFDM0MsV0FBVyxFQUFFLHNEQUFzRDtZQUNuRSwrRUFBK0U7U0FDaEYsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNVVELDhCQTRVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBdXRoZW50aWNhdGlvbiBTdGFjayBmb3IgQnVkZ2V0QnVkZHkgQXBwbGljYXRpb25cclxuICpcclxuICogQ3JlYXRlcyBBbWF6b24gQ29nbml0byBVc2VyIFBvb2wgYW5kIFVzZXIgUG9vbCBDbGllbnQgZm9yIGhhbmRsaW5nXHJcbiAqIHVzZXIgYXV0aGVudGljYXRpb24sIHJlZ2lzdHJhdGlvbiwgYW5kIGF1dGhvcml6YXRpb24uIENvbmZpZ3VyZWQgd2l0aFxyXG4gKiBjdXN0b20gYXR0cmlidXRlcyBmb3IgZmFtaWx5IHJlbGF0aW9uc2hpcHMgYW5kIGFjY291bnQgdHlwZXMuXHJcbiAqXHJcbiAqIEtleSBGZWF0dXJlczpcclxuICogLSBFbWFpbC1iYXNlZCBhdXRoZW50aWNhdGlvbiB3aXRoIHZlcmlmaWNhdGlvblxyXG4gKiAtIEN1c3RvbSBhdHRyaWJ1dGVzIGZvciBmYW1pbHkgYW5kIHN1YnNjcmlwdGlvbiBkYXRhXHJcbiAqIC0gUGFzc3dvcmQgcG9saWNpZXMgZm9yIHNlY3VyaXR5XHJcbiAqIC0gTUZBIHN1cHBvcnQgKG9wdGlvbmFsKVxyXG4gKiAtIExhbWJkYSB0cmlnZ2VycyBmb3IgY3VzdG9tIGF1dGhlbnRpY2F0aW9uIGZsb3dzXHJcbiAqXHJcbiAqIExhc3QgVXBkYXRlZDogMjAyNi0wMS0zMSAtIFJlZGVwbG95bWVudCB0byBmaXggVVBEQVRFX1JPTExCQUNLX0NPTVBMRVRFIHN0YXRlXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgaXNEYXRhUHJvdGVjdGVkIH0gZnJvbSAnLi9jb25maWcvZGF0YS1wcm90ZWN0aW9uJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQXV0aFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAvKipcclxuICAgKiBDb2duaXRvIFVzZXIgUG9vbCBmb3IgdXNlciBtYW5hZ2VtZW50XHJcbiAgICogRXhwb3NlZCBhcyBwdWJsaWMgcHJvcGVydHkgZm9yIHVzZSBpbiBvdGhlciBzdGFja3NcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcblxyXG4gIC8qKlxyXG4gICAqIFVzZXIgUG9vbCBDbGllbnQgZm9yIGFwcGxpY2F0aW9uIGF1dGhlbnRpY2F0aW9uXHJcbiAgICogRXhwb3NlZCBhcyBwdWJsaWMgcHJvcGVydHkgZm9yIHVzZSBpbiBvdGhlciBzdGFja3NcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XHJcblxyXG4gIC8qKlxyXG4gICAqIExhbWJkYSBMYXllciB3aXRoIHNoYXJlZCBhdXRoZW50aWNhdGlvbiB1dGlsaXRpZXNcclxuICAgKiBFeHBvc2VkIGFzIHB1YmxpYyBwcm9wZXJ0eSBmb3IgdXNlIGluIEFQSSBzdGFja1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBhdXRoU2hhcmVkTGF5ZXI6IGxhbWJkYS5MYXllclZlcnNpb247XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkbWluIGdyb3VwIGZvciBhZG1pbmlzdHJhdGl2ZSB1c2Vyc1xyXG4gICAqIFVzZXJzIGluIHRoaXMgZ3JvdXAgaGF2ZSBhY2Nlc3MgdG8gYWRtaW4gZGFzaGJvYXJkXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGFkbWluR3JvdXA6IGNvZ25pdG8uQ2ZuVXNlclBvb2xHcm91cDtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNYWluIFVzZXIgUG9vbCBmb3IgQnVkZ2V0QnVkZHkgYXBwbGljYXRpb25cclxuICAgICAqXHJcbiAgICAgKiBIYW5kbGVzIHVzZXIgcmVnaXN0cmF0aW9uLCBhdXRoZW50aWNhdGlvbiwgYW5kIHByb2ZpbGUgbWFuYWdlbWVudFxyXG4gICAgICogd2l0aCBjdXN0b20gYXR0cmlidXRlcyBzcGVjaWZpYyB0byBidWRnZXRpbmcgYXBwbGljYXRpb24gbmVlZHMuXHJcbiAgICAgKi9cclxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnQnVkZ2V0QnVkZHlVc2VyUG9vbCcsIHtcclxuICAgICAgdXNlclBvb2xOYW1lOiAnYnVkZ2V0YnVkZHktdXNlcnMnLFxyXG5cclxuICAgICAgLy8gRW1haWwtYmFzZWQgc2lnbi1pbiBmb3IgYmV0dGVyIHVzZXIgZXhwZXJpZW5jZVxyXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgdXNlcm5hbWU6IGZhbHNlLCAvLyBEaXNhYmxlIHVzZXJuYW1lIHRvIHNpbXBsaWZ5IFVYXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBdXRvLXZlcmlmeSBlbWFpbCBhZGRyZXNzZXMgZm9yIGFjY291bnQgc2VjdXJpdHlcclxuICAgICAgYXV0b1ZlcmlmeToge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU3RhbmRhcmQgYXR0cmlidXRlcyByZXF1aXJlZCBmb3IgdXNlciBwcm9maWxlc1xyXG4gICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcclxuICAgICAgICBlbWFpbDoge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLCAvLyBBbGxvdyB1c2VycyB0byBjaGFuZ2UgZW1haWxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdpdmVuTmFtZToge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZmFtaWx5TmFtZToge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYmlydGhkYXRlOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsIC8vIFdlIGNvbGxlY3QgYWdlIHNlcGFyYXRlbHkgaW4gb25ib2FyZGluZ1xyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGFkZHJlc3M6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSwgLy8gV2UgY29sbGVjdCBsb2NhdGlvbiBpbiBvbmJvYXJkaW5nXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBDdXN0b20gYXR0cmlidXRlcyBzcGVjaWZpYyB0byBCdWRnZXRCdWRkeVxyXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgLy8gVW5pcXVlIHVzZXIgaWRlbnRpZmllciBmb3IgRHluYW1vREIgaW50ZWdyYXRpb25cclxuICAgICAgICB1c2VySWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDUwLFxyXG4gICAgICAgICAgbXV0YWJsZTogZmFsc2UsIC8vIFVzZXIgSUQgc2hvdWxkIG5vdCBjaGFuZ2Ugb25jZSBzZXRcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gTGVnYWN5OiBmYW1pbHkgYWNjb3VudCBhc3NvY2lhdGlvbiDigJQga2VwdCBiZWNhdXNlIENvZ25pdG8gc2NoZW1hIGF0dHJpYnV0ZXNcclxuICAgICAgICAvLyBjYW5ub3QgYmUgZGVsZXRlZCBvbmNlIGNyZWF0ZWQuIE11c3QgTk9UIGJlIHJlcXVpcmVkOyBub3Qgd3JpdHRlbiBkdXJpbmdcclxuICAgICAgICAvLyByZWdpc3RyYXRpb24uIEJ1ZGdldCBtZW1iZXJzaGlwIGlzIG5vdyByZXNvbHZlZCBmcm9tIER5bmFtb0RCIHZpYVxyXG4gICAgICAgIC8vIEJ1ZGdldEFjY2Vzc1Jlc29sdmVyLCBub3QgZnJvbSBDb2duaXRvIGF0dHJpYnV0ZXMuXHJcbiAgICAgICAgZmFtaWx5SWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDUwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSwgLy8gb3B0aW9uYWwg4oCUIG5ldmVyIHNldCBkdXJpbmcgcmVnaXN0cmF0aW9uXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIExlZ2FjeTogdXNlciByb2xlIHdpdGhpbiBmYW1pbHkg4oCUIGtlcHQgYmVjYXVzZSBDb2duaXRvIHNjaGVtYSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgLy8gY2Fubm90IGJlIGRlbGV0ZWQgb25jZSBjcmVhdGVkLiBNdXN0IE5PVCBiZSByZXF1aXJlZDsgbm90IHdyaXR0ZW4gZHVyaW5nXHJcbiAgICAgICAgLy8gcmVnaXN0cmF0aW9uLiBSb2xlIGlzIG5vdyByZXNvbHZlZCBmcm9tIER5bmFtb0RCIHZpYSBCdWRnZXRBY2Nlc3NSZXNvbHZlci5cclxuICAgICAgICBmYW1pbHlSb2xlOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAyMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsIC8vIG9wdGlvbmFsIOKAlCBuZXZlciBzZXQgZHVyaW5nIHJlZ2lzdHJhdGlvblxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBBY2NvdW50IHR5cGUgKHNpbmdsZSBvciBmYW1pbHkpXHJcbiAgICAgICAgYWNjb3VudFR5cGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDIwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gU3Vic2NyaXB0aW9uIHRpZXIgKGZyZWUgb3IgcHJlbWl1bSlcclxuICAgICAgICBzdWJzY3JpcHRpb25UaWVyOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAyMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIE9uYm9hcmRpbmcgY29tcGxldGlvbiBzdGF0dXNcclxuICAgICAgICBvbmJvYXJkaW5nQ29tcGxldGVkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAxMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIFVzZXIncyBjb3VudHJ5IGZvciByZWdpb25hbCBmZWF0dXJlc1xyXG4gICAgICAgIGNvdW50cnk6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDEwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFN0cm9uZyBwYXNzd29yZCBwb2xpY3kgZm9yIHNlY3VyaXR5XHJcbiAgICAgIHBhc3N3b3JkUG9saWN5OiB7XHJcbiAgICAgICAgbWluTGVuZ3RoOiA4LFxyXG4gICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSwgLy8gS2VlcCBpdCB1c2VyLWZyaWVuZGx5XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBY2NvdW50IHJlY292ZXJ5IG9wdGlvbnNcclxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG5cclxuICAgICAgLy8gRW1haWwgY29uZmlndXJhdGlvbiBmb3IgdmVyaWZpY2F0aW9uIGFuZCBub3RpZmljYXRpb25zXHJcbiAgICAgIGVtYWlsOiBjb2duaXRvLlVzZXJQb29sRW1haWwud2l0aENvZ25pdG8oJ25vcmVwbHlAYnVkZ2V0YnVkZHkuY29tJyksXHJcblxyXG4gICAgICAvLyBTZWxmLXNlcnZpY2UgYWNjb3VudCBtYW5hZ2VtZW50OiBkaXNhYmxlZC4gQWNjb3VudHMgYXJlIGNyZWF0ZWQgb25seSBieSB0aGVcclxuICAgICAgLy8gc2VydmVyIHRocm91Z2ggQWRtaW5DcmVhdGVVc2VyIChiYWNrZW5kL2Z1bmN0aW9ucy9hdXRoIFBPU1QgL2F1dGgvcmVnaXN0ZXIpLCB3aGljaFxyXG4gICAgICAvLyBpcyB3aGF0IHByZXZlbnRzIGEgY2FsbGVyIGZyb20gY2hvb3NpbmcgdGhlaXIgb3duIGN1c3RvbTp1c2VySWQgYXQgU2lnblVwIHRpbWUuXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSxcclxuICAgICAgdXNlclZlcmlmaWNhdGlvbjoge1xyXG4gICAgICAgIGVtYWlsU3ViamVjdDogJ1dlbGNvbWUgdG8gQnVkZ2V0QnVkZHkgLSBWZXJpZnkgeW91ciBlbWFpbCcsXHJcbiAgICAgICAgZW1haWxCb2R5OiAnV2VsY29tZSB0byBCdWRnZXRCdWRkeSEgUGxlYXNlIGNsaWNrIHRoZSBsaW5rIGJlbG93IHRvIHZlcmlmeSB5b3VyIGVtYWlsIGFkZHJlc3M6IHsjI1ZlcmlmeSBFbWFpbCMjfScsXHJcbiAgICAgICAgZW1haWxTdHlsZTogY29nbml0by5WZXJpZmljYXRpb25FbWFpbFN0eWxlLkxJTkssXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBdXRvbWF0aWMgY2xlYW51cCBvZiB1bnZlcmlmaWVkIGFjY291bnRzIGFmdGVyIDcgZGF5c1xyXG4gICAgICB1c2VySW52aXRhdGlvbjoge1xyXG4gICAgICAgIGVtYWlsU3ViamVjdDogJ1dlbGNvbWUgdG8gQnVkZ2V0QnVkZHknLFxyXG4gICAgICAgIGVtYWlsQm9keTogJ0hlbGxvIHt1c2VybmFtZX0sIHlvdSBoYXZlIGJlZW4gaW52aXRlZCB0byBqb2luIEJ1ZGdldEJ1ZGR5LiBZb3VyIHRlbXBvcmFyeSBwYXNzd29yZCBpcyB7IyMjI30nLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRGV2aWNlIHRyYWNraW5nIGZvciBzZWN1cml0eSAob3B0aW9uYWwpXHJcbiAgICAgIGRldmljZVRyYWNraW5nOiB7XHJcbiAgICAgICAgY2hhbGxlbmdlUmVxdWlyZWRPbk5ld0RldmljZTogZmFsc2UsIC8vIEtlZXAgVVggc2ltcGxlIGZvciBNVlBcclxuICAgICAgICBkZXZpY2VPbmx5UmVtZW1iZXJlZE9uVXNlclByb21wdDogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFByb3RlY3RlZCBieSBkZWZhdWx0OiB0aGUgZGV2IHBvb2wgaG9sZHMgdGhlIHJlYWwgdXNlcnMgKHNlZSBjb25maWcvZGF0YS1wcm90ZWN0aW9uLnRzKS5cclxuICAgICAgLy8gT3B0IG91dCBvbmx5IGZvciBhIHRocm93YXdheSBzdGFjayB3aXRoIC0tY29udGV4dCBkYXRhUHJvdGVjdGlvbj1mYWxzZS5cclxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBpc0RhdGFQcm90ZWN0ZWQodGhpcyksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGlzRGF0YVByb3RlY3RlZCh0aGlzKSA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFVzZXIgUG9vbCBDbGllbnQgZm9yIHdlYiBhbmQgbW9iaWxlIGFwcGxpY2F0aW9uc1xyXG4gICAgICpcclxuICAgICAqIENvbmZpZ3VyZXMgYXV0aGVudGljYXRpb24gZmxvd3MgYW5kIHRva2VuIHNldHRpbmdzIGZvciB0aGVcclxuICAgICAqIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhcHBsaWNhdGlvbnMgKHdlYiwgaU9TLCBBbmRyb2lkKS5cclxuICAgICAqL1xyXG4gICAgdGhpcy51c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KHRoaXMsICdCdWRnZXRCdWRkeVVzZXJQb29sQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcclxuICAgICAgdXNlclBvb2xDbGllbnROYW1lOiAnYnVkZ2V0YnVkZHktY2xpZW50JyxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSBhdXRoZW50aWNhdGlvbiBmbG93cyBuZWVkZWQgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gICAgICBhdXRoRmxvd3M6IHtcclxuICAgICAgICB1c2VyU3JwOiB0cnVlLCAvLyBTZWN1cmUgUmVtb3RlIFBhc3N3b3JkIGZvciB3ZWIvbW9iaWxlXHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLCAvLyBBbGxvdyB1c2VybmFtZS9wYXNzd29yZCBhdXRoXHJcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IGZhbHNlLCAvLyBEaXNhYmxlIGFkbWluIGF1dGggZm9yIHNlY3VyaXR5XHJcbiAgICAgICAgY3VzdG9tOiBmYWxzZSwgLy8gTm8gY3VzdG9tIGF1dGggZmxvd3MgZm9yIE1WUFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gVG9rZW4gY29uZmlndXJhdGlvbiBmb3Igc2VjdXJpdHkgYW5kIFVYIGJhbGFuY2VcclxuICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLCAvLyBTaG9ydC1saXZlZCBmb3Igc2VjdXJpdHlcclxuICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIHJlZnJlc2hUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzMCksIC8vIEFsbG93IHN0YXlpbmcgbG9nZ2VkIGluXHJcblxyXG4gICAgICAvLyBQcmV2ZW50IHVzZXIgZXhpc3RlbmNlIGVycm9ycyBmb3Igc2VjdXJpdHlcclxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXHJcblxyXG4gICAgICAvLyBPQXV0aCBjb25maWd1cmF0aW9uIGZvciBmdXR1cmUgc29jaWFsIGxvZ2luIGludGVncmF0aW9uXHJcbiAgICAgIG9BdXRoOiB7XHJcbiAgICAgICAgZmxvd3M6IHtcclxuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXHJcbiAgICAgICAgICBpbXBsaWNpdENvZGVHcmFudDogZmFsc2UsIC8vIExlc3Mgc2VjdXJlLCBhdm9pZCBmb3IgcHJvZHVjdGlvblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2NvcGVzOiBbXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuRU1BSUwsXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuT1BFTklELFxyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEUsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBjYWxsYmFja1VybHM6IFtcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXV0aC9jYWxsYmFjaycsIC8vIExvY2FsIGRldmVsb3BtZW50XHJcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAuYnVkZ2V0YnVkZHkuY29tL2F1dGgvY2FsbGJhY2snLCAvLyBQcm9kdWN0aW9uIHdlYlxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgbG9nb3V0VXJsczogW1xyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2xvZ291dCcsXHJcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAuYnVkZ2V0YnVkZHkuY29tL2F1dGgvbG9nb3V0JyxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRW5hYmxlIHJlYWRpbmcgYW5kIHdyaXRpbmcgYWxsIGN1c3RvbSBhdHRyaWJ1dGVzXHJcbiAgICAgIHJlYWRBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcclxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgICBhZGRyZXNzOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKFxyXG4gICAgICAgICAgJ3VzZXJJZCcsXHJcbiAgICAgICAgICAnZmFtaWx5SWQnLFxyXG4gICAgICAgICAgJ2ZhbWlseVJvbGUnLFxyXG4gICAgICAgICAgJ2FjY291bnRUeXBlJyxcclxuICAgICAgICAgICdzdWJzY3JpcHRpb25UaWVyJyxcclxuICAgICAgICAgICdvbmJvYXJkaW5nQ29tcGxldGVkJyxcclxuICAgICAgICAgICdjb3VudHJ5J1xyXG4gICAgICAgICksXHJcblxyXG4gICAgICAvLyBXcml0ZSBhdHRyaWJ1dGVzOiBpZGVudGl0eSBhbmQgZW50aXRsZW1lbnQgYXR0cmlidXRlcyAodXNlcklkLCBhY2NvdW50VHlwZSxcclxuICAgICAgLy8gc3Vic2NyaXB0aW9uVGllciwgb25ib2FyZGluZ0NvbXBsZXRlZCkgYXJlIGRlbGliZXJhdGVseSBOT1QgY2xpZW50LXdyaXRhYmxlLiBUaGV5IGFyZVxyXG4gICAgICAvLyB3cml0dGVuIGV4Y2x1c2l2ZWx5IGJ5IHRoZSBzZXJ2ZXIgdGhyb3VnaCBBZG1pbkNyZWF0ZVVzZXIgL1xyXG4gICAgICAvLyBBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzLCB3aGljaCBkbyBub3QgY29uc3VsdCBjbGllbnQgd3JpdGUgcGVybWlzc2lvbi4gR3JhbnRpbmdcclxuICAgICAgLy8gdGhlbSBoZXJlIHdvdWxkIGxldCBhIGNhbGxlciBwb3B1bGF0ZSBjdXN0b206dXNlcklkIHdpdGggYSB2aWN0aW0ncyBJRCBhdCBTaWduVXAgYW5kXHJcbiAgICAgIC8vIGluaGVyaXQgdGhhdCB2aWN0aW0ncyBidWRnZXRzLCBiZWNhdXNlIGdldFVzZXJGcm9tRXZlbnQgdHJ1c3RzIHRoZSBjbGFpbS5cclxuICAgICAgLy8gZmFtaWx5SWQgYW5kIGZhbWlseVJvbGUgc3RheSBleGNsdWRlZCBmb3IgdGhlIHNhbWUgcmVhc29uIHRoZXkgYWx3YXlzIHdlcmU6IGJ1ZGdldFxyXG4gICAgICAvLyBtZW1iZXJzaGlwIGFuZCByb2xlIGFyZSByZXNvbHZlZCBmcm9tIER5bmFtb0RCIHZpYSBCdWRnZXRBY2Nlc3NSZXNvbHZlci5cclxuICAgICAgd3JpdGVBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcclxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgICBhZGRyZXNzOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKCdjb3VudHJ5JyksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIElEIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQgZm9yIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhdXRoZW50aWNhdGlvbiBjb25maWd1cmF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkbWluIFVzZXIgR3JvdXBcclxuICAgICAqXHJcbiAgICAgKiBVc2VycyBpbiB0aGlzIGdyb3VwIGhhdmUgYWNjZXNzIHRvIHRoZSBhZG1pbiBkYXNoYm9hcmQgYW5kXHJcbiAgICAgKiBhZG1pbmlzdHJhdGl2ZSBmdW5jdGlvbnMgbGlrZSB1c2VyIG1hbmFnZW1lbnQgYW5kIHN5c3RlbSBtb25pdG9yaW5nLlxyXG4gICAgICovXHJcbiAgICB0aGlzLmFkbWluR3JvdXAgPSBuZXcgY29nbml0by5DZm5Vc2VyUG9vbEdyb3VwKHRoaXMsICdBZG1pbkdyb3VwJywge1xyXG4gICAgICB1c2VyUG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGdyb3VwTmFtZTogJ0FkbWlucycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQWRtaW5pc3RyYXRpdmUgdXNlcnMgd2l0aCBhY2Nlc3MgdG8gYWRtaW4gZGFzaGJvYXJkIGFuZCB1c2VyIG1hbmFnZW1lbnQnLFxyXG4gICAgICBwcmVjZWRlbmNlOiAxLCAvLyBIaWdoZXIgcHJlY2VkZW5jZSAobG93ZXIgbnVtYmVyKSBmb3IgYWRtaW4gcm9sZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IEFkbWluIEdyb3VwIG5hbWUgZm9yIHJlZmVyZW5jZVxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FkbWluR3JvdXBOYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hZG1pbkdyb3VwLmdyb3VwTmFtZSB8fCAnQWRtaW5zJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIEFkbWluIEdyb3VwIG5hbWUgZm9yIGFkbWluaXN0cmF0aXZlIHVzZXIgbWFuYWdlbWVudCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIENsaWVudCBJRCBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCBmb3IgQnVkZ2V0QnVkZHkgd2ViIGFuZCBtb2JpbGUgYXBwbGljYXRpb25zJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1jbGllbnQtaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IFVzZXIgUG9vbCBBUk4gZm9yIElBTSBwb2xpY2llc1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBBUk4gZm9yIEJ1ZGdldEJ1ZGR5IElBTSBwb2xpY3kgY29uZmlndXJhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS11c2VyLXBvb2wtYXJuJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2hhcmVkIExhbWJkYSBMYXllciBmb3IgYXV0aGVudGljYXRpb24gdXRpbGl0aWVzXHJcbiAgICAgKlxyXG4gICAgICogQ29udGFpbnMgY29tbW9uIGNvZGUgdXNlZCBhY3Jvc3MgYWxsIGF1dGggTGFtYmRhIGZ1bmN0aW9uczpcclxuICAgICAqIC0gQ09SUyBoYW5kbGluZyAoY29ycy5qcylcclxuICAgICAqIC0gVG9rZW4gcGFyc2luZyAodG9rZW4tcGFyc2VyLmpzKVxyXG4gICAgICogLSBJbnB1dCB2YWxpZGF0aW9uICh2YWxpZGF0b3JzLmpzKVxyXG4gICAgICogLSBFcnJvciBmb3JtYXR0aW5nIChlcnJvcnMuanMpXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYXV0aFNoYXJlZExheWVyID0gbmV3IGxhbWJkYS5MYXllclZlcnNpb24odGhpcywgJ0F1dGhTaGFyZWRMYXllcicsIHtcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2xheWVycy9zaGFyZWQnKSxcclxuICAgICAgY29tcGF0aWJsZVJ1bnRpbWVzOiBbbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1hdLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NoYXJlZCBhdXRoZW50aWNhdGlvbiB1dGlsaXRpZXMgZm9yIEJ1ZGdldEJ1ZGR5IGF1dGggTGFtYmRhIGZ1bmN0aW9ucycsXHJcbiAgICAgIGxheWVyVmVyc2lvbk5hbWU6ICdidWRnZXRidWRkeS1hdXRoLXNoYXJlZCcsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiwgLy8gS2VlcCBvbGQgdmVyc2lvbnMgZm9yIHJvbGxiYWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSBjb3N0IGFsbG9jYXRpb24gdGFnc1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdDb21wb25lbnQnLCAnQXV0aGVudGljYXRpb24nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudXNlclBvb2wpLmFkZCgnU2VydmljZScsICdDb2duaXRvJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ0Nvc3RDZW50ZXInLCAnQnVkZ2V0QnVkZHktQXV0aCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdVc2VyVHlwZScsICdBcHBsaWNhdGlvbi1Vc2VycycpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdTZWN1cml0eUxldmVsJywgJ0hpZ2gnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudXNlclBvb2wpLmFkZCgnTGFzdERlcGxveW1lbnQnLCAnMjAyNi0wMS0zMScpO1xyXG5cclxuICAgIC8vIEFkZCB0YWdzIHRvIExhbWJkYSBMYXllclxyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hdXRoU2hhcmVkTGF5ZXIpLmFkZCgnQ29tcG9uZW50JywgJ0F1dGhlbnRpY2F0aW9uJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmF1dGhTaGFyZWRMYXllcikuYWRkKCdTZXJ2aWNlJywgJ0xhbWJkYS1MYXllcicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hdXRoU2hhcmVkTGF5ZXIpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1BdXRoJyk7XHJcblxyXG4gICAgLy8gT3V0cHV0IExhbWJkYSBMYXllciBBUk4gZm9yIHJlZmVyZW5jZSAobm8gZXhwb3J0IHRvIGF2b2lkIGNyb3NzLXN0YWNrIGRlcGVuZGVuY3kgaXNzdWVzKVxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0F1dGhTaGFyZWRMYXllckFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXV0aFNoYXJlZExheWVyLmxheWVyVmVyc2lvbkFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdMYW1iZGEgTGF5ZXIgQVJOIGZvciBzaGFyZWQgYXV0aGVudGljYXRpb24gdXRpbGl0aWVzJyxcclxuICAgICAgLy8gUmVtb3ZlZCBleHBvcnROYW1lIHRvIGF2b2lkIGNyb3NzLXN0YWNrIGRlcGVuZGVuY3kgaXNzdWVzIHdoZW4gbGF5ZXIgdXBkYXRlc1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==