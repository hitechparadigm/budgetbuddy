import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NotificationStack } from '../lib/notification-stack';

/**
 * Wave 3 phase 1 (design section 3 and 9.5): the jobs stack's schedule, the
 * daily-reminders least-privilege UpdateItem grant, and the removed shared
 * layer. Only this stack is synthesized (its assets need no Docker); asset
 * staging is off so the function directories are referenced, not copied.
 */
function synth(): Template {
  const app = new cdk.App({
    context: { environment: 'dev', 'aws:cdk:disable-asset-staging': true },
  });
  const dataStack = new cdk.Stack(app, 'Data');
  const table = new dynamodb.Table(dataStack, 'Table', {
    partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
    stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
  });
  // A GSI, like the real table: table.grant() then adds an index/* ARN as well.
  table.addGlobalSecondaryIndex({
    indexName: 'GSI3',
    partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
  });
  const stack = new NotificationStack(app, 'Notification', {
    table,
    expoAccessToken: '',
  });
  return Template.fromStack(stack);
}

const template = synth();

/** IAM statements of the policies attached to the daily-reminders role. */
function dailyRemindersStatements(): Array<Record<string, unknown>> {
  const fns = template.findResources('AWS::Lambda::Function', {
    Properties: { FunctionName: 'budgetbuddy-dev-daily-reminders' },
  });
  const [fn] = Object.values(fns);
  const roleId = (fn.Properties.Role as { 'Fn::GetAtt': string[] })['Fn::GetAtt'][0];
  const policies = template.findResources('AWS::IAM::Policy');
  return Object.values(policies)
    .filter((p) => (p.Properties.Roles as Array<{ Ref: string }>).some((r) => r.Ref === roleId))
    .flatMap((p) => p.Properties.PolicyDocument.Statement as Array<Record<string, unknown>>);
}

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

describe('NotificationStack (Wave 3 phase 1)', () => {
  it('runs daily-reminders hourly at minute 0 instead of every 15 minutes', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Name: 'budgetbuddy-dev-daily-reminders',
      ScheduleExpression: 'cron(0 * * * ? *)',
    });
    const rules = template.findResources('AWS::Events::Rule');
    const expressions = Object.values(rules).map((r) => r.Properties.ScheduleExpression);
    expect(expressions).not.toContain('rate(15 minutes)');
  });

  it('adds the 13:00 UTC nudge rule with the daily-nudges input', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Name: 'budgetbuddy-dev-daily-nudges',
      ScheduleExpression: 'cron(0 13 * * ? *)',
      Targets: Match.arrayWith([
        Match.objectLike({ Input: JSON.stringify({ mode: 'daily-nudges' }) }),
      ]),
    });
  });

  it('keeps bill reminders daily at 08:00 UTC', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Name: 'budgetbuddy-dev-bill-scheduler',
      ScheduleExpression: 'cron(0 8 * * ? *)',
    });
  });

  it('grants daily-reminders dynamodb:UpdateItem on the table ARN only, no wildcard', () => {
    const statements = dailyRemindersStatements();
    const update = statements.filter((s) => asList(s.Action).includes('dynamodb:UpdateItem'));
    expect(update).toHaveLength(1);
    expect(asList(update[0].Action)).toEqual(['dynamodb:UpdateItem']);
    const resources = asList(update[0].Resource);
    expect(resources).toHaveLength(1);
    // the table's own ARN, imported from the data stack; not the index/* ARN
    expect(resources[0]).toEqual({ 'Fn::ImportValue': expect.stringContaining('Arn') });
    expect(JSON.stringify(resources[0])).not.toContain('index');

    for (const statement of statements) {
      for (const resource of asList(statement.Resource)) expect(resource).not.toBe('*');
      for (const action of asList(statement.Action)) expect(action).not.toBe('dynamodb:*');
    }
  });

  it('ships one layer (common) and no shared layer', () => {
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: 'budgetbuddy-notification-common',
    });
  });
});
