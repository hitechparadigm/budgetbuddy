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
        onboardingResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.authHandler), {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7R0FjRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCwrREFBaUQ7QUFLakQseURBQTJDO0FBQzNDLDJEQUE2QztBQWE3QyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQWFyQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW9CO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBUDFCOzs7V0FHRztRQUNhLGNBQVMsR0FBdUMsRUFBRSxDQUFDO1FBS2pFLHFEQUFxRDtRQUNyRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUU3Qyx5REFBeUQ7UUFDekQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztRQUUvQywrQ0FBK0M7UUFDL0MsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRWpELHFDQUFxQztRQUNyQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFdEIsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssaUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDbEQsZ0JBQWdCLEVBQUUsb0JBQW9CO1lBQ3RDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQztZQUN2RCxrQkFBa0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFP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QUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDdEQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksS0FBSyxFQUFFO2dCQUNwQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQ3ZCLFdBQVcsRUFBRSx1Q0FBdUMsSUFBSSxxQ0FBcUM7Z0JBQzdGLFVBQVUsRUFBRSxlQUFlLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTTthQUNwRCxDQUFDLENBQUM7WUFFSCxpREFBaUQ7WUFDakQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM5QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE3bUJELDRCQTZtQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQVBJIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKlxyXG4gKiBDcmVhdGVzIEFQSSBHYXRld2F5IFJFU1QgQVBJIHdpdGggTGFtYmRhIGZ1bmN0aW9uIGludGVncmF0aW9ucyBmb3IgYWxsXHJcbiAqIGJhY2tlbmQgZnVuY3Rpb25hbGl0eS4gSW5jbHVkZXMgcHJvcGVyIENPUlMgY29uZmlndXJhdGlvbiwgYXV0aGVudGljYXRpb24sXHJcbiAqIGFuZCBlcnJvciBoYW5kbGluZyBmb3Igd2ViIGFuZCBtb2JpbGUgY2xpZW50cy5cclxuICpcclxuICogS2V5IEZlYXR1cmVzOlxyXG4gKiAtIFJFU1QgQVBJIHdpdGggcmVzb3VyY2UtYmFzZWQgcm91dGluZ1xyXG4gKiAtIExhbWJkYSBmdW5jdGlvbiBpbnRlZ3JhdGlvbnMgZm9yIGJ1c2luZXNzIGxvZ2ljXHJcbiAqIC0gQ29nbml0byBhdXRob3JpemVyIGZvciBwcm90ZWN0ZWQgZW5kcG9pbnRzXHJcbiAqIC0gQ09SUyBjb25maWd1cmF0aW9uIGZvciB3ZWIgY2xpZW50c1xyXG4gKiAtIFJlcXVlc3QvcmVzcG9uc2UgdmFsaWRhdGlvblxyXG4gKiAtIENsb3VkV2F0Y2ggbG9nZ2luZyBhbmQgbW9uaXRvcmluZ1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcblxyXG5kZWNsYXJlIGNvbnN0IHByb2Nlc3M6IGFueTtcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuLyoqXHJcbiAqIFByb3BzIGZvciB0aGUgQVBJIFN0YWNrXHJcbiAqIFJlcXVpcmVzIHJlc291cmNlcyBmcm9tIG90aGVyIHN0YWNrcyAoZGF0YWJhc2UgYW5kIGF1dGgpXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEFwaVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgdGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG4gIHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIC8qKlxyXG4gICAqIEFQSSBHYXRld2F5IFJFU1QgQVBJXHJcbiAgICogRXhwb3NlZCBhcyBwdWJsaWMgcHJvcGVydHkgZm9yIG1vbml0b3Jpbmcgc3RhY2tcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGk7XHJcblxyXG4gIC8qKlxyXG4gICAqIExhbWJkYSBmdW5jdGlvbnMgZm9yIGRpZmZlcmVudCBidXNpbmVzcyBkb21haW5zXHJcbiAgICogRXhwb3NlZCBmb3IgbW9uaXRvcmluZyBhbmQgYWRkaXRpb25hbCBpbnRlZ3JhdGlvbnNcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgZnVuY3Rpb25zOiB7IFtrZXk6IHN0cmluZ106IGxhbWJkYS5GdW5jdGlvbiB9ID0ge307XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgc2hhcmVkIExhbWJkYSBsYXllciBmb3IgY29tbW9uIGRlcGVuZGVuY2llc1xyXG4gICAgY29uc3QgY29tbW9uTGF5ZXIgPSB0aGlzLmNyZWF0ZUNvbW1vbkxheWVyKCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIExhbWJkYSBmdW5jdGlvbnMgZm9yIGRpZmZlcmVudCBidXNpbmVzcyBkb21haW5zXHJcbiAgICB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9ucyhwcm9wcywgY29tbW9uTGF5ZXIpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheSB3aXRoIHByb3BlciBjb25maWd1cmF0aW9uXHJcbiAgICB0aGlzLmFwaSA9IHRoaXMuY3JlYXRlQXBpR2F0ZXdheShwcm9wcy51c2VyUG9vbCk7XHJcblxyXG4gICAgLy8gU2V0IHVwIEFQSSByb3V0ZXMgYW5kIGludGVncmF0aW9uc1xyXG4gICAgdGhpcy5zZXR1cEFwaVJvdXRlcygpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBvdXRwdXRzIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgdGhpcy5jcmVhdGVPdXRwdXRzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBMYW1iZGEgbGF5ZXIgd2l0aCBjb21tb24gZGVwZW5kZW5jaWVzXHJcbiAgICogUmVkdWNlcyBkZXBsb3ltZW50IHBhY2thZ2Ugc2l6ZXMgYW5kIGltcHJvdmVzIGNvbGQgc3RhcnQgdGltZXNcclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUNvbW1vbkxheWVyKCk6IGxhbWJkYS5MYXllclZlcnNpb24ge1xyXG4gICAgcmV0dXJuIG5ldyBsYW1iZGEuTGF5ZXJWZXJzaW9uKHRoaXMsICdDb21tb25MYXllcicsIHtcclxuICAgICAgbGF5ZXJWZXJzaW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWNvbW1vbicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9sYXllcnMvY29tbW9uJyksXHJcbiAgICAgIGNvbXBhdGlibGVSdW50aW1lczogW2xhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YXSxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb21tb24gZGVwZW5kZW5jaWVzIGFuZCB1dGlsaXRpZXMgZm9yIEJ1ZGdldEJ1ZGR5IExhbWJkYSBmdW5jdGlvbnMgdG8gcmVkdWNlIGNvbGQgc3RhcnQgdGltZXMnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYWxsIExhbWJkYSBmdW5jdGlvbnMgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gICAqIEVhY2ggZnVuY3Rpb24gaGFuZGxlcyBhIHNwZWNpZmljIGJ1c2luZXNzIGRvbWFpblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlTGFtYmRhRnVuY3Rpb25zKHByb3BzOiBBcGlTdGFja1Byb3BzLCBjb21tb25MYXllcjogbGFtYmRhLkxheWVyVmVyc2lvbik6IHZvaWQge1xyXG4gICAgLy8gQ29tbW9uIGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIGZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY29tbW9uRW52aXJvbm1lbnQgPSB7XHJcbiAgICAgIFRBQkxFX05BTUU6IHByb3BzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcclxuICAgICAgTE9HX0xFVkVMOiAnaW5mbycsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENvbW1vbiBMYW1iZGEgZnVuY3Rpb24gY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgY29tbW9uUHJvcHMgPSB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gQmFsYW5jZWQgZm9yIGNvc3QgYW5kIHBlcmZvcm1hbmNlXHJcbiAgICAgIGxheWVyczogW2NvbW1vbkxheWVyXSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSywgLy8gQ29zdCBvcHRpbWl6YXRpb25cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdXRoZW50aWNhdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSB1c2VyIHJlZ2lzdHJhdGlvbiwgbG9naW4sIGFuZCBwcm9maWxlIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBdXRoSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGgnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2F1dGgnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGF1dGhlbnRpY2F0aW9uIGhhbmRsZXIgZm9yIHVzZXIgcmVnaXN0cmF0aW9uLCBsb2dpbiwgYW5kIHByb2ZpbGUgbWFuYWdlbWVudCcsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLi4uY29tbW9uRW52aXJvbm1lbnQsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIENMSUVOVF9JRDogcHJvcHMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVkZ2V0IE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgYnVkZ2V0IENSVUQgb3BlcmF0aW9ucyBhbmQgY2FsY3VsYXRpb25zXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdCdWRnZXRIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYnVkZ2V0JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9idWRnZXQnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGJ1ZGdldCBoYW5kbGVyIGZvciBDUlVEIG9wZXJhdGlvbnMsIGNhdGVnb3JpZXMsIGFuZCB6ZXJvLWJhc2VkIGNhbGN1bGF0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyYW5zYWN0aW9uIE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgdHJhbnNhY3Rpb24gQ1JVRCBvcGVyYXRpb25zIGFuZCBidWRnZXQgdXBkYXRlc1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUcmFuc2FjdGlvbkhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS10cmFuc2FjdGlvbicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvdHJhbnNhY3Rpb25zJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSB0cmFuc2FjdGlvbiBoYW5kbGVyIGZvciBleHBlbnNlL2luY29tZSB0cmFja2luZyBhbmQgYXV0b21hdGljIGJ1ZGdldCB1cGRhdGVzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQUkgQnVkZ2V0IEdlbmVyYXRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgQUktcG93ZXJlZCBidWRnZXQgZ2VuZXJhdGlvbiB1c2luZyBBV1MgQmVkcm9ja1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5haUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1haScsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvYWknKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IEFJIGhhbmRsZXIgZm9yIHBlcnNvbmFsaXplZCBidWRnZXQgZ2VuZXJhdGlvbiB1c2luZyBBV1MgQmVkcm9jayBDbGF1ZGUgMy41JyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksIC8vIEFJIGNhbGxzIG1heSB0YWtlIGxvbmdlclxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIC4uLmNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEZhbWlseSBBY2NvdW50IE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgZmFtaWx5IGNyZWF0aW9uLCBpbnZpdGF0aW9ucywgYW5kIG1lbWJlciBtYW5hZ2VtZW50XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmZhbWlseUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdGYW1pbHlIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktZmFtaWx5JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9mYW1pbHknKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGZhbWlseSBoYW5kbGVyIGZvciBzaGFyZWQgYWNjb3VudHMsIGludml0YXRpb25zLCBhbmQgbWVtYmVyIG1hbmFnZW1lbnQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQYXltZW50IGFuZCBTdWJzY3JpcHRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgU3RyaXBlIGludGVncmF0aW9uIGFuZCBzdWJzY3JpcHRpb24gbWFuYWdlbWVudFxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5wYXltZW50SGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BheW1lbnRIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktcGF5bWVudCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvcGF5bWVudCcpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgcGF5bWVudCBoYW5kbGVyIGZvciBTdHJpcGUgaW50ZWdyYXRpb24gYW5kIHN1YnNjcmlwdGlvbiBtYW5hZ2VtZW50JyxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25FbnZpcm9ubWVudCxcclxuICAgICAgICBTVFJJUEVfU0VDUkVUX0tFWTogcHJvY2Vzcy5lbnYuU1RSSVBFX1NFQ1JFVF9LRVkgfHwgJycsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEVtYWlsIGFuZCBOb3RpZmljYXRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgU0VTIGVtYWlsIHNlbmRpbmcgYW5kIG5vdGlmaWNhdGlvbiBtYW5hZ2VtZW50XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmVtYWlsSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0VtYWlsSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWVtYWlsJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9lbWFpbCcpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgZW1haWwgaGFuZGxlciBmb3Igbm90aWZpY2F0aW9ucywgdGlwcyBkZWxpdmVyeSwgYW5kIGZhbWlseSBpbnZpdGF0aW9ucyB2aWEgU0VTJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGF0YSBFeHBvcnQgYW5kIEJhY2t1cCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBDU1YvUERGIGV4cG9ydCBhbmQgZGF0YSBiYWNrdXAgZnVuY3Rpb25hbGl0eVxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5leHBvcnRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRXhwb3J0SGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWV4cG9ydCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvZXhwb3J0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBleHBvcnQgaGFuZGxlciBmb3IgQ1NWL1BERiBleHBvcnQgYW5kIGRhdGEgYmFja3VwIGZ1bmN0aW9uYWxpdHknLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSwgLy8gRXhwb3J0IG9wZXJhdGlvbnMgbWF5IHRha2UgbG9uZ2VyIGZvciBsYXJnZSBkYXRhc2V0c1xyXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LCAvLyBNb3JlIG1lbW9yeSBmb3IgcHJvY2Vzc2luZyBsYXJnZSBkYXRhc2V0c1xyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZG1pbiBEYXNoYm9hcmQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgYWRtaW4gb3BlcmF0aW9ucyBhbmQgYW5hbHl0aWNzXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmFkbWluSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FkbWluSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWFkbWluJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9hZG1pbicpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgYWRtaW4gaGFuZGxlciBmb3IgZGFzaGJvYXJkIG9wZXJhdGlvbnMsIHVzZXIgbWFuYWdlbWVudCwgYW5kIGFuYWx5dGljcycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9ucyB0byBhbGwgZnVuY3Rpb25zXHJcbiAgICBPYmplY3QudmFsdWVzKHRoaXMuZnVuY3Rpb25zKS5mb3JFYWNoKGZ1bmMgPT4ge1xyXG4gICAgICBwcm9wcy50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBhZGRpdGlvbmFsIHBlcm1pc3Npb25zIGZvciBzcGVjaWZpYyBmdW5jdGlvbnNcclxuICAgIHRoaXMuZ3JhbnRBZGRpdGlvbmFsUGVybWlzc2lvbnMoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IGFkZGl0aW9uYWwgQVdTIHNlcnZpY2UgcGVybWlzc2lvbnMgdG8gc3BlY2lmaWMgZnVuY3Rpb25zXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBncmFudEFkZGl0aW9uYWxQZXJtaXNzaW9ucygpOiB2b2lkIHtcclxuICAgIC8vIEF1dGggSGFuZGxlciBuZWVkcyBDb2duaXRvIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6U2lnblVwJyxcclxuICAgICAgICAnY29nbml0by1pZHA6SW5pdGlhdGVBdXRoJyxcclxuICAgICAgICAnY29nbml0by1pZHA6Q29uZmlybVNpZ25VcCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkZvcmdvdFBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6Q29uZmlybUZvcmdvdFBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6R2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOlVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5VcGRhdGVVc2VyQXR0cmlidXRlcycsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluU2V0VXNlclBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5EZWxldGVVc2VyJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gQ29nbml0byBwZXJtaXNzaW9ucyBhcmUgdHlwaWNhbGx5IGJyb2FkIGZvciB1c2VyIHBvb2wgb3BlcmF0aW9uc1xyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEFJIEhhbmRsZXIgbmVlZHMgQmVkcm9jayBwZXJtaXNzaW9uc1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJyxcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIEJlZHJvY2sgbW9kZWxzIGRvbid0IGhhdmUgc3BlY2lmaWMgQVJOc1xyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEVtYWlsIEhhbmRsZXIgbmVlZHMgU0VTIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5lbWFpbEhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxyXG4gICAgICAgICdzZXM6U2VuZFJhd0VtYWlsJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gU0VTIHBlcm1pc3Npb25zIGFyZSB0eXBpY2FsbHkgYnJvYWRcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBQYXltZW50IEhhbmRsZXIgbmVlZHMgYWRkaXRpb25hbCBsb2dnaW5nIGZvciB3ZWJob29rIGRlYnVnZ2luZ1xyXG4gICAgdGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXHJcbiAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgIH0pKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBBUEkgR2F0ZXdheSBSRVNUIEFQSSB3aXRoIHByb3BlciBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVBcGlHYXRld2F5KHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sKTogYXBpZ2F0ZXdheS5SZXN0QXBpIHtcclxuICAgIC8vIENyZWF0ZSBDb2duaXRvIGF1dGhvcml6ZXIgZm9yIHByb3RlY3RlZCBlbmRwb2ludHNcclxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSBuZXcgYXBpZ2F0ZXdheS5Db2duaXRvVXNlclBvb2xzQXV0aG9yaXplcih0aGlzLCAnQnVkZ2V0QnVkZHlBdXRob3JpemVyJywge1xyXG4gICAgICBjb2duaXRvVXNlclBvb2xzOiBbdXNlclBvb2xdLFxyXG4gICAgICBhdXRob3JpemVyTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGhvcml6ZXInLFxyXG4gICAgICBpZGVudGl0eVNvdXJjZTogJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgUkVTVCBBUElcclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0J1ZGdldEJ1ZGR5QXBpJywge1xyXG4gICAgICByZXN0QXBpTmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgUkVTVCBBUEkgZm9yIHdlYiBhbmQgbW9iaWxlIGNsaWVudHMgd2l0aCBzZXJ2ZXJsZXNzIExhbWJkYSBiYWNrZW5kJyxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSBDT1JTIGZvciB3ZWIgY2xpZW50c1xyXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcclxuICAgICAgICBhbGxvd09yaWdpbnM6IFtcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLCAvLyBMb2NhbCBkZXZlbG9wbWVudFxyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycsIC8vIFZpdGUgZGV2IHNlcnZlclxyXG4gICAgICAgICAgJ2h0dHBzOi8vZDF1ZWV1Z245emN4N24uY2xvdWRmcm9udC5uZXQnLCAvLyBDbG91ZEZyb250IHdlYiBhcHBcclxuICAgICAgICAgICdodHRwczovL2QydWJoeDJhMTNzN2djLmNsb3VkZnJvbnQubmV0JywgLy8gQ2xvdWRGcm9udCBhZG1pbiBkYXNoYm9hcmRcclxuICAgICAgICAgICdodHRwczovL2FwcC5idWRnZXRidWRkeS5jb20nLCAvLyBQcm9kdWN0aW9uIHdlYiBhcHAgKGN1c3RvbSBkb21haW4pXHJcbiAgICAgICAgICAnaHR0cHM6Ly9hZG1pbi5idWRnZXRidWRkeS5jb20nLCAvLyBBZG1pbiBkYXNoYm9hcmQgKGN1c3RvbSBkb21haW4pXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFsnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURScsICdPUFRJT05TJ10sXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICdYLUFtei1EYXRlJyxcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcclxuICAgICAgICAgICdYLUFwaS1LZXknLFxyXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBUEkgR2F0ZXdheSBjb25maWd1cmF0aW9uXHJcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcclxuICAgICAgICBzdGFnZU5hbWU6ICd2MScsXHJcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxyXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBCaW5hcnkgbWVkaWEgdHlwZXMgZm9yIGZpbGUgdXBsb2FkcyAoZnV0dXJlIGZlYXR1cmUpXHJcbiAgICAgIGJpbmFyeU1lZGlhVHlwZXM6IFsnbXVsdGlwYXJ0L2Zvcm0tZGF0YSddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgYXV0aG9yaXplciBmb3IgdXNlIGluIHJvdXRlIHNldHVwXHJcbiAgICAoYXBpIGFzIGFueSkuYXV0aG9yaXplciA9IGF1dGhvcml6ZXI7XHJcblxyXG4gICAgcmV0dXJuIGFwaTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCB1cCBhbGwgQVBJIHJvdXRlcyBhbmQgTGFtYmRhIGludGVncmF0aW9uc1xyXG4gICAqIE9yZ2FuaXplcyBlbmRwb2ludHMgYnkgYnVzaW5lc3MgZG9tYWluXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzZXR1cEFwaVJvdXRlcygpOiB2b2lkIHtcclxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSAodGhpcy5hcGkgYXMgYW55KS5hdXRob3JpemVyO1xyXG5cclxuICAgIC8vIEhlYWx0aCBjaGVjayBlbmRwb2ludHMgKHB1YmxpYywgbm8gYXV0aCByZXF1aXJlZClcclxuICAgIGNvbnN0IGhlYWx0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBoZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gcm91dGVzIChwdWJsaWMpXHJcbiAgICBjb25zdCBhdXRoUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhdXRoJyk7XHJcblxyXG4gICAgLy8gVXNlciByZWdpc3RyYXRpb25cclxuICAgIGNvbnN0IHJlZ2lzdGVyUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJyk7XHJcbiAgICByZWdpc3RlclJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUmVnaXN0ZXJVc2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgbG9naW5cclxuICAgIGNvbnN0IGxvZ2luUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ2luJyk7XHJcbiAgICBsb2dpblJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnTG9naW5Vc2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVtYWlsIGNvbmZpcm1hdGlvblxyXG4gICAgY29uc3QgY29uZmlybVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdjb25maXJtJyk7XHJcbiAgICBjb25maXJtUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDb25maXJtRW1haWwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRm9yZ290IHBhc3N3b3JkXHJcbiAgICBjb25zdCBmb3Jnb3RQYXNzd29yZFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdmb3Jnb3QtcGFzc3dvcmQnKTtcclxuICAgIGZvcmdvdFBhc3N3b3JkUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdGb3Jnb3RQYXNzd29yZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZXNldCBwYXNzd29yZFxyXG4gICAgY29uc3QgcmVzZXRQYXNzd29yZFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdyZXNldC1wYXNzd29yZCcpO1xyXG4gICAgcmVzZXRQYXNzd29yZFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUmVzZXRQYXNzd29yZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVc2VyIHByb2ZpbGUgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHByb2ZpbGVSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncHJvZmlsZScpO1xyXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRQcm9maWxlJyxcclxuICAgIH0pO1xyXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVQcm9maWxlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGggaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBhdXRoSGVhbHRoUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgYXV0aEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdBdXRoSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2VvbG9jYXRpb24gZW5kcG9pbnQgKHB1YmxpYylcclxuICAgIGNvbnN0IGdlb2xvY2F0aW9uUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2dlb2xvY2F0aW9uJyk7XHJcbiAgICBnZW9sb2NhdGlvblJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRHZW9sb2NhdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPbmJvYXJkaW5nIGVuZHBvaW50IChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBvbmJvYXJkaW5nUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ29uYm9hcmRpbmcnKTtcclxuICAgIG9uYm9hcmRpbmdSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NvbXBsZXRlT25ib2FyZGluZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHb29nbGUgU2lnbi1JbiBlbmRwb2ludCAocHVibGljKVxyXG4gICAgY29uc3QgZ29vZ2xlUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2dvb2dsZScpO1xyXG4gICAgZ29vZ2xlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHb29nbGVTaWduSW4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVXNlciBwcm9maWxlIHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgdXNlcnNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXJzJyk7XHJcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRVc2VyUHJvZmlsZScsXHJcbiAgICB9KTtcclxuICAgIHVzZXJzUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZVVzZXJQcm9maWxlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1ZGdldCByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IGJ1ZGdldFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYnVkZ2V0Jyk7XHJcbiAgICBidWRnZXRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRCdWRnZXRzJyxcclxuICAgIH0pO1xyXG4gICAgYnVkZ2V0UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuICAgIGJ1ZGdldFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgY3VycmVudCBtb250aCBlbmRwb2ludFxyXG4gICAgY29uc3QgYnVkZ2V0Q3VycmVudFJlc291cmNlID0gYnVkZ2V0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2N1cnJlbnQnKTtcclxuICAgIGJ1ZGdldEN1cnJlbnRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRDdXJyZW50QnVkZ2V0JyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1ZGdldCBieSBJRCBlbmRwb2ludFxyXG4gICAgY29uc3QgYnVkZ2V0SWRSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCd7YnVkZ2V0SWR9Jyk7XHJcbiAgICBidWRnZXRJZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEJ1ZGdldEJ5SWQnLFxyXG4gICAgfSk7XHJcbiAgICBidWRnZXRJZFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZUJ1ZGdldEJ5SWQnLFxyXG4gICAgfSk7XHJcbiAgICBidWRnZXRJZFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0RlbGV0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBidWRnZXRIZWFsdGhSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGJ1ZGdldEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0J1ZGdldEhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1ZGdldCBjYXRlZ29yaWVzIHJvdXRlc1xyXG4gICAgY29uc3QgY2F0ZWdvcmllc1Jlc291cmNlID0gYnVkZ2V0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2NhdGVnb3JpZXMnKTtcclxuICAgIGNhdGVnb3JpZXNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRDYXRlZ29yaWVzJyxcclxuICAgIH0pO1xyXG4gICAgY2F0ZWdvcmllc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVDYXRlZ29yeScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSBidWRnZXQgZ2VuZXJhdGlvbiByb3V0ZXNcclxuICAgIGNvbnN0IGFpUmVzb3VyY2UgPSBidWRnZXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnYWktZ2VuZXJhdGUnKTtcclxuICAgIGFpUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2VuZXJhdGVBSUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcmFuc2FjdGlvbiByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgndHJhbnNhY3Rpb25zJyk7XHJcbiAgICB0cmFuc2FjdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldFRyYW5zYWN0aW9ucycsXHJcbiAgICB9KTtcclxuICAgIHRyYW5zYWN0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluZGl2aWR1YWwgdHJhbnNhY3Rpb24gcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCB0cmFuc2FjdGlvblJlc291cmNlID0gdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3t0cmFuc2FjdGlvbklkfScpO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldFRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0RlbGV0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRyYW5zYWN0aW9ucyBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uc0hlYWx0aFJlc291cmNlID0gdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgdHJhbnNhY3Rpb25zSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdUcmFuc2FjdGlvbnNIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGYW1pbHkgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBmYW1pbHlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2ZhbWlseScpO1xyXG4gICAgZmFtaWx5UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5mYW1pbHlIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0RmFtaWx5JyxcclxuICAgIH0pO1xyXG4gICAgZmFtaWx5UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZmFtaWx5SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUZhbWlseScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEYXRhIEV4cG9ydCByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IGV4cG9ydFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnZXhwb3J0Jyk7XHJcbiAgICBleHBvcnRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmV4cG9ydEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdFeHBvcnREYXRhJyxcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1UeXBlJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1EaXNwb3NpdGlvbic6IHRydWUsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmFtaWx5IGhlYWx0aCBlbmRwb2ludFxyXG4gICAgY29uc3QgZmFtaWx5SGVhbHRoUmVzb3VyY2UgPSBmYW1pbHlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBmYW1pbHlIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmZhbWlseUhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdGYW1pbHlIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXltZW50IHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgcGF5bWVudHNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BheW1lbnRzJyk7XHJcbiAgICBwYXltZW50c1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQ3JlYXRlU3Vic2NyaXB0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBheW1lbnQgaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBwYXltZW50SGVhbHRoUmVzb3VyY2UgPSBwYXltZW50c1Jlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIHBheW1lbnRIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUGF5bWVudEhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFdlYmhvb2sgcm91dGVzIChwdWJsaWMsIGJ1dCB2YWxpZGF0ZWQgYnkgU3RyaXBlKVxyXG4gICAgY29uc3Qgd2ViaG9va3NSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3dlYmhvb2tzJyk7XHJcbiAgICBjb25zdCBzdHJpcGVXZWJob29rID0gd2ViaG9va3NSZXNvdXJjZS5hZGRSZXNvdXJjZSgnc3RyaXBlJyk7XHJcbiAgICBzdHJpcGVXZWJob29rLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnU3RyaXBlV2ViaG9vaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZG1pbiByb3V0ZXMgKHByb3RlY3RlZCB3aXRoIGFkZGl0aW9uYWwgcm9sZSBjaGVja2luZylcclxuICAgIGNvbnN0IGFkbWluUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhZG1pbicpO1xyXG4gICAgYWRtaW5SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFkbWluSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEFkbWluRGFzaGJvYXJkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkbWluIGhlYWx0aCBlbmRwb2ludFxyXG4gICAgY29uc3QgYWRtaW5IZWFsdGhSZXNvdXJjZSA9IGFkbWluUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgYWRtaW5IZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFkbWluSGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0FkbWluSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRW1haWwgcm91dGVzIChwdWJsaWMgZm9yIHdlYmhvb2tzLCBwcm90ZWN0ZWQgZm9yIHNlbmRpbmcpXHJcbiAgICBjb25zdCBlbWFpbFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnZW1haWwnKTtcclxuICAgIGNvbnN0IGVtYWlsSGVhbHRoUmVzb3VyY2UgPSBlbWFpbFJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGVtYWlsSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5lbWFpbEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdFbWFpbEhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFJIHJvdXRlcyAoc2VwYXJhdGUgZnJvbSBidWRnZXQgZm9yIGhlYWx0aCBjaGVja3MpXHJcbiAgICBjb25zdCBhaVJvb3RSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FpJyk7XHJcbiAgICBjb25zdCBhaUhlYWx0aFJlc291cmNlID0gYWlSb290UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgYWlIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFpSGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0FJSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgQ2xvdWRGb3JtYXRpb24gb3V0cHV0cyBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZU91dHB1dHMoKTogdm9pZCB7XHJcbiAgICAvLyBBUEkgR2F0ZXdheSBVUkwgZm9yIGNsaWVudCBjb25maWd1cmF0aW9uXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hcGkudXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCBmb3IgQnVkZ2V0QnVkZHkgY2xpZW50IGFwcGxpY2F0aW9ucyAod2ViLCBtb2JpbGUsIGFkbWluKScsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hcGktdXJsJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBHYXRld2F5IElEIGZvciBtb25pdG9yaW5nXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5yZXN0QXBpSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgSUQgZm9yIEJ1ZGdldEJ1ZGR5IG1vbml0b3JpbmcgYW5kIENsb3VkV2F0Y2ggaW50ZWdyYXRpb24nLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktYXBpLWlkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBBUk5zIGZvciBtb25pdG9yaW5nXHJcbiAgICBPYmplY3QuZW50cmllcyh0aGlzLmZ1bmN0aW9ucykuZm9yRWFjaCgoW25hbWUsIGZ1bmNdKSA9PiB7XHJcbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIGAke25hbWV9QXJuYCwge1xyXG4gICAgICAgIHZhbHVlOiBmdW5jLmZ1bmN0aW9uQXJuLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQnVkZ2V0QnVkZHkgTGFtYmRhIGZ1bmN0aW9uIEFSTiBmb3IgJHtuYW1lfSBoYW5kbGVyIG1vbml0b3JpbmcgYW5kIHBlcm1pc3Npb25zYCxcclxuICAgICAgICBleHBvcnROYW1lOiBgYnVkZ2V0YnVkZHktJHtuYW1lLnRvTG93ZXJDYXNlKCl9LWFybmAsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgdGFncyB0byBlYWNoIExhbWJkYSBmdW5jdGlvblxyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ0NvbXBvbmVudCcsICdBUEknKTtcclxuICAgICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdTZXJ2aWNlJywgJ0xhbWJkYScpO1xyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ0hhbmRsZXInLCBuYW1lKTtcclxuICAgICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdSdW50aW1lJywgJ05vZGVKUy0yMCcpO1xyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ0Nvc3RDZW50ZXInLCAnQnVkZ2V0QnVkZHktQ29tcHV0ZScpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==