/**
 * API Budgets Stack for BudgetBuddy Application
 *
 * Standalone stack for budget collaboration features. Replaces the
 * api-family-stack as part of the Budget Model Redesign (REQ-4).
 *
 * Features:
 * - Budget management (create, invite, accept, leave)
 * - Member management (add, remove, update roles)
 * - Invitation management (send, resend, revoke)
 * - Email notifications for budget events
 *
 * This stack has its own API Gateway to avoid cyclic dependencies
 * with other API stacks and stay under CloudFormation's 500 resource limit.
 */

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ApiBudgetsStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
}

export class ApiBudgetsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly functions: { [key: string]: lambda.Function } = {};

  constructor(scope: Construct, id: string, props: ApiBudgetsStackProps) {
    super(scope, id, props);

    // Create own CommonLayer to avoid CloudFormation export dependency issues
    const commonLayer = new lambda.LayerVersion(this, 'BudgetsCommonLayer', {
      layerVersionName: 'budgetbuddy-budgets-common',
      code: lambda.Code.fromAsset('../backend/layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Common dependencies for BudgetBuddy Budgets API Lambda functions (independent copy)',
    });

    // Create own SharedLayer to avoid CloudFormation export dependency issues
    const sharedLayer = new lambda.LayerVersion(this, 'BudgetsSharedLayer', {
      layerVersionName: 'budgetbuddy-budgets-shared',
      code: lambda.Code.fromAsset('../backend/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for BudgetBuddy Budgets API Lambda functions (independent copy)',
    });

    // Create separate API Gateway for budgets features
    this.api = new apigateway.RestApi(this, 'BudgetsApi', {
      restApiName: 'budgetbuddy-budgets-api',
      description: 'BudgetBuddy Budgets API for budget collaboration and member management',
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
        dataTraceEnabled: false, // Never log full request/response bodies — contains invitation tokens, budget PII
        metricsEnabled: true,
      },
    });

    // Create Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'BudgetsAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'budgetbuddy-budgets-authorizer',
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

    // Add Gateway Responses for CORS on 4XX errors
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
    _props: ApiBudgetsStackProps,
    commonProps: any
  ): void {
    // Construct API URL without stage reference to avoid circular dependency
    // Format: https://{restApiId}.execute-api.{region}.amazonaws.com/v1
    const apiUrlWithoutStage = `https://${this.api.restApiId}.execute-api.${cdk.Stack.of(this).region}.amazonaws.com/v1`;

    // Budgets Lambda
    this.functions.budgetsHandler = new lambda.Function(this, 'BudgetsHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-budgets',
      code: lambda.Code.fromAsset('../backend/functions/budgets'),
      handler: 'index.handler',
      description: 'BudgetBuddy budgets handler for budget collaboration, member management, and invitations',
      environment: {
        ...commonProps.environment,
        BUDGETS_API_URL: apiUrlWithoutStage, // Use URL without stage reference to avoid circular dependency
        FAMILY_API_URL: apiUrlWithoutStage,  // Backward-compat alias — same value
        WEB_APP_URL: this.node.tryGetContext('webAppUrl') || 'https://d1ueeugn9zcx7n.cloudfront.net',
      },
    });

    // Email Lambda (for budget invitation emails)
    this.functions.emailHandler = new lambda.Function(this, 'EmailHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-email-budgets',
      code: lambda.Code.fromAsset('../backend/functions/email'),
      handler: 'index.handler',
      description: 'BudgetBuddy email handler for budget invitations and notifications via SES',
      environment: {
        ...commonProps.environment,
        // info@hitechparadigm.com is verified in SES for sending
        FROM_EMAIL: this.node.tryGetContext('fromEmail') || 'info@hitechparadigm.com',
      },
    });

    // Grant Email Lambda permission to send emails via SES
    this.functions.emailHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));
  }

  private setupApiRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    // Budgets routes
    this.setupBudgetsRoutes(authorizer);

    // Email routes
    this.setupEmailRoutes(authorizer);
  }

  private setupBudgetsRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    // Create Lambda integration once to avoid circular dependencies
    const budgetsIntegration = new apigateway.LambdaIntegration(this.functions.budgetsHandler, {
      proxy: true,
      allowTestInvoke: false, // Prevents duplicate test-invoke permissions — fixes Lambda policy size limit (20KB)
    });

    // /budgets — list, create
    const budgetsResource = this.api.root.addResource('budgets');
    budgetsResource.addMethod('GET', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'GetBudgets',
    });
    budgetsResource.addMethod('POST', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'CreateBudget',
    });
    // Bug 2 fix: PUT /budgets/active — set active budget
    budgetsResource.addMethod('PUT', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'SetActiveBudget',
    });

    // /budgets/active — explicit resource so API Gateway routes PUT /budgets/active correctly
    const budgetsActiveResource = budgetsResource.addResource('active');
    budgetsActiveResource.addMethod('PUT', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'SetActiveBudgetExplicit',
    });

    // /budgets/accept-invitation — accept a budget invitation
    // PUBLIC — invitee may not be logged in yet when following invitation link
    const budgetsAcceptResource = budgetsResource.addResource('accept-invitation');
    budgetsAcceptResource.addMethod('POST', budgetsIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      operationName: 'AcceptBudgetInvitation',
    });

    // /budgets/health — health check (public)
    const budgetsHealthResource = budgetsResource.addResource('health');
    budgetsHealthResource.addMethod('GET', budgetsIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [{ statusCode: '200' }],
      operationName: 'BudgetsHealthCheck',
    });

    // Bug 3 fix: /budgets/{budgetId} — budget-scoped routes with path parameter
    const budgetIdResource = budgetsResource.addResource('{budgetId}');

    // DELETE /budgets/{budgetId} — delete a budget
    budgetIdResource.addMethod('DELETE', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'DeleteBudget',
    });

    // /budgets/{budgetId}/invite — send invitation
    const budgetInviteResource = budgetIdResource.addResource('invite');
    budgetInviteResource.addMethod('POST', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'InviteBudgetMember',
    });

    // /budgets/{budgetId}/leave — leave a budget
    const budgetLeaveResource = budgetIdResource.addResource('leave');
    budgetLeaveResource.addMethod('POST', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'LeaveBudget',
    });

    // /budgets/{budgetId}/archive — archive a budget
    const budgetArchiveResource = budgetIdResource.addResource('archive');
    budgetArchiveResource.addMethod('PUT', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'ArchiveBudget',
    });

    // /budgets/{budgetId}/restore — restore an archived budget
    const budgetRestoreResource = budgetIdResource.addResource('restore');
    budgetRestoreResource.addMethod('PUT', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'RestoreBudget',
    });

    // /budgets/{budgetId}/members — list members
    const budgetMembersResource = budgetIdResource.addResource('members');
    budgetMembersResource.addMethod('GET', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'GetBudgetMembers',
    });

    // /budgets/{budgetId}/members/{userId} — update or remove a specific member
    const budgetMemberIdResource = budgetMembersResource.addResource('{userId}');
    budgetMemberIdResource.addMethod('PUT', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'UpdateBudgetMemberRole',
    });
    budgetMemberIdResource.addMethod('DELETE', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'RemoveBudgetMember',
    });

    // /budgets/{budgetId}/members/{userId}/extend — extend viewer access
    const budgetMemberExtendResource = budgetMemberIdResource.addResource('extend');
    budgetMemberExtendResource.addMethod('PUT', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'ExtendBudgetViewerAccess',
    });

    // /budgets/{budgetId}/invitations — list pending invitations
    const budgetInvitationsResource = budgetIdResource.addResource('invitations');
    budgetInvitationsResource.addMethod('GET', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'GetBudgetInvitations',
    });

    // /budgets/{budgetId}/invitations/{invitationId} — revoke a specific invitation
    const budgetInvitationIdResource = budgetInvitationsResource.addResource('{invitationId}');
    budgetInvitationIdResource.addMethod('DELETE', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'RevokeBudgetInvitation',
    });

    // /budgets/{budgetId}/invitations/{invitationId}/resend — resend an invitation
    const budgetInvitationResendResource = budgetInvitationIdResource.addResource('resend');
    budgetInvitationResendResource.addMethod('POST', budgetsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'ResendBudgetInvitation',
    });
  }

  private setupEmailRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    // Create Lambda integration once to avoid circular dependencies
    const emailIntegration = new apigateway.LambdaIntegration(this.functions.emailHandler, {
      proxy: true,
      allowTestInvoke: false, // Prevents duplicate test-invoke permissions — fixes Lambda policy size limit (20KB)
    });

    const emailResource = this.api.root.addResource('email');

    // Health endpoint (public)
    const emailHealthResource = emailResource.addResource('health');
    emailHealthResource.addMethod('GET', emailIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [{ statusCode: '200' }],
      operationName: 'EmailHealthCheck',
    });

    // Send invitation email (protected)
    const sendInvitationResource = emailResource.addResource('send-invitation');
    sendInvitationResource.addMethod('POST', emailIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'SendInvitationEmail',
    });

    // Send removal notification email (protected)
    const sendRemovalResource = emailResource.addResource('send-removal');
    sendRemovalResource.addMethod('POST', emailIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'SendRemovalEmail',
    });

    // Send acceptance notification email (protected)
    const sendAcceptanceResource = emailResource.addResource('send-acceptance');
    sendAcceptanceResource.addMethod('POST', emailIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      operationName: 'SendAcceptanceEmail',
    });
  }

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'BudgetsApiUrl', {
      value: this.api.url,
      description: 'Budgets API Gateway URL for budget collaboration endpoints',
      exportName: 'budgetbuddy-budgets-api-url',
    });
  }
}
