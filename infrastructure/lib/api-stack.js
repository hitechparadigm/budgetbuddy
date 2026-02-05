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
        // Store notification function for use in route setup
        this.notificationFunction = props.notificationFunction;
        // Create shared Lambda layers for common dependencies
        this.commonLayer = this.createCommonLayer();
        this.sharedLayer = this.createSharedLayer();
        // Create Lambda functions for different business domains
        this.createLambdaFunctions(props, this.commonLayer, this.sharedLayer);
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
     * Create a Lambda layer with shared utilities (CORS, validation, etc.)
     * Provides reusable code across all Lambda functions
     */
    createSharedLayer() {
        return new lambda.LayerVersion(this, 'SharedLayer', {
            layerVersionName: 'budgetbuddy-shared',
            code: lambda.Code.fromAsset('../backend/layers/shared'),
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            description: 'Shared utilities (CORS, validation, token parsing) for BudgetBuddy Lambda functions',
        });
    }
    /**
     * Create all Lambda functions for the application
     * Each function handles a specific business domain
     */
    createLambdaFunctions(props, commonLayer, sharedLayer) {
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
            layers: [commonLayer, sharedLayer],
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
         * Data Restore Functions
         * Handle data restoration from JSON backups
         */
        this.functions.restoreHandler = new lambda.Function(this, 'RestoreHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-restore',
            code: lambda.Code.fromAsset('../backend/functions/restore'),
            handler: 'index.handler',
            description: 'BudgetBuddy restore handler for data restoration from JSON backups',
            timeout: cdk.Duration.minutes(2), // Restore operations may take longer for large datasets
            memorySize: 1024, // More memory for processing large datasets
        });
        // Note: Admin Lambda moved to ApiFeaturesStack
        /**
         * Bill Reminders Functions
         * Handle bill CRUD, payment tracking, and recurring bills
         */
        this.functions.billsHandler = new lambda.Function(this, 'BillsHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-bills',
            code: lambda.Code.fromAsset('../backend/functions/bills'),
            handler: 'index.handler',
            description: 'BudgetBuddy bills handler for bill reminders, due date tracking, and recurring bill management',
        });
        /**
         * Savings Goals Functions
         * Handle goal CRUD, progress tracking, and milestone celebrations
         */
        this.functions.goalsHandler = new lambda.Function(this, 'GoalsHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-goals',
            code: lambda.Code.fromAsset('../backend/functions/goals'),
            handler: 'index.handler',
            description: 'BudgetBuddy goals handler for savings goals, progress tracking, and milestone celebrations',
        });
        /**
         * Account Management Functions
         * Handle account CRUD, balance tracking, and reconciliation
         */
        this.functions.accountsHandler = new lambda.Function(this, 'AccountsHandler', {
            ...commonProps,
            functionName: 'budgetbuddy-accounts',
            code: lambda.Code.fromAsset('../backend/functions/accounts'),
            handler: 'index.handler',
            description: 'BudgetBuddy accounts handler for manual/connected account management, balance tracking, and reconciliation',
        });
        // Note: Subscriptions, Debt Payoff, Insights, and Receipt Lambdas moved to ApiFeaturesStack
        // Note: Plaid and Reconciliation Lambdas moved to ApiFeaturesStack
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
                // Force deployment when Lambda integrations change
                description: `Deployment ${new Date().toISOString()}`,
            },
            // Binary media types for file uploads (future feature)
            binaryMediaTypes: ['multipart/form-data'],
        });
        // Store authorizer for use in route setup
        api.authorizer = authorizer;
        // Add Gateway Responses for CORS on error responses
        this.addGatewayResponses(api);
        return api;
    }
    /**
     * Add Gateway Responses to handle CORS for error responses
     * This ensures CORS headers are present on 401, 403, 4XX, and 5XX responses
     */
    addGatewayResponses(api) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': "'*'",
            'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            'Access-Control-Allow-Credentials': "'true'",
        };
        // 401 Unauthorized (Cognito authorizer failures)
        api.addGatewayResponse('Unauthorized', {
            type: apigateway.ResponseType.UNAUTHORIZED,
            statusCode: '401',
            responseHeaders: corsHeaders,
        });
        // 403 Forbidden (IAM/resource policy denials)
        api.addGatewayResponse('AccessDenied', {
            type: apigateway.ResponseType.ACCESS_DENIED,
            statusCode: '403',
            responseHeaders: corsHeaders,
        });
        // 4XX Client Errors
        api.addGatewayResponse('Default4XX', {
            type: apigateway.ResponseType.DEFAULT_4XX,
            responseHeaders: corsHeaders,
        });
        // 5XX Server Errors
        api.addGatewayResponse('Default5XX', {
            type: apigateway.ResponseType.DEFAULT_5XX,
            responseHeaders: corsHeaders,
        });
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
        // Log which handler is being used for debugging
        if (this.authOnboardingFunction) {
            console.log('✅ Using standalone auth-onboarding Lambda for /auth/onboarding endpoint');
        }
        else {
            console.log('⚠️  Using monolithic auth Lambda for /auth/onboarding endpoint (fallback)');
        }
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
        // Budget category rollover routes (Requirement 40.7)
        const categoryIdResource = categoriesResource.addResource('{categoryId}');
        const rolloverResource = categoryIdResource.addResource('rollover');
        rolloverResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'UpdateCategoryRollover',
        });
        // Reset rollover endpoint
        const rolloverResetResource = rolloverResource.addResource('reset');
        rolloverResetResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'ResetCategoryRollover',
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
        // Data Restore routes (protected)
        const restoreResource = this.api.root.addResource('restore');
        restoreResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.restoreHandler), {
            authorizer,
            operationName: 'RestoreData',
            methodResponses: [
                {
                    statusCode: '200',
                }
            ],
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
        // Note: Admin routes moved to ApiFeaturesStack
        // Bills routes (protected)
        const billsResource = this.api.root.addResource('bills');
        billsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.billsHandler), {
            authorizer,
            operationName: 'GetBills',
        });
        billsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.billsHandler), {
            authorizer,
            operationName: 'CreateBill',
        });
        // Bills upcoming endpoint
        const billsUpcomingResource = billsResource.addResource('upcoming');
        billsUpcomingResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.billsHandler), {
            authorizer,
            operationName: 'GetUpcomingBills',
        });
        // Bills calendar endpoint
        const billsCalendarResource = billsResource.addResource('calendar');
        billsCalendarResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.billsHandler), {
            authorizer,
            operationName: 'GetBillsCalendar',
        });
        // Bills health endpoint
        const billsHealthResource = billsResource.addResource('health');
        billsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.billsHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'BillsHealthCheck',
        });
        // Individual bill routes
        const billIdResource = billsResource.addResource('{billId}');
        billIdResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.billsHandler), {
            authorizer,
            operationName: 'UpdateBill',
        });
        billIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.billsHandler), {
            authorizer,
            operationName: 'DeleteBill',
        });
        // Bill pay endpoint
        const billPayResource = billIdResource.addResource('pay');
        billPayResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.billsHandler), {
            authorizer,
            operationName: 'MarkBillPaid',
        });
        // Goals routes (protected)
        const goalsResource = this.api.root.addResource('goals');
        goalsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            authorizer,
            operationName: 'GetGoals',
        });
        goalsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            authorizer,
            operationName: 'CreateGoal',
        });
        // Goals templates endpoint
        const goalsTemplatesResource = goalsResource.addResource('templates');
        goalsTemplatesResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            authorizer,
            operationName: 'GetGoalTemplates',
        });
        // Goals reorder endpoint
        const goalsReorderResource = goalsResource.addResource('reorder');
        goalsReorderResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            authorizer,
            operationName: 'ReorderGoals',
        });
        // Goals health endpoint
        const goalsHealthResource = goalsResource.addResource('health');
        goalsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'GoalsHealthCheck',
        });
        // Individual goal routes
        const goalIdResource = goalsResource.addResource('{goalId}');
        goalIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            authorizer,
            operationName: 'GetGoal',
        });
        goalIdResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            authorizer,
            operationName: 'UpdateGoal',
        });
        goalIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            authorizer,
            operationName: 'DeleteGoal',
        });
        // Goal contribute endpoint
        const goalContributeResource = goalIdResource.addResource('contribute');
        goalContributeResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.goalsHandler), {
            authorizer,
            operationName: 'ContributeToGoal',
        });
        // Accounts routes (protected)
        const accountsResource = this.api.root.addResource('accounts');
        accountsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            authorizer,
            operationName: 'GetAccounts',
        });
        accountsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            authorizer,
            operationName: 'CreateAccount',
        });
        // Accounts summary endpoint
        const accountsSummaryResource = accountsResource.addResource('summary');
        accountsSummaryResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            authorizer,
            operationName: 'GetAccountsSummary',
        });
        // Accounts health endpoint
        const accountsHealthResource = accountsResource.addResource('health');
        accountsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            methodResponses: [{ statusCode: '200' }],
            operationName: 'AccountsHealthCheck',
        });
        // Individual account routes
        const accountIdResource = accountsResource.addResource('{accountId}');
        accountIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            authorizer,
            operationName: 'GetAccount',
        });
        accountIdResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            authorizer,
            operationName: 'UpdateAccount',
        });
        accountIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            authorizer,
            operationName: 'DeleteAccount',
        });
        // Account reconcile endpoint
        const accountReconcileResource = accountIdResource.addResource('reconcile');
        accountReconcileResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            authorizer,
            operationName: 'ReconcileAccount',
        });
        // Account tracking endpoint
        const accountTrackingResource = accountIdResource.addResource('tracking');
        accountTrackingResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.accountsHandler), {
            authorizer,
            operationName: 'SetAccountTracking',
        });
        // Note: Subscriptions routes moved to ApiFeaturesStack
        // Note: Debts routes moved to ApiFeaturesStack
        // Note: Insights routes moved to ApiFeaturesStack
        // Note: Receipt routes moved to ApiFeaturesStack
        // Note: Plaid and Reconciliation routes moved to ApiFeaturesStack
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
        // Notification routes (protected) - only add if notification function is available
        if (this.notificationFunction) {
            const notificationsResource = this.api.root.addResource('notifications');
            // Device registration route (protected)
            const registerDeviceResource = notificationsResource.addResource('register-device');
            registerDeviceResource.addMethod('POST', new apigateway.LambdaIntegration(this.notificationFunction), {
                authorizer,
                operationName: 'RegisterDevice',
            });
            // Device management routes (protected)
            const deviceResource = notificationsResource.addResource('device');
            const deviceIdResource = deviceResource.addResource('{deviceId}');
            deviceIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.notificationFunction), {
                authorizer,
                operationName: 'RemoveDevice',
            });
            // Notification preferences routes (protected)
            const preferencesResource = notificationsResource.addResource('preferences');
            preferencesResource.addMethod('GET', new apigateway.LambdaIntegration(this.notificationFunction), {
                authorizer,
                operationName: 'GetNotificationPreferences',
            });
            preferencesResource.addMethod('PUT', new apigateway.LambdaIntegration(this.notificationFunction), {
                authorizer,
                operationName: 'UpdateNotificationPreferences',
            });
            // Notification history routes (protected)
            const historyResource = notificationsResource.addResource('history');
            historyResource.addMethod('GET', new apigateway.LambdaIntegration(this.notificationFunction), {
                authorizer,
                operationName: 'GetNotificationHistory',
            });
            // Mark notification as read route (protected)
            const notificationIdResource = notificationsResource.addResource('{notificationId}');
            const readResource = notificationIdResource.addResource('read');
            readResource.addMethod('PUT', new apigateway.LambdaIntegration(this.notificationFunction), {
                authorizer,
                operationName: 'MarkNotificationAsRead',
            });
            // Notification health endpoint
            const notificationHealthResource = notificationsResource.addResource('health');
            notificationHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.notificationFunction), {
                methodResponses: [{ statusCode: '200' }],
                operationName: 'NotificationHealthCheck',
            });
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7R0FjRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCwrREFBaUQ7QUFLakQseURBQTJDO0FBQzNDLDJEQUE2QztBQWU3QyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQWdDckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQTFCMUI7OztXQUdHO1FBQ2EsY0FBUyxHQUF1QyxFQUFFLENBQUM7UUF3QmpFLHdEQUF3RDtRQUN4RCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDO1FBRTNELHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUFDO1FBRXZELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFNUMseURBQXlEO1FBQ3pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdEUsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVqRCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXRCLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsYUFBYSxFQUFF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RTtZQUN0RCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxLQUFLLEVBQUU7Z0JBQ3BDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVztnQkFDdkIsV0FBVyxFQUFFLHVDQUF1QyxJQUFJLHFDQUFxQztnQkFDN0YsVUFBVSxFQUFFLGVBQWUsSUFBSSxDQUFDLFdBQVcsRUFBRSxNQUFNO2FBQ3BELENBQUMsQ0FBQztZQUVILGlEQUFpRDtZQUNqRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0MsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzlDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUM3RCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXA4QkQsNEJBbzhCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBUEkgU3RhY2sgZm9yIEJ1ZGdldEJ1ZGR5IEFwcGxpY2F0aW9uXHJcbiAqXHJcbiAqIENyZWF0ZXMgQVBJIEdhdGV3YXkgUkVTVCBBUEkgd2l0aCBMYW1iZGEgZnVuY3Rpb24gaW50ZWdyYXRpb25zIGZvciBhbGxcclxuICogYmFja2VuZCBmdW5jdGlvbmFsaXR5LiBJbmNsdWRlcyBwcm9wZXIgQ09SUyBjb25maWd1cmF0aW9uLCBhdXRoZW50aWNhdGlvbixcclxuICogYW5kIGVycm9yIGhhbmRsaW5nIGZvciB3ZWIgYW5kIG1vYmlsZSBjbGllbnRzLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gUkVTVCBBUEkgd2l0aCByZXNvdXJjZS1iYXNlZCByb3V0aW5nXHJcbiAqIC0gTGFtYmRhIGZ1bmN0aW9uIGludGVncmF0aW9ucyBmb3IgYnVzaW5lc3MgbG9naWNcclxuICogLSBDb2duaXRvIGF1dGhvcml6ZXIgZm9yIHByb3RlY3RlZCBlbmRwb2ludHNcclxuICogLSBDT1JTIGNvbmZpZ3VyYXRpb24gZm9yIHdlYiBjbGllbnRzXHJcbiAqIC0gUmVxdWVzdC9yZXNwb25zZSB2YWxpZGF0aW9uXHJcbiAqIC0gQ2xvdWRXYXRjaCBsb2dnaW5nIGFuZCBtb25pdG9yaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuXHJcbmRlY2xhcmUgY29uc3QgcHJvY2VzczogYW55O1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG4vKipcclxuICogUHJvcHMgZm9yIHRoZSBBUEkgU3RhY2tcclxuICogUmVxdWlyZXMgcmVzb3VyY2VzIGZyb20gb3RoZXIgc3RhY2tzIChkYXRhYmFzZSBhbmQgYXV0aClcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XHJcbiAgYXV0aE9uYm9hcmRpbmdGdW5jdGlvbj86IGxhbWJkYS5GdW5jdGlvbjsgLy8gT3B0aW9uYWwgLSBmb3IgZ3JhZHVhbCByZWZhY3RvcmluZ1xyXG4gIG5vdGlmaWNhdGlvbkZ1bmN0aW9uPzogbGFtYmRhLkZ1bmN0aW9uOyAvLyBPcHRpb25hbCAtIGZvciBwdXNoIG5vdGlmaWNhdGlvbnNcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFwaVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAvKipcclxuICAgKiBBUEkgR2F0ZXdheSBSRVNUIEFQSVxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciBtb25pdG9yaW5nIHN0YWNrXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG5cclxuICAvKipcclxuICAgKiBMYW1iZGEgZnVuY3Rpb25zIGZvciBkaWZmZXJlbnQgYnVzaW5lc3MgZG9tYWluc1xyXG4gICAqIEV4cG9zZWQgZm9yIG1vbml0b3JpbmcgYW5kIGFkZGl0aW9uYWwgaW50ZWdyYXRpb25zXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGZ1bmN0aW9uczogeyBba2V5OiBzdHJpbmddOiBsYW1iZGEuRnVuY3Rpb24gfSA9IHt9O1xyXG5cclxuICAvKipcclxuICAgKiBMYW1iZGEgbGF5ZXJzIGZvciBzaGFyZWQgY29kZVxyXG4gICAqIEV4cG9zZWQgZm9yIHVzZSBpbiBvdGhlciBzdGFja3MgKGUuZy4sIG5vdGlmaWNhdGlvbiBzdGFjaylcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgY29tbW9uTGF5ZXI6IGxhbWJkYS5MYXllclZlcnNpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHNoYXJlZExheWVyOiBsYW1iZGEuTGF5ZXJWZXJzaW9uO1xyXG5cclxuICAvKipcclxuICAgKiBBdXRoIE9uYm9hcmRpbmcgTGFtYmRhIEZ1bmN0aW9uIChvcHRpb25hbClcclxuICAgKiBQYXJ0IG9mIGFyY2hpdGVjdHVyYWwgcmVmYWN0b3JpbmcgLSBzdGFuZGFsb25lIGZ1bmN0aW9uIGZvciBvbmJvYXJkaW5nXHJcbiAgICovXHJcbiAgcHJpdmF0ZSByZWFkb25seSBhdXRoT25ib2FyZGluZ0Z1bmN0aW9uPzogbGFtYmRhLkZ1bmN0aW9uO1xyXG5cclxuICAvKipcclxuICAgKiBOb3RpZmljYXRpb24gU2VydmljZSBMYW1iZGEgRnVuY3Rpb24gKG9wdGlvbmFsKVxyXG4gICAqIEhhbmRsZXMgcHVzaCBub3RpZmljYXRpb25zLCBkZXZpY2UgbWFuYWdlbWVudCwgYW5kIHByZWZlcmVuY2VzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSByZWFkb25seSBub3RpZmljYXRpb25GdW5jdGlvbj86IGxhbWJkYS5GdW5jdGlvbjtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIFN0b3JlIGF1dGggb25ib2FyZGluZyBmdW5jdGlvbiBmb3IgdXNlIGluIHJvdXRlIHNldHVwXHJcbiAgICB0aGlzLmF1dGhPbmJvYXJkaW5nRnVuY3Rpb24gPSBwcm9wcy5hdXRoT25ib2FyZGluZ0Z1bmN0aW9uO1xyXG5cclxuICAgIC8vIFN0b3JlIG5vdGlmaWNhdGlvbiBmdW5jdGlvbiBmb3IgdXNlIGluIHJvdXRlIHNldHVwXHJcbiAgICB0aGlzLm5vdGlmaWNhdGlvbkZ1bmN0aW9uID0gcHJvcHMubm90aWZpY2F0aW9uRnVuY3Rpb247XHJcblxyXG4gICAgLy8gQ3JlYXRlIHNoYXJlZCBMYW1iZGEgbGF5ZXJzIGZvciBjb21tb24gZGVwZW5kZW5jaWVzXHJcbiAgICB0aGlzLmNvbW1vbkxheWVyID0gdGhpcy5jcmVhdGVDb21tb25MYXllcigpO1xyXG4gICAgdGhpcy5zaGFyZWRMYXllciA9IHRoaXMuY3JlYXRlU2hhcmVkTGF5ZXIoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZGlmZmVyZW50IGJ1c2luZXNzIGRvbWFpbnNcclxuICAgIHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb25zKHByb3BzLCB0aGlzLmNvbW1vbkxheWVyLCB0aGlzLnNoYXJlZExheWVyKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXkgd2l0aCBwcm9wZXIgY29uZmlndXJhdGlvblxyXG4gICAgdGhpcy5hcGkgPSB0aGlzLmNyZWF0ZUFwaUdhdGV3YXkocHJvcHMudXNlclBvb2wpO1xyXG5cclxuICAgIC8vIFNldCB1cCBBUEkgcm91dGVzIGFuZCBpbnRlZ3JhdGlvbnNcclxuICAgIHRoaXMuc2V0dXBBcGlSb3V0ZXMoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgb3V0cHV0cyBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIHRoaXMuY3JlYXRlT3V0cHV0cygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgTGFtYmRhIGxheWVyIHdpdGggY29tbW9uIGRlcGVuZGVuY2llc1xyXG4gICAqIFJlZHVjZXMgZGVwbG95bWVudCBwYWNrYWdlIHNpemVzIGFuZCBpbXByb3ZlcyBjb2xkIHN0YXJ0IHRpbWVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVDb21tb25MYXllcigpOiBsYW1iZGEuTGF5ZXJWZXJzaW9uIHtcclxuICAgIHJldHVybiBuZXcgbGFtYmRhLkxheWVyVmVyc2lvbih0aGlzLCAnQ29tbW9uTGF5ZXInLCB7XHJcbiAgICAgIGxheWVyVmVyc2lvbk5hbWU6ICdidWRnZXRidWRkeS1jb21tb24nLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvbGF5ZXJzL2NvbW1vbicpLFxyXG4gICAgICBjb21wYXRpYmxlUnVudGltZXM6IFtsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWF0sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29tbW9uIGRlcGVuZGVuY2llcyBhbmQgdXRpbGl0aWVzIGZvciBCdWRnZXRCdWRkeSBMYW1iZGEgZnVuY3Rpb25zIHRvIHJlZHVjZSBjb2xkIHN0YXJ0IHRpbWVzJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgTGFtYmRhIGxheWVyIHdpdGggc2hhcmVkIHV0aWxpdGllcyAoQ09SUywgdmFsaWRhdGlvbiwgZXRjLilcclxuICAgKiBQcm92aWRlcyByZXVzYWJsZSBjb2RlIGFjcm9zcyBhbGwgTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlU2hhcmVkTGF5ZXIoKTogbGFtYmRhLkxheWVyVmVyc2lvbiB7XHJcbiAgICByZXR1cm4gbmV3IGxhbWJkYS5MYXllclZlcnNpb24odGhpcywgJ1NoYXJlZExheWVyJywge1xyXG4gICAgICBsYXllclZlcnNpb25OYW1lOiAnYnVkZ2V0YnVkZHktc2hhcmVkJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2xheWVycy9zaGFyZWQnKSxcclxuICAgICAgY29tcGF0aWJsZVJ1bnRpbWVzOiBbbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1hdLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NoYXJlZCB1dGlsaXRpZXMgKENPUlMsIHZhbGlkYXRpb24sIHRva2VuIHBhcnNpbmcpIGZvciBCdWRnZXRCdWRkeSBMYW1iZGEgZnVuY3Rpb25zJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGFsbCBMYW1iZGEgZnVuY3Rpb25zIGZvciB0aGUgYXBwbGljYXRpb25cclxuICAgKiBFYWNoIGZ1bmN0aW9uIGhhbmRsZXMgYSBzcGVjaWZpYyBidXNpbmVzcyBkb21haW5cclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUxhbWJkYUZ1bmN0aW9ucyhwcm9wczogQXBpU3RhY2tQcm9wcywgY29tbW9uTGF5ZXI6IGxhbWJkYS5MYXllclZlcnNpb24sIHNoYXJlZExheWVyOiBsYW1iZGEuTGF5ZXJWZXJzaW9uKTogdm9pZCB7XHJcbiAgICAvLyBDb21tb24gZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBjb21tb25FbnZpcm9ubWVudCA9IHtcclxuICAgICAgVEFCTEVfTkFNRTogcHJvcHMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICBMT0dfTEVWRUw6ICdpbmZvJyxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ29tbW9uIExhbWJkYSBmdW5jdGlvbiBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBjb21tb25Qcm9wcyA9IHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLCAvLyBCYWxhbmNlZCBmb3IgY29zdCBhbmQgcGVyZm9ybWFuY2VcclxuICAgICAgbGF5ZXJzOiBbY29tbW9uTGF5ZXIsIHNoYXJlZExheWVyXSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSywgLy8gQ29zdCBvcHRpbWl6YXRpb25cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdXRoZW50aWNhdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSB1c2VyIHJlZ2lzdHJhdGlvbiwgbG9naW4sIGFuZCBwcm9maWxlIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBdXRoSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGgnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2F1dGgnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGF1dGhlbnRpY2F0aW9uIGhhbmRsZXIgZm9yIHVzZXIgcmVnaXN0cmF0aW9uLCBsb2dpbiwgYW5kIHByb2ZpbGUgbWFuYWdlbWVudCcsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLi4uY29tbW9uRW52aXJvbm1lbnQsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIENMSUVOVF9JRDogcHJvcHMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVkZ2V0IE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgYnVkZ2V0IENSVUQgb3BlcmF0aW9ucyBhbmQgY2FsY3VsYXRpb25zXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdCdWRnZXRIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYnVkZ2V0JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9idWRnZXQnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGJ1ZGdldCBoYW5kbGVyIGZvciBDUlVEIG9wZXJhdGlvbnMsIGNhdGVnb3JpZXMsIGFuZCB6ZXJvLWJhc2VkIGNhbGN1bGF0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyYW5zYWN0aW9uIE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgdHJhbnNhY3Rpb24gQ1JVRCBvcGVyYXRpb25zIGFuZCBidWRnZXQgdXBkYXRlc1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUcmFuc2FjdGlvbkhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS10cmFuc2FjdGlvbicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvdHJhbnNhY3Rpb25zJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSB0cmFuc2FjdGlvbiBoYW5kbGVyIGZvciBleHBlbnNlL2luY29tZSB0cmFja2luZyBhbmQgYXV0b21hdGljIGJ1ZGdldCB1cGRhdGVzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQUkgQnVkZ2V0IEdlbmVyYXRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgQUktcG93ZXJlZCBidWRnZXQgZ2VuZXJhdGlvbiB1c2luZyBBV1MgQmVkcm9ja1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5haUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1haScsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvYWknKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IEFJIGhhbmRsZXIgZm9yIHBlcnNvbmFsaXplZCBidWRnZXQgZ2VuZXJhdGlvbiB1c2luZyBBV1MgQmVkcm9jayBDbGF1ZGUgMy41JyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksIC8vIEFJIGNhbGxzIG1heSB0YWtlIGxvbmdlclxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIC4uLmNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFBheW1lbnQgYW5kIFN1YnNjcmlwdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBTdHJpcGUgaW50ZWdyYXRpb24gYW5kIHN1YnNjcmlwdGlvbiBtYW5hZ2VtZW50XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGF5bWVudEhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1wYXltZW50JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9wYXltZW50JyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBwYXltZW50IGhhbmRsZXIgZm9yIFN0cmlwZSBpbnRlZ3JhdGlvbiBhbmQgc3Vic2NyaXB0aW9uIG1hbmFnZW1lbnQnLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIC4uLmNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICAgIFNUUklQRV9TRUNSRVRfS0VZOiBwcm9jZXNzLmVudi5TVFJJUEVfU0VDUkVUX0tFWSB8fCAnJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRW1haWwgYW5kIE5vdGlmaWNhdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBTRVMgZW1haWwgc2VuZGluZyBhbmQgbm90aWZpY2F0aW9uIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuZW1haWxIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRW1haWxIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktZW1haWwnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2VtYWlsJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBlbWFpbCBoYW5kbGVyIGZvciBub3RpZmljYXRpb25zLCB0aXBzIGRlbGl2ZXJ5LCBhbmQgZmFtaWx5IGludml0YXRpb25zIHZpYSBTRVMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEYXRhIEV4cG9ydCBhbmQgQmFja3VwIEZ1bmN0aW9uc1xyXG4gICAgICogSGFuZGxlIENTVi9QREYgZXhwb3J0IGFuZCBkYXRhIGJhY2t1cCBmdW5jdGlvbmFsaXR5XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmV4cG9ydEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdFeHBvcnRIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktZXhwb3J0JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9leHBvcnQnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGV4cG9ydCBoYW5kbGVyIGZvciBDU1YvUERGIGV4cG9ydCBhbmQgZGF0YSBiYWNrdXAgZnVuY3Rpb25hbGl0eScsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLCAvLyBFeHBvcnQgb3BlcmF0aW9ucyBtYXkgdGFrZSBsb25nZXIgZm9yIGxhcmdlIGRhdGFzZXRzXHJcbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsIC8vIE1vcmUgbWVtb3J5IGZvciBwcm9jZXNzaW5nIGxhcmdlIGRhdGFzZXRzXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIERhdGEgUmVzdG9yZSBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBkYXRhIHJlc3RvcmF0aW9uIGZyb20gSlNPTiBiYWNrdXBzXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLnJlc3RvcmVIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUmVzdG9yZUhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1yZXN0b3JlJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9yZXN0b3JlJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSByZXN0b3JlIGhhbmRsZXIgZm9yIGRhdGEgcmVzdG9yYXRpb24gZnJvbSBKU09OIGJhY2t1cHMnLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSwgLy8gUmVzdG9yZSBvcGVyYXRpb25zIG1heSB0YWtlIGxvbmdlciBmb3IgbGFyZ2UgZGF0YXNldHNcclxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCwgLy8gTW9yZSBtZW1vcnkgZm9yIHByb2Nlc3NpbmcgbGFyZ2UgZGF0YXNldHNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGU6IEFkbWluIExhbWJkYSBtb3ZlZCB0byBBcGlGZWF0dXJlc1N0YWNrXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCaWxsIFJlbWluZGVycyBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBiaWxsIENSVUQsIHBheW1lbnQgdHJhY2tpbmcsIGFuZCByZWN1cnJpbmcgYmlsbHNcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYmlsbHNIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQmlsbHNIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYmlsbHMnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2JpbGxzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBiaWxscyBoYW5kbGVyIGZvciBiaWxsIHJlbWluZGVycywgZHVlIGRhdGUgdHJhY2tpbmcsIGFuZCByZWN1cnJpbmcgYmlsbCBtYW5hZ2VtZW50JyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2F2aW5ncyBHb2FscyBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBnb2FsIENSVUQsIHByb2dyZXNzIHRyYWNraW5nLCBhbmQgbWlsZXN0b25lIGNlbGVicmF0aW9uc1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5nb2Fsc0hhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHb2Fsc0hhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1nb2FscycsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvZ29hbHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGdvYWxzIGhhbmRsZXIgZm9yIHNhdmluZ3MgZ29hbHMsIHByb2dyZXNzIHRyYWNraW5nLCBhbmQgbWlsZXN0b25lIGNlbGVicmF0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFjY291bnQgTWFuYWdlbWVudCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBhY2NvdW50IENSVUQsIGJhbGFuY2UgdHJhY2tpbmcsIGFuZCByZWNvbmNpbGlhdGlvblxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5hY2NvdW50c0hhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBY2NvdW50c0hhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1hY2NvdW50cycsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvYWNjb3VudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGFjY291bnRzIGhhbmRsZXIgZm9yIG1hbnVhbC9jb25uZWN0ZWQgYWNjb3VudCBtYW5hZ2VtZW50LCBiYWxhbmNlIHRyYWNraW5nLCBhbmQgcmVjb25jaWxpYXRpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTm90ZTogU3Vic2NyaXB0aW9ucywgRGVidCBQYXlvZmYsIEluc2lnaHRzLCBhbmQgUmVjZWlwdCBMYW1iZGFzIG1vdmVkIHRvIEFwaUZlYXR1cmVzU3RhY2tcclxuXHJcbiAgICAvLyBOb3RlOiBQbGFpZCBhbmQgUmVjb25jaWxpYXRpb24gTGFtYmRhcyBtb3ZlZCB0byBBcGlGZWF0dXJlc1N0YWNrXHJcblxyXG4gICAgLy8gR3JhbnQgRHluYW1vREIgcGVybWlzc2lvbnMgdG8gYWxsIGZ1bmN0aW9uc1xyXG4gICAgT2JqZWN0LnZhbHVlcyh0aGlzLmZ1bmN0aW9ucykuZm9yRWFjaChmdW5jID0+IHtcclxuICAgICAgcHJvcHMudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgYWRkaXRpb25hbCBwZXJtaXNzaW9ucyBmb3Igc3BlY2lmaWMgZnVuY3Rpb25zXHJcbiAgICB0aGlzLmdyYW50QWRkaXRpb25hbFBlcm1pc3Npb25zKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCBhZGRpdGlvbmFsIEFXUyBzZXJ2aWNlIHBlcm1pc3Npb25zIHRvIHNwZWNpZmljIGZ1bmN0aW9uc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZ3JhbnRBZGRpdGlvbmFsUGVybWlzc2lvbnMoKTogdm9pZCB7XHJcbiAgICAvLyBBdXRoIEhhbmRsZXIgbmVlZHMgQ29nbml0byBwZXJtaXNzaW9uc1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOlNpZ25VcCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkluaXRpYXRlQXV0aCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkNvbmZpcm1TaWduVXAnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpGb3Jnb3RQYXNzd29yZCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkNvbmZpcm1Gb3Jnb3RQYXNzd29yZCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkdldFVzZXInLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpVcGRhdGVVc2VyQXR0cmlidXRlcycsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGVsZXRlVXNlcicsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIENvZ25pdG8gcGVybWlzc2lvbnMgYXJlIHR5cGljYWxseSBicm9hZCBmb3IgdXNlciBwb29sIG9wZXJhdGlvbnNcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBBSSBIYW5kbGVyIG5lZWRzIEJlZHJvY2sgcGVybWlzc2lvbnNcclxuICAgIHRoaXMuZnVuY3Rpb25zLmFpSGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXHJcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBCZWRyb2NrIG1vZGVscyBkb24ndCBoYXZlIHNwZWNpZmljIEFSTnNcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBFbWFpbCBIYW5kbGVyIG5lZWRzIFNFUyBwZXJtaXNzaW9uc1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuZW1haWxIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzZXM6U2VuZEVtYWlsJyxcclxuICAgICAgICAnc2VzOlNlbmRSYXdFbWFpbCcsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIFNFUyBwZXJtaXNzaW9ucyBhcmUgdHlwaWNhbGx5IGJyb2FkXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gUGF5bWVudCBIYW5kbGVyIG5lZWRzIGFkZGl0aW9uYWwgbG9nZ2luZyBmb3Igd2ViaG9vayBkZWJ1Z2dpbmdcclxuICAgIHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxyXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICB9KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgQVBJIEdhdGV3YXkgUkVTVCBBUEkgd2l0aCBwcm9wZXIgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlQXBpR2F0ZXdheSh1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbCk6IGFwaWdhdGV3YXkuUmVzdEFwaSB7XHJcbiAgICAvLyBDcmVhdGUgQ29nbml0byBhdXRob3JpemVyIGZvciBwcm90ZWN0ZWQgZW5kcG9pbnRzXHJcbiAgICBjb25zdCBhdXRob3JpemVyID0gbmV3IGFwaWdhdGV3YXkuQ29nbml0b1VzZXJQb29sc0F1dGhvcml6ZXIodGhpcywgJ0J1ZGdldEJ1ZGR5QXV0aG9yaXplcicsIHtcclxuICAgICAgY29nbml0b1VzZXJQb29sczogW3VzZXJQb29sXSxcclxuICAgICAgYXV0aG9yaXplck5hbWU6ICdidWRnZXRidWRkeS1hdXRob3JpemVyJyxcclxuICAgICAgaWRlbnRpdHlTb3VyY2U6ICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdGhlIFJFU1QgQVBJXHJcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdCdWRnZXRCdWRkeUFwaScsIHtcclxuICAgICAgcmVzdEFwaU5hbWU6ICdidWRnZXRidWRkeS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IFJFU1QgQVBJIGZvciB3ZWIgYW5kIG1vYmlsZSBjbGllbnRzIHdpdGggc2VydmVybGVzcyBMYW1iZGEgYmFja2VuZCcsXHJcblxyXG4gICAgICAvLyBFbmFibGUgQ09SUyBmb3Igd2ViIGNsaWVudHNcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbXHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgLy8gTG9jYWwgZGV2ZWxvcG1lbnRcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLCAvLyBWaXRlIGRldiBzZXJ2ZXJcclxuICAgICAgICAgICdodHRwczovL2QxdWVldWduOXpjeDduLmNsb3VkZnJvbnQubmV0JywgLy8gQ2xvdWRGcm9udCB3ZWIgYXBwXHJcbiAgICAgICAgICAnaHR0cHM6Ly9kMnViaHgyYTEzczdnYy5jbG91ZGZyb250Lm5ldCcsIC8vIENsb3VkRnJvbnQgYWRtaW4gZGFzaGJvYXJkXHJcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAuYnVkZ2V0YnVkZHkuY29tJywgLy8gUHJvZHVjdGlvbiB3ZWIgYXBwIChjdXN0b20gZG9tYWluKVxyXG4gICAgICAgICAgJ2h0dHBzOi8vYWRtaW4uYnVkZ2V0YnVkZHkuY29tJywgLy8gQWRtaW4gZGFzaGJvYXJkIChjdXN0b20gZG9tYWluKVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbJ0dFVCcsICdQT1NUJywgJ1BVVCcsICdERUxFVEUnLCAnT1BUSU9OUyddLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAnWC1BcGktS2V5JyxcclxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiB0cnVlLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQVBJIEdhdGV3YXkgY29uZmlndXJhdGlvblxyXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XHJcbiAgICAgICAgc3RhZ2VOYW1lOiAndjEnLFxyXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcclxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIC8vIEZvcmNlIGRlcGxveW1lbnQgd2hlbiBMYW1iZGEgaW50ZWdyYXRpb25zIGNoYW5nZVxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgRGVwbG95bWVudCAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1gLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQmluYXJ5IG1lZGlhIHR5cGVzIGZvciBmaWxlIHVwbG9hZHMgKGZ1dHVyZSBmZWF0dXJlKVxyXG4gICAgICBiaW5hcnlNZWRpYVR5cGVzOiBbJ211bHRpcGFydC9mb3JtLWRhdGEnXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIGF1dGhvcml6ZXIgZm9yIHVzZSBpbiByb3V0ZSBzZXR1cFxyXG4gICAgKGFwaSBhcyBhbnkpLmF1dGhvcml6ZXIgPSBhdXRob3JpemVyO1xyXG5cclxuICAgIC8vIEFkZCBHYXRld2F5IFJlc3BvbnNlcyBmb3IgQ09SUyBvbiBlcnJvciByZXNwb25zZXNcclxuICAgIHRoaXMuYWRkR2F0ZXdheVJlc3BvbnNlcyhhcGkpO1xyXG5cclxuICAgIHJldHVybiBhcGk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGQgR2F0ZXdheSBSZXNwb25zZXMgdG8gaGFuZGxlIENPUlMgZm9yIGVycm9yIHJlc3BvbnNlc1xyXG4gICAqIFRoaXMgZW5zdXJlcyBDT1JTIGhlYWRlcnMgYXJlIHByZXNlbnQgb24gNDAxLCA0MDMsIDRYWCwgYW5kIDVYWCByZXNwb25zZXNcclxuICAgKi9cclxuICBwcml2YXRlIGFkZEdhdGV3YXlSZXNwb25zZXMoYXBpOiBhcGlnYXRld2F5LlJlc3RBcGkpOiB2b2lkIHtcclxuICAgIGNvbnN0IGNvcnNIZWFkZXJzID0ge1xyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbidcIixcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMnXCIsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IFwiJ3RydWUnXCIsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIDQwMSBVbmF1dGhvcml6ZWQgKENvZ25pdG8gYXV0aG9yaXplciBmYWlsdXJlcylcclxuICAgIGFwaS5hZGRHYXRld2F5UmVzcG9uc2UoJ1VuYXV0aG9yaXplZCcsIHtcclxuICAgICAgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUuVU5BVVRIT1JJWkVELFxyXG4gICAgICBzdGF0dXNDb2RlOiAnNDAxJyxcclxuICAgICAgcmVzcG9uc2VIZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIDQwMyBGb3JiaWRkZW4gKElBTS9yZXNvdXJjZSBwb2xpY3kgZGVuaWFscylcclxuICAgIGFwaS5hZGRHYXRld2F5UmVzcG9uc2UoJ0FjY2Vzc0RlbmllZCcsIHtcclxuICAgICAgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUuQUNDRVNTX0RFTklFRCxcclxuICAgICAgc3RhdHVzQ29kZTogJzQwMycsXHJcbiAgICAgIHJlc3BvbnNlSGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyA0WFggQ2xpZW50IEVycm9yc1xyXG4gICAgYXBpLmFkZEdhdGV3YXlSZXNwb25zZSgnRGVmYXVsdDRYWCcsIHtcclxuICAgICAgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUuREVGQVVMVF80WFgsXHJcbiAgICAgIHJlc3BvbnNlSGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyA1WFggU2VydmVyIEVycm9yc1xyXG4gICAgYXBpLmFkZEdhdGV3YXlSZXNwb25zZSgnRGVmYXVsdDVYWCcsIHtcclxuICAgICAgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUuREVGQVVMVF81WFgsXHJcbiAgICAgIHJlc3BvbnNlSGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCB1cCBhbGwgQVBJIHJvdXRlcyBhbmQgTGFtYmRhIGludGVncmF0aW9uc1xyXG4gICAqIE9yZ2FuaXplcyBlbmRwb2ludHMgYnkgYnVzaW5lc3MgZG9tYWluXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzZXR1cEFwaVJvdXRlcygpOiB2b2lkIHtcclxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSAodGhpcy5hcGkgYXMgYW55KS5hdXRob3JpemVyO1xyXG5cclxuICAgIC8vIEhlYWx0aCBjaGVjayBlbmRwb2ludHMgKHB1YmxpYywgbm8gYXV0aCByZXF1aXJlZClcclxuICAgIGNvbnN0IGhlYWx0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBoZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gcm91dGVzIChwdWJsaWMpXHJcbiAgICBjb25zdCBhdXRoUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhdXRoJyk7XHJcblxyXG4gICAgLy8gVXNlciByZWdpc3RyYXRpb25cclxuICAgIGNvbnN0IHJlZ2lzdGVyUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJyk7XHJcbiAgICByZWdpc3RlclJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUmVnaXN0ZXJVc2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgbG9naW5cclxuICAgIGNvbnN0IGxvZ2luUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ2luJyk7XHJcbiAgICBsb2dpblJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnTG9naW5Vc2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVtYWlsIGNvbmZpcm1hdGlvblxyXG4gICAgY29uc3QgY29uZmlybVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdjb25maXJtJyk7XHJcbiAgICBjb25maXJtUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDb25maXJtRW1haWwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRm9yZ290IHBhc3N3b3JkXHJcbiAgICBjb25zdCBmb3Jnb3RQYXNzd29yZFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdmb3Jnb3QtcGFzc3dvcmQnKTtcclxuICAgIGZvcmdvdFBhc3N3b3JkUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdGb3Jnb3RQYXNzd29yZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZXNldCBwYXNzd29yZFxyXG4gICAgY29uc3QgcmVzZXRQYXNzd29yZFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdyZXNldC1wYXNzd29yZCcpO1xyXG4gICAgcmVzZXRQYXNzd29yZFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUmVzZXRQYXNzd29yZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVc2VyIHByb2ZpbGUgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHByb2ZpbGVSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncHJvZmlsZScpO1xyXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRQcm9maWxlJyxcclxuICAgIH0pO1xyXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVQcm9maWxlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGggaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBhdXRoSGVhbHRoUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgYXV0aEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdBdXRoSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2VvbG9jYXRpb24gZW5kcG9pbnQgKHB1YmxpYylcclxuICAgIGNvbnN0IGdlb2xvY2F0aW9uUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2dlb2xvY2F0aW9uJyk7XHJcbiAgICBnZW9sb2NhdGlvblJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRHZW9sb2NhdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPbmJvYXJkaW5nIGVuZHBvaW50IChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBvbmJvYXJkaW5nUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ29uYm9hcmRpbmcnKTtcclxuICAgIC8vIFVzZSBuZXcgc3RhbmRhbG9uZSBMYW1iZGEgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgZmFsbCBiYWNrIHRvIG1vbm9saXRoaWMgaGFuZGxlclxyXG4gICAgY29uc3Qgb25ib2FyZGluZ0hhbmRsZXIgPSB0aGlzLmF1dGhPbmJvYXJkaW5nRnVuY3Rpb24gfHwgdGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXI7XHJcblxyXG4gICAgLy8gTG9nIHdoaWNoIGhhbmRsZXIgaXMgYmVpbmcgdXNlZCBmb3IgZGVidWdnaW5nXHJcbiAgICBpZiAodGhpcy5hdXRoT25ib2FyZGluZ0Z1bmN0aW9uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCfinIUgVXNpbmcgc3RhbmRhbG9uZSBhdXRoLW9uYm9hcmRpbmcgTGFtYmRhIGZvciAvYXV0aC9vbmJvYXJkaW5nIGVuZHBvaW50Jyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZygn4pqg77iPICBVc2luZyBtb25vbGl0aGljIGF1dGggTGFtYmRhIGZvciAvYXV0aC9vbmJvYXJkaW5nIGVuZHBvaW50IChmYWxsYmFjayknKTtcclxuICAgIH1cclxuXHJcbiAgICBvbmJvYXJkaW5nUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ob25ib2FyZGluZ0hhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDb21wbGV0ZU9uYm9hcmRpbmcnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR29vZ2xlIFNpZ24tSW4gZW5kcG9pbnQgKHB1YmxpYylcclxuICAgIGNvbnN0IGdvb2dsZVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdnb29nbGUnKTtcclxuICAgIGdvb2dsZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR29vZ2xlU2lnbkluJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgcHJvZmlsZSByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHVzZXJzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd1c2VycycpO1xyXG4gICAgdXNlcnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0VXNlclByb2ZpbGUnLFxyXG4gICAgfSk7XHJcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVVc2VyUHJvZmlsZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBidWRnZXRSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2J1ZGdldCcpO1xyXG4gICAgYnVkZ2V0UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QnVkZ2V0cycsXHJcbiAgICB9KTtcclxuICAgIGJ1ZGdldFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVCdWRnZXQnLFxyXG4gICAgfSk7XHJcbiAgICBidWRnZXRSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVCdWRnZXQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQnVkZ2V0IGN1cnJlbnQgbW9udGggZW5kcG9pbnRcclxuICAgIGNvbnN0IGJ1ZGdldEN1cnJlbnRSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCdjdXJyZW50Jyk7XHJcbiAgICBidWRnZXRDdXJyZW50UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0Q3VycmVudEJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgYnkgSUQgZW5kcG9pbnRcclxuICAgIGNvbnN0IGJ1ZGdldElkUmVzb3VyY2UgPSBidWRnZXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2J1ZGdldElkfScpO1xyXG4gICAgYnVkZ2V0SWRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRCdWRnZXRCeUlkJyxcclxuICAgIH0pO1xyXG4gICAgYnVkZ2V0SWRSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVCdWRnZXRCeUlkJyxcclxuICAgIH0pO1xyXG4gICAgYnVkZ2V0SWRSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdEZWxldGVCdWRnZXQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQnVkZ2V0IGhlYWx0aCBlbmRwb2ludFxyXG4gICAgY29uc3QgYnVkZ2V0SGVhbHRoUmVzb3VyY2UgPSBidWRnZXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBidWRnZXRIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdCdWRnZXRIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgY2F0ZWdvcmllcyByb3V0ZXNcclxuICAgIGNvbnN0IGNhdGVnb3JpZXNSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCdjYXRlZ29yaWVzJyk7XHJcbiAgICBjYXRlZ29yaWVzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0Q2F0ZWdvcmllcycsXHJcbiAgICB9KTtcclxuICAgIGNhdGVnb3JpZXNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQ3JlYXRlQ2F0ZWdvcnknLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQnVkZ2V0IGNhdGVnb3J5IHJvbGxvdmVyIHJvdXRlcyAoUmVxdWlyZW1lbnQgNDAuNylcclxuICAgIGNvbnN0IGNhdGVnb3J5SWRSZXNvdXJjZSA9IGNhdGVnb3JpZXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2NhdGVnb3J5SWR9Jyk7XHJcbiAgICBjb25zdCByb2xsb3ZlclJlc291cmNlID0gY2F0ZWdvcnlJZFJlc291cmNlLmFkZFJlc291cmNlKCdyb2xsb3ZlcicpO1xyXG4gICAgcm9sbG92ZXJSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVDYXRlZ29yeVJvbGxvdmVyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlc2V0IHJvbGxvdmVyIGVuZHBvaW50XHJcbiAgICBjb25zdCByb2xsb3ZlclJlc2V0UmVzb3VyY2UgPSByb2xsb3ZlclJlc291cmNlLmFkZFJlc291cmNlKCdyZXNldCcpO1xyXG4gICAgcm9sbG92ZXJSZXNldFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1Jlc2V0Q2F0ZWdvcnlSb2xsb3ZlcicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSBidWRnZXQgZ2VuZXJhdGlvbiByb3V0ZXNcclxuICAgIGNvbnN0IGFpUmVzb3VyY2UgPSBidWRnZXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnYWktZ2VuZXJhdGUnKTtcclxuICAgIGFpUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2VuZXJhdGVBSUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcmFuc2FjdGlvbiByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgndHJhbnNhY3Rpb25zJyk7XHJcbiAgICB0cmFuc2FjdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldFRyYW5zYWN0aW9ucycsXHJcbiAgICB9KTtcclxuICAgIHRyYW5zYWN0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluZGl2aWR1YWwgdHJhbnNhY3Rpb24gcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCB0cmFuc2FjdGlvblJlc291cmNlID0gdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3t0cmFuc2FjdGlvbklkfScpO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldFRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0RlbGV0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRyYW5zYWN0aW9ucyBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uc0hlYWx0aFJlc291cmNlID0gdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgdHJhbnNhY3Rpb25zSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdUcmFuc2FjdGlvbnNIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEYXRhIEV4cG9ydCByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IGV4cG9ydFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnZXhwb3J0Jyk7XHJcbiAgICBleHBvcnRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmV4cG9ydEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdFeHBvcnREYXRhJyxcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1UeXBlJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1EaXNwb3NpdGlvbic6IHRydWUsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGF0YSBSZXN0b3JlIHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgcmVzdG9yZVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncmVzdG9yZScpO1xyXG4gICAgcmVzdG9yZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnJlc3RvcmVIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUmVzdG9yZURhdGEnLFxyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXltZW50IHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgcGF5bWVudHNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BheW1lbnRzJyk7XHJcbiAgICBwYXltZW50c1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQ3JlYXRlU3Vic2NyaXB0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBheW1lbnQgaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBwYXltZW50SGVhbHRoUmVzb3VyY2UgPSBwYXltZW50c1Jlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIHBheW1lbnRIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUGF5bWVudEhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFdlYmhvb2sgcm91dGVzIChwdWJsaWMsIGJ1dCB2YWxpZGF0ZWQgYnkgU3RyaXBlKVxyXG4gICAgY29uc3Qgd2ViaG9va3NSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3dlYmhvb2tzJyk7XHJcbiAgICBjb25zdCBzdHJpcGVXZWJob29rID0gd2ViaG9va3NSZXNvdXJjZS5hZGRSZXNvdXJjZSgnc3RyaXBlJyk7XHJcbiAgICBzdHJpcGVXZWJob29rLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnU3RyaXBlV2ViaG9vaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RlOiBBZG1pbiByb3V0ZXMgbW92ZWQgdG8gQXBpRmVhdHVyZXNTdGFja1xyXG5cclxuICAgIC8vIEJpbGxzIHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgYmlsbHNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2JpbGxzJyk7XHJcbiAgICBiaWxsc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYmlsbHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QmlsbHMnLFxyXG4gICAgfSk7XHJcbiAgICBiaWxsc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJpbGxzSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUJpbGwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQmlsbHMgdXBjb21pbmcgZW5kcG9pbnRcclxuICAgIGNvbnN0IGJpbGxzVXBjb21pbmdSZXNvdXJjZSA9IGJpbGxzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VwY29taW5nJyk7XHJcbiAgICBiaWxsc1VwY29taW5nUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5iaWxsc0hhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRVcGNvbWluZ0JpbGxzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJpbGxzIGNhbGVuZGFyIGVuZHBvaW50XHJcbiAgICBjb25zdCBiaWxsc0NhbGVuZGFyUmVzb3VyY2UgPSBiaWxsc1Jlc291cmNlLmFkZFJlc291cmNlKCdjYWxlbmRhcicpO1xyXG4gICAgYmlsbHNDYWxlbmRhclJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYmlsbHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QmlsbHNDYWxlbmRhcicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCaWxscyBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IGJpbGxzSGVhbHRoUmVzb3VyY2UgPSBiaWxsc1Jlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGJpbGxzSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5iaWxsc0hhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdCaWxsc0hlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluZGl2aWR1YWwgYmlsbCByb3V0ZXNcclxuICAgIGNvbnN0IGJpbGxJZFJlc291cmNlID0gYmlsbHNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2JpbGxJZH0nKTtcclxuICAgIGJpbGxJZFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYmlsbHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnVXBkYXRlQmlsbCcsXHJcbiAgICB9KTtcclxuICAgIGJpbGxJZFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYmlsbHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnRGVsZXRlQmlsbCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCaWxsIHBheSBlbmRwb2ludFxyXG4gICAgY29uc3QgYmlsbFBheVJlc291cmNlID0gYmlsbElkUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3BheScpO1xyXG4gICAgYmlsbFBheVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJpbGxzSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ01hcmtCaWxsUGFpZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHb2FscyByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IGdvYWxzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdnb2FscycpO1xyXG4gICAgZ29hbHNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmdvYWxzSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEdvYWxzJyxcclxuICAgIH0pO1xyXG4gICAgZ29hbHNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5nb2Fsc0hhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVHb2FsJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdvYWxzIHRlbXBsYXRlcyBlbmRwb2ludFxyXG4gICAgY29uc3QgZ29hbHNUZW1wbGF0ZXNSZXNvdXJjZSA9IGdvYWxzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3RlbXBsYXRlcycpO1xyXG4gICAgZ29hbHNUZW1wbGF0ZXNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmdvYWxzSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEdvYWxUZW1wbGF0ZXMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR29hbHMgcmVvcmRlciBlbmRwb2ludFxyXG4gICAgY29uc3QgZ29hbHNSZW9yZGVyUmVzb3VyY2UgPSBnb2Fsc1Jlc291cmNlLmFkZFJlc291cmNlKCdyZW9yZGVyJyk7XHJcbiAgICBnb2Fsc1Jlb3JkZXJSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmdvYWxzSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1Jlb3JkZXJHb2FscycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHb2FscyBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IGdvYWxzSGVhbHRoUmVzb3VyY2UgPSBnb2Fsc1Jlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGdvYWxzSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5nb2Fsc0hhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHb2Fsc0hlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluZGl2aWR1YWwgZ29hbCByb3V0ZXNcclxuICAgIGNvbnN0IGdvYWxJZFJlc291cmNlID0gZ29hbHNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2dvYWxJZH0nKTtcclxuICAgIGdvYWxJZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZ29hbHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0R29hbCcsXHJcbiAgICB9KTtcclxuICAgIGdvYWxJZFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZ29hbHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnVXBkYXRlR29hbCcsXHJcbiAgICB9KTtcclxuICAgIGdvYWxJZFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZ29hbHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnRGVsZXRlR29hbCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHb2FsIGNvbnRyaWJ1dGUgZW5kcG9pbnRcclxuICAgIGNvbnN0IGdvYWxDb250cmlidXRlUmVzb3VyY2UgPSBnb2FsSWRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnY29udHJpYnV0ZScpO1xyXG4gICAgZ29hbENvbnRyaWJ1dGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5nb2Fsc0hhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDb250cmlidXRlVG9Hb2FsJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFjY291bnRzIHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgYWNjb3VudHNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FjY291bnRzJyk7XHJcbiAgICBhY2NvdW50c1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWNjb3VudHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QWNjb3VudHMnLFxyXG4gICAgfSk7XHJcbiAgICBhY2NvdW50c1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFjY291bnRzSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUFjY291bnQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWNjb3VudHMgc3VtbWFyeSBlbmRwb2ludFxyXG4gICAgY29uc3QgYWNjb3VudHNTdW1tYXJ5UmVzb3VyY2UgPSBhY2NvdW50c1Jlc291cmNlLmFkZFJlc291cmNlKCdzdW1tYXJ5Jyk7XHJcbiAgICBhY2NvdW50c1N1bW1hcnlSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFjY291bnRzSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEFjY291bnRzU3VtbWFyeScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBY2NvdW50cyBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IGFjY291bnRzSGVhbHRoUmVzb3VyY2UgPSBhY2NvdW50c1Jlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGFjY291bnRzSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hY2NvdW50c0hhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdBY2NvdW50c0hlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluZGl2aWR1YWwgYWNjb3VudCByb3V0ZXNcclxuICAgIGNvbnN0IGFjY291bnRJZFJlc291cmNlID0gYWNjb3VudHNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2FjY291bnRJZH0nKTtcclxuICAgIGFjY291bnRJZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWNjb3VudHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QWNjb3VudCcsXHJcbiAgICB9KTtcclxuICAgIGFjY291bnRJZFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWNjb3VudHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnVXBkYXRlQWNjb3VudCcsXHJcbiAgICB9KTtcclxuICAgIGFjY291bnRJZFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWNjb3VudHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnRGVsZXRlQWNjb3VudCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBY2NvdW50IHJlY29uY2lsZSBlbmRwb2ludFxyXG4gICAgY29uc3QgYWNjb3VudFJlY29uY2lsZVJlc291cmNlID0gYWNjb3VudElkUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlY29uY2lsZScpO1xyXG4gICAgYWNjb3VudFJlY29uY2lsZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFjY291bnRzSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1JlY29uY2lsZUFjY291bnQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWNjb3VudCB0cmFja2luZyBlbmRwb2ludFxyXG4gICAgY29uc3QgYWNjb3VudFRyYWNraW5nUmVzb3VyY2UgPSBhY2NvdW50SWRSZXNvdXJjZS5hZGRSZXNvdXJjZSgndHJhY2tpbmcnKTtcclxuICAgIGFjY291bnRUcmFja2luZ1Jlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWNjb3VudHNIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnU2V0QWNjb3VudFRyYWNraW5nJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGU6IFN1YnNjcmlwdGlvbnMgcm91dGVzIG1vdmVkIHRvIEFwaUZlYXR1cmVzU3RhY2tcclxuXHJcbiAgICAvLyBOb3RlOiBEZWJ0cyByb3V0ZXMgbW92ZWQgdG8gQXBpRmVhdHVyZXNTdGFja1xyXG5cclxuICAgIC8vIE5vdGU6IEluc2lnaHRzIHJvdXRlcyBtb3ZlZCB0byBBcGlGZWF0dXJlc1N0YWNrXHJcblxyXG4gICAgLy8gTm90ZTogUmVjZWlwdCByb3V0ZXMgbW92ZWQgdG8gQXBpRmVhdHVyZXNTdGFja1xyXG5cclxuICAgIC8vIE5vdGU6IFBsYWlkIGFuZCBSZWNvbmNpbGlhdGlvbiByb3V0ZXMgbW92ZWQgdG8gQXBpRmVhdHVyZXNTdGFja1xyXG5cclxuICAgIC8vIEVtYWlsIHJvdXRlcyAocHVibGljIGZvciB3ZWJob29rcywgcHJvdGVjdGVkIGZvciBzZW5kaW5nKVxyXG4gICAgY29uc3QgZW1haWxSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2VtYWlsJyk7XHJcbiAgICBjb25zdCBlbWFpbEhlYWx0aFJlc291cmNlID0gZW1haWxSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBlbWFpbEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZW1haWxIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnRW1haWxIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSByb3V0ZXMgKHNlcGFyYXRlIGZyb20gYnVkZ2V0IGZvciBoZWFsdGggY2hlY2tzKVxyXG4gICAgY29uc3QgYWlSb290UmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhaScpO1xyXG4gICAgY29uc3QgYWlIZWFsdGhSZXNvdXJjZSA9IGFpUm9vdFJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGFpSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5haUhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdBSUhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiByb3V0ZXMgKHByb3RlY3RlZCkgLSBvbmx5IGFkZCBpZiBub3RpZmljYXRpb24gZnVuY3Rpb24gaXMgYXZhaWxhYmxlXHJcbiAgICBpZiAodGhpcy5ub3RpZmljYXRpb25GdW5jdGlvbikge1xyXG4gICAgICBjb25zdCBub3RpZmljYXRpb25zUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdub3RpZmljYXRpb25zJyk7XHJcblxyXG4gICAgICAvLyBEZXZpY2UgcmVnaXN0cmF0aW9uIHJvdXRlIChwcm90ZWN0ZWQpXHJcbiAgICAgIGNvbnN0IHJlZ2lzdGVyRGV2aWNlUmVzb3VyY2UgPSBub3RpZmljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyLWRldmljZScpO1xyXG4gICAgICByZWdpc3RlckRldmljZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMubm90aWZpY2F0aW9uRnVuY3Rpb24pLCB7XHJcbiAgICAgICAgYXV0aG9yaXplcixcclxuICAgICAgICBvcGVyYXRpb25OYW1lOiAnUmVnaXN0ZXJEZXZpY2UnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIERldmljZSBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgICBjb25zdCBkZXZpY2VSZXNvdXJjZSA9IG5vdGlmaWNhdGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZGV2aWNlJyk7XHJcbiAgICAgIGNvbnN0IGRldmljZUlkUmVzb3VyY2UgPSBkZXZpY2VSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2RldmljZUlkfScpO1xyXG4gICAgICBkZXZpY2VJZFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5ub3RpZmljYXRpb25GdW5jdGlvbiksIHtcclxuICAgICAgICBhdXRob3JpemVyLFxyXG4gICAgICAgIG9wZXJhdGlvbk5hbWU6ICdSZW1vdmVEZXZpY2UnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE5vdGlmaWNhdGlvbiBwcmVmZXJlbmNlcyByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgICAgY29uc3QgcHJlZmVyZW5jZXNSZXNvdXJjZSA9IG5vdGlmaWNhdGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgncHJlZmVyZW5jZXMnKTtcclxuICAgICAgcHJlZmVyZW5jZXNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMubm90aWZpY2F0aW9uRnVuY3Rpb24pLCB7XHJcbiAgICAgICAgYXV0aG9yaXplcixcclxuICAgICAgICBvcGVyYXRpb25OYW1lOiAnR2V0Tm90aWZpY2F0aW9uUHJlZmVyZW5jZXMnLFxyXG4gICAgICB9KTtcclxuICAgICAgcHJlZmVyZW5jZXNSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMubm90aWZpY2F0aW9uRnVuY3Rpb24pLCB7XHJcbiAgICAgICAgYXV0aG9yaXplcixcclxuICAgICAgICBvcGVyYXRpb25OYW1lOiAnVXBkYXRlTm90aWZpY2F0aW9uUHJlZmVyZW5jZXMnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE5vdGlmaWNhdGlvbiBoaXN0b3J5IHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgICBjb25zdCBoaXN0b3J5UmVzb3VyY2UgPSBub3RpZmljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hpc3RvcnknKTtcclxuICAgICAgaGlzdG9yeVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5ub3RpZmljYXRpb25GdW5jdGlvbiksIHtcclxuICAgICAgICBhdXRob3JpemVyLFxyXG4gICAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXROb3RpZmljYXRpb25IaXN0b3J5JyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNYXJrIG5vdGlmaWNhdGlvbiBhcyByZWFkIHJvdXRlIChwcm90ZWN0ZWQpXHJcbiAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbklkUmVzb3VyY2UgPSBub3RpZmljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tub3RpZmljYXRpb25JZH0nKTtcclxuICAgICAgY29uc3QgcmVhZFJlc291cmNlID0gbm90aWZpY2F0aW9uSWRSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVhZCcpO1xyXG4gICAgICByZWFkUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLm5vdGlmaWNhdGlvbkZ1bmN0aW9uKSwge1xyXG4gICAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgICAgb3BlcmF0aW9uTmFtZTogJ01hcmtOb3RpZmljYXRpb25Bc1JlYWQnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE5vdGlmaWNhdGlvbiBoZWFsdGggZW5kcG9pbnRcclxuICAgICAgY29uc3Qgbm90aWZpY2F0aW9uSGVhbHRoUmVzb3VyY2UgPSBub3RpZmljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgICBub3RpZmljYXRpb25IZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMubm90aWZpY2F0aW9uRnVuY3Rpb24pLCB7XHJcbiAgICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgICBvcGVyYXRpb25OYW1lOiAnTm90aWZpY2F0aW9uSGVhbHRoQ2hlY2snLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBDbG91ZEZvcm1hdGlvbiBvdXRwdXRzIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlT3V0cHV0cygpOiB2b2lkIHtcclxuICAgIC8vIEFQSSBHYXRld2F5IFVSTCBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS51cmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMIGZvciBCdWRnZXRCdWRkeSBjbGllbnQgYXBwbGljYXRpb25zICh3ZWIsIG1vYmlsZSwgYWRtaW4pJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaS11cmwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIEdhdGV3YXkgSUQgZm9yIG1vbml0b3JpbmdcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXBpLnJlc3RBcGlJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBJRCBmb3IgQnVkZ2V0QnVkZHkgbW9uaXRvcmluZyBhbmQgQ2xvdWRXYXRjaCBpbnRlZ3JhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hcGktaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIEFSTnMgZm9yIG1vbml0b3JpbmdcclxuICAgIE9iamVjdC5lbnRyaWVzKHRoaXMuZnVuY3Rpb25zKS5mb3JFYWNoKChbbmFtZSwgZnVuY10pID0+IHtcclxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYCR7bmFtZX1Bcm5gLCB7XHJcbiAgICAgICAgdmFsdWU6IGZ1bmMuZnVuY3Rpb25Bcm4sXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBCdWRnZXRCdWRkeSBMYW1iZGEgZnVuY3Rpb24gQVJOIGZvciAke25hbWV9IGhhbmRsZXIgbW9uaXRvcmluZyBhbmQgcGVybWlzc2lvbnNgLFxyXG4gICAgICAgIGV4cG9ydE5hbWU6IGBidWRnZXRidWRkeS0ke25hbWUudG9Mb3dlckNhc2UoKX0tYXJuYCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSB0YWdzIHRvIGVhY2ggTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnQ29tcG9uZW50JywgJ0FQSScpO1xyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ1NlcnZpY2UnLCAnTGFtYmRhJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnSGFuZGxlcicsIG5hbWUpO1xyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ1J1bnRpbWUnLCAnTm9kZUpTLTIwJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1Db21wdXRlJyk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19