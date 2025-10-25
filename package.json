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
        desc = {
            enumerable: true,
            get: function() {
                return m[k];
            }
        };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", {
        enumerable: true,
        value: v
    });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function() {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o) {
            var ar = [];
            for (var k in o)
                if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", {
    value: true
});
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
                .withCustomAttributes('familyId', 'familyRole', 'accountType', 'subscriptionTier', 'onboardingCompleted', 'country'),
            writeAttributes: new cognito.ClientAttributes()
                .withStandardAttributes({
                    email: true,
                    givenName: true,
                    familyName: true,
                    address: true,
                })
                .withCustomAttributes('familyId', 'familyRole', 'accountType', 'subscriptionTier', 'onboardingCompleted', 'country'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7O0dBYUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyxpRUFBbUQ7QUFJbkQsTUFBYSxTQUFVLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFhdEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qjs7Ozs7V0FLRztRQUNILElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNoRSxZQUFZLEVBQUUsbUJBQW1CO1lBRWpDLGlEQUFpRDtZQUNqRCxhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUSxFQUFFLEtBQUssRUFBRSxrQ0FBa0M7YUFDcEQ7WUFFRCxtREFBbUQ7WUFDbkQsVUFBVSxFQUFFO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFFRCxpREFBaUQ7WUFDakQsa0JBQWtCLEVBQUU7Z0JBQ2xCLEtBQUssRUFBRTtvQkFDTCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSSxFQUFFLDhCQUE4QjtpQkFDOUM7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNELFVBQVUsRUFBRTtvQkFDVixRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsUUFBUSxFQUFFLEtBQUssRUFBRSwwQ0FBMEM7b0JBQzNELE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNELE9BQU8sRUFBRTtvQkFDUCxRQUFRLEVBQUUsS0FBSyxFQUFFLG9DQUFvQztvQkFDckQsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7YUFDRjtZQUVELDRDQUE0QztZQUM1QyxnQkFBZ0IsRUFBRTtnQkFDaEIsNkJBQTZCO2dCQUM3QixRQUFRLEVBQUUsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO29CQUNwQyxNQUFNLEVBQUUsQ0FBQztvQkFDVCxNQUFNLEVBQUUsRUFBRTtvQkFDVixPQUFPLEVBQUUsSUFBSTtpQkFDZCxDQUFDO2dCQUVGLG9EQUFvRDtnQkFDcEQsVUFBVSxFQUFFLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQztvQkFDdEMsTUFBTSxFQUFFLENBQUM7b0JBQ1QsTUFBTSxFQUFFLEVBQUU7b0JBQ1YsT0FBTyxFQUFFLElBQUk7aUJBQ2QsQ0FBQztnQkFFRixrQ0FBa0M7Z0JBQ2xDLFdBQVcsRUFBRSxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7b0JBQ3ZDLE1BQU0sRUFBRSxDQUFDO29CQUNULE1BQU0sRUFBRSxFQUFFO29CQUNWLE9BQU8sRUFBRSxJQUFJO2lCQUNkLENBQUM7Z0JBRUYsc0NBQXNDO2dCQUN0QyxnQkFBZ0IsRUFBRSxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7b0JBQzVDLE1BQU0sRUFBRSxDQUFDO29CQUNULE1BQU0sRUFBRSxFQUFFO29CQUNWLE9BQU8sRUFBRSxJQUFJO2lCQUNkLENBQUM7Z0JBRUYsK0JBQStCO2dCQUMvQixtQkFBbUIsRUFBRSxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7b0JBQy9DLE1BQU0sRUFBRSxDQUFDO29CQUNULE1BQU0sRUFBRSxFQUFFO29CQUNWLE9BQU8sRUFBRSxJQUFJO2lCQUNkLENBQUM7Z0JBRUYsdUNBQXVDO2dCQUN2QyxPQUFPLEVBQUUsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO29CQUNuQyxNQUFNLEVBQUUsQ0FBQztvQkFDVCxNQUFNLEVBQUUsRUFBRTtvQkFDVixPQUFPLEVBQUUsSUFBSTtpQkFDZCxDQUFDO2FBQ0g7WUFFRCxzQ0FBc0M7WUFDdEMsY0FBYyxFQUFFO2dCQUNkLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixjQUFjLEVBQUUsS0FBSyxFQUFFLHdCQUF3QjthQUNoRDtZQUVELDJCQUEyQjtZQUMzQixlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBRW5ELHlEQUF5RDtZQUN6RCxLQUFLLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUM7WUFFbkUsa0NBQWtDO1lBQ2xDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsZ0JBQWdCLEVBQUU7Z0JBQ2hCLFlBQVksRUFBRSw0Q0FBNEM7Z0JBQzFELFNBQVMsRUFBRSxzR0FBc0c7Z0JBQ2pILFVBQVUsRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsSUFBSTthQUNoRDtZQUVELHdEQUF3RDtZQUN4RCxjQUFjLEVBQUU7Z0JBQ2QsWUFBWSxFQUFFLHdCQUF3QjtnQkFDdEMsU0FBUyxFQUFFLGdHQUFnRzthQUM1RztZQUVELDBDQUEwQztZQUMxQyxjQUFjLEVBQUU7Z0JBQ2QsNEJBQTRCLEVBQUUsS0FBSyxFQUFFLHlCQUF5QjtnQkFDOUQsZ0NBQWdDLEVBQUUsSUFBSTthQUN2QztZQUVELG9FQUFvRTtZQUNwRSxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVIOzs7OztXQUtHO1FBQ0gsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ2xGLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixrQkFBa0IsRUFBRSxvQkFBb0I7WUFFeEMseURBQXlEO1lBQ3pELFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUUsSUFBSSxFQUFFLHdDQUF3QztnQkFDdkQsWUFBWSxFQUFFLElBQUksRUFBRSwrQkFBK0I7Z0JBQ25ELGlCQUFpQixFQUFFLEtBQUssRUFBRSxrQ0FBa0M7Z0JBQzVELE1BQU0sRUFBRSxLQUFLLEVBQUUsK0JBQStCO2FBQy9DO1lBRUQsa0RBQWtEO1lBQ2xELG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLDJCQUEyQjtZQUN2RSxlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLDBCQUEwQjtZQUV2RSw2Q0FBNkM7WUFDN0MsMEJBQTBCLEVBQUUsSUFBSTtZQUVoQywwREFBMEQ7WUFDMUQsS0FBSyxFQUFFO2dCQUNMLEtBQUssRUFBRTtvQkFDTCxzQkFBc0IsRUFBRSxJQUFJO29CQUM1QixpQkFBaUIsRUFBRSxLQUFLLEVBQUUsb0NBQW9DO2lCQUMvRDtnQkFDRCxNQUFNLEVBQUU7b0JBQ04sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLO29CQUN4QixPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU07b0JBQ3pCLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTztpQkFDM0I7Z0JBQ0QsWUFBWSxFQUFFO29CQUNaLHFDQUFxQyxFQUFFLG9CQUFvQjtvQkFDM0QsMkNBQTJDLEVBQUUsaUJBQWlCO2lCQUMvRDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1YsbUNBQW1DO29CQUNuQyx5Q0FBeUM7aUJBQzFDO2FBQ0Y7WUFFRCxtREFBbUQ7WUFDbkQsY0FBYyxFQUFFLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFO2lCQUMzQyxzQkFBc0IsQ0FBQztnQkFDdEIsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLE9BQU8sRUFBRSxJQUFJO2FBQ2QsQ0FBQztpQkFDRCxvQkFBb0IsQ0FDbkIsVUFBVSxFQUNWLFlBQVksRUFDWixhQUFhLEVBQ2Isa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQixTQUFTLENBQ1Y7WUFFSCxlQUFlLEVBQUUsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7aUJBQzVDLHNCQUFzQixDQUFDO2dCQUN0QixLQUFLLEVBQUUsSUFBSTtnQkFDWCxTQUFTLEVBQUUsSUFBSTtnQkFDZixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsT0FBTyxFQUFFLElBQUk7YUFDZCxDQUFDO2lCQUNELG9CQUFvQixDQUNuQixVQUFVLEVBQ1YsWUFBWSxFQUNaLGFBQWEsRUFDYixrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLFNBQVMsQ0FDVjtTQUNKLENBQUMsQ0FBQztRQUVILCtDQUErQztRQUMvQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQy9CLFdBQVcsRUFBRSwwRUFBMEU7WUFDdkYsVUFBVSxFQUFFLDBCQUEwQjtTQUN2QyxDQUFDLENBQUM7UUFFSCxzREFBc0Q7UUFDdEQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDM0MsV0FBVyxFQUFFLHlFQUF5RTtZQUN0RixVQUFVLEVBQUUsaUNBQWlDO1NBQzlDLENBQUMsQ0FBQztRQUVILHdDQUF3QztRQUN4QyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXO1lBQ2hDLFdBQVcsRUFBRSxnRUFBZ0U7WUFDN0UsVUFBVSxFQUFFLDJCQUEyQjtTQUN4QyxDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM5RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDaEUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUQsQ0FBQztDQUNGO0FBN1BELDhCQTZQQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBdXRoZW50aWNhdGlvbiBTdGFjayBmb3IgQnVkZ2V0QnVkZHkgQXBwbGljYXRpb25cclxuICogXHJcbiAqIENyZWF0ZXMgQW1hem9uIENvZ25pdG8gVXNlciBQb29sIGFuZCBVc2VyIFBvb2wgQ2xpZW50IGZvciBoYW5kbGluZ1xyXG4gKiB1c2VyIGF1dGhlbnRpY2F0aW9uLCByZWdpc3RyYXRpb24sIGFuZCBhdXRob3JpemF0aW9uLiBDb25maWd1cmVkIHdpdGhcclxuICogY3VzdG9tIGF0dHJpYnV0ZXMgZm9yIGZhbWlseSByZWxhdGlvbnNoaXBzIGFuZCBhY2NvdW50IHR5cGVzLlxyXG4gKiBcclxuICogS2V5IEZlYXR1cmVzOlxyXG4gKiAtIEVtYWlsLWJhc2VkIGF1dGhlbnRpY2F0aW9uIHdpdGggdmVyaWZpY2F0aW9uXHJcbiAqIC0gQ3VzdG9tIGF0dHJpYnV0ZXMgZm9yIGZhbWlseSBhbmQgc3Vic2NyaXB0aW9uIGRhdGFcclxuICogLSBQYXNzd29yZCBwb2xpY2llcyBmb3Igc2VjdXJpdHlcclxuICogLSBNRkEgc3VwcG9ydCAob3B0aW9uYWwpXHJcbiAqIC0gTGFtYmRhIHRyaWdnZXJzIGZvciBjdXN0b20gYXV0aGVudGljYXRpb24gZmxvd3NcclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBdXRoU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIC8qKlxyXG4gICAqIENvZ25pdG8gVXNlciBQb29sIGZvciB1c2VyIG1hbmFnZW1lbnRcclxuICAgKiBFeHBvc2VkIGFzIHB1YmxpYyBwcm9wZXJ0eSBmb3IgdXNlIGluIG90aGVyIHN0YWNrc1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcclxuXHJcbiAgLyoqXHJcbiAgICogVXNlciBQb29sIENsaWVudCBmb3IgYXBwbGljYXRpb24gYXV0aGVudGljYXRpb25cclxuICAgKiBFeHBvc2VkIGFzIHB1YmxpYyBwcm9wZXJ0eSBmb3IgdXNlIGluIG90aGVyIHN0YWNrc1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbENsaWVudDogY29nbml0by5Vc2VyUG9vbENsaWVudDtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNYWluIFVzZXIgUG9vbCBmb3IgQnVkZ2V0QnVkZHkgYXBwbGljYXRpb25cclxuICAgICAqIFxyXG4gICAgICogSGFuZGxlcyB1c2VyIHJlZ2lzdHJhdGlvbiwgYXV0aGVudGljYXRpb24sIGFuZCBwcm9maWxlIG1hbmFnZW1lbnRcclxuICAgICAqIHdpdGggY3VzdG9tIGF0dHJpYnV0ZXMgc3BlY2lmaWMgdG8gYnVkZ2V0aW5nIGFwcGxpY2F0aW9uIG5lZWRzLlxyXG4gICAgICovXHJcbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ0J1ZGdldEJ1ZGR5VXNlclBvb2wnLCB7XHJcbiAgICAgIHVzZXJQb29sTmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXJzJyxcclxuXHJcbiAgICAgIC8vIEVtYWlsLWJhc2VkIHNpZ24taW4gZm9yIGJldHRlciB1c2VyIGV4cGVyaWVuY2VcclxuICAgICAgc2lnbkluQWxpYXNlczoge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgIHVzZXJuYW1lOiBmYWxzZSwgLy8gRGlzYWJsZSB1c2VybmFtZSB0byBzaW1wbGlmeSBVWFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXV0by12ZXJpZnkgZW1haWwgYWRkcmVzc2VzIGZvciBhY2NvdW50IHNlY3VyaXR5XHJcbiAgICAgIGF1dG9WZXJpZnk6IHtcclxuICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFN0YW5kYXJkIGF0dHJpYnV0ZXMgcmVxdWlyZWQgZm9yIHVzZXIgcHJvZmlsZXNcclxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgZW1haWw6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSwgLy8gQWxsb3cgdXNlcnMgdG8gY2hhbmdlIGVtYWlsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnaXZlbk5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbWlseU5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJpcnRoZGF0ZToge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLCAvLyBXZSBjb2xsZWN0IGFnZSBzZXBhcmF0ZWx5IGluIG9uYm9hcmRpbmdcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhZGRyZXNzOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsIC8vIFdlIGNvbGxlY3QgbG9jYXRpb24gaW4gb25ib2FyZGluZ1xyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQ3VzdG9tIGF0dHJpYnV0ZXMgc3BlY2lmaWMgdG8gQnVkZ2V0QnVkZHlcclxuICAgICAgY3VzdG9tQXR0cmlidXRlczoge1xyXG4gICAgICAgIC8vIEZhbWlseSBhY2NvdW50IGFzc29jaWF0aW9uXHJcbiAgICAgICAgZmFtaWx5SWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDUwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgICBcclxuICAgICAgICAvLyBVc2VyIHJvbGUgd2l0aGluIGZhbWlseSAocHJpbWFyeSwgc3BvdXNlLCB2aWV3ZXIpXHJcbiAgICAgICAgZmFtaWx5Um9sZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMjAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG5cclxuICAgICAgICAvLyBBY2NvdW50IHR5cGUgKHNpbmdsZSBvciBmYW1pbHkpXHJcbiAgICAgICAgYWNjb3VudFR5cGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDIwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgLy8gU3Vic2NyaXB0aW9uIHRpZXIgKGZyZWUgb3IgcHJlbWl1bSlcclxuICAgICAgICBzdWJzY3JpcHRpb25UaWVyOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAyMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIE9uYm9hcmRpbmcgY29tcGxldGlvbiBzdGF0dXNcclxuICAgICAgICBvbmJvYXJkaW5nQ29tcGxldGVkOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xyXG4gICAgICAgICAgbWluTGVuOiAwLFxyXG4gICAgICAgICAgbWF4TGVuOiAxMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIC8vIFVzZXIncyBjb3VudHJ5IGZvciByZWdpb25hbCBmZWF0dXJlc1xyXG4gICAgICAgIGNvdW50cnk6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDEwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFN0cm9uZyBwYXNzd29yZCBwb2xpY3kgZm9yIHNlY3VyaXR5XHJcbiAgICAgIHBhc3N3b3JkUG9saWN5OiB7XHJcbiAgICAgICAgbWluTGVuZ3RoOiA4LFxyXG4gICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSwgLy8gS2VlcCBpdCB1c2VyLWZyaWVuZGx5XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBY2NvdW50IHJlY292ZXJ5IG9wdGlvbnNcclxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG5cclxuICAgICAgLy8gRW1haWwgY29uZmlndXJhdGlvbiBmb3IgdmVyaWZpY2F0aW9uIGFuZCBub3RpZmljYXRpb25zXHJcbiAgICAgIGVtYWlsOiBjb2duaXRvLlVzZXJQb29sRW1haWwud2l0aENvZ25pdG8oJ25vcmVwbHlAYnVkZ2V0YnVkZHkuY29tJyksXHJcblxyXG4gICAgICAvLyBTZWxmLXNlcnZpY2UgYWNjb3VudCBtYW5hZ2VtZW50XHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICB1c2VyVmVyaWZpY2F0aW9uOiB7XHJcbiAgICAgICAgZW1haWxTdWJqZWN0OiAnV2VsY29tZSB0byBCdWRnZXRCdWRkeSAtIFZlcmlmeSB5b3VyIGVtYWlsJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdXZWxjb21lIHRvIEJ1ZGdldEJ1ZGR5ISBQbGVhc2UgY2xpY2sgdGhlIGxpbmsgYmVsb3cgdG8gdmVyaWZ5IHlvdXIgZW1haWwgYWRkcmVzczogeyMjVmVyaWZ5IEVtYWlsIyN9JyxcclxuICAgICAgICBlbWFpbFN0eWxlOiBjb2duaXRvLlZlcmlmaWNhdGlvbkVtYWlsU3R5bGUuTElOSyxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEF1dG9tYXRpYyBjbGVhbnVwIG9mIHVudmVyaWZpZWQgYWNjb3VudHMgYWZ0ZXIgNyBkYXlzXHJcbiAgICAgIHVzZXJJbnZpdGF0aW9uOiB7XHJcbiAgICAgICAgZW1haWxTdWJqZWN0OiAnV2VsY29tZSB0byBCdWRnZXRCdWRkeScsXHJcbiAgICAgICAgZW1haWxCb2R5OiAnSGVsbG8ge3VzZXJuYW1lfSwgeW91IGhhdmUgYmVlbiBpbnZpdGVkIHRvIGpvaW4gQnVkZ2V0QnVkZHkuIFlvdXIgdGVtcG9yYXJ5IHBhc3N3b3JkIGlzIHsjIyMjfScsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBEZXZpY2UgdHJhY2tpbmcgZm9yIHNlY3VyaXR5IChvcHRpb25hbClcclxuICAgICAgZGV2aWNlVHJhY2tpbmc6IHtcclxuICAgICAgICBjaGFsbGVuZ2VSZXF1aXJlZE9uTmV3RGV2aWNlOiBmYWxzZSwgLy8gS2VlcCBVWCBzaW1wbGUgZm9yIE1WUFxyXG4gICAgICAgIGRldmljZU9ubHlSZW1lbWJlcmVkT25Vc2VyUHJvbXB0OiB0cnVlLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQXV0b21hdGljIGRlbGV0aW9uIHdoZW4gc3RhY2sgaXMgZGVzdHJveWVkIChmb3IgZGV2IGVudmlyb25tZW50cylcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVXNlciBQb29sIENsaWVudCBmb3Igd2ViIGFuZCBtb2JpbGUgYXBwbGljYXRpb25zXHJcbiAgICAgKiBcclxuICAgICAqIENvbmZpZ3VyZXMgYXV0aGVudGljYXRpb24gZmxvd3MgYW5kIHRva2VuIHNldHRpbmdzIGZvciB0aGVcclxuICAgICAqIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhcHBsaWNhdGlvbnMgKHdlYiwgaU9TLCBBbmRyb2lkKS5cclxuICAgICAqL1xyXG4gICAgdGhpcy51c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KHRoaXMsICdCdWRnZXRCdWRkeVVzZXJQb29sQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcclxuICAgICAgdXNlclBvb2xDbGllbnROYW1lOiAnYnVkZ2V0YnVkZHktY2xpZW50JyxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSBhdXRoZW50aWNhdGlvbiBmbG93cyBuZWVkZWQgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gICAgICBhdXRoRmxvd3M6IHtcclxuICAgICAgICB1c2VyU3JwOiB0cnVlLCAvLyBTZWN1cmUgUmVtb3RlIFBhc3N3b3JkIGZvciB3ZWIvbW9iaWxlXHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLCAvLyBBbGxvdyB1c2VybmFtZS9wYXNzd29yZCBhdXRoXHJcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IGZhbHNlLCAvLyBEaXNhYmxlIGFkbWluIGF1dGggZm9yIHNlY3VyaXR5XHJcbiAgICAgICAgY3VzdG9tOiBmYWxzZSwgLy8gTm8gY3VzdG9tIGF1dGggZmxvd3MgZm9yIE1WUFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gVG9rZW4gY29uZmlndXJhdGlvbiBmb3Igc2VjdXJpdHkgYW5kIFVYIGJhbGFuY2VcclxuICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLCAvLyBTaG9ydC1saXZlZCBmb3Igc2VjdXJpdHlcclxuICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIHJlZnJlc2hUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzMCksIC8vIEFsbG93IHN0YXlpbmcgbG9nZ2VkIGluXHJcblxyXG4gICAgICAvLyBQcmV2ZW50IHVzZXIgZXhpc3RlbmNlIGVycm9ycyBmb3Igc2VjdXJpdHlcclxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXHJcblxyXG4gICAgICAvLyBPQXV0aCBjb25maWd1cmF0aW9uIGZvciBmdXR1cmUgc29jaWFsIGxvZ2luIGludGVncmF0aW9uXHJcbiAgICAgIG9BdXRoOiB7XHJcbiAgICAgICAgZmxvd3M6IHtcclxuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXHJcbiAgICAgICAgICBpbXBsaWNpdENvZGVHcmFudDogZmFsc2UsIC8vIExlc3Mgc2VjdXJlLCBhdm9pZCBmb3IgcHJvZHVjdGlvblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2NvcGVzOiBbXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuRU1BSUwsXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuT1BFTklELFxyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEUsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBjYWxsYmFja1VybHM6IFtcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXV0aC9jYWxsYmFjaycsIC8vIExvY2FsIGRldmVsb3BtZW50XHJcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAuYnVkZ2V0YnVkZHkuY29tL2F1dGgvY2FsbGJhY2snLCAvLyBQcm9kdWN0aW9uIHdlYlxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgbG9nb3V0VXJsczogW1xyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2xvZ291dCcsXHJcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAuYnVkZ2V0YnVkZHkuY29tL2F1dGgvbG9nb3V0JyxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gRW5hYmxlIHJlYWRpbmcgYW5kIHdyaXRpbmcgYWxsIGN1c3RvbSBhdHRyaWJ1dGVzXHJcbiAgICAgIHJlYWRBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcclxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgICBhZGRyZXNzOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKFxyXG4gICAgICAgICAgJ2ZhbWlseUlkJyxcclxuICAgICAgICAgICdmYW1pbHlSb2xlJywgXHJcbiAgICAgICAgICAnYWNjb3VudFR5cGUnLFxyXG4gICAgICAgICAgJ3N1YnNjcmlwdGlvblRpZXInLFxyXG4gICAgICAgICAgJ29uYm9hcmRpbmdDb21wbGV0ZWQnLFxyXG4gICAgICAgICAgJ2NvdW50cnknXHJcbiAgICAgICAgKSxcclxuXHJcbiAgICAgIHdyaXRlQXR0cmlidXRlczogbmV3IGNvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpXHJcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBnaXZlbk5hbWU6IHRydWUsXHJcbiAgICAgICAgICBmYW1pbHlOYW1lOiB0cnVlLFxyXG4gICAgICAgICAgYWRkcmVzczogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcyhcclxuICAgICAgICAgICdmYW1pbHlJZCcsXHJcbiAgICAgICAgICAnZmFtaWx5Um9sZScsXHJcbiAgICAgICAgICAnYWNjb3VudFR5cGUnLCBcclxuICAgICAgICAgICdzdWJzY3JpcHRpb25UaWVyJyxcclxuICAgICAgICAgICdvbmJvYXJkaW5nQ29tcGxldGVkJyxcclxuICAgICAgICAgICdjb3VudHJ5J1xyXG4gICAgICAgICksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIElEIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQgZm9yIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhdXRoZW50aWNhdGlvbiBjb25maWd1cmF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgVXNlciBQb29sIENsaWVudCBJRCBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCBmb3IgQnVkZ2V0QnVkZHkgd2ViIGFuZCBtb2JpbGUgYXBwbGljYXRpb25zJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXVzZXItcG9vbC1jbGllbnQtaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IFVzZXIgUG9vbCBBUk4gZm9yIElBTSBwb2xpY2llc1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBBUk4gZm9yIEJ1ZGdldEJ1ZGR5IElBTSBwb2xpY3kgY29uZmlndXJhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS11c2VyLXBvb2wtYXJuJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIGNvc3QgYWxsb2NhdGlvbiB0YWdzXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ0NvbXBvbmVudCcsICdBdXRoZW50aWNhdGlvbicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdTZXJ2aWNlJywgJ0NvZ25pdG8nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudXNlclBvb2wpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1BdXRoJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1VzZXJUeXBlJywgJ0FwcGxpY2F0aW9uLVVzZXJzJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1NlY3VyaXR5TGV2ZWwnLCAnSGlnaCcpO1xyXG4gIH1cclxufSJdfQ==