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
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
/**
 * Props for the API Stack
 * Requires resources from other stacks (database and auth)
 */
export interface ApiStackProps extends cdk.StackProps {
    table: dynamodb.Table;
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient;
    authOnboardingFunction?: lambda.Function;
    notificationFunction?: lambda.Function;
}
export declare class ApiStack extends cdk.Stack {
    /**
     * API Gateway REST API
     * Exposed as public property for monitoring stack
     */
    readonly api: apigateway.RestApi;
    /**
     * Lambda functions for different business domains
     * Exposed for monitoring and additional integrations
     */
    readonly functions: {
        [key: string]: lambda.Function;
    };
    /**
     * Lambda layers for shared code
     * Exposed for use in other stacks (e.g., notification stack)
     */
    readonly commonLayer: lambda.LayerVersion;
    readonly sharedLayer: lambda.LayerVersion;
    /**
     * Auth Onboarding Lambda Function (optional)
     * Part of architectural refactoring - standalone function for onboarding
     */
    private readonly authOnboardingFunction?;
    /**
     * Notification Service Lambda Function (optional)
     * Handles push notifications, device management, and preferences
     */
    private readonly notificationFunction?;
    constructor(scope: Construct, id: string, props: ApiStackProps);
    /**
     * Create a Lambda layer with common dependencies
     * Reduces deployment package sizes and improves cold start times
     */
    private createCommonLayer;
    /**
     * Create a Lambda layer with shared utilities (CORS, validation, etc.)
     * Provides reusable code across all Lambda functions
     */
    private createSharedLayer;
    /**
     * Create all Lambda functions for the application
     * Each function handles a specific business domain
     */
    private createLambdaFunctions;
    /**
     * Grant additional AWS service permissions to specific functions
     */
    private grantAdditionalPermissions;
    /**
     * Create API Gateway REST API with proper configuration
     */
    private createApiGateway;
    /**
     * Add Gateway Responses to handle CORS for error responses
     * This ensures CORS headers are present on 401, 403, 4XX, and 5XX responses
     */
    private addGatewayResponses;
    /**
     * Set up all API routes and Lambda integrations
     * Organizes endpoints by business domain
     */
    private setupApiRoutes;
    /**
     * Create CloudFormation outputs for client configuration
     */
    private createOutputs;
}
