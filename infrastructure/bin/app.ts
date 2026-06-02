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
import { ApiFeaturesStack } from '../lib/api-features-stack';
import { ApiFeaturesExtendedStack } from '../lib/api-features-extended-stack';
import { ApiFamilyStack } from '../lib/api-family-stack';
import { ApiBudgetsStack } from '../lib/api-budgets-stack';
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
 * Contains core backend business logic and API endpoints
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
  notificationFunction: notificationStack.notificationFunction,
});

/**
 * API Features Stack - Additional Lambda functions for competitive features
 * Contains Plaid, Reconciliation, and other feature Lambdas
 * Has its own API Gateway to avoid CloudFormation resource limits
 * Creates its own CommonLayer and SharedLayer to avoid CloudFormation export dependency issues
 */
const apiFeaturesStack = new ApiFeaturesStack(app, `${stackPrefix}-api-features`, {
  env,
  description: 'BudgetBuddy API features stack with Plaid, Reconciliation, and other feature Lambdas',
  table: databaseStack.table,
  userPool: authStack.userPool,
  // Note: commonLayer and sharedLayer are now created internally by ApiFeaturesStack to avoid CloudFormation export dependency issues
});

/**
 * API Features Extended Stack - AI-powered features
 * Split from api-features-stack to stay under CloudFormation's 500 resource limit
 * Contains: Insights, Receipt, Pattern Detection, Budget Planning
 * Creates its own CommonLayer and SharedLayer to avoid CloudFormation export dependency issues
 */
const apiFeaturesExtendedStack = new ApiFeaturesExtendedStack(app, `${stackPrefix}-api-features-extended`, {
  env,
  description: 'BudgetBuddy Extended API features stack with AI-powered features (Insights, Receipt, Pattern Detection, Budget Planning)',
  table: databaseStack.table,
  userPool: authStack.userPool,
  // Note: commonLayer and sharedLayer are now created internally to avoid CloudFormation export dependency issues
});

/**
 * API Family Stack - Family collaboration features (DEPRECATED)
 * Returns 410 Gone for all requests. Kept deployed during transition period.
 * Will be removed once all clients have migrated to /budgets/* endpoints.
 * @deprecated Use ApiBudgetsStack instead.
 */
const apiFamilyStack = new ApiFamilyStack(app, `${stackPrefix}-api-family`, {
  env,
  description: 'BudgetBuddy Family API stack for family collaboration and member management',
  table: databaseStack.table,
  userPool: authStack.userPool,
});

/**
 * API Budgets Stack - Budget collaboration features (replaces api-family-stack)
 * Part of the Budget Model Redesign. This is the active stack for all budget
 * collaboration, member management, and invitation features.
 * Contains: Budget management, member management, invitations, email notifications
 * Creates its own CommonLayer and SharedLayer to avoid CloudFormation export dependency issues
 */
const apiBudgetsStack = new ApiBudgetsStack(app, `${stackPrefix}-api-budgets`, {
  env,
  description: 'BudgetBuddy Budgets API stack for budget collaboration and member management',
  table: databaseStack.table,
  userPool: authStack.userPool,
});

/**
 * Hosting Stack - S3 and CloudFront
 * Hosts the web application and admin dashboard
 */
const hostingStack = new HostingStack(app, `${stackPrefix}-hosting`, {
  env,
  description: 'BudgetBuddy hosting infrastructure with S3 static hosting and CloudFront CDN for global performance',
  environment: envName,
});

/**
 * Notification Stack - Push notifications and daily reminders
 * Handles device registration, budget alerts, and daily reminders
 * Creates its own CommonLayer and SharedLayer to avoid cross-stack dependency issues
 */
const notificationStack = new NotificationStack(app, `${stackPrefix}-notification`, {
  env,
  description: 'BudgetBuddy notification infrastructure with Lambda functions for push notifications and reminders',
  table: databaseStack.table,
  // Note: commonLayer and sharedLayer are now created internally to avoid CloudFormation export dependency issues
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
  alertEmail: process.env.ALERT_EMAIL,
});

// Add stack dependencies to ensure proper deployment order
authOnboardingStack.addDependency(databaseStack);
// Removed dependency on authStack to avoid cross-stack layer reference issues
apiStack.addDependency(databaseStack);
apiStack.addDependency(authStack);
apiStack.addDependency(authOnboardingStack);
apiStack.addDependency(notificationStack);
apiFeaturesStack.addDependency(databaseStack);
apiFeaturesStack.addDependency(authStack);
// Temporarily removed dependency on apiStack to allow independent deployment
apiFeaturesExtendedStack.addDependency(databaseStack);
apiFeaturesExtendedStack.addDependency(authStack);
// Temporarily removed dependency on apiStack to allow independent deployment
apiFamilyStack.addDependency(databaseStack);
apiFamilyStack.addDependency(authStack);
apiBudgetsStack.addDependency(databaseStack);
apiBudgetsStack.addDependency(authStack);
notificationStack.addDependency(databaseStack);
// Temporarily removed dependency on apiStack to allow independent deployment
monitoringStack.addDependency(databaseStack);
monitoringStack.addDependency(authStack);
monitoringStack.addDependency(apiStack);
monitoringStack.addDependency(apiFeaturesStack);
monitoringStack.addDependency(apiFeaturesExtendedStack);
monitoringStack.addDependency(apiFamilyStack);
monitoringStack.addDependency(apiBudgetsStack);
monitoringStack.addDependency(notificationStack);

// Add comprehensive tags to all resources for cost tracking and organization
cdk.Tags.of(app).add('Project', 'BudgetBuddy');
cdk.Tags.of(app).add('Application', 'budgetbuddy');
cdk.Tags.of(app).add('Environment', envName);
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Owner', 'BudgetBuddy-Team');
cdk.Tags.of(app).add('CostCenter', 'BudgetBuddy-Infrastructure');
cdk.Tags.of(app).add('Purpose', 'Family-Budgeting-Application');
