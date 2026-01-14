"use strict";
/**
 * API Stack for BudgetBuddy Application
 *
 * Creates API Gateway REST API with Lambda function integrations for all
 * backend functionality. Includes proper CORS configuration, authentication,
 * and error handling for web and mobile clients.
 *
 * Key Features:
 * - REST API with resource-based routing
 * - Lambda function integrations for business logic
 * - Cognito authorizer for protected endpoints
 * - CORS configuration for web clients
 * - Request/response validation
 * - CloudWatch logging and monitoring
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
exports.ApiStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
class ApiStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        /**
         * Lambda functions for different business domains
         * Exposed for monitoring and additional integrations
         */
        this.functions = {};
        // Store auth onboarding function for use in route setup
        this.authOnboardingFunction = props.authOnboardingFunction;
        // Create shared Lambda layer for common dependencies
        const commonLayer = this.createCommonLayer();
        // Create Lambda functions for different business domains
        this.createLambdaFunctions(props, commonLayer);
        // Create API Gateway with proper configuration
        this.api = this.createApiGateway(props.userPool);
        // Set up API routes and integrations
        this.setupApiRoutes();
        // Create outputs for client configuration
        this.createOutputs();
    }
    /**
     * Create a Lambda layer with common dependencies
     * Reduces deployment package sizes and improves cold start times
     */
    createCommonLayer() {
        return new lambda.LayerVersion(this, 'CommonLayer', {
            layerVersionName: 'budgetbuddy-common',
            code: lambda.Code.fromAsset('../backend/layers/common'),
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            description: 'Common dependencies and utilities for BudgetBuddy Lambda functions to reduce cold start times',
        });
    }
    /**
     * Create all Lambda functions for the application
     * Each function handles a specific business domain
     */
    createLambdaFunctions(props, commonLayer) {
        // Common environment variables for all functions
        const commonEnvironment = {
            TABLE_NAME: props.table.tableName,
            NODE_ENV: 'production',
            LOG_LEVEL: 'info',
        };
        // Common Lambda function configuration
        const commonProps = {
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(30),
            memorySize: 512, // Balanced for cost and performance
            layers: [commonLayer],
            environment: commonEnvironment,
            logRetention: logs.RetentionDays.ONE_WEEK, // Cost optimization
        };
        /**
         * Authentication Functions
         * Handle user registration, login, and profile management
         */
        this.functions.authHandler = new lambda.Function(this, 'AuthHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-auth',
            code: lambda.Code.fromAsset('../backend/functions/auth'),
            handler: 'index.handler',
            description: 'BudgetBuddy authentication handler for user registration, login, and profile management',
            environment: {
                ...commonEnvironment,
                USER_POOL_ID: props.userPool.userPoolId,
                CLIENT_ID: props.userPoolClient.userPoolClientId,
            },
        });
        /**
         * Budget Management Functions
         * Handle budget CRUD operations and calculations
         */
        this.functions.budgetHandler = new lambda.Function(this, 'BudgetHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-budget',
            code: lambda.Code.fromAsset('../backend/functions/budget'),
            handler: 'index.handler',
            description: 'BudgetBuddy budget handler for CRUD operations, categories, and zero-based calculations',
        });
        /**
         * Transaction Management Functions
         * Handle transaction CRUD operations and budget updates
         */
        this.functions.transactionHandler = new lambda.Function(this, 'TransactionHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-transaction',
            code: lambda.Code.fromAsset('../backend/functions/transactions'),
            handler: 'index.handler',
            description: 'BudgetBuddy transaction handler for expense/income tracking and automatic budget updates',
        });
        /**
         * AI Budget Generation Functions
         * Handle AI-powered budget generation using AWS Bedrock
         */
        this.functions.aiHandler = new lambda.Function(this, 'AIHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-ai',
            code: lambda.Code.fromAsset('../backend/functions/ai'),
            handler: 'index.handler',
            description: 'BudgetBuddy AI handler for personalized budget generation using AWS Bedrock Claude 3.5',
            timeout: cdk.Duration.minutes(2), // AI calls may take longer
            environment: {
                ...commonEnvironment,
                BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            },
        });
        /**
         * Family Account Management Functions
         * Handle family creation, invitations, and member management
         */
        this.functions.familyHandler = new lambda.Function(this, 'FamilyHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-family',
            code: lambda.Code.fromAsset('../backend/functions/family'),
            handler: 'index.handler',
            description: 'BudgetBuddy family handler for shared accounts, invitations, and member management',
        });
        /**
         * Payment and Subscription Functions
         * Handle Stripe integration and subscription management
         */
        this.functions.paymentHandler = new lambda.Function(this, 'PaymentHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-payment',
            code: lambda.Code.fromAsset('../backend/functions/payment'),
            handler: 'index.handler',
            description: 'BudgetBuddy payment handler for Stripe integration and subscription management',
            environment: {
                ...commonEnvironment,
                STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
            },
        });
        /**
         * Email and Notification Functions
         * Handle SES email sending and notification management
         */
        this.functions.emailHandler = new lambda.Function(this, 'EmailHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-email',
            code: lambda.Code.fromAsset('../backend/functions/email'),
            handler: 'index.handler',
            description: 'BudgetBuddy email handler for notifications, tips delivery, and family invitations via SES',
        });
        /**
         * Data Export and Backup Functions
         * Handle CSV/PDF export and data backup functionality
         */
        this.functions.exportHandler = new lambda.Function(this, 'ExportHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-export',
            code: lambda.Code.fromAsset('../backend/functions/export'),
            handler: 'index.handler',
            description: 'BudgetBuddy export handler for CSV/PDF export and data backup functionality',
            timeout: cdk.Duration.minutes(2), // Export operations may take longer for large datasets
            memorySize: 1024, // More memory for processing large datasets
        });
        /**
         * Admin Dashboard Functions
         * Handle admin operations and analytics
         */
        this.functions.adminHandler = new lambda.Function(this, 'AdminHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-admin',
            code: lambda.Code.fromAsset('../backend/functions/admin'),
            handler: 'index.handler',
            description: 'BudgetBuddy admin handler for dashboard operations, user management, and analytics',
        });
        // Grant DynamoDB permissions to all functions
        Object.values(this.functions).forEach(func => {
            props.table.grantReadWriteData(func);
        });
        // Grant additional permissions for specific functions
        this.grantAdditionalPermissions();
    }
    /**
     * Grant additional AWS service permissions to specific functions
     */
    grantAdditionalPermissions() {
        // Auth Handler needs Cognito permissions
        this.functions.authHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cognito-idp:SignUp',
                'cognito-idp:InitiateAuth',
                'cognito-idp:ConfirmSignUp',
                'cognito-idp:ForgotPassword',
                'cognito-idp:ConfirmForgotPassword',
                'cognito-idp:GetUser',
                'cognito-idp:UpdateUserAttributes',
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:AdminDeleteUser',
            ],
            resources: ['*'], // Cognito permissions are typically broad for user pool operations
        }));
        // AI Handler needs Bedrock permissions
        this.functions.aiHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
            ],
            resources: ['*'], // Bedrock models don't have specific ARNs
        }));
        // Email Handler needs SES permissions
        this.functions.emailHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
            ],
            resources: ['*'], // SES permissions are typically broad
        }));
        // Payment Handler needs additional logging for webhook debugging
        this.functions.paymentHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));
    }
    /**
     * Create API Gateway REST API with proper configuration
     */
    createApiGateway(userPool) {
        // Create Cognito authorizer for protected endpoints
        const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'BudgetBuddyAuthorizer', {
            cognitoUserPools: [userPool],
            authorizerName: 'budgetbuddy-authorizer',
            identitySource: 'method.request.header.Authorization',
        });
        // Create the REST API
        const api = new apigateway.RestApi(this, 'BudgetBuddyApi', {
            restApiName: 'budgetbuddy-api',
            description: 'BudgetBuddy REST API for web and mobile clients with serverless Lambda backend',
            // Enable CORS for web clients
            defaultCorsPreflightOptions: {
                allowOrigins: [
                    'http://localhost:3000', // Local development
                    'http://localhost:5173', // Vite dev server
                    'https://d1ueeugn9zcx7n.cloudfront.net', // CloudFront web app
                    'https://d2ubhx2a13s7gc.cloudfront.net', // CloudFront admin dashboard
                    'https://app.budgetbuddy.com', // Production web app (custom domain)
                    'https://admin.budgetbuddy.com', // Admin dashboard (custom domain)
                ],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
                allowCredentials: true,
            },
            // API Gateway configuration
            deployOptions: {
                stageName: 'v1',
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                metricsEnabled: true,
            },
            // Binary media types for file uploads (future feature)
            binaryMediaTypes: ['multipart/form-data'],
        });
        // Store authorizer for use in route setup
        api.authorizer = authorizer;
        return api;
    }
    /**
     * Set up all API routes and Lambda integrations
     * Organizes endpoints by business domain
     */
    setupApiRoutes() {
        const authorizer = this.api.authorizer;
        // Health check endpoints (public, no auth required)
        const healthResource = this.api.root.addResource('health');
        healthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.authHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'HealthCheck',
        });
        // Authentication routes (public)
        const authResource = this.api.root.addResource('auth');
        // User registration
        const registerResource = authResource.addResource('register');
        registerResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.authHandler), {
            operationName: 'RegisterUser',
        });
        // User login
        const loginResource = authResource.addResource('login');
        loginResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.authHandler), {
            operationName: 'LoginUser',
        });
        // Email confirmation
        const confirmResource = authResource.addResource('confirm');
        confirmResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.authHandler), {
            operationName: 'ConfirmEmail',
        });
        // Forgot password
        const forgotPasswordResource = authResource.addResource('forgot-password');
        forgotPasswordResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.authHandler), {
            operationName: 'ForgotPassword',
        });
        // Reset password
        const resetPasswordResource = authResource.addResource('reset-password');
        resetPasswordResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.authHandler), {
            operationName: 'ResetPassword',
        });
        // User profile (protected)
        const profileResource = authResource.addResource('profile');
        profileResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.authHandler), {
            authorizer,
            operationName: 'GetProfile',
        });
        profileResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.authHandler), {
            authorizer,
            operationName: 'UpdateProfile',
        });
        // Auth health endpoint
        const authHealthResource = authResource.addResource('health');
        authHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.authHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'AuthHealthCheck',
        });
        // Geolocation endpoint (public)
        const geolocationResource = authResource.addResource('geolocation');
        geolocationResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.authHandler), {
            operationName: 'GetGeolocation',
        });
        // Onboarding endpoint (protected)
        const onboardingResource = authResource.addResource('onboarding');
        // Use new standalone Lambda if available, otherwise fall back to monolithic handler
        const onboardingHandler = this.authOnboardingFunction || this.functions.authHandler;
        onboardingResource.addMethod('POST', new apigateway.LambdaIntegration(onboardingHandler), {
            authorizer,
            operationName: 'CompleteOnboarding',
        });
        // Google Sign-In endpoint (public)
        const googleResource = authResource.addResource('google');
        googleResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.authHandler), {
            operationName: 'GoogleSignIn',
        });
        // User profile routes (protected)
        const usersResource = this.api.root.addResource('users');
        usersResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.authHandler), {
            authorizer,
            operationName: 'GetUserProfile',
        });
        usersResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.authHandler), {
            authorizer,
            operationName: 'UpdateUserProfile',
        });
        // Budget routes (protected)
        const budgetResource = this.api.root.addResource('budget');
        budgetResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'GetBudgets',
        });
        budgetResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'CreateBudget',
        });
        budgetResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'UpdateBudget',
        });
        // Budget current month endpoint
        const budgetCurrentResource = budgetResource.addResource('current');
        budgetCurrentResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'GetCurrentBudget',
        });
        // Budget by ID endpoint
        const budgetIdResource = budgetResource.addResource('{budgetId}');
        budgetIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'GetBudgetById',
        });
        budgetIdResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'UpdateBudgetById',
        });
        budgetIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'DeleteBudget',
        });
        // Budget health endpoint
        const budgetHealthResource = budgetResource.addResource('health');
        budgetHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'BudgetHealthCheck',
        });
        // Budget categories routes
        const categoriesResource = budgetResource.addResource('categories');
        categoriesResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'GetCategories',
        });
        categoriesResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'CreateCategory',
        });
        // AI budget generation routes
        const aiResource = budgetResource.addResource('ai-generate');
        aiResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.aiHandler), {
            authorizer,
            operationName: 'GenerateAIBudget',
        });
        // Transaction routes (protected)
        const transactionsResource = this.api.root.addResource('transactions');
        transactionsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.transactionHandler), {
            authorizer,
            operationName: 'GetTransactions',
        });
        transactionsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.transactionHandler), {
            authorizer,
            operationName: 'CreateTransaction',
        });
        // Individual transaction routes (protected)
        const transactionResource = transactionsResource.addResource('{transactionId}');
        transactionResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.transactionHandler), {
            authorizer,
            operationName: 'GetTransaction',
        });
        transactionResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.transactionHandler), {
            authorizer,
            operationName: 'UpdateTransaction',
        });
        transactionResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.transactionHandler), {
            authorizer,
            operationName: 'DeleteTransaction',
        });
        // Transactions health endpoint
        const transactionsHealthResource = transactionsResource.addResource('health');
        transactionsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.transactionHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'TransactionsHealthCheck',
        });
        // Family routes (protected)
        const familyResource = this.api.root.addResource('family');
        familyResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.familyHandler), {
            authorizer,
            operationName: 'GetFamily',
        });
        familyResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.familyHandler), {
            authorizer,
            operationName: 'CreateFamily',
        });
        // Data Export routes (protected)
        const exportResource = this.api.root.addResource('export');
        exportResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.exportHandler), {
            authorizer,
            operationName: 'ExportData',
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Content-Type': true,
                        'method.response.header.Content-Disposition': true,
                    }
                }
            ],
        });
        // Family health endpoint
        const familyHealthResource = familyResource.addResource('health');
        familyHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.familyHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'FamilyHealthCheck',
        });
        // Payment routes (protected)
        const paymentsResource = this.api.root.addResource('payments');
        paymentsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.paymentHandler), {
            authorizer,
            operationName: 'CreateSubscription',
        });
        // Payment health endpoint
        const paymentHealthResource = paymentsResource.addResource('health');
        paymentHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.paymentHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'PaymentHealthCheck',
        });
        // Webhook routes (public, but validated by Stripe)
        const webhooksResource = this.api.root.addResource('webhooks');
        const stripeWebhook = webhooksResource.addResource('stripe');
        stripeWebhook.addMethod('POST', new apigateway.LambdaIntegration(this.functions.paymentHandler), {
            operationName: 'StripeWebhook',
        });
        // Admin routes (protected with additional role checking)
        const adminResource = this.api.root.addResource('admin');
        adminResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.adminHandler), {
            authorizer,
            operationName: 'GetAdminDashboard',
        });
        // Admin health endpoint
        const adminHealthResource = adminResource.addResource('health');
        adminHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.adminHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'AdminHealthCheck',
        });
        // Email routes (public for webhooks, protected for sending)
        const emailResource = this.api.root.addResource('email');
        const emailHealthResource = emailResource.addResource('health');
        emailHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.emailHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'EmailHealthCheck',
        });
        // AI routes (separate from budget for health checks)
        const aiRootResource = this.api.root.addResource('ai');
        const aiHealthResource = aiRootResource.addResource('health');
        aiHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.aiHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'AIHealthCheck',
        });
    }
    /**
     * Create CloudFormation outputs for client configuration
     */
    createOutputs() {
        // API Gateway URL for client configuration
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: this.api.url,
            description: 'API Gateway URL for BudgetBuddy client applications (web, mobile, admin)',
            exportName: 'budgetbuddy-api-url',
        });
        // API Gateway ID for monitoring
        new cdk.CfnOutput(this, 'ApiId', {
            value: this.api.restApiId,
            description: 'API Gateway ID for BudgetBuddy monitoring and CloudWatch integration',
            exportName: 'budgetbuddy-api-id',
        });
        // Lambda function ARNs for monitoring
        Object.entries(this.functions).forEach(([name, func]) => {
            new cdk.CfnOutput(this, `${name}Arn`, {
                value: func.functionArn,
                description: `BudgetBuddy Lambda function ARN for ${name} handler monitoring and permissions`,
                exportName: `budgetbuddy-${name.toLowerCase()}-arn`,
            });
            // Add comprehensive tags to each Lambda function
            cdk.Tags.of(func).add('Component', 'API');
            cdk.Tags.of(func).add('Service', 'Lambda');
            cdk.Tags.of(func).add('Handler', name);
            cdk.Tags.of(func).add('Runtime', 'NodeJS-20');
            cdk.Tags.of(func).add('CostCenter', 'BudgetBuddy-Compute');
        });
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7R0FjRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCwrREFBaUQ7QUFLakQseURBQTJDO0FBQzNDLDJEQUE2QztBQWM3QyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQW1CckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQWIxQjs7O1dBR0c7UUFDYSxjQUFTLEdBQXVDLEVBQUUsQ0FBQztRQVdqRSx3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztRQUUzRCxxREFBcUQ7UUFDckQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFN0MseURBQXlEO1FBQ3pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFL0MsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVqRCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXRCLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVEOzs7T0FHRztJQUNLLGlCQUFpQjtRQUN2QixPQUFPLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ2xELGdCQUFnQixFQUFFLG9CQUFvQjtZQUN0QyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUks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XG4gKiBBUEkgU3RhY2sgZm9yIEJ1ZGdldEJ1ZGR5IEFwcGxpY2F0aW9uXHJcbiAqXHJcbiAqIENyZWF0ZXMgQVBJIEdhdGV3YXkgUkVTVCBBUEkgd2l0aCBMYW1iZGEgZnVuY3Rpb24gaW50ZWdyYXRpb25zIGZvciBhbGxcclxuICogYmFja2VuZCBmdW5jdGlvbmFsaXR5LiBJbmNsdWRlcyBwcm9wZXIgQ09SUyBjb25maWd1cmF0aW9uLCBhdXRoZW50aWNhdGlvbixcclxuICogYW5kIGVycm9yIGhhbmRsaW5nIGZvciB3ZWIgYW5kIG1vYmlsZSBjbGllbnRzLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gUkVTVCBBUEkgd2l0aCByZXNvdXJjZS1iYXNlZCByb3V0aW5nXHJcbiAqIC0gTGFtYmRhIGZ1bmN0aW9uIGludGVncmF0aW9ucyBmb3IgYnVzaW5lc3MgbG9naWNcclxuICogLSBDb2duaXRvIGF1dGhvcml6ZXIgZm9yIHByb3RlY3RlZCBlbmRwb2ludHNcclxuICogLSBDT1JTIGNvbmZpZ3VyYXRpb24gZm9yIHdlYiBjbGllbnRzXHJcbiAqIC0gUmVxdWVzdC9yZXNwb25zZSB2YWxpZGF0aW9uXHJcbiAqIC0gQ2xvdWRXYXRjaCBsb2dnaW5nIGFuZCBtb25pdG9yaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuXHJcbmRlY2xhcmUgY29uc3QgcHJvY2VzczogYW55O1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG4vKipcclxuICogUHJvcHMgZm9yIHRoZSBBUEkgU3RhY2tcclxuICogUmVxdWlyZXMgcmVzb3VyY2VzIGZyb20gb3RoZXIgc3RhY2tzIChkYXRhYmFzZSBhbmQgYXV0aClcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XHJcbiAgYXV0aE9uYm9hcmRpbmdGdW5jdGlvbj86IGxhbWJkYS5GdW5jdGlvbjsgLy8gT3B0aW9uYWwgLSBmb3IgZ3JhZHVhbCByZWZhY3RvcmluZ1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIC8qKlxyXG4gICAqIEFQSSBHYXRld2F5IFJFU1QgQVBJXHJcbiAgICogRXhwb3NlZCBhcyBwdWJsaWMgcHJvcGVydHkgZm9yIG1vbml0b3Jpbmcgc3RhY2tcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGk7XHJcblxyXG4gIC8qKlxyXG4gICAqIExhbWJkYSBmdW5jdGlvbnMgZm9yIGRpZmZlcmVudCBidXNpbmVzcyBkb21haW5zXHJcbiAgICogRXhwb3NlZCBmb3IgbW9uaXRvcmluZyBhbmQgYWRkaXRpb25hbCBpbnRlZ3JhdGlvbnNcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgZnVuY3Rpb25zOiB7IFtrZXk6IHN0cmluZ106IGxhbWJkYS5GdW5jdGlvbiB9ID0ge307XHJcblxyXG4gIC8qKlxyXG4gICAqIEF1dGggT25ib2FyZGluZyBMYW1iZGEgRnVuY3Rpb24gKG9wdGlvbmFsKVxyXG4gICAqIFBhcnQgb2YgYXJjaGl0ZWN0dXJhbCByZWZhY3RvcmluZyAtIHN0YW5kYWxvbmUgZnVuY3Rpb24gZm9yIG9uYm9hcmRpbmdcclxuICAgKi9cclxuICBwcml2YXRlIHJlYWRvbmx5IGF1dGhPbmJvYXJkaW5nRnVuY3Rpb24/OiBsYW1iZGEuRnVuY3Rpb247XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBTdG9yZSBhdXRoIG9uYm9hcmRpbmcgZnVuY3Rpb24gZm9yIHVzZSBpbiByb3V0ZSBzZXR1cFxyXG4gICAgdGhpcy5hdXRoT25ib2FyZGluZ0Z1bmN0aW9uID0gcHJvcHMuYXV0aE9uYm9hcmRpbmdGdW5jdGlvbjtcclxuXHJcbiAgICAvLyBDcmVhdGUgc2hhcmVkIExhbWJkYSBsYXllciBmb3IgY29tbW9uIGRlcGVuZGVuY2llc1xyXG4gICAgY29uc3QgY29tbW9uTGF5ZXIgPSB0aGlzLmNyZWF0ZUNvbW1vbkxheWVyKCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIExhbWJkYSBmdW5jdGlvbnMgZm9yIGRpZmZlcmVudCBidXNpbmVzcyBkb21haW5zXHJcbiAgICB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9ucyhwcm9wcywgY29tbW9uTGF5ZXIpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheSB3aXRoIHByb3BlciBjb25maWd1cmF0aW9uXHJcbiAgICB0aGlzLmFwaSA9IHRoaXMuY3JlYXRlQXBpR2F0ZXdheShwcm9wcy51c2VyUG9vbCk7XHJcblxyXG4gICAgLy8gU2V0IHVwIEFQSSByb3V0ZXMgYW5kIGludGVncmF0aW9uc1xyXG4gICAgdGhpcy5zZXR1cEFwaVJvdXRlcygpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBvdXRwdXRzIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgdGhpcy5jcmVhdGVPdXRwdXRzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBMYW1iZGEgbGF5ZXIgd2l0aCBjb21tb24gZGVwZW5kZW5jaWVzXHJcbiAgICogUmVkdWNlcyBkZXBsb3ltZW50IHBhY2thZ2Ugc2l6ZXMgYW5kIGltcHJvdmVzIGNvbGQgc3RhcnQgdGltZXNcclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUNvbW1vbkxheWVyKCk6IGxhbWJkYS5MYXllclZlcnNpb24ge1xyXG4gICAgcmV0dXJuIG5ldyBsYW1iZGEuTGF5ZXJWZXJzaW9uKHRoaXMsICdDb21tb25MYXllcicsIHtcclxuICAgICAgbGF5ZXJWZXJzaW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWNvbW1vbicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9sYXllcnMvY29tbW9uJyksXHJcbiAgICAgIGNvbXBhdGlibGVSdW50aW1lczogW2xhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YXSxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb21tb24gZGVwZW5kZW5jaWVzIGFuZCB1dGlsaXRpZXMgZm9yIEJ1ZGdldEJ1ZGR5IExhbWJkYSBmdW5jdGlvbnMgdG8gcmVkdWNlIGNvbGQgc3RhcnQgdGltZXMnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYWxsIExhbWJkYSBmdW5jdGlvbnMgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gICAqIEVhY2ggZnVuY3Rpb24gaGFuZGxlcyBhIHNwZWNpZmljIGJ1c2luZXNzIGRvbWFpblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlTGFtYmRhRnVuY3Rpb25zKHByb3BzOiBBcGlTdGFja1Byb3BzLCBjb21tb25MYXllcjogbGFtYmRhLkxheWVyVmVyc2lvbik6IHZvaWQge1xyXG4gICAgLy8gQ29tbW9uIGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIGZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY29tbW9uRW52aXJvbm1lbnQgPSB7XHJcbiAgICAgIFRBQkxFX05BTUU6IHByb3BzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcclxuICAgICAgTE9HX0xFVkVMOiAnaW5mbycsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENvbW1vbiBMYW1iZGEgZnVuY3Rpb24gY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgY29tbW9uUHJvcHMgPSB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gQmFsYW5jZWQgZm9yIGNvc3QgYW5kIHBlcmZvcm1hbmNlXHJcbiAgICAgIGxheWVyczogW2NvbW1vbkxheWVyXSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSywgLy8gQ29zdCBvcHRpbWl6YXRpb25cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdXRoZW50aWNhdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSB1c2VyIHJlZ2lzdHJhdGlvbiwgbG9naW4sIGFuZCBwcm9maWxlIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBdXRoSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGgnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2F1dGgnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGF1dGhlbnRpY2F0aW9uIGhhbmRsZXIgZm9yIHVzZXIgcmVnaXN0cmF0aW9uLCBsb2dpbiwgYW5kIHByb2ZpbGUgbWFuYWdlbWVudCcsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLi4uY29tbW9uRW52aXJvbm1lbnQsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIENMSUVOVF9JRDogcHJvcHMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVkZ2V0IE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgYnVkZ2V0IENSVUQgb3BlcmF0aW9ucyBhbmQgY2FsY3VsYXRpb25zXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdCdWRnZXRIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYnVkZ2V0JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9idWRnZXQnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGJ1ZGdldCBoYW5kbGVyIGZvciBDUlVEIG9wZXJhdGlvbnMsIGNhdGVnb3JpZXMsIGFuZCB6ZXJvLWJhc2VkIGNhbGN1bGF0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyYW5zYWN0aW9uIE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgdHJhbnNhY3Rpb24gQ1JVRCBvcGVyYXRpb25zIGFuZCBidWRnZXQgdXBkYXRlc1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUcmFuc2FjdGlvbkhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS10cmFuc2FjdGlvbicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvdHJhbnNhY3Rpb25zJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSB0cmFuc2FjdGlvbiBoYW5kbGVyIGZvciBleHBlbnNlL2luY29tZSB0cmFja2luZyBhbmQgYXV0b21hdGljIGJ1ZGdldCB1cGRhdGVzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQUkgQnVkZ2V0IEdlbmVyYXRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgQUktcG93ZXJlZCBidWRnZXQgZ2VuZXJhdGlvbiB1c2luZyBBV1MgQmVkcm9ja1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5haUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1haScsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvYWknKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IEFJIGhhbmRsZXIgZm9yIHBlcnNvbmFsaXplZCBidWRnZXQgZ2VuZXJhdGlvbiB1c2luZyBBV1MgQmVkcm9jayBDbGF1ZGUgMy41JyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksIC8vIEFJIGNhbGxzIG1heSB0YWtlIGxvbmdlclxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIC4uLmNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEZhbWlseSBBY2NvdW50IE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgZmFtaWx5IGNyZWF0aW9uLCBpbnZpdGF0aW9ucywgYW5kIG1lbWJlciBtYW5hZ2VtZW50XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmZhbWlseUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdGYW1pbHlIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktZmFtaWx5JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9mYW1pbHknKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGZhbWlseSBoYW5kbGVyIGZvciBzaGFyZWQgYWNjb3VudHMsIGludml0YXRpb25zLCBhbmQgbWVtYmVyIG1hbmFnZW1lbnQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQYXltZW50IGFuZCBTdWJzY3JpcHRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgU3RyaXBlIGludGVncmF0aW9uIGFuZCBzdWJzY3JpcHRpb24gbWFuYWdlbWVudFxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5wYXltZW50SGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BheW1lbnRIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktcGF5bWVudCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvcGF5bWVudCcpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgcGF5bWVudCBoYW5kbGVyIGZvciBTdHJpcGUgaW50ZWdyYXRpb24gYW5kIHN1YnNjcmlwdGlvbiBtYW5hZ2VtZW50JyxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25FbnZpcm9ubWVudCxcclxuICAgICAgICBTVFJJUEVfU0VDUkVUX0tFWTogcHJvY2Vzcy5lbnYuU1RSSVBFX1NFQ1JFVF9LRVkgfHwgJycsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEVtYWlsIGFuZCBOb3RpZmljYXRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgU0VTIGVtYWlsIHNlbmRpbmcgYW5kIG5vdGlmaWNhdGlvbiBtYW5hZ2VtZW50XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmVtYWlsSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0VtYWlsSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWVtYWlsJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9lbWFpbCcpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgZW1haWwgaGFuZGxlciBmb3Igbm90aWZpY2F0aW9ucywgdGlwcyBkZWxpdmVyeSwgYW5kIGZhbWlseSBpbnZpdGF0aW9ucyB2aWEgU0VTJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGF0YSBFeHBvcnQgYW5kIEJhY2t1cCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBDU1YvUERGIGV4cG9ydCBhbmQgZGF0YSBiYWNrdXAgZnVuY3Rpb25hbGl0eVxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5leHBvcnRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRXhwb3J0SGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWV4cG9ydCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvZXhwb3J0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBleHBvcnQgaGFuZGxlciBmb3IgQ1NWL1BERiBleHBvcnQgYW5kIGRhdGEgYmFja3VwIGZ1bmN0aW9uYWxpdHknLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSwgLy8gRXhwb3J0IG9wZXJhdGlvbnMgbWF5IHRha2UgbG9uZ2VyIGZvciBsYXJnZSBkYXRhc2V0c1xyXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LCAvLyBNb3JlIG1lbW9yeSBmb3IgcHJvY2Vzc2luZyBsYXJnZSBkYXRhc2V0c1xyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZG1pbiBEYXNoYm9hcmQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgYWRtaW4gb3BlcmF0aW9ucyBhbmQgYW5hbHl0aWNzXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmFkbWluSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FkbWluSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWFkbWluJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9hZG1pbicpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgYWRtaW4gaGFuZGxlciBmb3IgZGFzaGJvYXJkIG9wZXJhdGlvbnMsIHVzZXIgbWFuYWdlbWVudCwgYW5kIGFuYWx5dGljcycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9ucyB0byBhbGwgZnVuY3Rpb25zXHJcbiAgICBPYmplY3QudmFsdWVzKHRoaXMuZnVuY3Rpb25zKS5mb3JFYWNoKGZ1bmMgPT4ge1xyXG4gICAgICBwcm9wcy50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBhZGRpdGlvbmFsIHBlcm1pc3Npb25zIGZvciBzcGVjaWZpYyBmdW5jdGlvbnNcclxuICAgIHRoaXMuZ3JhbnRBZGRpdGlvbmFsUGVybWlzc2lvbnMoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IGFkZGl0aW9uYWwgQVdTIHNlcnZpY2UgcGVybWlzc2lvbnMgdG8gc3BlY2lmaWMgZnVuY3Rpb25zXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBncmFudEFkZGl0aW9uYWxQZXJtaXNzaW9ucygpOiB2b2lkIHtcclxuICAgIC8vIEF1dGggSGFuZGxlciBuZWVkcyBDb2duaXRvIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6U2lnblVwJyxcclxuICAgICAgICAnY29nbml0by1pZHA6SW5pdGlhdGVBdXRoJyxcclxuICAgICAgICAnY29nbml0by1pZHA6Q29uZmlybVNpZ25VcCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkZvcmdvdFBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6Q29uZmlybUZvcmdvdFBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6R2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOlVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5VcGRhdGVVc2VyQXR0cmlidXRlcycsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluU2V0VXNlclBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5EZWxldGVVc2VyJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gQ29nbml0byBwZXJtaXNzaW9ucyBhcmUgdHlwaWNhbGx5IGJyb2FkIGZvciB1c2VyIHBvb2wgb3BlcmF0aW9uc1xyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEFJIEhhbmRsZXIgbmVlZHMgQmVkcm9jayBwZXJtaXNzaW9uc1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJyxcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIEJlZHJvY2sgbW9kZWxzIGRvbid0IGhhdmUgc3BlY2lmaWMgQVJOc1xyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEVtYWlsIEhhbmRsZXIgbmVlZHMgU0VTIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5lbWFpbEhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxyXG4gICAgICAgICdzZXM6U2VuZFJhd0VtYWlsJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gU0VTIHBlcm1pc3Npb25zIGFyZSB0eXBpY2FsbHkgYnJvYWRcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBQYXltZW50IEhhbmRsZXIgbmVlZHMgYWRkaXRpb25hbCBsb2dnaW5nIGZvciB3ZWJob29rIGRlYnVnZ2luZ1xyXG4gICAgdGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXHJcbiAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgIH0pKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBBUEkgR2F0ZXdheSBSRVNUIEFQSSB3aXRoIHByb3BlciBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVBcGlHYXRld2F5KHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sKTogYXBpZ2F0ZXdheS5SZXN0QXBpIHtcclxuICAgIC8vIENyZWF0ZSBDb2duaXRvIGF1dGhvcml6ZXIgZm9yIHByb3RlY3RlZCBlbmRwb2ludHNcclxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSBuZXcgYXBpZ2F0ZXdheS5Db2duaXRvVXNlclBvb2xzQXV0aG9yaXplcih0aGlzLCAnQnVkZ2V0QnVkZHlBdXRob3JpemVyJywge1xyXG4gICAgICBjb2duaXRvVXNlclBvb2xzOiBbdXNlclBvb2xdLFxyXG4gICAgICBhdXRob3JpemVyTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGhvcml6ZXInLFxyXG4gICAgICBpZGVudGl0eVNvdXJjZTogJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgUkVTVCBBUElcclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0J1ZGdldEJ1ZGR5QXBpJywge1xyXG4gICAgICByZXN0QXBpTmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgUkVTVCBBUEkgZm9yIHdlYiBhbmQgbW9iaWxlIGNsaWVudHMgd2l0aCBzZXJ2ZXJsZXNzIExhbWJkYSBiYWNrZW5kJyxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSBDT1JTIGZvciB3ZWIgY2xpZW50c1xyXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcclxuICAgICAgICBhbGxvd09yaWdpbnM6IFtcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLCAvLyBMb2NhbCBkZXZlbG9wbWVudFxyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycsIC8vIFZpdGUgZGV2IHNlcnZlclxyXG4gICAgICAgICAgJ2h0dHBzOi8vZDF1ZWV1Z245emN4N24uY2xvdWRmcm9udC5uZXQnLCAvLyBDbG91ZEZyb250IHdlYiBhcHBcclxuICAgICAgICAgICdodHRwczovL2QydWJoeDJhMTNzN2djLmNsb3VkZnJvbnQubmV0JywgLy8gQ2xvdWRGcm9udCBhZG1pbiBkYXNoYm9hcmRcclxuICAgICAgICAgICdodHRwczovL2FwcC5idWRnZXRidWRkeS5jb20nLCAvLyBQcm9kdWN0aW9uIHdlYiBhcHAgKGN1c3RvbSBkb21haW4pXHJcbiAgICAgICAgICAnaHR0cHM6Ly9hZG1pbi5idWRnZXRidWRkeS5jb20nLCAvLyBBZG1pbiBkYXNoYm9hcmQgKGN1c3RvbSBkb21haW4pXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFsnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURScsICdPUFRJT05TJ10sXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICdYLUFtei1EYXRlJyxcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcclxuICAgICAgICAgICdYLUFwaS1LZXknLFxyXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBUEkgR2F0ZXdheSBjb25maWd1cmF0aW9uXHJcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcclxuICAgICAgICBzdGFnZU5hbWU6ICd2MScsXHJcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxyXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBCaW5hcnkgbWVkaWEgdHlwZXMgZm9yIGZpbGUgdXBsb2FkcyAoZnV0dXJlIGZlYXR1cmUpXHJcbiAgICAgIGJpbmFyeU1lZGlhVHlwZXM6IFsnbXVsdGlwYXJ0L2Zvcm0tZGF0YSddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgYXV0aG9yaXplciBmb3IgdXNlIGluIHJvdXRlIHNldHVwXHJcbiAgICAoYXBpIGFzIGFueSkuYXV0aG9yaXplciA9IGF1dGhvcml6ZXI7XHJcblxyXG4gICAgcmV0dXJuIGFwaTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCB1cCBhbGwgQVBJIHJvdXRlcyBhbmQgTGFtYmRhIGludGVncmF0aW9uc1xyXG4gICAqIE9yZ2FuaXplcyBlbmRwb2ludHMgYnkgYnVzaW5lc3MgZG9tYWluXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzZXR1cEFwaVJvdXRlcygpOiB2b2lkIHtcclxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSAodGhpcy5hcGkgYXMgYW55KS5hdXRob3JpemVyO1xyXG5cclxuICAgIC8vIEhlYWx0aCBjaGVjayBlbmRwb2ludHMgKHB1YmxpYywgbm8gYXV0aCByZXF1aXJlZClcclxuICAgIGNvbnN0IGhlYWx0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBoZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gcm91dGVzIChwdWJsaWMpXHJcbiAgICBjb25zdCBhdXRoUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhdXRoJyk7XHJcblxyXG4gICAgLy8gVXNlciByZWdpc3RyYXRpb25cclxuICAgIGNvbnN0IHJlZ2lzdGVyUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJyk7XHJcbiAgICByZWdpc3RlclJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUmVnaXN0ZXJVc2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgbG9naW5cclxuICAgIGNvbnN0IGxvZ2luUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ2luJyk7XHJcbiAgICBsb2dpblJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnTG9naW5Vc2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVtYWlsIGNvbmZpcm1hdGlvblxyXG4gICAgY29uc3QgY29uZmlybVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdjb25maXJtJyk7XHJcbiAgICBjb25maXJtUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDb25maXJtRW1haWwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRm9yZ290IHBhc3N3b3JkXHJcbiAgICBjb25zdCBmb3Jnb3RQYXNzd29yZFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdmb3Jnb3QtcGFzc3dvcmQnKTtcclxuICAgIGZvcmdvdFBhc3N3b3JkUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdGb3Jnb3RQYXNzd29yZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZXNldCBwYXNzd29yZFxyXG4gICAgY29uc3QgcmVzZXRQYXNzd29yZFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdyZXNldC1wYXNzd29yZCcpO1xyXG4gICAgcmVzZXRQYXNzd29yZFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUmVzZXRQYXNzd29yZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVc2VyIHByb2ZpbGUgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHByb2ZpbGVSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncHJvZmlsZScpO1xyXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRQcm9maWxlJyxcclxuICAgIH0pO1xyXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVQcm9maWxlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGggaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBhdXRoSGVhbHRoUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgYXV0aEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdBdXRoSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2VvbG9jYXRpb24gZW5kcG9pbnQgKHB1YmxpYylcclxuICAgIGNvbnN0IGdlb2xvY2F0aW9uUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2dlb2xvY2F0aW9uJyk7XHJcbiAgICBnZW9sb2NhdGlvblJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRHZW9sb2NhdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPbmJvYXJkaW5nIGVuZHBvaW50IChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBvbmJvYXJkaW5nUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ29uYm9hcmRpbmcnKTtcclxuICAgIC8vIFVzZSBuZXcgc3RhbmRhbG9uZSBMYW1iZGEgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgZmFsbCBiYWNrIHRvIG1vbm9saXRoaWMgaGFuZGxlclxyXG4gICAgY29uc3Qgb25ib2FyZGluZ0hhbmRsZXIgPSB0aGlzLmF1dGhPbmJvYXJkaW5nRnVuY3Rpb24gfHwgdGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXI7XHJcbiAgICBvbmJvYXJkaW5nUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ob25ib2FyZGluZ0hhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDb21wbGV0ZU9uYm9hcmRpbmcnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR29vZ2xlIFNpZ24tSW4gZW5kcG9pbnQgKHB1YmxpYylcclxuICAgIGNvbnN0IGdvb2dsZVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdnb29nbGUnKTtcclxuICAgIGdvb2dsZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR29vZ2xlU2lnbkluJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgcHJvZmlsZSByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHVzZXJzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd1c2VycycpO1xyXG4gICAgdXNlcnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0VXNlclByb2ZpbGUnLFxyXG4gICAgfSk7XHJcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVVc2VyUHJvZmlsZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBidWRnZXRSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2J1ZGdldCcpO1xyXG4gICAgYnVkZ2V0UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QnVkZ2V0cycsXHJcbiAgICB9KTtcclxuICAgIGJ1ZGdldFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVCdWRnZXQnLFxyXG4gICAgfSk7XHJcbiAgICBidWRnZXRSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVCdWRnZXQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQnVkZ2V0IGN1cnJlbnQgbW9udGggZW5kcG9pbnRcclxuICAgIGNvbnN0IGJ1ZGdldEN1cnJlbnRSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCdjdXJyZW50Jyk7XHJcbiAgICBidWRnZXRDdXJyZW50UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0Q3VycmVudEJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgYnkgSUQgZW5kcG9pbnRcclxuICAgIGNvbnN0IGJ1ZGdldElkUmVzb3VyY2UgPSBidWRnZXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2J1ZGdldElkfScpO1xyXG4gICAgYnVkZ2V0SWRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRCdWRnZXRCeUlkJyxcclxuICAgIH0pO1xyXG4gICAgYnVkZ2V0SWRSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVCdWRnZXRCeUlkJyxcclxuICAgIH0pO1xyXG4gICAgYnVkZ2V0SWRSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdEZWxldGVCdWRnZXQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQnVkZ2V0IGhlYWx0aCBlbmRwb2ludFxyXG4gICAgY29uc3QgYnVkZ2V0SGVhbHRoUmVzb3VyY2UgPSBidWRnZXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBidWRnZXRIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdCdWRnZXRIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgY2F0ZWdvcmllcyByb3V0ZXNcclxuICAgIGNvbnN0IGNhdGVnb3JpZXNSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCdjYXRlZ29yaWVzJyk7XHJcbiAgICBjYXRlZ29yaWVzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0Q2F0ZWdvcmllcycsXHJcbiAgICB9KTtcclxuICAgIGNhdGVnb3JpZXNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQ3JlYXRlQ2F0ZWdvcnknLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQUkgYnVkZ2V0IGdlbmVyYXRpb24gcm91dGVzXHJcbiAgICBjb25zdCBhaVJlc291cmNlID0gYnVkZ2V0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2FpLWdlbmVyYXRlJyk7XHJcbiAgICBhaVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFpSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dlbmVyYXRlQUlCdWRnZXQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVHJhbnNhY3Rpb24gcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCB0cmFuc2FjdGlvbnNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3RyYW5zYWN0aW9ucycpO1xyXG4gICAgdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRUcmFuc2FjdGlvbnMnLFxyXG4gICAgfSk7XHJcbiAgICB0cmFuc2FjdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVUcmFuc2FjdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJbmRpdmlkdWFsIHRyYW5zYWN0aW9uIHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgdHJhbnNhY3Rpb25SZXNvdXJjZSA9IHRyYW5zYWN0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dHJhbnNhY3Rpb25JZH0nKTtcclxuICAgIHRyYW5zYWN0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRUcmFuc2FjdGlvbicsXHJcbiAgICB9KTtcclxuICAgIHRyYW5zYWN0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVUcmFuc2FjdGlvbicsXHJcbiAgICB9KTtcclxuICAgIHRyYW5zYWN0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdEZWxldGVUcmFuc2FjdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcmFuc2FjdGlvbnMgaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCB0cmFuc2FjdGlvbnNIZWFsdGhSZXNvdXJjZSA9IHRyYW5zYWN0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIHRyYW5zYWN0aW9uc0hlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMudHJhbnNhY3Rpb25IYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnVHJhbnNhY3Rpb25zSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmFtaWx5IHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgZmFtaWx5UmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdmYW1pbHknKTtcclxuICAgIGZhbWlseVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZmFtaWx5SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEZhbWlseScsXHJcbiAgICB9KTtcclxuICAgIGZhbWlseVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmZhbWlseUhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVGYW1pbHknLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGF0YSBFeHBvcnQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBleHBvcnRSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2V4cG9ydCcpO1xyXG4gICAgZXhwb3J0UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5leHBvcnRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnRXhwb3J0RGF0YScsXHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkNvbnRlbnQtVHlwZSc6IHRydWUsXHJcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkNvbnRlbnQtRGlzcG9zaXRpb24nOiB0cnVlLFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZhbWlseSBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IGZhbWlseUhlYWx0aFJlc291cmNlID0gZmFtaWx5UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgZmFtaWx5SGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5mYW1pbHlIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnRmFtaWx5SGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUGF5bWVudCByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHBheW1lbnRzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdwYXltZW50cycpO1xyXG4gICAgcGF5bWVudHNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5wYXltZW50SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZVN1YnNjcmlwdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXltZW50IGhlYWx0aCBlbmRwb2ludFxyXG4gICAgY29uc3QgcGF5bWVudEhlYWx0aFJlc291cmNlID0gcGF5bWVudHNSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBwYXltZW50SGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5wYXltZW50SGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1BheW1lbnRIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBXZWJob29rIHJvdXRlcyAocHVibGljLCBidXQgdmFsaWRhdGVkIGJ5IFN0cmlwZSlcclxuICAgIGNvbnN0IHdlYmhvb2tzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd3ZWJob29rcycpO1xyXG4gICAgY29uc3Qgc3RyaXBlV2ViaG9vayA9IHdlYmhvb2tzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3N0cmlwZScpO1xyXG4gICAgc3RyaXBlV2ViaG9vay5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5wYXltZW50SGFuZGxlciksIHtcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1N0cmlwZVdlYmhvb2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRtaW4gcm91dGVzIChwcm90ZWN0ZWQgd2l0aCBhZGRpdGlvbmFsIHJvbGUgY2hlY2tpbmcpXHJcbiAgICBjb25zdCBhZG1pblJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYWRtaW4nKTtcclxuICAgIGFkbWluUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hZG1pbkhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRBZG1pbkRhc2hib2FyZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZG1pbiBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IGFkbWluSGVhbHRoUmVzb3VyY2UgPSBhZG1pblJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGFkbWluSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hZG1pbkhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdBZG1pbkhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVtYWlsIHJvdXRlcyAocHVibGljIGZvciB3ZWJob29rcywgcHJvdGVjdGVkIGZvciBzZW5kaW5nKVxyXG4gICAgY29uc3QgZW1haWxSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2VtYWlsJyk7XHJcbiAgICBjb25zdCBlbWFpbEhlYWx0aFJlc291cmNlID0gZW1haWxSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBlbWFpbEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZW1haWxIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnRW1haWxIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSByb3V0ZXMgKHNlcGFyYXRlIGZyb20gYnVkZ2V0IGZvciBoZWFsdGggY2hlY2tzKVxyXG4gICAgY29uc3QgYWlSb290UmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhaScpO1xyXG4gICAgY29uc3QgYWlIZWFsdGhSZXNvdXJjZSA9IGFpUm9vdFJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGFpSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5haUhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdBSUhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIENsb3VkRm9ybWF0aW9uIG91dHB1dHMgZm9yIGNsaWVudCBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVPdXRwdXRzKCk6IHZvaWQge1xyXG4gICAgLy8gQVBJIEdhdGV3YXkgVVJMIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXBpLnVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwgZm9yIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhcHBsaWNhdGlvbnMgKHdlYiwgbW9iaWxlLCBhZG1pbiknLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktYXBpLXVybCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSBJRCBmb3IgbW9uaXRvcmluZ1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUlkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hcGkucmVzdEFwaUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IElEIGZvciBCdWRnZXRCdWRkeSBtb25pdG9yaW5nIGFuZCBDbG91ZFdhdGNoIGludGVncmF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaS1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gQVJOcyBmb3IgbW9uaXRvcmluZ1xyXG4gICAgT2JqZWN0LmVudHJpZXModGhpcy5mdW5jdGlvbnMpLmZvckVhY2goKFtuYW1lLCBmdW5jXSkgPT4ge1xyXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBgJHtuYW1lfUFybmAsIHtcclxuICAgICAgICB2YWx1ZTogZnVuYy5mdW5jdGlvbkFybixcclxuICAgICAgICBkZXNjcmlwdGlvbjogYEJ1ZGdldEJ1ZGR5IExhbWJkYSBmdW5jdGlvbiBBUk4gZm9yICR7bmFtZX0gaGFuZGxlciBtb25pdG9yaW5nIGFuZCBwZXJtaXNzaW9uc2AsXHJcbiAgICAgICAgZXhwb3J0TmFtZTogYGJ1ZGdldGJ1ZGR5LSR7bmFtZS50b0xvd2VyQ2FzZSgpfS1hcm5gLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIHRhZ3MgdG8gZWFjaCBMYW1iZGEgZnVuY3Rpb25cclxuICAgICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdDb21wb25lbnQnLCAnQVBJJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnU2VydmljZScsICdMYW1iZGEnKTtcclxuICAgICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdIYW5kbGVyJywgbmFtZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnUnVudGltZScsICdOb2RlSlMtMjAnKTtcclxuICAgICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUNvbXB1dGUnKTtcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=