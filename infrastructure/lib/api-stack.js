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
                    'https://app.budgetbuddy.com', // Production web app
                    'https://admin.budgetbuddy.com', // Admin dashboard
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
            operationName: 'GetBudget',
        });
        budgetResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'CreateBudget',
        });
        budgetResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
            authorizer,
            operationName: 'UpdateBudget',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7R0FjRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCwrREFBaUQ7QUFLakQseURBQTJDO0FBQzNDLDJEQUE2QztBQWE3QyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQWFyQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW9CO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBUDFCOzs7V0FHRztRQUNhLGNBQVMsR0FBdUMsRUFBRSxDQUFDO1FBS2pFLHFEQUFxRDtRQUNyRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUU3Qyx5REFBeUQ7UUFDekQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztRQUUvQywrQ0FBK0M7UUFDL0MsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRWpELHFDQUFxQztRQUNyQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFdEIsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssaUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDbEQsZ0JBQWdCLEVBQUUsb0JBQW9CO1lBQ3RDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQztZQUN2RCxrQkFBa0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFP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U0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUN0RCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxLQUFLLEVBQUU7Z0JBQ3BDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVztnQkFDdkIsV0FBVyxFQUFFLHVDQUF1QyxJQUFJLHFDQUFxQztnQkFDN0YsVUFBVSxFQUFFLGVBQWUsSUFBSSxDQUFDLFdBQVcsRUFBRSxNQUFNO2FBQ3BELENBQUMsQ0FBQztZQUVILGlEQUFpRDtZQUNqRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0MsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzlDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUM3RCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWxoQkQsNEJBa2hCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBUEkgU3RhY2sgZm9yIEJ1ZGdldEJ1ZGR5IEFwcGxpY2F0aW9uXHJcbiAqXHJcbiAqIENyZWF0ZXMgQVBJIEdhdGV3YXkgUkVTVCBBUEkgd2l0aCBMYW1iZGEgZnVuY3Rpb24gaW50ZWdyYXRpb25zIGZvciBhbGxcclxuICogYmFja2VuZCBmdW5jdGlvbmFsaXR5LiBJbmNsdWRlcyBwcm9wZXIgQ09SUyBjb25maWd1cmF0aW9uLCBhdXRoZW50aWNhdGlvbixcclxuICogYW5kIGVycm9yIGhhbmRsaW5nIGZvciB3ZWIgYW5kIG1vYmlsZSBjbGllbnRzLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gUkVTVCBBUEkgd2l0aCByZXNvdXJjZS1iYXNlZCByb3V0aW5nXHJcbiAqIC0gTGFtYmRhIGZ1bmN0aW9uIGludGVncmF0aW9ucyBmb3IgYnVzaW5lc3MgbG9naWNcclxuICogLSBDb2duaXRvIGF1dGhvcml6ZXIgZm9yIHByb3RlY3RlZCBlbmRwb2ludHNcclxuICogLSBDT1JTIGNvbmZpZ3VyYXRpb24gZm9yIHdlYiBjbGllbnRzXHJcbiAqIC0gUmVxdWVzdC9yZXNwb25zZSB2YWxpZGF0aW9uXHJcbiAqIC0gQ2xvdWRXYXRjaCBsb2dnaW5nIGFuZCBtb25pdG9yaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuXHJcbmRlY2xhcmUgY29uc3QgcHJvY2VzczogYW55O1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG4vKipcclxuICogUHJvcHMgZm9yIHRoZSBBUEkgU3RhY2tcclxuICogUmVxdWlyZXMgcmVzb3VyY2VzIGZyb20gb3RoZXIgc3RhY2tzIChkYXRhYmFzZSBhbmQgYXV0aClcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBcGlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqXHJcbiAgICogQVBJIEdhdGV3YXkgUkVTVCBBUElcclxuICAgKiBFeHBvc2VkIGFzIHB1YmxpYyBwcm9wZXJ0eSBmb3IgbW9uaXRvcmluZyBzdGFja1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcclxuXHJcbiAgLyoqXHJcbiAgICogTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZGlmZmVyZW50IGJ1c2luZXNzIGRvbWFpbnNcclxuICAgKiBFeHBvc2VkIGZvciBtb25pdG9yaW5nIGFuZCBhZGRpdGlvbmFsIGludGVncmF0aW9uc1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBmdW5jdGlvbnM6IHsgW2tleTogc3RyaW5nXTogbGFtYmRhLkZ1bmN0aW9uIH0gPSB7fTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBzaGFyZWQgTGFtYmRhIGxheWVyIGZvciBjb21tb24gZGVwZW5kZW5jaWVzXHJcbiAgICBjb25zdCBjb21tb25MYXllciA9IHRoaXMuY3JlYXRlQ29tbW9uTGF5ZXIoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZGlmZmVyZW50IGJ1c2luZXNzIGRvbWFpbnNcclxuICAgIHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb25zKHByb3BzLCBjb21tb25MYXllcik7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFQSSBHYXRld2F5IHdpdGggcHJvcGVyIGNvbmZpZ3VyYXRpb25cclxuICAgIHRoaXMuYXBpID0gdGhpcy5jcmVhdGVBcGlHYXRld2F5KHByb3BzLnVzZXJQb29sKTtcclxuXHJcbiAgICAvLyBTZXQgdXAgQVBJIHJvdXRlcyBhbmQgaW50ZWdyYXRpb25zXHJcbiAgICB0aGlzLnNldHVwQXBpUm91dGVzKCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIG91dHB1dHMgZm9yIGNsaWVudCBjb25maWd1cmF0aW9uXHJcbiAgICB0aGlzLmNyZWF0ZU91dHB1dHMoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIExhbWJkYSBsYXllciB3aXRoIGNvbW1vbiBkZXBlbmRlbmNpZXNcclxuICAgKiBSZWR1Y2VzIGRlcGxveW1lbnQgcGFja2FnZSBzaXplcyBhbmQgaW1wcm92ZXMgY29sZCBzdGFydCB0aW1lc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlQ29tbW9uTGF5ZXIoKTogbGFtYmRhLkxheWVyVmVyc2lvbiB7XHJcbiAgICByZXR1cm4gbmV3IGxhbWJkYS5MYXllclZlcnNpb24odGhpcywgJ0NvbW1vbkxheWVyJywge1xyXG4gICAgICBsYXllclZlcnNpb25OYW1lOiAnYnVkZ2V0YnVkZHktY29tbW9uJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2xheWVycy9jb21tb24nKSxcclxuICAgICAgY29tcGF0aWJsZVJ1bnRpbWVzOiBbbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1hdLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvbW1vbiBkZXBlbmRlbmNpZXMgYW5kIHV0aWxpdGllcyBmb3IgQnVkZ2V0QnVkZHkgTGFtYmRhIGZ1bmN0aW9ucyB0byByZWR1Y2UgY29sZCBzdGFydCB0aW1lcycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhbGwgTGFtYmRhIGZ1bmN0aW9ucyBmb3IgdGhlIGFwcGxpY2F0aW9uXHJcbiAgICogRWFjaCBmdW5jdGlvbiBoYW5kbGVzIGEgc3BlY2lmaWMgYnVzaW5lc3MgZG9tYWluXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVMYW1iZGFGdW5jdGlvbnMocHJvcHM6IEFwaVN0YWNrUHJvcHMsIGNvbW1vbkxheWVyOiBsYW1iZGEuTGF5ZXJWZXJzaW9uKTogdm9pZCB7XHJcbiAgICAvLyBDb21tb24gZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBjb21tb25FbnZpcm9ubWVudCA9IHtcclxuICAgICAgVEFCTEVfTkFNRTogcHJvcHMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICBMT0dfTEVWRUw6ICdpbmZvJyxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ29tbW9uIExhbWJkYSBmdW5jdGlvbiBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBjb21tb25Qcm9wcyA9IHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLCAvLyBCYWxhbmNlZCBmb3IgY29zdCBhbmQgcGVyZm9ybWFuY2VcclxuICAgICAgbGF5ZXJzOiBbY29tbW9uTGF5ZXJdLFxyXG4gICAgICBlbnZpcm9ubWVudDogY29tbW9uRW52aXJvbm1lbnQsXHJcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLCAvLyBDb3N0IG9wdGltaXphdGlvblxyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEF1dGhlbnRpY2F0aW9uIEZ1bmN0aW9uc1xyXG4gICAgICogSGFuZGxlIHVzZXIgcmVnaXN0cmF0aW9uLCBsb2dpbiwgYW5kIHByb2ZpbGUgbWFuYWdlbWVudFxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYXV0aCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvYXV0aCcpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgYXV0aGVudGljYXRpb24gaGFuZGxlciBmb3IgdXNlciByZWdpc3RyYXRpb24sIGxvZ2luLCBhbmQgcHJvZmlsZSBtYW5hZ2VtZW50JyxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25FbnZpcm9ubWVudCxcclxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgQ0xJRU5UX0lEOiBwcm9wcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCdWRnZXQgTWFuYWdlbWVudCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBidWRnZXQgQ1JVRCBvcGVyYXRpb25zIGFuZCBjYWxjdWxhdGlvbnNcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0J1ZGdldEhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1idWRnZXQnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2J1ZGdldCcpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgYnVkZ2V0IGhhbmRsZXIgZm9yIENSVUQgb3BlcmF0aW9ucywgY2F0ZWdvcmllcywgYW5kIHplcm8tYmFzZWQgY2FsY3VsYXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVHJhbnNhY3Rpb24gTWFuYWdlbWVudCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSB0cmFuc2FjdGlvbiBDUlVEIG9wZXJhdGlvbnMgYW5kIGJ1ZGdldCB1cGRhdGVzXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1RyYW5zYWN0aW9uSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LXRyYW5zYWN0aW9uJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy90cmFuc2FjdGlvbnMnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IHRyYW5zYWN0aW9uIGhhbmRsZXIgZm9yIGV4cGVuc2UvaW5jb21lIHRyYWNraW5nIGFuZCBhdXRvbWF0aWMgYnVkZ2V0IHVwZGF0ZXMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBSSBCdWRnZXQgR2VuZXJhdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBBSS1wb3dlcmVkIGJ1ZGdldCBnZW5lcmF0aW9uIHVzaW5nIEFXUyBCZWRyb2NrXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmFpSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWFpJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9haScpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgQUkgaGFuZGxlciBmb3IgcGVyc29uYWxpemVkIGJ1ZGdldCBnZW5lcmF0aW9uIHVzaW5nIEFXUyBCZWRyb2NrIENsYXVkZSAzLjUnLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSwgLy8gQUkgY2FsbHMgbWF5IHRha2UgbG9uZ2VyXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLi4uY29tbW9uRW52aXJvbm1lbnQsXHJcbiAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogJ2FudGhyb3BpYy5jbGF1ZGUtMy01LXNvbm5ldC0yMDI0MTAyMi12MjowJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmFtaWx5IEFjY291bnQgTWFuYWdlbWVudCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBmYW1pbHkgY3JlYXRpb24sIGludml0YXRpb25zLCBhbmQgbWVtYmVyIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuZmFtaWx5SGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0ZhbWlseUhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1mYW1pbHknLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2ZhbWlseScpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgZmFtaWx5IGhhbmRsZXIgZm9yIHNoYXJlZCBhY2NvdW50cywgaW52aXRhdGlvbnMsIGFuZCBtZW1iZXIgbWFuYWdlbWVudCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFBheW1lbnQgYW5kIFN1YnNjcmlwdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBTdHJpcGUgaW50ZWdyYXRpb24gYW5kIHN1YnNjcmlwdGlvbiBtYW5hZ2VtZW50XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGF5bWVudEhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1wYXltZW50JyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9wYXltZW50JyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBwYXltZW50IGhhbmRsZXIgZm9yIFN0cmlwZSBpbnRlZ3JhdGlvbiBhbmQgc3Vic2NyaXB0aW9uIG1hbmFnZW1lbnQnLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIC4uLmNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICAgIFNUUklQRV9TRUNSRVRfS0VZOiBwcm9jZXNzLmVudi5TVFJJUEVfU0VDUkVUX0tFWSB8fCAnJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRW1haWwgYW5kIE5vdGlmaWNhdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBTRVMgZW1haWwgc2VuZGluZyBhbmQgbm90aWZpY2F0aW9uIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuZW1haWxIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRW1haWxIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktZW1haWwnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2VtYWlsJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBlbWFpbCBoYW5kbGVyIGZvciBub3RpZmljYXRpb25zLCB0aXBzIGRlbGl2ZXJ5LCBhbmQgZmFtaWx5IGludml0YXRpb25zIHZpYSBTRVMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZG1pbiBEYXNoYm9hcmQgRnVuY3Rpb25zXHJcbiAgICAgKiBIYW5kbGUgYWRtaW4gb3BlcmF0aW9ucyBhbmQgYW5hbHl0aWNzXHJcbiAgICAgKi9cclxuICAgIHRoaXMuZnVuY3Rpb25zLmFkbWluSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FkbWluSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWFkbWluJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9hZG1pbicpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgYWRtaW4gaGFuZGxlciBmb3IgZGFzaGJvYXJkIG9wZXJhdGlvbnMsIHVzZXIgbWFuYWdlbWVudCwgYW5kIGFuYWx5dGljcycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9ucyB0byBhbGwgZnVuY3Rpb25zXHJcbiAgICBPYmplY3QudmFsdWVzKHRoaXMuZnVuY3Rpb25zKS5mb3JFYWNoKGZ1bmMgPT4ge1xyXG4gICAgICBwcm9wcy50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBhZGRpdGlvbmFsIHBlcm1pc3Npb25zIGZvciBzcGVjaWZpYyBmdW5jdGlvbnNcclxuICAgIHRoaXMuZ3JhbnRBZGRpdGlvbmFsUGVybWlzc2lvbnMoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IGFkZGl0aW9uYWwgQVdTIHNlcnZpY2UgcGVybWlzc2lvbnMgdG8gc3BlY2lmaWMgZnVuY3Rpb25zXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBncmFudEFkZGl0aW9uYWxQZXJtaXNzaW9ucygpOiB2b2lkIHtcclxuICAgIC8vIEF1dGggSGFuZGxlciBuZWVkcyBDb2duaXRvIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6U2lnblVwJyxcclxuICAgICAgICAnY29nbml0by1pZHA6SW5pdGlhdGVBdXRoJyxcclxuICAgICAgICAnY29nbml0by1pZHA6Q29uZmlybVNpZ25VcCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkZvcmdvdFBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6Q29uZmlybUZvcmdvdFBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6R2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOlVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5VcGRhdGVVc2VyQXR0cmlidXRlcycsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIENvZ25pdG8gcGVybWlzc2lvbnMgYXJlIHR5cGljYWxseSBicm9hZCBmb3IgdXNlciBwb29sIG9wZXJhdGlvbnNcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBBSSBIYW5kbGVyIG5lZWRzIEJlZHJvY2sgcGVybWlzc2lvbnNcclxuICAgIHRoaXMuZnVuY3Rpb25zLmFpSGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXHJcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBCZWRyb2NrIG1vZGVscyBkb24ndCBoYXZlIHNwZWNpZmljIEFSTnNcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBFbWFpbCBIYW5kbGVyIG5lZWRzIFNFUyBwZXJtaXNzaW9uc1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuZW1haWxIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzZXM6U2VuZEVtYWlsJyxcclxuICAgICAgICAnc2VzOlNlbmRSYXdFbWFpbCcsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIFNFUyBwZXJtaXNzaW9ucyBhcmUgdHlwaWNhbGx5IGJyb2FkXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gUGF5bWVudCBIYW5kbGVyIG5lZWRzIGFkZGl0aW9uYWwgbG9nZ2luZyBmb3Igd2ViaG9vayBkZWJ1Z2dpbmdcclxuICAgIHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxyXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICB9KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgQVBJIEdhdGV3YXkgUkVTVCBBUEkgd2l0aCBwcm9wZXIgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlQXBpR2F0ZXdheSh1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbCk6IGFwaWdhdGV3YXkuUmVzdEFwaSB7XHJcbiAgICAvLyBDcmVhdGUgQ29nbml0byBhdXRob3JpemVyIGZvciBwcm90ZWN0ZWQgZW5kcG9pbnRzXHJcbiAgICBjb25zdCBhdXRob3JpemVyID0gbmV3IGFwaWdhdGV3YXkuQ29nbml0b1VzZXJQb29sc0F1dGhvcml6ZXIodGhpcywgJ0J1ZGdldEJ1ZGR5QXV0aG9yaXplcicsIHtcclxuICAgICAgY29nbml0b1VzZXJQb29sczogW3VzZXJQb29sXSxcclxuICAgICAgYXV0aG9yaXplck5hbWU6ICdidWRnZXRidWRkeS1hdXRob3JpemVyJyxcclxuICAgICAgaWRlbnRpdHlTb3VyY2U6ICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdGhlIFJFU1QgQVBJXHJcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdCdWRnZXRCdWRkeUFwaScsIHtcclxuICAgICAgcmVzdEFwaU5hbWU6ICdidWRnZXRidWRkeS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IFJFU1QgQVBJIGZvciB3ZWIgYW5kIG1vYmlsZSBjbGllbnRzIHdpdGggc2VydmVybGVzcyBMYW1iZGEgYmFja2VuZCcsXHJcblxyXG4gICAgICAvLyBFbmFibGUgQ09SUyBmb3Igd2ViIGNsaWVudHNcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbXHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgLy8gTG9jYWwgZGV2ZWxvcG1lbnRcclxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLCAvLyBWaXRlIGRldiBzZXJ2ZXJcclxuICAgICAgICAgICdodHRwczovL2FwcC5idWRnZXRidWRkeS5jb20nLCAvLyBQcm9kdWN0aW9uIHdlYiBhcHBcclxuICAgICAgICAgICdodHRwczovL2FkbWluLmJ1ZGdldGJ1ZGR5LmNvbScsIC8vIEFkbWluIGRhc2hib2FyZFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbJ0dFVCcsICdQT1NUJywgJ1BVVCcsICdERUxFVEUnLCAnT1BUSU9OUyddLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAnWC1BcGktS2V5JyxcclxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiB0cnVlLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQVBJIEdhdGV3YXkgY29uZmlndXJhdGlvblxyXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XHJcbiAgICAgICAgc3RhZ2VOYW1lOiAndjEnLFxyXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcclxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gQmluYXJ5IG1lZGlhIHR5cGVzIGZvciBmaWxlIHVwbG9hZHMgKGZ1dHVyZSBmZWF0dXJlKVxyXG4gICAgICBiaW5hcnlNZWRpYVR5cGVzOiBbJ211bHRpcGFydC9mb3JtLWRhdGEnXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIGF1dGhvcml6ZXIgZm9yIHVzZSBpbiByb3V0ZSBzZXR1cFxyXG4gICAgKGFwaSBhcyBhbnkpLmF1dGhvcml6ZXIgPSBhdXRob3JpemVyO1xyXG5cclxuICAgIHJldHVybiBhcGk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZXQgdXAgYWxsIEFQSSByb3V0ZXMgYW5kIExhbWJkYSBpbnRlZ3JhdGlvbnNcclxuICAgKiBPcmdhbml6ZXMgZW5kcG9pbnRzIGJ5IGJ1c2luZXNzIGRvbWFpblxyXG4gICAqL1xyXG4gIHByaXZhdGUgc2V0dXBBcGlSb3V0ZXMoKTogdm9pZCB7XHJcbiAgICBjb25zdCBhdXRob3JpemVyID0gKHRoaXMuYXBpIGFzIGFueSkuYXV0aG9yaXplcjtcclxuXHJcbiAgICAvLyBIZWFsdGggY2hlY2sgZW5kcG9pbnRzIChwdWJsaWMsIG5vIGF1dGggcmVxdWlyZWQpXHJcbiAgICBjb25zdCBoZWFsdGhSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgaGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0hlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIHJvdXRlcyAocHVibGljKVxyXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpO1xyXG5cclxuICAgIC8vIFVzZXIgcmVnaXN0cmF0aW9uXHJcbiAgICBjb25zdCByZWdpc3RlclJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdyZWdpc3RlcicpO1xyXG4gICAgcmVnaXN0ZXJSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1JlZ2lzdGVyVXNlcicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVc2VyIGxvZ2luXHJcbiAgICBjb25zdCBsb2dpblJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdsb2dpbicpO1xyXG4gICAgbG9naW5SZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0xvZ2luVXNlcicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbWFpbCBjb25maXJtYXRpb25cclxuICAgIGNvbnN0IGNvbmZpcm1SZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnY29uZmlybScpO1xyXG4gICAgY29uZmlybVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQ29uZmlybUVtYWlsJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZvcmdvdCBwYXNzd29yZFxyXG4gICAgY29uc3QgZm9yZ290UGFzc3dvcmRSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZm9yZ290LXBhc3N3b3JkJyk7XHJcbiAgICBmb3Jnb3RQYXNzd29yZFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnRm9yZ290UGFzc3dvcmQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmVzZXQgcGFzc3dvcmRcclxuICAgIGNvbnN0IHJlc2V0UGFzc3dvcmRSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVzZXQtcGFzc3dvcmQnKTtcclxuICAgIHJlc2V0UGFzc3dvcmRSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5hdXRoSGFuZGxlciksIHtcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1Jlc2V0UGFzc3dvcmQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVXNlciBwcm9maWxlIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBwcm9maWxlUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3Byb2ZpbGUnKTtcclxuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0UHJvZmlsZScsXHJcbiAgICB9KTtcclxuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnVXBkYXRlUHJvZmlsZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoIGhlYWx0aCBlbmRwb2ludFxyXG4gICAgY29uc3QgYXV0aEhlYWx0aFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGF1dGhIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQXV0aEhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgcHJvZmlsZSByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHVzZXJzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd1c2VycycpO1xyXG4gICAgdXNlcnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0VXNlclByb2ZpbGUnLFxyXG4gICAgfSk7XHJcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVVc2VyUHJvZmlsZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBidWRnZXRSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2J1ZGdldCcpO1xyXG4gICAgYnVkZ2V0UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QnVkZ2V0JyxcclxuICAgIH0pO1xyXG4gICAgYnVkZ2V0UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuICAgIGJ1ZGdldFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBidWRnZXRIZWFsdGhSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGJ1ZGdldEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0J1ZGdldEhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1ZGdldCBjYXRlZ29yaWVzIHJvdXRlc1xyXG4gICAgY29uc3QgY2F0ZWdvcmllc1Jlc291cmNlID0gYnVkZ2V0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2NhdGVnb3JpZXMnKTtcclxuICAgIGNhdGVnb3JpZXNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRDYXRlZ29yaWVzJyxcclxuICAgIH0pO1xyXG4gICAgY2F0ZWdvcmllc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmJ1ZGdldEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVDYXRlZ29yeScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSBidWRnZXQgZ2VuZXJhdGlvbiByb3V0ZXNcclxuICAgIGNvbnN0IGFpUmVzb3VyY2UgPSBidWRnZXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnYWktZ2VuZXJhdGUnKTtcclxuICAgIGFpUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2VuZXJhdGVBSUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcmFuc2FjdGlvbiByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgndHJhbnNhY3Rpb25zJyk7XHJcbiAgICB0cmFuc2FjdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldFRyYW5zYWN0aW9ucycsXHJcbiAgICB9KTtcclxuICAgIHRyYW5zYWN0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnRyYW5zYWN0aW9uSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZVRyYW5zYWN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRyYW5zYWN0aW9ucyBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uc0hlYWx0aFJlc291cmNlID0gdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgdHJhbnNhY3Rpb25zSGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdUcmFuc2FjdGlvbnNIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGYW1pbHkgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBmYW1pbHlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2ZhbWlseScpO1xyXG4gICAgZmFtaWx5UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5mYW1pbHlIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0RmFtaWx5JyxcclxuICAgIH0pO1xyXG4gICAgZmFtaWx5UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZmFtaWx5SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUZhbWlseScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGYW1pbHkgaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBmYW1pbHlIZWFsdGhSZXNvdXJjZSA9IGZhbWlseVJlc291cmNlLmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIGZhbWlseUhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZmFtaWx5SGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0ZhbWlseUhlYWx0aENoZWNrJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBheW1lbnQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBwYXltZW50c1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGF5bWVudHMnKTtcclxuICAgIHBheW1lbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVTdWJzY3JpcHRpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUGF5bWVudCBoZWFsdGggZW5kcG9pbnRcclxuICAgIGNvbnN0IHBheW1lbnRIZWFsdGhSZXNvdXJjZSA9IHBheW1lbnRzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgcGF5bWVudEhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIpLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3sgc3RhdHVzQ29kZTogJzIwMCcgfV0sXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdQYXltZW50SGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gV2ViaG9vayByb3V0ZXMgKHB1YmxpYywgYnV0IHZhbGlkYXRlZCBieSBTdHJpcGUpXHJcbiAgICBjb25zdCB3ZWJob29rc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnd2ViaG9va3MnKTtcclxuICAgIGNvbnN0IHN0cmlwZVdlYmhvb2sgPSB3ZWJob29rc1Jlc291cmNlLmFkZFJlc291cmNlKCdzdHJpcGUnKTtcclxuICAgIHN0cmlwZVdlYmhvb2suYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdTdHJpcGVXZWJob29rJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkbWluIHJvdXRlcyAocHJvdGVjdGVkIHdpdGggYWRkaXRpb25hbCByb2xlIGNoZWNraW5nKVxyXG4gICAgY29uc3QgYWRtaW5SZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FkbWluJyk7XHJcbiAgICBhZG1pblJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWRtaW5IYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QWRtaW5EYXNoYm9hcmQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRtaW4gaGVhbHRoIGVuZHBvaW50XHJcbiAgICBjb25zdCBhZG1pbkhlYWx0aFJlc291cmNlID0gYWRtaW5SZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBhZG1pbkhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWRtaW5IYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQWRtaW5IZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbWFpbCByb3V0ZXMgKHB1YmxpYyBmb3Igd2ViaG9va3MsIHByb3RlY3RlZCBmb3Igc2VuZGluZylcclxuICAgIGNvbnN0IGVtYWlsUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdlbWFpbCcpO1xyXG4gICAgY29uc3QgZW1haWxIZWFsdGhSZXNvdXJjZSA9IGVtYWlsUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgZW1haWxIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmVtYWlsSGFuZGxlciksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbeyBzdGF0dXNDb2RlOiAnMjAwJyB9XSxcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0VtYWlsSGVhbHRoQ2hlY2snLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQUkgcm91dGVzIChzZXBhcmF0ZSBmcm9tIGJ1ZGdldCBmb3IgaGVhbHRoIGNoZWNrcylcclxuICAgIGNvbnN0IGFpUm9vdFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYWknKTtcclxuICAgIGNvbnN0IGFpSGVhbHRoUmVzb3VyY2UgPSBhaVJvb3RSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBhaUhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyKSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7IHN0YXR1c0NvZGU6ICcyMDAnIH1dLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQUlIZWFsdGhDaGVjaycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBDbG91ZEZvcm1hdGlvbiBvdXRwdXRzIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlT3V0cHV0cygpOiB2b2lkIHtcclxuICAgIC8vIEFQSSBHYXRld2F5IFVSTCBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS51cmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMIGZvciBCdWRnZXRCdWRkeSBjbGllbnQgYXBwbGljYXRpb25zICh3ZWIsIG1vYmlsZSwgYWRtaW4pJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaS11cmwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIEdhdGV3YXkgSUQgZm9yIG1vbml0b3JpbmdcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXBpLnJlc3RBcGlJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBJRCBmb3IgQnVkZ2V0QnVkZHkgbW9uaXRvcmluZyBhbmQgQ2xvdWRXYXRjaCBpbnRlZ3JhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hcGktaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIEFSTnMgZm9yIG1vbml0b3JpbmdcclxuICAgIE9iamVjdC5lbnRyaWVzKHRoaXMuZnVuY3Rpb25zKS5mb3JFYWNoKChbbmFtZSwgZnVuY10pID0+IHtcclxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYCR7bmFtZX1Bcm5gLCB7XHJcbiAgICAgICAgdmFsdWU6IGZ1bmMuZnVuY3Rpb25Bcm4sXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBCdWRnZXRCdWRkeSBMYW1iZGEgZnVuY3Rpb24gQVJOIGZvciAke25hbWV9IGhhbmRsZXIgbW9uaXRvcmluZyBhbmQgcGVybWlzc2lvbnNgLFxyXG4gICAgICAgIGV4cG9ydE5hbWU6IGBidWRnZXRidWRkeS0ke25hbWUudG9Mb3dlckNhc2UoKX0tYXJuYCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSB0YWdzIHRvIGVhY2ggTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnQ29tcG9uZW50JywgJ0FQSScpO1xyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ1NlcnZpY2UnLCAnTGFtYmRhJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnSGFuZGxlcicsIG5hbWUpO1xyXG4gICAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ1J1bnRpbWUnLCAnTm9kZUpTLTIwJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1Db21wdXRlJyk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19