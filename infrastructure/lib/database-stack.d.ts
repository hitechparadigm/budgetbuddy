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
export declare class DatabaseStack extends cdk.Stack {
    /**
     * The main DynamoDB table for the application
     * Exposed as public property for use in other stacks
     */
    readonly table: dynamodb.Table;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
