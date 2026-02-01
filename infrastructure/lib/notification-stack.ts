import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface NotificationStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  commonLayer: lambda.LayerVersion;
  expoAccessToken: string;
}

export class NotificationStack extends cdk.Stack {
  public readonly notificationFunction: lambda.Function;
  public readonly budgetAlertsFunction: lambda.Function;
  public readonly dailyRemindersFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: NotificationStackProps) {
    super(scope, id, props);

    // Create SharedLayer for this stack (no longer importing from API stack)
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('../backend/layers/shared/nodejs'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities layer for notification functions',
    });

    // 1. Create Notification Service Lambda
    this.notificationFunction = new lambda.Function(this, 'NotificationFunction', {
      functionName: `budgetbuddy-${this.node.tryGetContext('environment') || 'dev'}-notifications`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/functions/notifications'),
      layers: [props.commonLayer, sharedLayer],
      environment: {
        TABLE_NAME: props.table.tableName,
        EXPO_ACCESS_TOKEN: props.expoAccessToken,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      description: 'Handles push notification delivery, device management, and preferences',
    });

    // Grant DynamoDB permissions to Notification Service
    props.table.grantReadWriteData(this.notificationFunction);

    // 2. Create Budget Alerts Service Lambda
    this.budgetAlertsFunction = new lambda.Function(this, 'BudgetAlertsFunction', {
      functionName: `budgetbuddy-${this.node.tryGetContext('environment') || 'dev'}-budget-alerts`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/functions/budget-alerts'),
      layers: [props.commonLayer, sharedLayer],
      environment: {
        TABLE_NAME: props.table.tableName,
        NOTIFICATION_FUNCTION_ARN: this.notificationFunction.functionArn,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      // Reserved concurrency removed for dev - can be added in prod if needed
      description: 'Monitors budget spending and triggers alerts at threshold levels',
    });

    // Grant DynamoDB read permissions to Budget Alerts Service
    props.table.grantReadData(this.budgetAlertsFunction);

    // Grant Lambda invoke permission to call Notification Service
    this.notificationFunction.grantInvoke(this.budgetAlertsFunction);

    // 3. Create Daily Reminders Service Lambda
    this.dailyRemindersFunction = new lambda.Function(this, 'DailyRemindersFunction', {
      functionName: `budgetbuddy-${this.node.tryGetContext('environment') || 'dev'}-daily-reminders`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/functions/daily-reminders'),
      layers: [props.commonLayer, sharedLayer],
      environment: {
        TABLE_NAME: props.table.tableName,
        NOTIFICATION_FUNCTION_ARN: this.notificationFunction.functionArn,
      },
      timeout: cdk.Duration.seconds(300), // 5 minutes for batch processing
      memorySize: 1024,
      description: 'Sends daily reminders to users who haven\'t logged transactions',
    });

    // Grant DynamoDB read permissions to Daily Reminders Service
    props.table.grantReadData(this.dailyRemindersFunction);

    // Grant Lambda invoke permission to call Notification Service
    this.notificationFunction.grantInvoke(this.dailyRemindersFunction);

    // 4. Configure DynamoDB Streams event source mapping
    this.budgetAlertsFunction.addEventSourceMapping('TransactionStreamMapping', {
      eventSourceArn: props.table.tableStreamArn!,
      batchSize: 10,
      startingPosition: lambda.StartingPosition.LATEST,
      retryAttempts: 2,
      bisectBatchOnError: true,
      filters: [
        lambda.FilterCriteria.filter({
          eventName: lambda.FilterRule.isEqual('INSERT'),
          dynamodb: {
            NewImage: {
              SK: { S: lambda.FilterRule.beginsWith('TRANSACTION#') },
            },
          },
        }),
      ],
    });

    // Grant DynamoDB Streams read permissions
    this.budgetAlertsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'dynamodb:GetRecords',
          'dynamodb:GetShardIterator',
          'dynamodb:DescribeStream',
          'dynamodb:ListStreams',
        ],
        resources: [props.table.tableStreamArn!],
      })
    );

    // 5. Create EventBridge scheduled rules
    const dailyRemindersRule = new events.Rule(this, 'DailyRemindersRule', {
      ruleName: `budgetbuddy-${this.node.tryGetContext('environment') || 'dev'}-daily-reminders`,
      description: 'Triggers daily reminders service every 15 minutes',
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      enabled: true,
    });

    dailyRemindersRule.addTarget(
      new targets.LambdaFunction(this.dailyRemindersFunction, {
        retryAttempts: 2,
        maxEventAge: cdk.Duration.hours(1),
      })
    );

    const budgetAlertsRule = new events.Rule(this, 'BudgetAlertsRule', {
      ruleName: `budgetbuddy-${this.node.tryGetContext('environment') || 'dev'}-budget-alerts`,
      description: 'Triggers budget alerts service every 6 hours for missed alerts',
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      enabled: true,
    });

    budgetAlertsRule.addTarget(
      new targets.LambdaFunction(this.budgetAlertsFunction, {
        retryAttempts: 2,
        maxEventAge: cdk.Duration.hours(2),
      })
    );

    // 6. Create CloudWatch alarms
    this.createAlarms();

    // 7. Create CloudWatch dashboard
    this.createDashboard();

    // 8. Export Lambda function ARNs for API Gateway integration
    new cdk.CfnOutput(this, 'NotificationFunctionArn', {
      value: this.notificationFunction.functionArn,
      description: 'ARN of the Notification Service Lambda function',
      exportName: `${this.stackName}-NotificationFunctionArn`,
    });

    new cdk.CfnOutput(this, 'BudgetAlertsFunctionArn', {
      value: this.budgetAlertsFunction.functionArn,
      description: 'ARN of the Budget Alerts Service Lambda function',
      exportName: `${this.stackName}-BudgetAlertsFunctionArn`,
    });

    new cdk.CfnOutput(this, 'DailyRemindersFunctionArn', {
      value: this.dailyRemindersFunction.functionArn,
      description: 'ARN of the Daily Reminders Service Lambda function',
      exportName: `${this.stackName}-DailyRemindersFunctionArn`,
    });
  }

  private createAlarms(): void {
    const functions = [
      { fn: this.notificationFunction, name: 'Notification' },
      { fn: this.budgetAlertsFunction, name: 'BudgetAlerts' },
      { fn: this.dailyRemindersFunction, name: 'DailyReminders' },
    ];

    functions.forEach(({ fn, name }) => {
      // Error rate alarm
      new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        alarmName: `${fn.functionName}-errors`,
        alarmDescription: `Error rate alarm for ${name} Lambda function`,
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      // Throttle alarm
      new cloudwatch.Alarm(this, `${name}ThrottleAlarm`, {
        alarmName: `${fn.functionName}-throttles`,
        alarmDescription: `Throttle alarm for ${name} Lambda function`,
        metric: fn.metricThrottles({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      // Duration alarm (p99 > 1 second)
      new cloudwatch.Alarm(this, `${name}DurationAlarm`, {
        alarmName: `${fn.functionName}-duration`,
        alarmDescription: `Duration alarm for ${name} Lambda function`,
        metric: fn.metricDuration({
          period: cdk.Duration.minutes(5),
          statistic: 'p99',
        }),
        threshold: 1000, // 1 second in milliseconds
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    });
  }

  private createDashboard(): void {
    const dashboard = new cloudwatch.Dashboard(this, 'NotificationDashboard', {
      dashboardName: `budgetbuddy-${this.node.tryGetContext('environment') || 'dev'}-notifications`,
    });

    // Add widgets for each Lambda function
    const functions = [
      { fn: this.notificationFunction, name: 'Notification Service' },
      { fn: this.budgetAlertsFunction, name: 'Budget Alerts Service' },
      { fn: this.dailyRemindersFunction, name: 'Daily Reminders Service' },
    ];

    functions.forEach(({ fn, name }) => {
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: `${name} - Invocations`,
          left: [fn.metricInvocations()],
          width: 8,
        }),
        new cloudwatch.GraphWidget({
          title: `${name} - Errors`,
          left: [fn.metricErrors()],
          width: 8,
        }),
        new cloudwatch.GraphWidget({
          title: `${name} - Duration`,
          left: [fn.metricDuration({ statistic: 'Average' })],
          width: 8,
        })
      );
    });
  }
}
