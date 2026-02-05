/**
 * API Family Stack for BudgetBuddy Application
 *
 * Standalone stack for family collaboration features to avoid circular dependencies
 * and CloudFormation resource limits in the main API stacks.
 *
 * Features:
 * - Family management (create, invite, accept, leave)
 * - Member management (add, remove, update roles)
 * - Invitation management (send, resend, revoke)
 * - Email notifications for family events
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

export interface ApiFamilyStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
}

export class ApiFamilyStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly functions: { [key: string]: lambda.Function } = {};

  constructor(scope: Construct, id: string, props: ApiFamilyStackProps) {
    super(scope, id, props);

    // Create own CommonLayer to avoid CloudFormation export dependency issues
    const commonLayer = new lambda.LayerVersion(this, 'FamilyCommonLayer', {
      layerVersionName: 'budgetbuddy-family-common',
      code: lambda.Code.fromAsset('../backend/layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Common dependencies for BudgetBuddy Family API Lambda functions (independent copy)',
    });

    // Create own SharedLayer to avoid CloudFormation export dependency issues
    const sharedLayer = new lambda.LayerVersion(this, 'FamilySharedLayer', {
      layerVersionName: 'budgetbuddy-family-shared',
      code: lambda.Code.fromAsset('../backend/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for BudgetBuddy Family API Lambda functions (independent copy)',
    });

    // Create separate API Gateway for family features
    this.api = new apigateway.RestApi(this, 'FamilyApi', {
      restApiName: 'budgetbuddy-family-api',
      description: 'BudgetBuddy Family API for family collaboration and member management',
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
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'FamilyAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'budgetbuddy-family-authorizer',
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
    _props: ApiFamilyStackProps,
    commonProps: any
  ): void {
    // Family Lambda
    this.functions.familyHandler = new lambda.Function(this, 'FamilyHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-family',
      code: lambda.Code.fromAsset('../backend/functions/family'),
      handler: 'index.handler',
      description: 'BudgetBuddy family handler for family collaboration, member management, and invitations',
      environment: {
        ...commonProps.environment,
        FAMILY_API_URL: this.api.url, // Add Family API URL for email service calls
      },
    });

    // Email Lambda (for family invitation emails)
    this.functions.emailHandler = new lambda.Function(this, 'EmailHandler', {
      ...commonProps,
      functionName: 'budgetbuddy-email-family',
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
  }

  private setupApiRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
    // Family routes
    this.setupFamilyRoutes(authorizer);

    // Email routes
    this.setupEmailRoutes(authorizer);
  }

  private setupFamilyRoutes(authorizer: apigateway.CognitoUserPoolsAuthorizer): void {
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

    // Family invitations management endpoints (protected - primary only)
    const familyInvitationsResource = familyResource.addResource('invitations');
    familyInvitationsResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'GetFamilyInvitations',
    });

    // Family invitation by ID endpoints (protected - primary only)
    const familyInvitationIdResource = familyInvitationsResource.addResource('{invitationId}');
    familyInvitationIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'RevokeFamilyInvitation',
    });

    // Family invitation resend endpoint (protected - primary only)
    const familyInvitationResendResource = familyInvitationIdResource.addResource('resend');
    familyInvitationResendResource.addMethod('POST', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      authorizer,
      operationName: 'ResendFamilyInvitation',
    });

    // Family health endpoint
    const familyHealthResource = familyResource.addResource('health');
    familyHealthResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.familyHandler), {
      methodResponses: [{ statusCode: '200' }],
      operationName: 'FamilyHealthCheck',
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

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'FamilyApiUrl', {
      value: this.api.url,
      description: 'Family API Gateway URL for family collaboration endpoints',
      exportName: 'budgetbuddy-family-api-url',
    });
  }
}
