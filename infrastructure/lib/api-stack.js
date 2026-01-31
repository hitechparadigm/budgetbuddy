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
                // Force deployment when Lambda integrations change
                description: `Deployment ${new Date().toISOString()}`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7R0FjRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCwrREFBaUQ7QUFLakQseURBQTJDO0FBQzNDLDJEQUE2QztBQWM3QyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQTBCckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQXBCMUI7OztXQUdHO1FBQ2EsY0FBUyxHQUF1QyxFQUFFLENBQUM7UUFrQmpFLHdEQUF3RDtRQUN4RCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDO1FBRTNELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFNUMseURBQXlEO1FBQ3pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdEUsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVqRCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXRCLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVEOzs7T0FHRztJQUNLLGlCQUFpQjtRQUN2QixPQUFPLElBQUksTUFBTSxD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LFFBQVEsQ0FBQyxDQUFDO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM5QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFqckJELDRCQWlyQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQVBJIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKlxyXG4gKiBDcmVhdGVzIEFQSSBHYXRld2F5IFJFU1QgQVBJIHdpdGggTGFtYmRhIGZ1bmN0aW9uIGludGVncmF0aW9ucyBmb3IgYWxsXHJcbiAqIGJhY2tlbmQgZnVuY3Rpb25hbGl0eS4gSW5jbHVkZXMgcHJvcGVyIENPUlMgY29uZmlndXJhdGlvbiwgYXV0aGVudGljYXRpb24sXHJcbiAqIGFuZCBlcnJvciBoYW5kbGluZyBmb3Igd2ViIGFuZCBtb2JpbGUgY2xpZW50cy5cclxuICpcclxuICogS2V5IEZlYXR1cmVzOlxyXG4gKiAtIFJFU1QgQVBJIHdpdGggcmVzb3VyY2UtYmFzZWQgcm91dGluZ1xyXG4gKiAtIExhbWJkYSBmdW5jdGlvbiBpbnRlZ3JhdGlvbnMgZm9yIGJ1c2luZXNzIGxvZ2ljXHJcbiAqIC0gQ29nbml0byBhdXRob3JpemVyIGZvciBwcm90ZWN0ZWQgZW5kcG9pbnRzXHJcbiAqIC0gQ09SUyBjb25maWd1cmF0aW9uIGZvciB3ZWIgY2xpZW50c1xyXG4gKiAtIFJlcXVlc3QvcmVzcG9uc2UgdmFsaWRhdGlvblxyXG4gKiAtIENsb3VkV2F0Y2ggbG9nZ2luZyBhbmQgbW9uaXRvcmluZ1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcblxyXG5kZWNsYXJlIGNvbnN0IHByb2Nlc3M6IGFueTtcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuLyoqXHJcbiAqIFByb3BzIGZvciB0aGUgQVBJIFN0YWNrXHJcbiAqIFJlcXVpcmVzIHJlc291cmNlcyBmcm9tIG90aGVyIHN0YWNrcyAoZGF0YWJhc2UgYW5kIGF1dGgpXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEFwaVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgdGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG4gIHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xyXG4gIGF1dGhPbmJvYXJkaW5nRnVuY3Rpb24/OiBsYW1iZGEuRnVuY3Rpb247IC8vIE9wdGlvbmFsIC0gZm9yIGdyYWR1YWwgcmVmYWN0b3JpbmdcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFwaVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAvKipcclxuICAgKiBBUEkgR2F0ZXdheSBSRVNUIEFQSVxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciBtb25pdG9yaW5nIHN0YWNrXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG5cclxuICAvKipcclxuICAgKiBMYW1iZGEgZnVuY3Rpb25zIGZvciBkaWZmZXJlbnQgYnVzaW5lc3MgZG9tYWluc1xyXG4gICAqIEV4cG9zZWQgZm9yIG1vbml0b3JpbmcgYW5kIGFkZGl0aW9uYWwgaW50ZWdyYXRpb25zXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGZ1bmN0aW9uczogeyBba2V5OiBzdHJpbmddOiBsYW1iZGEuRnVuY3Rpb24gfSA9IHt9O1xyXG5cclxuICAvKipcclxuICAgKiBMYW1iZGEgbGF5ZXJzIGZvciBzaGFyZWQgY29kZVxyXG4gICAqIEV4cG9zZWQgZm9yIHVzZSBpbiBvdGhlciBzdGFja3MgKGUuZy4sIG5vdGlmaWNhdGlvbiBzdGFjaylcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgY29tbW9uTGF5ZXI6IGxhbWJkYS5MYXllclZlcnNpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHNoYXJlZExheWVyOiBsYW1iZGEuTGF5ZXJWZXJzaW9uO1xyXG5cclxuICAvKipcclxuICAgKiBBdXRoIE9uYm9hcmRpbmcgTGFtYmRhIEZ1bmN0aW9uIChvcHRpb25hbClcclxuICAgKiBQYXJ0IG9mIGFyY2hpdGVjdHVyYWwgcmVmYWN0b3JpbmcgLSBzdGFuZGFsb25lIGZ1bmN0aW9uIGZvciBvbmJvYXJkaW5nXHJcbiAgICovXHJcbiAgcHJpdmF0ZSByZWFkb25seSBhdXRoT25ib2FyZGluZ0Z1bmN0aW9uPzogbGFtYmRhLkZ1bmN0aW9uO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBpU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLy8gU3RvcmUgYXV0aCBvbmJvYXJkaW5nIGZ1bmN0aW9uIGZvciB1c2UgaW4gcm91dGUgc2V0dXBcclxuICAgIHRoaXMuYXV0aE9uYm9hcmRpbmdGdW5jdGlvbiA9IHByb3BzLmF1dGhPbmJvYXJkaW5nRnVuY3Rpb247XHJcblxyXG4gICAgLy8gQ3JlYXRlIHNoYXJlZCBMYW1iZGEgbGF5ZXJzIGZvciBjb21tb24gZGVwZW5kZW5jaWVzXHJcbiAgICB0aGlzLmNvbW1vbkxheWVyID0gdGhpcy5jcmVhdGVDb21tb25MYXllcigpO1xyXG4gICAgdGhpcy5zaGFyZWRMYXllciA9IHRoaXMuY3JlYXRlU2hhcmVkTGF5ZXIoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZGlmZmVyZW50IGJ1c2luZXNzIGRvbWFpbnNcclxuICAgIHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb25zKHByb3BzLCB0aGlzLmNvbW1vbkxheWVyLCB0aGlzLnNoYXJlZExheWVyKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXkgd2l0aCBwcm9wZXIgY29uZmlndXJhdGlvblxyXG4gICAgdGhpcy5hcGkgPSB0aGlzLmNyZWF0ZUFwaUdhdGV3YXkocHJvcHMudXNlclBvb2wpO1xyXG5cclxuICAgIC8vIFNldCB1cCBBUEkgcm91dGVzIGFuZCBpbnRlZ3JhdGlvbnNcclxuICAgIHRoaXMuc2V0dXBBcGlSb3V0ZXMoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgb3V0cHV0cyBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIHRoaXMuY3JlYXRlT3V0cHV0cygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgTGFtYmRhIGxheWVyIHdpdGggY29tbW9uIGRlcGVuZGVuY2llc1xyXG4gICAqIFJlZHVjZXMgZGVwbG95bWVudCBwYWNrYWdlIHNpemVzIGFuZCBpbXByb3ZlcyBjb2xkIHN0YXJ0IHRpbWVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVDb21tb25MYXllcigpOiBsYW1iZGEuTGF5ZXJWZXJzaW9uIHtcclxuICAgIHJldHVybiBuZXcgbGFtYmRhLkxheWVyVmVyc2lvbih0aGlzLCAnQ29tbW9uTGF5ZXInLCB7XHJcbiAgICAgIGxheWVyVmVyc2lvbk5hbWU6ICdidWRnZXRidWRkeS1jb21tb24nLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvbGF5ZXJzL2NvbW1vbicpLFxyXG4gICAgICBjb21wYXRpYmxlUnVudGltZXM6IFtsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWF0sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29tbW9uIGRlcGVuZGVuY2llcyBhbmQgdXRpbGl0aWVzIGZvciBCdWRnZXRCdWRkeSBMYW1iZGEgZnVuY3Rpb25zIHRvIHJlZHVjZSBjb2xkIHN0YXJ0IHRpbWVzJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgTGFtYmRhIGxheWVyIHdpdGggc2hhcmVkIHV0aWxpdGllcyAoQ09SUywgdmFsaWRhdGlvbiwgZXRjLilcclxuICAgKiBQcm92aWRlcyByZXVzYWJsZSBjb2RlIGFjcm9zcyBhbGwgTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlU2hhcmVkTGF5ZXIoKTogbGFtYmRhLkxheWVyVmVyc2lvbiB7XHJcbiAgICByZXR1cm4gbmV3IGxhbWJkYS5MYXllclZlcnNpb24odGhpcywgJ1NoYXJlZExheWVyJywge1xyXG4gICAgICBsYXllclZlcnNpb25OYW1lOiAnYnVkZ2V0YnVkZHktc2hhcmVkJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2xheWVycy9zaGFyZWQnKSxcclxuICAgICAgY29tcGF0aWJsZVJ1bnRpbWVzOiBbbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1hdLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NoYXJlZCB1dGlsaXRpZXMgKENPUlMsIHZhbGlkYXRpb24sIHRva2VuIHBhcnNpbmcpIGZvciBCdWRnZXRCdWRkeSBMYW1iZGEgZnVuY3Rpb25zJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGFsbCBMYW1iZGEgZnVuY3Rpb25zIGZvciB0aGUgYXBwbGljYXRpb25cclxuICAgKiBFYWNoIGZ1bmN0aW9uIGhhbmRsZXMgYSBzcGVjaWZpYyBidXNpbmVzcyBkb21haW5cclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUxhbWJkYUZ1bmN0aW9ucyhwcm9wczogQXBpU3RhY2tQcm9wcywgY29tbW9uTGF5ZXI6IGxhbWJkYS5MYXllclZlcnNpb24sIHNoYXJlZExheWVyOiBsYW1iZGEuTGF5ZXJWZXJzaW9uKTogdm9pZCB7XHJcbiAgICAvLyBDb21tb24gZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBjb21tb25FbnZpcm9ubWVudCA9IHtcclxuICAgICAgVEFCTEVfTkFNRTogcHJvcHMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICBMT0dfTEVWRUw6ICdpbmZvJyxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ29tbW9uIExhbWJkYSBmdW5jdGlvbiBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBjb21tb25Qcm9wcyA9IHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLCAvLyBCYWxhbmNlZCBmb3IgY29zdCBhbmQgcGVyZm9ybWFuY2VcclxuICAgICAgbGF5ZXJzOiBbY29tbW9uTGF5ZXIsIHNoYXJlZExheWVyXSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSywgLy8gQ29zdCBvcHRpbWl6YXRpb25cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdXRoZW50aWNhdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSB1c2VyIHJlZ2lzdHJhdGlvbiwgbG9naW4sIGFuZCBwcm9maWxlIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBdXRoSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGgnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2F1dGgnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGF1dGhlbnRpY2F0aW9uIGhhbmRsZXIgZm9yIHVzZXIgcmVnaXN0cmF0aW9uLCBsb2dpbiwgYW5kIHByb2ZpbGUgbWFuYWdlbWVudCcsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLi4uY29tbW9uRW52aXJvbm1lbnQsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIENMSUVOVF9JRDogcHJvcHMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVkZ2V0IE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgYnVkZ2V0IENSVUQgb3BlcmF0aW9ucyBhbmQgY2FsY3VsYXRpb25zXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdCdWRnZXRIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYnVkZ2V0JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9idWRnZXQnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGJ1ZGdldCBoYW5kbGVyIGZvciBDUlVEIG9wZXJhdGlvbnMsIGNhdGVnb3JpZXMsIGFuZCB6ZXJvLWJhc2VkIGNhbGN1bGF0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyYW5zYWN0aW9uIE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgdHJhbnNhY3Rpb24gQ1JVRCBvcGVyYXRpb25zIGFuZCBidWRnZXQgdXBkYXRlc1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUcmFuc2FjdGlvbkhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS10cmFuc2FjdGlvbicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvdHJhbnNhY3Rpb25zJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSB0cmFuc2FjdGlvbiBoYW5kbGVyIGZvciBleHBlbnNlL2luY29tZSB0cmFja2luZyBhbmQgYXV0b21hdGljIGJ1ZGdldCB1cGRhdGVzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQUkgQnVkZ2V0IEdlbmVyYXRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgQUktcG93ZXJlZCBidWRnZXQgZ2VuZXJhdGlvbiB1c2luZyBBV1MgQmVkcm9ja1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5haUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1haScsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvYWknKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IEFJIGhhbmRsZXIgZm9yIHBlcnNvbmFsaXplZCBidWRnZXQgZ2VuZXJhdGlvbiB1c2luZyBBV1MgQmVkcm9jayBDbGF1ZGUgMy41JyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksIC8vIEFJIGNhbGxzIG1heSB0YWtlIGxvbmdlclxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIC4uLmNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEZhbWlseSBBY2NvdW50IE1hbmFnZW1lbnQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgZmFtaWx5IGNyZWF0aW9uLCBpbnZpdGF0aW9ucywgYW5kIG1lbWJlciBtYW5hZ2VtZW50XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmZhbWlseUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdGYW1pbHlIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktZmFtaWx5JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9mYW1pbHknKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGZhbWlseSBoYW5kbGVyIGZvciBzaGFyZWQgYWNjb3VudHMsIGludml0YXRpb25zLCBhbmQgbWVtYmVyIG1hbmFnZW1lbnQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQYXltZW50IGFuZCBTdWJzY3JpcHRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgU3RyaXBlIGludGVncmF0aW9uIGFuZCBzdWJzY3JpcHRpb24gbWFuYWdlbWVudFxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5wYXltZW50SGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BheW1lbnRIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktcGF5bWVudCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvcGF5bWVudCcpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgcGF5bWVudCBoYW5kbGVyIGZvciBTdHJpcGUgaW50ZWdyYXRpb24gYW5kIHN1YnNjcmlwdGlvbiBtYW5hZ2VtZW50JyxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25FbnZpcm9ubWVudCxcclxuICAgICAgICBTVFJJUEVfU0VDUkVUX0tFWTogcHJvY2Vzcy5lbnYuU1RSSVBFX1NFQ1JFVF9LRVkgfHwgJycsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEVtYWlsIGFuZCBOb3RpZmljYXRpb24gRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgU0VTIGVtYWlsIHNlbmRpbmcgYW5kIG5vdGlmaWNhdGlvbiBtYW5hZ2VtZW50XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmVtYWlsSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0VtYWlsSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWVtYWlsJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9lbWFpbCcpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgZW1haWwgaGFuZGxlciBmb3Igbm90aWZpY2F0aW9ucywgdGlwcyBkZWxpdmVyeSwgYW5kIGZhbWlseSBpbnZpdGF0aW9ucyB2aWEgU0VTJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGF0YSBFeHBvcnQgYW5kIEJhY2t1cCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBDU1YvUERGIGV4cG9ydCBhbmQgZGF0YSBiYWNrdXAgZnVuY3Rpb25hbGl0eVxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5leHBvcnRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRXhwb3J0SGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWV4cG9ydCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvZXhwb3J0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBleHBvcnQgaGFuZGxlciBmb3IgQ1NWL1BERiBleHBvcnQgYW5kIGRhdGEgYmFja3VwIGZ1bmN0aW9uYWxpdHknLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSwgLy8gRXhwb3J0IG9wZXJhdGlvbnMgbWF5IHRha2UgbG9uZ2VyIGZvciBsYXJnZSBkYXRhc2V0c1xyXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LCAvLyBNb3JlIG1lbW9yeSBmb3IgcHJvY2Vzc2luZyBsYXJnZSBkYXRhc2V0c1xyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEYXRhIFJlc3RvcmUgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgZGF0YSByZXN0b3JhdGlvbiBmcm9tIEpTT04gYmFja3Vwc1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5yZXN0b3JlSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Jlc3RvcmVIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktcmVzdG9yZScsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvcmVzdG9yZScpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgcmVzdG9yZSBoYW5kbGVyIGZvciBkYXRhIHJlc3RvcmF0aW9uIGZyb20gSlNPTiBiYWNrdXBzJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksIC8vIFJlc3RvcmUgb3BlcmF0aW9ucyBtYXkgdGFrZSBsb25nZXIgZm9yIGxhcmdlIGRhdGFzZXRzXHJcbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsIC8vIE1vcmUgbWVtb3J5IGZvciBwcm9jZXNzaW5nIGxhcmdlIGRhdGFzZXRzXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkbWluIERhc2hib2FyZCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBhZG1pbiBvcGVyYXRpb25zIGFuZCBhbmFseXRpY3NcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYWRtaW5IYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQWRtaW5IYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYWRtaW4nLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2FkbWluJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBhZG1pbiBoYW5kbGVyIGZvciBkYXNoYm9hcmQgb3BlcmF0aW9ucywgdXNlciBtYW5hZ2VtZW50LCBhbmQgYW5hbHl0aWNzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zIHRvIGFsbCBmdW5jdGlvbnNcclxuICAgIE9iamVjdC52YWx1ZXModGhpcy5mdW5jdGlvbnMpLmZvckVhY2goZnVuYyA9PiB7XHJcbiAgICAgIHByb3BzLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IGFkZGl0aW9uYWwgcGVybWlzc2lvbnMgZm9yIHNwZWNpZmljIGZ1bmN0aW9uc1xyXG4gICAgdGhpcy5ncmFudEFkZGl0aW9uYWxQZXJtaXNzaW9ucygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgYWRkaXRpb25hbCBBV1Mgc2VydmljZSBwZXJtaXNzaW9ucyB0byBzcGVjaWZpYyBmdW5jdGlvbnNcclxuICAgKi9cclxuICBwcml2YXRlIGdyYW50QWRkaXRpb25hbFBlcm1pc3Npb25zKCk6IHZvaWQge1xyXG4gICAgLy8gQXV0aCBIYW5kbGVyIG5lZWRzIENvZ25pdG8gcGVybWlzc2lvbnNcclxuICAgIHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjb2duaXRvLWlkcDpTaWduVXAnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpJbml0aWF0ZUF1dGgnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpDb25maXJtU2lnblVwJyxcclxuICAgICAgICAnY29nbml0by1pZHA6Rm9yZ290UGFzc3dvcmQnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpDb25maXJtRm9yZ290UGFzc3dvcmQnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpHZXRVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6VXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyUGFzc3dvcmQnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkRlbGV0ZVVzZXInLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBDb2duaXRvIHBlcm1pc3Npb25zIGFyZSB0eXBpY2FsbHkgYnJvYWQgZm9yIHVzZXIgcG9vbCBvcGVyYXRpb25zXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQUkgSGFuZGxlciBuZWVkcyBCZWRyb2NrIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5haUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gQmVkcm9jayBtb2RlbHMgZG9uJ3QgaGF2ZSBzcGVjaWZpYyBBUk5zXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gRW1haWwgSGFuZGxlciBuZWVkcyBTRVMgcGVybWlzc2lvbnNcclxuICAgIHRoaXMuZnVuY3Rpb25zLmVtYWlsSGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnc2VzOlNlbmRFbWFpbCcsXHJcbiAgICAgICAgJ3NlczpTZW5kUmF3RW1haWwnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBTRVMgcGVybWlzc2lvbnMgYXJlIHR5cGljYWxseSBicm9hZFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIFBheW1lbnQgSGFuZGxlciBuZWVkcyBhZGRpdGlvbmFsIGxvZ2dpbmcgZm9yIHdlYmhvb2sgZGVidWdnaW5nXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5wYXltZW50SGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcclxuICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIEFQSSBHYXRld2F5IFJFU1QgQVBJIHdpdGggcHJvcGVyIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUFwaUdhdGV3YXkodXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2wpOiBhcGlnYXRld2F5LlJlc3RBcGkge1xyXG4gICAgLy8gQ3JlYXRlIENvZ25pdG8gYXV0aG9yaXplciBmb3IgcHJvdGVjdGVkIGVuZHBvaW50c1xyXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyKHRoaXMsICdCdWRnZXRCdWRkeUF1dGhvcml6ZXInLCB7XHJcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFt1c2VyUG9vbF0sXHJcbiAgICAgIGF1dGhvcml6ZXJOYW1lOiAnYnVkZ2V0YnVkZHktYXV0aG9yaXplcicsXHJcbiAgICAgIGlkZW50aXR5U291cmNlOiAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBSRVNUIEFQSVxyXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnQnVkZ2V0QnVkZHlBcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiAnYnVkZ2V0YnVkZHktYXBpJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBSRVNUIEFQSSBmb3Igd2ViIGFuZCBtb2JpbGUgY2xpZW50cyB3aXRoIHNlcnZlcmxlc3MgTGFtYmRhIGJhY2tlbmQnLFxyXG5cclxuICAgICAgLy8gRW5hYmxlIENPUlMgZm9yIHdlYiBjbGllbnRzXHJcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogW1xyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIC8vIExvY2FsIGRldmVsb3BtZW50XHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDo1MTczJywgLy8gVml0ZSBkZXYgc2VydmVyXHJcbiAgICAgICAgICAnaHR0cHM6Ly9kMXVlZXVnbjl6Y3g3bi5jbG91ZGZyb250Lm5ldCcsIC8vIENsb3VkRnJvbnQgd2ViIGFwcFxyXG4gICAgICAgICAgJ2h0dHBzOi8vZDJ1Ymh4MmExM3M3Z2MuY2xvdWRmcm9udC5uZXQnLCAvLyBDbG91ZEZyb250IGFkbWluIGRhc2hib2FyZFxyXG4gICAgICAgICAgJ2h0dHBzOi8vYXBwLmJ1ZGdldGJ1ZGR5LmNvbScsIC8vIFByb2R1Y3Rpb24gd2ViIGFwcCAoY3VzdG9tIGRvbWFpbilcclxuICAgICAgICAgICdodHRwczovL2FkbWluLmJ1ZGdldGJ1ZGR5LmNvbScsIC8vIEFkbWluIGRhc2hib2FyZCAoY3VzdG9tIGRvbWFpbilcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogWydHRVQnLCAnUE9TVCcsICdQVVQnLCAnREVMRVRFJywgJ09QVElPTlMnXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICAgJ1gtQW16LURhdGUnLFxyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgJ1gtQXBpLUtleScsXHJcbiAgICAgICAgICAnWC1BbXotU2VjdXJpdHktVG9rZW4nLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEFQSSBHYXRld2F5IGNvbmZpZ3VyYXRpb25cclxuICAgICAgZGVwbG95T3B0aW9uczoge1xyXG4gICAgICAgIHN0YWdlTmFtZTogJ3YxJyxcclxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXHJcbiAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBtZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAvLyBGb3JjZSBkZXBsb3ltZW50IHdoZW4gTGFtYmRhIGludGVncmF0aW9ucyBjaGFuZ2VcclxuICAgICAgICBkZXNjcmlwdGlvbjogYERlcGxveW1lbnQgJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9YCxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEJpbmFyeSBtZWRpYSB0eXBlcyBmb3IgZmlsZSB1cGxvYWRzIChmdXR1cmUgZmVhdHVyZSlcclxuICAgICAgYmluYXJ5TWVkaWFUeXBlczogWydtdWx0aXBhcnQvZm9ybS1kYXRhJ10sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdG9yZSBhdXRob3JpemVyIGZvciB1c2UgaW4gcm91dGUgc2V0dXBcclxuICAgIChhcGkgYXMgYW55KS5hdXRob3JpemVyID0gYXV0aG9yaXplcjtcclxuXHJcbiAgICByZXR1cm4gYXBpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IHVwIGFsbCBBUEkgcm91dGVzIGFuZCBMYW1iZGEgaW50ZWdyYXRpb25zXHJcbiAgICogT3JnYW5pemVzIGVuZHBvaW50cyBieSBidXNpbmVzcyBkb21haW5cclxuICAgKi9cclxuICBwcml2YXRlIHNldHVwQXBpUm91dGVzKCk6IHZvaWQge1xyXG4gICAgY29uc3QgYXV0aG9yaXplciA9ICh0aGlzLmFwaSBhcyBhbnkpLmF1dGhvcml6ZXI7XHJcblxyXG4gICAgLy8gSGVhbHRoIGNoZWNrIGVuZHBvaW50cyAocHVibGljLCBubyBhdXRoIHJlcXVpcmVkKVxyXG4gICAgY29uc3QgaGVhbHRoUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGlvbiByb3V0ZXMgKHB1YmxpYylcclxuICAgIGNvbnN0IGF1dGhSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKTtcclxuXHJcbiAgICAvLyBVc2VyIHJlZ2lzdHJhdGlvblxyXG4gICAgY29uc3QgcmVnaXN0ZXJSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKTtcclxuICAgIHJlZ2lzdGVyUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdSZWdpc3RlclVzZXInLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVXNlciBsb2dpblxyXG4gICAgY29uc3QgbG9naW5SZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbG9naW4nKTtcclxuICAgIGxvZ2luUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdMb2dpblVzZXInLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRW1haWwgY29uZmlybWF0aW9uXHJcbiAgICBjb25zdCBjb25maXJtUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2NvbmZpcm0nKTtcclxuICAgIGNvbmZpcm1SZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NvbmZpcm1FbWFpbCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGb3Jnb3QgcGFzc3dvcmRcclxuICAgIGNvbnN0IGZvcmdvdFBhc3N3b3JkUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2ZvcmdvdC1wYXNzd29yZCcpO1xyXG4gICAgZm9yZ290UGFzc3dvcmRSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0ZvcmdvdFBhc3N3b3JkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlc2V0IHBhc3N3b3JkXHJcbiAgICBjb25zdCByZXNldFBhc3N3b3JkUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3Jlc2V0LXBhc3N3b3JkJyk7XHJcbiAgICByZXNldFBhc3N3b3JkUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdSZXNldFBhc3N3b3JkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgcHJvZmlsZSAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgcHJvZmlsZVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdwcm9maWxlJyk7XHJcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldFByb2ZpbGUnLFxyXG4gICAgfSk7XHJcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZVByb2ZpbGUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aCBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IGF1dGhIZWFsdGhSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBhdXRoSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0F1dGhIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZW9sb2NhdGlvbiBlbmRwb2ludCAocHVibGljKVxyXG4gICAgY29uc3QgZ2VvbG9jYXRpb25SZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZ2VvbG9jYXRpb24nKTtcclxuICAgIGdlb2xvY2F0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEdlb2xvY2F0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE9uYm9hcmRpbmcgZW5kcG9pbnQgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IG9uYm9hcmRpbmdSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnb25ib2FyZGluZycpO1xyXG4gICAgLy8gVXNlIG5ldyBzdGFuZGFsb25lIExhbWJkYSBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSBmYWxsIGJhY2sgdG8gbW9ub2xpdGhpYyBoYW5kbGVyXHJcbiAgICBjb25zdCBvbmJvYXJkaW5nSGFuZGxlciA9IHRoaXMuYXV0aE9uYm9hcmRpbmdGdW5jdGlvbiB8fCB0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlcjtcclxuXHJcbiAgICAvLyBMb2cgd2hpY2ggaGFuZGxlciBpcyBiZWluZyB1c2VkIGZvciBkZWJ1Z2dpbmdcclxuICAgIGlmICh0aGlzLmF1dGhPbmJvYXJkaW5nRnVuY3Rpb24pIHtcclxuICAgICAgY29uc29sZS5sb2coJ+KchSBVc2luZyBzdGFuZGFsb25lIGF1dGgtb25ib2FyZGluZyBMYW1iZGEgZm9yIC9hdXRoL29uYm9hcmRpbmcgZW5kcG9pbnQnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCfimqDvuI8gIFVzaW5nIG1vbm9saXRoaWMgYXV0aCBMYW1iZGEgZm9yIC9hdXRoL29uYm9hcmRpbmcgZW5kcG9pbnQgKGZhbGxiYWNrKScpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uYm9hcmRpbmdSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihvbmJvYXJkaW5nSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NvbXBsZXRlT25ib2FyZGluZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHb29nbGUgU2lnbi1JbiBlbmRwb2ludCAocHVibGljKVxyXG4gICAgY29uc3QgZ29vZ2xlUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2dvb2dsZScpO1xyXG4gICAgZ29vZ2xlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHb29nbGVTaWduSW4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVXNlciBwcm9maWxlIHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgdXNlcnNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXJzJyk7XHJcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRVc2VyUHJvZmlsZScsXHJcbiAgICB9KTtcclxuICAgIHVzZXJzUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZVVzZXJQcm9maWxlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1ZGdldCByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IGJ1ZGdldFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYnVkZ2V0Jyk7XHJcbiAgICBidWRnZXRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRCdWRnZXRzJyxcclxuICAgIH0pO1xyXG4gICAgYnVkZ2V0UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuICAgIGJ1ZGdldFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgY3VycmVudCBtb250aCBlbmRwb2ludFxyXG4gICAgY29uc3QgYnVkZ2V0Q3VycmVudFJlc291cmNlID0gYnVkZ2V0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2N1cnJlbnQnKTtcclxuICAgIGJ1ZGdldEN1cnJlbnRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRDdXJyZW50QnVkZ2V0JyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1ZGdldCBieSBJRCBlbmRwb2ludFxyXG4gICAgY29uc3QgYnVkZ2V0SWRSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCd7YnVkZ2V0SWR9Jyk7XHJcbiAgICBidWRnZXRJZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEJ1ZGdldEJ5SWQnLFxyXG4gICAgfSk7XHJcbiAgICBidWRnZXRJZFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZUJ1ZGdldEJ5SWQnLFxyXG4gICAgfSk7XHJcbiAgICBidWRnZXRJZFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0RlbGV0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBidWRnZXRIZWFsdGhSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGJ1ZGdldEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0J1ZGdldEhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1ZGdldCBjYXRlZ29yaWVzIHJvdXRlc1xyXG4gICAgY29uc3QgY2F0ZWdvcmllc1Jlc291cmNlID0gYnVkZ2V0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2NhdGVnb3JpZXMnKTtcclxuICAgIGNhdGVnb3JpZXNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRDYXRlZ29yaWVzJyxcclxuICAgIH0pO1xyXG4gICAgY2F0ZWdvcmllc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVDYXRlZ29yeScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSBidWRnZXQgZ2VuZXJhdGlvbiByb3V0ZXNcclxuICAgIGNvbnN0IGFpUmVzb3VyY2UgPSBidWRnZXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnYWktZ2VuZXJhdGUnKTtcclxuICAgIGFpUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2VuZXJhdGVBSUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcmFuc2FjdGlvbiByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgndHJhbnNhY3Rpb25zJyk7XHJcbiAgICB0cmFuc2FjdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldFRyYW5zYWN0aW9ucycsXHJcbiAgICB9KTtcclxuICAgIHRyYW5zYWN0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluZGl2aWR1YWwgdHJhbnNhY3Rpb24gcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCB0cmFuc2FjdGlvblJlc291cmNlID0gdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3t0cmFuc2FjdGlvbklkfScpO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldFRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG4gICAgdHJhbnNhY3Rpb25SZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0RlbGV0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRyYW5zYWN0aW9ucyBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uc0hlYWx0aFJlc291cmNlID0gdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgdHJhbnNhY3Rpb25zSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdUcmFuc2FjdGlvbnNIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGYW1pbHkgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBmYW1pbHlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2ZhbWlseScpO1xyXG4gICAgZmFtaWx5UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5mYW1pbHlIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0RmFtaWx5JyxcclxuICAgIH0pO1xyXG4gICAgZmFtaWx5UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZmFtaWx5SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUZhbWlseScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEYXRhIEV4cG9ydCByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IGV4cG9ydFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnZXhwb3J0Jyk7XHJcbiAgICBleHBvcnRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmV4cG9ydEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdFeHBvcnREYXRhJyxcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1UeXBlJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1EaXNwb3NpdGlvbic6IHRydWUsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGF0YSBSZXN0b3JlIHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgcmVzdG9yZVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncmVzdG9yZScpO1xyXG4gICAgcmVzdG9yZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnJlc3RvcmVIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnUmVzdG9yZURhdGEnLFxyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGYW1pbHkgaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBmYW1pbHlIZWFsdGhSZXNvdXJjZSA9IGZhbWlseVJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGZhbWlseUhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZmFtaWx5SGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0ZhbWlseUhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBheW1lbnQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBwYXltZW50c1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGF5bWVudHMnKTtcclxuICAgIHBheW1lbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVTdWJzY3JpcHRpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUGF5bWVudCBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IHBheW1lbnRIZWFsdGhSZXNvdXJjZSA9IHBheW1lbnRzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgcGF5bWVudEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdQYXltZW50SGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gV2ViaG9vayByb3V0ZXMgKHB1YmxpYywgYnV0IHZhbGlkYXRlZCBieSBTdHJpcGUpXHJcbiAgICBjb25zdCB3ZWJob29rc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnd2ViaG9va3MnKTtcclxuICAgIGNvbnN0IHN0cmlwZVdlYmhvb2sgPSB3ZWJob29rc1Jlc291cmNlLmFkZFJlc291cmNlKCdzdHJpcGUnKTtcclxuICAgIHN0cmlwZVdlYmhvb2suYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdTdHJpcGVXZWJob29rJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkbWluIHJvdXRlcyAocHJvdGVjdGVkIHdpdGggYWRkaXRpb25hbCByb2xlIGNoZWNraW5nKVxyXG4gICAgY29uc3QgYWRtaW5SZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FkbWluJyk7XHJcbiAgICBhZG1pblJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWRtaW5IYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QWRtaW5EYXNoYm9hcmQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRtaW4gaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBhZG1pbkhlYWx0aFJlc291cmNlID0gYWRtaW5SZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBhZG1pbkhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWRtaW5IYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQWRtaW5IZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbWFpbCByb3V0ZXMgKHB1YmxpYyBmb3Igd2ViaG9va3MsIHByb3RlY3RlZCBmb3Igc2VuZGluZylcclxuICAgIGNvbnN0IGVtYWlsUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdlbWFpbCcpO1xyXG4gICAgY29uc3QgZW1haWxIZWFsdGhSZXNvdXJjZSA9IGVtYWlsUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgZW1haWxIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmVtYWlsSGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0VtYWlsSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQUkgcm91dGVzIChzZXBhcmF0ZSBmcm9tIGJ1ZGdldCBmb3IgaGVhbHRoIGNoZWNrcylcclxuICAgIGNvbnN0IGFpUm9vdFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYWknKTtcclxuICAgIGNvbnN0IGFpSGVhbHRoUmVzb3VyY2UgPSBhaVJvb3RSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBhaUhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQUlIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBDbG91ZEZvcm1hdGlvbiBvdXRwdXRzIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlT3V0cHV0cygpOiB2b2lkIHtcclxuICAgIC8vIEFQSSBHYXRld2F5IFVSTCBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS51cmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMIGZvciBCdWRnZXRCdWRkeSBjbGllbnQgYXBwbGljYXRpb25zICh3ZWIsIG1vYmlsZSwgYWRtaW4pJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaS11cmwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIEdhdGV3YXkgSUQgZm9yIG1vbml0b3JpbmdcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXBpLnJlc3RBcGlJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBJRCBmb3IgQnVkZ2V0QnVkZHkgbW9uaXRvcmluZyBhbmQgQ2xvdWRXYXRjaCBpbnRlZ3JhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hcGktaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIEFSTnMgZm9yIG1vbml0b3JpbmdcclxuICAgIE9iamVjdC5lbnRyaWVzKHRoaXMuZnVuY3Rpb25zKS5mb3JFYWNoKChbbmFtZSwgZnVuY10pID0+IHtcclxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYCR7bmFtZX1Bcm5gLCB7XHJcbiAgICAgICAgdmFsdWU6IGZ1bmMuZnVuY3Rpb25Bcm4sXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBCdWRnZXRCdWRkeSBMYW1iZGEgZnVuY3Rpb24gQVJOIGZvciAke25hbWV9IGhhbmRsZXIgbW9uaXRvcmluZyBhbmQgcGVybWlzc2lvbnNgLFxyXG4gICAgICAgIGV4cG9ydE5hbWU6IGBidWRnZXRidWRkeS0ke25hbWUudG9Mb3dlckNhc2UoKX0tYXJuYCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSB0YWdzIHRvIGVhY2ggTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnQ29tcG9uZW50JywgJ0FQSScpO1xyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ1NlcnZpY2UnLCAnTGFtYmRhJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnSGFuZGxlcicsIG5hbWUpO1xyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ1J1bnRpbWUnLCAnTm9kZUpTLTIwJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1Db21wdXRlJyk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19