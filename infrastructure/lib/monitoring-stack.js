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
const cloudwatchActions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
class MonitoringStack extends cdk.Stack {
    constructor(scope, id, props) {
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
    createAlertTopic() {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vbml0b3Jpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7O0dBYUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyx1RUFBeUQ7QUFJekQseURBQTJDO0FBRTNDLHNGQUF3RTtBQWF4RSxNQUFhLGVBQWdCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFhMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEyQjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFFeEIsOEJBQThCO1FBQzlCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2QyxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV6Qix5QkFBeUI7UUFDekIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7T0FHRztJQUNLLGdCQUFnQjtRQUNwQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ2hELFNBQVMsRUFBRSxvQkFBb0I7WUFDL0IsV0FBVyxFQUFFLDRDQUE0QztZQUV6RCxpREFBaUQ7WUFDakQseURBQXlEO1NBQzVELENBQUMsQ0FBQztRQUVILHlDQUF5QztRQUN6QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMs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QjtZQUM5QixhQUFhLEVBQUU7Z0JBQ1gsUUFBUSxFQUFFLEtBQUs7YUFDbEI7WUFDRCxTQUFTLEVBQUUsU0FBUztZQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDMUMsS0FBSyxFQUFFLHFCQUFxQjtZQUM1QixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7WUFDbEIsS0FBSyxFQUFFLEVBQUU7WUFDVCxNQUFNLEVBQUUsQ0FBQztTQUNaLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWpELGtEQUFrRDtRQUNsRCxNQUFNLFNBQVMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUN0RCxTQUFTLEVBQUUsd0JBQXdCO1lBQ25DLGdCQUFnQixFQUFFLDJFQUEyRTtZQUU3RixNQUFNLEVBQUUsVUFBVTtZQUVsQiw2QkFBNkI7WUFDN0IsU0FBUyxFQUFFLEdBQUc7WUFDZCxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7U0FDM0UsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDL0UsQ0FBQztDQUNKO0FBN1VELDBDQTZVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBNb25pdG9yaW5nIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKiBcclxuICogQ3JlYXRlcyBDbG91ZFdhdGNoIGRhc2hib2FyZHMsIGFsYXJtcywgYW5kIG1vbml0b3JpbmcgaW5mcmFzdHJ1Y3R1cmVcclxuICogZm9yIG9ic2VydmFiaWxpdHksIGFsZXJ0aW5nLCBhbmQgcGVyZm9ybWFuY2UgdHJhY2tpbmcgYWNyb3NzIGFsbFxyXG4gKiBhcHBsaWNhdGlvbiBjb21wb25lbnRzLlxyXG4gKiBcclxuICogS2V5IEZlYXR1cmVzOlxyXG4gKiAtIEFwcGxpY2F0aW9uIHBlcmZvcm1hbmNlIGRhc2hib2FyZHNcclxuICogLSBFcnJvciByYXRlIGFuZCBsYXRlbmN5IGFsYXJtc1xyXG4gKiAtIENvc3QgbW9uaXRvcmluZyBhbmQgYWxlcnRzXHJcbiAqIC0gQnVzaW5lc3MgbWV0cmljcyB0cmFja2luZ1xyXG4gKiAtIExvZyBhZ2dyZWdhdGlvbiBhbmQgYW5hbHlzaXNcclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCAqIGFzIHN1YnNjcmlwdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zJztcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaEFjdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gtYWN0aW9ucyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuLyoqXHJcbiAqIFByb3BzIGZvciB0aGUgTW9uaXRvcmluZyBTdGFja1xyXG4gKiBSZXF1aXJlcyByZXNvdXJjZXMgZnJvbSBvdGhlciBzdGFja3MgZm9yIG1vbml0b3Jpbmcgc2V0dXBcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uaXRvcmluZ1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgICB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgICB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcclxuICAgIGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW9uaXRvcmluZ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAgIC8qKlxyXG4gICAgICogTWFpbiBhcHBsaWNhdGlvbiBkYXNoYm9hcmRcclxuICAgICAqIEV4cG9zZWQgZm9yIGFkZGl0aW9uYWwgY3VzdG9taXphdGlvblxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgYXBwbGljYXRpb25EYXNoYm9hcmQ6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU05TIHRvcGljIGZvciBjcml0aWNhbCBhbGVydHNcclxuICAgICAqIEV4cG9zZWQgZm9yIGFkZGl0aW9uYWwgc3Vic2NyaXB0aW9uc1xyXG4gICAgICovXHJcbiAgICBwdWJsaWMgYWxlcnRUb3BpYzogc25zLlRvcGljO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcykge1xyXG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgU05TIHRvcGljIGZvciBhbGVydHNcclxuICAgICAgICB0aGlzLmNyZWF0ZUFsZXJ0VG9waWMoKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggZGFzaGJvYXJkXHJcbiAgICAgICAgdGhpcy5jcmVhdGVBcHBsaWNhdGlvbkRhc2hib2FyZChwcm9wcyk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBhbGFybXMgZm9yIGNyaXRpY2FsIG1ldHJpY3NcclxuICAgICAgICB0aGlzLmNyZWF0ZUFsYXJtcyhwcm9wcyk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBjb3N0IG1vbml0b3JpbmdcclxuICAgICAgICB0aGlzLmNyZWF0ZUNvc3RNb25pdG9yaW5nKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgU05TIHRvcGljIGZvciBjcml0aWNhbCBhbGVydHMgYW5kIG5vdGlmaWNhdGlvbnNcclxuICAgICAqIEFkbWluaXN0cmF0b3JzIGNhbiBzdWJzY3JpYmUgdG8gcmVjZWl2ZSBhbGVydHMgdmlhIGVtYWlsL1NNU1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNyZWF0ZUFsZXJ0VG9waWMoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5hbGVydFRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnQWxlcnRUb3BpYycsIHtcclxuICAgICAgICAgICAgdG9waWNOYW1lOiAnYnVkZ2V0YnVkZHktYWxlcnRzJyxcclxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdCdWRnZXRCdWRkeSBDcml0aWNhbCBJbmZyYXN0cnVjdHVyZSBBbGVydHMnLFxyXG5cclxuICAgICAgICAgICAgLy8gQWRkIGVtYWlsIHN1YnNjcmlwdGlvbiBmb3IgYWRtaW4gbm90aWZpY2F0aW9uc1xyXG4gICAgICAgICAgICAvLyBOb3RlOiBFbWFpbCB3aWxsIG5lZWQgdG8gYmUgY29uZmlybWVkIGFmdGVyIGRlcGxveW1lbnRcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgY29zdCBhbGxvY2F0aW9uIHRhZ3NcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFsZXJ0VG9waWMpLmFkZCgnQ29tcG9uZW50JywgJ01vbml0b3JpbmcnKTtcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFsZXJ0VG9waWMpLmFkZCgnU2VydmljZScsICdTTlMnKTtcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFsZXJ0VG9waWMpLmFkZCgnQWxlcnRUeXBlJywgJ0NyaXRpY2FsJyk7XHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hbGVydFRvcGljKS5hZGQoJ0Nvc3RDZW50ZXInLCAnQnVkZ2V0QnVkZHktT3BlcmF0aW9ucycpO1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMuYWxlcnRUb3BpYykuYWRkKCdOb3RpZmljYXRpb25NZXRob2QnLCAnRW1haWwtU01TJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgY29tcHJlaGVuc2l2ZSBDbG91ZFdhdGNoIGRhc2hib2FyZCBmb3IgYXBwbGljYXRpb24gbW9uaXRvcmluZ1xyXG4gICAgICogRGlzcGxheXMga2V5IG1ldHJpY3MgYWNyb3NzIGFsbCBhcHBsaWNhdGlvbiBjb21wb25lbnRzXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY3JlYXRlQXBwbGljYXRpb25EYXNoYm9hcmQocHJvcHM6IE1vbml0b3JpbmdTdGFja1Byb3BzKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvbkRhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnQXBwbGljYXRpb25EYXNoYm9hcmQnLCB7XHJcbiAgICAgICAgICAgIGRhc2hib2FyZE5hbWU6ICdidWRnZXRidWRkeS1hcHBsaWNhdGlvbi1tZXRyaWNzJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgdGFncyB0byBkYXNoYm9hcmRcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFwcGxpY2F0aW9uRGFzaGJvYXJkKS5hZGQoJ0NvbXBvbmVudCcsICdEYXNoYm9hcmQnKTtcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFwcGxpY2F0aW9uRGFzaGJvYXJkKS5hZGQoJ1NlcnZpY2UnLCAnQ2xvdWRXYXRjaCcpO1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMuYXBwbGljYXRpb25EYXNoYm9hcmQpLmFkZCgnRGFzaGJvYXJkVHlwZScsICdBcHBsaWNhdGlvbi1NZXRyaWNzJyk7XHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hcHBsaWNhdGlvbkRhc2hib2FyZCkuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LU9wZXJhdGlvbnMnKTtcclxuXHJcbiAgICAgICAgLy8gQVBJIEdhdGV3YXkgbWV0cmljcyB3aWRnZXRcclxuICAgICAgICBjb25zdCBhcGlNZXRyaWNzV2lkZ2V0ID0gbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgICAgICB0aXRsZTogJ0FQSSBHYXRld2F5IE1ldHJpY3MnLFxyXG4gICAgICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnQ291bnQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnNFhYRXJyb3InLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnNVhYRXJyb3InLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnTGF0ZW5jeScsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBBcGlOYW1lOiBwcm9wcy5hcGkucmVzdEFwaU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBEeW5hbW9EQiBtZXRyaWNzIHdpZGdldFxyXG4gICAgICAgIGNvbnN0IGR5bmFtb01ldHJpY3NXaWRnZXQgPSBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnRHluYW1vREIgTWV0cmljcycsXHJcbiAgICAgICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnQ29uc3VtZWRSZWFkQ2FwYWNpdHlVbml0cycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBUYWJsZU5hbWU6IHByb3BzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdDb25zdW1lZFdyaXRlQ2FwYWNpdHlVbml0cycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBUYWJsZU5hbWU6IHByb3BzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByaWdodDogW1xyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTdWNjZXNzZnVsUmVxdWVzdExhdGVuY3knLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVGFibGVOYW1lOiBwcm9wcy50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE9wZXJhdGlvbjogJ1F1ZXJ5JyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnVGhyb3R0bGVkUmVxdWVzdHMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVGFibGVOYW1lOiBwcm9wcy50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIENvZ25pdG8gbWV0cmljcyB3aWRnZXRcclxuICAgICAgICBjb25zdCBjb2duaXRvTWV0cmljc1dpZGdldCA9IG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICAgICAgdGl0bGU6ICdBdXRoZW50aWNhdGlvbiBNZXRyaWNzJyxcclxuICAgICAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQ29nbml0bycsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ1NpZ25VcFN1Y2Nlc3NlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyUG9vbDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0NvZ25pdG8nLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTaWduSW5TdWNjZXNzZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVXNlclBvb2w6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9Db2duaXRvJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnU2lnblVwVGhyb3R0bGVzJyxcclxuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJQb29sOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQ29nbml0bycsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ1NpZ25JblRocm90dGxlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyUG9vbDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFkZCB3aWRnZXRzIHRvIGRhc2hib2FyZFxyXG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25EYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgICAgICAgYXBpTWV0cmljc1dpZGdldCxcclxuICAgICAgICAgICAgZHluYW1vTWV0cmljc1dpZGdldCxcclxuICAgICAgICAgICAgY29nbml0b01ldHJpY3NXaWRnZXRcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBjcml0aWNhbCBhcHBsaWNhdGlvbiBtZXRyaWNzXHJcbiAgICAgKiBTZW5kcyBub3RpZmljYXRpb25zIHRvIFNOUyB0b3BpYyB3aGVuIHRocmVzaG9sZHMgYXJlIGJyZWFjaGVkXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY3JlYXRlQWxhcm1zKHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcyk6IHZvaWQge1xyXG4gICAgICAgIC8vIEFQSSBHYXRld2F5IGVycm9yIHJhdGUgYWxhcm1cclxuICAgICAgICBjb25zdCBhcGlFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0FwaUVycm9yUmF0ZUFsYXJtJywge1xyXG4gICAgICAgICAgICBhbGFybU5hbWU6ICdidWRnZXRidWRkeS1hcGktaGlnaC1lcnJvci1yYXRlJyxcclxuICAgICAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IEFQSSBHYXRld2F5IDVYWCBlcnJvciByYXRlIGV4Y2VlZHMgdGhyZXNob2xkIC0gaW5kaWNhdGVzIGJhY2tlbmQgaXNzdWVzJyxcclxuXHJcbiAgICAgICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICc1WFhFcnJvcicsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgICAgIC8vIEFsZXJ0IGlmIG1vcmUgdGhhbiAxMCA1WFggZXJyb3JzIGluIDUgbWludXRlc1xyXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDEwLFxyXG4gICAgICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICAgICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQVBJIEdhdGV3YXkgbGF0ZW5jeSBhbGFybVxyXG4gICAgICAgIGNvbnN0IGFwaUxhdGVuY3lBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBcGlMYXRlbmN5QWxhcm0nLCB7XHJcbiAgICAgICAgICAgIGFsYXJtTmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaS1oaWdoLWxhdGVuY3knLFxyXG4gICAgICAgICAgICBhbGFybURlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgQVBJIEdhdGV3YXkgcmVzcG9uc2UgbGF0ZW5jeSBleGNlZWRzIDUgc2Vjb25kcyAtIHBlcmZvcm1hbmNlIGRlZ3JhZGF0aW9uJyxcclxuXHJcbiAgICAgICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdMYXRlbmN5JyxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICBBcGlOYW1lOiBwcm9wcy5hcGkucmVzdEFwaU5hbWUsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgICAgIC8vIEFsZXJ0IGlmIGF2ZXJhZ2UgbGF0ZW5jeSA+IDUgc2Vjb25kc1xyXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDUwMDAsXHJcbiAgICAgICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAzLFxyXG4gICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIER5bmFtb0RCIHRocm90dGxpbmcgYWxhcm1cclxuICAgICAgICBjb25zdCBkeW5hbW9UaHJvdHRsZUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0R5bmFtb1Rocm90dGxlQWxhcm0nLCB7XHJcbiAgICAgICAgICAgIGFsYXJtTmFtZTogJ2J1ZGdldGJ1ZGR5LWR5bmFtb2RiLXRocm90dGxpbmcnLFxyXG4gICAgICAgICAgICBhbGFybURlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgRHluYW1vREIgcmVxdWVzdHMgYXJlIGJlaW5nIHRocm90dGxlZCAtIGNhcGFjaXR5IGV4Y2VlZGVkJyxcclxuXHJcbiAgICAgICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnVGhyb3R0bGVkUmVxdWVzdHMnLFxyXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgIFRhYmxlTmFtZTogcHJvcHMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgICAgIC8vIEFsZXJ0IG9uIGFueSB0aHJvdHRsaW5nXHJcbiAgICAgICAgICAgIHRocmVzaG9sZDogMCxcclxuICAgICAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGFsYXJtcyB0byBTTlMgdG9waWNcclxuICAgICAgICBhcGlFcnJvckFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGVydFRvcGljKSk7XHJcbiAgICAgICAgYXBpTGF0ZW5jeUFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGVydFRvcGljKSk7XHJcbiAgICAgICAgZHluYW1vVGhyb3R0bGVBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxlcnRUb3BpYykpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlIGNvc3QgbW9uaXRvcmluZyBhbmQgYnVkZ2V0IGFsZXJ0c1xyXG4gICAgICogSGVscHMgdHJhY2sgQVdTIHNwZW5kaW5nIGFuZCBwcmV2ZW50IHVuZXhwZWN0ZWQgY2hhcmdlc1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNyZWF0ZUNvc3RNb25pdG9yaW5nKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIENyZWF0ZSBhIGN1c3RvbSBtZXRyaWMgZm9yIHRyYWNraW5nIGVzdGltYXRlZCBjb3N0c1xyXG4gICAgICAgIGNvbnN0IGNvc3RNZXRyaWMgPSBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQmlsbGluZycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdFc3RpbWF0ZWRDaGFyZ2VzJyxcclxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgQ3VycmVuY3k6ICdVU0QnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdNYXhpbXVtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoNiksXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIENvc3QgbW9uaXRvcmluZyB3aWRnZXRcclxuICAgICAgICBjb25zdCBjb3N0V2lkZ2V0ID0gbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgICAgICB0aXRsZTogJ0VzdGltYXRlZCBBV1MgQ29zdHMnLFxyXG4gICAgICAgICAgICBsZWZ0OiBbY29zdE1ldHJpY10sXHJcbiAgICAgICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBBZGQgY29zdCB3aWRnZXQgdG8gZGFzaGJvYXJkXHJcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvbkRhc2hib2FyZC5hZGRXaWRnZXRzKGNvc3RXaWRnZXQpO1xyXG5cclxuICAgICAgICAvLyBDb3N0IGFsYXJtIC0gYWxlcnQgaWYgbW9udGhseSBjb3N0cyBleGNlZWQgJDIwMFxyXG4gICAgICAgIGNvbnN0IGNvc3RBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdDb3N0QWxhcm0nLCB7XHJcbiAgICAgICAgICAgIGFsYXJtTmFtZTogJ2J1ZGdldGJ1ZGR5LWhpZ2gtY29zdHMnLFxyXG4gICAgICAgICAgICBhbGFybURlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgQVdTIG1vbnRobHkgY29zdHMgZXhjZWVkICQyMDAgYnVkZ2V0IHRocmVzaG9sZCAtIHJldmlldyB1c2FnZScsXHJcblxyXG4gICAgICAgICAgICBtZXRyaWM6IGNvc3RNZXRyaWMsXHJcblxyXG4gICAgICAgICAgICAvLyBBbGVydCBpZiBjb3N0cyBleGNlZWQgJDIwMFxyXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDIwMCxcclxuICAgICAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNvc3QgYWxhcm0gdG8gU05TIHRvcGljXHJcbiAgICAgICAgY29zdEFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGVydFRvcGljKSk7XHJcbiAgICB9XHJcbn0iXX0=