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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhYmFzZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7O0dBY0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyxtRUFBcUQ7QUFHckQsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFPMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qjs7Ozs7Ozs7O1dBU0c7UUFDSCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDeEQsU0FBUyxFQUFFLGtCQUFrQjtZQUU3QixvREFBb0Q7WUFDcEQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFFRCxtRUFBbUU7WUFDbkUsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFFRCxnRUFBZ0U7WUFDaEUsMENBQTBDO1lBQzFDLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFFakQseURBQXlEO1lBQ3pELDZEQUE2RDtZQUM3RCxNQUFNLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0I7WUFFbEQsb0RBQW9EO1lBQ3BELG1FQUFtRTtZQUNuRSxtQkFBbUIsRUFBRSxJQUFJO1lBRXpCLGdEQUFnRDtZQUNoRCxtREFBbUQ7WUFDbkQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUVoRCxpRUFBaUU7WUFDakUsK0NB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QUMsQ0FBQztJQUN2RCxDQUFDO0NBQ0Y7QUExSkQsc0NBMEpDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIERhdGFiYXNlIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKlxyXG4gKiBDcmVhdGVzIGEgRHluYW1vREIgdGFibGUgdXNpbmcgc2luZ2xlLXRhYmxlIGRlc2lnbiBwYXR0ZXJuIGZvciBvcHRpbWFsXHJcbiAqIHBlcmZvcm1hbmNlIGFuZCBjb3N0IGVmZmljaWVuY3kuIFRoZSB0YWJsZSBzdG9yZXMgYWxsIGFwcGxpY2F0aW9uIGVudGl0aWVzXHJcbiAqICh1c2VycywgZmFtaWxpZXMsIGJ1ZGdldHMsIHRyYW5zYWN0aW9ucywgZXRjLikgd2l0aCBhcHByb3ByaWF0ZSBHU0kgaW5kZXhlc1xyXG4gKiBmb3IgZWZmaWNpZW50IHF1ZXJ5aW5nIHBhdHRlcm5zLlxyXG4gKlxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gU2luZ2xlIHRhYmxlIGRlc2lnbiBmb3IgY29zdCBvcHRpbWl6YXRpb25cclxuICogLSBPbi1kZW1hbmQgYmlsbGluZyBmb3IgYXV0b21hdGljIHNjYWxpbmdcclxuICogLSBUaHJlZSBHU0kgaW5kZXhlcyBmb3IgZGlmZmVyZW50IGFjY2VzcyBwYXR0ZXJuc1xyXG4gKiAtIFBvaW50LWluLXRpbWUgcmVjb3ZlcnkgZm9yIGRhdGEgcHJvdGVjdGlvblxyXG4gKiAtIEVuY3J5cHRpb24gYXQgcmVzdCBmb3Igc2VjdXJpdHkgY29tcGxpYW5jZVxyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIERhdGFiYXNlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIC8qKlxyXG4gICAqIFRoZSBtYWluIER5bmFtb0RCIHRhYmxlIGZvciB0aGUgYXBwbGljYXRpb25cclxuICAgKiBFeHBvc2VkIGFzIHB1YmxpYyBwcm9wZXJ0eSBmb3IgdXNlIGluIG90aGVyIHN0YWNrc1xyXG4gICAqL1xyXG4gIHB1YmxpYyByZWFkb25seSB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTWFpbiBhcHBsaWNhdGlvbiB0YWJsZSB1c2luZyBzaW5nbGUtdGFibGUgZGVzaWduXHJcbiAgICAgKlxyXG4gICAgICogUHJpbWFyeSBLZXkgU3RydWN0dXJlOlxyXG4gICAgICogLSBQSyAoUGFydGl0aW9uIEtleSk6IEVudGl0eSBpZGVudGlmaWVyIChlLmcuLCBcIlVTRVIjMTIzXCIsIFwiRkFNSUxZIzQ1NlwiKVxyXG4gICAgICogLSBTSyAoU29ydCBLZXkpOiBFbnRpdHkgdHlwZSBhbmQgYWRkaXRpb25hbCBpZGVudGlmaWVyc1xyXG4gICAgICpcclxuICAgICAqIFRoaXMgZGVzaWduIGFsbG93cyBzdG9yaW5nIG11bHRpcGxlIGVudGl0eSB0eXBlcyBpbiBvbmUgdGFibGVcclxuICAgICAqIHdoaWxlIG1haW50YWluaW5nIGVmZmljaWVudCBxdWVyeSBwYXR0ZXJucyBhbmQgcmVkdWNpbmcgY29zdHMuXHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0J1ZGdldEJ1ZGR5VGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ2J1ZGdldGJ1ZGR5LW1haW4nLFxyXG5cclxuICAgICAgLy8gUGFydGl0aW9uIGtleSAtIHByaW1hcnkgaWRlbnRpZmllciBmb3IgdGhlIGVudGl0eVxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnUEsnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLy8gU29ydCBrZXkgLSBhbGxvd3MgbXVsdGlwbGUgaXRlbXMgcGVyIHBhcnRpdGlvbiBhbmQgcmFuZ2UgcXVlcmllc1xyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ1NLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIE9uLWRlbWFuZCBiaWxsaW5nIGZvciBhdXRvbWF0aWMgc2NhbGluZyBhbmQgY29zdCBvcHRpbWl6YXRpb25cclxuICAgICAgLy8gT25seSBwYXkgZm9yIGFjdHVhbCByZWFkL3dyaXRlIHJlcXVlc3RzXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcblxyXG4gICAgICAvLyBFbmFibGUgRHluYW1vREIgU3RyZWFtcyBmb3IgcmVhbC10aW1lIGV2ZW50IHByb2Nlc3NpbmdcclxuICAgICAgLy8gUmVxdWlyZWQgZm9yIGJ1ZGdldCBhbGVydHMgYW5kIG90aGVyIGV2ZW50LWRyaXZlbiBmZWF0dXJlc1xyXG4gICAgICBzdHJlYW06IGR5bmFtb2RiLlN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSBwb2ludC1pbi10aW1lIHJlY292ZXJ5IGZvciBkYXRhIHByb3RlY3Rpb25cclxuICAgICAgLy8gQWxsb3dzIHJlc3RvcmF0aW9uIG9mIHRhYmxlIHRvIGFueSBwb2ludCB3aXRoaW4gdGhlIGxhc3QgMzUgZGF5c1xyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxyXG5cclxuICAgICAgLy8gU2VydmVyLXNpZGUgZW5jcnlwdGlvbiB1c2luZyBBV1MgbWFuYWdlZCBrZXlzXHJcbiAgICAgIC8vIEVuc3VyZXMgZGF0YSBpcyBlbmNyeXB0ZWQgYXQgcmVzdCBmb3IgY29tcGxpYW5jZVxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcblxyXG4gICAgICAvLyBBdXRvbWF0aWMgcmVtb3ZhbCB3aGVuIHN0YWNrIGlzIGRlbGV0ZWQgKGZvciBkZXYgZW52aXJvbm1lbnRzKVxyXG4gICAgICAvLyBDaGFuZ2UgdG8gUkVUQUlOIGZvciBwcm9kdWN0aW9uIGVudmlyb25tZW50c1xyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHU0kxIC0gRmFtaWx5LWJhc2VkIHF1ZXJpZXNcclxuICAgICAqXHJcbiAgICAgKiBBY2Nlc3MgUGF0dGVybnM6XHJcbiAgICAgKiAtIEdldCBhbGwgdXNlcnMgaW4gYSBmYW1pbHlcclxuICAgICAqIC0gR2V0IGZhbWlseSBtZXRhZGF0YSBhbmQgbWVtYmVyc1xyXG4gICAgICogLSBRdWVyeSBmYW1pbHktc3BlY2lmaWMgZGF0YVxyXG4gICAgICpcclxuICAgICAqIEtleSBTdHJ1Y3R1cmU6XHJcbiAgICAgKiAtIEdTSTFQSzogXCJGQU1JTFkjPGZhbWlseUlkPlwiXHJcbiAgICAgKiAtIEdTSTFTSzogXCJVU0VSIzx1c2VySWQ+XCIgb3IgXCJNRVRBREFUQVwiIG9yIG90aGVyIGZhbWlseS1yZWxhdGVkIGRhdGFcclxuICAgICAqL1xyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0dTSTEnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJMVBLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICdHU0kxU0snLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICAvLyBQcm9qZWN0IGFsbCBhdHRyaWJ1dGVzIHRvIGF2b2lkIGFkZGl0aW9uYWwgcXVlcmllc1xyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHU0kyIC0gRGF0ZSBhbmQgdGltZS1iYXNlZCBxdWVyaWVzXHJcbiAgICAgKlxyXG4gICAgICogQWNjZXNzIFBhdHRlcm5zOlxyXG4gICAgICogLSBHZXQgdHJhbnNhY3Rpb25zIGJ5IGRhdGUgcmFuZ2VcclxuICAgICAqIC0gR2V0IGJ1ZGdldHMgYnkgbW9udGhcclxuICAgICAqIC0gUXVlcnkgc3Vic2NyaXB0aW9ucyBieSBleHBpcmF0aW9uIGRhdGVcclxuICAgICAqIC0gR2V0IGZpbmFuY2lhbCB0aXBzIGJ5IHB1YmxpY2F0aW9uIGRhdGVcclxuICAgICAqXHJcbiAgICAgKiBLZXkgU3RydWN0dXJlOlxyXG4gICAgICogLSBHU0kyUEs6IEVudGl0eSB0eXBlIHdpdGggZGF0ZSAoZS5nLiwgXCJCVURHRVQjMjAyNC0wMVwiLCBcIlNVQlNDUklQVElPTiNhY3RpdmVcIilcclxuICAgICAqIC0gR1NJMlNLOiBcIkRBVEUjPGRhdGU+XCIgb3IgXCJGQU1JTFkjPGZhbWlseUlkPlwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdHU0kyJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTJQSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJMlNLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogR1NJMyAtIENhdGVnb3J5IGFuZCBhbmFseXRpY3MgcXVlcmllc1xyXG4gICAgICpcclxuICAgICAqIEFjY2VzcyBQYXR0ZXJuczpcclxuICAgICAqIC0gR2V0IGFsbCB0cmFuc2FjdGlvbnMgZm9yIGEgc3BlY2lmaWMgY2F0ZWdvcnlcclxuICAgICAqIC0gQW5hbHl0aWNzIHF1ZXJpZXMgZm9yIHNwZW5kaW5nIGJ5IGNhdGVnb3J5XHJcbiAgICAgKiAtIEJ1ZGdldCB2cyBhY3R1YWwgc3BlbmRpbmcgYW5hbHlzaXNcclxuICAgICAqXHJcbiAgICAgKiBLZXkgU3RydWN0dXJlOlxyXG4gICAgICogLSBHU0kzUEs6IFwiQlVER0VUIzxtb250aD5cIiBvciBcIkNBVEVHT1JZIzxjYXRlZ29yeUlkPlwiXHJcbiAgICAgKiAtIEdTSTNTSzogXCJDQVRFR09SWSM8Y2F0ZWdvcnlJZD5cIiBvciBcIkZBTUlMWSM8ZmFtaWx5SWQ+XCJcclxuICAgICAqL1xyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0dTSTMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJM1BLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICdHU0kzU0snLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IHRoZSB0YWJsZSBuYW1lIGZvciByZWZlcmVuY2UgaW4gb3RoZXIgc3RhY2tzIGFuZCBhcHBsaWNhdGlvbnNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBuYW1lIGZvciBCdWRnZXRCdWRkeSBhcHBsaWNhdGlvbiBkYXRhIHN0b3JhZ2UnLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktdGFibGUtbmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgdGhlIHRhYmxlIEFSTiBmb3IgSUFNIHBvbGljaWVzIGFuZCBtb25pdG9yaW5nXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFibGVBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnRhYmxlLnRhYmxlQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIEFSTiBmb3IgQnVkZ2V0QnVkZHkgYXBwbGljYXRpb24gSUFNIHBvbGljaWVzJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXRhYmxlLWFybicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSBjb3N0IGFsbG9jYXRpb24gdGFncyBmb3IgdHJhY2tpbmcgZXhwZW5zZXNcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudGFibGUpLmFkZCgnQ29tcG9uZW50JywgJ0RhdGFiYXNlJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnRhYmxlKS5hZGQoJ1NlcnZpY2UnLCAnRHluYW1vREInKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudGFibGUpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1Db3JlJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnRhYmxlKS5hZGQoJ0RhdGFUeXBlJywgJ0FwcGxpY2F0aW9uLURhdGEnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudGFibGUpLmFkZCgnQmFja3VwUmVxdWlyZWQnLCAnWWVzJyk7XHJcbiAgfVxyXG59XHJcbiJdfQ==