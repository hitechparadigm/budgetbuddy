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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLGlFQUFtRDtBQUNuRCwrREFBaUQ7QUFHakQsTUFBYSxTQUFVLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUF5QnRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEI7Ozs7O1dBS0c7UUFDSCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDaEUsWUFBWSxFQUFFLG1CQUFtQjtZQUVqQyxpREFBaUQ7WUFDakQsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2dCQUNYLFFBQVEsRUFBRSxLQUFLLEVBQUUsa0NBQWtDO2FBQ3BEO1lBRUQsbURBQW1EO1lBQ25ELFVBQVUsRUFBRTtnQkFDVixLQUFLLEVBQUUsSUFBSTthQUNaO1lBRUQsaURBQWlEO1lBQ2pELGtCQUFrQixFQUFFO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0wsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUksRUFBRSw4QkFBOEI7aUJBQzlDO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1YsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULFFBQVEsRUFBRSxLQUFLLEVBQUUsMENBQTBDO29CQUMzRCxPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxP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O1NBQ2hGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQW5VRCw4QkFtVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQXV0aGVudGljYXRpb24gU3RhY2sgZm9yIEJ1ZGdldEJ1ZGR5IEFwcGxpY2F0aW9uXHJcbiAqXHJcbiAqIENyZWF0ZXMgQW1hem9uIENvZ25pdG8gVXNlciBQb29sIGFuZCBVc2VyIFBvb2wgQ2xpZW50IGZvciBoYW5kbGluZ1xyXG4gKiB1c2VyIGF1dGhlbnRpY2F0aW9uLCByZWdpc3RyYXRpb24sIGFuZCBhdXRob3JpemF0aW9uLiBDb25maWd1cmVkIHdpdGhcclxuICogY3VzdG9tIGF0dHJpYnV0ZXMgZm9yIGZhbWlseSByZWxhdGlvbnNoaXBzIGFuZCBhY2NvdW50IHR5cGVzLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gRW1haWwtYmFzZWQgYXV0aGVudGljYXRpb24gd2l0aCB2ZXJpZmljYXRpb25cclxuICogLSBDdXN0b20gYXR0cmlidXRlcyBmb3IgZmFtaWx5IGFuZCBzdWJzY3JpcHRpb24gZGF0YVxyXG4gKiAtIFBhc3N3b3JkIHBvbGljaWVzIGZvciBzZWN1cml0eVxyXG4gKiAtIE1GQSBzdXBwb3J0IChvcHRpb25hbClcclxuICogLSBMYW1iZGEgdHJpZ2dlcnMgZm9yIGN1c3RvbSBhdXRoZW50aWNhdGlvbiBmbG93c1xyXG4gKlxyXG4gKiBMYXN0IFVwZGF0ZWQ6IDIwMjYtMDEtMzEgLSBSZWRlcGxveW1lbnQgdG8gZml4IFVQREFURV9ST0xMQkFDS19DT01QTEVURSBzdGF0ZVxyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEF1dGhTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqXHJcbiAgICogQ29nbml0byBVc2VyIFBvb2wgZm9yIHVzZXIgbWFuYWdlbWVudFxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG5cclxuICAvKipcclxuICAgKiBVc2VyIFBvb2wgQ2xpZW50IGZvciBhcHBsaWNhdGlvbiBhdXRoZW50aWNhdGlvblxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xyXG5cclxuICAvKipcclxuICAgKiBMYW1iZGEgTGF5ZXIgd2l0aCBzaGFyZWQgYXV0aGVudGljYXRpb24gdXRpbGl0aWVzXHJcbiAgICogRXhwb3NlZCBhcyBwdWJsaWMgcHJvcGVydHkgZm9yIHVzZSBpbiBBUEkgc3RhY2tcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgYXV0aFNoYXJlZExheWVyOiBsYW1iZGEuTGF5ZXJWZXJzaW9uO1xyXG5cclxuICAvKipcclxuICAgKiBBZG1pbiBncm91cCBmb3IgYWRtaW5pc3RyYXRpdmUgdXNlcnNcclxuICAgKiBVc2VycyBpbiB0aGlzIGdyb3VwIGhhdmUgYWNjZXNzIHRvIGFkbWluIGRhc2hib2FyZFxyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBhZG1pbkdyb3VwOiBjb2duaXRvLkNmblVzZXJQb29sR3JvdXA7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTWFpbiBVc2VyIFBvb2wgZm9yIEJ1ZGdldEJ1ZGR5IGFwcGxpY2F0aW9uXHJcbiAgICAgKlxyXG4gICAgICogSGFuZGxlcyB1c2VyIHJlZ2lzdHJhdGlvbiwgYXV0aGVudGljYXRpb24sIGFuZCBwcm9maWxlIG1hbmFnZW1lbnRcclxuICAgICAqIHdpdGggY3VzdG9tIGF0dHJpYnV0ZXMgc3BlY2lmaWMgdG8gYnVkZ2V0aW5nIGFwcGxpY2F0aW9uIG5lZWRzLlxyXG4gICAgICovXHJcbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ0J1ZGdldEJ1ZGR5VXNlclBvb2wnLCB7XHJcbiAgICAgIHVzZXJQb29sTmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXJzJyxcclxuXHJcbiAgICAgIC8vIEVtYWlsLWJhc2VkIHNpZ24taW4gZm9yIGJldHRlciB1c2VyIGV4cGVyaWVuY2VcclxuICAgICAgc2lnbkluQWxpYXNlczoge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgIHVzZXJuYW1lOiBmYWxzZSwgLy8gRGlzYWJsZSB1c2VybmFtZSB0byBzaW1wbGlmeSBVWFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXV0by12ZXJpZnkgZW1haWwgYWRkcmVzc2VzIGZvciBhY2NvdW50IHNlY3VyaXR5XHJcbiAgICAgIGF1dG9WZXJpZnk6IHtcclxuICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFN0YW5kYXJkIGF0dHJpYnV0ZXMgcmVxdWlyZWQgZm9yIHVzZXIgcHJvZmlsZXNcclxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgZW1haWw6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSwgLy8gQWxsb3cgdXNlcnMgdG8gY2hhbmdlIGVtYWlsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnaXZlbk5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbWlseU5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJpcnRoZGF0ZToge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLCAvLyBXZSBjb2xsZWN0IGFnZSBzZXBhcmF0ZWx5IGluIG9uYm9hcmRpbmdcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhZGRyZXNzOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsIC8vIFdlIGNvbGxlY3QgbG9jYXRpb24gaW4gb25ib2FyZGluZ1xyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3VzdG9tIGF0dHJpYnV0ZXMgc3BlY2lmaWMgdG8gQnVkZ2V0QnVkZHlcclxuICAgICAgY3VzdG9tQXR0cmlidXRlczoge1xyXG4gICAgICAgIC8vIFVuaXF1ZSB1c2VyIGlkZW50aWZpZXIgZm9yIER5bmFtb0RCIGludGVncmF0aW9uXHJcbiAgICAgICAgdXNlcklkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiA1MCxcclxuICAgICAgICAgIG11dGFibGU6IGZhbHNlLCAvLyBVc2VyIElEIHNob3VsZCBub3QgY2hhbmdlIG9uY2Ugc2V0XHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIEZhbWlseSBhY2NvdW50IGFzc29jaWF0aW9uXHJcbiAgICAgICAgZmFtaWx5SWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDUwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gVXNlciByb2xlIHdpdGhpbiBmYW1pbHkgKHByaW1hcnksIHNwb3VzZSwgdmlld2VyKVxyXG4gICAgICAgIGZhbWlseVJvbGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDIwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gQWNjb3VudCB0eXBlIChzaW5nbGUgb3IgZmFtaWx5KVxyXG4gICAgICAgIGFjY291bnRUeXBlOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAyMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIFN1YnNjcmlwdGlvbiB0aWVyIChmcmVlIG9yIHByZW1pdW0pXHJcbiAgICAgICAgc3Vic2NyaXB0aW9uVGllcjogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMjAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBPbmJvYXJkaW5nIGNvbXBsZXRpb24gc3RhdHVzXHJcbiAgICAgICAgb25ib2FyZGluZ0NvbXBsZXRlZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBVc2VyJ3MgY291bnRyeSBmb3IgcmVnaW9uYWwgZmVhdHVyZXNcclxuICAgICAgICBjb3VudHJ5OiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAxMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTdHJvbmcgcGFzc3dvcmQgcG9saWN5IGZvciBzZWN1cml0eVxyXG4gICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgIG1pbkxlbmd0aDogOCxcclxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlU3ltYm9sczogZmFsc2UsIC8vIEtlZXAgaXQgdXNlci1mcmllbmRseVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQWNjb3VudCByZWNvdmVyeSBvcHRpb25zXHJcbiAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcclxuXHJcbiAgICAgIC8vIEVtYWlsIGNvbmZpZ3VyYXRpb24gZm9yIHZlcmlmaWNhdGlvbiBhbmQgbm90aWZpY2F0aW9uc1xyXG4gICAgICBlbWFpbDogY29nbml0by5Vc2VyUG9vbEVtYWlsLndpdGhDb2duaXRvKCdub3JlcGx5QGJ1ZGdldGJ1ZGR5LmNvbScpLFxyXG5cclxuICAgICAgLy8gU2VsZi1zZXJ2aWNlIGFjY291bnQgbWFuYWdlbWVudFxyXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgdXNlclZlcmlmaWNhdGlvbjoge1xyXG4gICAgICAgIGVtYWlsU3ViamVjdDogJ1dlbGNvbWUgdG8gQnVkZ2V0QnVkZHkgLSBWZXJpZnkgeW91ciBlbWFpbCcsXHJcbiAgICAgICAgZW1haWxCb2R5OiAnV2VsY29tZSB0byBCdWRnZXRCdWRkeSEgUGxlYXNlIGNsaWNrIHRoZSBsaW5rIGJlbG93IHRvIHZlcmlmeSB5b3VyIGVtYWlsIGFkZHJlc3M6IHsjI1ZlcmlmeSBFbWFpbCMjfScsXHJcbiAgICAgICAgZW1haWxTdHlsZTogY29nbml0by5WZXJpZmljYXRpb25FbWFpbFN0eWxlLkxJTkssXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBdXRvbWF0aWMgY2xlYW51cCBvZiB1bnZlcmlmaWVkIGFjY291bnRzIGFmdGVyIDcgZGF5c1xyXG4gICAgICB1c2VySW52aXRhdGlvbjoge1xyXG4gICAgICAgIGVtYWlsU3ViamVjdDogJ1dlbGNvbWUgdG8gQnVkZ2V0QnVkZHknLFxyXG4gICAgICAgIGVtYWlsQm9keTogJ0hlbGxvIHt1c2VybmFtZX0sIHlvdSBoYXZlIGJlZW4gaW52aXRlZCB0byBqb2luIEJ1ZGdldEJ1ZGR5LiBZb3VyIHRlbXBvcmFyeSBwYXNzd29yZCBpcyB7IyMjI30nLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRGV2aWNlIHRyYWNraW5nIGZvciBzZWN1cml0eSAob3B0aW9uYWwpXHJcbiAgICAgIGRldmljZVRyYWNraW5nOiB7XHJcbiAgICAgICAgY2hhbGxlbmdlUmVxdWlyZWRPbk5ld0RldmljZTogZmFsc2UsIC8vIEtlZXAgVVggc2ltcGxlIGZvciBNVlBcclxuICAgICAgICBkZXZpY2VPbmx5UmVtZW1iZXJlZE9uVXNlclByb21wdDogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEF1dG9tYXRpYyBkZWxldGlvbiB3aGVuIHN0YWNrIGlzIGRlc3Ryb3llZCAoZm9yIGRldiBlbnZpcm9ubWVudHMpXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFVzZXIgUG9vbCBDbGllbnQgZm9yIHdlYiBhbmQgbW9iaWxlIGFwcGxpY2F0aW9uc1xyXG4gICAgICpcclxuICAgICAqIENvbmZpZ3VyZXMgYXV0aGVudGljYXRpb24gZmxvd3MgYW5kIHRva2VuIHNldHRpbmdzIGZvciB0aGVcclxuICAgICAqIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhcHBsaWNhdGlvbnMgKHdlYiwgaU9TLCBBbmRyb2lkKS5cclxuICAgICAqL1xyXG4gICAgdGhpcy51c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KHRoaXMsICdCdWRnZXRCdWRkeVVzZXJQb29sQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcclxuICAgICAgdXNlclBvb2xDbGllbnROYW1lOiAnYnVkZ2V0YnVkZHktY2xpZW50JyxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSBhdXRoZW50aWNhdGlvbiBmbG93cyBuZWVkZWQgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gICAgICBhdXRoRmxvd3M6IHtcclxuICAgICAgICB1c2VyU3JwOiB0cnVlLCAvLyBTZWN1cmUgUmVtb3RlIFBhc3N3b3JkIGZvciB3ZWIvbW9iaWxlXHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLCAvLyBBbGxvdyB1c2VybmFtZS9wYXNzd29yZCBhdXRoXHJcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IGZhbHNlLCAvLyBEaXNhYmxlIGFkbWluIGF1dGggZm9yIHNlY3VyaXR5XHJcbiAgICAgICAgY3VzdG9tOiBmYWxzZSwgLy8gTm8gY3VzdG9tIGF1dGggZmxvd3MgZm9yIE1WUFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gVG9rZW4gY29uZmlndXJhdGlvbiBmb3Igc2VjdXJpdHkgYW5kIFVYIGJhbGFuY2VcclxuICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLCAvLyBTaG9ydC1saXZlZCBmb3Igc2VjdXJpdHlcclxuICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIHJlZnJlc2hUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzMCksIC8vIEFsbG93IHN0YXlpbmcgbG9nZ2VkIGluXHJcblxyXG4gICAgICAvLyBQcmV2ZW50IHVzZXIgZXhpc3RlbmNlIGVycm9ycyBmb3Igc2VjdXJpdHlcclxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXHJcblxyXG4gICAgICAvLyBPQXV0aCBjb25maWd1cmF0aW9uIGZvciBmdXR1cmUgc29jaWFsIGxvZ2luIGludGVncmF0aW9uXHJcbiAgICAgIG9BdXRoOiB7XHJcbiAgICAgICAgZmxvd3M6IHtcclxuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXHJcbiAgICAgICAgICBpbXBsaWNpdENvZGVHcmFudDogZmFsc2UsIC8vIExlc3Mgc2VjdXJlLCBhdm9pZCBmb3IgcHJvZHVjdGlvblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2NvcGVzOiBbXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuRU1BSUwsXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuT1BFTklELFxyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEUsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBjYWxsYmFja1VybHM6IFtcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXV0aC9jYWxsYmFjaycsIC8vIExvY2FsIGRldmVsb3BtZW50XHJcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAuYnVkZ2V0YnVkZHkuY29tL2F1dGgvY2FsbGJhY2snLCAvLyBQcm9kdWN0aW9uIHdlYlxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgbG9nb3V0VXJsczogW1xyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2xvZ291dCcsXHJcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAuYnVkZ2V0YnVkZHkuY29tL2F1dGgvbG9nb3V0JyxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRW5hYmxlIHJlYWRpbmcgYW5kIHdyaXRpbmcgYWxsIGN1c3RvbSBhdHRyaWJ1dGVzXHJcbiAgICAgIHJlYWRBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcclxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgICBhZGRyZXNzOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKFxyXG4gICAgICAgICAgJ3VzZXJJZCcsXHJcbiAgICAgICAgICAnZmFtaWx5SWQnLFxyXG4gICAgICAgICAgJ2ZhbWlseVJvbGUnLFxyXG4gICAgICAgICAgJ2FjY291bnRUeXBlJyxcclxuICAgICAgICAgICdzdWJzY3JpcHRpb25UaWVyJyxcclxuICAgICAgICAgICdvbmJvYXJkaW5nQ29tcGxldGVkJyxcclxuICAgICAgICAgICdjb3VudHJ5J1xyXG4gICAgICAgICksXHJcblxyXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZ2l2ZW5OYW1lOiB0cnVlLFxyXG4gICAgICAgICAgZmFtaWx5TmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGFkZHJlc3M6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoXHJcbiAgICAgICAgICAndXNlcklkJyxcclxuICAgICAgICAgICdmYW1pbHlJZCcsXHJcbiAgICAgICAgICAnZmFtaWx5Um9sZScsXHJcbiAgICAgICAgICAnYWNjb3VudFR5cGUnLFxyXG4gICAgICAgICAgJ3N1YnNjcmlwdGlvblRpZXInLFxyXG4gICAgICAgICAgJ29uYm9hcmRpbmdDb21wbGV0ZWQnLFxyXG4gICAgICAgICAgJ2NvdW50cnknXHJcbiAgICAgICAgKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBVc2VyIFBvb2wgSUQgZm9yIGNsaWVudCBjb25maWd1cmF0aW9uXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCBmb3IgQnVkZ2V0QnVkZHkgY2xpZW50IGF1dGhlbnRpY2F0aW9uIGNvbmZpZ3VyYXRpb24nLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktdXNlci1wb29sLWlkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRtaW4gVXNlciBHcm91cFxyXG4gICAgICpcclxuICAgICAqIFVzZXJzIGluIHRoaXMgZ3JvdXAgaGF2ZSBhY2Nlc3MgdG8gdGhlIGFkbWluIGRhc2hib2FyZCBhbmRcclxuICAgICAqIGFkbWluaXN0cmF0aXZlIGZ1bmN0aW9ucyBsaWtlIHVzZXIgbWFuYWdlbWVudCBhbmQgc3lzdGVtIG1vbml0b3JpbmcuXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYWRtaW5Hcm91cCA9IG5ldyBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAodGhpcywgJ0FkbWluR3JvdXAnLCB7XHJcbiAgICAgIHVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZ3JvdXBOYW1lOiAnQWRtaW5zJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdBZG1pbmlzdHJhdGl2ZSB1c2VycyB3aXRoIGFjY2VzcyB0byBhZG1pbiBkYXNoYm9hcmQgYW5kIHVzZXIgbWFuYWdlbWVudCcsXHJcbiAgICAgIHByZWNlZGVuY2U6IDEsIC8vIEhpZ2hlciBwcmVjZWRlbmNlIChsb3dlciBudW1iZXIpIGZvciBhZG1pbiByb2xlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgQWRtaW4gR3JvdXAgbmFtZSBmb3IgcmVmZXJlbmNlXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWRtaW5Hcm91cE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFkbWluR3JvdXAuZ3JvdXBOYW1lIHx8ICdBZG1pbnMnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gQWRtaW4gR3JvdXAgbmFtZSBmb3IgYWRtaW5pc3RyYXRpdmUgdXNlciBtYW5hZ2VtZW50JyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBVc2VyIFBvb2wgQ2xpZW50IElEIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgQ2xpZW50IElEIGZvciBCdWRnZXRCdWRkeSB3ZWIgYW5kIG1vYmlsZSBhcHBsaWNhdGlvbnMnLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktdXNlci1wb29sLWNsaWVudC1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIEFSTiBmb3IgSUFNIHBvbGljaWVzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIEFSTiBmb3IgQnVkZ2V0QnVkZHkgSUFNIHBvbGljeSBjb25maWd1cmF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1hcm4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTaGFyZWQgTGFtYmRhIExheWVyIGZvciBhdXRoZW50aWNhdGlvbiB1dGlsaXRpZXNcclxuICAgICAqXHJcbiAgICAgKiBDb250YWlucyBjb21tb24gY29kZSB1c2VkIGFjcm9zcyBhbGwgYXV0aCBMYW1iZGEgZnVuY3Rpb25zOlxyXG4gICAgICogLSBDT1JTIGhhbmRsaW5nIChjb3JzLmpzKVxyXG4gICAgICogLSBUb2tlbiBwYXJzaW5nICh0b2tlbi1wYXJzZXIuanMpXHJcbiAgICAgKiAtIElucHV0IHZhbGlkYXRpb24gKHZhbGlkYXRvcnMuanMpXHJcbiAgICAgKiAtIEVycm9yIGZvcm1hdHRpbmcgKGVycm9ycy5qcylcclxuICAgICAqL1xyXG4gICAgdGhpcy5hdXRoU2hhcmVkTGF5ZXIgPSBuZXcgbGFtYmRhLkxheWVyVmVyc2lvbih0aGlzLCAnQXV0aFNoYXJlZExheWVyJywge1xyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvbGF5ZXJzL3NoYXJlZCcpLFxyXG4gICAgICBjb21wYXRpYmxlUnVudGltZXM6IFtsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWF0sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2hhcmVkIGF1dGhlbnRpY2F0aW9uIHV0aWxpdGllcyBmb3IgQnVkZ2V0QnVkZHkgYXV0aCBMYW1iZGEgZnVuY3Rpb25zJyxcclxuICAgICAgbGF5ZXJWZXJzaW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGgtc2hhcmVkJyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLCAvLyBLZWVwIG9sZCB2ZXJzaW9ucyBmb3Igcm9sbGJhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIGNvc3QgYWxsb2NhdGlvbiB0YWdzXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ0NvbXBvbmVudCcsICdBdXRoZW50aWNhdGlvbicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdTZXJ2aWNlJywgJ0NvZ25pdG8nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudXNlclBvb2wpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1BdXRoJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1VzZXJUeXBlJywgJ0FwcGxpY2F0aW9uLVVzZXJzJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1NlY3VyaXR5TGV2ZWwnLCAnSGlnaCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdMYXN0RGVwbG95bWVudCcsICcyMDI2LTAxLTMxJyk7XHJcblxyXG4gICAgLy8gQWRkIHRhZ3MgdG8gTGFtYmRhIExheWVyXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmF1dGhTaGFyZWRMYXllcikuYWRkKCdDb21wb25lbnQnLCAnQXV0aGVudGljYXRpb24nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYXV0aFNoYXJlZExheWVyKS5hZGQoJ1NlcnZpY2UnLCAnTGFtYmRhLUxheWVyJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmF1dGhTaGFyZWRMYXllcikuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUF1dGgnKTtcclxuXHJcbiAgICAvLyBPdXRwdXQgTGFtYmRhIExheWVyIEFSTiBmb3IgcmVmZXJlbmNlIChubyBleHBvcnQgdG8gYXZvaWQgY3Jvc3Mtc3RhY2sgZGVwZW5kZW5jeSBpc3N1ZXMpXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXV0aFNoYXJlZExheWVyQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hdXRoU2hhcmVkTGF5ZXIubGF5ZXJWZXJzaW9uQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBMYXllciBBUk4gZm9yIHNoYXJlZCBhdXRoZW50aWNhdGlvbiB1dGlsaXRpZXMnLFxyXG4gICAgICAvLyBSZW1vdmVkIGV4cG9ydE5hbWUgdG8gYXZvaWQgY3Jvc3Mtc3RhY2sgZGVwZW5kZW5jeSBpc3N1ZXMgd2hlbiBsYXllciB1cGRhdGVzXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19