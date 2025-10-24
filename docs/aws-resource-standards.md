# AWS Resource Management Standards for BudgetBuddy

This document defines the mandatory standards for naming, tagging, and documenting all AWS resources in the BudgetBuddy application.

## Resource Naming Convention

### Prefix Standard
All AWS resources MUST use the **"budgetbuddy-"** prefix to:
- Ensure easy identification in AWS console
- Avoid naming conflicts with other projects
- Enable efficient cost tracking and filtering
- Simplify resource management and automation

### Naming Pattern
**Format**: `budgetbuddy-{service}-{environment}`

**Examples**:
- DynamoDB Table: `budgetbuddy-main`
- Lambda Function: `budgetbuddy-auth`
- S3 Bucket: `budgetbuddy-web-app`
- API Gateway: `budgetbuddy-api`
- CloudFront: `budgetbuddy-web`
- SNS Topic: `budgetbuddy-alerts`

### CloudFormation Exports
**Format**: `budgetbuddy-{resource-type}-{descriptor}`

**Examples**:
- `budgetbuddy-table-name`
- `budgetbuddy-api-url`
- `budgetbuddy-user-pool-id`

## Mandatory Tags

All AWS resources MUST include these tags:

### Core Application Tags
```json
{
  "Project": "BudgetBuddy",
  "Application": "budgetbuddy",
  "Environment": "dev|staging|prod",
  "ManagedBy": "CDK",
  "Owner": "BudgetBuddy-Team"
}
```

### Cost Management Tags
```json
{
  "CostCenter": "BudgetBuddy-{Component}",
  "Purpose": "Family-Budgeting-Application"
}
```

### Component-Specific Tags
```json
{
  "Component": "Database|Authentication|API|WebHosting|AdminHosting|WebCDN|AdminCDN|Monitoring",
  "Service": "DynamoDB|Cognito|Lambda|S3|CloudFront|SNS|CloudWatch"
}
```

### Service-Specific Tags

#### Lambda Functions
```json
{
  "Handler": "auth|budget|transaction|ai|family|payment|email|admin",
  "Runtime": "NodeJS-20",
  "CostCenter": "BudgetBuddy-Compute"
}
```

#### DynamoDB Tables
```json
{
  "DataType": "Application-Data",
  "BackupRequired": "Yes",
  "CostCenter": "BudgetBuddy-Core"
}
```

#### S3 Buckets
```json
{
  "ContentType": "Static-Website|Admin-Dashboard",
  "BackupRequired": "No",
  "CostCenter": "BudgetBuddy-Frontend|BudgetBuddy-Admin"
}
```

#### CloudFront Distributions
```json
{
  "PriceClass": "US-Canada-Europe",
  "CachingEnabled": "Yes",
  "CostCenter": "BudgetBuddy-CDN"
}
```

#### Cognito User Pools
```json
{
  "UserType": "Application-Users",
  "SecurityLevel": "High",
  "CostCenter": "BudgetBuddy-Auth"
}
```

#### SNS Topics
```json
{
  "AlertType": "Critical",
  "NotificationMethod": "Email-SMS",
  "CostCenter": "BudgetBuddy-Operations"
}
```

## Resource Descriptions

All AWS resources MUST include detailed descriptions that explain:

### Required Description Elements
1. **Purpose**: What the resource does
2. **Context**: How it fits in the application
3. **Key Features**: Important configuration details
4. **Dependencies**: What it connects to

### Description Examples

#### Lambda Functions
```
"BudgetBuddy authentication handler for user registration, login, and profile management"
```

#### DynamoDB Tables
```
"BudgetBuddy main application table with single-table design for cost-optimized data storage"
```

#### API Gateway
```
"BudgetBuddy REST API for web and mobile clients with serverless Lambda backend"
```

#### S3 Buckets
```
"BudgetBuddy web application static hosting with React SPA support"
```

#### CloudFront Distributions
```
"budgetbuddy-web - Global CDN for React web application with SPA routing support"
```

#### CloudWatch Alarms
```
"BudgetBuddy API Gateway 5XX error rate exceeds threshold - indicates backend issues"
```

## Cost Center Allocation

### Cost Centers by Component
- **BudgetBuddy-Core**: Database, core infrastructure
- **BudgetBuddy-Compute**: Lambda functions, processing
- **BudgetBuddy-Auth**: Authentication services
- **BudgetBuddy-Frontend**: Web application hosting
- **BudgetBuddy-Admin**: Admin dashboard hosting
- **BudgetBuddy-CDN**: Content delivery network
- **BudgetBuddy-Operations**: Monitoring, alerts, logging

## Implementation in CDK

### Stack Level Tagging
```typescript
// Apply to entire CDK app
cdk.Tags.of(app).add('Project', 'BudgetBuddy');
cdk.Tags.of(app).add('Application', 'budgetbuddy');
cdk.Tags.of(app).add('Environment', envName);
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Owner', 'BudgetBuddy-Team');
cdk.Tags.of(app).add('CostCenter', 'BudgetBuddy-Infrastructure');
cdk.Tags.of(app).add('Purpose', 'Family-Budgeting-Application');
```

### Resource Level Tagging
```typescript
// Add specific tags to individual resources
cdk.Tags.of(resource).add('Component', 'Database');
cdk.Tags.of(resource).add('Service', 'DynamoDB');
cdk.Tags.of(resource).add('DataType', 'Application-Data');
```

## Benefits of This Standard

### Cost Management
- Easy filtering and grouping in AWS Cost Explorer
- Accurate cost allocation by component and environment
- Simplified budget creation and monitoring

### Operations
- Quick resource identification in AWS console
- Efficient automation and scripting
- Clear ownership and responsibility

### Compliance
- Consistent resource documentation
- Audit trail for resource changes
- Security and access control clarity

### Development
- Clear resource relationships
- Simplified troubleshooting
- Consistent deployment patterns

## Enforcement

This standard is **MANDATORY** and enforced through:
- CDK code reviews
- Automated tagging in infrastructure code
- Cost monitoring and reporting
- Regular compliance audits