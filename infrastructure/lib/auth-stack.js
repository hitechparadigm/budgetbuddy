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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLGlFQUFtRDtBQUNuRCwrREFBaUQ7QUFHakQsTUFBYSxTQUFVLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUF5QnRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEI7Ozs7O1dBS0c7UUFDSCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDaEUsWUFBWSxFQUFFLG1CQUFtQjtZQUVqQyxpREFBaUQ7WUFDakQsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2dCQUNYLFFBQVEsRUFBRSxLQUFLLEVBQUUsa0NBQWtDO2FBQ3BEO1lBRUQsbURBQW1EO1lBQ25ELFVBQVUsRUFBRTtnQkFDVixLQUFLLEVBQUUsSUFBSTthQUNaO1lBRUQsaURBQWlEO1lBQ2pELGtCQUFrQixFQUFFO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0wsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUksRUFBRSw4QkFBOEI7aUJBQzlDO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1YsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULFFBQVEsRUFBRSxLQUFLLEVBQUUsMENBQTBDO29CQUMzRCxPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxP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LGtCQUFrQixDQUFDLENBQUM7UUFFeEUsMkZBQTJGO1FBQzNGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZTtZQUMzQyxXQUFXLEVBQUUsc0RBQXNEO1lBQ25FLCtFQUErRTtTQUNoRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUExVUQsOEJBMFVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEF1dGhlbnRpY2F0aW9uIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKlxyXG4gKiBDcmVhdGVzIEFtYXpvbiBDb2duaXRvIFVzZXIgUG9vbCBhbmQgVXNlciBQb29sIENsaWVudCBmb3IgaGFuZGxpbmdcclxuICogdXNlciBhdXRoZW50aWNhdGlvbiwgcmVnaXN0cmF0aW9uLCBhbmQgYXV0aG9yaXphdGlvbi4gQ29uZmlndXJlZCB3aXRoXHJcbiAqIGN1c3RvbSBhdHRyaWJ1dGVzIGZvciBmYW1pbHkgcmVsYXRpb25zaGlwcyBhbmQgYWNjb3VudCB0eXBlcy5cclxuICpcclxuICogS2V5IEZlYXR1cmVzOlxyXG4gKiAtIEVtYWlsLWJhc2VkIGF1dGhlbnRpY2F0aW9uIHdpdGggdmVyaWZpY2F0aW9uXHJcbiAqIC0gQ3VzdG9tIGF0dHJpYnV0ZXMgZm9yIGZhbWlseSBhbmQgc3Vic2NyaXB0aW9uIGRhdGFcclxuICogLSBQYXNzd29yZCBwb2xpY2llcyBmb3Igc2VjdXJpdHlcclxuICogLSBNRkEgc3VwcG9ydCAob3B0aW9uYWwpXHJcbiAqIC0gTGFtYmRhIHRyaWdnZXJzIGZvciBjdXN0b20gYXV0aGVudGljYXRpb24gZmxvd3NcclxuICpcclxuICogTGFzdCBVcGRhdGVkOiAyMDI2LTAxLTMxIC0gUmVkZXBsb3ltZW50IHRvIGZpeCBVUERBVEVfUk9MTEJBQ0tfQ09NUExFVEUgc3RhdGVcclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBdXRoU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIC8qKlxyXG4gICAqIENvZ25pdG8gVXNlciBQb29sIGZvciB1c2VyIG1hbmFnZW1lbnRcclxuICAgKiBFeHBvc2VkIGFzIHB1YmxpYyBwcm9wZXJ0eSBmb3IgdXNlIGluIG90aGVyIHN0YWNrc1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcclxuXHJcbiAgLyoqXHJcbiAgICogVXNlciBQb29sIENsaWVudCBmb3IgYXBwbGljYXRpb24gYXV0aGVudGljYXRpb25cclxuICAgKiBFeHBvc2VkIGFzIHB1YmxpYyBwcm9wZXJ0eSBmb3IgdXNlIGluIG90aGVyIHN0YWNrc1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbENsaWVudDogY29nbml0by5Vc2VyUG9vbENsaWVudDtcclxuXHJcbiAgLyoqXHJcbiAgICogTGFtYmRhIExheWVyIHdpdGggc2hhcmVkIGF1dGhlbnRpY2F0aW9uIHV0aWxpdGllc1xyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gQVBJIHN0YWNrXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGF1dGhTaGFyZWRMYXllcjogbGFtYmRhLkxheWVyVmVyc2lvbjtcclxuXHJcbiAgLyoqXHJcbiAgICogQWRtaW4gZ3JvdXAgZm9yIGFkbWluaXN0cmF0aXZlIHVzZXJzXHJcbiAgICogVXNlcnMgaW4gdGhpcyBncm91cCBoYXZlIGFjY2VzcyB0byBhZG1pbiBkYXNoYm9hcmRcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgYWRtaW5Hcm91cDogY29nbml0by5DZm5Vc2VyUG9vbEdyb3VwO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE1haW4gVXNlciBQb29sIGZvciBCdWRnZXRCdWRkeSBhcHBsaWNhdGlvblxyXG4gICAgICpcclxuICAgICAqIEhhbmRsZXMgdXNlciByZWdpc3RyYXRpb24sIGF1dGhlbnRpY2F0aW9uLCBhbmQgcHJvZmlsZSBtYW5hZ2VtZW50XHJcbiAgICAgKiB3aXRoIGN1c3RvbSBhdHRyaWJ1dGVzIHNwZWNpZmljIHRvIGJ1ZGdldGluZyBhcHBsaWNhdGlvbiBuZWVkcy5cclxuICAgICAqL1xyXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdCdWRnZXRCdWRkeVVzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6ICdidWRnZXRidWRkeS11c2VycycsXHJcblxyXG4gICAgICAvLyBFbWFpbC1iYXNlZCBzaWduLWluIGZvciBiZXR0ZXIgdXNlciBleHBlcmllbmNlXHJcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcclxuICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICB1c2VybmFtZTogZmFsc2UsIC8vIERpc2FibGUgdXNlcm5hbWUgdG8gc2ltcGxpZnkgVVhcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEF1dG8tdmVyaWZ5IGVtYWlsIGFkZHJlc3NlcyBmb3IgYWNjb3VudCBzZWN1cml0eVxyXG4gICAgICBhdXRvVmVyaWZ5OiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTdGFuZGFyZCBhdHRyaWJ1dGVzIHJlcXVpcmVkIGZvciB1c2VyIHByb2ZpbGVzXHJcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgIGVtYWlsOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsIC8vIEFsbG93IHVzZXJzIHRvIGNoYW5nZSBlbWFpbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2l2ZW5OYW1lOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYW1pbHlOYW1lOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBiaXJ0aGRhdGU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSwgLy8gV2UgY29sbGVjdCBhZ2Ugc2VwYXJhdGVseSBpbiBvbmJvYXJkaW5nXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYWRkcmVzczoge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLCAvLyBXZSBjb2xsZWN0IGxvY2F0aW9uIGluIG9uYm9hcmRpbmdcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEN1c3RvbSBhdHRyaWJ1dGVzIHNwZWNpZmljIHRvIEJ1ZGdldEJ1ZGR5XHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAvLyBVbmlxdWUgdXNlciBpZGVudGlmaWVyIGZvciBEeW5hbW9EQiBpbnRlZ3JhdGlvblxyXG4gICAgICAgIHVzZXJJZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogNTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiBmYWxzZSwgLy8gVXNlciBJRCBzaG91bGQgbm90IGNoYW5nZSBvbmNlIHNldFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBMZWdhY3k6IGZhbWlseSBhY2NvdW50IGFzc29jaWF0aW9uIOKAlCBrZXB0IGJlY2F1c2UgQ29nbml0byBzY2hlbWEgYXR0cmlidXRlc1xyXG4gICAgICAgIC8vIGNhbm5vdCBiZSBkZWxldGVkIG9uY2UgY3JlYXRlZC4gTXVzdCBOT1QgYmUgcmVxdWlyZWQ7IG5vdCB3cml0dGVuIGR1cmluZ1xyXG4gICAgICAgIC8vIHJlZ2lzdHJhdGlvbi4gQnVkZ2V0IG1lbWJlcnNoaXAgaXMgbm93IHJlc29sdmVkIGZyb20gRHluYW1vREIgdmlhXHJcbiAgICAgICAgLy8gQnVkZ2V0QWNjZXNzUmVzb2x2ZXIsIG5vdCBmcm9tIENvZ25pdG8gYXR0cmlidXRlcy5cclxuICAgICAgICBmYW1pbHlJZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogNTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLCAvLyBvcHRpb25hbCDigJQgbmV2ZXIgc2V0IGR1cmluZyByZWdpc3RyYXRpb25cclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gTGVnYWN5OiB1c2VyIHJvbGUgd2l0aGluIGZhbWlseSDigJQga2VwdCBiZWNhdXNlIENvZ25pdG8gc2NoZW1hIGF0dHJpYnV0ZXNcclxuICAgICAgICAvLyBjYW5ub3QgYmUgZGVsZXRlZCBvbmNlIGNyZWF0ZWQuIE11c3QgTk9UIGJlIHJlcXVpcmVkOyBub3Qgd3JpdHRlbiBkdXJpbmdcclxuICAgICAgICAvLyByZWdpc3RyYXRpb24uIFJvbGUgaXMgbm93IHJlc29sdmVkIGZyb20gRHluYW1vREIgdmlhIEJ1ZGdldEFjY2Vzc1Jlc29sdmVyLlxyXG4gICAgICAgIGZhbWlseVJvbGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDIwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSwgLy8gb3B0aW9uYWwg4oCUIG5ldmVyIHNldCBkdXJpbmcgcmVnaXN0cmF0aW9uXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIEFjY291bnQgdHlwZSAoc2luZ2xlIG9yIGZhbWlseSlcclxuICAgICAgICBhY2NvdW50VHlwZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMjAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBTdWJzY3JpcHRpb24gdGllciAoZnJlZSBvciBwcmVtaXVtKVxyXG4gICAgICAgIHN1YnNjcmlwdGlvblRpZXI6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDIwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gT25ib2FyZGluZyBjb21wbGV0aW9uIHN0YXR1c1xyXG4gICAgICAgIG9uYm9hcmRpbmdDb21wbGV0ZWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDEwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gVXNlcidzIGNvdW50cnkgZm9yIHJlZ2lvbmFsIGZlYXR1cmVzXHJcbiAgICAgICAgY291bnRyeTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU3Ryb25nIHBhc3N3b3JkIHBvbGljeSBmb3Igc2VjdXJpdHlcclxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLCAvLyBLZWVwIGl0IHVzZXItZnJpZW5kbHlcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEFjY291bnQgcmVjb3Zlcnkgb3B0aW9uc1xyXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcblxyXG4gICAgICAvLyBFbWFpbCBjb25maWd1cmF0aW9uIGZvciB2ZXJpZmljYXRpb24gYW5kIG5vdGlmaWNhdGlvbnNcclxuICAgICAgZW1haWw6IGNvZ25pdG8uVXNlclBvb2xFbWFpbC53aXRoQ29nbml0bygnbm9yZXBseUBidWRnZXRidWRkeS5jb20nKSxcclxuXHJcbiAgICAgIC8vIFNlbGYtc2VydmljZSBhY2NvdW50IG1hbmFnZW1lbnQ6IGRpc2FibGVkLiBBY2NvdW50cyBhcmUgY3JlYXRlZCBvbmx5IGJ5IHRoZVxyXG4gICAgICAvLyBzZXJ2ZXIgdGhyb3VnaCBBZG1pbkNyZWF0ZVVzZXIgKGJhY2tlbmQvZnVuY3Rpb25zL2F1dGggUE9TVCAvYXV0aC9yZWdpc3RlciksIHdoaWNoXHJcbiAgICAgIC8vIGlzIHdoYXQgcHJldmVudHMgYSBjYWxsZXIgZnJvbSBjaG9vc2luZyB0aGVpciBvd24gY3VzdG9tOnVzZXJJZCBhdCBTaWduVXAgdGltZS5cclxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICB1c2VyVmVyaWZpY2F0aW9uOiB7XHJcbiAgICAgICAgZW1haWxTdWJqZWN0OiAnV2VsY29tZSB0byBCdWRnZXRCdWRkeSAtIFZlcmlmeSB5b3VyIGVtYWlsJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdXZWxjb21lIHRvIEJ1ZGdldEJ1ZGR5ISBQbGVhc2UgY2xpY2sgdGhlIGxpbmsgYmVsb3cgdG8gdmVyaWZ5IHlvdXIgZW1haWwgYWRkcmVzczogeyMjVmVyaWZ5IEVtYWlsIyN9JyxcclxuICAgICAgICBlbWFpbFN0eWxlOiBjb2duaXRvLlZlcmlmaWNhdGlvbkVtYWlsU3R5bGUuTElOSyxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEF1dG9tYXRpYyBjbGVhbnVwIG9mIHVudmVyaWZpZWQgYWNjb3VudHMgYWZ0ZXIgNyBkYXlzXHJcbiAgICAgIHVzZXJJbnZpdGF0aW9uOiB7XHJcbiAgICAgICAgZW1haWxTdWJqZWN0OiAnV2VsY29tZSB0byBCdWRnZXRCdWRkeScsXHJcbiAgICAgICAgZW1haWxCb2R5OiAnSGVsbG8ge3VzZXJuYW1lfSwgeW91IGhhdmUgYmVlbiBpbnZpdGVkIHRvIGpvaW4gQnVkZ2V0QnVkZHkuIFlvdXIgdGVtcG9yYXJ5IHBhc3N3b3JkIGlzIHsjIyMjfScsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBEZXZpY2UgdHJhY2tpbmcgZm9yIHNlY3VyaXR5IChvcHRpb25hbClcclxuICAgICAgZGV2aWNlVHJhY2tpbmc6IHtcclxuICAgICAgICBjaGFsbGVuZ2VSZXF1aXJlZE9uTmV3RGV2aWNlOiBmYWxzZSwgLy8gS2VlcCBVWCBzaW1wbGUgZm9yIE1WUFxyXG4gICAgICAgIGRldmljZU9ubHlSZW1lbWJlcmVkT25Vc2VyUHJvbXB0OiB0cnVlLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXV0b21hdGljIGRlbGV0aW9uIHdoZW4gc3RhY2sgaXMgZGVzdHJveWVkIChmb3IgZGV2IGVudmlyb25tZW50cylcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVXNlciBQb29sIENsaWVudCBmb3Igd2ViIGFuZCBtb2JpbGUgYXBwbGljYXRpb25zXHJcbiAgICAgKlxyXG4gICAgICogQ29uZmlndXJlcyBhdXRoZW50aWNhdGlvbiBmbG93cyBhbmQgdG9rZW4gc2V0dGluZ3MgZm9yIHRoZVxyXG4gICAgICogQnVkZ2V0QnVkZHkgY2xpZW50IGFwcGxpY2F0aW9ucyAod2ViLCBpT1MsIEFuZHJvaWQpLlxyXG4gICAgICovXHJcbiAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ0J1ZGdldEJ1ZGR5VXNlclBvb2xDbGllbnQnLCB7XHJcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxyXG4gICAgICB1c2VyUG9vbENsaWVudE5hbWU6ICdidWRnZXRidWRkeS1jbGllbnQnLFxyXG5cclxuICAgICAgLy8gRW5hYmxlIGF1dGhlbnRpY2F0aW9uIGZsb3dzIG5lZWRlZCBmb3IgdGhlIGFwcGxpY2F0aW9uXHJcbiAgICAgIGF1dGhGbG93czoge1xyXG4gICAgICAgIHVzZXJTcnA6IHRydWUsIC8vIFNlY3VyZSBSZW1vdGUgUGFzc3dvcmQgZm9yIHdlYi9tb2JpbGVcclxuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsIC8vIEFsbG93IHVzZXJuYW1lL3Bhc3N3b3JkIGF1dGhcclxuICAgICAgICBhZG1pblVzZXJQYXNzd29yZDogZmFsc2UsIC8vIERpc2FibGUgYWRtaW4gYXV0aCBmb3Igc2VjdXJpdHlcclxuICAgICAgICBjdXN0b206IGZhbHNlLCAvLyBObyBjdXN0b20gYXV0aCBmbG93cyBmb3IgTVZQXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBUb2tlbiBjb25maWd1cmF0aW9uIGZvciBzZWN1cml0eSBhbmQgVVggYmFsYW5jZVxyXG4gICAgICBhY2Nlc3NUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksIC8vIFNob3J0LWxpdmVkIGZvciBzZWN1cml0eVxyXG4gICAgICBpZFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSwgLy8gQWxsb3cgc3RheWluZyBsb2dnZWQgaW5cclxuXHJcbiAgICAgIC8vIFByZXZlbnQgdXNlciBleGlzdGVuY2UgZXJyb3JzIGZvciBzZWN1cml0eVxyXG4gICAgICBwcmV2ZW50VXNlckV4aXN0ZW5jZUVycm9yczogdHJ1ZSxcclxuXHJcbiAgICAgIC8vIE9BdXRoIGNvbmZpZ3VyYXRpb24gZm9yIGZ1dHVyZSBzb2NpYWwgbG9naW4gaW50ZWdyYXRpb25cclxuICAgICAgb0F1dGg6IHtcclxuICAgICAgICBmbG93czoge1xyXG4gICAgICAgICAgYXV0aG9yaXphdGlvbkNvZGVHcmFudDogdHJ1ZSxcclxuICAgICAgICAgIGltcGxpY2l0Q29kZUdyYW50OiBmYWxzZSwgLy8gTGVzcyBzZWN1cmUsIGF2b2lkIGZvciBwcm9kdWN0aW9uXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzY29wZXM6IFtcclxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5FTUFJTCxcclxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5PUEVOSUQsXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuUFJPRklMRSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGNhbGxiYWNrVXJsczogW1xyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2NhbGxiYWNrJywgLy8gTG9jYWwgZGV2ZWxvcG1lbnRcclxuICAgICAgICAgICdodHRwczovL2FwcC5idWRnZXRidWRkeS5jb20vYXV0aC9jYWxsYmFjaycsIC8vIFByb2R1Y3Rpb24gd2ViXHJcbiAgICAgICAgXSxcclxuICAgICAgICBsb2dvdXRVcmxzOiBbXHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwL2F1dGgvbG9nb3V0JyxcclxuICAgICAgICAgICdodHRwczovL2FwcC5idWRnZXRidWRkeS5jb20vYXV0aC9sb2dvdXQnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBFbmFibGUgcmVhZGluZyBhbmQgd3JpdGluZyBhbGwgY3VzdG9tIGF0dHJpYnV0ZXNcclxuICAgICAgcmVhZEF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZ2l2ZW5OYW1lOiB0cnVlLFxyXG4gICAgICAgICAgZmFtaWx5TmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGFkZHJlc3M6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoXHJcbiAgICAgICAgICAndXNlcklkJyxcclxuICAgICAgICAgICdmYW1pbHlJZCcsXHJcbiAgICAgICAgICAnZmFtaWx5Um9sZScsXHJcbiAgICAgICAgICAnYWNjb3VudFR5cGUnLFxyXG4gICAgICAgICAgJ3N1YnNjcmlwdGlvblRpZXInLFxyXG4gICAgICAgICAgJ29uYm9hcmRpbmdDb21wbGV0ZWQnLFxyXG4gICAgICAgICAgJ2NvdW50cnknXHJcbiAgICAgICAgKSxcclxuXHJcbiAgICAgIC8vIFdyaXRlIGF0dHJpYnV0ZXM6IGlkZW50aXR5IGFuZCBlbnRpdGxlbWVudCBhdHRyaWJ1dGVzICh1c2VySWQsIGFjY291bnRUeXBlLFxyXG4gICAgICAvLyBzdWJzY3JpcHRpb25UaWVyLCBvbmJvYXJkaW5nQ29tcGxldGVkKSBhcmUgZGVsaWJlcmF0ZWx5IE5PVCBjbGllbnQtd3JpdGFibGUuIFRoZXkgYXJlXHJcbiAgICAgIC8vIHdyaXR0ZW4gZXhjbHVzaXZlbHkgYnkgdGhlIHNlcnZlciB0aHJvdWdoIEFkbWluQ3JlYXRlVXNlciAvXHJcbiAgICAgIC8vIEFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMsIHdoaWNoIGRvIG5vdCBjb25zdWx0IGNsaWVudCB3cml0ZSBwZXJtaXNzaW9uLiBHcmFudGluZ1xyXG4gICAgICAvLyB0aGVtIGhlcmUgd291bGQgbGV0IGEgY2FsbGVyIHBvcHVsYXRlIGN1c3RvbTp1c2VySWQgd2l0aCBhIHZpY3RpbSdzIElEIGF0IFNpZ25VcCBhbmRcclxuICAgICAgLy8gaW5oZXJpdCB0aGF0IHZpY3RpbSdzIGJ1ZGdldHMsIGJlY2F1c2UgZ2V0VXNlckZyb21FdmVudCB0cnVzdHMgdGhlIGNsYWltLlxyXG4gICAgICAvLyBmYW1pbHlJZCBhbmQgZmFtaWx5Um9sZSBzdGF5IGV4Y2x1ZGVkIGZvciB0aGUgc2FtZSByZWFzb24gdGhleSBhbHdheXMgd2VyZTogYnVkZ2V0XHJcbiAgICAgIC8vIG1lbWJlcnNoaXAgYW5kIHJvbGUgYXJlIHJlc29sdmVkIGZyb20gRHluYW1vREIgdmlhIEJ1ZGdldEFjY2Vzc1Jlc29sdmVyLlxyXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZ2l2ZW5OYW1lOiB0cnVlLFxyXG4gICAgICAgICAgZmFtaWx5TmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGFkZHJlc3M6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ2NvdW50cnknKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBVc2VyIFBvb2wgSUQgZm9yIGNsaWVudCBjb25maWd1cmF0aW9uXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCBmb3IgQnVkZ2V0QnVkZHkgY2xpZW50IGF1dGhlbnRpY2F0aW9uIGNvbmZpZ3VyYXRpb24nLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktdXNlci1wb29sLWlkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRtaW4gVXNlciBHcm91cFxyXG4gICAgICpcclxuICAgICAqIFVzZXJzIGluIHRoaXMgZ3JvdXAgaGF2ZSBhY2Nlc3MgdG8gdGhlIGFkbWluIGRhc2hib2FyZCBhbmRcclxuICAgICAqIGFkbWluaXN0cmF0aXZlIGZ1bmN0aW9ucyBsaWtlIHVzZXIgbWFuYWdlbWVudCBhbmQgc3lzdGVtIG1vbml0b3JpbmcuXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYWRtaW5Hcm91cCA9IG5ldyBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAodGhpcywgJ0FkbWluR3JvdXAnLCB7XHJcbiAgICAgIHVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZ3JvdXBOYW1lOiAnQWRtaW5zJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdBZG1pbmlzdHJhdGl2ZSB1c2VycyB3aXRoIGFjY2VzcyB0byBhZG1pbiBkYXNoYm9hcmQgYW5kIHVzZXIgbWFuYWdlbWVudCcsXHJcbiAgICAgIHByZWNlZGVuY2U6IDEsIC8vIEhpZ2hlciBwcmVjZWRlbmNlIChsb3dlciBudW1iZXIpIGZvciBhZG1pbiByb2xlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgQWRtaW4gR3JvdXAgbmFtZSBmb3IgcmVmZXJlbmNlXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWRtaW5Hcm91cE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFkbWluR3JvdXAuZ3JvdXBOYW1lIHx8ICdBZG1pbnMnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gQWRtaW4gR3JvdXAgbmFtZSBmb3IgYWRtaW5pc3RyYXRpdmUgdXNlciBtYW5hZ2VtZW50JyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBVc2VyIFBvb2wgQ2xpZW50IElEIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgQ2xpZW50IElEIGZvciBCdWRnZXRCdWRkeSB3ZWIgYW5kIG1vYmlsZSBhcHBsaWNhdGlvbnMnLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktdXNlci1wb29sLWNsaWVudC1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIEFSTiBmb3IgSUFNIHBvbGljaWVzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIEFSTiBmb3IgQnVkZ2V0QnVkZHkgSUFNIHBvbGljeSBjb25maWd1cmF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1hcm4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTaGFyZWQgTGFtYmRhIExheWVyIGZvciBhdXRoZW50aWNhdGlvbiB1dGlsaXRpZXNcclxuICAgICAqXHJcbiAgICAgKiBDb250YWlucyBjb21tb24gY29kZSB1c2VkIGFjcm9zcyBhbGwgYXV0aCBMYW1iZGEgZnVuY3Rpb25zOlxyXG4gICAgICogLSBDT1JTIGhhbmRsaW5nIChjb3JzLmpzKVxyXG4gICAgICogLSBUb2tlbiBwYXJzaW5nICh0b2tlbi1wYXJzZXIuanMpXHJcbiAgICAgKiAtIElucHV0IHZhbGlkYXRpb24gKHZhbGlkYXRvcnMuanMpXHJcbiAgICAgKiAtIEVycm9yIGZvcm1hdHRpbmcgKGVycm9ycy5qcylcclxuICAgICAqL1xyXG4gICAgdGhpcy5hdXRoU2hhcmVkTGF5ZXIgPSBuZXcgbGFtYmRhLkxheWVyVmVyc2lvbih0aGlzLCAnQXV0aFNoYXJlZExheWVyJywge1xyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvbGF5ZXJzL3NoYXJlZCcpLFxyXG4gICAgICBjb21wYXRpYmxlUnVudGltZXM6IFtsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWF0sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2hhcmVkIGF1dGhlbnRpY2F0aW9uIHV0aWxpdGllcyBmb3IgQnVkZ2V0QnVkZHkgYXV0aCBMYW1iZGEgZnVuY3Rpb25zJyxcclxuICAgICAgbGF5ZXJWZXJzaW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGgtc2hhcmVkJyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLCAvLyBLZWVwIG9sZCB2ZXJzaW9ucyBmb3Igcm9sbGJhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIGNvc3QgYWxsb2NhdGlvbiB0YWdzXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ0NvbXBvbmVudCcsICdBdXRoZW50aWNhdGlvbicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdTZXJ2aWNlJywgJ0NvZ25pdG8nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudXNlclBvb2wpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1BdXRoJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1VzZXJUeXBlJywgJ0FwcGxpY2F0aW9uLVVzZXJzJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1NlY3VyaXR5TGV2ZWwnLCAnSGlnaCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdMYXN0RGVwbG95bWVudCcsICcyMDI2LTAxLTMxJyk7XHJcblxyXG4gICAgLy8gQWRkIHRhZ3MgdG8gTGFtYmRhIExheWVyXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmF1dGhTaGFyZWRMYXllcikuYWRkKCdDb21wb25lbnQnLCAnQXV0aGVudGljYXRpb24nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYXV0aFNoYXJlZExheWVyKS5hZGQoJ1NlcnZpY2UnLCAnTGFtYmRhLUxheWVyJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmF1dGhTaGFyZWRMYXllcikuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUF1dGgnKTtcclxuXHJcbiAgICAvLyBPdXRwdXQgTGFtYmRhIExheWVyIEFSTiBmb3IgcmVmZXJlbmNlIChubyBleHBvcnQgdG8gYXZvaWQgY3Jvc3Mtc3RhY2sgZGVwZW5kZW5jeSBpc3N1ZXMpXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXV0aFNoYXJlZExheWVyQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hdXRoU2hhcmVkTGF5ZXIubGF5ZXJWZXJzaW9uQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBMYXllciBBUk4gZm9yIHNoYXJlZCBhdXRoZW50aWNhdGlvbiB1dGlsaXRpZXMnLFxyXG4gICAgICAvLyBSZW1vdmVkIGV4cG9ydE5hbWUgdG8gYXZvaWQgY3Jvc3Mtc3RhY2sgZGVwZW5kZW5jeSBpc3N1ZXMgd2hlbiBsYXllciB1cGRhdGVzXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19