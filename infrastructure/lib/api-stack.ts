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

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

declare const process: any;
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Props for the API Stack
 * Requires resources from other stacks (database and auth)
 */
export interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  authOnboardingFunction?: lambda.Function; // Optional - for gradual refactoring
  notificationFunction?: lambda.Function; // Optional - for push notifications
}

export class ApiStack extends cdk.Stack {
  /**
   * API Gateway REST API
   * Exposed as public property for monitoring stack
   */
  public readonly api: apigateway.RestApi;

  /**
   * Lambda functions for different business domains
   * Exposed for monitoring and additional integrations
   */
  public readonly functions: { [key: string]: lambda.Function } = {};

  /**
   * Lambda layers for shared code
   * Exposed for use in other stacks (e.g., notification stack)
   */
  public readonly commonLayer: lambda.LayerVersion;
  public readonly sharedLayer: lambda.LayerVersion;

  /**
   * Auth Onboarding Lambda Function (optional)
   * Part of architectural refactoring - standalone function for onboarding
   */
  private readonly authOnboardingFunction?: lambda.Function;

  /**
   * Notification Service Lambda Function (optional)
   * Handles push notifications, device management, and preferences
   */
  private readonly notificationFunction?: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

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
  private createCommonLayer(): lambda.LayerVersion {
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
  private createSharedLayer(): lambda.LayerVersion {
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
  private createLambdaFunctions(props: ApiStackProps, commonLayer: lambda.LayerVersion, sharedLayer: lambda.LayerVersion): void {
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
     * Spending Insights Functions
     * Handle analytics, AI insights, and trend analysis
     */
    this.functions.insightsHandler = new lambda.Function(this, 'InsightsHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-insights',
      code: lambda.Code.fromAsset('../backend/functions/insights'),
      handler: 'index.handler',
      description: 'BudgetBuddy insights handler for spending analytics and AI-generated insights',
    });

    /**
     * Receipt Scanning Functions
     * Handle receipt upload, AI extraction using Claude Haiku, and transaction creation
     */
    this.functions.receiptHandler = new lambda.Function(this, 'ReceiptHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-receipt',
      code: lambda.Code.fromAsset('../backend/functions/receipt'),
      handler: 'index.handler',
      description: 'BudgetBuddy receipt handler for AI-powered receipt scanning and extraction',
    });

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
  private grantAdditionalPermissions(): void {
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
  private createApiGateway(userPool: cognito.UserPool): apigateway.RestApi {
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
    (api as any).authorizer = authorizer;

    // Add Gateway Responses for CORS on error responses
    this.addGatewayResponses(api);

    return api;
  }

  /**
   * Add Gateway Responses to handle CORS for error responses
   * This ensures CORS headers are present on 401, 403, 4XX, and 5XX responses
   */
  private addGatewayResponses(api: apigateway.RestApi): void {
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
  private setupApiRoutes(): void {
    const authorizer = (this.api as any).authorizer;

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
    } else {
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

    // Family invite endpoint (protected - primary only)
    const familyInviteResource = familyResource.addResource('invite');
    familyInviteResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'InviteFamilyMember',
    });

    // Family accept invitation endpoint (protected)
    const familyAcceptResource = familyResource.addResource('accept-invitation');
    familyAcceptResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'AcceptFamilyInvitation',
    });

    // Family members endpoint (protected)
    const familyMembersResource = familyResource.addResource('members');
    familyMembersResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'GetFamilyMembers',
    });

    // Family member by ID endpoints (protected)
    const familyMemberIdResource = familyMembersResource.addResource('{userId}');
    familyMemberIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'RemoveFamilyMember',
    });

    // Family member role endpoint (protected - primary only)
    const familyMemberRoleResource = familyMemberIdResource.addResource('role');
    familyMemberRoleResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'UpdateFamilyMemberRole',
    });

    // Family leave endpoint (protected - non-primary only)
    const familyLeaveResource = familyResource.addResource('leave');
    familyLeaveResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'LeaveFamily',
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

    // Insights routes (protected)
    const insightsResource = this.api.root.addResource('insights');

    // Insights weekly endpoint
    const insightsWeeklyResource = insightsResource.addResource('weekly');
    insightsWeeklyResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'GetWeeklyInsights',
    });

    // Insights monthly endpoint
    const insightsMonthlyResource = insightsResource.addResource('monthly');
    insightsMonthlyResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'GetMonthlyInsights',
    });

    // Insights trends endpoint
    const insightsTrendsResource = insightsResource.addResource('trends');
    insightsTrendsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'GetSpendingTrends',
    });

    // Insights patterns endpoint
    const insightsPatternsResource = insightsResource.addResource('patterns');
    insightsPatternsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'GetSpendingPatterns',
    });

    // Insights ask endpoint (AI)
    const insightsAskResource = insightsResource.addResource('ask');
    insightsAskResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'AskAboutSpending',
    });

    // Insights health endpoint
    const insightsHealthResource = insightsResource.addResource('health');
    insightsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'InsightsHealthCheck',
    });

    // Receipt routes (protected)
    const receiptResource = this.api.root.addResource('receipt');

    // Receipt upload endpoint
    const receiptUploadResource = receiptResource.addResource('upload');
    receiptUploadResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'GetReceiptUploadUrl',
    });

    // Receipt process endpoint
    const receiptProcessResource = receiptResource.addResource('process');
    receiptProcessResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'ProcessReceipt',
    });

    // Receipt usage endpoint
    const receiptUsageResource = receiptResource.addResource('usage');
    receiptUsageResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'GetReceiptUsage',
    });

    // Receipt history endpoint
    const receiptHistoryResource = receiptResource.addResource('history');
    receiptHistoryResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'GetReceiptHistory',
    });

    // Receipt health endpoint
    const receiptHealthResource = receiptResource.addResource('health');
    receiptHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'ReceiptHealthCheck',
    });

    // Individual receipt routes
    const receiptIdResource = receiptResource.addResource('{receiptId}');
    receiptIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'GetReceipt',
    });

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
  private createOutputs(): void {
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
