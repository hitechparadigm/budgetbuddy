/**
 * API Features Stack for BudgetBuddy Application
 *
 * Contains Lambda functions and API routes for competitive features:
 * - Plaid (bank sync)
 * - Reconciliation (receipt-to-bank matching)
 * - Admin (admin dashboard)
 * - Comparison, Tips, Learn, Subscriptions, Debt Payoff
 *
 * Note: AI-powered features (Insights, Receipt, Pattern Detection, Budget Planning)
 * have been moved to ApiFeaturesExtendedStack to stay under CloudFormation's 500 resource limit.
 *
 * This stack has its own API Gateway to avoid cyclic dependencies
 * with the main API stack.
 */

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ApiFeaturesStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  // Note: commonLayer and sharedLayer are now created internally to avoid CloudFormation export dependency issues
}

export class ApiFeaturesStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly functions: { [key: string]: lambda.Function } = {};

  constructor(scope: Construct, id: string, props: ApiFeaturesStackProps) {
    super(scope, id, props);

    // Create own CommonLayer to avoid CloudFormation export dependency issues
    // This prevents "Cannot update export" errors when the api-stack's CommonLayer is updated
    const commonLayer = new lambda.LayerVersion(this, 'FeaturesCommonLayer', {
      layerVersionName: 'budgetbuddy-features-common',
      code: lambda.Code.fromAsset('../backend/layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Common dependencies for BudgetBuddy Features API Lambda functions (independent copy)',
    });

    // Create own SharedLayer to avoid CloudFormation export dependency issues
    // This prevents "Cannot update export" errors when the api-stack's SharedLayer is updated
    const sharedLayer = new lambda.LayerVersion(this, 'FeaturesSharedLayer', {
      layerVersionName: 'budgetbuddy-features-shared',
      code: lambda.Code.fromAsset('../backend/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for BudgetBuddy Features API Lambda functions (independent copy)',
    });

    // Note: S3 buckets for receipts and pattern cache are now in ApiFeaturesExtendedStack

    // Create separate API Gateway for features
    this.api = new apigateway.RestApi(this, 'FeaturesApi', {
      restApiName: 'budgetbuddy-features-api',
      description: 'BudgetBuddy Features API for Plaid, Reconciliation, Admin, and other integrations',
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://d1ueeugn9zcx7n.cloudfront.net',
          'https://d2ubhx2a13s7gc.cloudfront.net',
          'https://app.budgetbuddy.com',
          'https://admin.budgetbuddy.com',
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
      deployOptions: {
        stageName: 'v1',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false, // Never log full request/response bodies — contains Plaid tokens, financial data
        metricsEnabled: true,
      },
    });

    // Create Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'FeaturesAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'budgetbuddy-features-authorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // Common environment variables
    const commonEnvironment = {
      TABLE_NAME: props.table.tableName,
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
    };

    // Common Lambda configuration
    const commonProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [commonLayer, sharedLayer],
      environment: commonEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    };

    // Create Lambda functions
    this.createLambdaFunctions(props, commonProps);

    // Grant DynamoDB permissions
    Object.values(this.functions).forEach(func => {
      props.table.grantReadWriteData(func);
    });

    // Set up API routes
    this.setupApiRoutes(authorizer);

    // Add Gateway Responses for CORS on 4XX errors (including 401 from authorizer)
    this.addGatewayResponses();

    // Create outputs
    this.createOutputs();
  }

  private addGatewayResponses(): void {
    // Add CORS headers to 401 Unauthorized responses (from Cognito authorizer)
    this.api.addGatewayResponse('UnauthorizedResponse', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      statusCode: '401',
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
      templates: {
        'application/json': '{"success":false,"message":"Unauthorized - Please log in","error":{"code":"UNAUTHORIZED"}}',
      },
    });

    // Add CORS headers to 403 Forbidden responses
    this.api.addGatewayResponse('ForbiddenResponse', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      statusCode: '403',
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
      templates: {
        'application/json': '{"success":false,"message":"Access denied","error":{"code":"FORBIDDEN"}}',
      },
    });

    // Add CORS headers to 4XX default responses
    this.api.addGatewayResponse('Default4XXResponse', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    // Add CORS headers to 5XX default responses
    this.api.addGatewayResponse('Default5XXResponse', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });
  }

  private createLambdaFunctions(
    _props: ApiFeaturesStackProps,
    commonProps: any
  ): void {
    // Plaid Lambda - with bundling to install npm dependencies
    this.functions.plaidHandler = new lambda.Function(this, 'PlaidHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-plaid',
      code: lambda.Code.fromAsset('../backend/functions/plaid', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          user: 'root',
          command: [
            'bash', '-c', [
              'cp -r /asset-input/* /asset-output/',
              'cd /asset-output',
              'npm install --production --no-optional',
            ].join(' && '),
          ],
        },
      }),
      handler: 'index.handler',
      description: 'BudgetBuddy Plaid handler for bank account sync',
      timeout: cdk.Duration.seconds(60), // Increased for Plaid API calls
      environment: {
        ...commonProps.environment,
        PLAID_ENV: 'sandbox',
        PLAID_SECRET_NAME: 'budgetbuddy/plaid/sandbox',
      },
    });

    // Grant Plaid Lambda permission to read secrets
    this.functions.plaidHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:budgetbuddy/plaid/*`],
    }));

    // Reconciliation Lambda
    this.functions.reconciliationHandler = new lambda.Function(this, 'ReconciliationHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-reconciliation',
      code: lambda.Code.fromAsset('../backend/functions/reconciliation'),
      handler: 'index.handler',
      description: 'BudgetBuddy reconciliation handler for receipt-to-bank matching',
    });

    // Admin Lambda
    this.functions.adminHandler = new lambda.Function(this, 'AdminHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-admin',
      code: lambda.Code.fromAsset('../backend/functions/admin'),
      handler: 'index.handler',
      description: 'BudgetBuddy admin handler for dashboard and user management',
    });

    // Comparison Lambda
    this.functions.comparisonHandler = new lambda.Function(this, 'ComparisonHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-comparison',
      code: lambda.Code.fromAsset('../backend/functions/comparison'),
      handler: 'index.handler',
      description: 'BudgetBuddy comparison handler for peer spending comparisons',
    });

    // Tips Lambda
    this.functions.tipsHandler = new lambda.Function(this, 'TipsHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-tips',
      code: lambda.Code.fromAsset('../backend/functions/tips'),
      handler: 'index.handler',
      description: 'BudgetBuddy tips handler for personalized financial tips',
    });

    // Learn Lambda
    this.functions.learnHandler = new lambda.Function(this, 'LearnHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-learn',
      code: lambda.Code.fromAsset('../backend/functions/learn'),
      handler: 'index.handler',
      description: 'BudgetBuddy learn handler for educational content and gamification',
    });

    // Subscriptions Lambda
    this.functions.subscriptionsHandler = new lambda.Function(this, 'SubscriptionsHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-subscriptions',
      code: lambda.Code.fromAsset('../backend/functions/subscriptions'),
      handler: 'index.handler',
      description: 'BudgetBuddy subscriptions handler for subscription tracking, detection, and renewal management',
    });

    // Debt Payoff Lambda
    this.functions.debtPayoffHandler = new lambda.Function(this, 'DebtPayoffHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-debt-payoff',
      code: lambda.Code.fromAsset('../backend/functions/debt-payoff'),
      handler: 'index.handler',
      description: 'BudgetBuddy debt payoff handler for debt tracking, snowball/avalanche calculations, and payment recording',
    });

    // Credit Score Lambda
    this.functions.creditScoreHandler = new lambda.Function(this, 'CreditScoreHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-credit-score',
      code: lambda.Code.fromAsset('../backend/functions/credit-score'),
      handler: 'index.handler',
      description: 'BudgetBuddy credit score handler for credit monitoring, score tracking, and improvement tips',
    });

    // Email Lambda
    this.functions.emailHandler = new lambda.Function(this, 'EmailHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-email-features',
      code: lambda.Code.fromAsset('../backend/functions/email'),
      handler: 'index.handler',
      description: 'BudgetBuddy email handler for family invitations and notifications via SES',
    });

    // Grant Email Lambda permission to send emails via SES
    this.functions.emailHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // Note: Family Lambda moved to ApiFamilyStack (standalone stack) to avoid circular dependency

    // Note: Insights, Receipt, Pattern Detection, and Budget Planning Lambdas
    // have been moved to ApiFeaturesExtendedStack to stay under CloudFormation's 500 resource limit
  }

  private setupApiRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    // Plaid routes
    this.setupPlaidRoutes(authorizer);

    // Reconciliation routes
    this.setupReconciliationRoutes(authorizer);

    // Admin routes
    this.setupAdminRoutes(authorizer);

    // Comparison routes
    this.setupComparisonRoutes(authorizer);

    // Tips routes
    this.setupTipsRoutes(authorizer);

    // Learn routes
    this.setupLearnRoutes(authorizer);

    // Subscriptions routes
    this.setupSubscriptionsRoutes(authorizer);

    // Debt Payoff routes
    this.setupDebtPayoffRoutes(authorizer);

    // Credit Score routes
    this.setupCreditScoreRoutes(authorizer);

    // Email routes
    this.setupEmailRoutes(authorizer);

    // Note: Family routes moved to ApiFamilyStack (standalone stack) to avoid circular dependency

    // Note: Insights, Receipt, Pattern Detection, and Budget Planning routes
    // have been moved to ApiFeaturesExtendedStack
  }

  private setupPlaidRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const plaidResource = this.api.root.addResource('plaid');

    const plaidLinkResource = plaidResource.addResource('link-token');
    plaidLinkResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'CreatePlaidLinkToken',
    });

    const plaidExchangeResource = plaidResource.addResource('exchange-token');
    plaidExchangeResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'ExchangePlaidToken',
    });

    const plaidAccountsResource = plaidResource.addResource('accounts');
    plaidAccountsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'GetPlaidAccounts',
    });

    const plaidAccountIdResource = plaidAccountsResource.addResource('{accountId}');
    plaidAccountIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'RemovePlaidAccount',
    });

    const plaidSyncResource = plaidResource.addResource('sync');
    plaidSyncResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'SyncPlaidTransactions',
    });

    const plaidPendingResource = plaidResource.addResource('pending');
    plaidPendingResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'GetPendingTransactions',
    });

    const plaidApproveResource = plaidPendingResource.addResource('approve');
    plaidApproveResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'ApprovePendingTransaction',
    });

    const plaidRejectResource = plaidPendingResource.addResource('reject');
    plaidRejectResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'RejectPendingTransaction',
    });

    const plaidHealthResource = plaidResource.addResource('health');
    plaidHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'PlaidHealthCheck',
    });

    // Sandbox-only endpoint for creating test items
    const plaidSandboxResource = plaidResource.addResource('sandbox');
    const plaidSandboxCreateResource = plaidSandboxResource.addResource('create-item');
    plaidSandboxCreateResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'CreateSandboxItem',
    });

    // Sync status endpoint
    const plaidSyncStatusResource = plaidResource.addResource('sync-status');
    plaidSyncStatusResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.plaidHandler), {
      authorizer,
      operationName: 'GetPlaidSyncStatus',
    });
  }

  private setupReconciliationRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const reconcileResource = this.api.root.addResource('reconcile');

    const reconcileStatusResource = reconcileResource.addResource('status');
    reconcileStatusResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.reconciliationHandler), {
      authorizer,
      operationName: 'GetReconciliationStatus',
    });

    const reconcileUnmatchedResource = reconcileResource.addResource('unmatched');
    reconcileUnmatchedResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.reconciliationHandler), {
      authorizer,
      operationName: 'GetUnmatchedItems',
    });

    const reconcileSuggestionsResource = reconcileResource.addResource('suggestions');
    reconcileSuggestionsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.reconciliationHandler), {
      authorizer,
      operationName: 'GetMatchSuggestions',
    });

    const reconcileMatchResource = reconcileResource.addResource('match');
    reconcileMatchResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.reconciliationHandler), {
      authorizer,
      operationName: 'CreateMatch',
    });

    const reconcileUnmatchResource = reconcileResource.addResource('unmatch');
    reconcileUnmatchResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.reconciliationHandler), {
      authorizer,
      operationName: 'RemoveMatch',
    });

    const reconcileAutoResource = reconcileResource.addResource('auto');
    reconcileAutoResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.reconciliationHandler), {
      authorizer,
      operationName: 'AutoReconcile',
    });

    const reconcileHealthResource = reconcileResource.addResource('health');
    reconcileHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.reconciliationHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'ReconciliationHealthCheck',
    });

    const reconcileMatchIdResource = reconcileResource.addResource('{matchId}');
    reconcileMatchIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.reconciliationHandler), {
      authorizer,
      operationName: 'GetMatch',
    });
  }

  private setupAdminRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const adminResource = this.api.root.addResource('admin');

    // Dashboard endpoint
    const adminDashboardResource = adminResource.addResource('dashboard');
    adminDashboardResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      authorizer,
      operationName: 'GetDashboardMetrics',
    });

    // Users endpoints
    const adminUsersResource = adminResource.addResource('users');
    adminUsersResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      authorizer,
      operationName: 'SearchUsers',
    });

    const adminUserIdResource = adminUsersResource.addResource('{userId}');
    adminUserIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      authorizer,
      operationName: 'GetUserDetails',
    });

    const adminDisableResource = adminUserIdResource.addResource('disable');
    adminDisableResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      authorizer,
      operationName: 'DisableUser',
    });

    const adminEnableResource = adminUserIdResource.addResource('enable');
    adminEnableResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      authorizer,
      operationName: 'EnableUser',
    });

    const adminResetPasswordResource = adminUserIdResource.addResource('reset-password');
    adminResetPasswordResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      authorizer,
      operationName: 'ResetUserPassword',
    });

    // System health endpoint
    const adminSystemHealthResource = adminResource.addResource('system-health');
    adminSystemHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      authorizer,
      operationName: 'GetSystemHealth',
    });

    // Audit log endpoint
    const adminAuditResource = adminResource.addResource('audit');
    adminAuditResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      authorizer,
      operationName: 'GetAuditLog',
    });

    // Health endpoint
    const adminHealthResource = adminResource.addResource('health');
    adminHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.adminHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'AdminHealthCheck',
    });
  }

  private setupComparisonRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const comparisonResource = this.api.root.addResource('comparison');

    // Summary endpoint
    const comparisonSummaryResource = comparisonResource.addResource('summary');
    comparisonSummaryResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.comparisonHandler), {
      authorizer,
      operationName: 'GetComparisonSummary',
    });

    // Preferences endpoints
    const comparisonPreferencesResource = comparisonResource.addResource('preferences');
    comparisonPreferencesResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.comparisonHandler), {
      authorizer,
      operationName: 'GetComparisonPreferences',
    });
    comparisonPreferencesResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.comparisonHandler), {
      authorizer,
      operationName: 'UpdateComparisonPreferences',
    });

    // Health endpoint
    const comparisonHealthResource = comparisonResource.addResource('health');
    comparisonHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.comparisonHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'ComparisonHealthCheck',
    });
  }

  private setupTipsRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const tipsResource = this.api.root.addResource('tips');

    // Feed endpoint
    const tipsFeedResource = tipsResource.addResource('feed');
    tipsFeedResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.tipsHandler), {
      authorizer,
      operationName: 'GetTipsFeed',
    });

    // Daily tip endpoint
    const tipsDailyResource = tipsResource.addResource('daily');
    tipsDailyResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.tipsHandler), {
      authorizer,
      operationName: 'GetDailyTip',
    });

    // Saved tips endpoint
    const tipsSavedResource = tipsResource.addResource('saved');
    tipsSavedResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.tipsHandler), {
      authorizer,
      operationName: 'GetSavedTips',
    });

    // Individual tip actions
    const tipIdResource = tipsResource.addResource('{tipId}');

    const tipSaveResource = tipIdResource.addResource('save');
    tipSaveResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.tipsHandler), {
      authorizer,
      operationName: 'SaveTip',
    });

    const tipDismissResource = tipIdResource.addResource('dismiss');
    tipDismissResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.tipsHandler), {
      authorizer,
      operationName: 'DismissTip',
    });

    // Health endpoint
    const tipsHealthResource = tipsResource.addResource('health');
    tipsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.tipsHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'TipsHealthCheck',
    });
  }

  private setupLearnRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const learnResource = this.api.root.addResource('learn');

    // Courses endpoints
    const coursesResource = learnResource.addResource('courses');
    coursesResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.learnHandler), {
      authorizer,
      operationName: 'GetCourses',
    });

    const courseIdResource = coursesResource.addResource('{courseId}');
    courseIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.learnHandler), {
      authorizer,
      operationName: 'GetCourse',
    });

    // Lessons endpoints
    const lessonsResource = learnResource.addResource('lessons');
    const lessonIdResource = lessonsResource.addResource('{lessonId}');
    lessonIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.learnHandler), {
      authorizer,
      operationName: 'GetLesson',
    });

    const lessonCompleteResource = lessonIdResource.addResource('complete');
    lessonCompleteResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.learnHandler), {
      authorizer,
      operationName: 'CompleteLesson',
    });

    // Quiz endpoints
    const quizResource = learnResource.addResource('quiz');
    const quizIdResource = quizResource.addResource('{quizId}');
    const quizSubmitResource = quizIdResource.addResource('submit');
    quizSubmitResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.learnHandler), {
      authorizer,
      operationName: 'SubmitQuiz',
    });

    // Progress endpoint
    const progressResource = learnResource.addResource('progress');
    progressResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.learnHandler), {
      authorizer,
      operationName: 'GetProgress',
    });

    // Badges endpoint
    const badgesResource = learnResource.addResource('badges');
    badgesResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.learnHandler), {
      authorizer,
      operationName: 'GetBadges',
    });

    // Health endpoint
    const learnHealthResource = learnResource.addResource('health');
    learnHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.learnHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'LearnHealthCheck',
    });
  }

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'FeaturesApiUrl', {
      value: this.api.url,
      description: 'Features API Gateway URL for Plaid, Reconciliation, and Admin endpoints',
      exportName: 'budgetbuddy-features-api-url',
    });
    // Note: Receipt and Pattern Cache bucket outputs are now in ApiFeaturesExtendedStack
  }

  private setupSubscriptionsRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const subscriptionsResource = this.api.root.addResource('subscriptions');
    subscriptionsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.subscriptionsHandler), {
      authorizer,
      operationName: 'GetSubscriptions',
    });
    subscriptionsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.subscriptionsHandler), {
      authorizer,
      operationName: 'CreateSubscription',
    });

    const subscriptionsSummaryResource = subscriptionsResource.addResource('summary');
    subscriptionsSummaryResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.subscriptionsHandler), {
      authorizer,
      operationName: 'GetSubscriptionsSummary',
    });

    const subscriptionsDetectResource = subscriptionsResource.addResource('detect');
    subscriptionsDetectResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.subscriptionsHandler), {
      authorizer,
      operationName: 'DetectSubscriptions',
    });

    const subscriptionsHealthResource = subscriptionsResource.addResource('health');
    subscriptionsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.subscriptionsHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'SubscriptionsHealthCheck',
    });

    const subscriptionIdResource = subscriptionsResource.addResource('{subscriptionId}');
    subscriptionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.subscriptionsHandler), {
      authorizer,
      operationName: 'UpdateSubscription',
    });
    subscriptionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.subscriptionsHandler), {
      authorizer,
      operationName: 'DeleteSubscription',
    });

    const subscriptionStatusResource = subscriptionIdResource.addResource('status');
    subscriptionStatusResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.subscriptionsHandler), {
      authorizer,
      operationName: 'UpdateSubscriptionStatus',
    });
  }

  private setupDebtPayoffRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const debtsResource = this.api.root.addResource('debts');
    debtsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.debtPayoffHandler), {
      authorizer,
      operationName: 'GetDebts',
    });
    debtsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.debtPayoffHandler), {
      authorizer,
      operationName: 'CreateDebt',
    });

    const debtsSummaryResource = debtsResource.addResource('summary');
    debtsSummaryResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.debtPayoffHandler), {
      authorizer,
      operationName: 'GetDebtsSummary',
    });

    const debtsPayoffPlanResource = debtsResource.addResource('payoff-plan');
    debtsPayoffPlanResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.debtPayoffHandler), {
      authorizer,
      operationName: 'GetPayoffPlan',
    });

    const debtsHealthResource = debtsResource.addResource('health');
    debtsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.debtPayoffHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'DebtsHealthCheck',
    });

    const debtIdResource = debtsResource.addResource('{debtId}');
    debtIdResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.debtPayoffHandler), {
      authorizer,
      operationName: 'UpdateDebt',
    });
    debtIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.debtPayoffHandler), {
      authorizer,
      operationName: 'DeleteDebt',
    });

    const debtPaymentResource = debtIdResource.addResource('payment');
    debtPaymentResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.debtPayoffHandler), {
      authorizer,
      operationName: 'RecordDebtPayment',
    });
  }

  private setupCreditScoreRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const creditScoreResource = this.api.root.addResource('credit-score');

    // Get current credit score
    creditScoreResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.creditScoreHandler), {
      authorizer,
      operationName: 'GetCreditScore',
    });

    // Refresh credit score from bureau
    const refreshResource = creditScoreResource.addResource('refresh');
    refreshResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.creditScoreHandler), {
      authorizer,
      operationName: 'RefreshCreditScore',
    });

    // Get credit score history
    const historyResource = creditScoreResource.addResource('history');
    historyResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.creditScoreHandler), {
      authorizer,
      operationName: 'GetCreditScoreHistory',
    });

    // Update credit score settings
    const settingsResource = creditScoreResource.addResource('settings');
    settingsResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.creditScoreHandler), {
      authorizer,
      operationName: 'UpdateCreditScoreSettings',
    });

    // Health check
    const healthResource = creditScoreResource.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.creditScoreHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'CreditScoreHealthCheck',
    });
  }

  private setupEmailRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const emailResource = this.api.root.addResource('email');

    // Health endpoint (public)
    const emailHealthResource = emailResource.addResource('health');
    emailHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.emailHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'EmailHealthCheck',
    });

    // Send invitation email (protected)
    const sendInvitationResource = emailResource.addResource('send-invitation');
    sendInvitationResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.emailHandler), {
      authorizer,
      operationName: 'SendInvitationEmail',
    });

    // Send removal notification email (protected)
    const sendRemovalResource = emailResource.addResource('send-removal');
    sendRemovalResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.emailHandler), {
      authorizer,
      operationName: 'SendRemovalEmail',
    });

    // Send acceptance notification email (protected)
    const sendAcceptanceResource = emailResource.addResource('send-acceptance');
    sendAcceptanceResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.emailHandler), {
      authorizer,
      operationName: 'SendAcceptanceEmail',
    });
  }
}
