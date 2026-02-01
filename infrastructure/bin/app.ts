#!/usr/bin/env node

/**
 * AWS CDK Application Entry Point for BudgetBuddy
 *
 * This file initializes the CDK app and creates all the necessary stacks
 * for the BudgetBuddy application infrastructure.
 *
 * Stacks created:
 * - DatabaseStack: DynamoDB tables and indexes
 * - AuthStack: Cognito User Pools and Identity Pools
 * - ApiStack: API Gateway and Lambda functions
 * - HostingStack: S3 buckets and CloudFront distributions
 * - MonitoringStack: CloudWatch dashboards and alarms
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

declare const process: any;
import { DatabaseStack } from '../lib/database-stack';
import { AuthStack } from '../lib/auth-stack';
import { AuthOnboardingStack } from '../lib/auth-onboarding-stack';
import { ApiStack } from '../lib/api-stack';
import { HostingStack } from '../lib/hosting-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
import { NotificationStack } from '../lib/notification-stack';

// Initialize the CDK application
const app = new cdk.App();

// Get environment configuration from context or environment variables
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Environment-specific stack naming with budgetbuddy prefix
const envName = app.node.tryGetContext('environment') || 'dev';
const stackPrefix = `budgetbuddy-${envName}`;

/**
 * Database Stack - DynamoDB tables and indexes
 * Contains the main application data storage with single-table design
 */
const databaseStack = new DatabaseStack(app, `${stackPrefix}-database`, {
  env,
  description: 'BudgetBuddy database infrastructure with DynamoDB single-table design for cost-optimized data storage',
});

/**
 * Authentication Stack - Cognito User Pools
 * Handles user authentication and authorization
 */
const authStack = new AuthStack(app, `${stackPrefix}-auth`, {
  env,
  description: 'BudgetBuddy authentication infrastructure with Cognito User Pools for secure user management',
});

/**
 * Auth Onboarding Stack - Standalone Lambda for onboarding
 * Part of architectural refactoring to split monolithic auth Lambda
 * Now creates its own layer to avoid cross-stack dependency issues
 */
const authOnboardingStack = new AuthOnboardingStack(app, `${stackPrefix}-auth-onboarding`, {
  env,
  description: 'BudgetBuddy auth onboarding Lambda - standalone function for user onboarding completion',
  table: databaseStack.table,
});

/**
 * API Stack - API Gateway and Lambda functions
 * Contains all backend business logic and API endpoints
 * Depends on database and auth stacks
 */
const apiStack = new ApiStack(app, `${stackPrefix}-api`, {
  env,
  description: 'BudgetBuddy serverless API infrastructure with Lambda functions and API Gateway',
  // Pass resources from other stacks
  table: databaseStack.table,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  authOnboardingFunction: authOnboardingStack.onboardingFunction,
});

/**
 * Hosting Stack - S3 and CloudFront
 * Hosts the web application and admin dashboard
 */
const hostingStack = new HostingStack(app, `${stackPrefix}-hosting`, {
  env,
  description: 'BudgetBuddy hosting infrastructure with S3 static hosting and CloudFront CDN for global performance',
});

/**
 * Notification Stack - Push notifications and daily reminders
 * Handles device registration, budget alerts, and daily reminders
 * Now creates its own SharedLayer to avoid cross-stack dependency issues
 */
const notificationStack = new NotificationStack(app, `${stackPrefix}-notification`, {
  env,
  description: 'BudgetBuddy notification infrastructure with Lambda functions for push notifications and reminders',
  table: databaseStack.table,
  commonLayer: apiStack.commonLayer,
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN || 'placeholder-token-configure-in-aws',
});

/**
 * Monitoring Stack - CloudWatch dashboards and alarms
 * Provides observability and alerting for the application
 * Depends on all other stacks for resource references
 */
const monitoringStack = new MonitoringStack(app, `${stackPrefix}-monitoring`, {
  env,
  description: 'BudgetBuddy monitoring and alerting infrastructure with CloudWatch dashboards and cost tracking',
  // Pass resources from other stacks for monitoring
  table: databaseStack.table,
  userPool: authStack.userPool,
  api: apiStack.api,
});

// Add stack dependencies to ensure proper deployment order
authOnboardingStack.addDependency(databaseStack);
// Removed dependency on authStack to avoid cross-stack layer reference issues
apiStack.addDependency(databaseStack);
apiStack.addDependency(authStack);
apiStack.addDependency(authOnboardingStack);
notificationStack.addDependency(databaseStack);
notificationStack.addDependency(apiStack);
monitoringStack.addDependency(databaseStack);
monitoringStack.addDependency(authStack);
monitoringStack.addDependency(apiStack);
monitoringStack.addDependency(notificationStack);

// Add comprehensive tags to all resources for cost tracking and organization
cdk.Tags.of(app).add('Project', 'BudgetBuddy');
cdk.Tags.of(app).add('Application', 'budgetbuddy');
cdk.Tags.of(app).add('Environment', envName);
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Owner', 'BudgetBuddy-Team');
cdk.Tags.of(app).add('CostCenter', 'BudgetBuddy-Infrastructure');
cdk.Tags.of(app).add('Purpose', 'Family-Budgeting-Application');
