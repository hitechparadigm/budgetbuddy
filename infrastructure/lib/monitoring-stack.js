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
        // AI fallback alarm - the AI Lambdas serve a deterministic template when Bedrock
        // fails, and report success. They emit AiFallbackUsed (EMF, undimensioned
        // aggregate plus Feature/ModelId) on every fallback.
        const aiFallbackAlarm = new cloudwatch.Alarm(this, 'AiFallbackAlarm', {
            alarmName: 'budgetbuddy-ai-fallback-in-use',
            alarmDescription: 'AI features are serving the deterministic fallback instead of Bedrock output',
            metric: new cloudwatch.Metric({
                namespace: 'BudgetBuddy/AI',
                metricName: 'AiFallbackUsed',
                statistic: 'Sum',
                period: cdk.Duration.minutes(15),
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            // The EMF metric does not exist until its first emission; missing data is healthy
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Add alarms to SNS topic
        apiErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        apiLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        dynamoThrottleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        aiFallbackAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
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
        // AI outcome widget - Bedrock successes vs deterministic fallbacks
        const aiOutcomeWidget = new cloudwatch.GraphWidget({
            title: 'AI: Bedrock vs Fallback',
            left: ['AiInvokeSucceeded', 'AiFallbackUsed'].map((metricName) => new cloudwatch.Metric({
                namespace: 'BudgetBuddy/AI',
                metricName,
                statistic: 'Sum',
                period: cdk.Duration.minutes(15),
            })),
            width: 12,
            height: 6,
        });
        // Add cost and AI widgets to dashboard (one row)
        this.applicationDashboard.addWidgets(costWidget, aiOutcomeWidget);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vbml0b3Jpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7O0dBYUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyx1RUFBeUQ7QUFJekQseURBQTJDO0FBQzNDLGlGQUFtRTtBQUNuRSxzRkFBd0U7QUFjeEUsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBYTFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEMsOEJBQThCO1FBQzlCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2QyxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV6Qix5QkFBeUI7UUFDekIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7T0FHRztJQUNLLGdCQUFnQixDQUFDLFVBQW1CO1FBQ3hDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDaEQsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsU0FBUztZQUNyQyxXQUFXLEVBQUUsNENBQTRDO1NBQzVELENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQzNCLElBQUksYUFBYSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUNsRCxD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NkJBQTZCO1lBQzdCLFNBQVMsRUFBRSxHQUFHO1lBQ2QsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO1NBQzNFLENBQUMsQ0FBQztRQUVILDhCQUE4QjtRQUM5QixTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksaUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQy9FLENBQUM7Q0FDSjtBQTFYRCwwQ0EwWEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTW9uaXRvcmluZyBTdGFjayBmb3IgQnVkZ2V0QnVkZHkgQXBwbGljYXRpb25cclxuICpcclxuICogQ3JlYXRlcyBDbG91ZFdhdGNoIGRhc2hib2FyZHMsIGFsYXJtcywgYW5kIG1vbml0b3JpbmcgaW5mcmFzdHJ1Y3R1cmVcclxuICogZm9yIG9ic2VydmFiaWxpdHksIGFsZXJ0aW5nLCBhbmQgcGVyZm9ybWFuY2UgdHJhY2tpbmcgYWNyb3NzIGFsbFxyXG4gKiBhcHBsaWNhdGlvbiBjb21wb25lbnRzLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gQXBwbGljYXRpb24gcGVyZm9ybWFuY2UgZGFzaGJvYXJkc1xyXG4gKiAtIEVycm9yIHJhdGUgYW5kIGxhdGVuY3kgYWxhcm1zXHJcbiAqIC0gQ29zdCBtb25pdG9yaW5nIGFuZCBhbGVydHNcclxuICogLSBCdXNpbmVzcyBtZXRyaWNzIHRyYWNraW5nXHJcbiAqIC0gTG9nIGFnZ3JlZ2F0aW9uIGFuZCBhbmFseXNpc1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcclxuaW1wb3J0ICogYXMgc3Vic2NyaXB0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zLXN1YnNjcmlwdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoQWN0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaC1hY3Rpb25zJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG4vKipcclxuICogUHJvcHMgZm9yIHRoZSBNb25pdG9yaW5nIFN0YWNrXHJcbiAqIFJlcXVpcmVzIHJlc291cmNlcyBmcm9tIG90aGVyIHN0YWNrcyBmb3IgbW9uaXRvcmluZyBzZXR1cFxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBNb25pdG9yaW5nU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICAgIHRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICAgIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG4gICAgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGk7XHJcbiAgICBhbGVydEVtYWlsPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW9uaXRvcmluZ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAgIC8qKlxyXG4gICAgICogTWFpbiBhcHBsaWNhdGlvbiBkYXNoYm9hcmRcclxuICAgICAqIEV4cG9zZWQgZm9yIGFkZGl0aW9uYWwgY3VzdG9taXphdGlvblxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgYXBwbGljYXRpb25EYXNoYm9hcmQ6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU05TIHRvcGljIGZvciBjcml0aWNhbCBhbGVydHNcclxuICAgICAqIEV4cG9zZWQgZm9yIGFkZGl0aW9uYWwgc3Vic2NyaXB0aW9uc1xyXG4gICAgICovXHJcbiAgICBwdWJsaWMgYWxlcnRUb3BpYzogc25zLlRvcGljO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcykge1xyXG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgU05TIHRvcGljIGZvciBhbGVydHNcclxuICAgICAgICB0aGlzLmNyZWF0ZUFsZXJ0VG9waWMocHJvcHMuYWxlcnRFbWFpbCk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGRhc2hib2FyZFxyXG4gICAgICAgIHRoaXMuY3JlYXRlQXBwbGljYXRpb25EYXNoYm9hcmQocHJvcHMpO1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgYWxhcm1zIGZvciBjcml0aWNhbCBtZXRyaWNzXHJcbiAgICAgICAgdGhpcy5jcmVhdGVBbGFybXMocHJvcHMpO1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgY29zdCBtb25pdG9yaW5nXHJcbiAgICAgICAgdGhpcy5jcmVhdGVDb3N0TW9uaXRvcmluZygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlIFNOUyB0b3BpYyBmb3IgY3JpdGljYWwgYWxlcnRzIGFuZCBub3RpZmljYXRpb25zXHJcbiAgICAgKiBBZG1pbmlzdHJhdG9ycyBjYW4gc3Vic2NyaWJlIHRvIHJlY2VpdmUgYWxlcnRzIHZpYSBlbWFpbC9TTVNcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjcmVhdGVBbGVydFRvcGljKGFsZXJ0RW1haWw/OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmFsZXJ0VG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdBbGVydFRvcGljJywge1xyXG4gICAgICAgICAgICB0b3BpY05hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1hbGVydHNgLFxyXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0J1ZGdldEJ1ZGR5IENyaXRpY2FsIEluZnJhc3RydWN0dXJlIEFsZXJ0cycsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBlbWFpbCBzdWJzY3JpcHRpb24gaWYgcHJvdmlkZWRcclxuICAgICAgICBpZiAoYWxlcnRFbWFpbCkge1xyXG4gICAgICAgICAgICB0aGlzLmFsZXJ0VG9waWMuYWRkU3Vic2NyaXB0aW9uKFxyXG4gICAgICAgICAgICAgICAgbmV3IHN1YnNjcmlwdGlvbnMuRW1haWxTdWJzY3JpcHRpb24oYWxlcnRFbWFpbClcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIGNvc3QgYWxsb2NhdGlvbiB0YWdzXHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hbGVydFRvcGljKS5hZGQoJ0NvbXBvbmVudCcsICdNb25pdG9yaW5nJyk7XHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hbGVydFRvcGljKS5hZGQoJ1NlcnZpY2UnLCAnU05TJyk7XHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hbGVydFRvcGljKS5hZGQoJ0FsZXJ0VHlwZScsICdDcml0aWNhbCcpO1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMuYWxlcnRUb3BpYykuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LU9wZXJhdGlvbnMnKTtcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFsZXJ0VG9waWMpLmFkZCgnTm90aWZpY2F0aW9uTWV0aG9kJywgJ0VtYWlsLVNNUycpO1xyXG5cclxuICAgICAgICAvLyBPdXRwdXQgdGhlIFNOUyB0b3BpYyBBUk4gZm9yIHJlZmVyZW5jZVxyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbGVydFRvcGljQXJuJywge1xyXG4gICAgICAgICAgICB2YWx1ZTogdGhpcy5hbGVydFRvcGljLnRvcGljQXJuLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NOUyB0b3BpYyBBUk4gZm9yIEJ1ZGdldEJ1ZGR5IGluZnJhc3RydWN0dXJlIGFsZXJ0cycsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgY29tcHJlaGVuc2l2ZSBDbG91ZFdhdGNoIGRhc2hib2FyZCBmb3IgYXBwbGljYXRpb24gbW9uaXRvcmluZ1xyXG4gICAgICogRGlzcGxheXMga2V5IG1ldHJpY3MgYWNyb3NzIGFsbCBhcHBsaWNhdGlvbiBjb21wb25lbnRzXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY3JlYXRlQXBwbGljYXRpb25EYXNoYm9hcmQocHJvcHM6IE1vbml0b3JpbmdTdGFja1Byb3BzKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvbkRhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnQXBwbGljYXRpb25EYXNoYm9hcmQnLCB7XHJcbiAgICAgICAgICAgIGRhc2hib2FyZE5hbWU6ICdidWRnZXRidWRkeS1hcHBsaWNhdGlvbi1tZXRyaWNzJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgdGFncyB0byBkYXNoYm9hcmRcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFwcGxpY2F0aW9uRGFzaGJvYXJkKS5hZGQoJ0NvbXBvbmVudCcsICdEYXNoYm9hcmQnKTtcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmFwcGxpY2F0aW9uRGFzaGJvYXJkKS5hZGQoJ1NlcnZpY2UnLCAnQ2xvdWRXYXRjaCcpO1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMuYXBwbGljYXRpb25EYXNoYm9hcmQpLmFkZCgnRGFzaGJvYXJkVHlwZScsICdBcHBsaWNhdGlvbi1NZXRyaWNzJyk7XHJcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy5hcHBsaWNhdGlvbkRhc2hib2FyZCkuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LU9wZXJhdGlvbnMnKTtcclxuXHJcbiAgICAgICAgLy8gQVBJIEdhdGV3YXkgbWV0cmljcyB3aWRnZXRcclxuICAgICAgICBjb25zdCBhcGlNZXRyaWNzV2lkZ2V0ID0gbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgICAgICB0aXRsZTogJ0FQSSBHYXRld2F5IE1ldHJpY3MnLFxyXG4gICAgICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnQ291bnQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnNFhYRXJyb3InLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnNVhYRXJyb3InLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnTGF0ZW5jeScsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBBcGlOYW1lOiBwcm9wcy5hcGkucmVzdEFwaU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBEeW5hbW9EQiBtZXRyaWNzIHdpZGdldFxyXG4gICAgICAgIGNvbnN0IGR5bmFtb01ldHJpY3NXaWRnZXQgPSBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnRHluYW1vREIgTWV0cmljcycsXHJcbiAgICAgICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnQ29uc3VtZWRSZWFkQ2FwYWNpdHlVbml0cycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBUYWJsZU5hbWU6IHByb3BzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdDb25zdW1lZFdyaXRlQ2FwYWNpdHlVbml0cycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBUYWJsZU5hbWU6IHByb3BzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByaWdodDogW1xyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTdWNjZXNzZnVsUmVxdWVzdExhdGVuY3knLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVGFibGVOYW1lOiBwcm9wcy50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE9wZXJhdGlvbjogJ1F1ZXJ5JyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnVGhyb3R0bGVkUmVxdWVzdHMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVGFibGVOYW1lOiBwcm9wcy50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIENvZ25pdG8gbWV0cmljcyB3aWRnZXRcclxuICAgICAgICBjb25zdCBjb2duaXRvTWV0cmljc1dpZGdldCA9IG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICAgICAgdGl0bGU6ICdBdXRoZW50aWNhdGlvbiBNZXRyaWNzJyxcclxuICAgICAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQ29nbml0bycsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ1NpZ25VcFN1Y2Nlc3NlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyUG9vbDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0NvZ25pdG8nLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTaWduSW5TdWNjZXNzZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVXNlclBvb2w6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9Db2duaXRvJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnU2lnblVwVGhyb3R0bGVzJyxcclxuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJQb29sOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQ29nbml0bycsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ1NpZ25JblRocm90dGxlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyUG9vbDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFkZCB3aWRnZXRzIHRvIGRhc2hib2FyZFxyXG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25EYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgICAgICAgYXBpTWV0cmljc1dpZGdldCxcclxuICAgICAgICAgICAgZHluYW1vTWV0cmljc1dpZGdldCxcclxuICAgICAgICAgICAgY29nbml0b01ldHJpY3NXaWRnZXRcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBjcml0aWNhbCBhcHBsaWNhdGlvbiBtZXRyaWNzXHJcbiAgICAgKiBTZW5kcyBub3RpZmljYXRpb25zIHRvIFNOUyB0b3BpYyB3aGVuIHRocmVzaG9sZHMgYXJlIGJyZWFjaGVkXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY3JlYXRlQWxhcm1zKHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcyk6IHZvaWQge1xyXG4gICAgICAgIC8vIEFQSSBHYXRld2F5IGVycm9yIHJhdGUgYWxhcm1cclxuICAgICAgICBjb25zdCBhcGlFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0FwaUVycm9yUmF0ZUFsYXJtJywge1xyXG4gICAgICAgICAgICBhbGFybU5hbWU6ICdidWRnZXRidWRkeS1hcGktaGlnaC1lcnJvci1yYXRlJyxcclxuICAgICAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IEFQSSBHYXRld2F5IDVYWCBlcnJvciByYXRlIGV4Y2VlZHMgdGhyZXNob2xkIC0gaW5kaWNhdGVzIGJhY2tlbmQgaXNzdWVzJyxcclxuXHJcbiAgICAgICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICc1WFhFcnJvcicsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgICAgIC8vIEFsZXJ0IGlmIG1vcmUgdGhhbiAxMCA1WFggZXJyb3JzIGluIDUgbWludXRlc1xyXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDEwLFxyXG4gICAgICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICAgICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQVBJIEdhdGV3YXkgbGF0ZW5jeSBhbGFybVxyXG4gICAgICAgIGNvbnN0IGFwaUxhdGVuY3lBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBcGlMYXRlbmN5QWxhcm0nLCB7XHJcbiAgICAgICAgICAgIGFsYXJtTmFtZTogJ2J1ZGdldGJ1ZGR5LWFwaS1oaWdoLWxhdGVuY3knLFxyXG4gICAgICAgICAgICBhbGFybURlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgQVBJIEdhdGV3YXkgcmVzcG9uc2UgbGF0ZW5jeSBleGNlZWRzIDUgc2Vjb25kcyAtIHBlcmZvcm1hbmNlIGRlZ3JhZGF0aW9uJyxcclxuXHJcbiAgICAgICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdMYXRlbmN5JyxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICBBcGlOYW1lOiBwcm9wcy5hcGkucmVzdEFwaU5hbWUsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgICAgIC8vIEFsZXJ0IGlmIGF2ZXJhZ2UgbGF0ZW5jeSA+IDUgc2Vjb25kc1xyXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDUwMDAsXHJcbiAgICAgICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAzLFxyXG4gICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIER5bmFtb0RCIHRocm90dGxpbmcgYWxhcm1cclxuICAgICAgICBjb25zdCBkeW5hbW9UaHJvdHRsZUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0R5bmFtb1Rocm90dGxlQWxhcm0nLCB7XHJcbiAgICAgICAgICAgIGFsYXJtTmFtZTogJ2J1ZGdldGJ1ZGR5LWR5bmFtb2RiLXRocm90dGxpbmcnLFxyXG4gICAgICAgICAgICBhbGFybURlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgRHluYW1vREIgcmVxdWVzdHMgYXJlIGJlaW5nIHRocm90dGxlZCAtIGNhcGFjaXR5IGV4Y2VlZGVkJyxcclxuXHJcbiAgICAgICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnVGhyb3R0bGVkUmVxdWVzdHMnLFxyXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgIFRhYmxlTmFtZTogcHJvcHMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICB9KSxcclxuXHJcbiAgICAgICAgICAgIC8vIEFsZXJ0IG9uIGFueSB0aHJvdHRsaW5nXHJcbiAgICAgICAgICAgIHRocmVzaG9sZDogMCxcclxuICAgICAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQUkgZmFsbGJhY2sgYWxhcm0gLSB0aGUgQUkgTGFtYmRhcyBzZXJ2ZSBhIGRldGVybWluaXN0aWMgdGVtcGxhdGUgd2hlbiBCZWRyb2NrXHJcbiAgICAgICAgLy8gZmFpbHMsIGFuZCByZXBvcnQgc3VjY2Vzcy4gVGhleSBlbWl0IEFpRmFsbGJhY2tVc2VkIChFTUYsIHVuZGltZW5zaW9uZWRcclxuICAgICAgICAvLyBhZ2dyZWdhdGUgcGx1cyBGZWF0dXJlL01vZGVsSWQpIG9uIGV2ZXJ5IGZhbGxiYWNrLlxyXG4gICAgICAgIGNvbnN0IGFpRmFsbGJhY2tBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBaUZhbGxiYWNrQWxhcm0nLCB7XHJcbiAgICAgICAgICAgIGFsYXJtTmFtZTogJ2J1ZGdldGJ1ZGR5LWFpLWZhbGxiYWNrLWluLXVzZScsXHJcbiAgICAgICAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBSSBmZWF0dXJlcyBhcmUgc2VydmluZyB0aGUgZGV0ZXJtaW5pc3RpYyBmYWxsYmFjayBpbnN0ZWFkIG9mIEJlZHJvY2sgb3V0cHV0JyxcclxuXHJcbiAgICAgICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0J1ZGdldEJ1ZGR5L0FJJyxcclxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBaUZhbGxiYWNrVXNlZCcsXHJcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcygxNSksXHJcbiAgICAgICAgICAgIH0pLFxyXG5cclxuICAgICAgICAgICAgdGhyZXNob2xkOiAxLFxyXG4gICAgICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fT1JfRVFVQUxfVE9fVEhSRVNIT0xELFxyXG4gICAgICAgICAgICAvLyBUaGUgRU1GIG1ldHJpYyBkb2VzIG5vdCBleGlzdCB1bnRpbCBpdHMgZmlyc3QgZW1pc3Npb247IG1pc3NpbmcgZGF0YSBpcyBoZWFsdGh5XHJcbiAgICAgICAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBBZGQgYWxhcm1zIHRvIFNOUyB0b3BpY1xyXG4gICAgICAgIGFwaUVycm9yQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsZXJ0VG9waWMpKTtcclxuICAgICAgICBhcGlMYXRlbmN5QWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsZXJ0VG9waWMpKTtcclxuICAgICAgICBkeW5hbW9UaHJvdHRsZUFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGVydFRvcGljKSk7XHJcbiAgICAgICAgYWlGYWxsYmFja0FsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGVydFRvcGljKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgY29zdCBtb25pdG9yaW5nIGFuZCBidWRnZXQgYWxlcnRzXHJcbiAgICAgKiBIZWxwcyB0cmFjayBBV1Mgc3BlbmRpbmcgYW5kIHByZXZlbnQgdW5leHBlY3RlZCBjaGFyZ2VzXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY3JlYXRlQ29zdE1vbml0b3JpbmcoKTogdm9pZCB7XHJcbiAgICAgICAgLy8gQ3JlYXRlIGEgY3VzdG9tIG1ldHJpYyBmb3IgdHJhY2tpbmcgZXN0aW1hdGVkIGNvc3RzXHJcbiAgICAgICAgY29uc3QgY29zdE1ldHJpYyA9IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9CaWxsaW5nJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0VzdGltYXRlZENoYXJnZXMnLFxyXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICBDdXJyZW5jeTogJ1VTRCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ01heGltdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3Vycyg2KSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQ29zdCBtb25pdG9yaW5nIHdpZGdldFxyXG4gICAgICAgIGNvbnN0IGNvc3RXaWRnZXQgPSBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnRXN0aW1hdGVkIEFXUyBDb3N0cycsXHJcbiAgICAgICAgICAgIGxlZnQ6IFtjb3N0TWV0cmljXSxcclxuICAgICAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFJIG91dGNvbWUgd2lkZ2V0IC0gQmVkcm9jayBzdWNjZXNzZXMgdnMgZGV0ZXJtaW5pc3RpYyBmYWxsYmFja3NcclxuICAgICAgICBjb25zdCBhaU91dGNvbWVXaWRnZXQgPSBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnQUk6IEJlZHJvY2sgdnMgRmFsbGJhY2snLFxyXG4gICAgICAgICAgICBsZWZ0OiBbJ0FpSW52b2tlU3VjY2VlZGVkJywgJ0FpRmFsbGJhY2tVc2VkJ10ubWFwKChtZXRyaWNOYW1lKSA9PiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQnVkZ2V0QnVkZHkvQUknLFxyXG4gICAgICAgICAgICAgICAgbWV0cmljTmFtZSxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSxcclxuICAgICAgICAgICAgfSkpLFxyXG4gICAgICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgICAgIGhlaWdodDogNixcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNvc3QgYW5kIEFJIHdpZGdldHMgdG8gZGFzaGJvYXJkIChvbmUgcm93KVxyXG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25EYXNoYm9hcmQuYWRkV2lkZ2V0cyhjb3N0V2lkZ2V0LCBhaU91dGNvbWVXaWRnZXQpO1xyXG5cclxuICAgICAgICAvLyBDb3N0IGFsYXJtIC0gYWxlcnQgaWYgbW9udGhseSBjb3N0cyBleGNlZWQgJDIwMFxyXG4gICAgICAgIGNvbnN0IGNvc3RBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdDb3N0QWxhcm0nLCB7XHJcbiAgICAgICAgICAgIGFsYXJtTmFtZTogJ2J1ZGdldGJ1ZGR5LWhpZ2gtY29zdHMnLFxyXG4gICAgICAgICAgICBhbGFybURlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgQVdTIG1vbnRobHkgY29zdHMgZXhjZWVkICQyMDAgYnVkZ2V0IHRocmVzaG9sZCAtIHJldmlldyB1c2FnZScsXHJcblxyXG4gICAgICAgICAgICBtZXRyaWM6IGNvc3RNZXRyaWMsXHJcblxyXG4gICAgICAgICAgICAvLyBBbGVydCBpZiBjb3N0cyBleGNlZWQgJDIwMFxyXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDIwMCxcclxuICAgICAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNvc3QgYWxhcm0gdG8gU05TIHRvcGljXHJcbiAgICAgICAgY29zdEFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGVydFRvcGljKSk7XHJcbiAgICB9XHJcbn1cclxuIl19