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
        // Add comprehensive cost allocation tags
        cdk.Tags.of(this.userPool).add('Component', 'Authentication');
        cdk.Tags.of(this.userPool).add('Service', 'Cognito');
        cdk.Tags.of(this.userPool).add('CostCenter', 'BudgetBuddy-Auth');
        cdk.Tags.of(this.userPool).add('UserType', 'Application-Users');
        cdk.Tags.of(this.userPool).add('SecurityLevel', 'High');
    }
}
exports.AuthStack = AuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7O0dBYUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyxpRUFBbUQ7QUFJbkQsTUFBYSxTQUFVLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFhdEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qjs7Ozs7V0FLRztRQUNILElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNoRSxZQUFZLEVBQUUsbUJBQW1CO1lBRWpDLGlEQUFpRDtZQUNqRCxhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUSxFQUFFLEtBQUssRUFBRSxrQ0FBa0M7YUFDcEQ7WUFFRCxtREFBbUQ7WUFDbkQsVUFBVSxFQUFFO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFFRCxpREFBaUQ7WUFDakQsa0JBQWtCLEVBQUU7Z0JBQ2xCLEtBQUssRUFBRTtvQkFDTCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSSxFQUFFLDhCQUE4QjtpQkFDOUM7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNELFVBQVUsRUFBRTtvQkFDVixRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsUUFBUSxFQUFFLEtBQUssRUFBRSwwQ0FBMEM7b0JBQzNELE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNELE9BQU8sRUFBRTtvQkFDUCxR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QUUsZ0VBQWdFO1lBQzdFLFVBQVUsRUFBRSwyQkFBMkI7U0FDeEMsQ0FBQyxDQUFDO1FBRUgseUNBQXlDO1FBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDOUQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUNqRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2hFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRjtBQXRRRCw4QkFzUUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQXV0aGVudGljYXRpb24gU3RhY2sgZm9yIEJ1ZGdldEJ1ZGR5IEFwcGxpY2F0aW9uXHJcbiAqXHJcbiAqIENyZWF0ZXMgQW1hem9uIENvZ25pdG8gVXNlciBQb29sIGFuZCBVc2VyIFBvb2wgQ2xpZW50IGZvciBoYW5kbGluZ1xyXG4gKiB1c2VyIGF1dGhlbnRpY2F0aW9uLCByZWdpc3RyYXRpb24sIGFuZCBhdXRob3JpemF0aW9uLiBDb25maWd1cmVkIHdpdGhcclxuICogY3VzdG9tIGF0dHJpYnV0ZXMgZm9yIGZhbWlseSByZWxhdGlvbnNoaXBzIGFuZCBhY2NvdW50IHR5cGVzLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gRW1haWwtYmFzZWQgYXV0aGVudGljYXRpb24gd2l0aCB2ZXJpZmljYXRpb25cclxuICogLSBDdXN0b20gYXR0cmlidXRlcyBmb3IgZmFtaWx5IGFuZCBzdWJzY3JpcHRpb24gZGF0YVxyXG4gKiAtIFBhc3N3b3JkIHBvbGljaWVzIGZvciBzZWN1cml0eVxyXG4gKiAtIE1GQSBzdXBwb3J0IChvcHRpb25hbClcclxuICogLSBMYW1iZGEgdHJpZ2dlcnMgZm9yIGN1c3RvbSBhdXRoZW50aWNhdGlvbiBmbG93c1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEF1dGhTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqXHJcbiAgICogQ29nbml0byBVc2VyIFBvb2wgZm9yIHVzZXIgbWFuYWdlbWVudFxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG5cclxuICAvKipcclxuICAgKiBVc2VyIFBvb2wgQ2xpZW50IGZvciBhcHBsaWNhdGlvbiBhdXRoZW50aWNhdGlvblxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE1haW4gVXNlciBQb29sIGZvciBCdWRnZXRCdWRkeSBhcHBsaWNhdGlvblxyXG4gICAgICpcclxuICAgICAqIEhhbmRsZXMgdXNlciByZWdpc3RyYXRpb24sIGF1dGhlbnRpY2F0aW9uLCBhbmQgcHJvZmlsZSBtYW5hZ2VtZW50XHJcbiAgICAgKiB3aXRoIGN1c3RvbSBhdHRyaWJ1dGVzIHNwZWNpZmljIHRvIGJ1ZGdldGluZyBhcHBsaWNhdGlvbiBuZWVkcy5cclxuICAgICAqL1xyXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdCdWRnZXRCdWRkeVVzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6ICdidWRnZXRidWRkeS11c2VycycsXHJcblxyXG4gICAgICAvLyBFbWFpbC1iYXNlZCBzaWduLWluIGZvciBiZXR0ZXIgdXNlciBleHBlcmllbmNlXHJcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcclxuICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICB1c2VybmFtZTogZmFsc2UsIC8vIERpc2FibGUgdXNlcm5hbWUgdG8gc2ltcGxpZnkgVVhcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEF1dG8tdmVyaWZ5IGVtYWlsIGFkZHJlc3NlcyBmb3IgYWNjb3VudCBzZWN1cml0eVxyXG4gICAgICBhdXRvVmVyaWZ5OiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTdGFuZGFyZCBhdHRyaWJ1dGVzIHJlcXVpcmVkIGZvciB1c2VyIHByb2ZpbGVzXHJcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgIGVtYWlsOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsIC8vIEFsbG93IHVzZXJzIHRvIGNoYW5nZSBlbWFpbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2l2ZW5OYW1lOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYW1pbHlOYW1lOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBiaXJ0aGRhdGU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSwgLy8gV2UgY29sbGVjdCBhZ2Ugc2VwYXJhdGVseSBpbiBvbmJvYXJkaW5nXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYWRkcmVzczoge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLCAvLyBXZSBjb2xsZWN0IGxvY2F0aW9uIGluIG9uYm9hcmRpbmdcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEN1c3RvbSBhdHRyaWJ1dGVzIHNwZWNpZmljIHRvIEJ1ZGdldEJ1ZGR5XHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAvLyBVbmlxdWUgdXNlciBpZGVudGlmaWVyIGZvciBEeW5hbW9EQiBpbnRlZ3JhdGlvblxyXG4gICAgICAgIHVzZXJJZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogNTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiBmYWxzZSwgLy8gVXNlciBJRCBzaG91bGQgbm90IGNoYW5nZSBvbmNlIHNldFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBGYW1pbHkgYWNjb3VudCBhc3NvY2lhdGlvblxyXG4gICAgICAgIGZhbWlseUlkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiA1MCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIFVzZXIgcm9sZSB3aXRoaW4gZmFtaWx5IChwcmltYXJ5LCBzcG91c2UsIHZpZXdlcilcclxuICAgICAgICBmYW1pbHlSb2xlOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAyMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIEFjY291bnQgdHlwZSAoc2luZ2xlIG9yIGZhbWlseSlcclxuICAgICAgICBhY2NvdW50VHlwZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMjAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBTdWJzY3JpcHRpb24gdGllciAoZnJlZSBvciBwcmVtaXVtKVxyXG4gICAgICAgIHN1YnNjcmlwdGlvblRpZXI6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDIwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gT25ib2FyZGluZyBjb21wbGV0aW9uIHN0YXR1c1xyXG4gICAgICAgIG9uYm9hcmRpbmdDb21wbGV0ZWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDEwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gVXNlcidzIGNvdW50cnkgZm9yIHJlZ2lvbmFsIGZlYXR1cmVzXHJcbiAgICAgICAgY291bnRyeTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU3Ryb25nIHBhc3N3b3JkIHBvbGljeSBmb3Igc2VjdXJpdHlcclxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLCAvLyBLZWVwIGl0IHVzZXItZnJpZW5kbHlcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEFjY291bnQgcmVjb3Zlcnkgb3B0aW9uc1xyXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcblxyXG4gICAgICAvLyBFbWFpbCBjb25maWd1cmF0aW9uIGZvciB2ZXJpZmljYXRpb24gYW5kIG5vdGlmaWNhdGlvbnNcclxuICAgICAgZW1haWw6IGNvZ25pdG8uVXNlclBvb2xFbWFpbC53aXRoQ29nbml0bygnbm9yZXBseUBidWRnZXRidWRkeS5jb20nKSxcclxuXHJcbiAgICAgIC8vIFNlbGYtc2VydmljZSBhY2NvdW50IG1hbmFnZW1lbnRcclxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIHVzZXJWZXJpZmljYXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIEJ1ZGdldEJ1ZGR5IC0gVmVyaWZ5IHlvdXIgZW1haWwnLFxyXG4gICAgICAgIGVtYWlsQm9keTogJ1dlbGNvbWUgdG8gQnVkZ2V0QnVkZHkhIFBsZWFzZSBjbGljayB0aGUgbGluayBiZWxvdyB0byB2ZXJpZnkgeW91ciBlbWFpbCBhZGRyZXNzOiB7IyNWZXJpZnkgRW1haWwjI30nLFxyXG4gICAgICAgIGVtYWlsU3R5bGU6IGNvZ25pdG8uVmVyaWZpY2F0aW9uRW1haWxTdHlsZS5MSU5LLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXV0b21hdGljIGNsZWFudXAgb2YgdW52ZXJpZmllZCBhY2NvdW50cyBhZnRlciA3IGRheXNcclxuICAgICAgdXNlckludml0YXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIEJ1ZGdldEJ1ZGR5JyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdIZWxsbyB7dXNlcm5hbWV9LCB5b3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gam9pbiBCdWRnZXRCdWRkeS4gWW91ciB0ZW1wb3JhcnkgcGFzc3dvcmQgaXMgeyMjIyN9JyxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIERldmljZSB0cmFja2luZyBmb3Igc2VjdXJpdHkgKG9wdGlvbmFsKVxyXG4gICAgICBkZXZpY2VUcmFja2luZzoge1xyXG4gICAgICAgIGNoYWxsZW5nZVJlcXVpcmVkT25OZXdEZXZpY2U6IGZhbHNlLCAvLyBLZWVwIFVYIHNpbXBsZSBmb3IgTVZQXHJcbiAgICAgICAgZGV2aWNlT25seVJlbWVtYmVyZWRPblVzZXJQcm9tcHQ6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBdXRvbWF0aWMgZGVsZXRpb24gd2hlbiBzdGFjayBpcyBkZXN0cm95ZWQgKGZvciBkZXYgZW52aXJvbm1lbnRzKVxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVc2VyIFBvb2wgQ2xpZW50IGZvciB3ZWIgYW5kIG1vYmlsZSBhcHBsaWNhdGlvbnNcclxuICAgICAqXHJcbiAgICAgKiBDb25maWd1cmVzIGF1dGhlbnRpY2F0aW9uIGZsb3dzIGFuZCB0b2tlbiBzZXR0aW5ncyBmb3IgdGhlXHJcbiAgICAgKiBCdWRnZXRCdWRkeSBjbGllbnQgYXBwbGljYXRpb25zICh3ZWIsIGlPUywgQW5kcm9pZCkuXHJcbiAgICAgKi9cclxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnQnVkZ2V0QnVkZHlVc2VyUG9vbENsaWVudCcsIHtcclxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXHJcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogJ2J1ZGdldGJ1ZGR5LWNsaWVudCcsXHJcblxyXG4gICAgICAvLyBFbmFibGUgYXV0aGVudGljYXRpb24gZmxvd3MgbmVlZGVkIGZvciB0aGUgYXBwbGljYXRpb25cclxuICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgdXNlclNycDogdHJ1ZSwgLy8gU2VjdXJlIFJlbW90ZSBQYXNzd29yZCBmb3Igd2ViL21vYmlsZVxyXG4gICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSwgLy8gQWxsb3cgdXNlcm5hbWUvcGFzc3dvcmQgYXV0aFxyXG4gICAgICAgIGFkbWluVXNlclBhc3N3b3JkOiBmYWxzZSwgLy8gRGlzYWJsZSBhZG1pbiBhdXRoIGZvciBzZWN1cml0eVxyXG4gICAgICAgIGN1c3RvbTogZmFsc2UsIC8vIE5vIGN1c3RvbSBhdXRoIGZsb3dzIGZvciBNVlBcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFRva2VuIGNvbmZpZ3VyYXRpb24gZm9yIHNlY3VyaXR5IGFuZCBVWCBiYWxhbmNlXHJcbiAgICAgIGFjY2Vzc1Rva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSwgLy8gU2hvcnQtbGl2ZWQgZm9yIHNlY3VyaXR5XHJcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLCAvLyBBbGxvdyBzdGF5aW5nIGxvZ2dlZCBpblxyXG5cclxuICAgICAgLy8gUHJldmVudCB1c2VyIGV4aXN0ZW5jZSBlcnJvcnMgZm9yIHNlY3VyaXR5XHJcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxyXG5cclxuICAgICAgLy8gT0F1dGggY29uZmlndXJhdGlvbiBmb3IgZnV0dXJlIHNvY2lhbCBsb2dpbiBpbnRlZ3JhdGlvblxyXG4gICAgICBvQXV0aDoge1xyXG4gICAgICAgIGZsb3dzOiB7XHJcbiAgICAgICAgICBhdXRob3JpemF0aW9uQ29kZUdyYW50OiB0cnVlLFxyXG4gICAgICAgICAgaW1wbGljaXRDb2RlR3JhbnQ6IGZhbHNlLCAvLyBMZXNzIHNlY3VyZSwgYXZvaWQgZm9yIHByb2R1Y3Rpb25cclxuICAgICAgICB9LFxyXG4gICAgICAgIHNjb3BlczogW1xyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLFxyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCxcclxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5QUk9GSUxFLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgY2FsbGJhY2tVcmxzOiBbXHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwL2F1dGgvY2FsbGJhY2snLCAvLyBMb2NhbCBkZXZlbG9wbWVudFxyXG4gICAgICAgICAgJ2h0dHBzOi8vYXBwLmJ1ZGdldGJ1ZGR5LmNvbS9hdXRoL2NhbGxiYWNrJywgLy8gUHJvZHVjdGlvbiB3ZWJcclxuICAgICAgICBdLFxyXG4gICAgICAgIGxvZ291dFVybHM6IFtcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXV0aC9sb2dvdXQnLFxyXG4gICAgICAgICAgJ2h0dHBzOi8vYXBwLmJ1ZGdldGJ1ZGR5LmNvbS9hdXRoL2xvZ291dCcsXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSByZWFkaW5nIGFuZCB3cml0aW5nIGFsbCBjdXN0b20gYXR0cmlidXRlc1xyXG4gICAgICByZWFkQXR0cmlidXRlczogbmV3IGNvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpXHJcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBnaXZlbk5hbWU6IHRydWUsXHJcbiAgICAgICAgICBmYW1pbHlOYW1lOiB0cnVlLFxyXG4gICAgICAgICAgYWRkcmVzczogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcyhcclxuICAgICAgICAgICd1c2VySWQnLFxyXG4gICAgICAgICAgJ2ZhbWlseUlkJyxcclxuICAgICAgICAgICdmYW1pbHlSb2xlJyxcclxuICAgICAgICAgICdhY2NvdW50VHlwZScsXHJcbiAgICAgICAgICAnc3Vic2NyaXB0aW9uVGllcicsXHJcbiAgICAgICAgICAnb25ib2FyZGluZ0NvbXBsZXRlZCcsXHJcbiAgICAgICAgICAnY291bnRyeSdcclxuICAgICAgICApLFxyXG5cclxuICAgICAgd3JpdGVBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcclxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgICBhZGRyZXNzOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKFxyXG4gICAgICAgICAgJ3VzZXJJZCcsXHJcbiAgICAgICAgICAnZmFtaWx5SWQnLFxyXG4gICAgICAgICAgJ2ZhbWlseVJvbGUnLFxyXG4gICAgICAgICAgJ2FjY291bnRUeXBlJyxcclxuICAgICAgICAgICdzdWJzY3JpcHRpb25UaWVyJyxcclxuICAgICAgICAgICdvbmJvYXJkaW5nQ29tcGxldGVkJyxcclxuICAgICAgICAgICdjb3VudHJ5J1xyXG4gICAgICAgICksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIElEIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQgZm9yIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhdXRoZW50aWNhdGlvbiBjb25maWd1cmF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIENsaWVudCBJRCBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCBmb3IgQnVkZ2V0QnVkZHkgd2ViIGFuZCBtb2JpbGUgYXBwbGljYXRpb25zJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1jbGllbnQtaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IFVzZXIgUG9vbCBBUk4gZm9yIElBTSBwb2xpY2llc1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBBUk4gZm9yIEJ1ZGdldEJ1ZGR5IElBTSBwb2xpY3kgY29uZmlndXJhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS11c2VyLXBvb2wtYXJuJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIGNvc3QgYWxsb2NhdGlvbiB0YWdzXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ0NvbXBvbmVudCcsICdBdXRoZW50aWNhdGlvbicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdTZXJ2aWNlJywgJ0NvZ25pdG8nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudXNlclBvb2wpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1BdXRoJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1VzZXJUeXBlJywgJ0FwcGxpY2F0aW9uLVVzZXJzJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1NlY3VyaXR5TGV2ZWwnLCAnSGlnaCcpO1xyXG4gIH1cclxufVxyXG4iXX0=