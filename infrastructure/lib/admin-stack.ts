/**
 * Admin Stack for BudgetBuddy Application
 *
 * Creates infrastructure for the admin dashboard including:
 * - Separate Cognito User Pool for admin users
 * - Admin API Gateway with IP allowlist
 * - CloudFront distribution for admin web app
 * - S3 bucket for admin static assets
 *
 * Security Features:
 * - IP-based access control
 * - Separate authentication from main app
 * - Audit logging for all admin actions
 *
 * Last Updated: 2026-02-02
 */

import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

interface AdminStackProps extends cdk.StackProps {
  mainTable: dynamodb.ITable;
  sharedLayer: lambda.ILayerVersion;
  commonLayer: lambda.ILayerVersion;
  allowedIpRanges?: string[];
}

export class AdminStack extends cdk.Stack {
  /**
   * Admin Cognito User Pool
   */
  public readonly adminUserPool: cognito.UserPool;

  /**
   * Admin User Pool Client
   */
  public readonly adminUserPoolClient: cognito.UserPoolClient;

  /**
   * Admin API Gateway
   */
  public readonly adminApi: apigateway.RestApi;

  /**
   * CloudFront distribution for admin app
   */
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: AdminStackProps) {
    super(scope, id, props);

    const { mainTable, sharedLayer, commonLayer, allowedIpRanges = [] } = props;

    // ========================================
    // Admin Cognito User Pool
    // ========================================

    this.adminUserPool = new cognito.UserPool(this, "AdminUserPool", {
      userPoolName: "budgetbuddy-admin-users",
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      selfSignUpEnabled: false, // Admin accounts created manually
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.adminUserPoolClient = this.adminUserPool.addClient("AdminAppClient", {
      userPoolClientName: "budgetbuddy-admin-app",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity: cdk.Duration.minutes(30),
      idTokenValidity: cdk.Duration.minutes(30),
      refreshTokenValidity: cdk.Duration.days(1),
      preventUserExistenceErrors: true,
    });

    // ========================================
    // Admin Lambda Function
    // ========================================

    const adminLambda = new lambda.Function(this, "AdminFunction", {
      functionName: "budgetbuddy-admin",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../backend/functions/admin")
      ),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        TABLE_NAME: mainTable.tableName,
        ADMIN_USER_POOL_ID: this.adminUserPool.userPoolId,
        NODE_OPTIONS: "--enable-source-maps",
      },
      layers: [sharedLayer, commonLayer],
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant DynamoDB permissions
    mainTable.grantReadWriteData(adminLambda);

    // Grant CloudWatch Logs permissions for audit logging
    adminLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
        ],
        resources: ["*"],
      })
    );

    // Grant Cognito permissions for user management
    adminLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:ListUsers",
          "cognito-idp:AdminUpdateUserAttributes",
        ],
        resources: ["*"],
      })
    );

    // ========================================
    // Admin API Gateway
    // ========================================

    this.adminApi = new apigateway.RestApi(this, "AdminApi", {
      restApiName: "BudgetBuddy Admin API",
      description: "Admin API for BudgetBuddy management",
      deployOptions: {
        stageName: "v1",
        throttlingBurstLimit: 50,
        throttlingRateLimit: 100,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
        ],
      },
    });

    // IP-based resource policy (if IP ranges provided)
    if (allowedIpRanges.length > 0) {
      const resourcePolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ["execute-api:Invoke"],
            resources: [this.adminApi.arnForExecuteApi()],
            conditions: {
              IpAddress: {
                "aws:SourceIp": allowedIpRanges,
              },
            },
          }),
        ],
      });
      (this.adminApi.node.defaultChild as apigateway.CfnRestApi).policy =
        resourcePolicy;
    }

    // Cognito Authorizer for admin API
    const adminAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "AdminAuthorizer",
      {
        cognitoUserPools: [this.adminUserPool],
        authorizerName: "AdminCognitoAuthorizer",
        identitySource: "method.request.header.Authorization",
      }
    );

    // Lambda integration
    const adminIntegration = new apigateway.LambdaIntegration(adminLambda, {
      proxy: true,
    });

    // API Routes
    const adminResource = this.adminApi.root.addResource("admin");

    // Health check (no auth required)
    const healthResource = adminResource.addResource("health");
    healthResource.addMethod("GET", adminIntegration);

    // Users management
    const usersResource = adminResource.addResource("users");
    usersResource.addMethod("GET", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const userResource = usersResource.addResource("{userId}");
    userResource.addMethod("GET", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    userResource.addMethod("PUT", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Analytics
    const analyticsResource = adminResource.addResource("analytics");
    analyticsResource.addMethod("GET", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Content management
    const contentResource = adminResource.addResource("content");
    contentResource.addMethod("GET", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    contentResource.addMethod("POST", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const contentItemResource = contentResource.addResource("{contentId}");
    contentItemResource.addMethod("GET", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    contentItemResource.addMethod("PUT", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    contentItemResource.addMethod("DELETE", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Audit logs
    const auditResource = adminResource.addResource("audit");
    auditResource.addMethod("GET", adminIntegration, {
      authorizer: adminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ========================================
    // S3 Bucket for Admin Static Assets
    // ========================================

    const adminBucket = new s3.Bucket(this, "AdminBucket", {
      bucketName: `budgetbuddy-admin-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
    });

    // ========================================
    // CloudFront Distribution
    // ========================================

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "AdminOAI",
      {
        comment: "OAI for BudgetBuddy Admin App",
      }
    );

    adminBucket.grantRead(originAccessIdentity);

    this.distribution = new cloudfront.Distribution(
      this,
      "AdminDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(adminBucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        comment: "BudgetBuddy Admin Dashboard",
      }
    );

    // ========================================
    // Outputs
    // ========================================

    new cdk.CfnOutput(this, "AdminUserPoolId", {
      value: this.adminUserPool.userPoolId,
      description: "Admin Cognito User Pool ID",
      exportName: "BudgetBuddyAdminUserPoolId",
    });

    new cdk.CfnOutput(this, "AdminUserPoolClientId", {
      value: this.adminUserPoolClient.userPoolClientId,
      description: "Admin Cognito User Pool Client ID",
      exportName: "BudgetBuddyAdminUserPoolClientId",
    });

    new cdk.CfnOutput(this, "AdminApiUrl", {
      value: this.adminApi.url,
      description: "Admin API Gateway URL",
      exportName: "BudgetBuddyAdminApiUrl",
    });

    new cdk.CfnOutput(this, "AdminDistributionUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "Admin CloudFront Distribution URL",
      exportName: "BudgetBuddyAdminDistributionUrl",
    });

    new cdk.CfnOutput(this, "AdminBucketName", {
      value: adminBucket.bucketName,
      description: "Admin S3 Bucket Name",
      exportName: "BudgetBuddyAdminBucketName",
    });
  }
}
