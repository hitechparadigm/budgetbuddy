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

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

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
  private createCommonLayer(): lambda.LayerVersion {
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
  private createLambdaFunctions(table: dynamodb.Table, commonLayer: lambda.LayerVersion): void {
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
  private grantAdditionalPermissions(): void {
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
    (api as any).authorizer = authorizer;

    return api;
  }

  /**
   * Set up all API routes and Lambda integrations
   * Organizes endpoints by business domain
   */
  private setupApiRoutes(): void {
    const authorizer = (this.api as any).authorizer;

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