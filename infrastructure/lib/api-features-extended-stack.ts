/**
 * API Features Extended Stack for BudgetBuddy Application
 *
 * Contains Lambda functions and API routes for AI-powered features:
 * - Insights (AI spending analytics)
 * - Receipt (AI receipt scanning)
 * - Pattern Detection (AI recurring bill detection)
 * - Budget Planning (AI budget suggestions)
 *
 * This stack was split from api-features-stack to stay under CloudFormation's
 * 500 resource limit.
 */

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface ApiFeaturesExtendedStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  // Note: commonLayer and sharedLayer are now created internally to avoid CloudFormation export dependency issues
}

export class ApiFeaturesExtendedStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly functions: { [key: string]: lambda.Function } = {};
  public readonly receiptBucket: s3.Bucket;
  public readonly patternCacheBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ApiFeaturesExtendedStackProps) {
    super(scope, id, props);

    // Create own CommonLayer to avoid CloudFormation export dependency issues
    const commonLayer = new lambda.LayerVersion(this, 'ExtendedCommonLayer', {
      layerVersionName: 'budgetbuddy-extended-common',
      code: lambda.Code.fromAsset('../backend/layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Common dependencies for BudgetBuddy Extended Features API',
    });

    // Create own SharedLayer to avoid CloudFormation export dependency issues
    const sharedLayer = new lambda.LayerVersion(this, 'ExtendedSharedLayer', {
      layerVersionName: 'budgetbuddy-extended-shared',
      code: lambda.Code.fromAsset('../backend/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for BudgetBuddy Extended Features API',
    });

    // Create S3 bucket for receipt images
    this.receiptBucket = new s3.Bucket(this, 'ReceiptBucket', {
      bucketName: `budgetbuddy-receipts-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteAfter30Days',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://d1ueeugn9zcx7n.cloudfront.net',
            'https://d2ubhx2a13s7gc.cloudfront.net',
            'https://app.budgetbuddy.com',
          ],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create S3 bucket for pattern analysis cache
    this.patternCacheBucket = new s3.Bucket(this, 'PatternCacheBucket', {
      bucketName: `budgetbuddy-pattern-cache-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteAfter30Days',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });


    // Create separate API Gateway for extended features
    this.api = new apigateway.RestApi(this, 'ExtendedFeaturesApi', {
      restApiName: 'budgetbuddy-extended-api',
      description: 'BudgetBuddy Extended API for AI-powered features',
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://d1ueeugn9zcx7n.cloudfront.net',
          'https://d2ubhx2a13s7gc.cloudfront.net',
          'https://app.budgetbuddy.com',
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
        dataTraceEnabled: false, // Never log full request/response bodies — contains financial data
        metricsEnabled: true,
      },
    });

    // Create Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ExtendedAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'budgetbuddy-extended-authorizer',
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
    this.createLambdaFunctions(commonProps);

    // Grant DynamoDB permissions
    Object.values(this.functions).forEach(func => {
      props.table.grantReadWriteData(func);
    });

    // Set up API routes
    this.setupApiRoutes(authorizer);

    // Add Gateway Responses for CORS
    this.addGatewayResponses();

    // Create outputs
    this.createOutputs();
  }

  private addGatewayResponses(): void {
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

    this.api.addGatewayResponse('Default4XXResponse', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    this.api.addGatewayResponse('Default5XXResponse', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });
  }


  private createLambdaFunctions(commonProps: any): void {
    // Insights Lambda
    this.functions.insightsHandler = new lambda.Function(this, 'InsightsHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-insights',
      code: lambda.Code.fromAsset('../backend/functions/insights', {
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
      description: 'BudgetBuddy insights handler for spending analytics and AI-generated insights',
      timeout: cdk.Duration.seconds(60),
    });

    // Grant Insights Lambda permission to invoke Bedrock
    this.functions.insightsHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: [`arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`],
    }));

    // Receipt Lambda
    this.functions.receiptHandler = new lambda.Function(this, 'ReceiptHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-receipt',
      code: lambda.Code.fromAsset('../backend/functions/receipt', {
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
      description: 'BudgetBuddy receipt handler for AI-powered receipt scanning',
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...commonProps.environment,
        RECEIPT_BUCKET: this.receiptBucket.bucketName,
      },
    });

    // Grant Receipt Lambda permissions for S3 and Textract
    this.receiptBucket.grantReadWrite(this.functions.receiptHandler);
    this.functions.receiptHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'textract:AnalyzeExpense',
        'textract:DetectDocumentText',
      ],
      resources: ['*'],
    }));

    // Pattern Detection Lambda
    this.functions.patternDetectionHandler = new lambda.Function(this, 'PatternDetectionHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-pattern-detection',
      code: lambda.Code.fromAsset('../backend/functions/pattern-detection', {
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
      description: 'BudgetBuddy pattern detection handler for AI-powered recurring bill detection',
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: {
        ...commonProps.environment,
        PATTERN_CACHE_BUCKET: this.patternCacheBucket.bucketName,
      },
    });

    // Grant Pattern Detection Lambda permissions for S3 and Bedrock
    this.patternCacheBucket.grantReadWrite(this.functions.patternDetectionHandler);
    this.functions.patternDetectionHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: [`arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`],
    }));

    // Budget Planning Lambda
    this.functions.budgetPlanningHandler = new lambda.Function(this, 'BudgetPlanningHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-budget-planning',
      code: lambda.Code.fromAsset('../backend/functions/budget-planning', {
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
      description: 'BudgetBuddy budget planning handler for AI-powered budget suggestions',
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
    });

    // Grant Budget Planning Lambda permission to invoke Bedrock
    this.functions.budgetPlanningHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: [`arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`],
    }));
  }


  private setupApiRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    this.setupInsightsRoutes(authorizer);
    this.setupReceiptRoutes(authorizer);
    this.setupPatternDetectionRoutes(authorizer);
    this.setupBudgetPlanningRoutes(authorizer);
  }

  private setupInsightsRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const insightsResource = this.api.root.addResource('insights');

    const insightsWeeklyResource = insightsResource.addResource('weekly');
    insightsWeeklyResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'GetWeeklyInsights',
    });

    const insightsMonthlyResource = insightsResource.addResource('monthly');
    insightsMonthlyResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'GetMonthlyInsights',
    });

    const insightsTrendsResource = insightsResource.addResource('trends');
    insightsTrendsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'GetSpendingTrends',
    });

    const insightsPatternsResource = insightsResource.addResource('patterns');
    insightsPatternsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'GetSpendingPatterns',
    });

    const insightsAskResource = insightsResource.addResource('ask');
    insightsAskResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      authorizer,
      operationName: 'AskAboutSpending',
    });

    const insightsHealthResource = insightsResource.addResource('health');
    insightsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.insightsHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'InsightsHealthCheck',
    });
  }

  private setupReceiptRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const receiptResource = this.api.root.addResource('receipt');

    const receiptUploadResource = receiptResource.addResource('upload');
    receiptUploadResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'GetReceiptUploadUrl',
    });

    const receiptProcessResource = receiptResource.addResource('process');
    receiptProcessResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'ProcessReceipt',
    });

    const receiptUsageResource = receiptResource.addResource('usage');
    receiptUsageResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'GetReceiptUsage',
    });

    const receiptHistoryResource = receiptResource.addResource('history');
    receiptHistoryResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'GetReceiptHistory',
    });

    const receiptHealthResource = receiptResource.addResource('health');
    receiptHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'ReceiptHealthCheck',
    });

    const receiptIdResource = receiptResource.addResource('{receiptId}');
    receiptIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.receiptHandler), {
      authorizer,
      operationName: 'GetReceipt',
    });
  }

  private setupPatternDetectionRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const patternsResource = this.api.root.addResource('patterns');

    const patternsDetectResource = patternsResource.addResource('detect');
    patternsDetectResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.patternDetectionHandler), {
      authorizer,
      operationName: 'DetectPatterns',
    });

    // Manual pattern creation endpoint
    const patternsManualResource = patternsResource.addResource('manual');
    patternsManualResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.patternDetectionHandler), {
      authorizer,
      operationName: 'CreateManualPattern',
    });

    patternsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.patternDetectionHandler), {
      authorizer,
      operationName: 'GetPatterns',
    });

    const patternIdResource = patternsResource.addResource('{patternId}');
    patternIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.patternDetectionHandler), {
      authorizer,
      operationName: 'GetPattern',
    });
    patternIdResource.addMethod('PUT', new apigateway.LambdaIntegration(this.functions.patternDetectionHandler), {
      authorizer,
      operationName: 'UpdatePattern',
    });
    patternIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.patternDetectionHandler), {
      authorizer,
      operationName: 'DeletePattern',
    });

    const patternsHealthResource = patternsResource.addResource('health');
    patternsHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.patternDetectionHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'PatternDetectionHealthCheck',
    });
  }

  private setupBudgetPlanningRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    const budgetResource = this.api.root.addResource('budget-planning');

    const suggestionsResource = budgetResource.addResource('suggestions');
    suggestionsResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.budgetPlanningHandler), {
      authorizer,
      operationName: 'GenerateBudgetSuggestions',
    });
    suggestionsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.budgetPlanningHandler), {
      authorizer,
      operationName: 'GetBudgetSuggestions',
    });

    const applyResource = budgetResource.addResource('apply');
    applyResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.budgetPlanningHandler), {
      authorizer,
      operationName: 'ApplyBudgetSuggestions',
    });

    const budgetHealthResource = budgetResource.addResource('health');
    budgetHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.budgetPlanningHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'BudgetPlanningHealthCheck',
    });
  }

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ExtendedApiUrl', {
      value: this.api.url,
      description: 'Extended Features API Gateway URL for AI-powered features',
      exportName: 'budgetbuddy-extended-api-url',
    });

    new cdk.CfnOutput(this, 'ReceiptBucketName', {
      value: this.receiptBucket.bucketName,
      description: 'S3 bucket for receipt image storage',
      exportName: 'budgetbuddy-receipt-bucket-name',
    });

    new cdk.CfnOutput(this, 'PatternCacheBucketName', {
      value: this.patternCacheBucket.bucketName,
      description: 'S3 bucket for pattern analysis cache',
      exportName: 'budgetbuddy-pattern-cache-bucket-name',
    });
  }
}
