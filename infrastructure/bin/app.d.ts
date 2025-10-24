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
