/**
 * Database Stack for BudgetBuddy Application
 *
 * Creates a DynamoDB table using single-table design pattern for optimal
 * performance and cost efficiency. The table stores all application entities
 * (users, families, budgets, transactions, etc.) with appropriate GSI indexes
 * for efficient querying patterns.
 *
 * Key Features:
 * - Single table design for cost optimization
 * - On-demand billing for automatic scaling
 * - Three GSI indexes for different access patterns
 * - Point-in-time recovery for data protection
 * - Encryption at rest for security compliance
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  /**
   * The main DynamoDB table for the application
   * Exposed as public property for use in other stacks
   */
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Main application table using single-table design
     *
     * Primary Key Structure:
     * - PK (Partition Key): Entity identifier (e.g., "USER#123", "FAMILY#456")
     * - SK (Sort Key): Entity type and additional identifiers
     *
     * This design allows storing multiple entity types in one table
     * while maintaining efficient query patterns and reducing costs.
     */
    this.table = new dynamodb.Table(this, 'BudgetBuddyTable', {
      tableName: 'budgetbuddy-main',

      // Partition key - primary identifier for the entity
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },

      // Sort key - allows multiple items per partition and range queries
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },

      // On-demand billing for automatic scaling and cost optimization
      // Only pay for actual read/write requests
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      // Enable DynamoDB Streams for real-time event processing
      // Required for budget alerts and other event-driven features
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,

      // Enable point-in-time recovery for data protection
      // Allows restoration of table to any point within the last 35 days
      pointInTimeRecovery: true,

      // Server-side encryption using AWS managed keys
      // Ensures data is encrypted at rest for compliance
      encryption: dynamodb.TableEncryption.AWS_MANAGED,

      // RETAIN in production to prevent accidental data loss on stack deletion
      removalPolicy: this.node.tryGetContext('environment') === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    /**
     * GSI1 - Family-based queries
     *
     * Access Patterns:
     * - Get all members in a budget
     * - Get budget metadata and members
     * - Query budget-specific data
     *
     * Key Structure:
     * - GSI1PK: "BUDGET#<budgetId>"
     * - GSI1SK: "USER#<userId>" or "METADATA" or other budget-related data
     */
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
      // Project all attributes to avoid additional queries
      projectionType: dynamodb.ProjectionType.ALL,
    });

    /**
     * GSI2 - Date and time-based queries
     *
     * Access Patterns:
     * - Get transactions by date range
     * - Get budgets by month
     * - Query subscriptions by expiration date
     * - Get financial tips by publication date
     *
     * Key Structure:
     * - GSI2PK: Entity type with date (e.g., "BUDGET#2024-01", "SUBSCRIPTION#active")
     * - GSI2SK: "DATE#<date>" or "BUDGET#<budgetId>"
     */
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI2SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    /**
     * GSI3 - Category and analytics queries
     *
     * Access Patterns:
     * - Get all transactions for a specific category
     * - Analytics queries for spending by category
     * - Budget vs actual spending analysis
     *
     * Key Structure:
     * - GSI3PK: "BUDGET#<month>" or "CATEGORY#<categoryId>"
     * - GSI3SK: "CATEGORY#<categoryId>" or "BUDGET#<budgetId>"
     */
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: {
        name: 'GSI3PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI3SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    /**
     * GSI4 - Invitation lookups by email
     *
     * Access Patterns:
     * - Get pending invitations by email address
     * - Check if user has been invited to a budget
     * - Query invitation status and expiration
     *
     * Key Structure:
     * - GSI4PK: "INVITATION#<invitedEmail>"
     * - GSI4SK: "CREATED#<timestamp>" or "BUDGET#<budgetId>"
     */
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI4',
      partitionKey: {
        name: 'GSI4PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI4SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Output the table name for reference in other stacks and applications
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB table name for BudgetBuddy application data storage',
      exportName: 'budgetbuddy-table-name',
    });

    // Output the table ARN for IAM policies and monitoring
    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB table ARN for BudgetBuddy application IAM policies',
      exportName: 'budgetbuddy-table-arn',
    });

    // Add comprehensive cost allocation tags for tracking expenses
    cdk.Tags.of(this.table).add('Component', 'Database');
    cdk.Tags.of(this.table).add('Service', 'DynamoDB');
    cdk.Tags.of(this.table).add('CostCenter', 'BudgetBuddy-Core');
    cdk.Tags.of(this.table).add('DataType', 'Application-Data');
    cdk.Tags.of(this.table).add('BackupRequired', 'Yes');
  }
}
