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
            pointInTimeRecovery: true,
            // Server-side encryption using AWS managed keys
            // Ensures data is encrypted at rest for compliance
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            // Automatic removal when stack is deleted (for dev environments)
            // Change to RETAIN for production environments
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        /**
         * GSI1 - Family-based queries
         *
         * Access Patterns:
         * - Get all users in a family
         * - Get family metadata and members
         * - Query family-specific data
         *
         * Key Structure:
         * - GSI1PK: "FAMILY#<familyId>"
         * - GSI1SK: "USER#<userId>" or "METADATA" or other family-related data
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
         * - GSI2SK: "DATE#<date>" or "FAMILY#<familyId>"
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
         * - GSI3SK: "CATEGORY#<categoryId>" or "FAMILY#<familyId>"
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
         * - Check if user has been invited to a family
         * - Query invitation status and expiration
         *
         * Key Structure:
         * - GSI4PK: "INVITATION#<invitedEmail>"
         * - GSI4SK: "CREATED#<timestamp>" or "FAMILY#<familyId>"
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
exports.DatabaseStack = DatabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhYmFzZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7O0dBY0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyxtRUFBcUQ7QUFHckQsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFPMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qjs7Ozs7Ozs7O1dBU0c7UUFDSCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDeEQsU0FBUyxFQUFFLGtCQUFrQjtZQUU3QixvREFBb0Q7WUFDcEQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFFRCxtRUFBbUU7WUFDbkUsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFFRCxnRUFBZ0U7WUFDaEUsMENBQTBDO1lBQzFDLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFFakQseURBQXlEO1lBQ3pELDZEQUE2RDtZQUM3RCxNQUFNLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0I7WUFFbEQsb0RBQW9EO1lBQ3BELG1FQUFtRTtZQUNuRSxtQkFBbUIsRUFBRSxJQUFJO1lBRXpCLGdEQUFnRDtZQUNoRCxtREFBbUQ7WUFDbkQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUVoRCxpRUFBaUU7WUFDakUsK0NB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VUFBVSxDQUFDLENBQUM7UUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM5RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkQsQ0FBQztDQUNGO0FBbkxELHNDQW1MQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBEYXRhYmFzZSBTdGFjayBmb3IgQnVkZ2V0QnVkZHkgQXBwbGljYXRpb25cclxuICpcclxuICogQ3JlYXRlcyBhIER5bmFtb0RCIHRhYmxlIHVzaW5nIHNpbmdsZS10YWJsZSBkZXNpZ24gcGF0dGVybiBmb3Igb3B0aW1hbFxyXG4gKiBwZXJmb3JtYW5jZSBhbmQgY29zdCBlZmZpY2llbmN5LiBUaGUgdGFibGUgc3RvcmVzIGFsbCBhcHBsaWNhdGlvbiBlbnRpdGllc1xyXG4gKiAodXNlcnMsIGZhbWlsaWVzLCBidWRnZXRzLCB0cmFuc2FjdGlvbnMsIGV0Yy4pIHdpdGggYXBwcm9wcmlhdGUgR1NJIGluZGV4ZXNcclxuICogZm9yIGVmZmljaWVudCBxdWVyeWluZyBwYXR0ZXJucy5cclxuICpcclxuICogS2V5IEZlYXR1cmVzOlxyXG4gKiAtIFNpbmdsZSB0YWJsZSBkZXNpZ24gZm9yIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAqIC0gT24tZGVtYW5kIGJpbGxpbmcgZm9yIGF1dG9tYXRpYyBzY2FsaW5nXHJcbiAqIC0gVGhyZWUgR1NJIGluZGV4ZXMgZm9yIGRpZmZlcmVudCBhY2Nlc3MgcGF0dGVybnNcclxuICogLSBQb2ludC1pbi10aW1lIHJlY292ZXJ5IGZvciBkYXRhIHByb3RlY3Rpb25cclxuICogLSBFbmNyeXB0aW9uIGF0IHJlc3QgZm9yIHNlY3VyaXR5IGNvbXBsaWFuY2VcclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBEYXRhYmFzZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICAvKipcclxuICAgKiBUaGUgbWFpbiBEeW5hbW9EQiB0YWJsZSBmb3IgdGhlIGFwcGxpY2F0aW9uXHJcbiAgICogRXhwb3NlZCBhcyBwdWJsaWMgcHJvcGVydHkgZm9yIHVzZSBpbiBvdGhlciBzdGFja3NcclxuICAgKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgdGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE1haW4gYXBwbGljYXRpb24gdGFibGUgdXNpbmcgc2luZ2xlLXRhYmxlIGRlc2lnblxyXG4gICAgICpcclxuICAgICAqIFByaW1hcnkgS2V5IFN0cnVjdHVyZTpcclxuICAgICAqIC0gUEsgKFBhcnRpdGlvbiBLZXkpOiBFbnRpdHkgaWRlbnRpZmllciAoZS5nLiwgXCJVU0VSIzEyM1wiLCBcIkZBTUlMWSM0NTZcIilcclxuICAgICAqIC0gU0sgKFNvcnQgS2V5KTogRW50aXR5IHR5cGUgYW5kIGFkZGl0aW9uYWwgaWRlbnRpZmllcnNcclxuICAgICAqXHJcbiAgICAgKiBUaGlzIGRlc2lnbiBhbGxvd3Mgc3RvcmluZyBtdWx0aXBsZSBlbnRpdHkgdHlwZXMgaW4gb25lIHRhYmxlXHJcbiAgICAgKiB3aGlsZSBtYWludGFpbmluZyBlZmZpY2llbnQgcXVlcnkgcGF0dGVybnMgYW5kIHJlZHVjaW5nIGNvc3RzLlxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdCdWRnZXRCdWRkeVRhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdidWRnZXRidWRkeS1tYWluJyxcclxuXHJcbiAgICAgIC8vIFBhcnRpdGlvbiBrZXkgLSBwcmltYXJ5IGlkZW50aWZpZXIgZm9yIHRoZSBlbnRpdHlcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ1BLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFNvcnQga2V5IC0gYWxsb3dzIG11bHRpcGxlIGl0ZW1zIHBlciBwYXJ0aXRpb24gYW5kIHJhbmdlIHF1ZXJpZXNcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICdTSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBPbi1kZW1hbmQgYmlsbGluZyBmb3IgYXV0b21hdGljIHNjYWxpbmcgYW5kIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAgICAgIC8vIE9ubHkgcGF5IGZvciBhY3R1YWwgcmVhZC93cml0ZSByZXF1ZXN0c1xyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG5cclxuICAgICAgLy8gRW5hYmxlIER5bmFtb0RCIFN0cmVhbXMgZm9yIHJlYWwtdGltZSBldmVudCBwcm9jZXNzaW5nXHJcbiAgICAgIC8vIFJlcXVpcmVkIGZvciBidWRnZXQgYWxlcnRzIGFuZCBvdGhlciBldmVudC1kcml2ZW4gZmVhdHVyZXNcclxuICAgICAgc3RyZWFtOiBkeW5hbW9kYi5TdHJlYW1WaWV3VHlwZS5ORVdfQU5EX09MRF9JTUFHRVMsXHJcblxyXG4gICAgICAvLyBFbmFibGUgcG9pbnQtaW4tdGltZSByZWNvdmVyeSBmb3IgZGF0YSBwcm90ZWN0aW9uXHJcbiAgICAgIC8vIEFsbG93cyByZXN0b3JhdGlvbiBvZiB0YWJsZSB0byBhbnkgcG9pbnQgd2l0aGluIHRoZSBsYXN0IDM1IGRheXNcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcclxuXHJcbiAgICAgIC8vIFNlcnZlci1zaWRlIGVuY3J5cHRpb24gdXNpbmcgQVdTIG1hbmFnZWQga2V5c1xyXG4gICAgICAvLyBFbnN1cmVzIGRhdGEgaXMgZW5jcnlwdGVkIGF0IHJlc3QgZm9yIGNvbXBsaWFuY2VcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG5cclxuICAgICAgLy8gQXV0b21hdGljIHJlbW92YWwgd2hlbiBzdGFjayBpcyBkZWxldGVkIChmb3IgZGV2IGVudmlyb25tZW50cylcclxuICAgICAgLy8gQ2hhbmdlIHRvIFJFVEFJTiBmb3IgcHJvZHVjdGlvbiBlbnZpcm9ubWVudHNcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogR1NJMSAtIEZhbWlseS1iYXNlZCBxdWVyaWVzXHJcbiAgICAgKlxyXG4gICAgICogQWNjZXNzIFBhdHRlcm5zOlxyXG4gICAgICogLSBHZXQgYWxsIHVzZXJzIGluIGEgZmFtaWx5XHJcbiAgICAgKiAtIEdldCBmYW1pbHkgbWV0YWRhdGEgYW5kIG1lbWJlcnNcclxuICAgICAqIC0gUXVlcnkgZmFtaWx5LXNwZWNpZmljIGRhdGFcclxuICAgICAqXHJcbiAgICAgKiBLZXkgU3RydWN0dXJlOlxyXG4gICAgICogLSBHU0kxUEs6IFwiRkFNSUxZIzxmYW1pbHlJZD5cIlxyXG4gICAgICogLSBHU0kxU0s6IFwiVVNFUiM8dXNlcklkPlwiIG9yIFwiTUVUQURBVEFcIiBvciBvdGhlciBmYW1pbHktcmVsYXRlZCBkYXRhXHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdHU0kxJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTFQSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJMVNLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgLy8gUHJvamVjdCBhbGwgYXR0cmlidXRlcyB0byBhdm9pZCBhZGRpdGlvbmFsIHF1ZXJpZXNcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogR1NJMiAtIERhdGUgYW5kIHRpbWUtYmFzZWQgcXVlcmllc1xyXG4gICAgICpcclxuICAgICAqIEFjY2VzcyBQYXR0ZXJuczpcclxuICAgICAqIC0gR2V0IHRyYW5zYWN0aW9ucyBieSBkYXRlIHJhbmdlXHJcbiAgICAgKiAtIEdldCBidWRnZXRzIGJ5IG1vbnRoXHJcbiAgICAgKiAtIFF1ZXJ5IHN1YnNjcmlwdGlvbnMgYnkgZXhwaXJhdGlvbiBkYXRlXHJcbiAgICAgKiAtIEdldCBmaW5hbmNpYWwgdGlwcyBieSBwdWJsaWNhdGlvbiBkYXRlXHJcbiAgICAgKlxyXG4gICAgICogS2V5IFN0cnVjdHVyZTpcclxuICAgICAqIC0gR1NJMlBLOiBFbnRpdHkgdHlwZSB3aXRoIGRhdGUgKGUuZy4sIFwiQlVER0VUIzIwMjQtMDFcIiwgXCJTVUJTQ1JJUFRJT04jYWN0aXZlXCIpXHJcbiAgICAgKiAtIEdTSTJTSzogXCJEQVRFIzxkYXRlPlwiIG9yIFwiRkFNSUxZIzxmYW1pbHlJZD5cIlxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnR1NJMicsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdHU0kyUEsnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTJTSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdTSTMgLSBDYXRlZ29yeSBhbmQgYW5hbHl0aWNzIHF1ZXJpZXNcclxuICAgICAqXHJcbiAgICAgKiBBY2Nlc3MgUGF0dGVybnM6XHJcbiAgICAgKiAtIEdldCBhbGwgdHJhbnNhY3Rpb25zIGZvciBhIHNwZWNpZmljIGNhdGVnb3J5XHJcbiAgICAgKiAtIEFuYWx5dGljcyBxdWVyaWVzIGZvciBzcGVuZGluZyBieSBjYXRlZ29yeVxyXG4gICAgICogLSBCdWRnZXQgdnMgYWN0dWFsIHNwZW5kaW5nIGFuYWx5c2lzXHJcbiAgICAgKlxyXG4gICAgICogS2V5IFN0cnVjdHVyZTpcclxuICAgICAqIC0gR1NJM1BLOiBcIkJVREdFVCM8bW9udGg+XCIgb3IgXCJDQVRFR09SWSM8Y2F0ZWdvcnlJZD5cIlxyXG4gICAgICogLSBHU0kzU0s6IFwiQ0FURUdPUlkjPGNhdGVnb3J5SWQ+XCIgb3IgXCJGQU1JTFkjPGZhbWlseUlkPlwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdHU0kzJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTNQSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJM1NLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogR1NJNCAtIEludml0YXRpb24gbG9va3VwcyBieSBlbWFpbFxyXG4gICAgICpcclxuICAgICAqIEFjY2VzcyBQYXR0ZXJuczpcclxuICAgICAqIC0gR2V0IHBlbmRpbmcgaW52aXRhdGlvbnMgYnkgZW1haWwgYWRkcmVzc1xyXG4gICAgICogLSBDaGVjayBpZiB1c2VyIGhhcyBiZWVuIGludml0ZWQgdG8gYSBmYW1pbHlcclxuICAgICAqIC0gUXVlcnkgaW52aXRhdGlvbiBzdGF0dXMgYW5kIGV4cGlyYXRpb25cclxuICAgICAqXHJcbiAgICAgKiBLZXkgU3RydWN0dXJlOlxyXG4gICAgICogLSBHU0k0UEs6IFwiSU5WSVRBVElPTiM8aW52aXRlZEVtYWlsPlwiXHJcbiAgICAgKiAtIEdTSTRTSzogXCJDUkVBVEVEIzx0aW1lc3RhbXA+XCIgb3IgXCJGQU1JTFkjPGZhbWlseUlkPlwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdHU0k0JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTRQSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJNFNLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCB0aGUgdGFibGUgbmFtZSBmb3IgcmVmZXJlbmNlIGluIG90aGVyIHN0YWNrcyBhbmQgYXBwbGljYXRpb25zXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgdGFibGUgbmFtZSBmb3IgQnVkZ2V0QnVkZHkgYXBwbGljYXRpb24gZGF0YSBzdG9yYWdlJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXRhYmxlLW5hbWUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IHRoZSB0YWJsZSBBUk4gZm9yIElBTSBwb2xpY2llcyBhbmQgbW9uaXRvcmluZ1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy50YWJsZS50YWJsZUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBBUk4gZm9yIEJ1ZGdldEJ1ZGR5IGFwcGxpY2F0aW9uIElBTSBwb2xpY2llcycsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS10YWJsZS1hcm4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgY29zdCBhbGxvY2F0aW9uIHRhZ3MgZm9yIHRyYWNraW5nIGV4cGVuc2VzXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnRhYmxlKS5hZGQoJ0NvbXBvbmVudCcsICdEYXRhYmFzZScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YWJsZSkuYWRkKCdTZXJ2aWNlJywgJ0R5bmFtb0RCJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnRhYmxlKS5hZGQoJ0Nvc3RDZW50ZXInLCAnQnVkZ2V0QnVkZHktQ29yZScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YWJsZSkuYWRkKCdEYXRhVHlwZScsICdBcHBsaWNhdGlvbi1EYXRhJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnRhYmxlKS5hZGQoJ0JhY2t1cFJlcXVpcmVkJywgJ1llcycpO1xyXG4gIH1cclxufVxyXG4iXX0=