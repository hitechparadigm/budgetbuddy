/**
 * Authentication Stack for BudgetBuddy Application
 *
 * Creates Amazon Cognito User Pool and User Pool Client for handling
 * user authentication, registration, and authorization. Configured with
 * custom attributes for family relationships and account types.
 *
 * Key Features:
 * - Email-based authentication with verification
 * - Custom attributes for family and subscription data
 * - Password policies for security
 * - MFA support (optional)
 * - Lambda triggers for custom authentication flows
 *
 * Last Updated: 2026-01-31 - Redeployment to fix UPDATE_ROLLBACK_COMPLETE state
 */
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
export declare class AuthStack extends cdk.Stack {
    /**
     * Cognito User Pool for user management
     * Exposed as public property for use in other stacks
     */
    readonly userPool: cognito.UserPool;
    /**
     * User Pool Client for application authentication
     * Exposed as public property for use in other stacks
     */
    readonly userPoolClient: cognito.UserPoolClient;
    /**
     * Lambda Layer with shared authentication utilities
     * Exposed as public property for use in API stack
     */
    readonly authSharedLayer: lambda.LayerVersion;
    /**
     * Admin group for administrative users
     * Users in this group have access to admin dashboard
     */
    readonly adminGroup: cognito.CfnUserPoolGroup;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
