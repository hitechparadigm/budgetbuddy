/**
 * Auth Onboarding Lambda Stack
 *
 * Creates a standalone Lambda function for handling user onboarding completion.
 * This is part of the architectural refactoring to split the monolithic auth Lambda
 * into separate, focused functions.
 *
 * Key Features:
 * - Standalone Lambda function (~300 lines vs 1484 in monolithic)
 * - Shared utilities layer for common code
 * - Minimal IAM permissions (DynamoDB read/write only)
 * - Independent deployment from other auth functions
 * - CloudWatch logging and monitoring
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Props for the Auth Onboarding Stack
 * Requires DynamoDB table only (layer is created internally)
 */
export interface AuthOnboardingStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}

export class AuthOnboardingStack extends cdk.Stack {
  /**
   * Auth Onboarding Lambda Function
   * Exposed as public property for API Gateway integration
   */
  public readonly onboardingFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AuthOnboardingStackProps) {
    super(scope, id, props);

    /**
     * Auth Shared Lambda Layer
     * Create our own reference to avoid cross-stack dependency issues
     */
    const authSharedLayer = new lambda.LayerVersion(this, 'AuthSharedLayer', {
      code: lambda.Code.fromAsset('../backend/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared authentication utilities for auth-onboarding Lambda',
      layerVersionName: 'budgetbuddy-auth-shared-onboarding',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    /**
     * Common Lambda Layer
     * Contains DynamoDB helpers and FamilyIdResolver utilities
     */
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      layerVersionName: 'budgetbuddy-common-onboarding',
      code: lambda.Code.fromAsset('../backend/layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Common utilities for auth-onboarding Lambda (DynamoDB helpers, FamilyIdResolver)',
    });

    /**
     * Auth Onboarding Lambda Function
     *
     * Handles user onboarding completion:
     * - Marks user profile as onboarded
     * - Creates initial budget for current month
     * - Sets up expense categories based on user selections
     *
     * CRITICAL FIX: All imports at top of file to prevent ReferenceError
     */
    this.onboardingFunction = new lambda.Function(this, 'AuthOnboardingFunction', {
      functionName: 'budgetbuddy-auth-onboarding',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/functions/auth-onboarding'),
      description: 'BudgetBuddy auth onboarding handler - completes user onboarding and creates initial budget',

      // Attach shared utilities layers
      layers: [
        authSharedLayer, // CORS, token parsing, validation, error handling (created locally)
        commonLayer,     // DynamoDB helpers, FamilyIdResolver
      ],

      // Environment variables
      environment: {
        TABLE_NAME: props.table.tableName,
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },

      // Performance configuration
      timeout: cdk.Duration.seconds(30),
      memorySize: 512, // Balanced for cost and performance

      // CloudWatch logging
      logRetention: logs.RetentionDays.ONE_WEEK, // Cost optimization

      // Automatic cleanup when stack is destroyed (for dev environments)
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep old versions for rollback
      },
    });

    /**
     * Grant DynamoDB permissions
     *
     * Minimal permissions following least privilege principle:
     * - PutItem: Create budget records
     * - GetItem: Verify budget creation and resolve family ID
     * - UpdateItem: Mark user profile as onboarded
     */
    props.table.grantReadWriteData(this.onboardingFunction);

    // Add comprehensive cost allocation tags
    cdk.Tags.of(this.onboardingFunction).add('Component', 'Authentication');
    cdk.Tags.of(this.onboardingFunction).add('Service', 'Lambda');
    cdk.Tags.of(this.onboardingFunction).add('Handler', 'auth-onboarding');
    cdk.Tags.of(this.onboardingFunction).add('Runtime', 'NodeJS-20');
    cdk.Tags.of(this.onboardingFunction).add('CostCenter', 'BudgetBuddy-Auth');
    cdk.Tags.of(this.onboardingFunction).add('RefactoringPhase', 'Phase-2');

    // Output Lambda function ARN for monitoring and API Gateway integration
    new cdk.CfnOutput(this, 'OnboardingFunctionArn', {
      value: this.onboardingFunction.functionArn,
      description: 'Auth Onboarding Lambda function ARN for API Gateway integration and monitoring',
      exportName: 'budgetbuddy-auth-onboarding-arn',
    });

    // Output Lambda function name for CLI operations
    new cdk.CfnOutput(this, 'OnboardingFunctionName', {
      value: this.onboardingFunction.functionName,
      description: 'Auth Onboarding Lambda function name for AWS CLI operations',
      exportName: 'budgetbuddy-auth-onboarding-name',
    });
  }
}
