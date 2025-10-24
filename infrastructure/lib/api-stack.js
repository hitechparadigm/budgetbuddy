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
        this.createLambdaFunctions(props.table, commonLayer);
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
    createLambdaFunctions(table, commonLayer) {
        // Common environment variables for all functions
        const commonEnvironment = {
            TABLE_NAME: table.tableName,
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
            table.grantReadWriteData(func);
        });
        // Grant additional permissions for specific functions
        this.grantAdditionalPermissions();
    }
    /**
     * Grant additional AWS service permissions to specific functions
     */
    grantAdditionalPermissions() {
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
        // Authentication routes (public)
        const authResource = this.api.root.addResource('auth');
        authResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.authHandler), {
            operationName: 'AuthenticateUser',
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
        // Payment routes (protected)
        const paymentsResource = this.api.root.addResource('payments');
        paymentsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.paymentHandler), {
            authorizer,
            operationName: 'CreateSubscription',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7R0FjRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCwrREFBaUQ7QUFLakQseURBQTJDO0FBQzNDLDJEQUE2QztBQWE3QyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQWFyQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW9CO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBUDFCOzs7V0FHRztRQUNhLGNBQVMsR0FBdUMsRUFBRSxDQUFDO1FBS2pFLHFEQUFxRDtRQUNyRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUU3Qyx5REFBeUQ7UUFDekQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFckQsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVqRCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXRCLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVEOzs7T0FHRztJQUNLLGlCQUFpQjtRQUN2QixPQUFPLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ2xELGdCQUFnQixFQUFFLG9CQUFvQjtZQUN0QyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUM7WUFDdkQsa0JBQWtCLEVBQUUsQ0FBQyxNQUFN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QUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUM3RCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXJaRCw0QkFxWkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQVBJIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKiBcclxuICogQ3JlYXRlcyBBUEkgR2F0ZXdheSBSRVNUIEFQSSB3aXRoIExhbWJkYSBmdW5jdGlvbiBpbnRlZ3JhdGlvbnMgZm9yIGFsbFxyXG4gKiBiYWNrZW5kIGZ1bmN0aW9uYWxpdHkuIEluY2x1ZGVzIHByb3BlciBDT1JTIGNvbmZpZ3VyYXRpb24sIGF1dGhlbnRpY2F0aW9uLFxyXG4gKiBhbmQgZXJyb3IgaGFuZGxpbmcgZm9yIHdlYiBhbmQgbW9iaWxlIGNsaWVudHMuXHJcbiAqIFxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gUkVTVCBBUEkgd2l0aCByZXNvdXJjZS1iYXNlZCByb3V0aW5nXHJcbiAqIC0gTGFtYmRhIGZ1bmN0aW9uIGludGVncmF0aW9ucyBmb3IgYnVzaW5lc3MgbG9naWNcclxuICogLSBDb2duaXRvIGF1dGhvcml6ZXIgZm9yIHByb3RlY3RlZCBlbmRwb2ludHNcclxuICogLSBDT1JTIGNvbmZpZ3VyYXRpb24gZm9yIHdlYiBjbGllbnRzXHJcbiAqIC0gUmVxdWVzdC9yZXNwb25zZSB2YWxpZGF0aW9uXHJcbiAqIC0gQ2xvdWRXYXRjaCBsb2dnaW5nIGFuZCBtb25pdG9yaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuXHJcbmRlY2xhcmUgY29uc3QgcHJvY2VzczogYW55O1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG4vKipcclxuICogUHJvcHMgZm9yIHRoZSBBUEkgU3RhY2tcclxuICogUmVxdWlyZXMgcmVzb3VyY2VzIGZyb20gb3RoZXIgc3RhY2tzIChkYXRhYmFzZSBhbmQgYXV0aClcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBcGlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqXHJcbiAgICogQVBJIEdhdGV3YXkgUkVTVCBBUElcclxuICAgKiBFeHBvc2VkIGFzIHB1YmxpYyBwcm9wZXJ0eSBmb3IgbW9uaXRvcmluZyBzdGFja1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcclxuXHJcbiAgLyoqXHJcbiAgICogTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZGlmZmVyZW50IGJ1c2luZXNzIGRvbWFpbnNcclxuICAgKiBFeHBvc2VkIGZvciBtb25pdG9yaW5nIGFuZCBhZGRpdGlvbmFsIGludGVncmF0aW9uc1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBmdW5jdGlvbnM6IHsgW2tleTogc3RyaW5nXTogbGFtYmRhLkZ1bmN0aW9uIH0gPSB7fTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBzaGFyZWQgTGFtYmRhIGxheWVyIGZvciBjb21tb24gZGVwZW5kZW5jaWVzXHJcbiAgICBjb25zdCBjb21tb25MYXllciA9IHRoaXMuY3JlYXRlQ29tbW9uTGF5ZXIoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZGlmZmVyZW50IGJ1c2luZXNzIGRvbWFpbnNcclxuICAgIHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb25zKHByb3BzLnRhYmxlLCBjb21tb25MYXllcik7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFQSSBHYXRld2F5IHdpdGggcHJvcGVyIGNvbmZpZ3VyYXRpb25cclxuICAgIHRoaXMuYXBpID0gdGhpcy5jcmVhdGVBcGlHYXRld2F5KHByb3BzLnVzZXJQb29sKTtcclxuXHJcbiAgICAvLyBTZXQgdXAgQVBJIHJvdXRlcyBhbmQgaW50ZWdyYXRpb25zXHJcbiAgICB0aGlzLnNldHVwQXBpUm91dGVzKCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIG91dHB1dHMgZm9yIGNsaWVudCBjb25maWd1cmF0aW9uXHJcbiAgICB0aGlzLmNyZWF0ZU91dHB1dHMoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIExhbWJkYSBsYXllciB3aXRoIGNvbW1vbiBkZXBlbmRlbmNpZXNcclxuICAgKiBSZWR1Y2VzIGRlcGxveW1lbnQgcGFja2FnZSBzaXplcyBhbmQgaW1wcm92ZXMgY29sZCBzdGFydCB0aW1lc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlQ29tbW9uTGF5ZXIoKTogbGFtYmRhLkxheWVyVmVyc2lvbiB7XHJcbiAgICByZXR1cm4gbmV3IGxhbWJkYS5MYXllclZlcnNpb24odGhpcywgJ0NvbW1vbkxheWVyJywge1xyXG4gICAgICBsYXllclZlcnNpb25OYW1lOiAnYnVkZ2V0YnVkZHktY29tbW9uJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2xheWVycy9jb21tb24nKSxcclxuICAgICAgY29tcGF0aWJsZVJ1bnRpbWVzOiBbbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1hdLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvbW1vbiBkZXBlbmRlbmNpZXMgYW5kIHV0aWxpdGllcyBmb3IgQnVkZ2V0QnVkZHkgTGFtYmRhIGZ1bmN0aW9ucyB0byByZWR1Y2UgY29sZCBzdGFydCB0aW1lcycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhbGwgTGFtYmRhIGZ1bmN0aW9ucyBmb3IgdGhlIGFwcGxpY2F0aW9uXHJcbiAgICogRWFjaCBmdW5jdGlvbiBoYW5kbGVzIGEgc3BlY2lmaWMgYnVzaW5lc3MgZG9tYWluXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVMYW1iZGFGdW5jdGlvbnModGFibGU6IGR5bmFtb2RiLlRhYmxlLCBjb21tb25MYXllcjogbGFtYmRhLkxheWVyVmVyc2lvbik6IHZvaWQge1xyXG4gICAgLy8gQ29tbW9uIGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIGZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY29tbW9uRW52aXJvbm1lbnQgPSB7XHJcbiAgICAgIFRBQkxFX05BTUU6IHRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcclxuICAgICAgTE9HX0xFVkVMOiAnaW5mbycsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENvbW1vbiBMYW1iZGEgZnVuY3Rpb24gY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgY29tbW9uUHJvcHMgPSB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gQmFsYW5jZWQgZm9yIGNvc3QgYW5kIHBlcmZvcm1hbmNlXHJcbiAgICAgIGxheWVyczogW2NvbW1vbkxheWVyXSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSywgLy8gQ29zdCBvcHRpbWl6YXRpb25cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdXRoZW50aWNhdGlvbiBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSB1c2VyIHJlZ2lzdHJhdGlvbiwgbG9naW4sIGFuZCBwcm9maWxlIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBdXRoSGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWF1dGgnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2F1dGgnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGF1dGhlbnRpY2F0aW9uIGhhbmRsZXIgZm9yIHVzZXIgcmVnaXN0cmF0aW9uLCBsb2dpbiwgYW5kIHByb2ZpbGUgbWFuYWdlbWVudCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEJ1ZGdldCBNYW5hZ2VtZW50IEZ1bmN0aW9uc1xyXG4gICAgICogSGFuZGxlIGJ1ZGdldCBDUlVEIG9wZXJhdGlvbnMgYW5kIGNhbGN1bGF0aW9uc1xyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQnVkZ2V0SGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWJ1ZGdldCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvYnVkZ2V0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBidWRnZXQgaGFuZGxlciBmb3IgQ1JVRCBvcGVyYXRpb25zLCBjYXRlZ29yaWVzLCBhbmQgemVyby1iYXNlZCBjYWxjdWxhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUcmFuc2FjdGlvbiBNYW5hZ2VtZW50IEZ1bmN0aW9uc1xyXG4gICAgICogSGFuZGxlIHRyYW5zYWN0aW9uIENSVUQgb3BlcmF0aW9ucyBhbmQgYnVkZ2V0IHVwZGF0ZXNcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMudHJhbnNhY3Rpb25IYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVHJhbnNhY3Rpb25IYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktdHJhbnNhY3Rpb24nLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL3RyYW5zYWN0aW9ucycpLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgdHJhbnNhY3Rpb24gaGFuZGxlciBmb3IgZXhwZW5zZS9pbmNvbWUgdHJhY2tpbmcgYW5kIGF1dG9tYXRpYyBidWRnZXQgdXBkYXRlcycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFJIEJ1ZGdldCBHZW5lcmF0aW9uIEZ1bmN0aW9uc1xyXG4gICAgICogSGFuZGxlIEFJLXBvd2VyZWQgYnVkZ2V0IGdlbmVyYXRpb24gdXNpbmcgQVdTIEJlZHJvY2tcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYWlIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQUlIYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYWknLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2FpJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBBSSBoYW5kbGVyIGZvciBwZXJzb25hbGl6ZWQgYnVkZ2V0IGdlbmVyYXRpb24gdXNpbmcgQVdTIEJlZHJvY2sgQ2xhdWRlIDMuNScsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLCAvLyBBSSBjYWxscyBtYXkgdGFrZSBsb25nZXJcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25FbnZpcm9ubWVudCxcclxuICAgICAgICBCRURST0NLX01PREVMX0lEOiAnYW50aHJvcGljLmNsYXVkZS0zLTUtc29ubmV0LTIwMjQxMDIyLXYyOjAnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGYW1pbHkgQWNjb3VudCBNYW5hZ2VtZW50IEZ1bmN0aW9uc1xyXG4gICAgICogSGFuZGxlIGZhbWlseSBjcmVhdGlvbiwgaW52aXRhdGlvbnMsIGFuZCBtZW1iZXIgbWFuYWdlbWVudFxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5mYW1pbHlIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRmFtaWx5SGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LWZhbWlseScsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvZmFtaWx5JyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBmYW1pbHkgaGFuZGxlciBmb3Igc2hhcmVkIGFjY291bnRzLCBpbnZpdGF0aW9ucywgYW5kIG1lbWJlciBtYW5hZ2VtZW50JyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGF5bWVudCBhbmQgU3Vic2NyaXB0aW9uIEZ1bmN0aW9uc1xyXG4gICAgICogSGFuZGxlIFN0cmlwZSBpbnRlZ3JhdGlvbiBhbmQgc3Vic2NyaXB0aW9uIG1hbmFnZW1lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMucGF5bWVudEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50SGFuZGxlcicsIHtcclxuICAgICAgLi4uY29tbW9uUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2J1ZGdldGJ1ZGR5LXBheW1lbnQnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL3BheW1lbnQnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IHBheW1lbnQgaGFuZGxlciBmb3IgU3RyaXBlIGludGVncmF0aW9uIGFuZCBzdWJzY3JpcHRpb24gbWFuYWdlbWVudCcsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLi4uY29tbW9uRW52aXJvbm1lbnQsXHJcbiAgICAgICAgU1RSSVBFX1NFQ1JFVF9LRVk6IHByb2Nlc3MuZW52LlNUUklQRV9TRUNSRVRfS0VZIHx8ICcnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFbWFpbCBhbmQgTm90aWZpY2F0aW9uIEZ1bmN0aW9uc1xyXG4gICAgICogSGFuZGxlIFNFUyBlbWFpbCBzZW5kaW5nIGFuZCBub3RpZmljYXRpb24gbWFuYWdlbWVudFxyXG4gICAgICovXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5lbWFpbEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdFbWFpbEhhbmRsZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdidWRnZXRidWRkeS1lbWFpbCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvZW1haWwnKSxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGVtYWlsIGhhbmRsZXIgZm9yIG5vdGlmaWNhdGlvbnMsIHRpcHMgZGVsaXZlcnksIGFuZCBmYW1pbHkgaW52aXRhdGlvbnMgdmlhIFNFUycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkbWluIERhc2hib2FyZCBGdW5jdGlvbnNcclxuICAgICAqIEhhbmRsZSBhZG1pbiBvcGVyYXRpb25zIGFuZCBhbmFseXRpY3NcclxuICAgICAqL1xyXG4gICAgdGhpcy5mdW5jdGlvbnMuYWRtaW5IYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQWRtaW5IYW5kbGVyJywge1xyXG4gICAgICAuLi5jb21tb25Qcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYnVkZ2V0YnVkZHktYWRtaW4nLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2FkbWluJyksXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBhZG1pbiBoYW5kbGVyIGZvciBkYXNoYm9hcmQgb3BlcmF0aW9ucywgdXNlciBtYW5hZ2VtZW50LCBhbmQgYW5hbHl0aWNzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zIHRvIGFsbCBmdW5jdGlvbnNcclxuICAgIE9iamVjdC52YWx1ZXModGhpcy5mdW5jdGlvbnMpLmZvckVhY2goZnVuYyA9PiB7XHJcbiAgICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IGFkZGl0aW9uYWwgcGVybWlzc2lvbnMgZm9yIHNwZWNpZmljIGZ1bmN0aW9uc1xyXG4gICAgdGhpcy5ncmFudEFkZGl0aW9uYWxQZXJtaXNzaW9ucygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgYWRkaXRpb25hbCBBV1Mgc2VydmljZSBwZXJtaXNzaW9ucyB0byBzcGVjaWZpYyBmdW5jdGlvbnNcclxuICAgKi9cclxuICBwcml2YXRlIGdyYW50QWRkaXRpb25hbFBlcm1pc3Npb25zKCk6IHZvaWQge1xyXG4gICAgLy8gQUkgSGFuZGxlciBuZWVkcyBCZWRyb2NrIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5haUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gQmVkcm9jayBtb2RlbHMgZG9uJ3QgaGF2ZSBzcGVjaWZpYyBBUk5zXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gRW1haWwgSGFuZGxlciBuZWVkcyBTRVMgcGVybWlzc2lvbnNcclxuICAgIHRoaXMuZnVuY3Rpb25zLmVtYWlsSGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnc2VzOlNlbmRFbWFpbCcsXHJcbiAgICAgICAgJ3NlczpTZW5kUmF3RW1haWwnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBTRVMgcGVybWlzc2lvbnMgYXJlIHR5cGljYWxseSBicm9hZFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIFBheW1lbnQgSGFuZGxlciBuZWVkcyBhZGRpdGlvbmFsIGxvZ2dpbmcgZm9yIHdlYmhvb2sgZGVidWdnaW5nXHJcbiAgICB0aGlzLmZ1bmN0aW9ucy5wYXltZW50SGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcclxuICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIEFQSSBHYXRld2F5IFJFU1QgQVBJIHdpdGggcHJvcGVyIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUFwaUdhdGV3YXkodXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2wpOiBhcGlnYXRld2F5LlJlc3RBcGkge1xyXG4gICAgLy8gQ3JlYXRlIENvZ25pdG8gYXV0aG9yaXplciBmb3IgcHJvdGVjdGVkIGVuZHBvaW50c1xyXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyKHRoaXMsICdCdWRnZXRCdWRkeUF1dGhvcml6ZXInLCB7XHJcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFt1c2VyUG9vbF0sXHJcbiAgICAgIGF1dGhvcml6ZXJOYW1lOiAnYnVkZ2V0YnVkZHktYXV0aG9yaXplcicsXHJcbiAgICAgIGlkZW50aXR5U291cmNlOiAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBSRVNUIEFQSVxyXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnQnVkZ2V0QnVkZHlBcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiAnYnVkZ2V0YnVkZHktYXBpJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBSRVNUIEFQSSBmb3Igd2ViIGFuZCBtb2JpbGUgY2xpZW50cyB3aXRoIHNlcnZlcmxlc3MgTGFtYmRhIGJhY2tlbmQnLFxyXG4gICAgICBcclxuICAgICAgLy8gRW5hYmxlIENPUlMgZm9yIHdlYiBjbGllbnRzXHJcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogW1xyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIC8vIExvY2FsIGRldmVsb3BtZW50XHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDo1MTczJywgLy8gVml0ZSBkZXYgc2VydmVyXHJcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAuYnVkZ2V0YnVkZHkuY29tJywgLy8gUHJvZHVjdGlvbiB3ZWIgYXBwXHJcbiAgICAgICAgICAnaHR0cHM6Ly9hZG1pbi5idWRnZXRidWRkeS5jb20nLCAvLyBBZG1pbiBkYXNoYm9hcmRcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogWydHRVQnLCAnUE9TVCcsICdQVVQnLCAnREVMRVRFJywgJ09QVElPTlMnXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICAgJ1gtQW16LURhdGUnLFxyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgJ1gtQXBpLUtleScsXHJcbiAgICAgICAgICAnWC1BbXotU2VjdXJpdHktVG9rZW4nLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEFQSSBHYXRld2F5IGNvbmZpZ3VyYXRpb25cclxuICAgICAgZGVwbG95T3B0aW9uczoge1xyXG4gICAgICAgIHN0YWdlTmFtZTogJ3YxJyxcclxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXHJcbiAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBtZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEJpbmFyeSBtZWRpYSB0eXBlcyBmb3IgZmlsZSB1cGxvYWRzIChmdXR1cmUgZmVhdHVyZSlcclxuICAgICAgYmluYXJ5TWVkaWFUeXBlczogWydtdWx0aXBhcnQvZm9ybS1kYXRhJ10sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdG9yZSBhdXRob3JpemVyIGZvciB1c2UgaW4gcm91dGUgc2V0dXBcclxuICAgIChhcGkgYXMgYW55KS5hdXRob3JpemVyID0gYXV0aG9yaXplcjtcclxuXHJcbiAgICByZXR1cm4gYXBpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IHVwIGFsbCBBUEkgcm91dGVzIGFuZCBMYW1iZGEgaW50ZWdyYXRpb25zXHJcbiAgICogT3JnYW5pemVzIGVuZHBvaW50cyBieSBidXNpbmVzcyBkb21haW5cclxuICAgKi9cclxuICBwcml2YXRlIHNldHVwQXBpUm91dGVzKCk6IHZvaWQge1xyXG4gICAgY29uc3QgYXV0aG9yaXplciA9ICh0aGlzLmFwaSBhcyBhbnkpLmF1dGhvcml6ZXI7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gcm91dGVzIChwdWJsaWMpXHJcbiAgICBjb25zdCBhdXRoUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhdXRoJyk7XHJcbiAgICBhdXRoUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdBdXRoZW50aWNhdGVVc2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgcHJvZmlsZSByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHVzZXJzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd1c2VycycpO1xyXG4gICAgdXNlcnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0VXNlclByb2ZpbGUnLFxyXG4gICAgfSk7XHJcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYXV0aEhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdVcGRhdGVVc2VyUHJvZmlsZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBidWRnZXRSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2J1ZGdldCcpO1xyXG4gICAgYnVkZ2V0UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0QnVkZ2V0JyxcclxuICAgIH0pO1xyXG4gICAgYnVkZ2V0UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuICAgIGJ1ZGdldFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuYnVkZ2V0SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ1VwZGF0ZUJ1ZGdldCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWRnZXQgY2F0ZWdvcmllcyByb3V0ZXNcclxuICAgIGNvbnN0IGNhdGVnb3JpZXNSZXNvdXJjZSA9IGJ1ZGdldFJlc291cmNlLmFkZFJlc291cmNlKCdjYXRlZ29yaWVzJyk7XHJcbiAgICBjYXRlZ29yaWVzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0Q2F0ZWdvcmllcycsXHJcbiAgICB9KTtcclxuICAgIGNhdGVnb3JpZXNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5idWRnZXRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQ3JlYXRlQ2F0ZWdvcnknLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQUkgYnVkZ2V0IGdlbmVyYXRpb24gcm91dGVzXHJcbiAgICBjb25zdCBhaVJlc291cmNlID0gYnVkZ2V0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2FpLWdlbmVyYXRlJyk7XHJcbiAgICBhaVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFpSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dlbmVyYXRlQUlCdWRnZXQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVHJhbnNhY3Rpb24gcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCB0cmFuc2FjdGlvbnNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3RyYW5zYWN0aW9ucycpO1xyXG4gICAgdHJhbnNhY3Rpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdHZXRUcmFuc2FjdGlvbnMnLFxyXG4gICAgfSk7XHJcbiAgICB0cmFuc2FjdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy50cmFuc2FjdGlvbkhhbmRsZXIpLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIG9wZXJhdGlvbk5hbWU6ICdDcmVhdGVUcmFuc2FjdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGYW1pbHkgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBmYW1pbHlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2ZhbWlseScpO1xyXG4gICAgZmFtaWx5UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmZ1bmN0aW9ucy5mYW1pbHlIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnR2V0RmFtaWx5JyxcclxuICAgIH0pO1xyXG4gICAgZmFtaWx5UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5mdW5jdGlvbnMuZmFtaWx5SGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0NyZWF0ZUZhbWlseScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXltZW50IHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgcGF5bWVudHNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BheW1lbnRzJyk7XHJcbiAgICBwYXltZW50c1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyKSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnQ3JlYXRlU3Vic2NyaXB0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFdlYmhvb2sgcm91dGVzIChwdWJsaWMsIGJ1dCB2YWxpZGF0ZWQgYnkgU3RyaXBlKVxyXG4gICAgY29uc3Qgd2ViaG9va3NSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3dlYmhvb2tzJyk7XHJcbiAgICBjb25zdCBzdHJpcGVXZWJob29rID0gd2ViaG9va3NSZXNvdXJjZS5hZGRSZXNvdXJjZSgnc3RyaXBlJyk7XHJcbiAgICBzdHJpcGVXZWJob29rLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLnBheW1lbnRIYW5kbGVyKSwge1xyXG4gICAgICBvcGVyYXRpb25OYW1lOiAnU3RyaXBlV2ViaG9vaycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZG1pbiByb3V0ZXMgKHByb3RlY3RlZCB3aXRoIGFkZGl0aW9uYWwgcm9sZSBjaGVja2luZylcclxuICAgIGNvbnN0IGFkbWluUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhZG1pbicpO1xyXG4gICAgYWRtaW5SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZnVuY3Rpb25zLmFkbWluSGFuZGxlciksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgb3BlcmF0aW9uTmFtZTogJ0dldEFkbWluRGFzaGJvYXJkJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIENsb3VkRm9ybWF0aW9uIG91dHB1dHMgZm9yIGNsaWVudCBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVPdXRwdXRzKCk6IHZvaWQge1xyXG4gICAgLy8gQVBJIEdhdGV3YXkgVVJMIGZvciBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXBpLnVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwgZm9yIEJ1ZGdldEJ1ZGR5IGNsaWVudCBhcHBsaWNhdGlvbnMgKHdlYiwgbW9iaWxlLCBhZG1pbiknLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktYXBpLXVybCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSBJRCBmb3IgbW9uaXRvcmluZ1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUlkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hcGkucmVzdEFwaUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IElEIGZvciBCdWRnZXRCdWRkeSBtb25pdG9yaW5nIGFuZCBDbG91ZFdhdGNoIGludGVncmF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaS1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gQVJOcyBmb3IgbW9uaXRvcmluZ1xyXG4gICAgT2JqZWN0LmVudHJpZXModGhpcy5mdW5jdGlvbnMpLmZvckVhY2goKFtuYW1lLCBmdW5jXSkgPT4ge1xyXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBgJHtuYW1lfUFybmAsIHtcclxuICAgICAgICB2YWx1ZTogZnVuYy5mdW5jdGlvbkFybixcclxuICAgICAgICBkZXNjcmlwdGlvbjogYEJ1ZGdldEJ1ZGR5IExhbWJkYSBmdW5jdGlvbiBBUk4gZm9yICR7bmFtZX0gaGFuZGxlciBtb25pdG9yaW5nIGFuZCBwZXJtaXNzaW9uc2AsXHJcbiAgICAgICAgZXhwb3J0TmFtZTogYGJ1ZGdldGJ1ZGR5LSR7bmFtZS50b0xvd2VyQ2FzZSgpfS1hcm5gLFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIHRhZ3MgdG8gZWFjaCBMYW1iZGEgZnVuY3Rpb25cclxuICAgICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdDb21wb25lbnQnLCAnQVBJJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnU2VydmljZScsICdMYW1iZGEnKTtcclxuICAgICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdIYW5kbGVyJywgbmFtZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnUnVudGltZScsICdOb2RlSlMtMjAnKTtcclxuICAgICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUNvbXB1dGUnKTtcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==