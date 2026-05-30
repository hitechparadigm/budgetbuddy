"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const subscriptions = __importStar(require("aws-cdk-lib/aws-sns-subscriptions"));
const cloudwatchActions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
class MonitoringStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create SNS topic for alerts
        this.createAlertTopic(props.alertEmail);
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
    createAlertTopic(alertEmail) {
        this.alertTopic = new sns.Topic(this, 'AlertTopic', {
            topicName: `${this.stackName}-alerts`,
            displayName: 'BudgetBuddy Critical Infrastructure Alerts',
        });
        // Add email subscription if provided
        if (alertEmail) {
            this.alertTopic.addSubscription(new subscriptions.EmailSubscription(alertEmail));
        }
        // Add comprehensive cost allocation tags
        cdk.Tags.of(this.alertTopic).add('Component', 'Monitoring');
        cdk.Tags.of(this.alertTopic).add('Service', 'SNS');
        cdk.Tags.of(this.alertTopic).add('AlertType', 'Critical');
        cdk.Tags.of(this.alertTopic).add('CostCenter', 'BudgetBuddy-Operations');
        cdk.Tags.of(this.alertTopic).add('NotificationMethod', 'Email-SMS');
        // Output the SNS topic ARN for reference
        new cdk.CfnOutput(this, 'AlertTopicArn', {
            value: this.alertTopic.topicArn,
            description: 'SNS topic ARN for BudgetBuddy infrastructure alerts',
        });
    }
    /**
     * Create comprehensive CloudWatch dashboard for application monitoring
     * Displays key metrics across all application components
     */
    createApplicationDashboard(props) {
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
        this.applicationDashboard.addWidgets(apiMetricsWidget, dynamoMetricsWidget, cognitoMetricsWidget);
    }
    /**
     * Create CloudWatch alarms for critical application metrics
     * Sends notifications to SNS topic when thresholds are breached
     */
    createAlarms(props) {
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
    createCostMonitoring() {
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
exports.MonitoringStack = MonitoringStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vbml0b3Jpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7O0dBYUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyx1RUFBeUQ7QUFJekQseURBQTJDO0FBQzNDLGlGQUFtRTtBQUNuRSxzRkFBd0U7QUFjeEUsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBYTFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEMsOEJBQThCO1FBQzlCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2QyxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV6Qix5QkFBeUI7UUFDekIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7T0FHRztJQUNLLGdCQUFnQixDQUFDLFVBQW1CO1FBQ3hDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDaEQsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsU0FBUztZQUNyQyxXQUFXLEVBQUUsNENBQTRDO1NBQzVELENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQzNCLElBQUksYUFBYSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUNsRCxD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QUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtTQUMzRSxDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0NBQ0o7QUF2VkQsMENBdVZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE1vbml0b3JpbmcgU3RhY2sgZm9yIEJ1ZGdldEJ1ZGR5IEFwcGxpY2F0aW9uXHJcbiAqXHJcbiAqIENyZWF0ZXMgQ2xvdWRXYXRjaCBkYXNoYm9hcmRzLCBhbGFybXMsIGFuZCBtb25pdG9yaW5nIGluZnJhc3RydWN0dXJlXHJcbiAqIGZvciBvYnNlcnZhYmlsaXR5LCBhbGVydGluZywgYW5kIHBlcmZvcm1hbmNlIHRyYWNraW5nIGFjcm9zcyBhbGxcclxuICogYXBwbGljYXRpb24gY29tcG9uZW50cy5cclxuICpcclxuICogS2V5IEZlYXR1cmVzOlxyXG4gKiAtIEFwcGxpY2F0aW9uIHBlcmZvcm1hbmNlIGRhc2hib2FyZHNcclxuICogLSBFcnJvciByYXRlIGFuZCBsYXRlbmN5IGFsYXJtc1xyXG4gKiAtIENvc3QgbW9uaXRvcmluZyBhbmQgYWxlcnRzXHJcbiAqIC0gQnVzaW5lc3MgbWV0cmljcyB0cmFja2luZ1xyXG4gKiAtIExvZyBhZ2dyZWdhdGlvbiBhbmQgYW5hbHlzaXNcclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCAqIGFzIHN1YnNjcmlwdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zJztcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaEFjdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gtYWN0aW9ucyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuLyoqXHJcbiAqIFByb3BzIGZvciB0aGUgTW9uaXRvcmluZyBTdGFja1xyXG4gKiBSZXF1aXJlcyByZXNvdXJjZXMgZnJvbSBvdGhlciBzdGFja3MgZm9yIG1vbml0b3Jpbmcgc2V0dXBcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uaXRvcmluZ1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgICB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgICB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcclxuICAgIGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG4gICAgYWxlcnRFbWFpbD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1vbml0b3JpbmdTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgICAvKipcclxuICAgICAqIE1haW4gYXBwbGljYXRpb24gZGFzaGJvYXJkXHJcbiAgICAgKiBFeHBvc2VkIGZvciBhZGRpdGlvbmFsIGN1c3RvbWl6YXRpb25cclxuICAgICAqL1xyXG4gICAgcHVibGljIGFwcGxpY2F0aW9uRGFzaGJvYXJkOiBjbG91ZHdhdGNoLkRhc2hib2FyZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNOUyB0b3BpYyBmb3IgY3JpdGljYWwgYWxlcnRzXHJcbiAgICAgKiBFeHBvc2VkIGZvciBhZGRpdGlvbmFsIHN1YnNjcmlwdGlvbnNcclxuICAgICAqL1xyXG4gICAgcHVibGljIGFsZXJ0VG9waWM6IHNucy5Ub3BpYztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTW9uaXRvcmluZ1N0YWNrUHJvcHMpIHtcclxuICAgICAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIFNOUyB0b3BpYyBmb3IgYWxlcnRzXHJcbiAgICAgICAgdGhpcy5jcmVhdGVBbGVydFRvcGljKHByb3BzLmFsZXJ0RW1haWwpO1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBkYXNoYm9hcmRcclxuICAgICAgICB0aGlzLmNyZWF0ZUFwcGxpY2F0aW9uRGFzaGJvYXJkKHByb3BzKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIGFsYXJtcyBmb3IgY3JpdGljYWwgbWV0cmljc1xyXG4gICAgICAgIHRoaXMuY3JlYXRlQWxhcm1zKHByb3BzKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIGNvc3QgbW9uaXRvcmluZ1xyXG4gICAgICAgIHRoaXMuY3JlYXRlQ29zdE1vbml0b3JpbmcoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSBTTlMgdG9waWMgZm9yIGNyaXRpY2FsIGFsZXJ0cyBhbmQgbm90aWZpY2F0aW9uc1xyXG4gICAgICogQWRtaW5pc3RyYXRvcnMgY2FuIHN1YnNjcmliZSB0byByZWNlaXZlIGFsZXJ0cyB2aWEgZW1haWwvU01TXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY3JlYXRlQWxlcnRUb3BpYyhhbGVydEVtYWlsPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5hbGVydFRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnQWxlcnRUb3BpYycsIHtcclxuICAgICAgICAgICAgdG9waWNOYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tYWxlcnRzYCxcclxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdCdWRnZXRCdWRkeSBDcml0aWNhbCBJbmZyYXN0cnVjdHVyZSBBbGVydHMnLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBBZGQgZW1haWwgc3Vic2NyaXB0aW9uIGlmIHByb3ZpZGVkXHJcbiAgICAgICAgaWYgKGFsZXJ0RW1haWwpIHtcclxuICAgICAgICAgICAgdGhpcy5hbGVydFRvcGljLmFkZFN1YnNjcmlwdGlvbihcclxuICAgICAgICAgICAgICAgIG5ldyBzdWJzY3JpcHRpb25zLkVtYWlsU3Vic2NyaXB0aW9uKGFsZXJ0RW1haWwpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSBjb3N0IGFsbG9jYXRpb24gdGFnc1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMuYWxlcnRUb3BpYykuYWRkKCdDb21wb25lbnQnLCAnTW9uaXRvcmluZycpO1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMuYWxlcnRUb3BpYykuYWRkKCdTZXJ2aWNlJywgJ1NOUycpO1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMuYWxlcnRUb3BpYykuYWRkKCdBbGVydFR5cGUnLCAnQ3JpdGljYWwnKTtcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFsZXJ0VG9waWMpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1PcGVyYXRpb25zJyk7XHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hbGVydFRvcGljKS5hZGQoJ05vdGlmaWNhdGlvbk1ldGhvZCcsICdFbWFpbC1TTVMnKTtcclxuXHJcbiAgICAgICAgLy8gT3V0cHV0IHRoZSBTTlMgdG9waWMgQVJOIGZvciByZWZlcmVuY2VcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxlcnRUb3BpY0FybicsIHtcclxuICAgICAgICAgICAgdmFsdWU6IHRoaXMuYWxlcnRUb3BpYy50b3BpY0FybixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTTlMgdG9waWMgQVJOIGZvciBCdWRnZXRCdWRkeSBpbmZyYXN0cnVjdHVyZSBhbGVydHMnLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlIGNvbXByZWhlbnNpdmUgQ2xvdWRXYXRjaCBkYXNoYm9hcmQgZm9yIGFwcGxpY2F0aW9uIG1vbml0b3JpbmdcclxuICAgICAqIERpc3BsYXlzIGtleSBtZXRyaWNzIGFjcm9zcyBhbGwgYXBwbGljYXRpb24gY29tcG9uZW50c1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNyZWF0ZUFwcGxpY2F0aW9uRGFzaGJvYXJkKHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcyk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25EYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ0FwcGxpY2F0aW9uRGFzaGJvYXJkJywge1xyXG4gICAgICAgICAgICBkYXNoYm9hcmROYW1lOiAnYnVkZ2V0YnVkZHktYXBwbGljYXRpb24tbWV0cmljcycsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIHRhZ3MgdG8gZGFzaGJvYXJkXHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hcHBsaWNhdGlvbkRhc2hib2FyZCkuYWRkKCdDb21wb25lbnQnLCAnRGFzaGJvYXJkJyk7XHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hcHBsaWNhdGlvbkRhc2hib2FyZCkuYWRkKCdTZXJ2aWNlJywgJ0Nsb3VkV2F0Y2gnKTtcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFwcGxpY2F0aW9uRGFzaGJvYXJkKS5hZGQoJ0Rhc2hib2FyZFR5cGUnLCAnQXBwbGljYXRpb24tTWV0cmljcycpO1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMuYXBwbGljYXRpb25EYXNoYm9hcmQpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1PcGVyYXRpb25zJyk7XHJcblxyXG4gICAgICAgIC8vIEFQSSBHYXRld2F5IG1ldHJpY3Mgd2lkZ2V0XHJcbiAgICAgICAgY29uc3QgYXBpTWV0cmljc1dpZGdldCA9IG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICAgICAgdGl0bGU6ICdBUEkgR2F0ZXdheSBNZXRyaWNzJyxcclxuICAgICAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ0NvdW50JyxcclxuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFwaU5hbWU6IHByb3BzLmFwaS5yZXN0QXBpTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJzRYWEVycm9yJyxcclxuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFwaU5hbWU6IHByb3BzLmFwaS5yZXN0QXBpTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJzVYWEVycm9yJyxcclxuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFwaU5hbWU6IHByb3BzLmFwaS5yZXN0QXBpTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByaWdodDogW1xyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ0xhdGVuY3knLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgICAgIGhlaWdodDogNixcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gRHluYW1vREIgbWV0cmljcyB3aWRnZXRcclxuICAgICAgICBjb25zdCBkeW5hbW9NZXRyaWNzV2lkZ2V0ID0gbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgICAgICB0aXRsZTogJ0R5bmFtb0RCIE1ldHJpY3MnLFxyXG4gICAgICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ0NvbnN1bWVkUmVhZENhcGFjaXR5VW5pdHMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVGFibGVOYW1lOiBwcm9wcy50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnQ29uc3VtZWRXcml0ZUNhcGFjaXR5VW5pdHMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVGFibGVOYW1lOiBwcm9wcy50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmlnaHQ6IFtcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnU3VjY2Vzc2Z1bFJlcXVlc3RMYXRlbmN5JyxcclxuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFRhYmxlTmFtZTogcHJvcHMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBPcGVyYXRpb246ICdRdWVyeScsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ1Rocm90dGxlZFJlcXVlc3RzJyxcclxuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFRhYmxlTmFtZTogcHJvcHMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBDb2duaXRvIG1ldHJpY3Mgd2lkZ2V0XHJcbiAgICAgICAgY29uc3QgY29nbml0b01ldHJpY3NXaWRnZXQgPSBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnQXV0aGVudGljYXRpb24gTWV0cmljcycsXHJcbiAgICAgICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0NvZ25pdG8nLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTaWduVXBTdWNjZXNzZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVXNlclBvb2w6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9Db2duaXRvJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnU2lnbkluU3VjY2Vzc2VzJyxcclxuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJQb29sOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByaWdodDogW1xyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQ29nbml0bycsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ1NpZ25VcFRocm90dGxlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyUG9vbDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0NvZ25pdG8nLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTaWduSW5UaHJvdHRsZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVXNlclBvb2w6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBBZGQgd2lkZ2V0cyB0byBkYXNoYm9hcmRcclxuICAgICAgICB0aGlzLmFwcGxpY2F0aW9uRGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgICAgICAgIGFwaU1ldHJpY3NXaWRnZXQsXHJcbiAgICAgICAgICAgIGR5bmFtb01ldHJpY3NXaWRnZXQsXHJcbiAgICAgICAgICAgIGNvZ25pdG9NZXRyaWNzV2lkZ2V0XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgY3JpdGljYWwgYXBwbGljYXRpb24gbWV0cmljc1xyXG4gICAgICogU2VuZHMgbm90aWZpY2F0aW9ucyB0byBTTlMgdG9waWMgd2hlbiB0aHJlc2hvbGRzIGFyZSBicmVhY2hlZFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNyZWF0ZUFsYXJtcyhwcm9wczogTW9uaXRvcmluZ1N0YWNrUHJvcHMpOiB2b2lkIHtcclxuICAgICAgICAvLyBBUEkgR2F0ZXdheSBlcnJvciByYXRlIGFsYXJtXHJcbiAgICAgICAgY29uc3QgYXBpRXJyb3JBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBcGlFcnJvclJhdGVBbGFybScsIHtcclxuICAgICAgICAgICAgYWxhcm1OYW1lOiAnYnVkZ2V0YnVkZHktYXBpLWhpZ2gtZXJyb3ItcmF0ZScsXHJcbiAgICAgICAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBBUEkgR2F0ZXdheSA1WFggZXJyb3IgcmF0ZSBleGNlZWRzIHRocmVzaG9sZCAtIGluZGljYXRlcyBiYWNrZW5kIGlzc3VlcycsXHJcblxyXG4gICAgICAgICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnNVhYRXJyb3InLFxyXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgIEFwaU5hbWU6IHByb3BzLmFwaS5yZXN0QXBpTmFtZSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgfSksXHJcblxyXG4gICAgICAgICAgICAvLyBBbGVydCBpZiBtb3JlIHRoYW4gMTAgNVhYIGVycm9ycyBpbiA1IG1pbnV0ZXNcclxuICAgICAgICAgICAgdGhyZXNob2xkOiAxMCxcclxuICAgICAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFQSSBHYXRld2F5IGxhdGVuY3kgYWxhcm1cclxuICAgICAgICBjb25zdCBhcGlMYXRlbmN5QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQXBpTGF0ZW5jeUFsYXJtJywge1xyXG4gICAgICAgICAgICBhbGFybU5hbWU6ICdidWRnZXRidWRkeS1hcGktaGlnaC1sYXRlbmN5JyxcclxuICAgICAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IEFQSSBHYXRld2F5IHJlc3BvbnNlIGxhdGVuY3kgZXhjZWVkcyA1IHNlY29uZHMgLSBwZXJmb3JtYW5jZSBkZWdyYWRhdGlvbicsXHJcblxyXG4gICAgICAgICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnTGF0ZW5jeScsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgfSksXHJcblxyXG4gICAgICAgICAgICAvLyBBbGVydCBpZiBhdmVyYWdlIGxhdGVuY3kgPiA1IHNlY29uZHNcclxuICAgICAgICAgICAgdGhyZXNob2xkOiA1MDAwLFxyXG4gICAgICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMyxcclxuICAgICAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBEeW5hbW9EQiB0aHJvdHRsaW5nIGFsYXJtXHJcbiAgICAgICAgY29uc3QgZHluYW1vVGhyb3R0bGVBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdEeW5hbW9UaHJvdHRsZUFsYXJtJywge1xyXG4gICAgICAgICAgICBhbGFybU5hbWU6ICdidWRnZXRidWRkeS1keW5hbW9kYi10aHJvdHRsaW5nJyxcclxuICAgICAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IER5bmFtb0RCIHJlcXVlc3RzIGFyZSBiZWluZyB0aHJvdHRsZWQgLSBjYXBhY2l0eSBleGNlZWRlZCcsXHJcblxyXG4gICAgICAgICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxyXG4gICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ1Rocm90dGxlZFJlcXVlc3RzJyxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICBUYWJsZU5hbWU6IHByb3BzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgfSksXHJcblxyXG4gICAgICAgICAgICAvLyBBbGVydCBvbiBhbnkgdGhyb3R0bGluZ1xyXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDAsXHJcbiAgICAgICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBhbGFybXMgdG8gU05TIHRvcGljXHJcbiAgICAgICAgYXBpRXJyb3JBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxlcnRUb3BpYykpO1xyXG4gICAgICAgIGFwaUxhdGVuY3lBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxlcnRUb3BpYykpO1xyXG4gICAgICAgIGR5bmFtb1Rocm90dGxlQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsZXJ0VG9waWMpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSBjb3N0IG1vbml0b3JpbmcgYW5kIGJ1ZGdldCBhbGVydHNcclxuICAgICAqIEhlbHBzIHRyYWNrIEFXUyBzcGVuZGluZyBhbmQgcHJldmVudCB1bmV4cGVjdGVkIGNoYXJnZXNcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjcmVhdGVDb3N0TW9uaXRvcmluZygpOiB2b2lkIHtcclxuICAgICAgICAvLyBDcmVhdGUgYSBjdXN0b20gbWV0cmljIGZvciB0cmFja2luZyBlc3RpbWF0ZWQgY29zdHNcclxuICAgICAgICBjb25zdCBjb3N0TWV0cmljID0gbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0JpbGxpbmcnLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnRXN0aW1hdGVkQ2hhcmdlcycsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgIEN1cnJlbmN5OiAnVVNEJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnTWF4aW11bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDYpLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBDb3N0IG1vbml0b3Jpbmcgd2lkZ2V0XHJcbiAgICAgICAgY29uc3QgY29zdFdpZGdldCA9IG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICAgICAgdGl0bGU6ICdFc3RpbWF0ZWQgQVdTIENvc3RzJyxcclxuICAgICAgICAgICAgbGVmdDogW2Nvc3RNZXRyaWNdLFxyXG4gICAgICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgICAgIGhlaWdodDogNixcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNvc3Qgd2lkZ2V0IHRvIGRhc2hib2FyZFxyXG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25EYXNoYm9hcmQuYWRkV2lkZ2V0cyhjb3N0V2lkZ2V0KTtcclxuXHJcbiAgICAgICAgLy8gQ29zdCBhbGFybSAtIGFsZXJ0IGlmIG1vbnRobHkgY29zdHMgZXhjZWVkICQyMDBcclxuICAgICAgICBjb25zdCBjb3N0QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQ29zdEFsYXJtJywge1xyXG4gICAgICAgICAgICBhbGFybU5hbWU6ICdidWRnZXRidWRkeS1oaWdoLWNvc3RzJyxcclxuICAgICAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IEFXUyBtb250aGx5IGNvc3RzIGV4Y2VlZCAkMjAwIGJ1ZGdldCB0aHJlc2hvbGQgLSByZXZpZXcgdXNhZ2UnLFxyXG5cclxuICAgICAgICAgICAgbWV0cmljOiBjb3N0TWV0cmljLFxyXG5cclxuICAgICAgICAgICAgLy8gQWxlcnQgaWYgY29zdHMgZXhjZWVkICQyMDBcclxuICAgICAgICAgICAgdGhyZXNob2xkOiAyMDAsXHJcbiAgICAgICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBjb3N0IGFsYXJtIHRvIFNOUyB0b3BpY1xyXG4gICAgICAgIGNvc3RBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxlcnRUb3BpYykpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==