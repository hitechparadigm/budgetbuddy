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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhYmFzZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7O0dBY0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyxtRUFBcUQ7QUFHckQsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFPMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qjs7Ozs7Ozs7O1dBU0c7UUFDSCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDeEQsU0FBUyxFQUFFLGtCQUFrQjtZQUU3QixvREFBb0Q7WUFDcEQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFFRCxtRUFBbUU7WUFDbkUsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFFRCxnRUFBZ0U7WUFDaEUsMENBQTBDO1lBQzFDLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFFakQsb0RBQW9EO1lBQ3BELG1FQUFtRTtZQUNuRSxtQkFBbUIsRUFBRSxJQUFJO1lBRXpCLGdEQUFnRDtZQUNoRCxtREFBbUQ7WUFDbkQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUVoRCxpRUFBaUU7WUFDakUsK0NBQStDO1lBQy9DLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUg7Ozs7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dGFiYXNlIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKiBcclxuICogQ3JlYXRlcyBhIER5bmFtb0RCIHRhYmxlIHVzaW5nIHNpbmdsZS10YWJsZSBkZXNpZ24gcGF0dGVybiBmb3Igb3B0aW1hbFxyXG4gKiBwZXJmb3JtYW5jZSBhbmQgY29zdCBlZmZpY2llbmN5LiBUaGUgdGFibGUgc3RvcmVzIGFsbCBhcHBsaWNhdGlvbiBlbnRpdGllc1xyXG4gKiAodXNlcnMsIGZhbWlsaWVzLCBidWRnZXRzLCB0cmFuc2FjdGlvbnMsIGV0Yy4pIHdpdGggYXBwcm9wcmlhdGUgR1NJIGluZGV4ZXNcclxuICogZm9yIGVmZmljaWVudCBxdWVyeWluZyBwYXR0ZXJucy5cclxuICogXHJcbiAqIEtleSBGZWF0dXJlczpcclxuICogLSBTaW5nbGUgdGFibGUgZGVzaWduIGZvciBjb3N0IG9wdGltaXphdGlvblxyXG4gKiAtIE9uLWRlbWFuZCBiaWxsaW5nIGZvciBhdXRvbWF0aWMgc2NhbGluZ1xyXG4gKiAtIFRocmVlIEdTSSBpbmRleGVzIGZvciBkaWZmZXJlbnQgYWNjZXNzIHBhdHRlcm5zXHJcbiAqIC0gUG9pbnQtaW4tdGltZSByZWNvdmVyeSBmb3IgZGF0YSBwcm90ZWN0aW9uXHJcbiAqIC0gRW5jcnlwdGlvbiBhdCByZXN0IGZvciBzZWN1cml0eSBjb21wbGlhbmNlXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqXHJcbiAgICogVGhlIG1haW4gRHluYW1vREIgdGFibGUgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gICAqIEV4cG9zZWQgYXMgcHVibGljIHByb3BlcnR5IGZvciB1c2UgaW4gb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNYWluIGFwcGxpY2F0aW9uIHRhYmxlIHVzaW5nIHNpbmdsZS10YWJsZSBkZXNpZ25cclxuICAgICAqIFxyXG4gICAgICogUHJpbWFyeSBLZXkgU3RydWN0dXJlOlxyXG4gICAgICogLSBQSyAoUGFydGl0aW9uIEtleSk6IEVudGl0eSBpZGVudGlmaWVyIChlLmcuLCBcIlVTRVIjMTIzXCIsIFwiRkFNSUxZIzQ1NlwiKVxyXG4gICAgICogLSBTSyAoU29ydCBLZXkpOiBFbnRpdHkgdHlwZSBhbmQgYWRkaXRpb25hbCBpZGVudGlmaWVyc1xyXG4gICAgICogXHJcbiAgICAgKiBUaGlzIGRlc2lnbiBhbGxvd3Mgc3RvcmluZyBtdWx0aXBsZSBlbnRpdHkgdHlwZXMgaW4gb25lIHRhYmxlXHJcbiAgICAgKiB3aGlsZSBtYWludGFpbmluZyBlZmZpY2llbnQgcXVlcnkgcGF0dGVybnMgYW5kIHJlZHVjaW5nIGNvc3RzLlxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdCdWRnZXRCdWRkeVRhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdidWRnZXRidWRkeS1tYWluJyxcclxuICAgICAgXHJcbiAgICAgIC8vIFBhcnRpdGlvbiBrZXkgLSBwcmltYXJ5IGlkZW50aWZpZXIgZm9yIHRoZSBlbnRpdHlcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ1BLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgXHJcbiAgICAgIC8vIFNvcnQga2V5IC0gYWxsb3dzIG11bHRpcGxlIGl0ZW1zIHBlciBwYXJ0aXRpb24gYW5kIHJhbmdlIHF1ZXJpZXNcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICdTSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBPbi1kZW1hbmQgYmlsbGluZyBmb3IgYXV0b21hdGljIHNjYWxpbmcgYW5kIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAgICAgIC8vIE9ubHkgcGF5IGZvciBhY3R1YWwgcmVhZC93cml0ZSByZXF1ZXN0c1xyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG5cclxuICAgICAgLy8gRW5hYmxlIHBvaW50LWluLXRpbWUgcmVjb3ZlcnkgZm9yIGRhdGEgcHJvdGVjdGlvblxyXG4gICAgICAvLyBBbGxvd3MgcmVzdG9yYXRpb24gb2YgdGFibGUgdG8gYW55IHBvaW50IHdpdGhpbiB0aGUgbGFzdCAzNSBkYXlzXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXHJcblxyXG4gICAgICAvLyBTZXJ2ZXItc2lkZSBlbmNyeXB0aW9uIHVzaW5nIEFXUyBtYW5hZ2VkIGtleXNcclxuICAgICAgLy8gRW5zdXJlcyBkYXRhIGlzIGVuY3J5cHRlZCBhdCByZXN0IGZvciBjb21wbGlhbmNlXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuXHJcbiAgICAgIC8vIEF1dG9tYXRpYyByZW1vdmFsIHdoZW4gc3RhY2sgaXMgZGVsZXRlZCAoZm9yIGRldiBlbnZpcm9ubWVudHMpXHJcbiAgICAgIC8vIENoYW5nZSB0byBSRVRBSU4gZm9yIHByb2R1Y3Rpb24gZW52aXJvbm1lbnRzXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdTSTEgLSBGYW1pbHktYmFzZWQgcXVlcmllc1xyXG4gICAgICogXHJcbiAgICAgKiBBY2Nlc3MgUGF0dGVybnM6XHJcbiAgICAgKiAtIEdldCBhbGwgdXNlcnMgaW4gYSBmYW1pbHlcclxuICAgICAqIC0gR2V0IGZhbWlseSBtZXRhZGF0YSBhbmQgbWVtYmVyc1xyXG4gICAgICogLSBRdWVyeSBmYW1pbHktc3BlY2lmaWMgZGF0YVxyXG4gICAgICogXHJcbiAgICAgKiBLZXkgU3RydWN0dXJlOlxyXG4gICAgICogLSBHU0kxUEs6IFwiRkFNSUxZIzxmYW1pbHlJZD5cIlxyXG4gICAgICogLSBHU0kxU0s6IFwiVVNFUiM8dXNlcklkPlwiIG9yIFwiTUVUQURBVEFcIiBvciBvdGhlciBmYW1pbHktcmVsYXRlZCBkYXRhXHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdHU0kxJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTFQSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJMVNLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgLy8gUHJvamVjdCBhbGwgYXR0cmlidXRlcyB0byBhdm9pZCBhZGRpdGlvbmFsIHF1ZXJpZXNcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogR1NJMiAtIERhdGUgYW5kIHRpbWUtYmFzZWQgcXVlcmllc1xyXG4gICAgICogXHJcbiAgICAgKiBBY2Nlc3MgUGF0dGVybnM6XHJcbiAgICAgKiAtIEdldCB0cmFuc2FjdGlvbnMgYnkgZGF0ZSByYW5nZVxyXG4gICAgICogLSBHZXQgYnVkZ2V0cyBieSBtb250aFxyXG4gICAgICogLSBRdWVyeSBzdWJzY3JpcHRpb25zIGJ5IGV4cGlyYXRpb24gZGF0ZVxyXG4gICAgICogLSBHZXQgZmluYW5jaWFsIHRpcHMgYnkgcHVibGljYXRpb24gZGF0ZVxyXG4gICAgICogXHJcbiAgICAgKiBLZXkgU3RydWN0dXJlOlxyXG4gICAgICogLSBHU0kyUEs6IEVudGl0eSB0eXBlIHdpdGggZGF0ZSAoZS5nLiwgXCJCVURHRVQjMjAyNC0wMVwiLCBcIlNVQlNDUklQVElPTiNhY3RpdmVcIilcclxuICAgICAqIC0gR1NJMlNLOiBcIkRBVEUjPGRhdGU+XCIgb3IgXCJGQU1JTFkjPGZhbWlseUlkPlwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdHU0kyJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTJQSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnR1NJMlNLJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogR1NJMyAtIENhdGVnb3J5IGFuZCBhbmFseXRpY3MgcXVlcmllc1xyXG4gICAgICogXHJcbiAgICAgKiBBY2Nlc3MgUGF0dGVybnM6XHJcbiAgICAgKiAtIEdldCBhbGwgdHJhbnNhY3Rpb25zIGZvciBhIHNwZWNpZmljIGNhdGVnb3J5XHJcbiAgICAgKiAtIEFuYWx5dGljcyBxdWVyaWVzIGZvciBzcGVuZGluZyBieSBjYXRlZ29yeVxyXG4gICAgICogLSBCdWRnZXQgdnMgYWN0dWFsIHNwZW5kaW5nIGFuYWx5c2lzXHJcbiAgICAgKiBcclxuICAgICAqIEtleSBTdHJ1Y3R1cmU6XHJcbiAgICAgKiAtIEdTSTNQSzogXCJCVURHRVQjPG1vbnRoPlwiIG9yIFwiQ0FURUdPUlkjPGNhdGVnb3J5SWQ+XCJcclxuICAgICAqIC0gR1NJM1NLOiBcIkNBVEVHT1JZIzxjYXRlZ29yeUlkPlwiIG9yIFwiRkFNSUxZIzxmYW1pbHlJZD5cIlxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnR1NJMycsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdHU0kzUEsnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ0dTSTNTSycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgdGhlIHRhYmxlIG5hbWUgZm9yIHJlZmVyZW5jZSBpbiBvdGhlciBzdGFja3MgYW5kIGFwcGxpY2F0aW9uc1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIG5hbWUgZm9yIEJ1ZGdldEJ1ZGR5IGFwcGxpY2F0aW9uIGRhdGEgc3RvcmFnZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS10YWJsZS1uYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCB0aGUgdGFibGUgQVJOIGZvciBJQU0gcG9saWNpZXMgYW5kIG1vbml0b3JpbmdcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYWJsZUFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudGFibGUudGFibGVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgdGFibGUgQVJOIGZvciBCdWRnZXRCdWRkeSBhcHBsaWNhdGlvbiBJQU0gcG9saWNpZXMnLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktdGFibGUtYXJuJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIGNvc3QgYWxsb2NhdGlvbiB0YWdzIGZvciB0cmFja2luZyBleHBlbnNlc1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YWJsZSkuYWRkKCdDb21wb25lbnQnLCAnRGF0YWJhc2UnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudGFibGUpLmFkZCgnU2VydmljZScsICdEeW5hbW9EQicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YWJsZSkuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUNvcmUnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudGFibGUpLmFkZCgnRGF0YVR5cGUnLCAnQXBwbGljYXRpb24tRGF0YScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YWJsZSkuYWRkKCdCYWNrdXBSZXF1aXJlZCcsICdZZXMnKTtcclxuICB9XHJcbn0iXX0=