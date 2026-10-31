"use strict";
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
exports.DatabaseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const backup = __importStar(require("aws-cdk-lib/aws-backup"));
const data_protection_1 = require("./config/data-protection");
class DatabaseStack extends cdk.Stack {
    constructor(scope, id, props) {
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
            // Always on, independent of isDataProtected
            pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
            // Server-side encryption using AWS managed keys
            // Ensures data is encrypted at rest for compliance
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            // Protected by default: dev is the deployed environment and holds the real data.
            // Deletion protection also makes any change that would replace the table fail the
            // stack update instead of recreating it empty.
            deletionProtection: (0, data_protection_1.isDataProtected)(this),
            removalPolicy: (0, data_protection_1.isDataProtected)(this) ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
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
        // Daily AWS Backup of the table, kept 35 days (matches the PITR window). Skipped for an
        // opted-out throwaway stack so it does not leave a RETAIN-ed vault behind. Project,
        // Environment, Owner, ManagedBy and CostCenter come from the app-level tags in bin/app.ts.
        if ((0, data_protection_1.isDataProtected)(this)) {
            const vault = new backup.BackupVault(this, 'BudgetBuddyBackupVault', {
                backupVaultName: `budgetbuddy-${this.node.tryGetContext('environment') || 'dev'}-vault`,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
            });
            const plan = backup.BackupPlan.daily35DayRetention(this, 'BudgetBuddyBackupPlan', vault);
            plan.addSelection('MainTable', {
                resources: [backup.BackupResource.fromDynamoDbTable(this.table)],
            });
            cdk.Tags.of(vault).add('Component', 'Database');
            cdk.Tags.of(vault).add('Service', 'Backup');
            cdk.Tags.of(vault).add('DataType', 'Application-Data');
        }
    }
}
exports.DatabaseStack = DatabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhYmFzZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7O0dBY0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyxtRUFBcUQ7QUFDckQsK0RBQWlEO0FBRWpELDhEQUEyRDtBQUUzRCxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQU8xQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCOzs7Ozs7Ozs7V0FTRztRQUNILElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUN4RCxTQUFTLEVBQUUsa0JBQWtCO1lBRTdCLG9EQUFvRDtZQUNwRCxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLElBQUk7Z0JBQ1YsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUVELG1FQUFtRTtZQUNuRSxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUVELGdFQUFnRTtZQUNoRSwwQ0FBMEM7WUFDMUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUVqRCx5REFBeUQ7WUFDekQsNkRBQTZEO1lBQzdELE1BQU0sRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLGtCQUFrQjtZQUVsRCxvREFBb0Q7WUFDcEQsbUVBQW1FO1lBQ25FLDRDQUE0QztZQUM1QyxnQ0FBZ0MsRUFBRSxFQUFFLDBCQUEwQixFQUFFLElBQUksRUFBRTtZQUV0RSxnREFBZ0Q7WUFDaEQsbURBQW1EO1lB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QyxZQUFZLENBQUMsV0FBVyxFQUFFO2dCQUM3QixTQUFTLEVBQUUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNqRSxDQUFDLENBQUM7WUFFSCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2hELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3pELENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUF4TUQsc0NBd01DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIERhdGFiYXNlIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKlxyXG4gKiBDcmVhdGVzIGEgRHluYW1vREIgdGFibGUgdXNpbmcgc2luZ2xlLXRhYmxlIGRlc2lnbiBwYXR0ZXJuIGZvciBvcHRpbWFsXHJcbiAqIHBlcmZvcm1hbmNlIGFuZCBjb3N0IGVmZmljaWVuY3kuIFRoZSB0YWJsZSBzdG9yZXMgYWxsIGFwcGxpY2F0aW9uIGVudGl0aWVzXHJcbiAqICh1c2VycywgZmFtaWxpZXMsIGJ1ZGdldHMsIHRyYW5zYWN0aW9ucywgZXRjLikgd2l0aCBhcHByb3ByaWF0ZSBHU0kgaW5kZXhlc1xyXG4gKiBmb3IgZWZmaWNpZW50IHF1ZXJ5aW5nIHBhdHRlcm5zLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gU2luZ2xlIHRhYmxlIGRlc2lnbiBmb3IgY29zdCBvcHRpbWl6YXRpb25cclxuICogLSBPbi1kZW1hbmQgYmlsbGluZyBmb3IgYXV0b21hdGljIHNjYWxpbmdcclxuICogLSBUaHJlZSBHU0kgaW5kZXhlcyBmb3IgZGlmZmVyZW50IGFjY2VzcyBwYXR0ZXJuc1xyXG4gKiAtIFBvaW50LWluLXRpbWUgcmVjb3ZlcnkgZm9yIGRhdGEgcHJvdGVjdGlvblxyXG4gKiAtIEVuY3J5cHRpb24gYXQgcmVzdCBmb3Igc2VjdXJpdHkgY29tcGxpYW5jZVxyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIGJhY2t1cCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYmFja3VwJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IGlzRGF0YVByb3RlY3RlZCB9IGZyb20gJy4vY29uZmlnL2RhdGEtcHJvdGVjdGlvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqXHJcbiAgICogVGhlIG1haW4gRHluYW1vREIgdGFibGUgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNYWluIGFwcGxpY2F0aW9uIHRhYmxlIHVzaW5nIHNpbmdsZS10YWJsZSBkZXNpZ25cclxuICAgICAqXHJcbiAgICAgKiBQcmltYXJ5IEtleSBTdHJ1Y3R1cmU6XHJcbiAgICAgKiAtIFBLIChQYXJ0aXRpb24gS2V5KTogRW50aXR5IGlkZW50aWZpZXIgKGUuZy4sIFwiVVNFUiMxMjNcIiwgXCJGQU1JTFkjNDU2XCIpXHJcbiAgICAgKiAtIFNLIChTb3J0IEtleSk6IEVudGl0eSB0eXBlIGFuZCBhZGRpdGlvbmFsIGlkZW50aWZpZXJzXHJcbiAgICAgKlxyXG4gICAgICogVGhpcyBkZXNpZ24gYWxsb3dzIHN0b3JpbmcgbXVsdGlwbGUgZW50aXR5IHR5cGVzIGluIG9uZSB0YWJsZVxyXG4gICAgICogd2hpbGUgbWFpbnRhaW5pbmcgZWZmaWNpZW50IHF1ZXJ5IHBhdHRlcm5zIGFuZCByZWR1Y2luZyBjb3N0cy5cclxuICAgICAqL1xyXG4gICAgdGhpcy50YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQnVkZ2V0QnVkZHlUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnYnVkZ2V0YnVkZHktbWFpbicsXHJcblxyXG4gICAgICAvLyBQYXJ0aXRpb24ga2V5IC0gcHJpbWFyeSBpZGVudGlmaWVyIGZvciB0aGUgZW50aXR5XHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdQSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBTb3J0IGtleSAtIGFsbG93cyBtdWx0aXBsZSBpdGVtcyBwZXIgcGFydGl0aW9uIGFuZCByYW5nZSBxdWVyaWVzXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnU0snLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gT24tZGVtYW5kIGJpbGxpbmcgZm9yIGF1dG9tYXRpYyBzY2FsaW5nIGFuZCBjb3N0IG9wdGltaXphdGlvblxyXG4gICAgICAvLyBPbmx5IHBheSBmb3IgYWN0dWFsIHJlYWQvd3JpdGUgcmVxdWVzdHNcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSBEeW5hbW9EQiBTdHJlYW1zIGZvciByZWFsLXRpbWUgZXZlbnQgcHJvY2Vzc2luZ1xyXG4gICAgICAvLyBSZXF1aXJlZCBmb3IgYnVkZ2V0IGFsZXJ0cyBhbmQgb3RoZXIgZXZlbnQtZHJpdmVuIGZlYXR1cmVzXHJcbiAgICAgIHN0cmVhbTogZHluYW1vZGIuU3RyZWFtVmlld1R5cGUuTkVXX0FORF9PTERfSU1BR0VTLFxyXG5cclxuICAgICAgLy8gRW5hYmxlIHBvaW50LWluLXRpbWUgcmVjb3ZlcnkgZm9yIGRhdGEgcHJvdGVjdGlvblxyXG4gICAgICAvLyBBbGxvd3MgcmVzdG9yYXRpb24gb2YgdGFibGUgdG8gYW55IHBvaW50IHdpdGhpbiB0aGUgbGFzdCAzNSBkYXlzXHJcbiAgICAgIC8vIEFsd2F5cyBvbiwgaW5kZXBlbmRlbnQgb2YgaXNEYXRhUHJvdGVjdGVkXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7IHBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiB0cnVlIH0sXHJcblxyXG4gICAgICAvLyBTZXJ2ZXItc2lkZSBlbmNyeXB0aW9uIHVzaW5nIEFXUyBtYW5hZ2VkIGtleXNcclxuICAgICAgLy8gRW5zdXJlcyBkYXRhIGlzIGVuY3J5cHRlZCBhdCByZXN0IGZvciBjb21wbGlhbmNlXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuXHJcbiAgICAgIC8vIFByb3RlY3RlZCBieSBkZWZhdWx0OiBkZXYgaXMgdGhlIGRlcGxveWVkIGVudmlyb25tZW50IGFuZCBob2xkcyB0aGUgcmVhbCBkYXRhLlxyXG4gICAgICAvLyBEZWxldGlvbiBwcm90ZWN0aW9uIGFsc28gbWFrZXMgYW55IGNoYW5nZSB0aGF0IHdvdWxkIHJlcGxhY2UgdGhlIHRhYmxlIGZhaWwgdGhlXHJcbiAgICAgIC8vIHN0YWNrIHVwZGF0ZSBpbnN0ZWFkIG9mIHJlY3JlYXRpbmcgaXQgZW1wdHkuXHJcbiAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogaXNEYXRhUHJvdGVjdGVkKHRoaXMpLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBpc0RhdGFQcm90ZWN0ZWQodGhpcykgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHU0kxIC0gRmFtaWx5LWJhc2VkIHF1ZXJpZXNcclxuICAgICAqXHJcbiAgICAgKiBBY2Nlc3MgUGF0dGVybnM6XHJcbiAgICAgKiAtIEdldCBhbGwgbWVtYmVycyBpbiBhIGJ1ZGdldFxyXG4gICAgICogLSBHZXQgYnVkZ2V0IG1ldGFkYXRhIGFuZCBtZW1iZXJzXHJcbiAgICAgKiAtIFF1ZXJ5IGJ1ZGdldC1zcGVjaWZpYyBkYXRhXHJcbiAgICAgKlxyXG4gICAgICogS2V5IFN0cnVjdHVyZTpcclxuICAgICAqIC0gR1NJMVBLOiBcIkJVREdFVCM8YnVkZ2V0SWQ+XCJcclxuICAgICAqIC0gR1NJMVNLOiBcIlVTRVIjPHVzZXJJZD5cIiBvciBcIk1FVEFEQVRBXCIgb3Igb3RoZXIgYnVkZ2V0LXJlbGF0ZWQgZGF0YVxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnR1NJMScsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdHU0kxUEsnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTFTSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIFByb2plY3QgYWxsIGF0dHJpYnV0ZXMgdG8gYXZvaWQgYWRkaXRpb25hbCBxdWVyaWVzXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdTSTIgLSBEYXRlIGFuZCB0aW1lLWJhc2VkIHF1ZXJpZXNcclxuICAgICAqXHJcbiAgICAgKiBBY2Nlc3MgUGF0dGVybnM6XHJcbiAgICAgKiAtIEdldCB0cmFuc2FjdGlvbnMgYnkgZGF0ZSByYW5nZVxyXG4gICAgICogLSBHZXQgYnVkZ2V0cyBieSBtb250aFxyXG4gICAgICogLSBRdWVyeSBzdWJzY3JpcHRpb25zIGJ5IGV4cGlyYXRpb24gZGF0ZVxyXG4gICAgICogLSBHZXQgZmluYW5jaWFsIHRpcHMgYnkgcHVibGljYXRpb24gZGF0ZVxyXG4gICAgICpcclxuICAgICAqIEtleSBTdHJ1Y3R1cmU6XHJcbiAgICAgKiAtIEdTSTJQSzogRW50aXR5IHR5cGUgd2l0aCBkYXRlIChlLmcuLCBcIkJVREdFVCMyMDI0LTAxXCIsIFwiU1VCU0NSSVBUSU9OI2FjdGl2ZVwiKVxyXG4gICAgICogLSBHU0kyU0s6IFwiREFURSM8ZGF0ZT5cIiBvciBcIkJVREdFVCM8YnVkZ2V0SWQ+XCJcclxuICAgICAqL1xyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0dTSTInLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJMlBLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICdHU0kyU0snLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHU0kzIC0gQ2F0ZWdvcnkgYW5kIGFuYWx5dGljcyBxdWVyaWVzXHJcbiAgICAgKlxyXG4gICAgICogQWNjZXNzIFBhdHRlcm5zOlxyXG4gICAgICogLSBHZXQgYWxsIHRyYW5zYWN0aW9ucyBmb3IgYSBzcGVjaWZpYyBjYXRlZ29yeVxyXG4gICAgICogLSBBbmFseXRpY3MgcXVlcmllcyBmb3Igc3BlbmRpbmcgYnkgY2F0ZWdvcnlcclxuICAgICAqIC0gQnVkZ2V0IHZzIGFjdHVhbCBzcGVuZGluZyBhbmFseXNpc1xyXG4gICAgICpcclxuICAgICAqIEtleSBTdHJ1Y3R1cmU6XHJcbiAgICAgKiAtIEdTSTNQSzogXCJCVURHRVQjPG1vbnRoPlwiIG9yIFwiQ0FURUdPUlkjPGNhdGVnb3J5SWQ+XCJcclxuICAgICAqIC0gR1NJM1NLOiBcIkNBVEVHT1JZIzxjYXRlZ29yeUlkPlwiIG9yIFwiQlVER0VUIzxidWRnZXRJZD5cIlxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnR1NJMycsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdHU0kzUEsnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTNTSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdTSTQgLSBJbnZpdGF0aW9uIGxvb2t1cHMgYnkgZW1haWxcclxuICAgICAqXHJcbiAgICAgKiBBY2Nlc3MgUGF0dGVybnM6XHJcbiAgICAgKiAtIEdldCBwZW5kaW5nIGludml0YXRpb25zIGJ5IGVtYWlsIGFkZHJlc3NcclxuICAgICAqIC0gQ2hlY2sgaWYgdXNlciBoYXMgYmVlbiBpbnZpdGVkIHRvIGEgYnVkZ2V0XHJcbiAgICAgKiAtIFF1ZXJ5IGludml0YXRpb24gc3RhdHVzIGFuZCBleHBpcmF0aW9uXHJcbiAgICAgKlxyXG4gICAgICogS2V5IFN0cnVjdHVyZTpcclxuICAgICAqIC0gR1NJNFBLOiBcIklOVklUQVRJT04jPGludml0ZWRFbWFpbD5cIlxyXG4gICAgICogLSBHU0k0U0s6IFwiQ1JFQVRFRCM8dGltZXN0YW1wPlwiIG9yIFwiQlVER0VUIzxidWRnZXRJZD5cIlxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnR1NJNCcsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdHU0k0UEsnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTRTSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgdGhlIHRhYmxlIG5hbWUgZm9yIHJlZmVyZW5jZSBpbiBvdGhlciBzdGFja3MgYW5kIGFwcGxpY2F0aW9uc1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIG5hbWUgZm9yIEJ1ZGdldEJ1ZGR5IGFwcGxpY2F0aW9uIGRhdGEgc3RvcmFnZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS10YWJsZS1uYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCB0aGUgdGFibGUgQVJOIGZvciBJQU0gcG9saWNpZXMgYW5kIG1vbml0b3JpbmdcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYWJsZUFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudGFibGUudGFibGVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgdGFibGUgQVJOIGZvciBCdWRnZXRCdWRkeSBhcHBsaWNhdGlvbiBJQU0gcG9saWNpZXMnLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktdGFibGUtYXJuJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIGNvc3QgYWxsb2NhdGlvbiB0YWdzIGZvciB0cmFja2luZyBleHBlbnNlc1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YWJsZSkuYWRkKCdDb21wb25lbnQnLCAnRGF0YWJhc2UnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudGFibGUpLmFkZCgnU2VydmljZScsICdEeW5hbW9EQicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YWJsZSkuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUNvcmUnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudGFibGUpLmFkZCgnRGF0YVR5cGUnLCAnQXBwbGljYXRpb24tRGF0YScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YWJsZSkuYWRkKCdCYWNrdXBSZXF1aXJlZCcsICdZZXMnKTtcclxuXHJcbiAgICAvLyBEYWlseSBBV1MgQmFja3VwIG9mIHRoZSB0YWJsZSwga2VwdCAzNSBkYXlzIChtYXRjaGVzIHRoZSBQSVRSIHdpbmRvdykuIFNraXBwZWQgZm9yIGFuXHJcbiAgICAvLyBvcHRlZC1vdXQgdGhyb3dhd2F5IHN0YWNrIHNvIGl0IGRvZXMgbm90IGxlYXZlIGEgUkVUQUlOLWVkIHZhdWx0IGJlaGluZC4gUHJvamVjdCxcclxuICAgIC8vIEVudmlyb25tZW50LCBPd25lciwgTWFuYWdlZEJ5IGFuZCBDb3N0Q2VudGVyIGNvbWUgZnJvbSB0aGUgYXBwLWxldmVsIHRhZ3MgaW4gYmluL2FwcC50cy5cclxuICAgIGlmIChpc0RhdGFQcm90ZWN0ZWQodGhpcykpIHtcclxuICAgICAgY29uc3QgdmF1bHQgPSBuZXcgYmFja3VwLkJhY2t1cFZhdWx0KHRoaXMsICdCdWRnZXRCdWRkeUJhY2t1cFZhdWx0Jywge1xyXG4gICAgICAgIGJhY2t1cFZhdWx0TmFtZTogYGJ1ZGdldGJ1ZGR5LSR7dGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2Rldid9LXZhdWx0YCxcclxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgIH0pO1xyXG4gICAgICBjb25zdCBwbGFuID0gYmFja3VwLkJhY2t1cFBsYW4uZGFpbHkzNURheVJldGVudGlvbih0aGlzLCAnQnVkZ2V0QnVkZHlCYWNrdXBQbGFuJywgdmF1bHQpO1xyXG4gICAgICBwbGFuLmFkZFNlbGVjdGlvbignTWFpblRhYmxlJywge1xyXG4gICAgICAgIHJlc291cmNlczogW2JhY2t1cC5CYWNrdXBSZXNvdXJjZS5mcm9tRHluYW1vRGJUYWJsZSh0aGlzLnRhYmxlKV0sXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY2RrLlRhZ3Mub2YodmF1bHQpLmFkZCgnQ29tcG9uZW50JywgJ0RhdGFiYXNlJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHZhdWx0KS5hZGQoJ1NlcnZpY2UnLCAnQmFja3VwJyk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHZhdWx0KS5hZGQoJ0RhdGFUeXBlJywgJ0FwcGxpY2F0aW9uLURhdGEnKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19