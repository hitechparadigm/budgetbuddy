/**
 * Monitoring Stack for BudgetBuddy Application
 *
 * Creates CloudWatch dashboards, alarms, and monitoring infrastructure
 * for observability, alerting, and performance tracking across all
 * application components.
 *
 * Key Features:
 * - Application performance dashboards
 * - Error rate and latency alarms
 * - Cost monitoring and alerts
 * - Business metrics tracking
 * - Log aggregation and analysis
 */
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
/**
 * Props for the Monitoring Stack
 * Requires resources from other stacks for monitoring setup
 */
export interface MonitoringStackProps extends cdk.StackProps {
    table: dynamodb.Table;
    userPool: cognito.UserPool;
    api: apigateway.RestApi;
}
export declare class MonitoringStack extends cdk.Stack {
    /**
     * Main application dashboard
     * Exposed for additional customization
     */
    applicationDashboard: cloudwatch.Dashboard;
    /**
     * SNS topic for critical alerts
     * Exposed for additional subscriptions
     */
    alertTopic: sns.Topic;
    constructor(scope: Construct, id: string, props: MonitoringStackProps);
    /**
     * Create SNS topic for critical alerts and notifications
     * Administrators can subscribe to receive alerts via email/SMS
     */
    private createAlertTopic;
    /**
     * Create comprehensive CloudWatch dashboard for application monitoring
     * Displays key metrics across all application components
     */
    private createApplicationDashboard;
    /**
     * Create CloudWatch alarms for critical application metrics
     * Sends notifications to SNS topic when thresholds are breached
     */
    private createAlarms;
    /**
     * Create cost monitoring and budget alerts
     * Helps track AWS spending and prevent unexpected charges
     */
    private createCostMonitoring;
}
