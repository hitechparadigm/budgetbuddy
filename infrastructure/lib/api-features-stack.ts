/**
 * API Features Stack for BudgetBuddy Application
 *
 * Contains Lambda functions and API routes for competitive features:
 * - Plaid (bank sync)
 * - Reconciliation (receipt-to-bank matching)
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
import { Construct } from 'constructs';

export interface ApiFeaturesStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  commonLayer: lambda.LayerVersion;
  sharedLayer: lambda.LayerVersion;
}

export class ApiFeaturesStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly functions: { [key: string]: lambda.Function } = {};

  constructor(scope: Construct, id: string, props: ApiFeaturesStackProps) {
    super(scope, id, props);

    // Create separate API Gateway for features
    this.api = new apigateway.RestApi(this, 'FeaturesApi', {
      restApiName: 'budgetbuddy-features-api',
      description: 'BudgetBuddy Features API for Plaid, Reconciliation, and other integrations',
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
        dataTraceEnabled: true,
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
      layers: [props.commonLayer, props.sharedLayer],
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

    // Create outputs
    this.createOutputs();
  }

  private createLambdaFunctions(
    props: ApiFeaturesStackProps,
    commonProps: any
  ): void {
    // Plaid Lambda
    this.functions.plaidHandler = new lambda.Function(this, 'PlaidHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-plaid',
      code: lambda.Code.fromAsset('../backend/functions/plaid'),
      handler: 'index.handler',
      description: 'BudgetBuddy Plaid handler for bank account sync',
      environment: {
        ...commonProps.environment,
        PLAID_MOCK_MODE: 'true',
      },
    });

    // Reconciliation Lambda
    this.functions.reconciliationHandler = new lambda.Function(this, 'ReconciliationHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-reconciliation',
      code: lambda.Code.fromAsset('../backend/functions/reconciliation'),
      handler: 'index.handler',
      description: 'BudgetBuddy reconciliation handler for receipt-to-bank matching',
    });
  }

  private setupApiRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    // Plaid routes
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

    // Reconciliation routes
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

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'FeaturesApiUrl', {
      value: this.api.url,
      description: 'Features API Gateway URL for Plaid and Reconciliation endpoints',
      exportName: 'budgetbuddy-features-api-url',
    });
  }
}
