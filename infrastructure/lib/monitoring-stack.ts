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
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
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

export class MonitoringStack extends cdk.Stack {
    /**
     * Main application dashboard
     * Exposed for additional customization
     */
    public applicationDashboard: cloudwatch.Dashboard;

    /**
     * SNS topic for critical alerts
     * Exposed for additional subscriptions
     */
    public alertTopic: sns.Topic;

    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        // Create SNS topic for alerts
        this.createAlertTopic();

        // Create CloudWatch dashboard
        this.createApplicationDashboard(props);

        // Create alarms for critical metrics
        this.createAlarms(props);

        // Create cost monitoring
        this.createCostMonitoring();
    }

    /**
     * Create SNS topic for critical alerts and notifications
     * Administrators can subscribe to receive alerts via email/SMS
     */
    private createAlertTopic(): void {
        this.alertTopic = new sns.Topic(this, 'AlertTopic', {
            topicName: 'budgetbuddy-alerts',
            displayName: 'BudgetBuddy Critical Infrastructure Alerts',

            // Add email subscription for admin notifications
            // Note: Email will need to be confirmed after deployment
        });

        // Add comprehensive cost allocation tags
        cdk.Tags.of(this.alertTopic).add('Component', 'Monitoring');
        cdk.Tags.of(this.alertTopic).add('Service', 'SNS');
        cdk.Tags.of(this.alertTopic).add('AlertType', 'Critical');
        cdk.Tags.of(this.alertTopic).add('CostCenter', 'BudgetBuddy-Operations');
        cdk.Tags.of(this.alertTopic).add('NotificationMethod', 'Email-SMS');
    }

    /**
     * Create comprehensive CloudWatch dashboard for application monitoring
     * Displays key metrics across all application components
     */
    private createApplicationDashboard(props: MonitoringStackProps): void {
        this.applicationDashboard = new cloudwatch.Dashboard(this, 'ApplicationDashboard', {
            dashboardName: 'budgetbuddy-application-metrics',
        });

        // Add comprehensive tags to dashboard
        cdk.Tags.of(this.applicationDashboard).add('Component', 'Dashboard');
        cdk.Tags.of(this.applicationDashboard).add('Service', 'CloudWatch');
        cdk.Tags.of(this.applicationDashboard).add('DashboardType', 'Application-Metrics');
        cdk.Tags.of(this.applicationDashboard).add('CostCenter', 'BudgetBuddy-Operations');

        // API Gateway metrics widget
        const apiMetricsWidget = new cloudwatch.GraphWidget({
            title: 'API Gateway Metrics',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'Count',
                    dimensionsMap: {
                        ApiName: props.api.restApiName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: '4XXError',
                    dimensionsMap: {
                        ApiName: props.api.restApiName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: '5XXError',
                    dimensionsMap: {
                        ApiName: props.api.restApiName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'Latency',
                    dimensionsMap: {
                        ApiName: props.api.restApiName,
                    },
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            width: 12,
            height: 6,
        });

        // DynamoDB metrics widget
        const dynamoMetricsWidget = new cloudwatch.GraphWidget({
            title: 'DynamoDB Metrics',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/DynamoDB',
                    metricName: 'ConsumedReadCapacityUnits',
                    dimensionsMap: {
                        TableName: props.table.tableName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/DynamoDB',
                    metricName: 'ConsumedWriteCapacityUnits',
                    dimensionsMap: {
                        TableName: props.table.tableName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/DynamoDB',
                    metricName: 'SuccessfulRequestLatency',
                    dimensionsMap: {
                        TableName: props.table.tableName,
                        Operation: 'Query',
                    },
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/DynamoDB',
                    metricName: 'ThrottledRequests',
                    dimensionsMap: {
                        TableName: props.table.tableName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            width: 12,
            height: 6,
        });

        // Cognito metrics widget
        const cognitoMetricsWidget = new cloudwatch.GraphWidget({
            title: 'Authentication Metrics',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/Cognito',
                    metricName: 'SignUpSuccesses',
                    dimensionsMap: {
                        UserPool: props.userPool.userPoolId,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.hours(1),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/Cognito',
                    metricName: 'SignInSuccesses',
                    dimensionsMap: {
                        UserPool: props.userPool.userPoolId,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.hours(1),
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/Cognito',
                    metricName: 'SignUpThrottles',
                    dimensionsMap: {
                        UserPool: props.userPool.userPoolId,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.hours(1),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/Cognito',
                    metricName: 'SignInThrottles',
                    dimensionsMap: {
                        UserPool: props.userPool.userPoolId,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.hours(1),
                }),
            ],
            width: 12,
            height: 6,
        });

        // Add widgets to dashboard
        this.applicationDashboard.addWidgets(
            apiMetricsWidget,
            dynamoMetricsWidget,
            cognitoMetricsWidget
        );
    }

    /**
     * Create CloudWatch alarms for critical application metrics
     * Sends notifications to SNS topic when thresholds are breached
     */
    private createAlarms(props: MonitoringStackProps): void {
        // API Gateway error rate alarm
        const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorRateAlarm', {
            alarmName: 'budgetbuddy-api-high-error-rate',
            alarmDescription: 'BudgetBuddy API Gateway 5XX error rate exceeds threshold - indicates backend issues',

            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: '5XXError',
                dimensionsMap: {
                    ApiName: props.api.restApiName,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),

            // Alert if more than 10 5XX errors in 5 minutes
            threshold: 10,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        // API Gateway latency alarm
        const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
            alarmName: 'budgetbuddy-api-high-latency',
            alarmDescription: 'BudgetBuddy API Gateway response latency exceeds 5 seconds - performance degradation',

            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: 'Latency',
                dimensionsMap: {
                    ApiName: props.api.restApiName,
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
            }),

            // Alert if average latency > 5 seconds
            threshold: 5000,
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        });

        // DynamoDB throttling alarm
        const dynamoThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
            alarmName: 'budgetbuddy-dynamodb-throttling',
            alarmDescription: 'BudgetBuddy DynamoDB requests are being throttled - capacity exceeded',

            metric: new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ThrottledRequests',
                dimensionsMap: {
                    TableName: props.table.tableName,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),

            // Alert on any throttling
            threshold: 0,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        });

        // Add alarms to SNS topic
        apiErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        apiLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        dynamoThrottleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    }

    /**
     * Create cost monitoring and budget alerts
     * Helps track AWS spending and prevent unexpected charges
     */
    private createCostMonitoring(): void {
        // Create a custom metric for tracking estimated costs
        const costMetric = new cloudwatch.Metric({
            namespace: 'AWS/Billing',
            metricName: 'EstimatedCharges',
            dimensionsMap: {
                Currency: 'USD',
            },
            statistic: 'Maximum',
            period: cdk.Duration.hours(6),
        });

        // Cost monitoring widget
        const costWidget = new cloudwatch.GraphWidget({
            title: 'Estimated AWS Costs',
            left: [costMetric],
            width: 12,
            height: 6,
        });

        // Add cost widget to dashboard
        this.applicationDashboard.addWidgets(costWidget);

        // Cost alarm - alert if monthly costs exceed $200
        const costAlarm = new cloudwatch.Alarm(this, 'CostAlarm', {
            alarmName: 'budgetbuddy-high-costs',
            alarmDescription: 'BudgetBuddy AWS monthly costs exceed $200 budget threshold - review usage',

            metric: costMetric,

            // Alert if costs exceed $200
            threshold: 200,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        });

        // Add cost alarm to SNS topic
        costAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    }
}